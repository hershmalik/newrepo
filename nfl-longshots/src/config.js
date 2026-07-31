import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const now = new Date();
// NFL season label: Aug-Dec belong to the current calendar year, Jan-Feb to the
// previous one, and Mar-Jul (offseason) to the upcoming season.
const seasonYear = now.getMonth() + 1 >= 3 ? now.getFullYear() : now.getFullYear() - 1;

function num(env, fallback) {
  const v = Number(process.env[env]);
  return Number.isFinite(v) && process.env[env] !== '' && process.env[env] !== undefined
    ? v
    : fallback;
}

export const config = {
  seasonYear,
  rootDir: path.join(__dirname, '..'),
  dataDir: path.join(__dirname, '..', 'data'),
  cacheDir: path.join(__dirname, '..', 'data', 'cache'),

  oddsApiKey: process.env.ODDS_API_KEY || '',
  regions: process.env.REGIONS || 'us',
  bookmakers: (process.env.BOOKMAKERS || '').trim(),
  altMarkets: process.env.ALT_MARKETS === '1',

  // Verified market keys from The Odds API docs.
  baseMarkets: ['player_anytime_td', 'player_1st_td', 'player_tds_over'],
  altMarketKeys: ['player_reception_yds_alternate', 'player_rush_yds_alternate'],

  targetOdds: num('TARGET_ODDS', 10000),
  singleMinOdds: num('SINGLE_MIN_ODDS', 2000),
  singleMaxOdds: num('SINGLE_MAX_ODDS', 40000),
  legMinOdds: num('LEG_MIN_ODDS', 200),
  legMaxOdds: num('LEG_MAX_ODDS', 2500),
  parlayMinOdds: num('PARLAY_MIN_ODDS', 5000),
  parlayMaxOdds: num('PARLAY_MAX_ODDS', 30000),
  maxParlayLegs: num('MAX_PARLAY_LEGS', 3),
  minScore: num('MIN_SCORE', 30),

  daysAhead: num('DAYS_AHEAD', 7),

  ntfyTopic: process.env.NTFY_TOPIC || '',
  ntfyServer: process.env.NTFY_SERVER || 'https://ntfy.sh',

  livePollSeconds: num('LIVE_POLL_SECONDS', 25),
  scoreboardPollSeconds: num('SCOREBOARD_POLL_SECONDS', 60),

  port: num('PORT', 3000),
};

export function marketKeys() {
  return config.altMarkets
    ? [...config.baseMarkets, ...config.altMarketKeys]
    : config.baseMarkets;
}
