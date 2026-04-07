/**
 * Strava API client with:
 *  - Automatic token refresh before expiry
 *  - Disk persistence of refreshed tokens (survives process restarts)
 *  - 401 → force-refresh → retry loop
 *  - Mutex to prevent concurrent refresh races
 */
export declare class StravaClient {
    private axiosInstance;
    private accessToken;
    private refreshToken;
    private clientId;
    private clientSecret;
    private expiresAt;
    /** Mutex: if a refresh is already in-flight, other callers await this promise */
    private refreshPromise;
    constructor();
    /**
     * Loads tokens from disk if the file exists and is valid.
     * Persisted tokens take priority over env vars because Strava rotates
     * refresh tokens — the env var token may already be invalidated.
     */
    private loadPersistedTokens;
    /**
     * Persists the current tokens to disk so they survive process restarts.
     */
    private persistTokens;
    /**
     * Validates that all required environment variables are set.
     */
    validate(): void;
    /**
     * Ensures the access token is valid. If expired or about to expire,
     * refreshes it using the refresh token. Uses a mutex to prevent
     * concurrent refresh calls.
     *
     * @param force - If true, refresh regardless of expiry time (used after 401)
     */
    private ensureValidToken;
    /**
     * Actually performs the token refresh against Strava's OAuth endpoint.
     */
    private doRefresh;
    /**
     * Makes an authenticated request with automatic 401 retry.
     *
     * Flow:
     *   1. Ensure token is valid (refresh if needed)
     *   2. Make the API call
     *   3. If 401: force-refresh the token and retry once
     *   4. If retry also 401: throw with actionable message
     */
    private request;
    /**
     * Makes an authenticated GET request to the Strava API.
     */
    get<T>(endpoint: string, params?: Record<string, unknown>): Promise<T>;
    /**
     * Makes an authenticated POST request to the Strava API.
     */
    post<T>(endpoint: string, data?: Record<string, unknown>): Promise<T>;
    /**
     * Makes an authenticated PUT request to the Strava API.
     */
    put<T>(endpoint: string, data?: Record<string, unknown>): Promise<T>;
    private log;
}
/**
 * Formats a Strava API error into a helpful, actionable message.
 */
export declare function handleApiError(error: unknown): string;
export declare function getClient(): StravaClient;
//# sourceMappingURL=strava-client.d.ts.map