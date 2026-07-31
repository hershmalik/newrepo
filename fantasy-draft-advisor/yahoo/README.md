# Yahoo Fantasy Integration (Phase 2)

Goal: during your live Yahoo draft, the app auto-tracks picks instead of you clicking
"Gone"/"Mine" manually, and in-season it pulls your roster for start/sit + waiver advice.

## What Yahoo provides

Yahoo Fantasy Sports API (https://developer.yahoo.com/fantasysports/guide/):

- OAuth 2.0 auth (register an app at https://developer.yahoo.com/apps/ to get a
  client ID/secret; redirect URI can be `http://localhost:3000/auth/yahoo/callback`)
- `league/{league_key}/draftresults` — completed draft picks (updates during live drafts,
  but with a delay; Yahoo has no push/websocket API for the draft room)
- `league/{league_key}/players;status=A` — available players
- `team/{team_key}/roster` — your roster (in-season)
- `league/{league_key}/transactions` — waivers/trades

## Honest limitation

Yahoo's public API does **not** stream live draft-room picks in real time — the
`draftresults` endpoint lags. Plan:

1. **v1 (works today):** manual click-tracking in the app (already built).
2. **v2:** poll `draftresults` every ~10s during the draft and auto-mark players
   drafted; fall back to manual clicks for anything the poll misses.
3. **In-season:** roster/waiver sync is fully supported by the API — no limitations.

## Setup steps (when ready)

1. Register a Yahoo app → get `YAHOO_CLIENT_ID` / `YAHOO_CLIENT_SECRET`.
2. Set them as env vars, add the OAuth routes from `yahooClient.js` to `server.js`.
3. Visit `/auth/yahoo` to link your account; tokens are stored in `yahoo/.tokens.json`
   (gitignored).
