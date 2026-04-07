import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ResponseFormat } from "../constants.js";
import { getClient, handleApiError } from "../services/strava-client.js";
import {
  formatAthleteMarkdown,
  formatStatsMarkdown,
} from "../services/formatters.js";
import {
  GetAthleteSchema,
  GetAthleteStatsSchema,
  GetAthleteZonesSchema,
} from "../schemas/index.js";
import type { AthleteProfile, AthleteStats, AthleteZones } from "../types.js";

export function registerAthleteTools(server: McpServer): void {
  // ── Get Authenticated Athlete ──────────────────────────────────────
  server.registerTool(
    "strava_get_athlete",
    {
      title: "Get Strava Athlete Profile",
      description: `Returns the profile of the currently authenticated athlete.

Use this to get the athlete's ID (needed for other tools like stats and routes), name, location, weight, FTP, and other profile details.

Args:
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns: Athlete profile including id, name, location, weight, FTP, summit status, and more.`,
      inputSchema: GetAthleteSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: z.infer<typeof GetAthleteSchema>) => {
      try {
        const client = getClient();
        const athlete = await client.get<AthleteProfile>("/athlete");
        const text =
          params.response_format === ResponseFormat.JSON
            ? JSON.stringify(athlete, null, 2)
            : formatAthleteMarkdown(athlete);
        return { content: [{ type: "text", text }] };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: handleApiError(error) }],
        };
      }
    }
  );

  // ── Get Athlete Stats ──────────────────────────────────────────────
  server.registerTool(
    "strava_get_athlete_stats",
    {
      title: "Get Strava Athlete Stats",
      description: `Returns aggregate stats for an athlete: recent, year-to-date, and all-time totals for rides, runs, and swims.

Includes counts, distance, moving time, elevation gain, and biggest ride/climb records. Note: only Ride, Run, and Swim stats are available from this endpoint.

Args:
  - athlete_id (number): The athlete's numeric ID. Use strava_get_athlete first to find yours.
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns: Recent (4 week), YTD, and all-time totals for rides, runs, and swims.`,
      inputSchema: GetAthleteStatsSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: z.infer<typeof GetAthleteStatsSchema>) => {
      try {
        const client = getClient();
        const stats = await client.get<AthleteStats>(
          `/athletes/${params.athlete_id}/stats`
        );
        const text =
          params.response_format === ResponseFormat.JSON
            ? JSON.stringify(stats, null, 2)
            : formatStatsMarkdown(stats);
        return { content: [{ type: "text", text }] };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: handleApiError(error) }],
        };
      }
    }
  );

  // ── Get Athlete Zones ──────────────────────────────────────────────
  server.registerTool(
    "strava_get_athlete_zones",
    {
      title: "Get Strava Athlete Zones",
      description: `Returns the heart rate and power zones for the authenticated athlete.

Zones are used to categorize effort levels during activities. Heart rate zones may be custom or default. Power zones require a set FTP.

Args:
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns: Heart rate zones (with custom flag) and power zones (if FTP is set).`,
      inputSchema: GetAthleteZonesSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: z.infer<typeof GetAthleteZonesSchema>) => {
      try {
        const client = getClient();
        const zones = await client.get<AthleteZones>("/athlete/zones");

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: "text", text: JSON.stringify(zones, null, 2) }],
          };
        }

        const lines = ["# Athlete Zones", ""];
        if (zones.heart_rate) {
          lines.push(
            `## Heart Rate Zones ${zones.heart_rate.custom_zones ? "(Custom)" : "(Default)"}`,
            ""
          );
          zones.heart_rate.zones.forEach((z, i) => {
            lines.push(
              `- **Zone ${i + 1}**: ${z.min} – ${z.max === -1 ? "∞" : z.max} bpm`
            );
          });
        }
        if (zones.power) {
          lines.push("", "## Power Zones", "");
          zones.power.zones.forEach((z, i) => {
            lines.push(
              `- **Zone ${i + 1}**: ${z.min} – ${z.max === -1 ? "∞" : z.max} W`
            );
          });
        }

        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: handleApiError(error) }],
        };
      }
    }
  );
}
