/** Strava API v3 base URL */
export declare const API_BASE_URL = "https://www.strava.com/api/v3";
/** Strava OAuth token endpoint */
export declare const OAUTH_TOKEN_URL = "https://www.strava.com/oauth/token";
/** Maximum response size in characters */
export declare const CHARACTER_LIMIT = 25000;
/** Default pagination limit */
export declare const DEFAULT_PAGE_SIZE = 30;
/** Maximum pagination limit */
export declare const MAX_PAGE_SIZE = 200;
/**
 * Path where refreshed tokens are persisted to survive process restarts.
 * Defaults to ~/.strava-mcp-tokens.json, overridable via STRAVA_TOKEN_FILE.
 */
export declare const TOKEN_FILE_PATH: string;
/** Maximum number of times to retry a request after a 401 */
export declare const MAX_AUTH_RETRIES = 1;
/** Token refresh buffer — refresh this many seconds before actual expiry */
export declare const TOKEN_REFRESH_BUFFER_SECONDS = 300;
/** Response format options */
export declare enum ResponseFormat {
    MARKDOWN = "markdown",
    JSON = "json"
}
//# sourceMappingURL=constants.d.ts.map