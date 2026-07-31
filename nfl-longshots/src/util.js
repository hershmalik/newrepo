// Odds math, name matching, and fetch helpers shared across the app.

export function americanToDecimal(a) {
  const n = Number(a);
  return n > 0 ? 1 + n / 100 : 1 + 100 / -n;
}

export function decimalToAmerican(d) {
  if (d >= 2) return Math.round((d - 1) * 100);
  return Math.round(-100 / (d - 1));
}

// Combine parlay legs (american odds) into a single american price.
export function combineAmerican(legs) {
  const dec = legs.reduce((acc, a) => acc * americanToDecimal(a), 1);
  return decimalToAmerican(dec);
}

export function impliedProb(american) {
  const n = Number(american);
  return n > 0 ? 100 / (n + 100) : -n / (-n + 100);
}

export function fmtOdds(a) {
  const n = Math.round(Number(a));
  return n > 0 ? `+${n}` : `${n}`;
}

const NAME_SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'v']);

// Normalize a player name so ESPN and sportsbook spellings match:
// lowercase, strip accents/punctuation, drop Jr/Sr/III suffixes.
export function normalizeName(name) {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !NAME_SUFFIXES.has(t))
    .join(' ');
}

// "D.Moore"-style short names can't be matched reliably; last-name + first
// initial is the fallback key used when full names don't line up.
export function looseNameKey(name) {
  const parts = normalizeName(name).split(' ');
  if (parts.length < 2) return normalizeName(name);
  return `${parts[0][0]} ${parts[parts.length - 1]}`;
}

export async function fetchJson(url, { retries = 2, timeoutMs = 15000, headers = {} } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        const err = new Error(`HTTP ${res.status} for ${url}: ${body.slice(0, 200)}`);
        err.status = res.status;
        // 4xx won't get better on retry
        if (res.status >= 400 && res.status < 500) throw err;
        lastErr = err;
      } else {
        const json = await res.json();
        return { json, headers: res.headers };
      }
    } catch (e) {
      if (e.status >= 400 && e.status < 500) throw e;
      lastErr = e;
    }
    if (attempt < retries) await sleep(1000 * 2 ** attempt);
  }
  throw lastErr;
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Run async mapper over items with bounded concurrency.
export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
