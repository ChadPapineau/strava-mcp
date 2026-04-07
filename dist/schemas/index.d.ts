import { z } from "zod";
import { ResponseFormat } from "../constants.js";
export declare const ResponseFormatSchema: z.ZodDefault<z.ZodNativeEnum<typeof ResponseFormat>>;
export declare const PaginationSchema: {
    page: z.ZodDefault<z.ZodNumber>;
    per_page: z.ZodDefault<z.ZodNumber>;
};
export declare const GetAthleteSchema: z.ZodObject<{
    response_format: z.ZodDefault<z.ZodNativeEnum<typeof ResponseFormat>>;
}, "strict", z.ZodTypeAny, {
    response_format: ResponseFormat;
}, {
    response_format?: ResponseFormat | undefined;
}>;
export declare const GetAthleteStatsSchema: z.ZodObject<{
    athlete_id: z.ZodNumber;
    response_format: z.ZodDefault<z.ZodNativeEnum<typeof ResponseFormat>>;
}, "strict", z.ZodTypeAny, {
    response_format: ResponseFormat;
    athlete_id: number;
}, {
    athlete_id: number;
    response_format?: ResponseFormat | undefined;
}>;
export declare const GetAthleteZonesSchema: z.ZodObject<{
    response_format: z.ZodDefault<z.ZodNativeEnum<typeof ResponseFormat>>;
}, "strict", z.ZodTypeAny, {
    response_format: ResponseFormat;
}, {
    response_format?: ResponseFormat | undefined;
}>;
export declare const ListActivitiesSchema: z.ZodObject<{
    response_format: z.ZodDefault<z.ZodNativeEnum<typeof ResponseFormat>>;
    page: z.ZodDefault<z.ZodNumber>;
    per_page: z.ZodDefault<z.ZodNumber>;
    before: z.ZodOptional<z.ZodNumber>;
    after: z.ZodOptional<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    response_format: ResponseFormat;
    page: number;
    per_page: number;
    before?: number | undefined;
    after?: number | undefined;
}, {
    response_format?: ResponseFormat | undefined;
    before?: number | undefined;
    after?: number | undefined;
    page?: number | undefined;
    per_page?: number | undefined;
}>;
export declare const GetActivitySchema: z.ZodObject<{
    id: z.ZodNumber;
    include_all_efforts: z.ZodDefault<z.ZodBoolean>;
    response_format: z.ZodDefault<z.ZodNativeEnum<typeof ResponseFormat>>;
}, "strict", z.ZodTypeAny, {
    response_format: ResponseFormat;
    id: number;
    include_all_efforts: boolean;
}, {
    id: number;
    response_format?: ResponseFormat | undefined;
    include_all_efforts?: boolean | undefined;
}>;
export declare const GetActivityLapsSchema: z.ZodObject<{
    id: z.ZodNumber;
    response_format: z.ZodDefault<z.ZodNativeEnum<typeof ResponseFormat>>;
}, "strict", z.ZodTypeAny, {
    response_format: ResponseFormat;
    id: number;
}, {
    id: number;
    response_format?: ResponseFormat | undefined;
}>;
export declare const GetActivityZonesSchema: z.ZodObject<{
    id: z.ZodNumber;
    response_format: z.ZodDefault<z.ZodNativeEnum<typeof ResponseFormat>>;
}, "strict", z.ZodTypeAny, {
    response_format: ResponseFormat;
    id: number;
}, {
    id: number;
    response_format?: ResponseFormat | undefined;
}>;
export declare const GetActivityCommentsSchema: z.ZodObject<{
    response_format: z.ZodDefault<z.ZodNativeEnum<typeof ResponseFormat>>;
    page: z.ZodDefault<z.ZodNumber>;
    per_page: z.ZodDefault<z.ZodNumber>;
    id: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    response_format: ResponseFormat;
    page: number;
    per_page: number;
    id: number;
}, {
    id: number;
    response_format?: ResponseFormat | undefined;
    page?: number | undefined;
    per_page?: number | undefined;
}>;
export declare const GetActivityKudosSchema: z.ZodObject<{
    response_format: z.ZodDefault<z.ZodNativeEnum<typeof ResponseFormat>>;
    page: z.ZodDefault<z.ZodNumber>;
    per_page: z.ZodDefault<z.ZodNumber>;
    id: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    response_format: ResponseFormat;
    page: number;
    per_page: number;
    id: number;
}, {
    id: number;
    response_format?: ResponseFormat | undefined;
    page?: number | undefined;
    per_page?: number | undefined;
}>;
export declare const GetSegmentSchema: z.ZodObject<{
    id: z.ZodNumber;
    response_format: z.ZodDefault<z.ZodNativeEnum<typeof ResponseFormat>>;
}, "strict", z.ZodTypeAny, {
    response_format: ResponseFormat;
    id: number;
}, {
    id: number;
    response_format?: ResponseFormat | undefined;
}>;
export declare const ExploreSegmentsSchema: z.ZodObject<{
    bounds: z.ZodString;
    activity_type: z.ZodDefault<z.ZodEnum<["running", "riding"]>>;
    min_cat: z.ZodOptional<z.ZodNumber>;
    max_cat: z.ZodOptional<z.ZodNumber>;
    response_format: z.ZodDefault<z.ZodNativeEnum<typeof ResponseFormat>>;
}, "strict", z.ZodTypeAny, {
    response_format: ResponseFormat;
    bounds: string;
    activity_type: "running" | "riding";
    min_cat?: number | undefined;
    max_cat?: number | undefined;
}, {
    bounds: string;
    response_format?: ResponseFormat | undefined;
    activity_type?: "running" | "riding" | undefined;
    min_cat?: number | undefined;
    max_cat?: number | undefined;
}>;
export declare const GetSegmentLeaderboardSchema: z.ZodObject<{
    response_format: z.ZodDefault<z.ZodNativeEnum<typeof ResponseFormat>>;
    page: z.ZodDefault<z.ZodNumber>;
    per_page: z.ZodDefault<z.ZodNumber>;
    id: z.ZodNumber;
    gender: z.ZodOptional<z.ZodEnum<["M", "F"]>>;
    age_group: z.ZodOptional<z.ZodString>;
    weight_class: z.ZodOptional<z.ZodString>;
    following: z.ZodOptional<z.ZodBoolean>;
    club_id: z.ZodOptional<z.ZodNumber>;
    date_range: z.ZodOptional<z.ZodEnum<["this_year", "this_month", "this_week", "today"]>>;
}, "strict", z.ZodTypeAny, {
    response_format: ResponseFormat;
    page: number;
    per_page: number;
    id: number;
    gender?: "M" | "F" | undefined;
    age_group?: string | undefined;
    weight_class?: string | undefined;
    following?: boolean | undefined;
    club_id?: number | undefined;
    date_range?: "this_year" | "this_month" | "this_week" | "today" | undefined;
}, {
    id: number;
    response_format?: ResponseFormat | undefined;
    page?: number | undefined;
    per_page?: number | undefined;
    gender?: "M" | "F" | undefined;
    age_group?: string | undefined;
    weight_class?: string | undefined;
    following?: boolean | undefined;
    club_id?: number | undefined;
    date_range?: "this_year" | "this_month" | "this_week" | "today" | undefined;
}>;
export declare const ListStarredSegmentsSchema: z.ZodObject<{
    response_format: z.ZodDefault<z.ZodNativeEnum<typeof ResponseFormat>>;
    page: z.ZodDefault<z.ZodNumber>;
    per_page: z.ZodDefault<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    response_format: ResponseFormat;
    page: number;
    per_page: number;
}, {
    response_format?: ResponseFormat | undefined;
    page?: number | undefined;
    per_page?: number | undefined;
}>;
export declare const GetSegmentEffortSchema: z.ZodObject<{
    id: z.ZodNumber;
    response_format: z.ZodDefault<z.ZodNativeEnum<typeof ResponseFormat>>;
}, "strict", z.ZodTypeAny, {
    response_format: ResponseFormat;
    id: number;
}, {
    id: number;
    response_format?: ResponseFormat | undefined;
}>;
export declare const GetActivityStreamsSchema: z.ZodObject<{
    id: z.ZodNumber;
    keys: z.ZodDefault<z.ZodString>;
    key_by_type: z.ZodDefault<z.ZodBoolean>;
    response_format: z.ZodDefault<z.ZodNativeEnum<typeof ResponseFormat>>;
}, "strict", z.ZodTypeAny, {
    response_format: ResponseFormat;
    keys: string;
    id: number;
    key_by_type: boolean;
}, {
    id: number;
    response_format?: ResponseFormat | undefined;
    keys?: string | undefined;
    key_by_type?: boolean | undefined;
}>;
export declare const GetSegmentEffortStreamsSchema: z.ZodObject<{
    id: z.ZodNumber;
    keys: z.ZodDefault<z.ZodString>;
    key_by_type: z.ZodDefault<z.ZodBoolean>;
    response_format: z.ZodDefault<z.ZodNativeEnum<typeof ResponseFormat>>;
}, "strict", z.ZodTypeAny, {
    response_format: ResponseFormat;
    keys: string;
    id: number;
    key_by_type: boolean;
}, {
    id: number;
    response_format?: ResponseFormat | undefined;
    keys?: string | undefined;
    key_by_type?: boolean | undefined;
}>;
export declare const GetRouteStreamsSchema: z.ZodObject<{
    id: z.ZodNumber;
    response_format: z.ZodDefault<z.ZodNativeEnum<typeof ResponseFormat>>;
}, "strict", z.ZodTypeAny, {
    response_format: ResponseFormat;
    id: number;
}, {
    id: number;
    response_format?: ResponseFormat | undefined;
}>;
export declare const ListRoutesSchema: z.ZodObject<{
    response_format: z.ZodDefault<z.ZodNativeEnum<typeof ResponseFormat>>;
    page: z.ZodDefault<z.ZodNumber>;
    per_page: z.ZodDefault<z.ZodNumber>;
    athlete_id: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    response_format: ResponseFormat;
    athlete_id: number;
    page: number;
    per_page: number;
}, {
    athlete_id: number;
    response_format?: ResponseFormat | undefined;
    page?: number | undefined;
    per_page?: number | undefined;
}>;
export declare const GetRouteSchema: z.ZodObject<{
    id: z.ZodNumber;
    response_format: z.ZodDefault<z.ZodNativeEnum<typeof ResponseFormat>>;
}, "strict", z.ZodTypeAny, {
    response_format: ResponseFormat;
    id: number;
}, {
    id: number;
    response_format?: ResponseFormat | undefined;
}>;
export declare const ListClubsSchema: z.ZodObject<{
    response_format: z.ZodDefault<z.ZodNativeEnum<typeof ResponseFormat>>;
    page: z.ZodDefault<z.ZodNumber>;
    per_page: z.ZodDefault<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    response_format: ResponseFormat;
    page: number;
    per_page: number;
}, {
    response_format?: ResponseFormat | undefined;
    page?: number | undefined;
    per_page?: number | undefined;
}>;
export declare const GetClubSchema: z.ZodObject<{
    id: z.ZodNumber;
    response_format: z.ZodDefault<z.ZodNativeEnum<typeof ResponseFormat>>;
}, "strict", z.ZodTypeAny, {
    response_format: ResponseFormat;
    id: number;
}, {
    id: number;
    response_format?: ResponseFormat | undefined;
}>;
export declare const ListClubMembersSchema: z.ZodObject<{
    response_format: z.ZodDefault<z.ZodNativeEnum<typeof ResponseFormat>>;
    page: z.ZodDefault<z.ZodNumber>;
    per_page: z.ZodDefault<z.ZodNumber>;
    id: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    response_format: ResponseFormat;
    page: number;
    per_page: number;
    id: number;
}, {
    id: number;
    response_format?: ResponseFormat | undefined;
    page?: number | undefined;
    per_page?: number | undefined;
}>;
export declare const ListClubActivitiesSchema: z.ZodObject<{
    response_format: z.ZodDefault<z.ZodNativeEnum<typeof ResponseFormat>>;
    page: z.ZodDefault<z.ZodNumber>;
    per_page: z.ZodDefault<z.ZodNumber>;
    id: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    response_format: ResponseFormat;
    page: number;
    per_page: number;
    id: number;
}, {
    id: number;
    response_format?: ResponseFormat | undefined;
    page?: number | undefined;
    per_page?: number | undefined;
}>;
export declare const GetGearSchema: z.ZodObject<{
    id: z.ZodString;
    response_format: z.ZodDefault<z.ZodNativeEnum<typeof ResponseFormat>>;
}, "strict", z.ZodTypeAny, {
    response_format: ResponseFormat;
    id: string;
}, {
    id: string;
    response_format?: ResponseFormat | undefined;
}>;
//# sourceMappingURL=index.d.ts.map