#!/usr/bin/env node
"use strict";
/**
 * Strava MCP Server
 *
 * An MCP server providing comprehensive access to the Strava API v3.
 * Supports activities, athlete stats, segments, streams, routes, clubs, and gear.
 *
 * Required environment variables:
 *   STRAVA_CLIENT_ID      - Your Strava API application client ID
 *   STRAVA_CLIENT_SECRET   - Your Strava API application client secret
 *   STRAVA_ACCESS_TOKEN    - OAuth2 access token
 *   STRAVA_REFRESH_TOKEN   - OAuth2 refresh token (for automatic token refresh)
 */
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const strava_client_js_1 = require("./services/strava-client.js");
const auth_js_1 = require("./tools/auth.js");
const athlete_js_1 = require("./tools/athlete.js");
const activities_js_1 = require("./tools/activities.js");
const segments_js_1 = require("./tools/segments.js");
const streams_js_1 = require("./tools/streams.js");
const routes_clubs_gear_js_1 = require("./tools/routes-clubs-gear.js");
// Create MCP server
const server = new mcp_js_1.McpServer({
    name: "strava-mcp-server",
    version: "1.0.0",
});
// Register all tool groups
(0, auth_js_1.registerAuthTools)(server);
(0, athlete_js_1.registerAthleteTools)(server);
(0, activities_js_1.registerActivityTools)(server);
(0, segments_js_1.registerSegmentTools)(server);
(0, streams_js_1.registerStreamTools)(server);
(0, routes_clubs_gear_js_1.registerRoutesClubsGearTools)(server);
// Main
async function main() {
    // Validate configuration
    try {
        const client = (0, strava_client_js_1.getClient)();
        client.validate();
    }
    catch (error) {
        process.stderr.write(`[strava-mcp] Configuration error: ${error instanceof Error ? error.message : String(error)}\n`);
        process.exit(1);
    }
    // Connect via stdio transport
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    process.stderr.write("[strava-mcp] Server running via stdio\n");
}
main().catch((error) => {
    process.stderr.write(`[strava-mcp] Fatal error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
});
