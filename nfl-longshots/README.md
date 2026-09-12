# NFL Longshots — injury-driven longshot prop finder

Finds high-odds (+5,000 to +30,000, targeting ~+10,000) NFL player-prop bets
built on one core edge: **when starters get hurt, their backups inherit real
snaps while the books still price them like backups.** (Think 2024 Texans —
the WR room was so injured that backups were running full routes at longshot
prices.)

On top of the injury signal it layers editable football-knowledge overlays:
weak/strong defensive matchups, goal-line usage ("this team runs it in, don't
bet their WR TD props"), rookie-TE fades, and veteran-backup-TE bumps.

## Three modes

| Command | What it does |
|---|---|
| `npm run scan` | **Pregame scan** — pulls depth charts, the league injury report, and player props for the week's games; prints ranked longshot singles (2+ TD backup props etc.) and 2–3 leg parlays in your target odds window |
| `npm run live` | **Live monitor** — polls ESPN during games, detects a skill player going down (injury designation or play-by-play), and instantly pushes the elevated backup's current Anytime TD / 2+ TD prices to your phone so you can bet before the book reprices |
| `npm run serve` | **Dashboard** — browse the latest scan at `http://localhost:3000`, trigger new scans with a button |

## Quick start

```bash
cd nfl-longshots
npm install
cp .env.example .env     # add your ODDS_API_KEY (and NTFY_TOPIC for phone alerts)
npm run scan
```

Full walkthrough (API key, phone push alerts, running on a schedule, costs):
**[SETUP.md](SETUP.md)**. How the picks are scored and how to tune it:
**[METHODOLOGY.md](METHODOLOGY.md)**.

## Why it alerts you instead of placing bets itself

No US sportsbook (DraftKings, FanDuel, BetMGM, Caesars…) offers a public API
for placing bets, and automating their apps violates their terms of service —
accounts caught doing it get limited or banned, which would kill the whole
strategy. The realistic version of "beat the books to the line" is exactly
what live mode does: detect the injury within ~25 seconds, look up the
backup's current prices, and put everything you need in a push notification.
You tap the bet in yourself — that keeps your account clean and keeps you in
control of every dollar.

## Honest expectations

A +10,000 bet needs to hit more than ~1% of the time to be profitable. At
$10 × 3 bets a week over an 18-week season (~$540), a single hit pays
~$1,000+. The methodology is designed to find spots where the true
probability is better than the price implies — but variance is enormous and
losing streaks of months are normal. Bet only what you'd happily burn. If it
stops being fun, stop (1-800-GAMBLER).
