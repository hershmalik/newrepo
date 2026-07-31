// Build 2-3 leg parlays from moderately-priced legs (+200 to +2500 each)
// that combine into the +5,000 to +30,000 window. Few legs, high odds each —
// per the strategy, avoid long chains of short-priced legs.

import { combineAmerican, fmtOdds } from '../util.js';
import { config } from '../config.js';
import { describeBet } from './scoring.js';

const MAX_POOL = 24; // cap the combinatorics to the best-scored legs

export function buildParlays(candidates) {
  const pool = candidates
    .filter((c) => c.price >= config.legMinOdds && c.price <= config.legMaxOdds && c.score >= 20)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_POOL);

  const parlays = [];
  const seen = new Set();

  const consider = (legs) => {
    const players = new Set(legs.map((l) => l.playerKey));
    if (players.size !== legs.length) return; // same player twice
    const key = legs
      .map((l) => `${l.playerKey}|${l.market}|${l.point}`)
      .sort()
      .join('~');
    if (seen.has(key)) return;
    seen.add(key);

    const combined = combineAmerican(legs.map((l) => l.price));
    if (combined < config.parlayMinOdds || combined > config.parlayMaxOdds) return;

    const games = new Set(legs.map((l) => l.eventId));
    parlays.push({
      legs: legs.map((l) => ({
        bet: describeBet(l),
        price: l.price,
        book: l.book,
        game: l.game,
        score: l.score,
        reasons: l.reasons,
      })),
      combinedOdds: combined,
      combinedLabel: fmtOdds(combined),
      totalScore: legs.reduce((s, l) => s + l.score, 0) + (games.size === legs.length ? 10 : 0),
      sameGame: games.size < legs.length,
    });
  };

  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      consider([pool[i], pool[j]]);
      if (config.maxParlayLegs >= 3) {
        for (let k = j + 1; k < pool.length; k++) {
          consider([pool[i], pool[j], pool[k]]);
        }
      }
    }
  }

  return parlays.sort((a, b) => b.totalScore - a.totalScore).slice(0, 12);
}
