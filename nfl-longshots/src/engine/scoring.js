// The methodology, as a scoring model. Each candidate prop gets points for
// every edge signal and a human-readable reason for each. Weights are plain
// numbers on purpose — tune them as you learn what hits.

import { config } from '../config.js';

const TD_MARKETS = new Set(['player_anytime_td', 'player_1st_td', 'player_tds_over']);

export const MARKET_LABELS = {
  player_anytime_td: 'Anytime TD',
  player_1st_td: 'First TD',
  player_tds_over: 'TDs Over', // point 1.5 => the classic "2+ TD" longshot
  player_reception_yds_alternate: 'Alt Rec Yds',
  player_rush_yds_alternate: 'Alt Rush Yds',
};

export function describeBet(c) {
  const label = MARKET_LABELS[c.market] || c.market;
  const pt = c.point != null ? ` ${c.point}+`.replace('.5+', '.5') : '';
  if (c.market === 'player_tds_over') return `${c.player} ${Math.ceil(c.point)}+ TDs`;
  if (c.market === 'player_reception_yds_alternate') return `${c.player} ${c.point}+ rec yds`;
  if (c.market === 'player_rush_yds_alternate') return `${c.player} ${c.point}+ rush yds`;
  return `${c.player} ${label}${pt}`;
}

/**
 * Score one candidate prop offer.
 * @param offer  {market, player, point, price, book}
 * @param ctx    {player (room entry), room, pos, teamAbbrev, oppAbbrev, knowledge}
 * @returns {score, reasons[]}
 */
export function scoreCandidate(offer, ctx) {
  const { player, room, pos, teamAbbrev, oppAbbrev, knowledge } = ctx;
  const reasons = [];
  let score = 0;

  // ---- 1. Injury elevation (the core signal) ----
  const fullOuts = room.players.filter((p) => p.rank < player.rank && p.missProb >= 0.85);
  const shaky = room.players.filter(
    (p) => p.rank < player.rank && p.missProb > 0 && p.missProb < 0.85
  );
  if (fullOuts.length > 0) {
    score += 45 * Math.min(fullOuts.length, 2);
    reasons.push(
      `Elevated: ${fullOuts.map((p) => `${p.name} (${p.status})`).join(', ')} out above him`
    );
  }
  if (shaky.length > 0) {
    score += 15 * shaky.length;
    reasons.push(`${shaky.map((p) => `${p.name} (${p.status})`).join(', ')} shaky above him`);
  }
  if (room.roomInjuryLoad >= 2) {
    score += 20;
    reasons.push(`Decimated ${player.position} room (injury load ${room.roomInjuryLoad.toFixed(1)})`);
  }

  // A starter with nobody hurt above him isn't what this strategy bets on,
  // but a healthy starter vs a weak defense can still anchor a parlay leg.
  if (fullOuts.length === 0 && shaky.length === 0 && !player.isStarter) {
    reasons.push('Deep backup with no elevation — needs an in-game injury to matter');
  }

  // Injuries only elevate the next men up. A player still sitting behind a
  // full lineup of healthy teammates isn't getting snaps no matter how many
  // guys further up the chart are hurt.
  const healthyAbove = room.players.filter(
    (p) => p.rank < player.rank && p.missProb < 0.4
  ).length;
  if (healthyAbove >= room.starters + 1) {
    score -= 40;
    reasons.push(`Still buried: ${healthyAbove} healthy players ahead of him`);
  }

  // Don't bet a guy who is himself banged up.
  if (player.missProb >= 0.4) {
    score -= 60;
    reasons.push(`He is ${player.status} himself`);
  }

  // ---- 2. Matchup overlays (from data/knowledge.json, editable weekly) ----
  const isPassCatcher = ['WR', 'TE'].includes(player.position);
  if (knowledge.weakPassDefenses?.includes(oppAbbrev) && (isPassCatcher || player.position === 'QB')) {
    score += 15;
    reasons.push(`${oppAbbrev} is a weak pass defense`);
  }
  if (knowledge.weakRunDefenses?.includes(oppAbbrev) && ['RB', 'FB', 'QB'].includes(player.position)) {
    score += 15;
    reasons.push(`${oppAbbrev} is a weak run defense`);
  }
  if (knowledge.strongDefenses?.includes(oppAbbrev)) {
    score -= 15;
    reasons.push(`${oppAbbrev} is a strong defense — tough spot`);
  }

  // ---- 3. Football-knowledge heuristics ----
  const isTdMarket = TD_MARKETS.has(offer.market);

  // Rookie TEs historically almost never produce; fade their TD props.
  if (
    knowledge.fadeRookieTEs !== false &&
    player.position === 'TE' &&
    player.experienceYears === 0 &&
    isTdMarket
  ) {
    score -= 20;
    reasons.push('Rookie TE — historically a dead zone for TDs');
  }

  // Veteran backup TE stepping into a starter role is a classic cheap-TD spot.
  if (
    player.position === 'TE' &&
    (player.experienceYears ?? 0) >= 2 &&
    fullOuts.length > 0 &&
    isTdMarket
  ) {
    score += 10;
    reasons.push('Veteran backup TE stepping into starter snaps');
  }

  // Goal-line usage: if the team hands it to a dedicated goal-line back,
  // TD props for everyone else in that backfield get harder.
  const glBack = knowledge.goalLineBacks?.[teamAbbrev];
  if (glBack && isTdMarket) {
    const isGlBack = glBack.toLowerCase() === player.name.toLowerCase();
    if (isGlBack) {
      score += 20;
      reasons.push('He IS the goal-line back');
    } else if (player.position === 'RB') {
      score -= 15;
      reasons.push(`${glBack} takes the goal-line carries`);
    } else if (isPassCatcher) {
      score -= 5;
      reasons.push(`Team runs it at the goal line (${glBack})`);
    }
  }

  // The signature bet: elevated backup at 2+ TDs.
  if (offer.market === 'player_tds_over' && (offer.point ?? 0) >= 1.5 && fullOuts.length > 0) {
    score += 10;
    reasons.push('Signature play: elevated backup 2+ TDs');
  }

  // ---- 4. Odds-band fit ----
  const t = config.targetOdds;
  if (offer.price >= t * 0.5 && offer.price <= t * 2.5) {
    score += 10;
    reasons.push(`Price ${offer.price >= 0 ? '+' : ''}${offer.price} is in the target band`);
  }

  return { score, reasons };
}
