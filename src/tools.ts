import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  StravaClient,
  formatDist,
  formatTime,
  formatPace,
  formatSpeed,
  apiError,
} from "./client.js";

// ─── Types ─────────────────────────────────────────────────────────────────

interface Activity {
  id: number;
  name: string;
  sport_type: string;
  type: string;
  start_date_local: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  kudos_count: number;
  athlete_count: number;
  trainer?: boolean;
  description?: string;
  gear?: Record<string, unknown>;
  splits_metric?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

// ─── Field stripping ───────────────────────────────────────────────────────
// Removes large/useless fields from Strava API responses before returning to Claude.
// Eliminates ~60% of token bloat: GPS polylines, upload IDs, internal flags, etc.

const STRIP_FIELDS = new Set([
  "map", "upload_id", "upload_id_str", "external_id", "from_accepted_tag",
  "display_hide_heartrate_option", "heartrate_opt_out", "resource_state",
  "photo_count", "has_kudoed", "flagged", "visibility", "athlete",
  "achievement_count", "pr_count", "total_photo_count", "elev_high", "elev_low",
]);

function stripActivity(a: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(a).filter(([k]) => !STRIP_FIELDS.has(k))
  );
}

// ─── Formatters ────────────────────────────────────────────────────────────

function activitySummary(a: Activity): string {
  const date = new Date(a.start_date_local).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
  const sport = a.sport_type || a.type || "Activity";
  const isRun = sport.toLowerCase().includes("run");
  const lines = [
    `**${a.name}** [${a.id}] · ${sport}${a.trainer ? " 🏠" : ""} · ${date}`,
    `  ${formatDist(a.distance)} · +${Math.round(a.total_elevation_gain)}m · ${formatTime(a.moving_time)}`,
    `  ${isRun ? formatPace(a.average_speed) : formatSpeed(a.average_speed)}${a.average_heartrate ? ` · HR ${Math.round(a.average_heartrate)}bpm` : ""}`,
  ];
  return lines.join("\n");
}

// ─── Tool registration ─────────────────────────────────────────────────────

export function registerTools(server: McpServer, getClient: () => StravaClient | null): void {

  function client(): StravaClient {
    const c = getClient();
    if (!c) throw new Error("Not connected to Strava. Visit http://localhost:" + (process.env.PORT || 3000) + "/setup to authorize.");
    return c;
  }

  // ── Athlete ────────────────────────────────────────────────────────────

  server.registerTool("strava_get_athlete", {
    title: "Get My Strava Profile",
    description: "Get the authenticated athlete's profile: name, location, follower/following counts, weight, and athlete ID.",
    inputSchema: z.object({}).strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async () => {
    try {
      const a = await client().get<Record<string, unknown>>("/athlete");
      const text = [
        `**${a.firstname} ${a.lastname}** (@${a.username || "N/A"})`,
        `Location: ${[a.city, a.state, a.country].filter(Boolean).join(", ") || "N/A"}`,
        `Followers: ${a.follower_count} · Following: ${a.friend_count}`,
        `Weight: ${a.weight ? `${a.weight} kg` : "N/A"} · Sex: ${a.sex || "N/A"}`,
        `Athlete ID: ${a.id}`,
        `Member since: ${new Date(a.created_at as string).toLocaleDateString()}`,
      ].join("\n");
      return { content: [{ type: "text", text }], structuredContent: a };
    } catch (e) { return { content: [{ type: "text", text: apiError(e) }], isError: true }; }
  });

  server.registerTool("strava_get_stats", {
    title: "Get My Training Stats",
    description: "Get lifetime, year-to-date, and recent (4-week) training stats for runs, rides, and swims. Includes distance, time, elevation, and activity counts.",
    inputSchema: z.object({}).strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async () => {
    try {
      const c = client();
      // Athlete ID is cached in token state — no extra API call needed
      const { id: athleteId } = c.getAthleteInfo();
      if (!athleteId) throw new Error("Athlete ID not found. Re-authorize at /setup.");
      const stats = await c.get<Record<string, unknown>>(`/athletes/${athleteId}/stats`);

      const block = (label: string, b: Record<string, unknown>) => [
        `  ${label}:`,
        `    Activities: ${b.count} · Distance: ${formatDist(Number(b.distance))}`,
        `    Time: ${formatTime(Number(b.moving_time))} · Elevation: +${Math.round(Number(b.elevation_gain))} m`,
      ].join("\n");

      const lines: string[] = ["**My Training Stats**\n"];
      for (const [label, key] of [["🏃 Runs", "run"], ["🚴 Rides", "ride"], ["🏊 Swims", "swim"]] as const) {
        lines.push(`**${label}**`);
        lines.push(block("Recent (4 wks)", stats[`recent_${key}_totals`] as Record<string, unknown>));
        lines.push(block("Year to Date", stats[`ytd_${key}_totals`] as Record<string, unknown>));
        lines.push(block("All Time", stats[`all_${key}_totals`] as Record<string, unknown>));
        lines.push("");
      }
      return { content: [{ type: "text", text: lines.join("\n") }], structuredContent: { stats } };
    } catch (e) { return { content: [{ type: "text", text: apiError(e) }], isError: true }; }
  });

  server.registerTool("strava_list_gear", {
    title: "List My Gear",
    description: "List all bikes and shoes registered on Strava with total mileage.",
    inputSchema: z.object({}).strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async () => {
    try {
      const athlete = await client().get<{ bikes: unknown[]; shoes: unknown[] }>("/athlete");
      const gear = [...(athlete.bikes || []), ...(athlete.shoes || [])] as Array<Record<string, unknown>>;
      if (!gear.length) return { content: [{ type: "text", text: "No gear found." }] };
      const lines = gear.map(g =>
        `${g.primary ? "⭐ " : ""}**${g.name}** — ${formatDist(Number(g.distance))} total [${g.id}]`
      );
      return { content: [{ type: "text", text: `**My Gear**\n${lines.join("\n")}` }], structuredContent: { gear } };
    } catch (e) { return { content: [{ type: "text", text: apiError(e) }], isError: true }; }
  });

  // ── Activities ─────────────────────────────────────────────────────────

  // Aggregation tool — use for mileage/totals questions. Single call, tiny response.
  server.registerTool("strava_get_totals", {
    title: "Get Activity Totals for a Time Range",
    description: `Aggregate distance, time, elevation, and count for a time range. PREFER this over strava_list_activities for questions like "how many miles did I run last week", "total cycling in March", etc. One call, minimal tokens.

Args:
  - after: Unix timestamp — start of range (required)
  - before: Unix timestamp — end of range (required)
  - sport_type: Filter by sport e.g. "Run", "Ride", "Walk", "Swim" (optional, omit for all)

Returns: count, miles, km, time, elevation, avg per activity + one-line breakdown.`,
    inputSchema: z.object({
      after: z.number().int().describe("Start of range as Unix timestamp"),
      before: z.number().int().describe("End of range as Unix timestamp"),
      sport_type: z.string().optional().describe("Run, Ride, Walk, Swim — omit for all"),
    }).strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ after, before, sport_type }) => {
    try {
      let page = 1;
      let all: Activity[] = [];
      while (true) {
        const batch = await client().get<Activity[]>("/athlete/activities", { after, before, per_page: 200, page });
        if (!batch.length) break;
        all = all.concat(batch);
        if (batch.length < 200) break;
        page++;
      }

      const filtered = sport_type
        ? all.filter(a => (a.sport_type || a.type || "").toLowerCase() === sport_type.toLowerCase())
        : all;

      if (!filtered.length) {
        return { content: [{ type: "text", text: `No ${sport_type || ""}activities found in that range.` }] };
      }

      const totalM = filtered.reduce((s, a) => s + (a.distance || 0), 0);
      const totalSecs = filtered.reduce((s, a) => s + (a.moving_time || 0), 0);
      const totalElev = filtered.reduce((s, a) => s + (a.total_elevation_gain || 0), 0);
      const totalMiles = totalM / 1609.344;
      const totalKm = totalM / 1000;

      const breakdown = filtered.map(a => {
        const d = new Date(a.start_date_local).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
        return `  ${d} · ${a.name} · ${(a.distance / 1609.344).toFixed(2)} mi`;
      });

      const lines = [
        `**${sport_type || "All activity"} totals — ${filtered.length} activities**`,
        `  Distance: ${totalMiles.toFixed(2)} mi / ${totalKm.toFixed(2)} km`,
        `  Moving Time: ${formatTime(totalSecs)}`,
        `  Elevation: +${Math.round(totalElev)} m`,
        `  Avg/activity: ${(totalMiles / filtered.length).toFixed(2)} mi`,
        "", "**Breakdown:**", ...breakdown,
      ];

      return {
        content: [{ type: "text", text: lines.join("\n") }],
        structuredContent: {
          count: filtered.length,
          total_distance_miles: parseFloat(totalMiles.toFixed(2)),
          total_distance_km: parseFloat(totalKm.toFixed(2)),
          total_moving_time_secs: totalSecs,
          total_elevation_m: Math.round(totalElev),
        },
      };
    } catch (e) { return { content: [{ type: "text", text: apiError(e) }], isError: true }; }
  });

  server.registerTool("strava_list_activities", {
    title: "List My Activities",
    description: `List recent activities with compact summaries. For mileage totals use strava_get_totals — it's faster and cheaper.

Args:
  - page: Page number (default 1)
  - per_page: 1-100 per page (default 15)
  - after / before: Unix timestamps to filter by date range
  - sport_type: Filter by type — "Run", "Ride", "Walk", "Swim", etc. (optional)`,
    inputSchema: z.object({
      page: z.number().int().min(1).default(1),
      per_page: z.number().int().min(1).max(100).default(15),
      after: z.number().int().optional().describe("Unix timestamp — activities after this time"),
      before: z.number().int().optional().describe("Unix timestamp — activities before this time"),
      sport_type: z.string().optional().describe("Filter: Run, Ride, Walk, Swim, etc."),
    }).strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ page, per_page, after, before, sport_type }) => {
    try {
      const params: Record<string, unknown> = { page, per_page };
      if (after) params.after = after;
      if (before) params.before = before;
      let acts = await client().get<Activity[]>("/athlete/activities", params);
      if (!acts.length) return { content: [{ type: "text", text: "No activities found." }] };

      // Apply sport_type filter server-side (Strava API doesn't support this natively)
      if (sport_type) {
        acts = acts.filter(a => (a.sport_type || a.type || "").toLowerCase() === sport_type.toLowerCase());
      }

      // Strip fat fields before returning
      const stripped = acts.map(a => stripActivity(a as unknown as Record<string, unknown>));
      const hasMore = acts.length === per_page;
      const header = `**Activities** (page ${page}, ${acts.length} shown${hasMore ? " — more available" : ""})`;
      const text = header + "\n\n" + acts.map(activitySummary).join("\n\n");

      return { content: [{ type: "text", text }], structuredContent: { activities: stripped, has_more: hasMore } };
    } catch (e) { return { content: [{ type: "text", text: apiError(e) }], isError: true }; }
  });

  server.registerTool("strava_get_activity", {
    title: "Get Activity Details",
    description: `Get full details for a specific activity by ID. Includes km splits, gear, description, and segment efforts.

Args:
  - id: Activity ID (get from strava_list_activities)
  - include_all_efforts: Include all segment efforts (default false)`,
    inputSchema: z.object({
      id: z.number().int().describe("Activity ID from strava_list_activities"),
      include_all_efforts: z.boolean().default(false),
    }).strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ id, include_all_efforts }) => {
    try {
      const a = await client().get<Activity>(`/activities/${id}`, { include_all_efforts });
      const lines = [activitySummary(a)];
      if (a.description) lines.push(`  Description: ${a.description}`);
      if (a.gear) lines.push(`  Gear: ${(a.gear as Record<string, unknown>).name}`);
      if (a.splits_metric?.length) {
        lines.push("\n**Km Splits**");
        a.splits_metric.forEach((s, i) => {
          lines.push(`  km ${i + 1}: ${formatTime(Number(s.moving_time))} · ${formatPace(Number(s.average_speed))} · +${Math.round(Number(s.elevation_difference))} m`);
        });
      }
      return { content: [{ type: "text", text: lines.join("\n") }], structuredContent: { activity: stripActivity(a as unknown as Record<string, unknown>) } };
    } catch (e) { return { content: [{ type: "text", text: apiError(e) }], isError: true }; }
  });

  server.registerTool("strava_get_activity_laps", {
    title: "Get Activity Laps",
    description: "Get lap data for a specific activity. Useful for structured workouts with intervals.",
    inputSchema: z.object({
      id: z.number().int().describe("Activity ID"),
    }).strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ id }) => {
    try {
      const laps = await client().get<Array<Record<string, unknown>>>(`/activities/${id}/laps`);
      if (!laps.length) return { content: [{ type: "text", text: "No laps found." }] };
      const lines = laps.map((l, i) => {
        const parts = [
          `Lap ${i + 1}: ${formatDist(Number(l.distance))} · ${formatTime(Number(l.moving_time))}`,
          l.average_speed ? ` · ${formatPace(Number(l.average_speed))}` : "",
          l.average_heartrate ? ` · HR ${Math.round(Number(l.average_heartrate))} bpm` : "",
        ];
        return parts.join("");
      });
      return { content: [{ type: "text", text: `**Laps for Activity #${id}**\n${lines.join("\n")}` }], structuredContent: { laps } };
    } catch (e) { return { content: [{ type: "text", text: apiError(e) }], isError: true }; }
  });

  server.registerTool("strava_get_activity_streams", {
    title: "Get Activity Data Streams",
    description: `Get time-series sensor data for an activity (GPS, HR, power, cadence, altitude, etc.)

Args:
  - id: Activity ID
  - keys: Which streams to fetch (time, distance, latlng, altitude, heartrate, cadence, watts, velocity_smooth, grade_smooth)
  - resolution: 'low' | 'medium' | 'high' (default: medium)`,
    inputSchema: z.object({
      id: z.number().int(),
      keys: z.array(z.enum([
        "time", "distance", "latlng", "altitude", "velocity_smooth",
        "heartrate", "cadence", "watts", "temp", "moving", "grade_smooth"
      ])).min(1),
      resolution: z.enum(["low", "medium", "high"]).default("medium"),
    }).strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ id, keys, resolution }) => {
    try {
      const streams = await client().get<Record<string, { data: unknown[]; series_type: string }>>(
        `/activities/${id}/streams`,
        { keys: keys.join(","), key_by_type: true, resolution }
      );
      const summary = Object.entries(streams).map(([k, v]) =>
        `  ${k}: ${v.data.length} data points`
      ).join("\n");
      return { content: [{ type: "text", text: `**Streams for #${id}** (${resolution} resolution)\n${summary}` }], structuredContent: { streams } };
    } catch (e) { return { content: [{ type: "text", text: apiError(e) }], isError: true }; }
  });

  server.registerTool("strava_update_activity", {
    title: "Update an Activity",
    description: "Update the name, description, sport type, or commute/trainer flags of an activity.",
    inputSchema: z.object({
      id: z.number().int().describe("Activity ID to update"),
      name: z.string().optional(),
      description: z.string().optional(),
      sport_type: z.string().optional().describe("e.g. Run, Ride, Swim, Walk, Hike"),
      commute: z.boolean().optional(),
      trainer: z.boolean().optional(),
      hide_from_home: z.boolean().optional(),
    }).strict(),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ id, ...updates }) => {
    try {
      const body = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
      const updated = await client().put<Activity>(`/activities/${id}`, body);
      return { content: [{ type: "text", text: `✅ Updated:\n${activitySummary(updated)}` }], structuredContent: { activity: updated } };
    } catch (e) { return { content: [{ type: "text", text: apiError(e) }], isError: true }; }
  });

  // ── Segments ───────────────────────────────────────────────────────────

  server.registerTool("strava_get_segment", {
    title: "Get Segment Details",
    description: "Get details for a Strava segment by ID: distance, elevation, grade, effort count, athlete count.",
    inputSchema: z.object({
      id: z.number().int().describe("Segment ID"),
    }).strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, async ({ id }) => {
    try {
      const s = await client().get<Record<string, unknown>>(`/segments/${id}`);
      const text = [
        `**${s.name}** [ID: ${s.id}]`,
        `  ${s.activity_type} · ${formatDist(Number(s.distance))} · +${Math.round(Number(s.total_elevation_gain))} m`,
        `  Avg grade: ${Number(s.average_grade).toFixed(1)}% · Max grade: ${Number(s.maximum_grade).toFixed(1)}%`,
        `  Climb cat: ${s.climb_category} · Athletes: ${s.athlete_count} · Efforts: ${s.effort_count}`,
        `  Starred by ${s.star_count} athletes${s.hazardous ? " · ⚠️ Hazardous" : ""}`,
      ].join("\n");
      return { content: [{ type: "text", text }], structuredContent: { segment: s } };
    } catch (e) { return { content: [{ type: "text", text: apiError(e) }], isError: true }; }
  });

  server.registerTool("strava_get_segment_leaderboard", {
    title: "Get Segment Leaderboard",
    description: "Get the fastest times on a segment.",
    inputSchema: z.object({
      id: z.number().int().describe("Segment ID"),
      per_page: z.number().int().min(1).max(200).default(10),
    }).strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, async ({ id, per_page }) => {
    try {
      const lb = await client().get<{ entry_count: number; entries: Array<Record<string, unknown>> }>(
        `/segments/${id}/leaderboard`, { per_page }
      );
      if (!lb.entries?.length) return { content: [{ type: "text", text: "No leaderboard data." }] };
      const lines = lb.entries.map(e =>
        `${e.rank}. **${e.athlete_name}** — ${formatTime(Number(e.elapsed_time))} (${new Date(e.start_date_local as string).toLocaleDateString()})`
      );
      return { content: [{ type: "text", text: `**Leaderboard** (${lb.entry_count} total)\n${lines.join("\n")}` }], structuredContent: { leaderboard: lb } };
    } catch (e) { return { content: [{ type: "text", text: apiError(e) }], isError: true }; }
  });

  server.registerTool("strava_list_starred_segments", {
    title: "List My Starred Segments",
    description: "List segments the authenticated athlete has starred.",
    inputSchema: z.object({
      page: z.number().int().min(1).default(1),
      per_page: z.number().int().min(1).max(200).default(30),
    }).strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ page, per_page }) => {
    try {
      const segs = await client().get<Array<Record<string, unknown>>>("/segments/starred", { page, per_page });
      if (!segs.length) return { content: [{ type: "text", text: "No starred segments." }] };
      const lines = segs.map(s =>
        `⭐ **${s.name}** [${s.id}] — ${formatDist(Number(s.distance))} · ${Number(s.average_grade).toFixed(1)}% grade`
      );
      return { content: [{ type: "text", text: lines.join("\n") }], structuredContent: { segments: segs } };
    } catch (e) { return { content: [{ type: "text", text: apiError(e) }], isError: true }; }
  });

  // ── Clubs ──────────────────────────────────────────────────────────────

  server.registerTool("strava_list_clubs", {
    title: "List My Clubs",
    description: "List all Strava clubs the authenticated athlete belongs to.",
    inputSchema: z.object({}).strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async () => {
    try {
      const clubs = await client().get<Array<Record<string, unknown>>>("/athlete/clubs");
      if (!clubs.length) return { content: [{ type: "text", text: "Not a member of any clubs." }] };
      const lines = clubs.map(c =>
        `**${c.name}** [ID: ${c.id}] — ${c.sport_type} · ${c.city || "N/A"} · ${c.member_count} members${c.private ? " 🔒" : ""}`
      );
      return { content: [{ type: "text", text: lines.join("\n") }], structuredContent: { clubs } };
    } catch (e) { return { content: [{ type: "text", text: apiError(e) }], isError: true }; }
  });

  server.registerTool("strava_get_club_activities", {
    title: "Get Club Activity Feed",
    description: "Get recent activities from a club's members.",
    inputSchema: z.object({
      id: z.number().int().describe("Club ID from strava_list_clubs"),
      page: z.number().int().min(1).default(1),
      per_page: z.number().int().min(1).max(200).default(30),
    }).strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ id, page, per_page }) => {
    try {
      const acts = await client().get<Array<Record<string, unknown>>>(`/clubs/${id}/activities`, { page, per_page });
      if (!acts.length) return { content: [{ type: "text", text: "No club activities found." }] };
      const lines = acts.map(a => {
        const ath = a.athlete as Record<string, unknown>;
        return `**${ath?.firstname} ${ath?.lastname}** — ${a.name} (${a.sport_type || a.type}) · ${formatDist(Number(a.distance))}`;
      });
      return { content: [{ type: "text", text: lines.join("\n") }], structuredContent: { activities: acts } };
    } catch (e) { return { content: [{ type: "text", text: apiError(e) }], isError: true }; }
  });

  // ── Routes ─────────────────────────────────────────────────────────────

  server.registerTool("strava_list_routes", {
    title: "List My Routes",
    description: "List routes created by the authenticated athlete.",
    inputSchema: z.object({
      page: z.number().int().min(1).default(1),
      per_page: z.number().int().min(1).max(200).default(30),
    }).strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ page, per_page }) => {
    try {
      const c = client();
      const { id: athleteId } = c.getAthleteInfo();
      if (!athleteId) throw new Error("Athlete ID not found. Re-authorize at /setup.");
      const routes = await c.get<Array<Record<string, unknown>>>(`/athletes/${athleteId}/routes`, { page, per_page });
      if (!routes.length) return { content: [{ type: "text", text: "No routes found." }] };
      const typeLabel = (t: number) => t === 1 ? "Ride" : t === 2 ? "Run" : "Other";
      const lines = routes.map(r =>
        `**${r.name}** [ID: ${r.id}]\n  ${typeLabel(Number(r.type))} · ${formatDist(Number(r.distance))} · +${Math.round(Number(r.elevation_gain))} m · Est. ${formatTime(Number(r.estimated_moving_time))}`
      );
      return { content: [{ type: "text", text: lines.join("\n\n") }], structuredContent: { routes } };
    } catch (e) { return { content: [{ type: "text", text: apiError(e) }], isError: true }; }
  });
}