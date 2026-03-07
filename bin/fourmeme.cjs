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

Commands and parameters:

  config
    (no args) Get public config (raisedToken). No auth.

  create-api
    Required: --image=<path> --name=<name> --short-name=<symbol> --desc=<text> --label=<label>
    Optional: --web-url= --twitter-url= --telegram-url= (omit if empty)
              --pre-sale=<BNB> (ether units, e.g. 0.001)
              --fee-plan=false
              --tax-options=<path>   OR  --tax-token --tax-fee-rate=5 --tax-burn-rate=0
              --tax-divide-rate=0 --tax-liquidity-rate=100 --tax-recipient-rate=0
              --tax-recipient-address= --tax-min-sharing=100000
    Label: Meme|AI|Defi|Games|Infra|De-Sci|Social|Depin|Charity|Others
    Env: PRIVATE_KEY.

  create-chain
    <createArgHex> <signatureHex>  [--value=<wei>]
    Or: fourmeme create-chain -- (read createArg, signature, creationFeeWei from stdin JSON)
    Env: PRIVATE_KEY, optional CREATION_FEE_WEI.

  create-instant
    Required: --image=<path> --name=<name> --short-name=<symbol> --desc=<text> --label=<label>
    Optional: --web-url= --twitter-url= --telegram-url= (omit if empty)
              --pre-sale=<BNB> (ether units, e.g. 0.001)
              --fee-plan=false
              --value=<wei> (override computed creation fee; default from API)
              --tax-options=<path>   OR  --tax-token --tax-fee-rate=5 --tax-burn-rate=0
              --tax-divide-rate=0 --tax-liquidity-rate=100 --tax-recipient-rate=0
              --tax-recipient-address= --tax-min-sharing=100000
    Label: Meme|AI|Defi|Games|Infra|De-Sci|Social|Depin|Charity|Others
    One-shot: API + submit createToken. Env: PRIVATE_KEY.

  token-info <tokenAddress>
    On-chain token info (Helper3). No auth.

  token-list
    [--orderBy=Hot] [--pageIndex=1] [--pageSize=30] [--tokenName=] [--symbol=] [--labels=] [--listedPancake=false]
    REST token list. No auth.

  token-get <tokenAddress>
    REST token detail + trading info. No auth.

  token-rankings <orderBy> [--barType=HOUR24]
    orderBy: Time|ProgressDesc|TradingDesc|Hot|Graduated. barType for TradingDesc. No auth.

  quote-buy <tokenAddress> <amountWei> [fundsWei]
    Estimate buy. Use 0 for amount or funds. No tx.

  quote-sell <tokenAddress> <amountWei>
    Estimate sell. No tx.

  buy <tokenAddress> amount <amountWei> <maxFundsWei>
    Buy fixed token amount. Env: PRIVATE_KEY.

  buy <tokenAddress> funds <fundsWei> <minAmountWei>
    Spend fixed quote (e.g. BNB). Env: PRIVATE_KEY.

  sell <tokenAddress> <amountWei> [minFundsWei]
    Execute sell. Env: PRIVATE_KEY.

  send <toAddress> <amountWei> [tokenAddress]
    Send BNB or ERC20. Omit tokenAddress for BNB. Env: PRIVATE_KEY.

  8004-register <name> [imageUrl] [description]
    EIP-8004 register identity NFT. Env: PRIVATE_KEY.

  8004-balance <ownerAddress>
    EIP-8004 query NFT balance. Read-only.

  events <fromBlock> [toBlock]
    TokenManager2 events (BSC). toBlock default: latest.

  tax-info <tokenAddress>
    TaxToken fee/tax config (creatorType 5). Read-only.

  verify
    (no args) Config + events last 50 blocks. Read-only.

Env: PRIVATE_KEY (required for create-api, create-chain, create-instant, buy, sell, send, 8004-register).
     BSC_RPC_URL, CREATION_FEE_WEI optional. See SKILL.md.
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
