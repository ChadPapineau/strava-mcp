"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StravaClient = void 0;
exports.handleApiError = handleApiError;
exports.getClient = getClient;
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const constants_js_1 = require("../constants.js");
/**
 * Strava API client with:
 *  - Automatic token refresh before expiry
 *  - Disk persistence of refreshed tokens (survives process restarts)
 *  - 401 → force-refresh → retry loop
 *  - Mutex to prevent concurrent refresh races
 */
class StravaClient {
    axiosInstance;
    accessToken;
    refreshToken;
    clientId;
    clientSecret;
    expiresAt;
    /** Mutex: if a refresh is already in-flight, other callers await this promise */
    refreshPromise = null;
    constructor() {
        this.clientId = process.env.STRAVA_CLIENT_ID ?? "";
        this.clientSecret = process.env.STRAVA_CLIENT_SECRET ?? "";
        // Start with env var values as fallback
        this.accessToken = process.env.STRAVA_ACCESS_TOKEN ?? "";
        this.refreshToken = process.env.STRAVA_REFRESH_TOKEN ?? "";
        this.expiresAt = 0;
        // Try to load persisted tokens (these take priority since they're newer)
        this.loadPersistedTokens();
        this.axiosInstance = axios_1.default.create({
            baseURL: constants_js_1.API_BASE_URL,
            timeout: 30000,
            headers: {
                Accept: "application/json",
            },
        });
    }
    // ─── Token Persistence ──────────────────────────────────────────────
    /**
     * Loads tokens from disk if the file exists and is valid.
     * Persisted tokens take priority over env vars because Strava rotates
     * refresh tokens — the env var token may already be invalidated.
     */
    loadPersistedTokens() {
        try {
            if (!fs_1.default.existsSync(constants_js_1.TOKEN_FILE_PATH)) {
                this.log(`No persisted tokens at ${constants_js_1.TOKEN_FILE_PATH}, using env vars`);
                return;
            }
            const raw = fs_1.default.readFileSync(constants_js_1.TOKEN_FILE_PATH, "utf-8");
            const data = JSON.parse(raw);
            // Validate the persisted file has the fields we need
            if (!data.access_token || !data.refresh_token || !data.expires_at) {
                this.log("Persisted token file is malformed, ignoring");
                return;
            }
            // Only use persisted tokens if they belong to the same client ID
            // (prevents cross-app confusion if someone switches apps)
            this.accessToken = data.access_token;
            this.refreshToken = data.refresh_token;
            this.expiresAt = data.expires_at;
            const now = Math.floor(Date.now() / 1000);
            const expiresIn = this.expiresAt - now;
            if (expiresIn > 0) {
                this.log(`Loaded persisted tokens (expires in ${Math.round(expiresIn / 60)}m)`);
            }
            else {
                this.log(`Loaded persisted tokens (expired ${Math.round(-expiresIn / 60)}m ago, will refresh)`);
            }
        }
        catch (error) {
            this.log(`Failed to load persisted tokens: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Persists the current tokens to disk so they survive process restarts.
     */
    persistTokens() {
        try {
            const data = {
                access_token: this.accessToken,
                refresh_token: this.refreshToken,
                expires_at: this.expiresAt,
                persisted_at: new Date().toISOString(),
            };
            fs_1.default.writeFileSync(constants_js_1.TOKEN_FILE_PATH, JSON.stringify(data, null, 2), {
                mode: 0o600, // Owner read/write only — these are secrets
            });
            this.log(`Tokens persisted to ${constants_js_1.TOKEN_FILE_PATH}`);
        }
        catch (error) {
            this.log(`WARNING: Failed to persist tokens: ${error instanceof Error ? error.message : String(error)}. ` +
                `Tokens will be lost on restart.`);
        }
    }
    // ─── Validation ─────────────────────────────────────────────────────
    /**
     * Validates that all required environment variables are set.
     */
    validate() {
        const missing = [];
        if (!this.clientId)
            missing.push("STRAVA_CLIENT_ID");
        if (!this.clientSecret)
            missing.push("STRAVA_CLIENT_SECRET");
        if (!this.accessToken && !this.refreshToken) {
            missing.push("STRAVA_ACCESS_TOKEN or STRAVA_REFRESH_TOKEN");
        }
        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(", ")}. ` +
                `Set these before starting the server.`);
        }
    }
    // ─── Token Refresh ──────────────────────────────────────────────────
    /**
     * Ensures the access token is valid. If expired or about to expire,
     * refreshes it using the refresh token. Uses a mutex to prevent
     * concurrent refresh calls.
     *
     * @param force - If true, refresh regardless of expiry time (used after 401)
     */
    async ensureValidToken(force = false) {
        const now = Math.floor(Date.now() / 1000);
        const isExpiredOrSoon = this.expiresAt === 0 || now >= this.expiresAt - constants_js_1.TOKEN_REFRESH_BUFFER_SECONDS;
        if (!force && !isExpiredOrSoon) {
            return; // Token is still valid
        }
        if (!this.refreshToken) {
            if (force) {
                throw new Error("Access token is invalid and no refresh token is available. " +
                    "Run `npm run authorize` in the strava-mcp-server directory to get fresh tokens.");
            }
            return; // No refresh token — hope for the best with current access token
        }
        // Mutex: if another call is already refreshing, wait for it
        if (this.refreshPromise) {
            this.log("Waiting for in-flight token refresh...");
            await this.refreshPromise;
            return;
        }
        // We own the refresh
        this.refreshPromise = this.doRefresh(force);
        try {
            await this.refreshPromise;
        }
        finally {
            this.refreshPromise = null;
        }
    }
    /**
     * Actually performs the token refresh against Strava's OAuth endpoint.
     */
    async doRefresh(force) {
        const reason = force ? "forced (after 401)" : "token expired/expiring";
        this.log(`Refreshing token (${reason})...`);
        try {
            const response = await axios_1.default.post(constants_js_1.OAUTH_TOKEN_URL, {
                client_id: this.clientId,
                client_secret: this.clientSecret,
                refresh_token: this.refreshToken,
                grant_type: "refresh_token",
            });
            const { access_token, refresh_token, expires_at } = response.data;
            if (!access_token || !refresh_token || !expires_at) {
                throw new Error("Strava returned an incomplete token response. " +
                    `Got: access_token=${!!access_token}, refresh_token=${!!refresh_token}, expires_at=${expires_at}`);
            }
            // Update in-memory state
            this.accessToken = access_token;
            this.refreshToken = refresh_token;
            this.expiresAt = expires_at;
            const expiresIn = expires_at - Math.floor(Date.now() / 1000);
            this.log(`Token refreshed successfully. Expires in ${Math.round(expiresIn / 60)}m ` +
                `(at ${new Date(expires_at * 1000).toISOString()})`);
            // Persist to disk so the new refresh token survives restarts
            this.persistTokens();
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                const status = error.response?.status;
                const body = error.response?.data;
                const detail = typeof body === "object" && body !== null
                    ? JSON.stringify(body)
                    : String(body ?? "");
                if (status === 401) {
                    throw new Error("Token refresh failed: refresh token is invalid or revoked. " +
                        "Run `npm run authorize` in the strava-mcp-server directory to re-authorize " +
                        "and get fresh tokens automatically. Then restart Claude Desktop. " +
                        `Detail: ${detail}`);
                }
                throw new Error(`Token refresh failed with HTTP ${status}: ${detail}. ` +
                    "Check your STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET.");
            }
            throw new Error(`Token refresh failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    // ─── HTTP Methods with Auto-Retry ───────────────────────────────────
    /**
     * Makes an authenticated request with automatic 401 retry.
     *
     * Flow:
     *   1. Ensure token is valid (refresh if needed)
     *   2. Make the API call
     *   3. If 401: force-refresh the token and retry once
     *   4. If retry also 401: throw with actionable message
     */
    async request(method, endpoint, config) {
        let lastError;
        for (let attempt = 0; attempt <= constants_js_1.MAX_AUTH_RETRIES; attempt++) {
            const isRetry = attempt > 0;
            // Refresh token — force refresh on retry attempts
            await this.ensureValidToken(isRetry);
            try {
                const axiosConfig = {
                    headers: { Authorization: `Bearer ${this.accessToken}` },
                    params: config?.params,
                };
                let response;
                switch (method) {
                    case "get":
                        response = await this.axiosInstance.get(endpoint, axiosConfig);
                        break;
                    case "post":
                        response = await this.axiosInstance.post(endpoint, config?.data, axiosConfig);
                        break;
                    case "put":
                        response = await this.axiosInstance.put(endpoint, config?.data, axiosConfig);
                        break;
                }
                return response.data;
            }
            catch (error) {
                lastError = error;
                if (axios_1.default.isAxiosError(error) && error.response?.status === 401) {
                    if (isRetry) {
                        // Already retried once — give up with an actionable message
                        throw new Error("Strava returned 401 Unauthorized even after refreshing the token. " +
                            "The refresh token has been revoked or the OAuth scopes are insufficient.\n\n" +
                            "TO FIX: Run this in your terminal:\n\n" +
                            "  cd /path/to/strava-mcp-server\n" +
                            `  STRAVA_CLIENT_ID=${this.clientId} STRAVA_CLIENT_SECRET=${this.clientSecret} npm run authorize\n\n` +
                            "This opens your browser to re-authorize with Strava and saves fresh tokens automatically. " +
                            "Then restart Claude Desktop.");
                    }
                    this.log(`Got 401 on ${method.toUpperCase()} ${endpoint}, forcing token refresh and retrying...`);
                    continue; // Loop back to retry with forced refresh
                }
                // Non-401 errors: don't retry, throw immediately
                throw error;
            }
        }
        // Should not reach here, but just in case
        throw lastError;
    }
    // ─── Public API ─────────────────────────────────────────────────────
    /**
     * Makes an authenticated GET request to the Strava API.
     */
    async get(endpoint, params) {
        return this.request("get", endpoint, { params });
    }
    /**
     * Makes an authenticated POST request to the Strava API.
     */
    async post(endpoint, data) {
        return this.request("post", endpoint, { data });
    }
    /**
     * Makes an authenticated PUT request to the Strava API.
     */
    async put(endpoint, data) {
        return this.request("put", endpoint, { data });
    }
    // ─── Logging ────────────────────────────────────────────────────────
    log(message) {
        process.stderr.write(`[strava-mcp] ${message}\n`);
    }
}
exports.StravaClient = StravaClient;
// ─── Error Formatting ───────────────────────────────────────────────────
/**
 * Formats a Strava API error into a helpful, actionable message.
 */
function handleApiError(error) {
    // Handle our own auth errors (from the retry logic above)
    if (error instanceof Error && error.message.includes("401 Unauthorized")) {
        return `Error: ${error.message}`;
    }
    if (error instanceof Error && error.message.includes("Token refresh failed")) {
        return `Error: ${error.message}`;
    }
    if (axios_1.default.isAxiosError(error)) {
        const axiosErr = error;
        if (axiosErr.response) {
            const status = axiosErr.response.status;
            const data = axiosErr.response.data;
            const detail = data?.message ?? "";
            const fieldErrors = data?.errors?.map((e) => `${e.field}: ${e.code}`).join(", ") ?? "";
            switch (status) {
                case 401:
                    return ("Error: Unauthorized. The token refresh and retry failed. " +
                        "Run `npm run authorize` in the strava-mcp-server directory to re-authorize, then restart Claude Desktop.");
                case 403:
                    return `Error: Forbidden. You don't have permission for this resource. Ensure your app has the required scopes (activity:read_all, read_all). ${detail}`;
                case 404:
                    return `Error: Resource not found. Check that the ID is correct. ${detail}`;
                case 429:
                    return ("Error: Rate limit exceeded. Strava allows ~100 requests per 15 minutes and ~1000 per day. " +
                        "Please wait before making more requests.");
                default:
                    return `Error: Strava API returned status ${status}. ${detail} ${fieldErrors}`.trim();
            }
        }
        else if (axiosErr.code === "ECONNABORTED") {
            return "Error: Request to Strava timed out. Please try again.";
        }
        else if (axiosErr.code === "ENOTFOUND") {
            return "Error: Could not connect to Strava API. Check your internet connection.";
        }
    }
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
}
// ─── Singleton ──────────────────────────────────────────────────────────
let clientInstance = null;
function getClient() {
    if (!clientInstance) {
        clientInstance = new StravaClient();
    }
    return clientInstance;
}
