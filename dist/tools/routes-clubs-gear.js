"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutesClubsGearTools = registerRoutesClubsGearTools;
const constants_js_1 = require("../constants.js");
const strava_client_js_1 = require("../services/strava-client.js");
const formatters_js_1 = require("../services/formatters.js");
const index_js_1 = require("../schemas/index.js");
function registerRoutesClubsGearTools(server) {
    // ── List Routes ────────────────────────────────────────────────────
    server.registerTool("strava_list_routes", {
        title: "List Strava Routes",
        description: `Returns routes created by a specific athlete.

Args:
  - athlete_id (number): Athlete ID whose routes to list
  - page (number): Page number (default: 1)
  - per_page (number): Items per page (default: 30)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns: List of routes with name, distance, elevation gain, and estimated time.`,
        inputSchema: index_js_1.ListRoutesSchema,
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: true,
        },
    }, async (params) => {
        try {
            const client = (0, strava_client_js_1.getClient)();
            const routes = await client.get(`/athletes/${params.athlete_id}/routes`, { page: params.page, per_page: params.per_page });
            if (routes.length === 0) {
                return {
                    content: [{ type: "text", text: "No routes found for this athlete." }],
                };
            }
            if (params.response_format === constants_js_1.ResponseFormat.JSON) {
                return {
                    content: [{ type: "text", text: JSON.stringify(routes, null, 2) }],
                };
            }
            const lines = ["# Routes", ""];
            for (const r of routes) {
                lines.push((0, formatters_js_1.formatRouteMarkdown)(r), "");
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
    // ── Get Route ──────────────────────────────────────────────────────
    server.registerTool("strava_get_route", {
        title: "Get Strava Route",
        description: `Returns a specific route by ID.

Args:
  - id (number): Route ID
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns: Route details including name, distance, elevation, type, and description.`,
        inputSchema: index_js_1.GetRouteSchema,
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: true,
        },
    }, async (params) => {
        try {
            const client = (0, strava_client_js_1.getClient)();
            const route = await client.get(`/routes/${params.id}`);
            const text = params.response_format === constants_js_1.ResponseFormat.JSON
                ? JSON.stringify(route, null, 2)
                : (0, formatters_js_1.formatRouteMarkdown)(route);
            return { content: [{ type: "text", text }] };
        }
        catch (error) {
            return {
                isError: true,
                content: [{ type: "text", text: (0, strava_client_js_1.handleApiError)(error) }],
            };
        }
    });
    // ── List Athlete Clubs ─────────────────────────────────────────────
    server.registerTool("strava_list_clubs", {
        title: "List Strava Clubs",
        description: `Returns clubs the authenticated athlete is a member of.

Args:
  - page (number): Page number (default: 1)
  - per_page (number): Items per page (default: 30)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns: List of clubs with name, sport type, location, member count.`,
        inputSchema: index_js_1.ListClubsSchema,
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: true,
        },
    }, async (params) => {
        try {
            const client = (0, strava_client_js_1.getClient)();
            const clubs = await client.get("/athlete/clubs", {
                page: params.page,
                per_page: params.per_page,
            });
            if (clubs.length === 0) {
                return {
                    content: [{ type: "text", text: "You are not a member of any clubs." }],
                };
            }
            if (params.response_format === constants_js_1.ResponseFormat.JSON) {
                return {
                    content: [{ type: "text", text: JSON.stringify(clubs, null, 2) }],
                };
            }
            const lines = ["# Your Clubs", ""];
            for (const c of clubs) {
                lines.push((0, formatters_js_1.formatClubMarkdown)(c), "");
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
    // ── Get Club ───────────────────────────────────────────────────────
    server.registerTool("strava_get_club", {
        title: "Get Strava Club",
        description: `Returns detailed info about a specific club.

Args:
  - id (number): Club ID
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns: Club detail with description, member count, sport type, and location.`,
        inputSchema: index_js_1.GetClubSchema,
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: true,
        },
    }, async (params) => {
        try {
            const client = (0, strava_client_js_1.getClient)();
            const club = await client.get(`/clubs/${params.id}`);
            const text = params.response_format === constants_js_1.ResponseFormat.JSON
                ? JSON.stringify(club, null, 2)
                : (0, formatters_js_1.formatClubMarkdown)(club);
            return { content: [{ type: "text", text }] };
        }
        catch (error) {
            return {
                isError: true,
                content: [{ type: "text", text: (0, strava_client_js_1.handleApiError)(error) }],
            };
        }
    });
    // ── List Club Members ──────────────────────────────────────────────
    server.registerTool("strava_list_club_members", {
        title: "List Strava Club Members",
        description: `Returns the members of a specific club.

Args:
  - id (number): Club ID
  - page (number): Page number (default: 1)
  - per_page (number): Items per page (default: 30)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns: List of club members with name.`,
        inputSchema: index_js_1.ListClubMembersSchema,
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: true,
        },
    }, async (params) => {
        try {
            const client = (0, strava_client_js_1.getClient)();
            const members = await client.get(`/clubs/${params.id}/members`, {
                page: params.page,
                per_page: params.per_page,
            });
            if (members.length === 0) {
                return {
                    content: [{ type: "text", text: "No members found." }],
                };
            }
            if (params.response_format === constants_js_1.ResponseFormat.JSON) {
                return {
                    content: [{ type: "text", text: JSON.stringify(members, null, 2) }],
                };
            }
            const lines = [`# Club Members (${members.length})`, ""];
            for (const m of members) {
                lines.push(`- ${m.firstname} ${m.lastname}`);
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
    // ── List Club Activities ───────────────────────────────────────────
    server.registerTool("strava_list_club_activities", {
        title: "List Strava Club Activities",
        description: `Returns recent activities from members of a specific club.

Args:
  - id (number): Club ID
  - page (number): Page number (default: 1)
  - per_page (number): Items per page (default: 30)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns: List of recent club member activities.`,
        inputSchema: index_js_1.ListClubActivitiesSchema,
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: true,
        },
    }, async (params) => {
        try {
            const client = (0, strava_client_js_1.getClient)();
            const activities = await client.get(`/clubs/${params.id}/activities`, { page: params.page, per_page: params.per_page });
            if (activities.length === 0) {
                return {
                    content: [
                        { type: "text", text: "No recent club activities found." },
                    ],
                };
            }
            if (params.response_format === constants_js_1.ResponseFormat.JSON) {
                return {
                    content: [
                        {
                            type: "text",
                            text: (0, formatters_js_1.truncateIfNeeded)(JSON.stringify(activities, null, 2)),
                        },
                    ],
                };
            }
            const lines = ["# Recent Club Activities", ""];
            for (const a of activities) {
                lines.push((0, formatters_js_1.formatActivitySummaryMarkdown)(a), "");
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
    // ── Get Gear ───────────────────────────────────────────────────────
    server.registerTool("strava_get_gear", {
        title: "Get Strava Gear",
        description: `Returns equipment/gear detail by ID.

Gear IDs are prefixed: 'b' for bikes (e.g. 'b12345'), 's' for shoes (e.g. 's12345'). Find gear IDs from activity details or the athlete profile.

Args:
  - id (string): Gear ID (e.g. 'b12345' for bikes, 's12345' for shoes)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns: Gear details including name, brand, model, total distance, and primary status.`,
        inputSchema: index_js_1.GetGearSchema,
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: true,
        },
    }, async (params) => {
        try {
            const client = (0, strava_client_js_1.getClient)();
            const gear = await client.get(`/gear/${params.id}`);
            const text = params.response_format === constants_js_1.ResponseFormat.JSON
                ? JSON.stringify(gear, null, 2)
                : (0, formatters_js_1.formatGearMarkdown)(gear);
            return { content: [{ type: "text", text }] };
        }
        catch (error) {
            return {
                isError: true,
                content: [{ type: "text", text: (0, strava_client_js_1.handleApiError)(error) }],
            };
        }
    });
}
