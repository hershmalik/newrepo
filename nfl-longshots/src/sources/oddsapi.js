// The Odds API (the-odds-api.com) client for NFL player props.
// Player props must be fetched per-event via /events/{id}/odds.

import { fetchJson } from '../util.js';
import { config, marketKeys } from '../config.js';

const BASE = 'https://api.the-odds-api.com/v4/sports/americanfootball_nfl';

export const usage = { remaining: null, used: null };

function trackUsage(headers) {
  const rem = headers.get('x-requests-remaining');
  const used = headers.get('x-requests-used');
  if (rem !== null) usage.remaining = Number(rem);
  if (used !== null) usage.used = Number(used);
}

function requireKey() {
  if (!config.oddsApiKey) {
    throw new Error(
      'ODDS_API_KEY is not set. Copy .env.example to .env and add your key from https://the-odds-api.com'
    );
  }
}

// Upcoming NFL events: [{id, commence_time, home_team, away_team}]
export async function getEvents() {
  requireKey();
  const url = `${BASE}/events?apiKey=${config.oddsApiKey}`;
  const { json, headers } = await fetchJson(url);
  trackUsage(headers);
  return json;
}

// Player props for one event. Returns a flat list of offers:
// [{eventId, market, player, side, point, price, book, lastUpdate}]
export async function getEventProps(eventId, markets = marketKeys()) {
  requireKey();
  const params = new URLSearchParams({
    apiKey: config.oddsApiKey,
    regions: config.regions,
    markets: markets.join(','),
    oddsFormat: 'american',
  });
  if (config.bookmakers) params.set('bookmakers', config.bookmakers);
  const url = `${BASE}/events/${eventId}/odds?${params}`;
  const { json, headers } = await fetchJson(url);
  trackUsage(headers);

  const offers = [];
  for (const book of json.bookmakers || []) {
    for (const market of book.markets || []) {
      for (const o of market.outcomes || []) {
        // For player props the player name is in `description`; `name` is the
        // side (Over/Under/Yes/No). Some markets put the player in `name`.
        const side = ['Over', 'Under', 'Yes', 'No'].includes(o.name) ? o.name : 'Yes';
        const player = o.description || (side === 'Yes' ? o.name : null);
        if (!player) continue;
        if (side === 'Under' || side === 'No') continue; // longshots are always the Over/Yes side
        offers.push({
          eventId,
          market: market.key,
          player,
          side,
          point: o.point ?? null,
          price: o.price,
          book: book.title,
          bookKey: book.key,
          lastUpdate: market.last_update,
        });
      }
    }
  }
  return { offers, home: json.home_team, away: json.away_team, commence: json.commence_time };
}
