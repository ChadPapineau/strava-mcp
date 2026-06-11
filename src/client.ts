import axios, { AxiosInstance } from "axios";
import fs from "fs";
import path from "path";

const STRAVA_API_BASE = "https://www.strava.com/api/v3";

// Anchor token file to dist/ using __dirname (available natively in CommonJS),
// not process.cwd() — Claude Desktop may launch from a different working dir.
const TOKEN_FILE = path.join(__dirname, ".strava_tokens.json");

export interface StoredTokens {
  accessToken: string;
  expiresAt: number;
  refreshToken: string;
  athleteId?: number;
  athleteName?: string;
}

export function loadTokens(): StoredTokens | null {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      return JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8")) as StoredTokens;
    }
  } catch {}
  return null;
}

export function saveTokens(tokens: StoredTokens): void {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
}

export class StravaClient {
  private http: AxiosInstance;
  private tokens: StoredTokens;
  private clientId: string;
  private clientSecret: string;

  constructor(clientId: string, clientSecret: string, tokens: StoredTokens) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.tokens = tokens;
    this.http = axios.create({ baseURL: STRAVA_API_BASE });
  }

  static fromEnv(): StravaClient | null {
    const clientId = process.env.STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;
    const tokens = loadTokens();
    if (!tokens) return null;
    return new StravaClient(clientId, clientSecret, tokens);
  }

  private isExpired(): boolean {
    return Date.now() / 1000 >= this.tokens.expiresAt - 60;
  }

  async ensureFreshToken(): Promise<void> {
    if (!this.isExpired()) return;
    const res = await axios.post("https://www.strava.com/oauth/token", {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: "refresh_token",
      refresh_token: this.tokens.refreshToken,
    });
    this.tokens = {
      ...this.tokens,
      accessToken: res.data.access_token,
      expiresAt: res.data.expires_at,
      refreshToken: res.data.refresh_token,
    };
    saveTokens(this.tokens);
  }

  async get<T>(path: string, params: Record<string, unknown> = {}): Promise<T> {
    await this.ensureFreshToken();
    const res = await this.http.get<T>(path, {
      headers: { Authorization: `Bearer ${this.tokens.accessToken}` },
      params,
    });
    return res.data;
  }

  async put<T>(path: string, data: Record<string, unknown>): Promise<T> {
    await this.ensureFreshToken();
    const res = await this.http.put<T>(path, data, {
      headers: { Authorization: `Bearer ${this.tokens.accessToken}` },
    });
    return res.data;
  }

  getAthleteInfo(): { id?: number; name?: string } {
    return { id: this.tokens.athleteId, name: this.tokens.athleteName };
  }
}

// ─── Formatting helpers ────────────────────────────────────────────────────

export function formatDist(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}

export function formatTime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function formatPace(mps: number): string {
  const mpk = 1000 / (mps * 60);
  const mins = Math.floor(mpk);
  const secs = Math.round((mpk - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, "0")} /km`;
}

export function formatSpeed(mps: number): string {
  return `${(mps * 3.6).toFixed(1)} km/h`;
}

export function apiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const s = err.response?.status;
    const msg = err.response?.data?.message || err.message;
    if (s === 401) return `Auth error: ${msg}. Re-authorize at http://localhost:${process.env.PORT || 3000}/setup`;
    if (s === 403) return `Forbidden: ${msg}. You may need additional OAuth scopes.`;
    if (s === 404) return `Not found: ${msg}`;
    if (s === 429) return `Rate limited. Try again in a few minutes.`;
    return `Strava API error (${s}): ${msg}`;
  }
  return err instanceof Error ? err.message : String(err);
}