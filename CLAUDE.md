# four-meme-ai – Agent Guidelines (Claude / Claude Code)

## Overview

This repo provides the **four-meme-integration** skill for AI agents: create and trade meme tokens on **four.meme (BSC only)** using the official API and on-chain contracts (**TokenManager2**, **TokenManagerHelper3**). TokenManager V1 is **not** supported by this skill.

The authoritative specification for this skill is `skills/four-meme-integration/SKILL.md`. Claude/Claude Code should treat that file as the main contract for behavior, safety, and command usage.

## When to Use This Skill

Use this repo when the user explicitly or implicitly asks to:

- **Create** a meme token on four.meme on BSC (full API flow + `TokenManager2.createToken` on-chain).
- **Buy** or **sell** a four.meme token on BSC (quote with Helper3, execute via TokenManager2).
- **Query token info** (version, tokenManager, price, offers, etc.) for a given token address or requestId.
- **Query lists / rankings** of four.meme tokens (REST list, detail, advanced rankings).
- **Query Tax token fee/tax config**, or execute Tax-type token creation.
- **Send BNB / ERC20** from the trading wallet to another address on BSC.
- **Register / query** an EIP‑8004 identity NFT (8004 registry contract on BSC).

If the user’s request does not involve four.meme, BSC, or these flows, you should not use this skill.

## Repo Layout

```
four-meme-ai/
├── skills/
│   └── four-meme-integration/
│       ├── SKILL.md        # Main skill instructions (Cursor / OpenClaw)
│       ├── references/     # API, addresses, errors, trading, events, tax
│       └── scripts/        # create-token, get-token-info, quote-buy/sell, etc.
├── bin/
│   └── fourmeme.cjs        # CLI dispatcher (fourmeme ...)
├── package.json
├── README.md
└── CLAUDE.md               # This file (Claude-facing guidelines)
```

## Safety and Private Key Handling

The SKILL defines a **User Agreement & Security Notice** (bilingual: English + Traditional Chinese). Claude MUST:

1. On first use of this skill in a conversation, present the User Agreement and Security Notice in the user’s language (use the 繁體中文 block when the user writes in Traditional Chinese; otherwise use English).
2. Make clear that **continuing to use this plugin/skill implies acceptance of the User Agreement**.
3. **MUST NOT** run any operation that uses a private key or writes on-chain (e.g. `create-api`, `create-chain`, `buy`, `sell`, `send`, `8004-register`) until the user has explicitly agreed or confirmed to continue.
4. May run read‑only commands (e.g. `config`, `token-info`, `quote-buy`, `8004-balance`) while or after presenting the notice.

Never ask the user to paste a private key into chat. All private keys must come from environment / config (e.g. `PRIVATE_KEY`) as described in `SKILL.md`.

## Conventions (aligned with SKILL.md)

1. **Chain**: BSC only (chainId 56). Arbitrum and Base are **out of scope** for this skill.
2. **Trading**:
   - Always call Helper3 `getTokenInfo(token)` first to get `version`, `tokenManager`, and current price/offers.
   - Only **version 2** (TokenManager2) is supported by this skill; do not attempt V1 flows.
   - For X Mode / TaxToken / AntiSniperFeeMode detection and error codes, see `skills/four-meme-integration/references/errors.md`.
3. **Create token**:
   - `raisedToken` must always come from `GET https://four.meme/meme-api/v1/public/config` and be used **as is** in the create body; do not invent or modify internal fields.
   - For tax-type tokens, follow `tokenTaxInfo` constraints in `references/token-tax-info.md` and the interactive flow in `SKILL.md` (“Create token (full flow)”).
4. **RPC and private key (environment)**:
   - When **using OpenClaw**: PRIVATE_KEY and BSC_RPC_URL are configured in OpenClaw (e.g. `skills.entries["four-meme-ai"].env` or apiKey); see SKILL.md.
   - When **not using OpenClaw (standalone)**: set `PRIVATE_KEY` and optionally `BSC_RPC_URL` via the process environment—e.g. a `.env` file in the **directory where you run `fourmeme`** (the CLI loads it automatically via dotenv) or shell `export`. Do not ask the user to paste a private key in chat.

## CLI Usage (fourmeme)

From the project root after `npm install`, use:

```bash
npx fourmeme <command> [args...]
```

Key commands (full list and parameters in `SKILL.md`):

- `fourmeme config` – Get public config (raisedToken).
- `fourmeme create-api` / `fourmeme create-chain` – Create token (API + on-chain).
- `fourmeme token-info` / `token-list` / `token-get` / `token-rankings` – On-chain info and REST queries.
- `fourmeme quote-buy` / `quote-sell` – Estimate buy/sell without sending tx.
- `fourmeme buy` / `sell` – Execute buy/sell via TokenManager2 (V2 only).
- `fourmeme send` – Send BNB or ERC20 from the trading wallet.
- `fourmeme 8004-register` / `8004-balance` – EIP‑8004 identity NFT register and query.
- `fourmeme events` – TokenManager2 events (TokenCreate, TokenPurchase, TokenSale, LiquidityAdded).
- `fourmeme tax-info` – TaxToken on-chain fee/tax config.

Always prefer these CLI commands rather than calling scripts directly, unless `SKILL.md` suggests otherwise.

## External Docs

For deeper protocol details, see:

- In-repo: `skills/four-meme-integration/references/` (api-create-token, token-query-api, execute-trade, event-listening, tax-token-query, errors).
- Official four.meme API and contracts (online): [Protocol Integration](https://four-meme.gitbook.io/four.meme/brand/protocol-integration) (API documents, ABIs: TokenManager, TokenManager2, Helper3, TaxToken, etc.).
