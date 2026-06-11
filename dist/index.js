"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const client_js_1 = require("./client.js");
const tools_js_1 = require("./tools.js");
const ui_js_1 = require("./ui.js");
// ─── Config ────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || "3000");
const CLIENT_ID = process.env.STRAVA_CLIENT_ID || "";
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET || "";
// NOTE: All logging uses console.error so it goes to stderr.
// stdout is reserved exclusively for MCP JSON-RPC messages (stdio transport).
let storedClientId = CLIENT_ID;
let storedClientSecret = CLIENT_SECRET;
let currentTokens = (0, client_js_1.loadTokens)();
function getClient() {
    if (!currentTokens || !storedClientId || !storedClientSecret)
        return null;
    return new client_js_1.StravaClient(storedClientId, storedClientSecret, currentTokens);
}
// ─── Express app (OAuth setup UI only) ────────────────────────────────────
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.get("/", (_req, res) => res.redirect("/setup"));
app.get("/setup", (req, res) => {
    res.send((0, ui_js_1.setupPage)({
        isConnected: !!currentTokens,
        athleteName: currentTokens?.athleteName,
        clientId: storedClientId,
        error: req.query.error,
        port: PORT,
    }));
});
app.post("/setup/authorize", (req, res) => {
    const { client_id, client_secret } = req.body;
    if (!client_id || !client_secret) {
        return res.redirect("/setup?error=Client+ID+and+Secret+are+required");
    }
    storedClientId = client_id.trim();
    storedClientSecret = client_secret.trim();
    const authUrl = new URL("https://www.strava.com/oauth/authorize");
    authUrl.searchParams.set("client_id", storedClientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("redirect_uri", `http://localhost:${PORT}/oauth/callback`);
    authUrl.searchParams.set("approval_prompt", "force");
    authUrl.searchParams.set("scope", "read,read_all,profile:read_all,activity:read_all,activity:write");
    return res.redirect(authUrl.toString());
});
app.get("/oauth/callback", async (req, res) => {
    const { code, error } = req.query;
    if (error || !code) {
        return res.redirect(`/setup?error=${encodeURIComponent(error || "Authorization denied")}`);
    }
    try {
        const tokenRes = await axios_1.default.post("https://www.strava.com/oauth/token", {
            client_id: storedClientId,
            client_secret: storedClientSecret,
            code,
            grant_type: "authorization_code",
        });
        const data = tokenRes.data;
        currentTokens = {
            accessToken: data.access_token,
            expiresAt: data.expires_at,
            refreshToken: data.refresh_token,
            athleteId: data.athlete?.id,
            athleteName: data.athlete
                ? `${data.athlete.firstname ?? ""} ${data.athlete.lastname ?? ""}`.trim()
                : undefined,
        };
        (0, client_js_1.saveTokens)(currentTokens);
        console.error(`[strava-mcp] Authorized: ${currentTokens.athleteName || "athlete"}`);
        return res.send((0, ui_js_1.successPage)(currentTokens.athleteName || "Athlete"));
    }
    catch (err) {
        const msg = axios_1.default.isAxiosError(err)
            ? err.response?.data?.message || err.message
            : String(err);
        return res.redirect(`/setup?error=${encodeURIComponent("Token exchange failed: " + msg)}`);
    }
});
app.get("/health", (_req, res) => {
    res.json({
        status: "ok",
        connected: !!currentTokens,
        athlete: currentTokens?.athleteName || null,
        tools: 14,
    });
});
// ─── MCP server (stdio transport for Claude Desktop) ──────────────────────
const mcpServer = new mcp_js_1.McpServer({
    name: "strava-mcp",
    version: "1.0.0",
});
(0, tools_js_1.registerTools)(mcpServer, getClient);
// ─── Start ─────────────────────────────────────────────────────────────────
async function main() {
    // Start Express on a background port for OAuth setup UI
    app.listen(PORT, () => {
        console.error(`[strava-mcp] Setup UI running at http://localhost:${PORT}/setup`);
        console.error(`[strava-mcp] Health check at http://localhost:${PORT}/health`);
        if (currentTokens?.athleteName) {
            console.error(`[strava-mcp] Connected as: ${currentTokens.athleteName}`);
        }
        else {
            console.error(`[strava-mcp] Not authorized — visit http://localhost:${PORT}/setup`);
        }
    });
    // Connect MCP via stdio — this is what Claude Desktop communicates over
    const transport = new stdio_js_1.StdioServerTransport();
    await mcpServer.connect(transport);
    console.error("[strava-mcp] MCP server connected via stdio");
}
main().catch((err) => {
    console.error("[strava-mcp] Fatal error:", err);
    process.exit(1);
});
