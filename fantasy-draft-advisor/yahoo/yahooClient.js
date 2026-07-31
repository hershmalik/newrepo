/*
 * Yahoo Fantasy API client scaffold (Phase 2).
 * Register an app at https://developer.yahoo.com/apps/ and set:
 *   YAHOO_CLIENT_ID, YAHOO_CLIENT_SECRET
 * Then wire registerYahooRoutes(app) into server.js.
 */

const fs = require("fs");
const path = require("path");

const AUTH_URL = "https://api.login.yahoo.com/oauth2/request_auth";
const TOKEN_URL = "https://api.login.yahoo.com/oauth2/get_token";
const API_BASE = "https://fantasysports.yahooapis.com/fantasy/v2";
const TOKEN_FILE = path.join(__dirname, ".tokens.json");

const clientId = process.env.YAHOO_CLIENT_ID;
const clientSecret = process.env.YAHOO_CLIENT_SECRET;
const redirectUri = process.env.YAHOO_REDIRECT_URI || "http://localhost:3000/auth/yahoo/callback";

function loadTokens() {
  try {
    return JSON.parse(fs.readFileSync(TOKEN_FILE, "utf8"));
  } catch {
    return null;
  }
}

function saveTokens(tokens) {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
}

async function exchangeCode(code) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    }),
  });
  if (!res.ok) throw new Error(`Yahoo token exchange failed: ${res.status}`);
  const tokens = await res.json();
  tokens.obtained_at = Date.now();
  saveTokens(tokens);
  return tokens;
}

async function refreshIfNeeded() {
  let tokens = loadTokens();
  if (!tokens) throw new Error("Not linked to Yahoo yet — visit /auth/yahoo");
  const ageSec = (Date.now() - tokens.obtained_at) / 1000;
  if (ageSec < tokens.expires_in - 60) return tokens;
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      redirect_uri: redirectUri,
      refresh_token: tokens.refresh_token,
    }),
  });
  if (!res.ok) throw new Error(`Yahoo token refresh failed: ${res.status}`);
  tokens = await res.json();
  tokens.obtained_at = Date.now();
  saveTokens(tokens);
  return tokens;
}

async function yahooGet(resource) {
  const tokens = await refreshIfNeeded();
  const res = await fetch(`${API_BASE}/${resource}?format=json`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!res.ok) throw new Error(`Yahoo API ${resource} failed: ${res.status}`);
  return res.json();
}

function registerYahooRoutes(app) {
  if (!clientId || !clientSecret) {
    console.log("   Yahoo: not configured (set YAHOO_CLIENT_ID / YAHOO_CLIENT_SECRET)");
    return;
  }

  app.get("/auth/yahoo", (_req, res) => {
    const url = `${AUTH_URL}?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code`;
    res.redirect(url);
  });

  app.get("/auth/yahoo/callback", async (req, res) => {
    try {
      await exchangeCode(req.query.code);
      res.send("✅ Yahoo linked. You can close this tab.");
    } catch (err) {
      res.status(500).send(`Yahoo auth failed: ${err.message}`);
    }
  });

  // Poll during a live draft: GET /api/yahoo/draftresults?league_key=nfl.l.12345
  app.get("/api/yahoo/draftresults", async (req, res) => {
    try {
      const data = await yahooGet(`league/${req.query.league_key}/draftresults`);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/yahoo/roster", async (req, res) => {
    try {
      const data = await yahooGet(`team/${req.query.team_key}/roster`);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

module.exports = { registerYahooRoutes, yahooGet };
