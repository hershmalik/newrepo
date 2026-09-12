# Methodology — how picks are scored

Every prop offer in the target odds window gets a **score** built from the
signals below. Singles need `MIN_SCORE` (default 30) to surface; parlay legs
need 20. Every point of score comes with a human-readable reason so you can
sanity-check any pick before betting it.

## The core signal: injury elevation

Depth charts (ESPN) are joined against the league injury report. For each
player we compute how many players **above him in his position room** are
expected to miss:

| Status | Miss probability |
|---|---|
| Out / IR / PUP / NFI / Suspended | 1.0 |
| Doubtful | 0.85 |
| Questionable | 0.4 |
| Active | 0 |

Scoring:

- **+45 per confirmed-out player above him** (capped at 2) — the Texans-WR scenario
- **+15 per Questionable/Doubtful player above him** — speculative elevation; the price is best *before* these get downgraded
- **+20 if the whole room's injury load ≥ 2** — decimated room, someone unexpected eats targets
- **−40 if he's still behind a full healthy lineup** — injuries above WR9 don't get WR10 on the field
- **−60 if the player himself is Questionable or worse** — don't bet hurt guys

## Football-knowledge overlays (`data/knowledge.json` — edit weekly)

```json
{
  "weakPassDefenses": ["CAR", "WSH"],      → +15 for WR/TE/QB props vs these teams
  "weakRunDefenses": ["ARI"],              → +15 for RB props vs these teams
  "strongDefenses": ["BAL", "SF"],         → −15 for anyone facing them
  "goalLineBacks": {"PHI": "Saquon Barkley"},
  "fadeRookieTEs": true
}
```

- **Goal-line backs:** if a team has a dedicated goal-line guy, TD props for the
  *other* RBs get −15 and pass catchers −5; the goal-line back himself gets +20.
- **Rookie TE fade (−20):** rookie TEs historically produce almost nothing —
  their TD props are priced on draft pedigree, not usage.
- **Veteran backup TE bump (+10):** a 2+ year TE stepping into starter snaps is
  a classic cheap-TD spot (red-zone role comes with the job).
- **Signature play (+10):** an elevated backup on the 2+ TDs market
  (`player_tds_over 1.5`) — the exact bet shape this strategy was built on.

Team keys are ESPN abbreviations. Update this file weekly — it's your
knowledge, not the model's; the scan just applies it consistently.

## Odds handling

- Prices are line-shopped: for each player+market+line, the best price across
  all books is kept (set `BOOKMAKERS` to only books you have).
- **Singles:** +2,000 to +40,000, sweet-spot bonus near your `TARGET_ODDS` (+10,000).
- **Parlays:** 2–3 legs, each +200 to +2,500, combining to +5,000 to +30,000.
  Fewer, chunkier legs beat long chains — every extra leg multiplies the ways
  to lose. Cross-game parlays get a +10 diversity bonus; same-game combos are
  flagged because books reprice correlated legs (your ticket won't pay the
  quoted multiplication).

## Live mode: where the real edge is

Pregame longshot prices are sharp-ish. The genuinely exploitable window is
**in-game, in the minutes after an injury**, before trading desks reprice the
backup's props. Live mode:

1. Polls the ESPN scoreboard, and every live game's summary every ~25s
2. Detects: new in-game injury designations (Out / Questionable to return)
   **and** play-by-play text like "helped off", "carted off", "injured on the play"
3. Identifies the next healthy men up from the depth chart
4. Pulls their current Anytime TD / 2+ TD prices across books
5. Pushes it all to your phone as an urgent notification

You then tap the bet in at whichever book still has the stale price. Speed
matters: have apps open and funded during games.

## Bankroll discipline for +10,000 bets

- The implied probability at +10,000 is ~1%. You will lose **most weeks** —
  that is the design, not a bug. One hit pays for 2+ seasons of stakes.
- Flat-stake ($10). Never chase with bigger stakes after a near-miss.
- 2–4 bets/week max. More volume ≠ more edge; it just burns bankroll faster.
- **Track every bet** in `data/picks-*.json` (kept automatically) plus a note
  of what you actually placed. After a season you'll know which signals hit
  (elevation? matchup? live alerts?) and can retune the weights in
  `src/engine/scoring.js`.
- Season budget ≈ $10 × 3/wk × 18 weeks = **$540**. Decide up front that
  losing all of it is fine. If it stops being entertainment: 1-800-GAMBLER.
