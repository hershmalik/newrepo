// Turns depth charts + the injury report into "who is elevated" facts.
// This is the heart of the methodology: when starters above a player are
// out, the backup inherits snaps while his props are still priced like a
// backup — the 2024 Texans-WR situation the strategy is modeled on.

import { normalizeName } from '../util.js';

// How many players in the room are true "starters" (WR uses the 3WR set).
const STARTER_COUNT = { qb: 1, rb: 1, wr: 3, te: 1, fb: 1 };

const POS_LABEL = { qb: 'QB', rb: 'RB', wr: 'WR', te: 'TE', fb: 'FB' };

// Probability a player misses the game given his report status.
export function unavailability(status) {
  const s = (status || '').toLowerCase();
  if (
    s.includes('injured reserve') ||
    s === 'out' ||
    s.includes('physically unable') ||
    s.includes('non football') ||
    s.includes('suspen')
  )
    return 1;
  if (s.includes('doubtful')) return 0.85;
  if (s.includes('questionable')) return 0.4;
  return 0; // Active / Probable / day-to-day chatter
}

// Build per-team, per-position "rooms" with injury status attached, and
// compute each healthy player's elevation (expected # of players above him
// who won't play).
//
// teams: [{id, abbrev, name}], rosters: {teamId: {athleteId: player}},
// depthCharts: {teamId: {pos: [{rank, athleteId}]}},
// injuries: output of getLeagueInjuries()
export function buildSituations({ teams, rosters, depthCharts, injuries }) {
  const injuryByAthlete = new Map();
  for (const t of injuries) {
    for (const i of t.injuries) {
      if (i.athleteId) injuryByAthlete.set(String(i.athleteId), i);
    }
  }

  const situations = {};
  for (const team of teams) {
    const roster = rosters[team.id] || {};
    const depth = depthCharts[team.id] || {};
    const rooms = {};

    for (const [pos, slots] of Object.entries(depth)) {
      const room = slots
        .map((slot) => {
          const p = roster[slot.athleteId];
          if (!p) return null;
          // Practice-squad players can't play without a call-up; keep them
          // out of the room entirely (depth charts sometimes still list them).
          if (p.rosterStatus === 'Practice Squad') return null;
          const inj = injuryByAthlete.get(String(slot.athleteId));
          // Not on the active 53 (cut, IR-designated, in limbo) => he won't
          // play, whatever the injury report says — and everyone below him
          // is genuinely elevated.
          const offActiveRoster = p.rosterStatus && p.rosterStatus !== 'Active';
          const injMiss = inj ? unavailability(inj.status) : 0;
          return {
            athleteId: slot.athleteId,
            rank: slot.rank,
            name: p.name,
            nameKey: normalizeName(p.name),
            position: POS_LABEL[pos] || p.position,
            experienceYears: p.experienceYears,
            status: offActiveRoster ? `Not on active roster (${p.rosterStatus})` : inj?.status || 'Active',
            injuryComment: inj?.comment || '',
            missProb: offActiveRoster ? 1 : injMiss,
          };
        })
        .filter(Boolean);

      const starters = STARTER_COUNT[pos] ?? 1;
      // Expected number of unavailable players among the normal contributors
      // (starters + first backup tier).
      const contributorPool = room.filter((p) => p.rank <= starters + 2);
      const roomInjuryLoad = contributorPool.reduce((s, p) => s + p.missProb, 0);

      for (const player of room) {
        const above = room.filter((p) => p.rank < player.rank);
        player.elevation = above.reduce((s, p) => s + p.missProb, 0);
        player.isStarter = player.rank <= starters;
        player.depthLabel = `${player.position}${player.rank}`;
      }
      rooms[pos] = { players: room, starters, roomInjuryLoad };
    }

    situations[team.id] = { team, rooms };
  }
  return situations;
}

// Flat index: normalized player name -> {teamId, player, room} for prop matching.
export function buildPlayerIndex(situations) {
  const index = new Map();
  for (const [teamId, sit] of Object.entries(situations)) {
    for (const [pos, room] of Object.entries(sit.rooms)) {
      for (const player of room.players) {
        index.set(player.nameKey, { teamId, teamName: sit.team.name, pos, player, room });
      }
    }
  }
  return index;
}

// Given a downed player, who steps in? Next non-injured players in the room.
export function nextMenUp(room, downedPlayer, count = 2) {
  return room.players
    .filter((p) => p.rank > downedPlayer.rank && p.missProb < 0.5)
    .slice(0, count);
}
