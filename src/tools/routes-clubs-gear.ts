import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ResponseFormat } from "../constants.js";
import { getClient, handleApiError } from "../services/strava-client.js";
import {
  formatRouteMarkdown,
  formatClubMarkdown,
  formatGearMarkdown,
  formatActivitySummaryMarkdown,
  truncateIfNeeded,
} from "../services/formatters.js";
import {
  ListRoutesSchema,
  GetRouteSchema,
  ListClubsSchema,
  GetClubSchema,
  ListClubMembersSchema,
  ListClubActivitiesSchema,
  GetGearSchema,
} from "../schemas/index.js";
import type {
  Route,
  Club,
  GearSummary,
  ActivitySummary,
} from "../types.js";

export function registerRoutesClubsGearTools(server: McpServer): void {
  // ── List Routes ────────────────────────────────────────────────────
  server.registerTool(
    "strava_list_routes",
    {
      title: "List Strava Routes",
      description: `Returns routes created by a specific athlete.

Args:
  - athlete_id (number): Athlete ID whose routes to list
  - page (number): Page number (default: 1)
  - per_page (number): Items per page (default: 30)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns: List of routes with name, distance, elevation gain, and estimated time.`,
      inputSchema: ListRoutesSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: z.infer<typeof ListRoutesSchema>) => {
      try {
        const client = getClient();
        const routes = await client.get<Route[]>(
          `/athletes/${params.athlete_id}/routes`,
          { page: params.page, per_page: params.per_page }
        );

        if (routes.length === 0) {
          return {
            content: [{ type: "text", text: "No routes found for this athlete." }],
          };
        }

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: "text", text: JSON.stringify(routes, null, 2) }],
          };
        }

        const lines = ["# Routes", ""];
        for (const r of routes) {
          lines.push(formatRouteMarkdown(r), "");
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

  // ── Get Route ──────────────────────────────────────────────────────
  server.registerTool(
    "strava_get_route",
    {
      title: "Get Strava Route",
      description: `Returns a specific route by ID.

Args:
  - id (number): Route ID
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns: Route details including name, distance, elevation, type, and description.`,
      inputSchema: GetRouteSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: z.infer<typeof GetRouteSchema>) => {
      try {
        const client = getClient();
        const route = await client.get<Route>(`/routes/${params.id}`);
        const text =
          params.response_format === ResponseFormat.JSON
            ? JSON.stringify(route, null, 2)
            : formatRouteMarkdown(route);
        return { content: [{ type: "text", text }] };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: handleApiError(error) }],
        };
      }
    }
  );

  // ── List Athlete Clubs ─────────────────────────────────────────────
  server.registerTool(
    "strava_list_clubs",
    {
      title: "List Strava Clubs",
      description: `Returns clubs the authenticated athlete is a member of.

Args:
  - page (number): Page number (default: 1)
  - per_page (number): Items per page (default: 30)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns: List of clubs with name, sport type, location, member count.`,
      inputSchema: ListClubsSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: z.infer<typeof ListClubsSchema>) => {
      try {
        const client = getClient();
        const clubs = await client.get<Club[]>("/athlete/clubs", {
          page: params.page,
          per_page: params.per_page,
        });

        if (clubs.length === 0) {
          return {
            content: [{ type: "text", text: "You are not a member of any clubs." }],
          };
        }

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: "text", text: JSON.stringify(clubs, null, 2) }],
          };
        }

        const lines = ["# Your Clubs", ""];
        for (const c of clubs) {
          lines.push(formatClubMarkdown(c), "");
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

  // ── Get Club ───────────────────────────────────────────────────────
  server.registerTool(
    "strava_get_club",
    {
      title: "Get Strava Club",
      description: `Returns detailed info about a specific club.

Args:
  - id (number): Club ID
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns: Club detail with description, member count, sport type, and location.`,
      inputSchema: GetClubSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: z.infer<typeof GetClubSchema>) => {
      try {
        const client = getClient();
        const club = await client.get<Club>(`/clubs/${params.id}`);
        const text =
          params.response_format === ResponseFormat.JSON
            ? JSON.stringify(club, null, 2)
            : formatClubMarkdown(club);
        return { content: [{ type: "text", text }] };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: handleApiError(error) }],
        };
      }
    }
  );

  // ── List Club Members ──────────────────────────────────────────────
  server.registerTool(
    "strava_list_club_members",
    {
      title: "List Strava Club Members",
      description: `Returns the members of a specific club.

Args:
  - id (number): Club ID
  - page (number): Page number (default: 1)
  - per_page (number): Items per page (default: 30)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns: List of club members with name.`,
      inputSchema: ListClubMembersSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: z.infer<typeof ListClubMembersSchema>) => {
      try {
        const client = getClient();
        const members = await client.get<
          Array<{ firstname: string; lastname: string; membership: string }>
        >(`/clubs/${params.id}/members`, {
          page: params.page,
          per_page: params.per_page,
        });

        if (members.length === 0) {
          return {
            content: [{ type: "text", text: "No members found." }],
          };
        }

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [{ type: "text", text: JSON.stringify(members, null, 2) }],
          };
        }

        const lines = [`# Club Members (${members.length})`, ""];
        for (const m of members) {
          lines.push(`- ${m.firstname} ${m.lastname}`);
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

  // ── List Club Activities ───────────────────────────────────────────
  server.registerTool(
    "strava_list_club_activities",
    {
      title: "List Strava Club Activities",
      description: `Returns recent activities from members of a specific club.

Args:
  - id (number): Club ID
  - page (number): Page number (default: 1)
  - per_page (number): Items per page (default: 30)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns: List of recent club member activities.`,
      inputSchema: ListClubActivitiesSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: z.infer<typeof ListClubActivitiesSchema>) => {
      try {
        const client = getClient();
        const activities = await client.get<ActivitySummary[]>(
          `/clubs/${params.id}/activities`,
          { page: params.page, per_page: params.per_page }
        );

        if (activities.length === 0) {
          return {
            content: [
              { type: "text", text: "No recent club activities found." },
            ],
          };
        }

        if (params.response_format === ResponseFormat.JSON) {
          return {
            content: [
              {
                type: "text",
                text: truncateIfNeeded(JSON.stringify(activities, null, 2)),
              },
            ],
          };
        }

        const lines = ["# Recent Club Activities", ""];
        for (const a of activities) {
          lines.push(formatActivitySummaryMarkdown(a), "");
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

  // ── Get Gear ───────────────────────────────────────────────────────
  server.registerTool(
    "strava_get_gear",
    {
      title: "Get Strava Gear",
      description: `Returns equipment/gear detail by ID.

Gear IDs are prefixed: 'b' for bikes (e.g. 'b12345'), 's' for shoes (e.g. 's12345'). Find gear IDs from activity details or the athlete profile.

Args:
  - id (string): Gear ID (e.g. 'b12345' for bikes, 's12345' for shoes)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns: Gear details including name, brand, model, total distance, and primary status.`,
      inputSchema: GetGearSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: z.infer<typeof GetGearSchema>) => {
      try {
        const client = getClient();
        const gear = await client.get<GearSummary>(`/gear/${params.id}`);
        const text =
          params.response_format === ResponseFormat.JSON
            ? JSON.stringify(gear, null, 2)
            : formatGearMarkdown(gear);
        return { content: [{ type: "text", text }] };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: handleApiError(error) }],
        };
      }
    }
  );
}
