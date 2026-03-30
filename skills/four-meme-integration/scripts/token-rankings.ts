#!/usr/bin/env node
/**
 * Four.meme - token rankings (REST API)
 * POST /meme-api/v1/public/token/ranking
 *
 * Backward compatible: <orderBy> where orderBy = Time | ProgressDesc | TradingDesc | Hot | Graduated
 *   [--barType=HOUR24|HOUR4|HOUR1|MIN30|MIN5] (only for TradingDesc; maps to VOL_* windows)
 *
 * You may also pass a native API RankingType directly: NEW, PROGRESS, VOL_DAY_1, HOT, DEX, VOL, LAST, CAP, …
 *
 * Optional filters: [--pageSize=20] [--symbol=] [--version=] [--rankingKind=]
 *   [--minCap=] [--maxCap=] [--minVol=] [--maxVol=] [--minHold=] [--maxHold=]
 *
 * Usage: npx tsx token-rankings.ts <orderOrType> [--barType=HOUR24] [filters...]
 * Output: JSON ranking list.
 */

const API_BASE = 'https://four.meme/meme-api/v1';

const LEGACY_ORDER_BY = ['Time', 'ProgressDesc', 'TradingDesc', 'Hot', 'Graduated'] as const;

/** Legacy TradingDesc + barType → public ranking `type`. */
const BAR_TYPE_TO_VOL_TYPE: Record<string, string> = {
  HOUR24: 'VOL_DAY_1',
  DAY1: 'VOL_DAY_1',
  HOUR4: 'VOL_HOUR_4',
  HOUR1: 'VOL_HOUR_1',
  MIN30: 'VOL_MIN_30',
  MIN5: 'VOL_MIN_5',
};

const LEGACY_TO_TYPE: Record<string, string> = {
  Time: 'NEW',
  ProgressDesc: 'PROGRESS',
  TradingDesc: 'VOL_DAY_1',
  Hot: 'HOT',
  Graduated: 'DEX',
};

/** Native ranking types allowed as the first argument (aligned with API RankingType). */
const NATIVE_RANKING_TYPES = new Set([
  'NEW',
  'PROGRESS',
  'VOL_MIN_5',
  'VOL_MIN_30',
  'VOL_HOUR_1',
  'VOL_HOUR_4',
  'VOL_DAY_1',
  'VOL',
  'LAST',
  'HOT',
  'CAP',
  'DEX',
  'BURN',
]);

function parseArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  for (let i = 3; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith(prefix)) return arg.slice(prefix.length);
  }
  return undefined;
}

function parseNumArg(name: string): number | undefined {
  const v = parseArg(name);
  if (v == null || v.trim() === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function resolveRankingType(first: string, barType?: string): string {
  if (first === 'TradingDesc') {
    if (barType && BAR_TYPE_TO_VOL_TYPE[barType]) {
      return BAR_TYPE_TO_VOL_TYPE[barType];
    }
    return 'VOL_DAY_1';
  }
  if (LEGACY_TO_TYPE[first]) {
    return LEGACY_TO_TYPE[first];
  }
  return first;
}

function normalizeLegacyOrderBy(s: string): string {
  const map: Record<string, string> = {
    time: 'Time',
    progressdesc: 'ProgressDesc',
    tradingdesc: 'TradingDesc',
    hot: 'Hot',
    graduated: 'Graduated',
  };
  return map[s.toLowerCase()] ?? s;
}

async function main() {
  const rawFirst = process.argv[2];
  const first = rawFirst ? normalizeLegacyOrderBy(rawFirst) : '';
  if (!first) {
    console.error(
      'Usage: npx tsx token-rankings.ts <orderBy|RankingType> [--barType=HOUR24] [--pageSize=20] ...',
    );
    console.error(
      'Legacy orderBy: Time | ProgressDesc | TradingDesc | Hot | Graduated (barType for TradingDesc)',
    );
    console.error('Or native type: NEW, PROGRESS, VOL_DAY_1, HOT, DEX, VOL, LAST, CAP, BURN, ...');
    process.exit(1);
  }

  const barType = parseArg('barType');
  let rankingType = resolveRankingType(first, barType);

  const isLegacy = (LEGACY_ORDER_BY as readonly string[]).includes(first);
  if (!isLegacy && !NATIVE_RANKING_TYPES.has(rankingType)) {
    console.error(`Unknown ranking type: ${first}`);
    console.error(
      `Use legacy: ${LEGACY_ORDER_BY.join(' | ')} or native: ${[...NATIVE_RANKING_TYPES].join(', ')}`,
    );
    process.exit(1);
  }

  const pageSizeArg = parseNumArg('pageSize');
  const pageSize = pageSizeArg != null ? Math.min(100, Math.max(1, pageSizeArg)) : 20;

  const body: Record<string, unknown> = {
    type: rankingType,
    pageSize,
  };

  const symbol = parseArg('symbol')?.trim();
  if (symbol) body.symbol = symbol;
  const version = parseArg('version')?.trim();
  if (version) body.version = version;
  const rankingKind = parseArg('rankingKind')?.trim();
  if (rankingKind) body.rankingKind = rankingKind;

  for (const key of ['minCap', 'maxCap', 'minVol', 'maxVol', 'minHold', 'maxHold'] as const) {
    const n = parseNumArg(key);
    if (n !== undefined) body[key] = n;
  }

  const url = `${API_BASE}/public/token/ranking`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`token/ranking failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
