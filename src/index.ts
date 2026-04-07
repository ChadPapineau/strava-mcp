#!/usr/bin/env node
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

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getClient } from "./services/strava-client.js";
import { registerAuthTools } from "./tools/auth.js";
import { registerAthleteTools } from "./tools/athlete.js";
import { registerActivityTools } from "./tools/activities.js";
import { registerSegmentTools } from "./tools/segments.js";
import { registerStreamTools } from "./tools/streams.js";
import { registerRoutesClubsGearTools } from "./tools/routes-clubs-gear.js";

// Create MCP server
const server = new McpServer({
  name: "strava-mcp-server",
  version: "1.0.0",
});

// Register all tool groups
registerAuthTools(server);
registerAthleteTools(server);
registerActivityTools(server);
registerSegmentTools(server);
registerStreamTools(server);
registerRoutesClubsGearTools(server);

// Main
async function main(): Promise<void> {
  // Validate configuration
  try {
    const client = getClient();
    client.validate();
  } catch (error) {
    process.stderr.write(
      `[strava-mcp] Configuration error: ${error instanceof Error ? error.message : String(error)}\n`
    );
    process.exit(1);
  }

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("[strava-mcp] Server running via stdio\n");
}

main().catch((error) => {
  process.stderr.write(
    `[strava-mcp] Fatal error: ${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exit(1);
});
