// ESPN public (unauthenticated) NFL API client.
// Endpoints verified 2026-07: teams, rosters, depth charts, league injuries,
// scoreboard, and per-game summaries all work without a key.

import fs from 'node:fs';
import path from 'node:path';
import { fetchJson } from '../util.js';
import { config } from '../config.js';

const SITE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
const CORE = 'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl';

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // rosters/depth charts change slowly

function cachePath(key) {
  return path.join(config.cacheDir, `${key}.json`);
}

async function cached(key, fn) {
  const p = cachePath(key);
  try {
    const stat = fs.statSync(p);
    if (Date.now() - stat.mtimeMs < CACHE_TTL_MS) {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    }
  } catch {
    /* cache miss */
  }
  const data = await fn();
  fs.mkdirSync(config.cacheDir, { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data));
  return data;
}

export async function getTeams() {
  return cached('teams', async () => {
    const { json } = await fetchJson(`${SITE}/teams?limit=32`);
    return json.sports[0].leagues[0].teams.map(({ team }) => ({
      id: team.id,
      abbrev: team.abbreviation,
      name: team.displayName, // matches The Odds API's home_team/away_team strings
    }));
  });
}

// Map of athleteId -> {id, name, position, experienceYears}
export async function getRoster(teamId) {
  return cached(`roster-${teamId}`, async () => {
    const { json } = await fetchJson(`${SITE}/teams/${teamId}/roster`);
    const players = {};
    for (const group of json.athletes || []) {
      for (const a of group.items || []) {
        players[a.id] = {
          id: a.id,
          name: a.displayName,
          position: a.position?.abbreviation || '',
          experienceYears: a.experience?.years ?? null,
          // 'Active' = on the 53. Anything else (Practice Squad, Day-To-Day,
          // IR limbo, recently waived) means he's not suiting up — ESPN keeps
          // cut players on this feed for a while, so this field is load-bearing.
          rosterStatus: a.status?.name || 'Active',
        };
      }
    }
    return players;
  });
}

const SKILL_SLUGS = ['qb', 'rb', 'wr', 'te', 'fb'];

// Offensive depth chart: {qb: [athleteId...], rb: [...], wr: [...], te: [...]}
// ordered by depth rank. WR rank 1-3 are the three starters in a 3WR set.
export async function getDepthChart(teamId) {
  return cached(`depth-${config.seasonYear}-${teamId}`, async () => {
    let json;
    try {
      ({ json } = await fetchJson(
        `${CORE}/seasons/${config.seasonYear}/teams/${teamId}/depthcharts`
      ));
    } catch (e) {
      // Preseason: current-season chart may not exist yet; fall back a year.
      ({ json } = await fetchJson(
        `${CORE}/seasons/${config.seasonYear - 1}/teams/${teamId}/depthcharts`
      ));
    }
    const out = {};
    for (const item of json.items || []) {
      const positions = item.positions || {};
      if (!positions.qb) continue; // only the offensive formation has a QB
      for (const slug of SKILL_SLUGS) {
        const pos = positions[slug];
        if (!pos) continue;
        const athletes = [...(pos.athletes || [])].sort((a, b) => a.rank - b.rank);
        out[slug] = athletes
          .map((a) => {
            const m = /athletes\/(\d+)/.exec(a.athlete?.$ref || '');
            return m ? { rank: a.rank, athleteId: m[1] } : null;
          })
          .filter(Boolean);
      }
    }
    return out;
  });
}

// League-wide injury report: [{teamId, teamName, injuries: [{athleteId, name, status, comment, date}]}]
export async function getLeagueInjuries() {
  const { json } = await fetchJson(`${SITE}/injuries`);
  return (json.injuries || []).map((t) => ({
    teamId: t.id,
    teamName: t.displayName,
    injuries: (t.injuries || []).map((i) => {
      const href = i.athlete?.links?.find((l) => l.rel?.includes('playercard'))?.href || '';
      const m = /id\/(\d+)/.exec(href);
      return {
        athleteId: m ? m[1] : null,
        name: i.athlete?.displayName || '',
        status: i.status || '',
        comment: i.shortComment || '',
        date: i.date || '',
      };
    }),
  }));
}

export async function getScoreboard() {
  const { json } = await fetchJson(`${SITE}/scoreboard`);
  return (json.events || []).map((e) => {
    const comp = e.competitions?.[0];
    const home = comp?.competitors?.find((c) => c.homeAway === 'home');
    const away = comp?.competitors?.find((c) => c.homeAway === 'away');
    return {
      id: e.id,
      name: e.name,
      date: e.date,
      state: e.status?.type?.state, // 'pre' | 'in' | 'post'
      detail: e.status?.type?.shortDetail,
      homeTeam: home?.team?.displayName,
      awayTeam: away?.team?.displayName,
      homeTeamId: home?.team?.id,
      awayTeamId: away?.team?.id,
    };
  });
}

export async function getGameSummary(eventId) {
  const { json } = await fetchJson(`${SITE}/summary?event=${eventId}`);
  return json;
}
