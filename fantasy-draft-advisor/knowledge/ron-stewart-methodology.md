# Ron Stewart Draft Methodology — Knowledge Base

> This file is the "brain" of the advisor. It was compiled from Ron Stewart's public
> YouTube content (youtube.com/@ronstewart_) and podcast episodes. **Refine it over time:**
> every time you watch one of his videos, add or correct principles here. Both the
> rules engine and the AI advisor draw from these principles.

## Who is Ron Stewart

Fantasy football analyst on YouTube (@ronstewart_) and the "Ron Stewart on YouTube"
podcast. Publishes draft rankings (via Patreon spreadsheet), weekly in-season rankings,
and draft strategy videos. Known for advocating the **Hero RB** build — the strategy
he credits with winning leagues in recent seasons.

## Core Draft Philosophy

### 1. Hero RB (Anchor RB) — the signature build
- Land **one elite bell-cow RB** with one of your first two picks — a true three-down
  workhorse (the Derrick Henry / Bijan / Saquon tier, depending on the year).
- Then **fade RB almost entirely until roughly rounds 6–8**, exploiting the depth at
  WR and TE in the early-middle rounds.
- Why it works: RB scoring drops off a cliff after the elite tier, while WR value
  stays dense through round 6. You get the scarce asset AND the deep ones.
- The example build: *"Take Derrick Henry and Nico Collins — RB dropoff is steep after
  Henry, and Nico is great value that lets you stack WRs after."*

### 2. Tiers over ranks
- Rankings are grouped into **tiers**. The decision is never "who is ranked higher"
  but "which tier is about to run out."
- **Tier cliff urgency**: if a player is one of the last 1–2 left in his positional
  tier and the drop to the next tier is large, take him now — the position craters
  before your next pick.
- If several players from the same tier remain, you can wait and fill another need —
  one of them will come back to you.

### 3. Value vs ADP
- A player falling meaningfully past his ADP is a signal, not a trap (absent news).
- Don't reach multiple rounds early for "your guy" — he'll usually be there later,
  and if not, the tier has replacements.

### 4. Win the flex / WR volume in the middle rounds
- Rounds 2–6 are where you stack WRs. WR is the deepest, most predictable position;
  volume of good WRs wins the flex spot week to week.
- Target high-target-share, locked-in-role receivers over speculative upside in
  these rounds.

### 5. Late-round QB and TE (with an escape hatch)
- Do **not** spend early picks on QB or TE in 1QB leagues.
- Escape hatch: if a true top-3 positional difference-maker (elite TE tier, or a
  rushing-QB tier-breaker) falls well past ADP into the middle rounds, that's value —
  take it.
- Otherwise wait: QB in rounds 9+, TE from the value tiers.

### 6. RB2 timing and the RB dead zone
- The RB "dead zone" (roughly rounds 3–6) is where fragile, committee, or
  game-script-dependent RBs get overdrafted. Hero RB deliberately skips it.
- Attack RB again in rounds 6–10: high-upside handcuffs, pass-catching backs,
  ambiguous-backfield lottery tickets. Quantity of live-round RB darts > one dead-zone RB.

### 7. Roster construction targets (12-team, 1QB, PPR/half-PPR)
- After ~8 rounds a Hero RB team should look like: 1 elite RB, 4–5 WRs, maybe 1 TE,
  1–2 upside RBs. QB late.
- Draft for weekly ceiling in the flex; draft for floor at RB1 and WR1/2.

### 8. Draft-slot notes (late picks, e.g. 12th in a 12-teamer)
- At the turn (picks 12+13) you pick back-to-back: plan the *pair*, not one pick.
- Classic Hero RB turn: elite-tier RB + best falling WR (or two WRs if the RB tier
  is already gone — then pivot to Zero RB and hammer the round 6–10 RB darts).
- Between turns ~22 picks elapse: assume any player near his ADP window will be gone.
  Tier cliffs matter twice as much from the turn.

## In-Season Principles (for later phases)
- Weekly rankings and Rest-of-Season rankings drive start/sit — matchup + role trumps name value.
- FAAB: spend aggressively on ascending-role RBs (bell-cow openings), be patient on WRs.

## How the engine should reason (summary for the model)
When recommending a pick, always explain in terms of: (a) tier scarcity — how many
players remain in the tier and what's lost if you wait, (b) value vs ADP, (c) build
fit — where this pick fits in the Hero RB / WR-volume plan and what it sets up for
the next pick, especially at the turn.
