#!/usr/bin/env node
/**
 * Four.meme - token rankings (REST API)
 * POST /meme-api/v1/private/token/query/advanced
 * Body: { orderBy: "Time"|"ProgressDesc"|"TradingDesc"|"Hot"|"Graduated" [, barType: "HOUR24" ] }
 * Usage: npx tsx token-rankings.ts <orderBy> [--barType=HOUR24]
 *   orderBy: Time | ProgressDesc | TradingDesc | Hot | Graduated
 *   --barType only for TradingDesc (24h volume)
 * Output: JSON ranking list.
 */

const API_BASE = 'https://four.meme/meme-api/v1';

function parseArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  for (let i = 3; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith(prefix)) return arg.slice(prefix.length);
  }
  return undefined;
}

async function main() {
  const orderBy = process.argv[2];
  const validOrderBy = ['Time', 'ProgressDesc', 'TradingDesc', 'Hot', 'Graduated'];
  if (!orderBy || !validOrderBy.includes(orderBy)) {
    console.error('Usage: npx tsx token-rankings.ts <orderBy> [--barType=HOUR24]');
    console.error('orderBy: Time | ProgressDesc | TradingDesc | Hot | Graduated');
    process.exit(1);
  }
  const body: Record<string, string> = { orderBy };
  const barType = parseArg('barType');
  if (barType) body.barType = barType;

  const url = `${API_BASE}/private/token/query/advanced`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`token/query/advanced failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
