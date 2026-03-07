#!/usr/bin/env node
/**
 * fourmeme CLI - dispatches to four-meme-integration scripts.
 * Usage: fourmeme <command> [args...]
 * Run "fourmeme --help" for commands.
 * Loads .env from current working directory (where you run fourmeme) if present.
 */
const { spawnSync } = require('child_process');
const path = require('path');

// Load .env from cwd (e.g. your project dir) so PRIVATE_KEY, BSC_RPC_URL etc. work when running from a project
require('dotenv').config({ path: path.join(process.cwd(), '.env') });

const root = path.join(__dirname, '..');
const scriptsDir = path.join(root, 'skills', 'four-meme-integration', 'scripts');

const commands = {
  config: 'get-public-config.ts',
  'create-api': 'create-token-api.ts',
  'create-chain': 'create-token-chain.ts',
  'create-instant': 'create-token-instant.ts',
  'token-info': 'get-token-info.ts',
  'token-list': 'token-list.ts',
  'token-get': 'token-get.ts',
  'token-rankings': 'token-rankings.ts',
  'quote-buy': 'quote-buy.ts',
  'quote-sell': 'quote-sell.ts',
  buy: 'execute-buy.ts',
  sell: 'execute-sell.ts',
  send: 'send-token.ts',
  '8004-register': '8004-register.ts',
  '8004-balance': '8004-balance.ts',
  events: 'get-recent-events.ts',
  'tax-info': 'get-tax-token-info.ts',
  verify: null, // special: run config + verify-events
};

function run(scriptName, args = []) {
  const scriptPath = path.join(scriptsDir, scriptName);
  const result = spawnSync('npx', ['tsx', scriptPath, ...args], {
    stdio: 'inherit',
    shell: true,
    cwd: root,
  });
  process.exit(result.status ?? 1);
}

function printHelp() {
  console.log(`fourmeme - Four.meme CLI (BSC only)

Usage: npx fourmeme <command> [args...]

(In project dir, use npx fourmeme; npm install does not add fourmeme to PATH.)

Commands:
  config                    Get public config (raisedToken). No auth.
  create-api --image= --name= --short-name= --desc= --label= [options]
                            Create token API flow. Env: PRIVATE_KEY.
  create-chain <createArgHex> <signatureHex>
                            Submit createToken tx on BSC. Or: fourmeme create-chain -- (stdin JSON)
  create-instant --image= --name= --short-name= --desc= --label= [options]
                            One-shot: create-api + create-chain (same args as create-api).
  token-info <tokenAddress>
                            Get token info from Helper3 (BSC, on-chain).
  token-list [--orderBy=Hot] [--pageIndex=1] [--pageSize=30] [--tokenName=] [--symbol=] [--labels=] [--listedPancake=false]
                            Token list (REST API, filter/query).
  token-get <tokenAddress>
                            Token detail + trading info (REST API get/v2).
  token-rankings <orderBy> [--barType=HOUR24]
                            Rankings: orderBy=Time|ProgressDesc|TradingDesc|Hot|Graduated. barType only for TradingDesc.
  quote-buy <token> <amountWei> [fundsWei]
                            Estimate buy (no tx). Use 0 for amount or funds.
  quote-sell <token> <amountWei>
                            Estimate sell (no tx).
  buy <token> amount <amountWei> <maxFundsWei>
                            Execute buy: fixed token amount. Env: PRIVATE_KEY.
  buy <token> funds <fundsWei> <minAmountWei>
                            Execute buy: spend fixed quote (e.g. BNB). Env: PRIVATE_KEY.
  sell <token> <amountWei> [minFundsWei]
                            Execute sell. Env: PRIVATE_KEY.
  send <toAddress> <amountWei> [tokenAddress]
                            Send BNB or ERC20 to address. Omit tokenAddress for BNB. Env: PRIVATE_KEY.
  8004-register <name> [imageUrl] [description]
                            EIP-8004: register identity NFT. Env: PRIVATE_KEY.
  8004-balance <ownerAddress>
                            EIP-8004: query NFT balance of address (read-only).
  events <fromBlock> [toBlock]
                            TokenManager2 events (BSC). Default toBlock: latest.
  tax-info <tokenAddress>
                            TaxToken fee/tax config (BSC, creatorType 5 only).
  verify                    Run config + events for last 50 blocks (read-only check).

Env: PRIVATE_KEY, BSC_RPC_URL. See SKILL.md for full docs.
`);
}

const argv = process.argv.slice(2);
const cmd = argv[0];

if (!cmd || cmd === '--help' || cmd === '-h' || cmd === 'help') {
  printHelp();
  process.exit(0);
}

if (cmd === 'verify') {
  const r1 = spawnSync('npx', ['tsx', path.join(scriptsDir, 'get-public-config.ts')], {
    stdio: 'inherit',
    shell: true,
    cwd: root,
  });
  if (r1.status !== 0) process.exit(r1.status ?? 1);
  const r2 = spawnSync('npx', ['tsx', path.join(scriptsDir, 'verify-events.ts')], {
    stdio: 'inherit',
    shell: true,
    cwd: root,
  });
  process.exit(r2.status ?? 1);
}

const script = commands[cmd];
if (!script) {
  console.error(`Unknown command: ${cmd}`);
  printHelp();
  process.exit(1);
}

if (cmd === 'events') {
  run(script, ['56', ...argv.slice(1)]);
} else {
  run(script, argv.slice(1));
}
