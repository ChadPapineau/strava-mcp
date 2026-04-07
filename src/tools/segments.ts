import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ResponseFormat } from "../constants.js";
import { getClient, handleApiError } from "../services/strava-client.js";
import {
  formatSegmentMarkdown,
  formatExplorerSegmentMarkdown,
  formatDuration,
  metersToMiles,
  truncateIfNeeded,
} from "../services/formatters.js";
import {
  GetSegmentSchema,
  ExploreSegmentsSchema,
  GetSegmentLeaderboardSchema,
  ListStarredSegmentsSchema,
  GetSegmentEffortSchema,
} from "../schemas/index.js";
import type { SegmentDetail, ExplorerSegment, SegmentEffort } from "../types.js";

export function registerSegmentTools(server: McpServer): void {
  // ── Get Segment ────────────────────────────────────────────────────
  server.registerTool(
    "strava_get_segment",
    {
      title: "Get Strava Segment",
      description: `Returns detailed information about a specific segment by ID.

Includes distance, grade, elevation, location, effort/athlete counts, records (KOM/QOM), and your personal best effort.

Args:
  - id (number): Segment ID
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns: Full segment detail with stats, records, and athlete PR.`,
      inputSchema: GetSegmentSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: z.infer<typeof GetSegmentSchema>) => {
      try {
        const client = getClient();
        const segment = await client.get<SegmentDetail>(
          `/segments/${params.id}`
        );
        const text =
          params.response_format === ResponseFormat.JSON
            ? JSON.stringify(segment, null, 2)
            : formatSegmentMarkdown(segment);
        return { content: [{ type: "text", text }] };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: handleApiError(error) }],
        };
      }
    }
  );

  // ── Explore Segments ───────────────────────────────────────────────
  server.registerTool(
    "strava_explore_segments",
    {
      title: "Explore Strava Segments",
      description: `Finds popular segments within a geographic bounding box.

Use this to discover segments in an area. Returns up to 10 segments sorted by popularity.

Args:
  - bounds (string): Comma-separated bounding box: south_lat,west_lng,north_lat,east_lng (e.g. '37.7,-122.5,37.8,-122.4')
  - activity_type ('running' | 'riding'): Filter by activity type (default: 'riding')
  - min_cat (number, optional): Minimum climb category (0=HC, 5=Cat5)
  - max_cat (number, optional): Maximum climb category
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns: Up to 10 popular segments with name, category, grade, distance, and elevation.`,
      inputSchema: ExploreSegmentsSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: z.infer<typeof ExploreSegmentsSchema>) => {
      try {
        const client = getClient();
        const queryParams: Record<string, unknown> = {
          bounds: params.bounds,
          activity_type: params.activity_type,
        };
        if (params.min_cat !== undefined) queryParams.min_cat = params.min_cat;
        if (params.max_cat !== undefined) queryParams.max_cat = params.max_cat;

        const result = await client.get<{ segments: ExplorerSegment[] }>(
          "/segments/explore",
          queryParams
        );

        const segments = result.segments ?? [];
        if (segments.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No segments found in the specified area.",
              },
            ],
          };
        }

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [
              { type: "text", text: JSON.stringify(segments, null, 2) },
            ],
          };
        }

        const lines = [
          `# Segments in Area (${segments.length} found)`,
          "",
        ];
        for (const s of segments) {
          lines.push(formatExplorerSegmentMarkdown(s), "");
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

  // ── Get Segment Leaderboard ────────────────────────────────────────
  server.registerTool(
    "strava_get_segment_leaderboard",
    {
      title: "Get Strava Segment Leaderboard",
      description: `Returns the leaderboard for a specific segment.

Supports filtering by gender, age group, weight class, club, following, and date range.

Args:
  - id (number): Segment ID
  - gender ('M' | 'F', optional): Filter by gender
  - age_group (string, optional): e.g. '25_34', '35_44', '45_54', '55_64', '65_plus'
  - weight_class (string, optional): e.g. '55_64', '65_74', '75_84', '85_94', '95_plus' (kg)
  - following (boolean, optional): Only athletes you follow
  - club_id (number, optional): Filter by club
  - date_range ('this_year' | 'this_month' | 'this_week' | 'today', optional): Time period
  - page (number): Page number (default: 1)
  - per_page (number): Items per page (default: 30)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns: Ranked list of athletes with time, rank, and effort details.`,
      inputSchema: GetSegmentLeaderboardSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: z.infer<typeof GetSegmentLeaderboardSchema>) => {
      try {
        const client = getClient();
        const queryParams: Record<string, unknown> = {
          page: params.page,
          per_page: params.per_page,
        };
        if (params.gender) queryParams.gender = params.gender;
        if (params.age_group) queryParams.age_group = params.age_group;
        if (params.weight_class) queryParams.weight_class = params.weight_class;
        if (params.following) queryParams.following = params.following;
        if (params.club_id) queryParams.club_id = params.club_id;
        if (params.date_range) queryParams.date_range = params.date_range;

        const result = await client.get<{
          effort_count: number;
          entry_count: number;
          entries: Array<{
            athlete_name: string;
            elapsed_time: number;
            moving_time: number;
            start_date: string;
            start_date_local: string;
            rank: number;
          }>;
        }>(`/segments/${params.id}/leaderboard`, queryParams);

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [
              { type: "text", text: JSON.stringify(result, null, 2) },
            ],
          };
        }

        const lines = [
          `# Segment Leaderboard (${result.entry_count} entries, ${result.effort_count} total efforts)`,
          "",
        ];
        for (const e of result.entries) {
          lines.push(
            `${e.rank}. **${e.athlete_name}** — ${formatDuration(e.elapsed_time)} (${e.start_date_local?.split("T")[0] ?? ""})`
          );
        }
        return {
          content: [{ type: "text", text: truncateIfNeeded(lines.join("\n")) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: handleApiError(error) }],
        };
      }
    }
  );

  // ── List Starred Segments ──────────────────────────────────────────
  server.registerTool(
    "strava_list_starred_segments",
    {
      title: "List Starred Strava Segments",
      description: `Returns segments starred by the authenticated athlete.

Args:
  - page (number): Page number (default: 1)
  - per_page (number): Items per page (default: 30)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns: List of starred segments with basic info.`,
      inputSchema: ListStarredSegmentsSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: z.infer<typeof ListStarredSegmentsSchema>) => {
      try {
        const client = getClient();
        const segments = await client.get<SegmentDetail[]>(
          "/segments/starred",
          { page: params.page, per_page: params.per_page }
        );

        if (segments.length === 0) {
          return {
            content: [{ type: "text", text: "No starred segments." }],
          };
        }

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [
              { type: "text", text: JSON.stringify(segments, null, 2) },
            ],
          };
        }

        const lines = ["# Starred Segments", ""];
        for (const s of segments) {
          lines.push(
            `### ${s.name} (ID: ${s.id})`,
            `- ${s.activity_type} | ${metersToMiles(s.distance)} mi | ${s.average_grade}% avg grade`,
            ""
          );
        }
        return {
          content: [{ type: "text", text: truncateIfNeeded(lines.join("\n")) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: handleApiError(error) }],
        };
      }
    }
  );

  // ── Get Segment Effort ─────────────────────────────────────────────
  server.registerTool(
    "strava_get_segment_effort",
    {
      title: "Get Strava Segment Effort",
      description: `Returns a specific segment effort by its ID.

A segment effort is an athlete's attempt at a segment during an activity.

Args:
  - id (number): Segment effort ID (found in activity detail segment_efforts array)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns: Segment effort details including time, HR, power, cadence, and PR rank.`,
      inputSchema: GetSegmentEffortSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: z.infer<typeof GetSegmentEffortSchema>) => {
      try {
        const client = getClient();
        const effort = await client.get<SegmentEffort>(
          `/segment_efforts/${params.id}`
        );

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: "text", text: JSON.stringify(effort, null, 2) }],
          };
        }

        const pr = effort.pr_rank ? ` 🏆 PR #${effort.pr_rank}` : "";
        const lines = [
          `# ${effort.name}${pr}`,
          "",
          `- **Time**: ${formatDuration(effort.elapsed_time)} (${formatDuration(effort.moving_time)} moving)`,
          `- **Distance**: ${metersToMiles(effort.distance)} mi`,
        ];
        if (effort.average_heartrate) {
          lines.push(`- **HR**: ${effort.average_heartrate} avg / ${effort.max_heartrate} max bpm`);
        }
        if (effort.average_watts) {
          lines.push(`- **Power**: ${effort.average_watts}W avg`);
        }
        if (effort.average_cadence) {
          lines.push(`- **Cadence**: ${effort.average_cadence} avg`);
        }
        lines.push(
          "",
          `#### Segment: ${effort.segment.name}`,
          `- Distance: ${metersToMiles(effort.segment.distance)} mi | Grade: ${effort.segment.average_grade}% avg`
        );

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
