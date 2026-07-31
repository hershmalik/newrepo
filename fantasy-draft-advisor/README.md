# 🏈 Ron Stewart Draft Advisor

A live fantasy football draft assistant built around [Ron Stewart's](https://youtube.com/@ronstewart_)
rankings and methodology — Hero RB builds, tier-based drafting, value vs ADP, WR volume in
the middle rounds, late-round QB/TE.

Launch it during your live draft, mark picks as they happen, and it tells you **who to take
and why** — e.g. *"Take Derrick Henry: only 2 RBs left in tier 2 with a 12-rank cliff after,
and from the turn he won't survive 22 picks. Sets up Nico Collins at 13 to start your WR stack."*

## Quick start

```bash
cd fantasy-draft-advisor
npm install
npm start
# open http://localhost:3000
```

1. Click **Use sample rankings** (or upload Ron's spreadsheet as CSV — see below).
2. Set teams (12), your slot (12), rounds → **Start Draft**.
3. As the draft happens, click **Gone** for other teams' picks, **Mine** for yours
   (or use the **Draft** button on a recommendation).
4. The recommendation panel updates instantly after every pick with scored suggestions
   and plain-English reasoning.

## Loading Ron's rankings

When you get Ron's Patreon spreadsheet, export it to CSV with these columns:

```csv
rank,player,pos,team,tier,adp,bye
1,Ja'Marr Chase,WR,CIN,1,1.2,10
```

- `tier` is the most important column — the whole methodology is tier-driven.
  If Ron's sheet has tiers, map them straight in.
- `adp` (Yahoo ADP ideally) powers the value/reach and "will he survive to my next
  pick" logic.
- The bundled `data/sample-rankings.csv` is a **placeholder** so the app works today —
  replace it with the real sheet.

## How the recommendations work

`public/engine.js` is a deterministic rules engine (no API calls — instant, works
offline during your draft) that scores every available player on:

1. **Board value** — where he sits vs the current pick and his ADP (falling = boost,
   reaching = penalty)
2. **Tier cliffs** — last 1–2 players in a positional tier with a big drop after → urgency
3. **Survival odds** — will he still be there at your next pick (snake math, big factor
   from the 12 slot where you wait ~22 picks between turns)
4. **Build fit** — Hero RB plan: elite RB anchor in R1–2 → fade the RB dead zone →
   WR volume R2–6 → RB darts R6+ → late QB/TE with the elite-faller escape hatch

Every principle lives in `knowledge/ron-stewart-methodology.md`. **That file is the brain** —
as you watch more of Ron's videos, refine it and both the engine and AI advisor get smarter.

## Optional: AI advisor

Set `ANTHROPIC_API_KEY` before `npm start` to enable the **🤖 Ask AI** button — it sends the
full draft state + the methodology file to Claude for a deeper, conversational recommendation
(who to take, backup option, and what it sets up at your next pick). The rules engine works
fine without it.

```bash
export ANTHROPIC_API_KEY=sk-ant-...
npm start
```

## Yahoo integration (Phase 2)

See `yahoo/README.md`. Scaffold is in `yahoo/yahooClient.js` — OAuth flow plus endpoints for
draft results and roster sync. One caveat: Yahoo's public API doesn't push live draft picks in
real time, so the plan is polling `draftresults` every ~10s with manual clicks as backup.

## Tests

```bash
npm test
```

## Roadmap

- [ ] Load Ron's real rankings spreadsheet (waiting on the sheet)
- [ ] Yahoo OAuth + draft-results polling to auto-track picks
- [ ] In-season mode: weekly start/sit + FAAB advice from Ron's weekly rankings
- [ ] Keeper/auction support
