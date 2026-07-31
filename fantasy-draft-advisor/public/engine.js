/*
 * Draft engine — encodes the Ron Stewart methodology (see knowledge/ron-stewart-methodology.md)
 * as a deterministic scoring model so it works instantly during a live draft, no API needed.
 *
 * Player shape: { rank, player, pos, team, tier, adp, bye }
 * State shape:  { teams, myslot, currentOverall, myRoster: [players], drafted: Set(names), strategy }
 */

const Engine = (() => {
  const FLEX_POS = ["RB", "WR", "TE"];

  // ---- snake draft math ----------------------------------------------------

  function pickOwner(overall, teams) {
    const round = Math.ceil(overall / teams);
    const idx = (overall - 1) % teams;
    return round % 2 === 1 ? idx + 1 : teams - idx;
  }

  function myPicks(teams, mySlot, rounds = 16) {
    const picks = [];
    for (let o = 1; o <= teams * rounds; o++) {
      if (pickOwner(o, teams) === mySlot) picks.push(o);
    }
    return picks;
  }

  function nextMyPick(currentOverall, teams, mySlot) {
    return myPicks(teams, mySlot).find((p) => p >= currentOverall) ?? currentOverall;
  }

  function followingMyPick(currentOverall, teams, mySlot) {
    const mine = myPicks(teams, mySlot).filter((p) => p >= currentOverall);
    return mine[1] ?? mine[0] ?? currentOverall;
  }

  // ---- roster analysis -------------------------------------------------------

  function rosterCounts(roster) {
    const c = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0 };
    for (const p of roster) c[p.pos] = (c[p.pos] || 0) + 1;
    return c;
  }

  function hasEliteRB(roster) {
    return roster.some((p) => p.pos === "RB" && p.tier <= 2);
  }

  // ---- probability a player survives until my next pick ----------------------

  function survivalChance(player, picksUntilNext) {
    const cushion = (player.adp ?? player.rank) - (player.currentOverall ?? 0);
    // How far past current pick his ADP sits vs how many picks elapse before I'm up again.
    const margin = cushion - picksUntilNext;
    if (margin > 12) return 0.95;
    if (margin > 6) return 0.75;
    if (margin > 0) return 0.5;
    if (margin > -6) return 0.25;
    return 0.08;
  }

  // ---- tier scarcity ----------------------------------------------------------

  function tierInfo(player, available) {
    const sameTier = available.filter((p) => p.pos === player.pos && p.tier === player.tier);
    const nextTier = available.filter((p) => p.pos === player.pos && p.tier === player.tier + 1);
    const worstInTier = Math.max(...sameTier.map((p) => p.rank));
    const bestNextTier = nextTier.length ? Math.min(...nextTier.map((p) => p.rank)) : worstInTier + 25;
    return {
      leftInTier: sameTier.length,
      cliffSize: bestNextTier - worstInTier, // rank gap down to next tier
    };
  }

  // ---- positional need under the Hero RB plan ---------------------------------

  function needMultiplier(player, state, round) {
    const counts = rosterCounts(state.myRoster);
    const elite = hasEliteRB(state.myRoster);
    const pos = player.pos;
    let m = 1.0;
    const reasons = [];

    if (pos === "RB") {
      if (!elite && round <= 2 && player.tier <= 2) {
        m = 1.35;
        reasons.push("Hero RB anchor window: lock in the elite bell-cow before the tier cliff");
      } else if (elite && round >= 3 && round <= 5 && player.tier >= 3 && player.tier <= 5) {
        m = 0.6; // RB dead zone — Hero RB fades RB here
        reasons.push("RB dead zone (R3–5): Hero RB plan says fade RB here and stack WRs");
      } else if (elite && round >= 6) {
        m = counts.RB <= 2 ? 1.15 : 1.0;
        if (counts.RB <= 2) reasons.push("RB dart-throw window (R6+): time to add upside RB2/RB3 pieces");
      } else if (!elite && round >= 3) {
        m = counts.RB === 0 ? 1.05 : 0.95;
        if (counts.RB === 0) reasons.push("No anchor RB landed — pivoting toward Zero RB: only take RB on clear value");
      }
    }

    if (pos === "WR") {
      if (round >= 2 && round <= 6) {
        m = 1.2;
        reasons.push("WR volume window (R2–6): win the flex by stacking locked-in-target receivers");
      }
      if (counts.WR >= 5 && round <= 8) m *= 0.85;
    }

    if (pos === "QB") {
      if (round <= 6 && !(player.tier === 1 && (player.adp ?? player.rank) < state.currentOverall - 8)) {
        m = 0.35;
        reasons.push("Late-round QB: don't spend a premium pick here");
      } else if (player.tier === 1 && (player.adp ?? player.rank) < state.currentOverall - 8) {
        m = 1.05;
        reasons.push("Tier-1 QB falling well past ADP — the escape-hatch exception to late-round QB");
      } else if (counts.QB >= 1) {
        m = 0.15;
      } else if (round >= 9) {
        m = 1.0;
      } else {
        m = 0.55;
      }
    }

    if (pos === "TE") {
      if (player.tier === 1 && (player.adp ?? player.rank) <= state.currentOverall + 3 && counts.TE === 0) {
        m = 1.1;
        reasons.push("Elite TE at/past value — a positional difference-maker is the exception to waiting");
      } else if (counts.TE >= 1) {
        m = 0.2;
      } else if (round <= 5) {
        m = 0.6;
        reasons.push("TE can wait unless an elite one falls");
      }
    }

    return { m, reasons };
  }

  // ---- main recommendation ------------------------------------------------------

  function recommend(rankings, state, topN = 6) {
    const available = rankings.filter((p) => !state.drafted.has(p.player));
    const round = Math.ceil(state.currentOverall / state.teams);
    const next = nextMyPick(state.currentOverall + 1, state.teams, state.mySlot);
    const picksUntilNext = next - state.currentOverall;
    const atTheTurn = picksUntilNext <= 2 || (state.mySlot === state.teams || state.mySlot === 1);

    const pool = available.slice(0, 35);

    const scored = pool.map((p) => {
      const reasons = [];
      const adp = p.adp ?? p.rank;

      // 1. Base value: board position vs where we're picking (falling players score up).
      const valueDelta = state.currentOverall - adp; // positive = falling past ADP
      let score = 100 - p.rank * 0.9;
      if (valueDelta >= 8) {
        score += 10;
        reasons.push(`Big value: falling ~${Math.round(valueDelta)} picks past ADP (${adp})`);
      } else if (valueDelta >= 3) {
        score += 5;
        reasons.push(`Value: available ${Math.round(valueDelta)} picks past ADP`);
      } else if (valueDelta <= -10) {
        score -= 12;
        reasons.push(`Reach alert: ~${Math.round(-valueDelta)} picks ahead of ADP — he likely comes back later`);
      }

      // 2. Tier cliff urgency.
      const t = tierInfo(p, available);
      if (t.leftInTier <= 2 && t.cliffSize >= 6) {
        score += 9;
        reasons.push(
          `Tier cliff: only ${t.leftInTier} ${p.pos}${t.leftInTier > 1 ? "s" : ""} left in tier ${p.tier}, then a ~${t.cliffSize}-rank dropoff`
        );
      } else if (t.leftInTier >= 4) {
        score -= 3;
        reasons.push(`${t.leftInTier} ${p.pos}s still in this tier — one likely comes back to you`);
      }

      // 3. Will he survive until my next pick?
      const surv = survivalChance({ ...p, currentOverall: state.currentOverall }, picksUntilNext);
      if (surv <= 0.25) {
        score += 6;
        reasons.push(`Won't survive the ${picksUntilNext}-pick wait to your next turn — now or never`);
      } else if (surv >= 0.75) {
        score -= 5;
        reasons.push(`~${Math.round(surv * 100)}% chance he's still there at pick ${next} — you can wait`);
      }

      // 4. Build fit under the Hero RB plan.
      const need = needMultiplier(p, state, round);
      score *= need.m;
      reasons.push(...need.reasons);

      // 5. Turn-pick planning: from the turn, think in pairs.
      if (atTheTurn && round <= 4) {
        reasons.push("Turn pick: plan this pick and the next as a pair (e.g. elite RB + falling WR)");
      }

      return { ...p, score: Math.round(score * 10) / 10, reasons, survival: surv };
    });

    scored.sort((a, b) => b.score - a.score);
    return {
      round,
      currentOverall: state.currentOverall,
      nextPick: next,
      picksUntilNext,
      recommendations: scored.slice(0, topN),
    };
  }

  return { recommend, myPicks, nextMyPick, followingMyPick, pickOwner, rosterCounts };
})();

if (typeof module !== "undefined") module.exports = Engine;
