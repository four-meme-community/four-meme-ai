#!/usr/bin/env node
/**
 * Four.meme - token list (REST API)
 * POST /meme-api/v1/public/token/search
 *
 * Legacy (still supported): [--orderBy=Hot] [--tokenName=] [--listedPancake=false] ...
 * New params: [--type=HOT] [--listType=NOR] [--keyword=] [--tag=a,b] [--status=PUBLISH|TRADE|ALL] [--sort=DESC|ASC] [--version=V9]
 * Legacy shortcut: [--queryMode=Binance|USD1] (infers listType BIN/BIN_DEX or USD1/USD1_DEX using listedPancake)
 *
 * Usage: npx tsx token-list.ts [options]
 * Output: JSON list of tokens.
 */

const API_BASE = 'https://four.meme/meme-api/v1';

function parseArg(name: string, defaultValue: string): string {
  const prefix = `--${name}=`;
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith(prefix)) return arg.slice(prefix.length);
  }
  return defaultValue;
}

function hasArg(name: string): boolean {
  const prefix = `--${name}=`;
  return process.argv.some((a) => a.startsWith(prefix));
}

/** Map legacy orderBy → public search `type` (sort controlled by --sort=; default DESC). */
function typeFromLegacyOrderBy(orderBy: string): string {
  const k = orderBy.replace(/\s/g, '').toLowerCase();
  const map: Record<string, string> = {
    hot: 'HOT',
    time: 'NEW',
    timedesc: 'NEW',
    new: 'NEW',
    progress: 'PROGRESS',
    progressdesc: 'PROGRESS',
    trading: 'VOL',
    tradingdesc: 'VOL',
    vol: 'VOL',
    volume: 'VOL',
    last: 'LAST',
    cap: 'CAP',
    dex: 'DEX',
    graduated: 'DEX',
    burn: 'BURN',
  };
  return map[k] ?? 'HOT';
}

async function main() {
  const pageIndex = Math.max(1, parseInt(parseArg('pageIndex', '1'), 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(parseArg('pageSize', '30'), 10) || 30));
  const sort = (parseArg('sort', 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC') as 'ASC' | 'DESC';

  const listedPancake = parseArg('listedPancake', 'false').toLowerCase() === 'true';

  // New API listType: allow explicit listType, or infer from legacy queryMode + listedPancake.
  const explicitListType = hasArg('listType') ? parseArg('listType', 'NOR') : '';
  const queryMode = parseArg('queryMode', '').trim().toLowerCase();
  const inferredListType = (() => {
    if (!queryMode) return '';
    if (queryMode === 'binance' || queryMode === 'bnb' || queryMode === 'bnb_mpc') {
      return listedPancake ? 'BIN_DEX' : 'BIN';
    }
    if (queryMode === 'usd1') {
      return listedPancake ? 'USD1_DEX' : 'USD1';
    }
    return '';
  })();
  const listType = explicitListType || inferredListType || parseArg('listType', 'NOR');
  const type = hasArg('type')
    ? parseArg('type', 'HOT')
    : typeFromLegacyOrderBy(parseArg('orderBy', 'Hot'));

  let status: string;
  if (hasArg('status')) {
    status = parseArg('status', 'ALL').toUpperCase();
  } else {
    status = listedPancake ? 'TRADE' : 'PUBLISH';
  }

  const keywordRaw = hasArg('keyword') ? parseArg('keyword', '') : parseArg('tokenName', '');
  const labelsRaw = hasArg('tag') ? parseArg('tag', '') : parseArg('labels', '');
  const symbol = parseArg('symbol', '').trim();

  const body: Record<string, unknown> = {
    type,
    listType,
    pageIndex,
    pageSize,
    status,
    sort,
  };

  if (keywordRaw.trim() !== '') {
    body.keyword = keywordRaw.trim();
  }
  if (symbol !== '') {
    body.symbol = symbol;
  }
  if (labelsRaw.trim() !== '') {
    body.tag = labelsRaw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }
  const version = parseArg('version', '').trim();
  if (version !== '') {
    body.version = version;
  }

  const url = `${API_BASE}/public/token/search`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`token/search failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
