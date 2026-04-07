import { z } from "zod";
import { ResponseFormat } from "../constants.js";

// ─── Shared schemas ─────────────────────────────────────────────────

export const ResponseFormatSchema = z
  .nativeEnum(ResponseFormat)
  .default(ResponseFormat.MARKDOWN)
  .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable");

export const PaginationSchema = {
  page: z
    .number()
    .int()
    .min(1)
    .default(1)
    .describe("Page number (starts at 1)"),
  per_page: z
    .number()
    .int()
    .min(1)
    .max(200)
    .default(30)
    .describe("Number of items per page (max 200)"),
};

// ─── Athlete schemas ────────────────────────────────────────────────

export const GetAthleteSchema = z
  .object({
    response_format: ResponseFormatSchema,
  })
  .strict();

export const GetAthleteStatsSchema = z
  .object({
    athlete_id: z
      .number()
      .int()
      .positive()
      .describe("Athlete ID. Use the strava_get_athlete tool first to find your ID."),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const GetAthleteZonesSchema = z
  .object({
    response_format: ResponseFormatSchema,
  })
  .strict();

// ─── Activity schemas ───────────────────────────────────────────────

export const ListActivitiesSchema = z
  .object({
    before: z
      .number()
      .int()
      .optional()
      .describe("Epoch timestamp — only return activities before this time"),
    after: z
      .number()
      .int()
      .optional()
      .describe("Epoch timestamp — only return activities after this time"),
    ...PaginationSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export const GetActivitySchema = z
  .object({
    id: z.number().int().positive().describe("Activity ID"),
    include_all_efforts: z
      .boolean()
      .default(false)
      .describe("Include all segment efforts (can be large)"),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const GetActivityLapsSchema = z
  .object({
    id: z.number().int().positive().describe("Activity ID"),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const GetActivityZonesSchema = z
  .object({
    id: z.number().int().positive().describe("Activity ID"),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const GetActivityCommentsSchema = z
  .object({
    id: z.number().int().positive().describe("Activity ID"),
    ...PaginationSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export const GetActivityKudosSchema = z
  .object({
    id: z.number().int().positive().describe("Activity ID"),
    ...PaginationSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

// ─── Segment schemas ────────────────────────────────────────────────

export const GetSegmentSchema = z
  .object({
    id: z.number().int().positive().describe("Segment ID"),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const ExploreSegmentsSchema = z
  .object({
    bounds: z
      .string()
      .describe(
        "Comma-separated bounding box: south_lat,west_lng,north_lat,east_lng (e.g. '37.7,-122.5,37.8,-122.4')"
      ),
    activity_type: z
      .enum(["running", "riding"])
      .default("riding")
      .describe("Activity type to filter segments"),
    min_cat: z
      .number()
      .int()
      .min(0)
      .max(5)
      .optional()
      .describe("Minimum climb category (0=HC, 5=Cat5)"),
    max_cat: z
      .number()
      .int()
      .min(0)
      .max(5)
      .optional()
      .describe("Maximum climb category"),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const GetSegmentLeaderboardSchema = z
  .object({
    id: z.number().int().positive().describe("Segment ID"),
    gender: z.enum(["M", "F"]).optional().describe("Filter by gender"),
    age_group: z
      .string()
      .optional()
      .describe("Age group filter (e.g. '25_34', '35_44')"),
    weight_class: z
      .string()
      .optional()
      .describe("Weight class filter (e.g. '55_64', '65_74' in kg)"),
    following: z
      .boolean()
      .optional()
      .describe("Only show athletes you follow"),
    club_id: z
      .number()
      .int()
      .optional()
      .describe("Filter by club ID"),
    date_range: z
      .enum(["this_year", "this_month", "this_week", "today"])
      .optional()
      .describe("Time period filter"),
    ...PaginationSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export const ListStarredSegmentsSchema = z
  .object({
    ...PaginationSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export const GetSegmentEffortSchema = z
  .object({
    id: z.number().int().positive().describe("Segment effort ID"),
    response_format: ResponseFormatSchema,
  })
  .strict();

// ─── Stream schemas ─────────────────────────────────────────────────

const StreamKeysDescription =
  "Comma-separated stream types to retrieve. Options: time, distance, latlng, altitude, velocity_smooth, heartrate, cadence, watts, temp, moving, grade_smooth";

export const GetActivityStreamsSchema = z
  .object({
    id: z.number().int().positive().describe("Activity ID"),
    keys: z
      .string()
      .default("time,distance,altitude,heartrate,cadence,watts,velocity_smooth")
      .describe(StreamKeysDescription),
    key_by_type: z
      .boolean()
      .default(true)
      .describe("If true, response keys are stream types rather than an array"),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const GetSegmentEffortStreamsSchema = z
  .object({
    id: z.number().int().positive().describe("Segment effort ID"),
    keys: z
      .string()
      .default("time,distance,altitude,heartrate,cadence,watts")
      .describe(StreamKeysDescription),
    key_by_type: z.boolean().default(true),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const GetRouteStreamsSchema = z
  .object({
    id: z.number().int().positive().describe("Route ID"),
    response_format: ResponseFormatSchema,
  })
  .strict();

// ─── Route schemas ──────────────────────────────────────────────────

export const ListRoutesSchema = z
  .object({
    athlete_id: z
      .number()
      .int()
      .positive()
      .describe("Athlete ID whose routes to list"),
    ...PaginationSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export const GetRouteSchema = z
  .object({
    id: z.number().int().positive().describe("Route ID"),
    response_format: ResponseFormatSchema,
  })
  .strict();

// ─── Club schemas ───────────────────────────────────────────────────

export const ListClubsSchema = z
  .object({
    ...PaginationSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export const GetClubSchema = z
  .object({
    id: z.number().int().positive().describe("Club ID"),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const ListClubMembersSchema = z
  .object({
    id: z.number().int().positive().describe("Club ID"),
    ...PaginationSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export const ListClubActivitiesSchema = z
  .object({
    id: z.number().int().positive().describe("Club ID"),
    ...PaginationSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

// ─── Gear schemas ───────────────────────────────────────────────────

export const GetGearSchema = z
  .object({
    id: z.string().describe("Gear ID (e.g. 'b12345' for bikes, 's12345' for shoes)"),
    response_format: ResponseFormatSchema,
  })
  .strict();
