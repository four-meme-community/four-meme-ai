#!/usr/bin/env node
/**
 * Four.meme - token list (REST API)
 * GET /meme-api/v1/private/token/query
 * Usage: npx tsx token-list.ts [--orderBy=Hot] [--pageIndex=1] [--pageSize=30] [--tokenName=] [--symbol=] [--labels=] [--listedPancake=false]
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

async function main() {
  const orderBy = parseArg('orderBy', 'Hot');
  const tokenName = parseArg('tokenName', '');
  const listedPancake = parseArg('listedPancake', 'false');
  const pageIndex = parseArg('pageIndex', '1');
  const pageSize = parseArg('pageSize', '30');
  const symbol = parseArg('symbol', '');
  const labels = parseArg('labels', '');

  const params = new URLSearchParams({
    orderBy,
    tokenName,
    listedPancake,
    pageIndex,
    pageSize,
    symbol,
    labels,
  });
  const url = `${API_BASE}/private/token/query?${params.toString()}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`token/query failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
