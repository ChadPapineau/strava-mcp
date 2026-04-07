"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerStreamTools = registerStreamTools;
const constants_js_1 = require("../constants.js");
const strava_client_js_1 = require("../services/strava-client.js");
const formatters_js_1 = require("../services/formatters.js");
const index_js_1 = require("../schemas/index.js");
function formatStreamSummary(streams) {
    const lines = ["# Stream Data Summary", ""];
    for (const [key, stream] of Object.entries(streams)) {
        const data = stream.data;
        if (!data || data.length === 0)
            continue;
        const numericData = data.filter((v) => typeof v === "number");
        if (numericData.length === 0) {
            lines.push(`## ${key}`, `- ${data.length} data points`, "");
            continue;
        }
        const min = Math.min(...numericData);
        const max = Math.max(...numericData);
        const avg = numericData.reduce((a, b) => a + b, 0) / numericData.length;
        lines.push(`## ${key}`, `- **Points**: ${data.length}`, `- **Min**: ${min.toFixed(2)}`, `- **Max**: ${max.toFixed(2)}`, `- **Avg**: ${avg.toFixed(2)}`, "");
    }
    return lines.join("\n");
}
function registerStreamTools(server) {
    // ── Get Activity Streams ───────────────────────────────────────────
    server.registerTool("strava_get_activity_streams", {
        title: "Get Strava Activity Streams",
        description: `Returns time-series data streams for a specific activity.

Streams include second-by-second (or similar resolution) data for metrics like heart rate, power, cadence, altitude, speed, etc. This is the raw data behind activity charts.

Args:
  - id (number): Activity ID
  - keys (string): Comma-separated stream types to request. Options: time, distance, latlng, altitude, velocity_smooth, heartrate, cadence, watts, temp, moving, grade_smooth (default: time,distance,altitude,heartrate,cadence,watts,velocity_smooth)
  - key_by_type (boolean): Key response by stream type (default: true)
  - response_format ('markdown' | 'json'): Output format. JSON returns full data arrays; markdown returns summary statistics. (default: 'markdown')

Returns: Time-series data arrays for each requested stream type. JSON format includes all data points; markdown shows summary stats (min/max/avg).

Note: Streams can be very large. For full data, use JSON format. Markdown shows a statistical summary.`,
        inputSchema: index_js_1.GetActivityStreamsSchema,
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: true,
        },
    }, async (params) => {
        try {
            const client = (0, strava_client_js_1.getClient)();
            const streams = await client.get(`/activities/${params.id}/streams`, {
                keys: params.keys,
                key_by_type: params.key_by_type,
            });
            if (params.response_format === constants_js_1.ResponseFormat.JSON) {
                return {
                    content: [
                        {
                            type: "text",
                            text: (0, formatters_js_1.truncateIfNeeded)(JSON.stringify(streams, null, 2)),
                        },
                    ],
                };
            }
            return {
                content: [{ type: "text", text: formatStreamSummary(streams) }],
            };
        }
        catch (error) {
            return {
                isError: true,
                content: [{ type: "text", text: (0, strava_client_js_1.handleApiError)(error) }],
            };
        }
    });
    // ── Get Segment Effort Streams ─────────────────────────────────────
    server.registerTool("strava_get_segment_effort_streams", {
        title: "Get Strava Segment Effort Streams",
        description: `Returns time-series data streams for a specific segment effort.

Similar to activity streams but scoped to a single segment effort.

Args:
  - id (number): Segment effort ID
  - keys (string): Comma-separated stream types (default: time,distance,altitude,heartrate,cadence,watts)
  - key_by_type (boolean): Key response by stream type (default: true)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns: Time-series data for the segment effort.`,
        inputSchema: index_js_1.GetSegmentEffortStreamsSchema,
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: true,
        },
    }, async (params) => {
        try {
            const client = (0, strava_client_js_1.getClient)();
            const streams = await client.get(`/segment_efforts/${params.id}/streams`, { keys: params.keys, key_by_type: params.key_by_type });
            if (params.response_format === constants_js_1.ResponseFormat.JSON) {
                return {
                    content: [
                        {
                            type: "text",
                            text: (0, formatters_js_1.truncateIfNeeded)(JSON.stringify(streams, null, 2)),
                        },
                    ],
                };
            }
            return {
                content: [{ type: "text", text: formatStreamSummary(streams) }],
            };
        }
        catch (error) {
            return {
                isError: true,
                content: [{ type: "text", text: (0, strava_client_js_1.handleApiError)(error) }],
            };
        }
    });
    // ── Get Route Streams ──────────────────────────────────────────────
    server.registerTool("strava_get_route_streams", {
        title: "Get Strava Route Streams",
        description: `Returns the streams (GPS track data) for a route.

Includes latlng, distance, and altitude data for the route path.

Args:
  - id (number): Route ID
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns: GPS track data (latlng, distance, altitude) for the route.`,
        inputSchema: index_js_1.GetRouteStreamsSchema,
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: true,
        },
    }, async (params) => {
        try {
            const client = (0, strava_client_js_1.getClient)();
            const streams = await client.get(`/routes/${params.id}/streams`);
            if (params.response_format === constants_js_1.ResponseFormat.JSON) {
                return {
                    content: [
                        {
                            type: "text",
                            text: (0, formatters_js_1.truncateIfNeeded)(JSON.stringify(streams, null, 2)),
                        },
                    ],
                };
            }
            return {
                content: [{ type: "text", text: formatStreamSummary(streams) }],
            };
        }
        catch (error) {
            return {
                isError: true,
                content: [{ type: "text", text: (0, strava_client_js_1.handleApiError)(error) }],
            };
        }
    });
}
