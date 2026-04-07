import type { ActivitySummary, DetailedActivity, AthleteProfile, AthleteStats, ActivityTotal, SegmentDetail, ExplorerSegment, Route, Club, GearSummary, Comment, Lap } from "../types.js";
/** Meters → miles */
export declare function metersToMiles(m: number): string;
/** Meters → kilometers */
export declare function metersToKm(m: number): string;
/** Meters → feet */
export declare function metersToFeet(m: number): string;
/** Seconds → human-readable duration */
export declare function formatDuration(seconds: number): string;
/** m/s → min/mi pace */
export declare function formatPace(metersPerSecond: number): string;
/** m/s → mph */
export declare function formatSpeed(metersPerSecond: number): string;
/** ISO date string → readable format */
export declare function formatDate(iso: string): string;
/** Truncate text if it exceeds CHARACTER_LIMIT */
export declare function truncateIfNeeded(text: string, itemCount?: number): string;
export declare function formatAthleteMarkdown(a: AthleteProfile): string;
export declare function formatActivityTotalMarkdown(label: string, t: ActivityTotal): string;
export declare function formatStatsMarkdown(s: AthleteStats): string;
export declare function formatActivitySummaryMarkdown(a: ActivitySummary): string;
export declare function formatDetailedActivityMarkdown(a: DetailedActivity): string;
export declare function formatSegmentMarkdown(s: SegmentDetail): string;
export declare function formatExplorerSegmentMarkdown(s: ExplorerSegment): string;
export declare function formatRouteMarkdown(r: Route): string;
export declare function formatClubMarkdown(c: Club): string;
export declare function formatGearMarkdown(g: GearSummary): string;
export declare function formatCommentMarkdown(c: Comment): string;
export declare function formatLapMarkdown(l: Lap): string;
//# sourceMappingURL=formatters.d.ts.map