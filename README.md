# four-meme-ai

Four.meme AI skills for creating and trading meme tokens on **BSC only**. Lets agents integrate with [four.meme](https://four.meme) for token creation, buy/sell flows, Tax tokens, transfers, and EIP‑8004 identity NFTs.

## Skills

| Skill | Description |
|-------|-------------|
| `four-meme-integration` | Create/trade meme tokens on **BSC only**, query token info/lists/rankings, listen to TokenManager2 events, query TaxToken tax info, send BNB/ERC20, and register/query EIP‑8004 identity NFTs. TokenManager V1 is not supported. |

Safety, user agreement, and detailed agent behavior requirements are defined in [`skills/four-meme-integration/SKILL.md`](skills/four-meme-integration/SKILL.md) (bilingual User Agreement & Security Notice). Claude-specific guidance lives in [`CLAUDE.md`](CLAUDE.md).

## Usage (Agent)

When the user needs to create or trade meme tokens on four.meme (BSC), use the **four-meme-integration** skill:

- **Create token (API + chain)**: Prefer the CLI flow `fourmeme create-api ...` → `fourmeme create-chain ...`. Under the hood this runs: `get-public-config.ts` (optional) → `create-token-api.ts` (image + name/symbol/desc/label, env `PRIVATE_KEY`) → `create-token-chain.ts` (createArg + signature from API). Creation is BSC only; no extra BNB is sent by default (set `CREATION_FEE_WEI` to attach a value if needed). See `SKILL.md` and `references/api-create-token.md` / `create-token-scripts.md` for full details and required user questions.
- **Trade (buy/sell)**: Use Helper3 `getTokenInfo` to get version and tokenManager; only version 2 (TokenManager2) is supported. Use `fourmeme quote-buy`/`quote-sell` for estimates, then `fourmeme buy`/`sell` to execute. **BSC only.**
- **Event listening**: `fourmeme events <fromBlock> [toBlock]` to fetch TokenCreate, TokenPurchase, TokenSale, LiquidityAdded from TokenManager2. See `references/event-listening.md`.
- **Tax token fee/tax info**: `fourmeme tax-info <tokenAddress>`. See `references/tax-token-query.md` and `token-tax-info.md`.
- **Send BNB/ERC20**: `fourmeme send <toAddress> <amountWei> [tokenAddress]` to transfer from the trading wallet.
- **EIP‑8004 identity NFT**: `fourmeme 8004-register <name> [imageUrl] [description]` and `fourmeme 8004-balance <ownerAddress>`.
- **CLI** (after `npm install`): use **`npx fourmeme <command> [args]`**. Run `npx fourmeme --help` for all commands, including:\n  - Config: `npx fourmeme config`\n  - Create: `npx fourmeme create-api ...` → `npx fourmeme create-chain ...`\n  - Trade/info: `npx fourmeme token-info <tokenAddress>`, `npx fourmeme quote-buy`, `npx fourmeme quote-sell`\n  - Execute trade: `npx fourmeme buy <token> amount|funds ...`, `npx fourmeme sell <token> <amountWei> [minFundsWei]` (needs PRIVATE_KEY)\n  - Events: `npx fourmeme events <fromBlock> [toBlock]`\n  - Tax: `npx fourmeme tax-info <tokenAddress>`\n  - EIP‑8004: `npx fourmeme 8004-register ...`, `npx fourmeme 8004-balance ...`\n  - Verify: `npx fourmeme verify`\n\n## Install (project)

```bash
cd four-meme-ai
npm install
```

## Environment variables (without OpenClaw)

When you **do not** use OpenClaw, the CLI reads `PRIVATE_KEY` and `BSC_RPC_URL` from the process environment. Set them in one of these ways:

**Option 1: `.env` file in the project root**

Create a file named `.env` in the repo root (same directory as `package.json`):

```bash
# .env (do not commit this file)
PRIVATE_KEY=your_hex_private_key_with_or_without_0x_prefix
BSC_RPC_URL=https://bsc-dataseed.binance.org
```

Then run commands so that the shell loads `.env` before invoking `fourmeme` (e.g. use a tool that loads `.env`, or `export $(cat .env | xargs)` then `npx fourmeme ...`). The scripts themselves do not load `.env`; you must ensure the variables are in the environment when `npx fourmeme` runs.

**Option 2: export in the shell**

```bash
export PRIVATE_KEY=your_hex_private_key
export BSC_RPC_URL=https://bsc-dataseed.binance.org
npx fourmeme create-api ./logo.png MyToken MTK "Desc" AI
```

- **PRIVATE_KEY**: Required for any command that signs or sends a transaction (create-api, create-chain, buy, sell, send, 8004-register). Hex string; `0x` prefix optional.
- **BSC_RPC_URL**: Optional. BSC RPC endpoint; if unset, scripts use a default public BSC RPC.

**Security**: Do not commit `.env` or share your private key. Add `.env` to `.gitignore` if you use a `.env` file.

## Install as OpenClaw plugin

This repo is an [OpenClaw](https://docs.openclaw.ai)-compatible plugin. Install so the skill is loaded and **PRIVATE_KEY / BSC_RPC_URL** are only injected for this skill (via `skills.entries`):

```bash
openclaw plugins install /path/to/four-meme-ai
# or from npm (if published): openclaw plugins install @scope/four-meme-ai
```

Then in `~/.openclaw/openclaw.json` set:

```json5
{
  skills: {
    entries: {
      "four-meme-ai": {
        enabled: true,
        env: {
          PRIVATE_KEY: "0x...",
          BSC_RPC_URL: "https://bsc-dataseed.binance.org"
        }
      }
    }
  }
}
```

See [skills/four-meme-integration/SKILL.md](skills/four-meme-integration/SKILL.md) for the full OpenClaw config section and environment variable details.

## Verify the skill (read-only)

After `npm install`, run:

```bash
npx fourmeme verify
```
(In project dir, use `npx fourmeme`; or run `npm link` then `fourmeme` from anywhere.)

This runs **config** (four.meme API) and **events** for the last 50 blocks on BSC. No private key or on-chain writes. For full verification steps, see [VERIFICATION.md](VERIFICATION.md).

## Docs

- Skill instructions (agent behavior, safety, flows): `skills/four-meme-integration/SKILL.md`
- Claude/Claude Code guidelines: `CLAUDE.md`
- References: `skills/four-meme-integration/references/` (API, contract addresses, trading, events, tax, errors)
- Official four.meme API and contracts: [Protocol Integration](https://four-meme.gitbook.io/four.meme/brand/protocol-integration) (API documents, ABIs)

## License

MIT
