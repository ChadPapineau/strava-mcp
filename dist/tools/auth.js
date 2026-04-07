"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAuthTools = registerAuthTools;
const zod_1 = require("zod");
const fs_1 = __importDefault(require("fs"));
const constants_js_1 = require("../constants.js");
const strava_client_js_1 = require("../services/strava-client.js");
const AuthStatusSchema = zod_1.z.object({}).strict();
function registerAuthTools(server) {
    server.registerTool("strava_auth_status", {
        title: "Check Strava Auth Status",
        description: `Diagnoses the current state of the Strava OAuth connection.

Checks whether:
  - Persisted token file exists and is valid
  - The access token is expired or still active
  - A test API call to /athlete succeeds

Use this tool FIRST when any Strava tool returns an auth error, before suggesting the user take manual steps.

Takes no arguments.

Returns: A diagnostic report with token status, expiry info, and a recommended fix if anything is wrong.`,
        inputSchema: AuthStatusSchema,
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
        },
    }, async () => {
        const lines = ["# Strava Auth Diagnostic", ""];
        // 1. Check persisted token file
        lines.push("## Token File");
        let fileTokens = null;
        try {
            if (fs_1.default.existsSync(constants_js_1.TOKEN_FILE_PATH)) {
                const raw = fs_1.default.readFileSync(constants_js_1.TOKEN_FILE_PATH, "utf-8");
                fileTokens = JSON.parse(raw);
                const expiresAt = fileTokens?.expires_at ?? 0;
                const now = Math.floor(Date.now() / 1000);
                const expiresIn = expiresAt - now;
                const hasAccess = !!fileTokens?.access_token;
                const hasRefresh = !!fileTokens?.refresh_token;
                lines.push(`- **File**: ${constants_js_1.TOKEN_FILE_PATH} ✓ exists`);
                lines.push(`- **Persisted at**: ${fileTokens?.persisted_at ?? "unknown"}`);
                lines.push(`- **Access token**: ${hasAccess ? "present" : "MISSING"}`);
                lines.push(`- **Refresh token**: ${hasRefresh ? "present" : "MISSING"}`);
                if (expiresIn > 0) {
                    lines.push(`- **Expires in**: ${Math.round(expiresIn / 60)} minutes ✓`);
                }
                else {
                    lines.push(`- **Expired**: ${Math.round(-expiresIn / 60)} minutes ago (will auto-refresh using refresh token)`);
                }
            }
            else {
                lines.push(`- **File**: ${constants_js_1.TOKEN_FILE_PATH} — NOT FOUND`);
                lines.push(`- Falling back to environment variable tokens`);
            }
        }
        catch (err) {
            lines.push(`- **File**: ${constants_js_1.TOKEN_FILE_PATH} — ERROR reading: ${err instanceof Error ? err.message : String(err)}`);
        }
        // 2. Check env vars
        lines.push("", "## Environment Variables");
        const envId = !!process.env.STRAVA_CLIENT_ID;
        const envSecret = !!process.env.STRAVA_CLIENT_SECRET;
        const envAccess = !!process.env.STRAVA_ACCESS_TOKEN;
        const envRefresh = !!process.env.STRAVA_REFRESH_TOKEN;
        lines.push(`- **STRAVA_CLIENT_ID**: ${envId ? "set ✓" : "NOT SET ✗"}`);
        lines.push(`- **STRAVA_CLIENT_SECRET**: ${envSecret ? "set ✓" : "NOT SET ✗"}`);
        lines.push(`- **STRAVA_ACCESS_TOKEN**: ${envAccess ? "set ✓" : "not set (ok if token file exists)"}`);
        lines.push(`- **STRAVA_REFRESH_TOKEN**: ${envRefresh ? "set ✓" : "not set (ok if token file exists)"}`);
        // 3. Live API test
        lines.push("", "## Live API Test");
        try {
            const client = (0, strava_client_js_1.getClient)();
            const athlete = await client.get("/athlete");
            lines.push(`- **Status**: Connected ✓`);
            lines.push(`- **Athlete**: ${athlete.firstname} ${athlete.lastname} (ID: ${athlete.id})`);
            lines.push(`- **Summit**: ${athlete.summit ? "Yes" : "No"}`);
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            lines.push(`- **Status**: FAILED ✗`);
            lines.push(`- **Error**: ${msg}`);
            // 4. Recommendation
            lines.push("", "## Recommended Fix");
            if (msg.includes("revoked") || msg.includes("401") || msg.includes("invalid")) {
                lines.push("Your refresh token is no longer valid. This happens when Strava revokes it ", "(e.g., you re-authorized elsewhere, or it was rotated and the new one wasn't saved).", "", "**Run the built-in authorize command** from your terminal:", "", "```bash", "cd /path/to/strava-mcp-server", `STRAVA_CLIENT_ID=${process.env.STRAVA_CLIENT_ID ?? "YOUR_ID"} \\`, `  STRAVA_CLIENT_SECRET=${process.env.STRAVA_CLIENT_SECRET ?? "YOUR_SECRET"} \\`, "  npm run authorize", "```", "", "This opens your browser, you click 'Authorize' on Strava, and fresh tokens", `are saved to \`${constants_js_1.TOKEN_FILE_PATH}\` automatically. Then restart Claude Desktop.`);
            }
            else if (msg.includes("ENOTFOUND") || msg.includes("timeout")) {
                lines.push("Strava API is unreachable. Check your internet connection and try again.");
            }
            else {
                lines.push(`Unexpected error. Full message: ${msg}`);
            }
        }
        return { content: [{ type: "text", text: lines.join("\n") }] };
    });
}
