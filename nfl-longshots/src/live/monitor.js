// Live mode: poll ESPN during games, detect a skill player going down, and
// immediately push the elevated backup's current prop prices to your phone —
// the window where you can beat the book's repricing is minutes at best,
// so the alert contains everything needed to tap the bet in.

import { config } from '../config.js';
import { fmtOdds, normalizeName, sleep } from '../util.js';
import { getScoreboard, getGameSummary } from '../sources/espn.js';
import { getEvents, getEventProps } from '../sources/oddsapi.js';
import { nextMenUp } from '../engine/elevation.js';
import { gatherLeagueState } from '../scan.js';
import { notify } from '../alerts.js';

const SKILL_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE', 'FB']);
const INJURY_PLAY_RE = /(injur|shaken up|helped off|carted off|carted to|medical tent|locker room|down on the (field|play))/i;

export async function runLiveMonitor() {
  console.log('Live monitor starting. Building league state (depth charts, rosters)...');
  const { teams, situations } = await gatherLeagueState();
  const teamByName = new Map(teams.map((t) => [t.name, t]));

  // Roster name lookup per ESPN team id, for matching names inside play text.
  const rosterIndex = new Map(); // teamId -> [{nameKey, player, room}]
  for (const [teamId, sit] of Object.entries(situations)) {
    const list = [];
    for (const room of Object.values(sit.rooms)) {
      for (const p of room.players) list.push({ nameKey: p.nameKey, player: p, room });
    }
    rosterIndex.set(String(teamId), list);
  }

  const alerted = new Set(); // `${eventId}|${athleteId}` — one alert per player per game
  const knownInjuryIds = new Set(); // in-game injury entries already seen
  let oddsEvents = [];
  let oddsEventsFetchedAt = 0;
  let firstPass = true;

  await notify({
    title: 'Live monitor armed',
    message: 'Watching NFL games for in-game injuries to skill players.',
    tags: ['satellite'],
  });

  for (;;) {
    try {
      const scoreboard = await getScoreboard();
      const liveGames = scoreboard.filter((g) => g.state === 'in');
      if (!liveGames.length) {
        console.log(`${new Date().toLocaleTimeString()} — no live games.`);
        await sleep(config.scoreboardPollSeconds * 1000);
        firstPass = true; // re-baseline when the next slate starts
        continue;
      }

      // Refresh the Odds API event list hourly (cheap: 1 credit).
      if (config.oddsApiKey && Date.now() - oddsEventsFetchedAt > 3600 * 1000) {
        try {
          oddsEvents = await getEvents();
          oddsEventsFetchedAt = Date.now();
        } catch (e) {
          console.error(`Odds API events fetch failed: ${e.message}`);
        }
      }

      for (const game of liveGames) {
        await checkGame(game);
      }
      // On the first pass over a live slate, existing injuries are baseline —
      // only NEW ones after that trigger alerts.
      firstPass = false;
      await sleep(config.livePollSeconds * 1000);
    } catch (e) {
      console.error(`monitor loop error: ${e.message}`);
      await sleep(config.livePollSeconds * 1000);
    }
  }

  async function checkGame(game) {
    let summary;
    try {
      summary = await getGameSummary(game.id);
    } catch (e) {
      console.error(`summary failed for ${game.name}: ${e.message}`);
      return;
    }

    const hits = []; // {teamId, athlete: {nameKey, player, room}, source}

    // Signal 1: ESPN's in-game injury designations (Out / Questionable to return).
    for (const teamInj of summary.injuries || []) {
      const teamId = String(teamInj.team?.id || '');
      for (const inj of teamInj.injuries || []) {
        const injId = `${game.id}|inj|${inj.athlete?.id || inj.athlete?.displayName}|${inj.status}`;
        if (knownInjuryIds.has(injId)) continue;
        knownInjuryIds.add(injId);
        if (firstPass) continue; // pregame/known injuries, not breaking news
        const match = findOnRoster(teamId, inj.athlete?.displayName);
        if (match) hits.push({ teamId, ...match, source: `designated ${inj.status}` });
      }
    }

    // Signal 2: play-by-play text mentioning an injury.
    const drives = [
      ...(summary.drives?.previous?.slice(-3) || []),
      ...(summary.drives?.current ? [summary.drives.current] : []),
    ];
    for (const drive of drives) {
      for (const play of drive.plays || []) {
        if (!INJURY_PLAY_RE.test(play.text || '')) continue;
        const playId = `${game.id}|play|${play.id}`;
        if (knownInjuryIds.has(playId)) continue;
        knownInjuryIds.add(playId);
        if (firstPass) continue;
        for (const teamId of [game.homeTeamId, game.awayTeamId]) {
          for (const entry of rosterIndex.get(String(teamId)) || []) {
            if (playTextNamesPlayer(play.text, entry.player.name)) {
              hits.push({ teamId: String(teamId), ...entry, source: `play-by-play: "${play.text.slice(0, 120)}"` });
            }
          }
        }
      }
    }

    for (const hit of hits) {
      if (!SKILL_POSITIONS.has(hit.player.position)) continue;
      const dedupeKey = `${game.id}|${hit.player.athleteId}`;
      if (alerted.has(dedupeKey)) continue;
      alerted.add(dedupeKey);
      await alertBackupProps(game, hit);
    }
  }

  function findOnRoster(teamId, displayName) {
    if (!displayName) return null;
    const key = normalizeName(displayName);
    return (rosterIndex.get(String(teamId)) || []).find((e) => e.nameKey === key) || null;
  }

  function playTextNamesPlayer(text, playerName) {
    // ESPN play text uses "F.Lastname" style; match on last name + first initial.
    const parts = normalizeName(playerName).split(' ');
    if (parts.length < 2) return false;
    const last = parts[parts.length - 1];
    const initial = parts[0][0];
    const re = new RegExp(`\\b${initial}\\.?\\s*${last}\\b`, 'i');
    return re.test(text) || new RegExp(`\\b${playerName}\\b`, 'i').test(text);
  }

  async function alertBackupProps(game, hit) {
    const down = hit.player;
    const backups = nextMenUp(hit.room, down, 2);
    const lines = [
      `${down.name} (${down.depthLabel}, ${teamName(hit.teamId)}) — ${hit.source}`,
      backups.length
        ? `Next men up: ${backups.map((b) => `${b.name} (${b.depthLabel})`).join(', ')}`
        : 'No clear backup on the depth chart.',
    ];

    // Pull current prop prices for the backups before the book adjusts.
    if (config.oddsApiKey && backups.length) {
      const oddsEvent = matchOddsEvent(game);
      if (oddsEvent) {
        try {
          const props = await getEventProps(oddsEvent.id, [
            'player_anytime_td',
            'player_tds_over',
          ]);
          for (const b of backups) {
            const offers = props.offers
              .filter((o) => normalizeName(o.player) === b.nameKey)
              .sort((a, b2) => b2.price - a.price);
            if (offers.length) {
              const top = offers.slice(0, 3).map(
                (o) =>
                  `${o.market === 'player_tds_over' ? `${Math.ceil(o.point)}+ TDs` : 'Anytime TD'} ${fmtOdds(o.price)} @ ${o.book}`
              );
              lines.push(`${b.name}: ${top.join(' | ')}`);
            } else {
              lines.push(`${b.name}: no props posted yet — check your book's live menu NOW`);
            }
          }
        } catch (e) {
          lines.push(`(odds fetch failed: ${e.message} — check the book manually)`);
        }
      }
    }

    await notify({
      title: `INJURY: ${down.name} down (${game.name})`,
      message: lines.join('\n'),
      priority: 'urgent',
      tags: ['rotating_light', 'football'],
    });
  }

  function matchOddsEvent(game) {
    return (
      oddsEvents.find(
        (e) => e.home_team === game.homeTeam && e.away_team === game.awayTeam
      ) || null
    );
  }

  function teamName(teamId) {
    return teams.find((t) => String(t.id) === String(teamId))?.abbrev || teamId;
  }
}
