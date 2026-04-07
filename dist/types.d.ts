/** Strava OAuth token response */
export interface TokenResponse {
    token_type: string;
    expires_at: number;
    expires_in: number;
    refresh_token: string;
    access_token: string;
    athlete?: AthleteProfile;
}
/** Strava athlete profile */
export interface AthleteProfile {
    id: number;
    username: string | null;
    firstname: string;
    lastname: string;
    bio: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    sex: string | null;
    premium: boolean;
    summit: boolean;
    created_at: string;
    updated_at: string;
    profile_medium: string;
    profile: string;
    weight: number | null;
    ftp: number | null;
    measurement_preference: string;
}
/** Strava activity summary */
export interface ActivitySummary {
    id: number;
    name: string;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    total_elevation_gain: number;
    type: string;
    sport_type: string;
    start_date: string;
    start_date_local: string;
    timezone: string;
    achievement_count: number;
    kudos_count: number;
    comment_count: number;
    athlete_count: number;
    average_speed: number;
    max_speed: number;
    average_heartrate?: number;
    max_heartrate?: number;
    average_watts?: number;
    max_watts?: number;
    weighted_average_watts?: number;
    kilojoules?: number;
    suffer_score?: number;
    average_cadence?: number;
    has_heartrate: boolean;
    gear_id: string | null;
    device_name?: string;
    calories?: number;
    description?: string;
    photos?: unknown;
    map?: {
        id: string;
        summary_polyline: string | null;
        polyline?: string | null;
    };
}
/** Strava detailed activity (extends summary with extra fields) */
export interface DetailedActivity extends ActivitySummary {
    segment_efforts?: SegmentEffort[];
    splits_metric?: Split[];
    splits_standard?: Split[];
    laps?: Lap[];
    best_efforts?: BestEffort[];
    gear?: GearSummary;
    device_watts?: boolean;
    embed_token?: string;
}
/** Segment effort */
export interface SegmentEffort {
    id: number;
    name: string;
    elapsed_time: number;
    moving_time: number;
    start_date: string;
    start_date_local: string;
    distance: number;
    average_watts?: number;
    average_heartrate?: number;
    max_heartrate?: number;
    average_cadence?: number;
    pr_rank: number | null;
    segment: {
        id: number;
        name: string;
        distance: number;
        average_grade: number;
        maximum_grade: number;
        elevation_high: number;
        elevation_low: number;
        climb_category: number;
        city: string | null;
        state: string | null;
        country: string | null;
    };
}
/** Activity split */
export interface Split {
    distance: number;
    elapsed_time: number;
    elevation_difference: number;
    moving_time: number;
    split: number;
    average_speed: number;
    average_heartrate?: number;
    pace_zone: number;
}
/** Activity lap */
export interface Lap {
    id: number;
    name: string;
    elapsed_time: number;
    moving_time: number;
    start_date: string;
    distance: number;
    average_speed: number;
    max_speed: number;
    average_heartrate?: number;
    max_heartrate?: number;
    average_cadence?: number;
    average_watts?: number;
    lap_index: number;
    split: number;
    pace_zone?: number;
}
/** Best effort */
export interface BestEffort {
    id: number;
    name: string;
    elapsed_time: number;
    moving_time: number;
    start_date: string;
    distance: number;
    pr_rank: number | null;
}
/** Gear summary */
export interface GearSummary {
    id: string;
    primary: boolean;
    name: string;
    distance: number;
    brand_name?: string;
    model_name?: string;
    description?: string;
    frame_type?: number;
    resource_state?: number;
}
/** Athlete stats */
export interface AthleteStats {
    biggest_ride_distance: number | null;
    biggest_climb_elevation_gain: number | null;
    recent_ride_totals: ActivityTotal;
    recent_run_totals: ActivityTotal;
    recent_swim_totals: ActivityTotal;
    ytd_ride_totals: ActivityTotal;
    ytd_run_totals: ActivityTotal;
    ytd_swim_totals: ActivityTotal;
    all_ride_totals: ActivityTotal;
    all_run_totals: ActivityTotal;
    all_swim_totals: ActivityTotal;
}
/** Activity total stats */
export interface ActivityTotal {
    count: number;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    elevation_gain: number;
    achievement_count?: number;
}
/** Heart rate / power zone */
export interface Zone {
    min: number;
    max: number;
}
/** Athlete zones */
export interface AthleteZones {
    heart_rate?: {
        custom_zones: boolean;
        zones: Zone[];
    };
    power?: {
        zones: Zone[];
    };
}
/** Segment detail */
export interface SegmentDetail {
    id: number;
    name: string;
    activity_type: string;
    distance: number;
    average_grade: number;
    maximum_grade: number;
    elevation_high: number;
    elevation_low: number;
    start_latlng: [number, number];
    end_latlng: [number, number];
    climb_category: number;
    city: string | null;
    state: string | null;
    country: string | null;
    total_elevation_gain: number;
    effort_count: number;
    athlete_count: number;
    hazardous: boolean;
    star_count: number;
    created_at: string;
    updated_at: string;
    map?: {
        id: string;
        polyline: string;
    };
    athlete_pr_effort?: SegmentEffort;
    xoms?: {
        kom: string;
        qom: string;
        overall: string;
    };
}
/** Segment explorer result */
export interface ExplorerSegment {
    id: number;
    name: string;
    climb_category: number;
    climb_category_desc: string;
    avg_grade: number;
    start_latlng: [number, number];
    end_latlng: [number, number];
    elev_difference: number;
    distance: number;
    points: string;
}
/** Route */
export interface Route {
    id: number;
    name: string;
    description: string;
    distance: number;
    elevation_gain: number;
    type: number;
    sub_type: number;
    starred: boolean;
    timestamp: number;
    map: {
        id: string;
        summary_polyline: string;
        polyline?: string;
    };
    estimated_moving_time: number;
}
/** Club */
export interface Club {
    id: number;
    name: string;
    profile_medium: string;
    profile: string;
    cover_photo: string;
    cover_photo_small: string;
    sport_type: string;
    activity_types: string[];
    city: string;
    state: string;
    country: string;
    private: boolean;
    member_count: number;
    featured: boolean;
    verified: boolean;
    url: string;
    description?: string;
}
/** Comment */
export interface Comment {
    id: number;
    activity_id: number;
    text: string;
    athlete: {
        firstname: string;
        lastname: string;
    };
    created_at: string;
}
/** Stream data */
export interface StreamSet {
    [key: string]: {
        data: number[];
        series_type: string;
        original_size: number;
        resolution: string;
    };
}
//# sourceMappingURL=types.d.ts.map