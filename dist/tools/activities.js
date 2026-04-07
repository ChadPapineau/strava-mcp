"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerActivityTools = registerActivityTools;
const constants_js_1 = require("../constants.js");
const strava_client_js_1 = require("../services/strava-client.js");
const formatters_js_1 = require("../services/formatters.js");
const index_js_1 = require("../schemas/index.js");
function registerActivityTools(server) {
    // ── List Activities ────────────────────────────────────────────────
    server.registerTool("strava_list_activities", {
        title: "List Strava Activities",
        description: `Returns a paginated list of the authenticated athlete's activities.

Supports filtering by time range using epoch timestamps. Results include distance, duration, speed, heart rate, power, and more for each activity.

Args:
  - before (number, optional): Epoch timestamp — only return activities before this time
  - after (number, optional): Epoch timestamp — only return activities after this time
  - page (number): Page number, starts at 1 (default: 1)
  - per_page (number): Items per page, 1-200 (default: 30)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns: List of activity summaries with distance, time, speed, HR, power, kudos, etc.

Examples:
  - Last 7 days: after = Math.floor(Date.now()/1000) - 7*86400
  - January 2025: after = 1735689600, before = 1738368000`,
        inputSchema: index_js_1.ListActivitiesSchema,
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: true,
        },
    }, async (params) => {
        try {
            const client = (0, strava_client_js_1.getClient)();
            const queryParams = {
                page: params.page,
                per_page: params.per_page,
            };
            if (params.before !== undefined)
                queryParams.before = params.before;
            if (params.after !== undefined)
                queryParams.after = params.after;
            const activities = await client.get("/athlete/activities", queryParams);
            if (activities.length === 0) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "No activities found for the given time range and page.",
                        },
                    ],
                };
            }
            if (params.response_format === constants_js_1.ResponseFormat.JSON) {
                return {
                    content: [
                        {
                            type: "text",
                            text: (0, formatters_js_1.truncateIfNeeded)(JSON.stringify(activities, null, 2), activities.length),
                        },
                    ],
                };
            }
            const lines = [
                `# Activities (Page ${params.page}, ${activities.length} results)`,
                "",
            ];
            for (const a of activities) {
                lines.push((0, formatters_js_1.formatActivitySummaryMarkdown)(a), "");
            }
            if (activities.length === params.per_page) {
                lines.push(`*More results may be available on page ${params.page + 1}.*`);
            }
            return {
                content: [{ type: "text", text: (0, formatters_js_1.truncateIfNeeded)(lines.join("\n")) }],
            };
        }
        catch (error) {
            return {
                isError: true,
                content: [{ type: "text", text: (0, strava_client_js_1.handleApiError)(error) }],
            };
        }
    });
    // ── Get Activity Detail ────────────────────────────────────────────
    server.registerTool("strava_get_activity", {
        title: "Get Strava Activity Detail",
        description: `Returns the detailed view of a specific activity by ID.

Includes all summary fields plus description, gear, segment efforts, best efforts, splits, and laps. Use strava_list_activities first to find activity IDs.

Args:
  - id (number): Activity ID
  - include_all_efforts (boolean): Include all segment efforts — can be very large (default: false)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns: Full activity detail including segments, best efforts, splits, gear, and device info.`,
        inputSchema: index_js_1.GetActivitySchema,
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: true,
        },
    }, async (params) => {
        try {
            const client = (0, strava_client_js_1.getClient)();
            const activity = await client.get(`/activities/${params.id}`, { include_all_efforts: params.include_all_efforts });
            const text = params.response_format === constants_js_1.ResponseFormat.JSON
                ? (0, formatters_js_1.truncateIfNeeded)(JSON.stringify(activity, null, 2))
                : (0, formatters_js_1.truncateIfNeeded)((0, formatters_js_1.formatDetailedActivityMarkdown)(activity));
            return { content: [{ type: "text", text }] };
        }
        catch (error) {
            return {
                isError: true,
                content: [{ type: "text", text: (0, strava_client_js_1.handleApiError)(error) }],
            };
        }
    });
    // ── Get Activity Laps ──────────────────────────────────────────────
    server.registerTool("strava_get_activity_laps", {
        title: "Get Strava Activity Laps",
        description: `Returns the laps of an activity.

Each lap includes distance, time, speed, heart rate, cadence, and power data. Useful for analyzing splits and pacing.

Args:
  - id (number): Activity ID
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns: Array of laps with distance, time, speed, HR, cadence, and power per lap.`,
        inputSchema: index_js_1.GetActivityLapsSchema,
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: true,
        },
    }, async (params) => {
        try {
            const client = (0, strava_client_js_1.getClient)();
            const laps = await client.get(`/activities/${params.id}/laps`);
            if (laps.length === 0) {
                return {
                    content: [{ type: "text", text: "No laps found for this activity." }],
                };
            }
            if (params.response_format === constants_js_1.ResponseFormat.JSON) {
                return {
                    content: [
                        { type: "text", text: JSON.stringify(laps, null, 2) },
                    ],
                };
            }
            const lines = [`# Laps for Activity ${params.id}`, ""];
            for (const l of laps) {
                lines.push((0, formatters_js_1.formatLapMarkdown)(l), "");
            }
            return { content: [{ type: "text", text: lines.join("\n") }] };
        }
        catch (error) {
            return {
                isError: true,
                content: [{ type: "text", text: (0, strava_client_js_1.handleApiError)(error) }],
            };
        }
    });
    // ── Get Activity Zones ─────────────────────────────────────────────
    server.registerTool("strava_get_activity_zones", {
        title: "Get Strava Activity Zones",
        description: `Returns the heart rate and power zone distribution for a specific activity.

Shows time spent in each zone. Requires the activity to have heart rate or power data.

Args:
  - id (number): Activity ID
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns: Distribution of time across HR and/or power zones for the activity.`,
        inputSchema: index_js_1.GetActivityZonesSchema,
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: true,
        },
    }, async (params) => {
        try {
            const client = (0, strava_client_js_1.getClient)();
            const zones = await client.get(`/activities/${params.id}/zones`);
            if (params.response_format === constants_js_1.ResponseFormat.JSON) {
                return {
                    content: [{ type: "text", text: JSON.stringify(zones, null, 2) }],
                };
            }
            const lines = [`# Zone Distribution for Activity ${params.id}`, ""];
            for (const zoneSet of zones) {
                lines.push(`## ${zoneSet.type === "heartrate" ? "Heart Rate" : "Power"} Zones`, "");
                for (let i = 0; i < zoneSet.distribution_buckets.length; i++) {
                    const b = zoneSet.distribution_buckets[i];
                    const maxLabel = b.max === -1 ? "∞" : String(b.max);
                    lines.push(`- **Zone ${i + 1}** (${b.min}–${maxLabel}): ${(0, formatters_js_1.formatDuration)(b.time)}`);
                }
                lines.push("");
            }
            return { content: [{ type: "text", text: lines.join("\n") }] };
        }
        catch (error) {
            return {
                isError: true,
                content: [{ type: "text", text: (0, strava_client_js_1.handleApiError)(error) }],
            };
        }
    });
    // ── Get Activity Comments ──────────────────────────────────────────
    server.registerTool("strava_get_activity_comments", {
        title: "Get Strava Activity Comments",
        description: `Returns comments on a specific activity.

Args:
  - id (number): Activity ID
  - page (number): Page number (default: 1)
  - per_page (number): Items per page (default: 30)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns: List of comments with author name, text, and timestamp.`,
        inputSchema: index_js_1.GetActivityCommentsSchema,
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: true,
        },
    }, async (params) => {
        try {
            const client = (0, strava_client_js_1.getClient)();
            const comments = await client.get(`/activities/${params.id}/comments`, { page: params.page, per_page: params.per_page });
            if (comments.length === 0) {
                return {
                    content: [{ type: "text", text: "No comments on this activity." }],
                };
            }
            if (params.response_format === constants_js_1.ResponseFormat.JSON) {
                return {
                    content: [{ type: "text", text: JSON.stringify(comments, null, 2) }],
                };
            }
            const lines = [`# Comments on Activity ${params.id}`, ""];
            for (const c of comments) {
                lines.push((0, formatters_js_1.formatCommentMarkdown)(c));
            }
            return { content: [{ type: "text", text: lines.join("\n") }] };
        }
        catch (error) {
            return {
                isError: true,
                content: [{ type: "text", text: (0, strava_client_js_1.handleApiError)(error) }],
            };
        }
    });
    // ── Get Activity Kudoers ───────────────────────────────────────────
    server.registerTool("strava_get_activity_kudos", {
        title: "Get Strava Activity Kudos",
        description: `Returns the list of athletes who gave kudos on a specific activity.

Args:
  - id (number): Activity ID
  - page (number): Page number (default: 1)
  - per_page (number): Items per page (default: 30)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns: List of athletes who kudoed the activity, with name and athlete ID.`,
        inputSchema: index_js_1.GetActivityKudosSchema,
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: true,
        },
    }, async (params) => {
        try {
            const client = (0, strava_client_js_1.getClient)();
            const kudoers = await client.get(`/activities/${params.id}/kudoers`, {
                page: params.page,
                per_page: params.per_page,
            });
            if (kudoers.length === 0) {
                return {
                    content: [{ type: "text", text: "No kudos on this activity yet." }],
                };
            }
            if (params.response_format === constants_js_1.ResponseFormat.JSON) {
                return {
                    content: [{ type: "text", text: JSON.stringify(kudoers, null, 2) }],
                };
            }
            const lines = [
                `# Kudos on Activity ${params.id} (${kudoers.length})`,
                "",
            ];
            for (const k of kudoers) {
                lines.push(`- ${k.firstname} ${k.lastname}`);
            }
            return { content: [{ type: "text", text: lines.join("\n") }] };
        }
        catch (error) {
            return {
                isError: true,
                content: [{ type: "text", text: (0, strava_client_js_1.handleApiError)(error) }],
            };
        }
    });
}
