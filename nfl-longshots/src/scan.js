// Pregame scan: pull depth charts + injury report + player props for the
// week's games, run the methodology, and output ranked longshot singles and
// 2-3 leg parlays. Run it Wed-Sun; injury reports firm up Fri/Sat.

import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { fmtOdds, mapLimit, normalizeName } from './util.js';
import { getTeams, getRoster, getDepthChart, getLeagueInjuries } from './sources/espn.js';
import { getEvents, getEventProps, usage } from './sources/oddsapi.js';
import { buildSituations, buildPlayerIndex } from './engine/elevation.js';
import { scoreCandidate, describeBet } from './engine/scoring.js';
import { buildParlays } from './engine/parlay.js';
import { notify } from './alerts.js';

export function loadKnowledge() {
  try {
    return JSON.parse(fs.readFileSync(path.join(config.dataDir, 'knowledge.json'), 'utf8'));
  } catch {
    return {};
  }
}

export async function gatherLeagueState() {
  const teams = await getTeams();
  console.log(`Loaded ${teams.length} teams; fetching rosters, depth charts, injuries...`);
  const [rosterList, depthList, injuries] = await Promise.all([
    mapLimit(teams, 6, (t) => getRoster(t.id)),
    mapLimit(teams, 6, (t) => getDepthChart(t.id).catch(() => ({}))),
    getLeagueInjuries(),
  ]);
  const rosters = {};
  const depthCharts = {};
  teams.forEach((t, i) => {
    rosters[t.id] = rosterList[i];
    depthCharts[t.id] = depthList[i];
  });
  const situations = buildSituations({ teams, rosters, depthCharts, injuries });
  return { teams, situations, playerIndex: buildPlayerIndex(situations) };
}

export async function runScan({ push = false } = {}) {
  if (!config.oddsApiKey) {
    throw new Error(
      'ODDS_API_KEY is not set. Copy .env.example to .env and add your key from https://the-odds-api.com'
    );
  }
  const knowledge = loadKnowledge();
  const { teams, situations, playerIndex } = await gatherLeagueState();
  const teamByName = new Map(teams.map((t) => [t.name, t]));

  const horizon = Date.now() + config.daysAhead * 24 * 3600 * 1000;
  const events = (await getEvents()).filter(
    (e) => new Date(e.commence_time).getTime() <= horizon
  );
  console.log(`Fetching player props for ${events.length} events (next ${config.daysAhead} days)...`);

  const candidates = [];
  for (const event of events) {
    let props;
    try {
      props = await getEventProps(event.id);
    } catch (e) {
      console.error(`  props failed for ${event.away_team} @ ${event.home_team}: ${e.message}`);
      continue;
    }
    const game = `${event.away_team} @ ${event.home_team}`;
    const gameTeams = [event.home_team, event.away_team];

    // Best price per player+market+line across books.
    const best = new Map();
    for (const o of props.offers) {
      const k = `${normalizeName(o.player)}|${o.market}|${o.point}`;
      if (!best.has(k) || o.price > best.get(k).price) best.set(k, o);
    }

    for (const offer of best.values()) {
      const key = normalizeName(offer.player);
      const hit = playerIndex.get(key);
      if (!hit || !gameTeams.includes(hit.teamName)) continue; // name collision or unmatched
      const teamEntry = teams.find((t) => t.name === hit.teamName);
      const oppName = gameTeams.find((n) => n !== hit.teamName);
      const oppEntry = teamByName.get(oppName);

      const { score, reasons } = scoreCandidate(offer, {
        player: hit.player,
        room: hit.room,
        pos: hit.pos,
        teamAbbrev: teamEntry?.abbrev,
        oppAbbrev: oppEntry?.abbrev,
        knowledge,
      });

      candidates.push({
        ...offer,
        playerKey: key,
        playerName: hit.player.name,
        position: hit.player.position,
        depthLabel: hit.player.depthLabel,
        team: teamEntry?.abbrev,
        opp: oppEntry?.abbrev,
        game,
        commence: event.commence_time,
        score,
        reasons,
      });
    }
  }

  const singles = candidates
    .filter(
      (c) =>
        c.price >= config.singleMinOdds &&
        c.price <= config.singleMaxOdds &&
        c.score >= config.minScore
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  const parlays = buildParlays(candidates);

  const result = {
    generatedAt: new Date().toISOString(),
    oddsApiCreditsRemaining: usage.remaining,
    singles: singles.map((c) => ({
      bet: describeBet(c),
      odds: fmtOdds(c.price),
      book: c.book,
      game: c.game,
      kickoff: c.commence,
      depth: c.depthLabel,
      score: c.score,
      reasons: c.reasons,
    })),
    parlays,
  };

  fs.mkdirSync(config.dataDir, { recursive: true });
  const dateTag = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(
    path.join(config.dataDir, `picks-${dateTag}.json`),
    JSON.stringify(result, null, 2)
  );
  fs.writeFileSync(path.join(config.dataDir, 'latest.json'), JSON.stringify(result, null, 2));

  printResult(result);

  if (push && result.singles.length) {
    const top = result.singles.slice(0, 3);
    await notify({
      title: `NFL longshots: ${result.singles.length} picks found`,
      message: top.map((s) => `${s.bet} ${s.odds} (${s.book}) — ${s.reasons[0] || ''}`).join('\n'),
      tags: ['football'],
    });
  }
  return result;
}

function printResult(result) {
  console.log('\n========== SINGLE-LEG LONGSHOTS ==========');
  if (!result.singles.length) console.log('None cleared the score threshold this week.');
  for (const s of result.singles) {
    console.log(`\n[${s.score}] ${s.bet}  ${s.odds}  @ ${s.book}`);
    console.log(`     ${s.game} (${s.depth})`);
    for (const r of s.reasons) console.log(`     - ${r}`);
  }
  console.log('\n========== 2-3 LEG PARLAYS ==========');
  if (!result.parlays.length) console.log('No qualifying parlays.');
  for (const p of result.parlays) {
    console.log(
      `\n[${p.totalScore}] Combined ${p.combinedLabel}${p.sameGame ? '  (same-game: book will reprice!)' : ''}`
    );
    for (const l of p.legs) console.log(`     ${l.bet}  ${fmtOdds(l.price)} @ ${l.book}  (${l.game})`);
  }
  if (result.oddsApiCreditsRemaining != null) {
    console.log(`\nOdds API credits remaining: ${result.oddsApiCreditsRemaining}`);
  }
}
