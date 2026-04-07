import express from "express";
import axios from "axios";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
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

// In-memory credential store (also persisted to disk as .strava_tokens.json)
let storedClientId = CLIENT_ID;
let storedClientSecret = CLIENT_SECRET;
let currentTokens: StoredTokens | null = loadTokens();

function getClient(): StravaClient | null {
  if (!currentTokens || !storedClientId || !storedClientSecret) return null;
  return new StravaClient(storedClientId, storedClientSecret, currentTokens);
}

// ─── Express app ───────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Setup UI ───────────────────────────────────────────────────────────────

app.get("/", (req, res) => res.redirect("/setup"));

app.get("/setup", (req, res) => {
  res.send(setupPage({
    isConnected: !!currentTokens,
    athleteName: currentTokens?.athleteName,
    clientId: storedClientId,
    error: req.query.error as string | undefined,
    port: PORT,
  }));
});

// Save credentials and redirect to Strava OAuth
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

// OAuth callback — exchange code for tokens
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
      athleteName: data.athlete ? `${data.athlete.firstname ?? ""} ${data.athlete.lastname ?? ""}`.trim() : undefined,
    };

    saveTokens(currentTokens);

    console.log(`✅ Authorized: ${currentTokens.athleteName || "athlete"}`);
    return res.send(successPage(currentTokens.athleteName || "Athlete"));
  } catch (err) {
    const msg = axios.isAxiosError(err)
      ? err.response?.data?.message || err.message
      : String(err);
    return res.redirect(`/setup?error=${encodeURIComponent("Token exchange failed: " + msg)}`);
  }
});

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    connected: !!currentTokens,
    athlete: currentTokens?.athleteName || null,
    tools: 14,
  });
});

// ─── MCP endpoint ──────────────────────────────────────────────────────────

const mcpServer = new McpServer({
  name: "strava-connector",
  version: "1.0.0",
});

registerTools(mcpServer, getClient);

app.post("/mcp", async (req, res) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  res.on("close", () => transport.close());
  await mcpServer.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.get("/mcp", (_req, res) => {
  res.json({
    name: "strava-connector",
    version: "1.0.0",
    description: "Strava MCP connector — query your activities, stats, segments, and more",
    endpoint: `http://localhost:${PORT}/mcp`,
    connected: !!currentTokens,
  });
});

// ─── Start ─────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🚴 Strava Connector running`);
  console.log(`   Setup UI:   http://localhost:${PORT}/setup`);
  console.log(`   MCP URL:    http://localhost:${PORT}/mcp`);
  console.log(`   Health:     http://localhost:${PORT}/health`);

  if (currentTokens?.athleteName) {
    console.log(`\n✅ Connected as: ${currentTokens.athleteName}`);
  } else {
    console.log(`\n⚠️  Not authorized yet — visit http://localhost:${PORT}/setup`);
  }

  if (!storedClientId || !storedClientSecret) {
    console.log("   Set STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET env vars, or enter them in the UI\n");
  }
});
