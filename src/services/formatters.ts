import { CHARACTER_LIMIT } from "../constants.js";
import type {
  ActivitySummary,
  DetailedActivity,
  AthleteProfile,
  AthleteStats,
  ActivityTotal,
  SegmentDetail,
  SegmentEffort,
  ExplorerSegment,
  Route,
  Club,
  GearSummary,
  Comment,
  Lap,
  BestEffort,
} from "../types.js";

// ─── Utility helpers ────────────────────────────────────────────────

/** Meters → miles */
export function metersToMiles(m: number): string {
  return (m / 1609.344).toFixed(2);
}

/** Meters → kilometers */
export function metersToKm(m: number): string {
  return (m / 1000).toFixed(2);
}

/** Meters → feet */
export function metersToFeet(m: number): string {
  return (m * 3.28084).toFixed(0);
}

/** Seconds → human-readable duration */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** m/s → min/mi pace */
export function formatPace(metersPerSecond: number): string {
  if (metersPerSecond <= 0) return "N/A";
  const secPerMile = 1609.344 / metersPerSecond;
  const min = Math.floor(secPerMile / 60);
  const sec = Math.round(secPerMile % 60);
  return `${min}:${sec.toString().padStart(2, "0")}/mi`;
}

/** m/s → mph */
export function formatSpeed(metersPerSecond: number): string {
  return (metersPerSecond * 2.23694).toFixed(1);
}

/** ISO date string → readable format */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Truncate text if it exceeds CHARACTER_LIMIT */
export function truncateIfNeeded(text: string, itemCount?: number): string {
  if (text.length <= CHARACTER_LIMIT) return text;
  const truncated = text.slice(0, CHARACTER_LIMIT);
  const msg = itemCount
    ? `\n\n---\n*Response truncated. Showing partial results. Use pagination or filters to see more.*`
    : `\n\n---\n*Response truncated at ${CHARACTER_LIMIT} characters.*`;
  return truncated + msg;
}

// ─── Athlete formatters ─────────────────────────────────────────────

export function formatAthleteMarkdown(a: AthleteProfile): string {
  const lines = [
    `# ${a.firstname} ${a.lastname}`,
    "",
    `- **Username**: ${a.username ?? "N/A"}`,
    `- **Location**: ${[a.city, a.state, a.country].filter(Boolean).join(", ") || "N/A"}`,
    `- **Sex**: ${a.sex ?? "N/A"}`,
    `- **Premium/Summit**: ${a.summit ? "Yes" : "No"}`,
    `- **Weight**: ${a.weight ? `${a.weight} kg` : "N/A"}`,
    `- **FTP**: ${a.ftp ? `${a.ftp}W` : "N/A"}`,
    `- **Measurement Preference**: ${a.measurement_preference}`,
    `- **Member Since**: ${formatDate(a.created_at)}`,
  ];
  if (a.bio) lines.push(`- **Bio**: ${a.bio}`);
  return lines.join("\n");
}

export function formatActivityTotalMarkdown(label: string, t: ActivityTotal): string {
  if (t.count === 0) return `**${label}**: No activities`;
  return [
    `**${label}**: ${t.count} activities`,
    `  - Distance: ${metersToMiles(t.distance)} mi (${metersToKm(t.distance)} km)`,
    `  - Moving time: ${formatDuration(t.moving_time)}`,
    `  - Elevation gain: ${metersToFeet(t.elevation_gain)} ft`,
  ].join("\n");
}

export function formatStatsMarkdown(s: AthleteStats): string {
  const lines = ["# Athlete Stats", ""];

  if (s.biggest_ride_distance) {
    lines.push(`**Biggest Ride**: ${metersToMiles(s.biggest_ride_distance)} mi`);
  }
  if (s.biggest_climb_elevation_gain) {
    lines.push(`**Biggest Climb**: ${metersToFeet(s.biggest_climb_elevation_gain)} ft`);
  }

  lines.push("", "## Recent (last 4 weeks)");
  lines.push(formatActivityTotalMarkdown("Rides", s.recent_ride_totals));
  lines.push(formatActivityTotalMarkdown("Runs", s.recent_run_totals));
  lines.push(formatActivityTotalMarkdown("Swims", s.recent_swim_totals));

  lines.push("", "## Year to Date");
  lines.push(formatActivityTotalMarkdown("Rides", s.ytd_ride_totals));
  lines.push(formatActivityTotalMarkdown("Runs", s.ytd_run_totals));
  lines.push(formatActivityTotalMarkdown("Swims", s.ytd_swim_totals));

  lines.push("", "## All Time");
  lines.push(formatActivityTotalMarkdown("Rides", s.all_ride_totals));
  lines.push(formatActivityTotalMarkdown("Runs", s.all_run_totals));
  lines.push(formatActivityTotalMarkdown("Swims", s.all_swim_totals));

  return lines.join("\n");
}

// ─── Activity formatters ────────────────────────────────────────────

export function formatActivitySummaryMarkdown(a: ActivitySummary): string {
  const lines = [
    `### ${a.name}`,
    `*${a.sport_type} — ${formatDate(a.start_date_local)}*`,
    "",
    `- **Distance**: ${metersToMiles(a.distance)} mi (${metersToKm(a.distance)} km)`,
    `- **Duration**: ${formatDuration(a.moving_time)} moving / ${formatDuration(a.elapsed_time)} elapsed`,
    `- **Elevation**: ${metersToFeet(a.total_elevation_gain)} ft gain`,
    `- **Speed**: ${formatSpeed(a.average_speed)} mph avg / ${formatSpeed(a.max_speed)} mph max`,
  ];
  if (a.has_heartrate && a.average_heartrate) {
    lines.push(`- **Heart Rate**: ${a.average_heartrate} avg / ${a.max_heartrate} max bpm`);
  }
  if (a.average_watts) {
    lines.push(`- **Power**: ${a.average_watts}W avg${a.max_watts ? ` / ${a.max_watts}W max` : ""}`);
  }
  if (a.weighted_average_watts) {
    lines.push(`- **Normalized Power**: ${a.weighted_average_watts}W`);
  }
  if (a.suffer_score) {
    lines.push(`- **Suffer Score**: ${a.suffer_score}`);
  }
  if (a.calories) {
    lines.push(`- **Calories**: ${a.calories}`);
  }
  lines.push(`- **Kudos**: ${a.kudos_count} | **Comments**: ${a.comment_count}`);
  lines.push(`- **ID**: ${a.id}`);
  return lines.join("\n");
}

export function formatDetailedActivityMarkdown(a: DetailedActivity): string {
  const lines = [formatActivitySummaryMarkdown(a)];

  if (a.description) {
    lines.push("", `**Description**: ${a.description}`);
  }
  if (a.gear) {
    lines.push(`- **Gear**: ${a.gear.name}`);
  }
  if (a.device_name) {
    lines.push(`- **Device**: ${a.device_name}`);
  }

  if (a.best_efforts && a.best_efforts.length > 0) {
    lines.push("", "#### Best Efforts");
    for (const e of a.best_efforts) {
      const pr = e.pr_rank ? ` 🏆 PR #${e.pr_rank}` : "";
      lines.push(`- **${e.name}**: ${formatDuration(e.elapsed_time)}${pr}`);
    }
  }

  if (a.segment_efforts && a.segment_efforts.length > 0) {
    lines.push("", `#### Segment Efforts (${a.segment_efforts.length})`);
    for (const se of a.segment_efforts.slice(0, 10)) {
      const pr = se.pr_rank ? ` 🏆 PR #${se.pr_rank}` : "";
      lines.push(`- **${se.name}**: ${formatDuration(se.elapsed_time)} (${metersToMiles(se.distance)} mi)${pr}`);
    }
    if (a.segment_efforts.length > 10) {
      lines.push(`- *...and ${a.segment_efforts.length - 10} more segments*`);
    }
  }

  return lines.join("\n");
}

// ─── Segment formatters ─────────────────────────────────────────────

export function formatSegmentMarkdown(s: SegmentDetail): string {
  const lines = [
    `# ${s.name}`,
    "",
    `- **Type**: ${s.activity_type}`,
    `- **Distance**: ${metersToMiles(s.distance)} mi (${metersToKm(s.distance)} km)`,
    `- **Grade**: ${s.average_grade}% avg / ${s.maximum_grade}% max`,
    `- **Elevation**: ${metersToFeet(s.elevation_low)} – ${metersToFeet(s.elevation_high)} ft (${metersToFeet(s.total_elevation_gain)} ft gain)`,
    `- **Climb Category**: ${s.climb_category}`,
    `- **Location**: ${[s.city, s.state, s.country].filter(Boolean).join(", ") || "N/A"}`,
    `- **Athletes**: ${s.athlete_count} | **Efforts**: ${s.effort_count}`,
    `- **Stars**: ${s.star_count}`,
    `- **Hazardous**: ${s.hazardous ? "Yes" : "No"}`,
    `- **ID**: ${s.id}`,
  ];
  if (s.xoms) {
    lines.push("", "#### Records");
    lines.push(`- **KOM**: ${s.xoms.kom}`);
    lines.push(`- **QOM**: ${s.xoms.qom}`);
    lines.push(`- **Overall**: ${s.xoms.overall}`);
  }
  return lines.join("\n");
}

export function formatExplorerSegmentMarkdown(s: ExplorerSegment): string {
  return [
    `### ${s.name} (ID: ${s.id})`,
    `- Cat ${s.climb_category_desc} | ${s.avg_grade}% avg | ${metersToMiles(s.distance)} mi | ${metersToFeet(s.elev_difference)} ft elev`,
  ].join("\n");
}

// ─── Route formatters ───────────────────────────────────────────────

export function formatRouteMarkdown(r: Route): string {
  const typeMap: Record<number, string> = { 1: "Ride", 2: "Run", 3: "Walk" };
  return [
    `### ${r.name} (ID: ${r.id})`,
    `- **Type**: ${typeMap[r.type] ?? `Type ${r.type}`}`,
    `- **Distance**: ${metersToMiles(r.distance)} mi`,
    `- **Elevation Gain**: ${metersToFeet(r.elevation_gain)} ft`,
    `- **Est. Moving Time**: ${formatDuration(r.estimated_moving_time)}`,
    `- **Starred**: ${r.starred ? "Yes" : "No"}`,
    r.description ? `- **Description**: ${r.description}` : "",
  ].filter(Boolean).join("\n");
}

// ─── Club formatters ────────────────────────────────────────────────

export function formatClubMarkdown(c: Club): string {
  return [
    `### ${c.name} (ID: ${c.id})`,
    `- **Sport**: ${c.sport_type}`,
    `- **Location**: ${[c.city, c.state, c.country].filter(Boolean).join(", ")}`,
    `- **Members**: ${c.member_count}`,
    `- **Private**: ${c.private ? "Yes" : "No"}`,
    `- **Verified**: ${c.verified ? "Yes" : "No"}`,
    c.description ? `- **Description**: ${c.description}` : "",
  ].filter(Boolean).join("\n");
}

// ─── Gear formatters ────────────────────────────────────────────────

export function formatGearMarkdown(g: GearSummary): string {
  return [
    `# ${g.name} (ID: ${g.id})`,
    g.brand_name ? `- **Brand**: ${g.brand_name}` : "",
    g.model_name ? `- **Model**: ${g.model_name}` : "",
    `- **Distance**: ${metersToMiles(g.distance)} mi`,
    `- **Primary**: ${g.primary ? "Yes" : "No"}`,
    g.description ? `- **Description**: ${g.description}` : "",
  ].filter(Boolean).join("\n");
}

// ─── Comment formatters ─────────────────────────────────────────────

export function formatCommentMarkdown(c: Comment): string {
  return `- **${c.athlete.firstname} ${c.athlete.lastname}** (${formatDate(c.created_at)}): ${c.text}`;
}

// ─── Lap formatters ─────────────────────────────────────────────────

export function formatLapMarkdown(l: Lap): string {
  const lines = [
    `**Lap ${l.lap_index}**: ${l.name}`,
    `  - Distance: ${metersToMiles(l.distance)} mi | Time: ${formatDuration(l.moving_time)} | Speed: ${formatSpeed(l.average_speed)} mph`,
  ];
  if (l.average_heartrate) {
    lines.push(`  - HR: ${l.average_heartrate} avg / ${l.max_heartrate} max bpm`);
  }
  if (l.average_watts) {
    lines.push(`  - Power: ${l.average_watts}W avg`);
  }
  return lines.join("\n");
}
