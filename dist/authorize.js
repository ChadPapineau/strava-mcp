#!/usr/bin/env node
"use strict";
/**
 * Strava OAuth Authorization CLI
 *
 * Run this to get fresh tokens when your Strava connection is broken.
 * It spins up a tiny local HTTP server, opens your browser to Strava's
 * authorization page, captures the callback with the auth code, exchanges
 * it for tokens, and persists them to disk.
 *
 * Usage:
 *   npx strava-mcp-authorize
 *   # or
 *   npm run authorize
 *
 * Requires STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET to be set as env vars
 * (or in your Claude Desktop MCP config).
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const url_1 = require("url");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const axios_1 = __importDefault(require("axios"));
const constants_js_1 = require("./constants.js");
// ─── Configuration ──────────────────────────────────────────────────
const CLIENT_ID = process.env.STRAVA_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET ?? "";
const TOKEN_FILE = process.env.STRAVA_TOKEN_FILE ??
    path_1.default.join(os_1.default.homedir(), ".strava-mcp-tokens.json");
const PORT = parseInt(process.env.STRAVA_AUTH_PORT ?? "8091", 10);
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const SCOPES = "read,read_all,activity:read,activity:read_all";
// ─── Validation ─────────────────────────────────────────────────────
if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error("╔══════════════════════════════════════════════════════════╗");
    console.error("║  Missing STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET       ║");
    console.error("║                                                          ║");
    console.error("║  Set them as environment variables before running:       ║");
    console.error("║                                                          ║");
    console.error("║  STRAVA_CLIENT_ID=12345 STRAVA_CLIENT_SECRET=abc \\      ║");
    console.error("║    npm run authorize                                     ║");
    console.error("╚══════════════════════════════════════════════════════════╝");
    process.exit(1);
}
// ─── OAuth Flow ─────────────────────────────────────────────────────
const AUTHORIZE_URL = `https://www.strava.com/oauth/authorize` +
    `?client_id=${CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&approval_prompt=force` +
    `&scope=${SCOPES}`;
/**
 * Exchanges an authorization code for access + refresh tokens.
 */
async function exchangeCode(code) {
    const response = await axios_1.default.post(constants_js_1.OAUTH_TOKEN_URL, {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
    });
    return response.data;
}
/**
 * Persists tokens to disk.
 */
function saveTokens(tokens) {
    const data = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expires_at,
        persisted_at: new Date().toISOString(),
    };
    fs_1.default.writeFileSync(TOKEN_FILE, JSON.stringify(data, null, 2), {
        mode: 0o600,
    });
}
/**
 * HTML page shown to the user after successful authorization.
 */
function successHtml(athleteName) {
    return `<!DOCTYPE html>
<html>
<head><title>Strava MCP - Authorized</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
         display: flex; justify-content: center; align-items: center; min-height: 100vh;
         margin: 0; background: #f7f7f7; }
  .card { background: white; border-radius: 12px; padding: 48px; text-align: center;
          box-shadow: 0 2px 12px rgba(0,0,0,0.1); max-width: 480px; }
  .check { font-size: 64px; margin-bottom: 16px; }
  h1 { color: #fc4c02; margin: 0 0 8px 0; font-size: 24px; }
  p { color: #555; line-height: 1.6; }
  code { background: #f0f0f0; padding: 2px 8px; border-radius: 4px; font-size: 14px; }
</style></head>
<body>
  <div class="card">
    <div class="check">&#10003;</div>
    <h1>Strava Connected!</h1>
    <p>Welcome, <strong>${athleteName}</strong>.</p>
    <p>Tokens have been saved to:<br><code>${TOKEN_FILE}</code></p>
    <p>You can close this tab and restart Claude Desktop.<br>
       Your Strava MCP tools will now work automatically.</p>
  </div>
</body>
</html>`;
}
/**
 * HTML page shown on authorization errors.
 */
function errorHtml(message) {
    return `<!DOCTYPE html>
<html>
<head><title>Strava MCP - Error</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
         display: flex; justify-content: center; align-items: center; min-height: 100vh;
         margin: 0; background: #f7f7f7; }
  .card { background: white; border-radius: 12px; padding: 48px; text-align: center;
          box-shadow: 0 2px 12px rgba(0,0,0,0.1); max-width: 480px; }
  .x { font-size: 64px; margin-bottom: 16px; color: #e74c3c; }
  h1 { color: #e74c3c; margin: 0 0 8px 0; font-size: 24px; }
  p { color: #555; line-height: 1.6; }
  pre { background: #f0f0f0; padding: 12px; border-radius: 4px; font-size: 13px;
        text-align: left; overflow-x: auto; white-space: pre-wrap; }
</style></head>
<body>
  <div class="card">
    <div class="x">&#10007;</div>
    <h1>Authorization Failed</h1>
    <pre>${message}</pre>
    <p>Please try running <code>npm run authorize</code> again.</p>
  </div>
</body>
</html>`;
}
// ─── Server ─────────────────────────────────────────────────────────
async function main() {
    console.log("");
    console.log("╔══════════════════════════════════════════════════════════╗");
    console.log("║           Strava MCP — OAuth Authorization              ║");
    console.log("╚══════════════════════════════════════════════════════════╝");
    console.log("");
    // Check for existing tokens
    if (fs_1.default.existsSync(TOKEN_FILE)) {
        try {
            const existing = JSON.parse(fs_1.default.readFileSync(TOKEN_FILE, "utf-8"));
            const expiresAt = existing.expires_at ?? 0;
            const now = Math.floor(Date.now() / 1000);
            if (expiresAt > now) {
                console.log(`  Existing tokens found at ${TOKEN_FILE}`);
                console.log(`  Access token expires in ${Math.round((expiresAt - now) / 60)} minutes.`);
                console.log(`  Proceeding will replace them with new tokens.\n`);
            }
            else {
                console.log(`  Existing tokens found but expired. Will replace them.\n`);
            }
        }
        catch {
            // Malformed file, will be overwritten
        }
    }
    return new Promise((resolve) => {
        const server = http_1.default.createServer(async (req, res) => {
            const url = new url_1.URL(req.url ?? "/", `http://localhost:${PORT}`);
            if (url.pathname !== "/callback") {
                res.writeHead(302, { Location: AUTHORIZE_URL });
                res.end();
                return;
            }
            // Handle the OAuth callback
            const code = url.searchParams.get("code");
            const error = url.searchParams.get("error");
            if (error) {
                console.error(`\n  Authorization denied: ${error}`);
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end(errorHtml(`Strava denied authorization: ${error}`));
                server.close();
                resolve();
                return;
            }
            if (!code) {
                console.error("\n  No authorization code received.");
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end(errorHtml("No authorization code was returned by Strava."));
                server.close();
                resolve();
                return;
            }
            try {
                console.log("  Received authorization code, exchanging for tokens...");
                const tokens = await exchangeCode(code);
                // Save to disk
                saveTokens(tokens);
                const athleteName = tokens.athlete
                    ? `${tokens.athlete.firstname} ${tokens.athlete.lastname}`
                    : "Athlete";
                const expiresIn = tokens.expires_at - Math.floor(Date.now() / 1000);
                console.log("");
                console.log("  ✓ Authorization successful!");
                console.log(`  ✓ Athlete: ${athleteName}`);
                console.log(`  ✓ Access token expires in ${Math.round(expiresIn / 60)} minutes`);
                console.log(`  ✓ Tokens saved to: ${TOKEN_FILE}`);
                console.log("");
                console.log("  Next steps:");
                console.log("    1. Restart Claude Desktop (or your MCP client)");
                console.log("    2. The Strava tools will automatically use the new tokens");
                console.log("");
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end(successHtml(athleteName));
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                console.error(`\n  Token exchange failed: ${msg}`);
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end(errorHtml(`Token exchange failed:\n${msg}`));
            }
            // Shut down after handling
            setTimeout(() => {
                server.close();
                resolve();
            }, 1000);
        });
        server.listen(PORT, () => {
            console.log(`  Callback server listening on http://localhost:${PORT}`);
            console.log("");
            console.log("  ┌─────────────────────────────────────────────────┐");
            console.log("  │  Open this URL in your browser to authorize:    │");
            console.log("  └─────────────────────────────────────────────────┘");
            console.log("");
            console.log(`  ${AUTHORIZE_URL}`);
            console.log("");
            console.log("  Waiting for authorization...\n");
            // Try to open the browser automatically
            const openCommand = process.platform === "darwin"
                ? "open"
                : process.platform === "win32"
                    ? "start"
                    : "xdg-open";
            import("child_process").then(({ exec }) => {
                exec(`${openCommand} "${AUTHORIZE_URL}"`, (err) => {
                    if (err) {
                        console.log("  (Could not open browser automatically — please open the URL manually)");
                    }
                });
            });
        });
        // Timeout after 5 minutes
        setTimeout(() => {
            console.error("\n  Timed out waiting for authorization (5 minutes).");
            console.error("  Please try again.\n");
            server.close();
            resolve();
        }, 5 * 60 * 1000);
    });
}
main().catch((err) => {
    console.error(`Fatal error: ${err}`);
    process.exit(1);
});
