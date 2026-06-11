export function setupPage(opts: {
  isConnected: boolean;
  athleteName?: string;
  clientId?: string;
  error?: string;
  port: number;
}): string {
  const { isConnected, athleteName, clientId, error, port } = opts;

  const connectedBadge = isConnected
    ? `<div class="badge connected">✅ Connected as ${athleteName || "Athlete"}</div>`
    : `<div class="badge disconnected">⚠️ Not connected — complete setup below</div>`;

  const authUrl = clientId
    ? `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=http://localhost:${port}/oauth/callback&approval_prompt=force&scope=read,read_all,profile:read_all,activity:read_all,activity:write`
    : null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Strava Connector — Setup</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f4f4f5; color: #18181b; min-height: 100vh; padding: 2rem; }
    .container { max-width: 680px; margin: 0 auto; }
    h1 { font-size: 1.6rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem; }
    .subtitle { color: #71717a; margin-bottom: 2rem; }
    .card { background: #fff; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.25rem; border: 1px solid #e4e4e7; }
    .card h2 { font-size: 1rem; font-weight: 600; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
    .step { display: flex; gap: 1rem; margin-bottom: 1rem; }
    .step-num { width: 28px; height: 28px; border-radius: 50%; background: #fc4c02; color: #fff; font-size: 0.8rem; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; }
    .step-body { flex: 1; }
    .step-body p { color: #52525b; font-size: 0.92rem; line-height: 1.5; }
    .step-body a { color: #fc4c02; text-decoration: none; font-weight: 500; }
    .step-body a:hover { text-decoration: underline; }
    input[type=text], input[type=password] { width: 100%; padding: 0.55rem 0.75rem; border: 1px solid #d4d4d8; border-radius: 8px; font-size: 0.9rem; margin-top: 0.4rem; font-family: monospace; }
    input:focus { outline: none; border-color: #fc4c02; box-shadow: 0 0 0 3px rgba(252,76,2,0.12); }
    .btn { display: inline-block; padding: 0.6rem 1.2rem; border-radius: 8px; font-size: 0.9rem; font-weight: 600; cursor: pointer; border: none; text-decoration: none; transition: opacity 0.15s; }
    .btn-primary { background: #fc4c02; color: #fff; }
    .btn-secondary { background: #18181b; color: #fff; }
    .btn:hover { opacity: 0.85; }
    .btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .badge { padding: 0.5rem 0.9rem; border-radius: 8px; font-size: 0.9rem; font-weight: 500; margin-bottom: 1.5rem; display: inline-block; }
    .connected { background: #dcfce7; color: #166534; }
    .disconnected { background: #fef9c3; color: #854d0e; }
    .error { background: #fee2e2; color: #991b1b; padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1.25rem; font-size: 0.9rem; }
    .code { background: #f4f4f5; padding: 0.75rem 1rem; border-radius: 8px; font-family: monospace; font-size: 0.85rem; margin-top: 0.5rem; word-break: break-all; color: #374151; }
    .tools-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.5rem; }
    .tool-tag { background: #f4f4f5; border-radius: 6px; padding: 0.3rem 0.6rem; font-size: 0.8rem; font-family: monospace; color: #374151; }
    form { display: flex; flex-direction: column; gap: 0.75rem; }
    label { font-size: 0.85rem; font-weight: 500; color: #374151; }
    .footer { text-align: center; color: #a1a1aa; font-size: 0.8rem; margin-top: 2rem; }
  </style>
</head>
<body>
<div class="container">
  <h1>🚴 Strava Connector</h1>
  <p class="subtitle">MCP server for Claude — query your Strava data with natural language</p>

  ${connectedBadge}
  ${error ? `<div class="error">❌ ${error}</div>` : ""}

  <div class="card">
    <h2>⚙️ Setup</h2>

    <div class="step">
      <div class="step-num">1</div>
      <div class="step-body">
        <strong>Create a Strava App</strong>
        <p>Go to <a href="https://www.strava.com/settings/api" target="_blank">strava.com/settings/api</a> and create an application. Set <strong>Authorization Callback Domain</strong> to <code>localhost</code>. Note your <strong>Client ID</strong> and <strong>Client Secret</strong>.</p>
      </div>
    </div>

    <div class="step">
      <div class="step-num">2</div>
      <div class="step-body">
        <strong>Enter your credentials and authorize</strong>
        <form method="POST" action="/setup/authorize">
          <label>Client ID
            <input type="text" name="client_id" placeholder="12345" value="${clientId || ""}" required>
          </label>
          <label>Client Secret
            <input type="password" name="client_secret" placeholder="abc123..." required>
          </label>
          ${authUrl
            ? `<a class="btn btn-primary" href="${authUrl}">🔗 Connect to Strava</a>`
            : `<button class="btn btn-primary" type="submit">Save & Get Authorization Link →</button>`
          }
        </form>
      </div>
    </div>

    <div class="step">
      <div class="step-num">3</div>
      <div class="step-body">
        <strong>Add to Claude Desktop</strong>
        <p>After connecting, add this to your <code>claude_desktop_config.json</code>:</p>
        <div class="code">{
  "mcpServers": {
    "strava": {
      "command": "node",
      "args": ["/path/to/strava-connector/dist/index.js"],
      "env": {
        "STRAVA_CLIENT_ID": "${clientId || "YOUR_CLIENT_ID"}",
        "STRAVA_CLIENT_SECRET": "YOUR_CLIENT_SECRET",
        "STRAVA_REFRESH_TOKEN": "from_.strava_tokens.json"
      }
    }
  }
}</div>
      </div>
    </div>
  </div>

  <div class="card">
    <h2>🛠️ Available Tools (${isConnected ? "active" : "available after setup"})</h2>
    <div class="tools-grid">
      <span class="tool-tag">strava_get_athlete</span>
      <span class="tool-tag">strava_get_stats</span>
      <span class="tool-tag">strava_list_gear</span>
      <span class="tool-tag">strava_list_activities</span>
      <span class="tool-tag">strava_get_activity</span>
      <span class="tool-tag">strava_get_activity_laps</span>
      <span class="tool-tag">strava_get_activity_streams</span>
      <span class="tool-tag">strava_update_activity</span>
      <span class="tool-tag">strava_get_segment</span>
      <span class="tool-tag">strava_get_segment_leaderboard</span>
      <span class="tool-tag">strava_list_starred_segments</span>
      <span class="tool-tag">strava_list_clubs</span>
      <span class="tool-tag">strava_get_club_activities</span>
      <span class="tool-tag">strava_list_routes</span>
    </div>
  </div>

  <div class="footer">Strava MCP Connector · Running on port ${port}</div>
</div>
</body>
</html>`;
}

export function successPage(name: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Connected!</title>
  <style>
    body { font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f4f4f5; }
    .box { background: #fff; padding: 2.5rem; border-radius: 16px; text-align: center; max-width: 400px; border: 1px solid #e4e4e7; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    p { color: #71717a; margin-bottom: 1.5rem; }
    a { color: #fc4c02; text-decoration: none; font-weight: 500; }
  </style>
</head>
<body>
<div class="box">
  <div style="font-size:3rem">🎉</div>
  <h1>Connected!</h1>
  <p>Successfully authorized as <strong>${name}</strong>. Your refresh token is saved. You can now close this window and restart Claude Desktop.</p>
  <a href="/setup">← Back to Setup</a>
</div>
</body>
</html>`;
}