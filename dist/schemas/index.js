"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetGearSchema = exports.ListClubActivitiesSchema = exports.ListClubMembersSchema = exports.GetClubSchema = exports.ListClubsSchema = exports.GetRouteSchema = exports.ListRoutesSchema = exports.GetRouteStreamsSchema = exports.GetSegmentEffortStreamsSchema = exports.GetActivityStreamsSchema = exports.GetSegmentEffortSchema = exports.ListStarredSegmentsSchema = exports.GetSegmentLeaderboardSchema = exports.ExploreSegmentsSchema = exports.GetSegmentSchema = exports.GetActivityKudosSchema = exports.GetActivityCommentsSchema = exports.GetActivityZonesSchema = exports.GetActivityLapsSchema = exports.GetActivitySchema = exports.ListActivitiesSchema = exports.GetAthleteZonesSchema = exports.GetAthleteStatsSchema = exports.GetAthleteSchema = exports.PaginationSchema = exports.ResponseFormatSchema = void 0;
const zod_1 = require("zod");
const constants_js_1 = require("../constants.js");
// ─── Shared schemas ─────────────────────────────────────────────────
exports.ResponseFormatSchema = zod_1.z
    .nativeEnum(constants_js_1.ResponseFormat)
    .default(constants_js_1.ResponseFormat.MARKDOWN)
    .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable");
exports.PaginationSchema = {
    page: zod_1.z
        .number()
        .int()
        .min(1)
        .default(1)
        .describe("Page number (starts at 1)"),
    per_page: zod_1.z
        .number()
        .int()
        .min(1)
        .max(200)
        .default(30)
        .describe("Number of items per page (max 200)"),
};
// ─── Athlete schemas ────────────────────────────────────────────────
exports.GetAthleteSchema = zod_1.z
    .object({
    response_format: exports.ResponseFormatSchema,
})
    .strict();
exports.GetAthleteStatsSchema = zod_1.z
    .object({
    athlete_id: zod_1.z
        .number()
        .int()
        .positive()
        .describe("Athlete ID. Use the strava_get_athlete tool first to find your ID."),
    response_format: exports.ResponseFormatSchema,
})
    .strict();
exports.GetAthleteZonesSchema = zod_1.z
    .object({
    response_format: exports.ResponseFormatSchema,
})
    .strict();
// ─── Activity schemas ───────────────────────────────────────────────
exports.ListActivitiesSchema = zod_1.z
    .object({
    before: zod_1.z
        .number()
        .int()
        .optional()
        .describe("Epoch timestamp — only return activities before this time"),
    after: zod_1.z
        .number()
        .int()
        .optional()
        .describe("Epoch timestamp — only return activities after this time"),
    ...exports.PaginationSchema,
    response_format: exports.ResponseFormatSchema,
})
    .strict();
exports.GetActivitySchema = zod_1.z
    .object({
    id: zod_1.z.number().int().positive().describe("Activity ID"),
    include_all_efforts: zod_1.z
        .boolean()
        .default(false)
        .describe("Include all segment efforts (can be large)"),
    response_format: exports.ResponseFormatSchema,
})
    .strict();
exports.GetActivityLapsSchema = zod_1.z
    .object({
    id: zod_1.z.number().int().positive().describe("Activity ID"),
    response_format: exports.ResponseFormatSchema,
})
    .strict();
exports.GetActivityZonesSchema = zod_1.z
    .object({
    id: zod_1.z.number().int().positive().describe("Activity ID"),
    response_format: exports.ResponseFormatSchema,
})
    .strict();
exports.GetActivityCommentsSchema = zod_1.z
    .object({
    id: zod_1.z.number().int().positive().describe("Activity ID"),
    ...exports.PaginationSchema,
    response_format: exports.ResponseFormatSchema,
})
    .strict();
exports.GetActivityKudosSchema = zod_1.z
    .object({
    id: zod_1.z.number().int().positive().describe("Activity ID"),
    ...exports.PaginationSchema,
    response_format: exports.ResponseFormatSchema,
})
    .strict();
// ─── Segment schemas ────────────────────────────────────────────────
exports.GetSegmentSchema = zod_1.z
    .object({
    id: zod_1.z.number().int().positive().describe("Segment ID"),
    response_format: exports.ResponseFormatSchema,
})
    .strict();
exports.ExploreSegmentsSchema = zod_1.z
    .object({
    bounds: zod_1.z
        .string()
        .describe("Comma-separated bounding box: south_lat,west_lng,north_lat,east_lng (e.g. '37.7,-122.5,37.8,-122.4')"),
    activity_type: zod_1.z
        .enum(["running", "riding"])
        .default("riding")
        .describe("Activity type to filter segments"),
    min_cat: zod_1.z
        .number()
        .int()
        .min(0)
        .max(5)
        .optional()
        .describe("Minimum climb category (0=HC, 5=Cat5)"),
    max_cat: zod_1.z
        .number()
        .int()
        .min(0)
        .max(5)
        .optional()
        .describe("Maximum climb category"),
    response_format: exports.ResponseFormatSchema,
})
    .strict();
exports.GetSegmentLeaderboardSchema = zod_1.z
    .object({
    id: zod_1.z.number().int().positive().describe("Segment ID"),
    gender: zod_1.z.enum(["M", "F"]).optional().describe("Filter by gender"),
    age_group: zod_1.z
        .string()
        .optional()
        .describe("Age group filter (e.g. '25_34', '35_44')"),
    weight_class: zod_1.z
        .string()
        .optional()
        .describe("Weight class filter (e.g. '55_64', '65_74' in kg)"),
    following: zod_1.z
        .boolean()
        .optional()
        .describe("Only show athletes you follow"),
    club_id: zod_1.z
        .number()
        .int()
        .optional()
        .describe("Filter by club ID"),
    date_range: zod_1.z
        .enum(["this_year", "this_month", "this_week", "today"])
        .optional()
        .describe("Time period filter"),
    ...exports.PaginationSchema,
    response_format: exports.ResponseFormatSchema,
})
    .strict();
exports.ListStarredSegmentsSchema = zod_1.z
    .object({
    ...exports.PaginationSchema,
    response_format: exports.ResponseFormatSchema,
})
    .strict();
exports.GetSegmentEffortSchema = zod_1.z
    .object({
    id: zod_1.z.number().int().positive().describe("Segment effort ID"),
    response_format: exports.ResponseFormatSchema,
})
    .strict();
// ─── Stream schemas ─────────────────────────────────────────────────
const StreamKeysDescription = "Comma-separated stream types to retrieve. Options: time, distance, latlng, altitude, velocity_smooth, heartrate, cadence, watts, temp, moving, grade_smooth";
exports.GetActivityStreamsSchema = zod_1.z
    .object({
    id: zod_1.z.number().int().positive().describe("Activity ID"),
    keys: zod_1.z
        .string()
        .default("time,distance,altitude,heartrate,cadence,watts,velocity_smooth")
        .describe(StreamKeysDescription),
    key_by_type: zod_1.z
        .boolean()
        .default(true)
        .describe("If true, response keys are stream types rather than an array"),
    response_format: exports.ResponseFormatSchema,
})
    .strict();
exports.GetSegmentEffortStreamsSchema = zod_1.z
    .object({
    id: zod_1.z.number().int().positive().describe("Segment effort ID"),
    keys: zod_1.z
        .string()
        .default("time,distance,altitude,heartrate,cadence,watts")
        .describe(StreamKeysDescription),
    key_by_type: zod_1.z.boolean().default(true),
    response_format: exports.ResponseFormatSchema,
})
    .strict();
exports.GetRouteStreamsSchema = zod_1.z
    .object({
    id: zod_1.z.number().int().positive().describe("Route ID"),
    response_format: exports.ResponseFormatSchema,
})
    .strict();
// ─── Route schemas ──────────────────────────────────────────────────
exports.ListRoutesSchema = zod_1.z
    .object({
    athlete_id: zod_1.z
        .number()
        .int()
        .positive()
        .describe("Athlete ID whose routes to list"),
    ...exports.PaginationSchema,
    response_format: exports.ResponseFormatSchema,
})
    .strict();
exports.GetRouteSchema = zod_1.z
    .object({
    id: zod_1.z.number().int().positive().describe("Route ID"),
    response_format: exports.ResponseFormatSchema,
})
    .strict();
// ─── Club schemas ───────────────────────────────────────────────────
exports.ListClubsSchema = zod_1.z
    .object({
    ...exports.PaginationSchema,
    response_format: exports.ResponseFormatSchema,
})
    .strict();
exports.GetClubSchema = zod_1.z
    .object({
    id: zod_1.z.number().int().positive().describe("Club ID"),
    response_format: exports.ResponseFormatSchema,
})
    .strict();
exports.ListClubMembersSchema = zod_1.z
    .object({
    id: zod_1.z.number().int().positive().describe("Club ID"),
    ...exports.PaginationSchema,
    response_format: exports.ResponseFormatSchema,
})
    .strict();
exports.ListClubActivitiesSchema = zod_1.z
    .object({
    id: zod_1.z.number().int().positive().describe("Club ID"),
    ...exports.PaginationSchema,
    response_format: exports.ResponseFormatSchema,
})
    .strict();
// ─── Gear schemas ───────────────────────────────────────────────────
exports.GetGearSchema = zod_1.z
    .object({
    id: zod_1.z.string().describe("Gear ID (e.g. 'b12345' for bikes, 's12345' for shoes)"),
    response_format: exports.ResponseFormatSchema,
})
    .strict();
