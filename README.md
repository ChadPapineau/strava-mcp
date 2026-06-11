# Strava MCP Server

An MCP (Model Context Protocol) server that provides comprehensive access to the [Strava API v3](https://developers.strava.com/docs/reference/). Connect Claude (or any MCP client) to your Strava account to query activities, performance stats, segments, routes, clubs, gear, and raw data streams.

## Features

**26 tools** covering the full Strava API:

| Category | Tools |
|----------|-------|
| **Auth** | Diagnose connection status and token health |
| **Athlete** | Get profile, stats (recent/YTD/all-time), heart rate & power zones |
| **Activities** | Aggregated summaries, list activities (compact or full, with sport type filtering), get detail, laps, zones, comments, kudos |
| **Segments** | Get segment detail, explore by area, leaderboard, starred segments, segment efforts |
| **Streams** | Activity streams, segment effort streams, route streams (second-by-second data) |
| **Routes** | List athlete routes, get route detail |
| **Clubs** | List your clubs, get club detail, members, club activities |
| **Gear** | Get equipment details (bikes, shoes) |

All tools support both **markdown** (human-readable) and **JSON** (structured) output formats.

## Prerequisites

1. **Node.js 18+**
2. A **Strava account**
3. A **Strava API Application** — create one at [strava.com/settings/api](https://www.strava.com/settings/api)

## Setup

### 1. Get Your Strava API Credentials

1. Go to [strava.com/settings/api](https://www.strava.com/settings/api)
2. Create an application (or use an existing one)
3. Set the **Authorization Callback Domain** to `localhost`
4. Note your **Client ID** and **Client Secret**

> **Important:** You only need the Client ID and Client Secret. The `npm run authorize` command handles getting your access and refresh tokens automatically via your browser.

### 2. Install & Build

```bash
git clone https://github.com/ChadPapineau/strava-mcp.git
cd strava-mcp
npm install
npm run build
```

### 3. Authorize with Strava

Run the built-in authorization flow to get your OAuth tokens:

```bash
STRAVA_CLIENT_ID=your_client_id \
  STRAVA_CLIENT_SECRET=your_client_secret \
  npm run authorize
```

This will:
1. Start a local callback server on port 8091
2. Open your browser to Strava's authorization page
3. You click "Authorize" on Strava
4. Fresh tokens are automatically saved to `~/.strava-mcp-tokens.json`

You should see a success page in your browser confirming the connection.

### 4. Configure Claude Desktop

Add the server to your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "strava": {
      "command": "node",
      "args": ["/absolute/path/to/strava-mcp/dist/index.js"],
      "env": {
        "STRAVA_CLIENT_ID": "your_client_id",
        "STRAVA_CLIENT_SECRET": "your_client_secret"
      }
    }
  }
}
```

> **Note:** You do NOT need to put access/refresh tokens in the config. The server reads them from `~/.strava-mcp-tokens.json` (created by `npm run authorize`) and manages token rotation automatically.

### 5. Restart Claude Desktop

After saving the config, restart Claude Desktop. The Strava tools will appear in the tool list.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `STRAVA_CLIENT_ID` | Yes | Your Strava API application client ID |
| `STRAVA_CLIENT_SECRET` | Yes | Your Strava API application client secret |
| `STRAVA_TOKEN_FILE` | No | Path to persist refreshed tokens (default: `~/.strava-mcp-tokens.json`) |
| `STRAVA_AUTH_PORT` | No | Port for the OAuth callback server (default: `8091`) |
| `STRAVA_ACCESS_TOKEN` | No | Manual override — only needed if not using `npm run authorize` |
| `STRAVA_REFRESH_TOKEN` | No | Manual override — only needed if not using `npm run authorize` |

## How Token Management Works

Strava access tokens expire every 6 hours, and **Strava rotates refresh tokens** — each time you refresh, the old refresh token is invalidated and a new one is issued. This server handles this automatically:

1. **On startup**: loads persisted tokens from `~/.strava-mcp-tokens.json` (if they exist). These take priority over env vars since they contain the latest valid refresh token.
2. **Before each API call**: checks if the access token is expired (or within 5 minutes of expiry) and refreshes proactively.
3. **On 401 responses**: force-refreshes the token and retries the request once automatically.
4. **After every successful refresh**: writes the new tokens to disk (with `0600` permissions) so they survive server restarts.
5. **Concurrency safety**: uses a mutex to prevent multiple simultaneous refresh attempts.

After running `npm run authorize` once, the server manages token rotation entirely on its own. You should never need to manually copy or paste tokens.

## Usage Examples

Once connected, you can ask Claude things like:

- *"How many miles have I run this month?"* (uses the efficient activity summary tool)
- *"What's my total training volume this week?"*
- *"Show me my Strava profile"*
- *"What are my all-time running stats?"*
- *"List my last 10 activities"*
- *"Get the details of my most recent ride"*
- *"Show me the laps from activity 12345678"*
- *"What are my heart rate zones?"*
- *"Explore popular cycling segments near San Francisco"*
- *"Show the leaderboard for segment 12345"*
- *"Get my heart rate stream data for my last run"*
- *"What clubs am I a member of?"*
- *"Show details for my bike gear"*

## Tool Reference

### Auth Tools

| Tool | Description |
|------|-------------|
| `strava_auth_status` | Diagnose OAuth connection health — checks token file, env vars, and makes a live API test call. Use this first when troubleshooting auth errors. |

### Athlete Tools

| Tool | Description |
|------|-------------|
| `strava_get_athlete` | Get your profile (ID, name, location, FTP, weight, etc.) |
| `strava_get_athlete_stats` | Aggregate stats: recent (4 wk), YTD, and all-time for rides/runs/swims |
| `strava_get_athlete_zones` | Heart rate and power training zones |

### Activity Tools

| Tool | Description |
|------|-------------|
| `strava_activity_summary` | **Best for "how many miles" questions.** Aggregates totals (distance, time, elevation, pace) for a date range, grouped by sport type. Server-side computation — very fast and token-efficient. |
| `strava_list_activities` | List activities with date range and sport type filters. Supports compact mode (one line per activity, default) or full detail. |
| `strava_get_activity` | Full activity detail with segments, best efforts, splits |
| `strava_get_activity_laps` | Lap-by-lap breakdown |
| `strava_get_activity_zones` | Time spent in each HR/power zone |
| `strava_get_activity_comments` | Comments on an activity |
| `strava_get_activity_kudos` | Who gave kudos |

### Segment Tools

| Tool | Description |
|------|-------------|
| `strava_get_segment` | Segment detail with stats, records, your PR |
| `strava_explore_segments` | Find segments in a geographic area |
| `strava_get_segment_leaderboard` | Leaderboard with filtering (gender, age, club, etc.) |
| `strava_list_starred_segments` | Your starred/saved segments |
| `strava_get_segment_effort` | Detail of a specific segment effort |

### Stream Tools

| Tool | Description |
|------|-------------|
| `strava_get_activity_streams` | Second-by-second data (HR, power, cadence, altitude, etc.) |
| `strava_get_segment_effort_streams` | Stream data for a segment effort |
| `strava_get_route_streams` | GPS track data for a route |

### Route, Club & Gear Tools

| Tool | Description |
|------|-------------|
| `strava_list_routes` | Routes created by an athlete |
| `strava_get_route` | Route detail |
| `strava_list_clubs` | Your club memberships |
| `strava_get_club` | Club detail |
| `strava_list_club_members` | Members of a club |
| `strava_list_club_activities` | Recent activities from club members |
| `strava_get_gear` | Equipment detail (bikes, shoes) |

## OAuth Scopes

The `npm run authorize` command requests these scopes automatically:

- `read` — Read public data
- `read_all` — Read private activities
- `activity:read` — Read activity data
- `activity:read_all` — Read all activity data (including "Only Me" activities)

## Rate Limits

Strava enforces API rate limits:

- **100 requests per 15 minutes** (default app)
- **1,000 requests per day** (default app)
- Approved apps get higher limits (600/15min, 6,000/day)

The server returns clear error messages when rate limits are hit. The `strava_activity_summary` tool is designed to minimize API calls by fetching in large pages and aggregating server-side.

## Development

```bash
# Watch mode with auto-reload
npm run dev

# Build for production
npm run build

# Run the built server
npm start

# Clean build artifacts
npm run clean
```

## Troubleshooting

**"Missing required environment variables"**
Ensure `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET` are set in your Claude Desktop config (see step 4 above).

**"Unauthorized" errors / "Token refresh failed"**
Your refresh token has been invalidated. Re-run the authorize flow:
```bash
cd /path/to/strava-mcp
STRAVA_CLIENT_ID=your_id STRAVA_CLIENT_SECRET=your_secret npm run authorize
```
Then restart Claude Desktop. No manual token copying needed.

**Use `strava_auth_status` for diagnostics**
If you're seeing auth errors in Claude, ask Claude to run the `strava_auth_status` tool. It checks the token file, environment variables, and makes a live API call, then reports exactly what's wrong and how to fix it.

**"Rate limit exceeded"**
Wait 15 minutes before making more requests, or reduce the frequency of tool calls.

**"Resource not found"**
Double-check the ID you're passing. Use `strava_list_activities` or `strava_get_athlete` first to find valid IDs.

**Token file location**
By default tokens are persisted to `~/.strava-mcp-tokens.json`. To change this, set the `STRAVA_TOKEN_FILE` environment variable. To see what the server is doing with tokens, check stderr output (visible in Claude Desktop logs).

**Callback port conflict**
If port 8091 is in use, set `STRAVA_AUTH_PORT` to a different port before running `npm run authorize`.

## License

MIT
