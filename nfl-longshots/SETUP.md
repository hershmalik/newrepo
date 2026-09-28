# Setup Guide — NFL Longshots

## Step 1 — The Odds API key (required)

**Where:** https://the-odds-api.com

1. Sign up (free) and grab your API key from the dashboard
2. Put it in `.env` as `ODDS_API_KEY=...`

**Cost reality:** the free tier gives 500 credits/month. Player props are
fetched per-game and cost roughly 5–10 credits per game per scan, so one full
weekly scan of ~16 games ≈ 100–160 credits. The free tier covers ~2–3 scans a
week with nothing left for live mode. **The $30/mo tier (20K credits) is the
right one in-season** — it comfortably covers daily scans plus live-mode
lookups. To stretch credits:

- Set `BOOKMAKERS=draftkings,fanduel` in `.env` to only pull books you actually have accounts on
- Keep `ALT_MARKETS=0` unless you want alternate-yardage longshots too
- Lower `DAYS_AHEAD` so you only fetch the upcoming slate

ESPN data (depth charts, injuries, live play-by-play) is free and needs no key.

## Step 2 — Phone push alerts via ntfy (recommended, free)

Live mode is pointless without instant phone alerts. ntfy is a free
push service — no account needed:

1. Install the **ntfy** app ([iOS](https://apps.apple.com/us/app/ntfy/id1625396347) / [Android](https://play.google.com/store/apps/details?id=io.heckel.ntfy))
2. In the app: **Subscribe to topic** → pick a hard-to-guess name like `hersh-nfl-x8k2q` (anyone who knows the topic name can see your alerts, so make it random)
3. Set the same name in `.env`: `NTFY_TOPIC=hersh-nfl-x8k2q`
4. In the app, allow notifications and (on iOS) enable instant delivery

Test it: `node -e "import('./src/alerts.js').then(m => m.notify({title:'test',message:'it works'}))"`

## Step 3 — Running it

```bash
npm install
cp .env.example .env   # then edit .env
npm run scan           # weekly picks in the terminal + saved to data/
npm run serve          # same picks in a browser at localhost:3000
npm run live           # run during game windows
```

### Weekly rhythm (in-season)

| When | What |
|---|---|
| Wed–Thu | First `npm run scan` — see which rooms are getting thin |
| Fri–Sat | Re-scan after final injury reports; place pregame longshots |
| Sat night | Update `data/knowledge.json` (matchups, goal-line backs) for Sunday |
| Sun 12:45pm ET | Start `npm run live` before the early window; leave it running through SNF |
| Mon/Thu night | `npm run live` again |

### Sunday inactives edge

Official inactives drop **90 minutes before kickoff**. A surprise scratch is
the single best pregame window — books can be slow repricing the backup's
props. Run `npm run scan` right after inactives come out (~11:30am ET for
1pm games).

## Step 4 — Keeping it running (optional)

Any always-on box works (an old laptop is fine). To run it hands-off on a
$5/mo VPS or a Raspberry Pi:

```cron
# crontab -e  (times in ET)
30 11 * * 0   cd ~/nfl-longshots && npm run scan:push     # Sunday post-inactives scan
0  9  * * 3,5 cd ~/nfl-longshots && npm run scan:push     # Wed + Fri scans
45 12 * * 0   cd ~/nfl-longshots && timeout 12h npm run live   # Sunday live window
15 20 * * 1,4 cd ~/nfl-longshots && timeout 5h npm run live    # MNF / TNF
```

## Step 5 — Placing the bets

Alerts tell you the bet, the best price, and which book has it. Have the
sportsbook apps installed and logged in with a funded balance *before*
game day — live windows are measured in seconds, and fumbling a login costs
you the line. Keep accounts at 2+ books; the scan already line-shops across
them and the price difference on longshots is often massive (+8000 vs +15000
for the same bet is common).

## Costs summary

| Thing | Cost |
|---|---|
| ESPN data | Free |
| ntfy push alerts | Free |
| The Odds API | Free tier OK for trying it; $30/mo in-season |
| VPS (optional) | ~$5/mo, or run on any computer you leave on |
