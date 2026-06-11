import express from "express";
import axios from "axios";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  StravaClient,
  StoredTokens,
  loadTokens,
  saveTokens,
} from "./client.js";
import { registerTools } from "./tools.js";
import { setupPage, successPage } from "./ui.js";

// ─── Config ────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || "3000");
const CLIENT_ID = process.env.STRAVA_CLIENT_ID || "";
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET || "";

// NOTE: All logging uses console.error so it goes to stderr.
// stdout is reserved exclusively for MCP JSON-RPC messages (stdio transport).

let storedClientId = CLIENT_ID;
let storedClientSecret = CLIENT_SECRET;
let currentTokens: StoredTokens | null = loadTokens();

function getClient(): StravaClient | null {
  if (!currentTokens || !storedClientId || !storedClientSecret) return null;
  return new StravaClient(storedClientId, storedClientSecret, currentTokens);
}

// ─── Express app (OAuth setup UI only) ────────────────────────────────────

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => res.redirect("/setup"));

app.get("/setup", (req, res) => {
  res.send(setupPage({
    isConnected: !!currentTokens,
    athleteName: currentTokens?.athleteName,
    clientId: storedClientId,
    error: req.query.error as string | undefined,
    port: PORT,
  }));
});

app.post("/setup/authorize", (req, res) => {
  const { client_id, client_secret } = req.body as { client_id: string; client_secret: string };
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
  const { code, error } = req.query as { code?: string; error?: string };

  if (error || !code) {
    return res.redirect(`/setup?error=${encodeURIComponent(error || "Authorization denied")}`);
  }

  try {
    const tokenRes = await axios.post("https://www.strava.com/oauth/token", {
      client_id: storedClientId,
      client_secret: storedClientSecret,
      code,
      grant_type: "authorization_code",
    });

    const data = tokenRes.data as {
      access_token: string;
      expires_at: number;
      refresh_token: string;
      athlete?: { id?: number; firstname?: string; lastname?: string };
    };

    currentTokens = {
      accessToken: data.access_token,
      expiresAt: data.expires_at,
      refreshToken: data.refresh_token,
      athleteId: data.athlete?.id,
      athleteName: data.athlete
        ? `${data.athlete.firstname ?? ""} ${data.athlete.lastname ?? ""}`.trim()
        : undefined,
    };

    saveTokens(currentTokens);
    console.error(`[strava-mcp] Authorized: ${currentTokens.athleteName || "athlete"}`);
    return res.send(successPage(currentTokens.athleteName || "Athlete"));
  } catch (err) {
    const msg = axios.isAxiosError(err)
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

const mcpServer = new McpServer({
  name: "strava-mcp",
  version: "1.0.0",
});

registerTools(mcpServer, getClient);

// ─── Start ─────────────────────────────────────────────────────────────────

async function main() {
  // Start Express on a background port for OAuth setup UI
  app.listen(PORT, () => {
    console.error(`[strava-mcp] Setup UI running at http://localhost:${PORT}/setup`);
    console.error(`[strava-mcp] Health check at http://localhost:${PORT}/health`);
    if (currentTokens?.athleteName) {
      console.error(`[strava-mcp] Connected as: ${currentTokens.athleteName}`);
    } else {
      console.error(`[strava-mcp] Not authorized — visit http://localhost:${PORT}/setup`);
    }
  });

  // Connect MCP via stdio — this is what Claude Desktop communicates over
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.error("[strava-mcp] MCP server connected via stdio");
}

main().catch((err) => {
  console.error("[strava-mcp] Fatal error:", err);
  process.exit(1);
});