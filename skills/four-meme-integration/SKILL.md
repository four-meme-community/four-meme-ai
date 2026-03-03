---
name: four-meme-ai
description: |
  CLI tool to create and trade meme tokens on four.meme (BSC only). Returns structured JSON for config, token info, quotes, events, and TaxToken tax info.

  

allowed-tools:
  - Bash(fourmeme *)
  - Bash(npx fourmeme *)
license: MIT
metadata:
  {"author":"Four.meme AI Skill","version":"1.0.0","openclaw":{"requires":{"env":["PRIVATE_KEY"]},"primaryEnv":"PRIVATE_KEY","optionalEnv":["BSC_RPC_URL"]}}
---

## [Agent must follow] User agreement and security notice on first use

When responding to any user request about fourmeme or this skill, **you must first** present the content below in this order: **User Agreement, then Security Notice**, and state clearly that by choosing to continue, the user agrees to the User Agreement.  
Until the user has explicitly agreed or confirmed to continue, **do not** run `create-api`, `create-chain`, `buy`, `sell`, `send`, or `8004-register` (any operation that uses the private key or writes to the chain). Read-only commands (e.g. `config`, `token-info`, `quote-buy`, `8004-balance`) may be run while or after presenting the notice.

**Language selection**: Present the User Agreement and Security Notice **in the user’s language**. If the user is writing in **Traditional Chinese (繁體中文)**, use the **繁體中文** block below; otherwise use the **English** block.

---

### User Agreement & Security Notice (繁體中文)

**用戶協議**

**前情提示**：使用本插件及本 skill 所涉功能（包括但不限於代幣創建、買賣、轉帳、8004 註冊等）前，請您閱讀以下協議。**若您選擇繼續使用本插件及本 skill 功能，即表示您已閱讀、理解並同意本協議。**

**本插件性質與責任限制**：本插件僅提供純本地的命令列互動能力（私鑰透過環境變數或本地設定使用），**不會收集、上傳或儲存您的私鑰**。因任何原因（包括但不限於插件被竄改、環境遭入侵、誤操作、第三方插件等）導致的私鑰洩露或資產損失，**本插件及提供方不承擔責任**。

**安全警示**

使用本插件進行代幣創建、買賣、轉帳等操作時，請務必注意：

- **保護私鑰**：切勿在聊天對話中輸入、貼上或洩露私鑰；不要將私鑰分享給任何人或任何第三方。
- **交易錢包僅存小額資金**：用於執行操作的錢包（即提供 PRIVATE_KEY 的錢包）建議只存放少量資金，以降低因洩露或誤操作導致的損失。
- **及時轉出資金**：完成交易後，請及時將交易錢包中的資產轉移到您自己控制的、更安全的錢包或冷錢包中。
- **謹慎安裝 Agent／插件**：下載或安裝任何 Agent、瀏覽器插件或第三方工具時，請確認來源可信，避免惡意插件竊取私鑰或助記詞。

---

### User Agreement & Security Notice (English)

**User Agreement**

**Notice**: Before using this plugin and this skill (including but not limited to token creation, buy/sell, transfers, 8004 registration), please read the following. **By choosing to continue using this plugin and this skill, you have read, understood, and agreed to this agreement.**

**Plugin nature and limitation of liability**: This plugin provides local-only CLI interaction (private key is used via environment or local config). It **does not collect, upload, or store your private key**. The plugin and its providers **are not liable** for private key disclosure or asset loss due to any cause (including but not limited to tampered plugin, compromised environment, user error, or third-party plugins).

**Security Notice**

When using this plugin for token creation, trading, or transfers, please:

- **Protect your private key**: Do not type, paste, or expose your private key in chat; do not share it with anyone or any third party.
- **Keep only small amounts in the trading wallet**: The wallet used for operations (the one whose PRIVATE_KEY you provide) should hold only a small amount of funds to limit loss from disclosure or mistakes.
- **Move funds out promptly**: After trading, move assets from the trading wallet to a wallet or cold storage you control.
- **Install agents/plugins carefully**: When installing any agent, browser extension, or third-party tool, verify the source to avoid malware that could steal your private key or seed phrase.

---

## fourmeme capability overview

After you agree to the above and confirm to continue, this skill can help you with the following (all via the `fourmeme` CLI on BSC):

| Category | Capability | Description |
|----------|-------------|-------------|
| **Create** | Create token | Upload image + name/symbol/description/label; optional tax-token params; API returns signature then on-chain create. |
| **Query** | Public config | Get raisedToken and other public config (no auth). |
| **Query** | Token info (on-chain) | By address: version, tokenManager, price, offers (Helper3). |
| **Query** | Token list / detail / rankings | REST: filtered paginated list, single-token detail and trading info, hot/24h volume/newest/graduated rankings. |
| **Trading** | Buy/sell quotes | Estimate cost or proceeds for buy or sell (no transaction sent). |
| **Trading** | Execute buy | Buy a given token by amount or by quote spent (requires PRIVATE_KEY). |
| **Trading** | Execute sell | Sell a given token amount; optional minimum quote received (requires PRIVATE_KEY). |
| **Other** | Event listening | Fetch TokenCreate, TokenPurchase, TokenSale, LiquidityAdded on-chain. |
| **Other** | Tax token fees | Query on-chain fee and burn/dividend/liquidity config for a token. |
| **Other** | Send | Send BNB or ERC20 to a given address (requires PRIVATE_KEY). |
| **Other** | EIP-8004 | Register 8004 identity NFT; query balance by address. |

See the **CLI (fourmeme)** table and sections below for commands and arguments.

---

# fourmeme CLI

BSC only; all commands output JSON. Run `fourmeme --help` for usage.

## Installation (required before use)

**You must install the fourmeme CLI before using this skill.** Recommended (global):

```bash
npm install -g @four-meme/four-meme-ai@latest
```

After installation, run commands with `fourmeme <command> [args]`. If you use a local install instead, use `npx fourmeme <command> [args]` from the project root.

This skill provides: token creation (API + chain), buy/sell quotes and execution, token info/list/rankings, event listening, Tax token fee queries, send, and EIP-8004 identity NFT register and balance. Contract addresses and version notes: [references/contract-addresses.md](references/contract-addresses.md). **TokenManager V1 is not supported in this skill.**

## Create token flow

### 1. Ask user for required information (must be done first)

Before calling `create-api`, the Agent **must** ask the user for and confirm:

| Info | Required | Description |
|------|----------|-------------|
| **Image path** (imagePath) | Yes | Local logo path; jpeg/png/gif/bmp/webp |
| **Token name** (name) | Yes | Full token name |
| **Token symbol** (shortName) | Yes | e.g. MTK, DOGE |
| **Description** (desc) | Yes | Token description text |
| **Label** (label) | Yes | One of: Meme \| AI \| Defi \| Games \| Infra \| De-Sci \| Social \| Depin \| Charity \| Others |
| **Tax token?** | No | If yes, then ask for tokenTaxInfo (feeRate, four rates, recipientAddress, minSharing); see "Create token (full flow)" below |

Optional: WEB_URL, TWITTER_URL, TELEGRAM_URL, PRE_SALE, FEE_PLAN (AntiSniperFeeMode), etc.; may be provided by user or left at defaults.

### 2. Technical flow (done by create-api / create-chain)

After collecting the above, execute in this order (handled by scripts or CLI):

1. **Get nonce** — `POST /private/user/nonce/generate` with body accountAddress, verifyType, networkCode (BSC).
2. **Login** — Sign `You are sign in Meme {nonce}` with wallet; `POST /private/user/login/dex` to get access_token.
3. **Upload image** — `POST /private/token/upload` with access_token in header and image as body; get imgUrl.
4. **Create (API)** — GET `/public/config` for raisedToken (do not modify); `POST /private/token/create` with name, shortName, desc, imgUrl, label, raisedToken, etc.; get createArg, signature.
5. **Create (chain)** — Call `TokenManager2.createToken(createArg, sign)` on BSC to complete on-chain creation.

Commands: first `fourmeme create-api <imagePath> <name> <shortName> <desc> <label> [taxOptions.json]`, then `fourmeme create-chain <createArgHex> <signatureHex>`. Full API and parameters: [references/api-create-token.md](references/api-create-token.md); script flow and examples: [references/create-token-scripts.md](references/create-token-scripts.md); Tax token params: [references/token-tax-info.md](references/token-tax-info.md).

## Agent workflow: buy/sell from rankings or events

This skill supports a flow to discover tokens, get details, quote, and execute. The following is an example workflow, not a trading recommendation: discover → detail → quote → execute.

1. **Discover** (one or more of):  
   - **Rankings**: `fourmeme token-rankings <orderBy>` (orderBy = Hot, TradingDesc, Time, ProgressDesc, Graduated); use token addresses from the response.  
   - **List**: `fourmeme token-list [--orderBy=] [--labels=] ...` to filter and get addresses.  
   - **On-chain events**: `fourmeme events <fromBlock> [toBlock]`; parse token addresses from TokenCreate/TokenPurchase, etc., for “newly created” or “recent trades” strategies.
2. **Get details**: For each candidate, call `fourmeme token-get <address>` (REST detail and trading info) or `fourmeme token-info <address>` (on-chain version, tokenManager, price, offers) to filter or display.
3. **Quote**: `fourmeme quote-buy <token> <amountWei> [fundsWei]` / `fourmeme quote-sell <token> <amountWei>` for estimated cost or proceeds.
4. **Execute**: `fourmeme buy ...` / `fourmeme sell ...` (requires PRIVATE_KEY). **Before executing, the Agent must confirm user intent** (e.g. user said “buy 0.05 BNB each for top 5 by 24h volume” or “auto-buy 0.01 BNB for new tokens”) and obtain explicit confirmation before first automated execution to avoid unauthorized use of funds.

When the user asks to “buy/sell based on rankings or activity”, the Agent should clarify: which ranking (hot, 24h volume, newest, graduated, etc.), amount per token, and whether to quote only or also execute; then run the appropriate commands.

## Trading (Buy / Sell)

- **Version** – Use TokenManagerHelper3 `getTokenInfo(token)`. If `version === 1` use V1 TokenManager; if `version === 2` use TokenManager2 (and check for X Mode / TaxToken / AntiSniperFeeMode if needed).
- **Quote (pre-calc)** – TokenManagerHelper3:  
  - Buy: `tryBuy(token, amount, funds)` – use `amount > 0` for “buy X tokens”, or `funds > 0` for “spend X quote”.  
  - Sell: `trySell(token, amount)`.
- **Execute** – Use the `tokenManager` address from `getTokenInfo` and call the corresponding contract:  
  - V1: `purchaseToken` / `purchaseTokenAMAP`, `saleToken`.  
  - V2: `buyToken` / `buyTokenAMAP`, `sellToken`. For sell, user must `ERC20.approve(tokenManager, amount)` first.  
  - X Mode tokens: use TokenManager2 `buyToken(bytes args, uint256 time, bytes signature)` with encoded `BuyTokenParams`.

## CLI (fourmeme)

Run `fourmeme --help` for usage. After **global install** (`npm install -g @four-meme/four-meme-ai@latest`), use **`fourmeme <command> [args]`**. With a local install only, use **`npx fourmeme <command> [args]`** from the project root.

### PRIVATE_KEY and BSC_RPC_URL

**When using OpenClaw**  
This skill declares `requires.env: ["PRIVATE_KEY"]` and `primaryEnv: "PRIVATE_KEY"` in metadata; OpenClaw injects them only when an agent runs with **this skill enabled** (other skills cannot access them).

**Required steps:**
1. **Configure private key**: In the Skill management page, set the four-meme-ai skill’s **apiKey** (corresponds to `primaryEnv: "PRIVATE_KEY"`), or set `PRIVATE_KEY` under `skills.entries["four-meme-ai"].env` in `~/.openclaw/openclaw.json`. Optionally set **BSC_RPC_URL** in global env if needed.
2. **Enable this skill**: In the agent or session, ensure the **four-meme-ai** skill is **enabled**. Only when the skill is enabled will OpenClaw inject **PRIVATE_KEY** into the process; otherwise create/buy/sell/send/8004-register will fail with missing key. **BSC_RPC_URL** is optional (metadata: `optionalEnv`); if not set, scripts use a default BSC RPC.

**When not using OpenClaw (standalone)**  
Set **PRIVATE_KEY** and optionally **BSC_RPC_URL** via the process environment so they are available when running `npx fourmeme` or `node bin/fourmeme.cjs`:

- **.env file**: Put a `.env` file in **the directory where you run the `fourmeme` command** (i.e. your project / working directory). Example: if you run `fourmeme quote-buy ...` from `/path/to/my-project`, place `.env` at `/path/to/my-project/.env`. The CLI automatically loads `.env` from that current working directory. Use lines like `PRIVATE_KEY=...` and `BSC_RPC_URL=...`. Do not commit `.env`; add it to `.gitignore`.
- **Shell export**: `export PRIVATE_KEY=your_hex_key` and `export BSC_RPC_URL=https://bsc-dataseed.binance.org` (or another BSC RPC), then run `npx fourmeme <command> ...`.

### Declared and optional environment variables

- **Declared in registry metadata** (injected by OpenClaw when skill is enabled): **PRIVATE_KEY** (required for write operations). Optional in metadata: **BSC_RPC_URL** (scripts fall back to default BSC RPC if unset).
- **Not in metadata; optional, may be set in env or project `.env`**: **BSC_RPC_URL**, **CREATION_FEE_WEI** (extra BNB on create), **TAX_TOKEN**, **TAX_FEE_RATE**, **TAX_BURN_RATE**, **TAX_DIVIDE_RATE**, **TAX_LIQUIDITY_RATE**, **TAX_RECIPIENT_RATE**, **TAX_RECIPIENT_ADDRESS**, **TAX_MIN_SHARING**, **WEB_URL**, **TWITTER_URL**, **TELEGRAM_URL**, **PRE_SALE**, **FEE_PLAN**, **8004_NFT_ADDRESS** / **EIP8004_NFT_ADDRESS**. Only **PRIVATE_KEY** is required for signing; others have defaults or are used only for specific commands (see Create token flow, EIP-8004, etc.).

### Execution and install

- **Invocation**: The agent must run commands only via the **fourmeme** CLI: `fourmeme <command> [args]` or `npx fourmeme <command> [args]` (allowed-tools). Do not invoke scripts or `npx tsx` directly; the CLI entry (`bin/fourmeme.cjs`) dispatches to the correct script and loads `.env` from the current working directory.
- **Install**: `npm install -g @four-meme/four-meme-ai@latest`. Runtime: Node.js. Dependencies (including dotenv, viem, tsx) are declared in the package’s `package.json`; global install installs them. No separate install spec beyond the npm package.

| Need | Command | When |
|------|---------|------|
| Public config | `fourmeme config` | Get raisedToken / config (no auth) |
| Token info (on-chain) | `fourmeme token-info <tokenAddress>` | Version, tokenManager, price, offers (BSC Helper3) |
| Token list (REST) | `fourmeme token-list [--orderBy=] [--pageIndex=] [--pageSize=] [--tokenName=] [--symbol=] [--labels=] [--listedPancake=]` | Filtered, paginated token list |
| Token detail (REST) | `fourmeme token-get <tokenAddress>` | Token detail and trading info (get/v2) |
| Token rankings (REST) | `fourmeme token-rankings <orderBy> [--barType=HOUR24]` | Time / ProgressDesc / TradingDesc / Hot / Graduated; barType for TradingDesc |
| Buy quote | `fourmeme quote-buy <token> <amountWei> [fundsWei]` | Estimate only; no transaction |
| Sell quote | `fourmeme quote-sell <token> <amountWei>` | Estimate only; no transaction |
| **Execute buy** | `fourmeme buy <token> amount <amountWei> <maxFundsWei>` | Buy fixed amount (needs PRIVATE_KEY) |
| **Execute buy** | `fourmeme buy <token> funds <fundsWei> <minAmountWei>` | Spend fixed quote (e.g. BNB) (needs PRIVATE_KEY) |
| **Execute sell** | `fourmeme sell <token> <amountWei> [minFundsWei]` | Sell (needs PRIVATE_KEY) |
| **Send** | `fourmeme send <toAddress> <amountWei> [tokenAddress]` | Send BNB or ERC20 to address (needs PRIVATE_KEY) |
| **EIP-8004 register** | `fourmeme 8004-register <name> [imageUrl] [description]` | Register 8004 identity NFT (needs PRIVATE_KEY) |
| **EIP-8004 query** | `fourmeme 8004-balance <ownerAddress>` | Query 8004 NFT balance (read-only) |
| Events | `fourmeme events <fromBlock> [toBlock]` | TokenCreate / Purchase / Sale / LiquidityAdded |
| Tax token info | `fourmeme tax-info <tokenAddress>` | Fee/tax config for TaxToken |
| Read-only check | `fourmeme verify` | Run config + events (last 50 blocks) |

Chain: **BSC only** (Arbitrum/Base not supported).

### Create token (full flow)

**Agent interaction: ask about tax token and parameters before creating**

When the user asks to create a token, the Agent must ask in this order:

1. **Tax token or not?**  
   Ask: “Do you want to create a tax (Tax) token? If not, it will be a normal token.”  
   - If **no**: use `fourmeme create-api <imagePath> <name> <shortName> <desc> <label>` (no sixth argument, no TAX_* env vars).  
   - If **yes**: continue to step 2.

2. **Tax parameters** (only when user chose tax token)  
   Ask for (and explain constraints; see “tokenTaxInfo parameters” table below):  
   - **feeRate**: Fee rate (%). **Only 1, 3, 5, or 10.**  
   - **burnRate**, **divideRate**, **liquidityRate**, **recipientRate**: Four percentages; **sum must be 100**.  
   - If **recipientRate > 0**: ask **recipientAddress**.  
   - **minSharing**: Minimum token balance to participate in dividends (in ether units, e.g. 100000, 1000000).

   Then either:  
   - **Option A**: Write `{ "tokenTaxInfo": { ... } }` to a JSON file and call `fourmeme create-api ... <path/to/tax.json>`.  
   - **Option B**: Set env vars TAX_TOKEN=1, TAX_FEE_RATE, TAX_BURN_RATE, TAX_DIVIDE_RATE, TAX_LIQUIDITY_RATE, TAX_RECIPIENT_RATE, TAX_RECIPIENT_ADDRESS (optional), TAX_MIN_SHARING, then run `fourmeme create-api <imagePath> <name> <shortName> <desc> <label>` (no sixth argument).

**Step 1 – Config (optional)**  
```bash
fourmeme config
```

**Step 2 – Create token (API)**  
Requires `PRIVATE_KEY`. Outputs `createArg` and `signature` (hex).

| Position | Argument | Description |
|----------|----------|-------------|
| 1 | `imagePath` | Local image path (jpeg/png/gif/bmp/webp) |
| 2 | `name` | Token full name |
| 3 | `shortName` | Token symbol (e.g. MTK) |
| 4 | `desc` | Description text |
| 5 | `label` | Category label (see list below) |
| 6 | `[taxOptions.json]` | Optional; path to JSON containing `tokenTaxInfo` for tax token |

**Label** (exactly one): `Meme` \| `AI` \| `Defi` \| `Games` \| `Infra` \| `De-Sci` \| `Social` \| `Depin` \| `Charity` \| `Others`.

**Optional env vars** (defaults if omitted): `WEB_URL`, `TWITTER_URL`, `TELEGRAM_URL`; `PRE_SALE` (default `"0"`); `FEE_PLAN` (`"true"` = AntiSniperFeeMode, default `"false"`).

```bash
fourmeme create-api <imagePath> <name> <shortName> <desc> <label> [taxOptions.json]
# Example: fourmeme create-api ./logo.png MyToken MTK "Description" AI
# Tax: fourmeme create-api ./logo.png TaxToken TAX "Tax token" Meme tax.json
```

**Tax token**  
- **Option 1**: Last argument = path to JSON file with `{ "tokenTaxInfo": { ... } }`; fields see “tokenTaxInfo parameters” below.  
- **Option 2**: Env vars: `TAX_TOKEN=1`, `TAX_FEE_RATE` (1|3|5|10), `TAX_BURN_RATE` / `TAX_DIVIDE_RATE` / `TAX_LIQUIDITY_RATE` / `TAX_RECIPIENT_RATE` (sum = 100), `TAX_RECIPIENT_ADDRESS`, `TAX_MIN_SHARING` (e.g. 100000). See [references/token-tax-info.md](references/token-tax-info.md).

**tokenTaxInfo parameters** (required for tax token, via JSON or env):

| Field | Type | Description | Constraint |
|-------|------|-------------|------------|
| `feeRate` | number | Trading fee rate (%) | **Only** `1`, `3`, `5`, `10` |
| `burnRate` | number | Burn share (%) | Sum with next three = 100 |
| `divideRate` | number | Dividend share (%) | Same |
| `liquidityRate` | number | Liquidity share (%) | Same |
| `recipientRate` | number | Recipient share (%) | 0 if unused |
| `recipientAddress` | string | Recipient address | `""` if unused |
| `minSharing` | number | Min balance for dividend (ether units) | d×10ⁿ, n≥5, 1≤d≤9; e.g. 100000, 1000000 |

Example (5% fee, 20% burn, 30% dividend, 40% liquidity, 10% recipient):

```json
{
  "tokenTaxInfo": {
    "feeRate": 5,
    "burnRate": 20,
    "divideRate": 30,
    "liquidityRate": 40,
    "recipientRate": 10,
    "recipientAddress": "0x1234567890123456789012345678901234567890",
    "minSharing": 100000
  }
}
```

**Step 3 – Create token (chain)**  
```bash
fourmeme create-chain <createArgHex> <signatureHex>
# Or pipe: fourmeme create-api ... | fourmeme create-chain --
```

#### Full automated create flow

To **create and submit on-chain in one go**, the Agent should:

1. **Run create-api** to get signature data (same as Step 2 above; JSON with `createArg` and `signature`):  
   ```bash
   fourmeme create-api <imagePath> <name> <shortName> <desc> <label> [taxOptions.json]
   ```  
   Parse stdout JSON for `createArg` and `signature` (already hex strings).

2. **Run create-chain** with those two values:  
   ```bash
   fourmeme create-chain <createArgHex> <signatureHex>
   ```  
   This calls `TokenManager2.createToken(createArg, sign)` on BSC and outputs tx result / token address.

3. **Optional**: If the user said “create and go on-chain for me”, the Agent can run the two steps in sequence after collecting tax params, then summarize: success, `tokenAddress` / `requestId`, and main params (name, shortName, label, tax config).

### token-info

```bash
fourmeme token-info <tokenAddress>
```
On-chain query (Helper3); returns version, tokenManager, price, offers, etc.

### token-list / token-get / token-rankings (REST)

Four.meme REST API; use `Accept: application/json`; no login or cookie.

**Token list (filter / paginate)**  
```bash
fourmeme token-list [--orderBy=Hot] [--pageIndex=1] [--pageSize=30] [--tokenName=] [--symbol=] [--labels=] [--listedPancake=false]
```

**Token detail and trading info**  
```bash
fourmeme token-get <tokenAddress>
```
API: GET `/private/token/get/v2?address=...`

**Rankings**  
```bash
fourmeme token-rankings <orderBy> [--barType=HOUR24]
```
orderBy: `Time` (newest) | `ProgressDesc` | `TradingDesc` (24h volume; barType HOUR24) | `Hot` | `Graduated`. Output JSON.

### quote-buy / quote-sell (estimate only; no transaction)

```bash
fourmeme quote-buy <tokenAddress> <amountWei> [fundsWei]
fourmeme quote-sell <tokenAddress> <amountWei>
```
- amountWei: token amount (use 0 when buying by quote amount); fundsWei: quote to spend (omit or 0 when buying by token amount).

### buy / sell (execute; requires PRIVATE_KEY)

**Buy** (one of):  
- By amount: `fourmeme buy <token> amount <amountWei> <maxFundsWei>` (spend at most maxFundsWei to buy amountWei tokens).  
- By funds: `fourmeme buy <token> funds <fundsWei> <minAmountWei>` (spend fundsWei quote, receive at least minAmountWei tokens).

**Sell**: Script performs approve then sell.  
```bash
fourmeme sell <tokenAddress> <amountWei> [minFundsWei]
```
- minFundsWei optional (slippage: minimum quote received). V2 tokens only.

### send (send BNB or ERC20 to an address)

Send **native BNB** or **ERC20** from the current wallet (PRIVATE_KEY) to a given address (BSC).

```bash
fourmeme send <toAddress> <amountWei> [tokenAddress]
```

| Argument | Description |
|----------|-------------|
| `toAddress` | Recipient address (0x...) |
| `amountWei` | Amount in wei (BNB or token smallest unit) |
| `tokenAddress` | Optional. Omit or use `BNB` / `0x0` for native BNB; otherwise ERC20 contract address |

- Env: `PRIVATE_KEY`. Optional: `BSC_RPC_URL`.
- Output: JSON with `txHash`, `to`, `amountWei`, `native` (whether BNB).

Examples:
```bash
# Send 0.1 BNB (1e17 wei)
fourmeme send 0x1234...abcd 100000000000000000

# Send 1000 units of an ERC20 (18 decimals)
fourmeme send 0x1234...abcd 1000000000000000000000 0xTokenContractAddress
```

### EIP-8004 identity NFT (register and query)

EIP-8004 identity NFT: **register** (mint) and **query balance**. Default contract: `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` (BSC). Override with env `8004_NFT_ADDRESS` or `EIP8004_NFT_ADDRESS`.

**Register**: Requires `PRIVATE_KEY`. User provides name (required), image URL (optional), description (optional). CLI builds EIP-8004 payload (type, name, description, image, active, supportedTrust), encodes as `data:application/json;base64,<base64>` for `agentURI`, and calls `register(string agentURI)`.

```bash
fourmeme 8004-register <name> [imageUrl] [description]
```

| Argument | Description |
|----------|-------------|
| `name` | Required. Identity name |
| `imageUrl` | Optional. Avatar/image URL (must be publicly reachable) |
| `description` | Optional. Description |

- Output JSON: `txHash`, `agentId` (from event), `agentURI`.

**Query**: Read-only; number of 8004 NFTs held by an address.

```bash
fourmeme 8004-balance <ownerAddress>
```

- Output JSON: `owner`, `balance`.

Examples:
```bash
fourmeme 8004-register "myagent" "https://example.com/logo.png" "My agent description"
fourmeme 8004-balance 0x1234567890123456789012345678901234567890
```

### events (TokenManager2 V2 only)

Fetch TokenCreate, TokenPurchase, TokenSale, LiquidityAdded on BSC.

```bash
fourmeme events <fromBlock> [toBlock]
```
Omit toBlock for latest. Real-time subscription: [references/event-listening.md](references/event-listening.md).

### tax-info (TaxToken fee/tax)

Only for TaxToken (creatorType 5).

```bash
fourmeme tax-info <tokenAddress>
```
See [references/tax-token-query.md](references/tax-token-query.md).

## API and config reference

- **Token detail (REST)**: `GET /private/token/get?address=<token>`, `GET /private/token/getById?id=<requestId>` (requestId from TokenCreate event). Response may include `data.aiCreator` (token created by Agent). List/rankings: [references/token-query-api.md](references/token-query-api.md).
- **Agent Creator / Agent wallets**: On-chain — token template bit 85 for “created by agent”; AgentIdentifier contract (`isAgent(wallet)`) on BSC to identify agent wallets. See [references/agent-creator-and-wallets.md](references/agent-creator-and-wallets.md) and [references/contract-addresses.md](references/contract-addresses.md).
- **raisedToken**: `GET https://four.meme/meme-api/v1/public/config` for current raisedToken; use as-is in create body; do not modify its fields.

## References

| Document | Description |
|----------|-------------|
| [contract-addresses.md](references/contract-addresses.md) | TokenManager / TokenManager2 / Helper3 addresses (BSC) |
| [api-create-token.md](references/api-create-token.md) | Create token API (nonce / login / upload / create) |
| [create-token-scripts.md](references/create-token-scripts.md) | Create token script flow and examples |
| [token-tax-info.md](references/token-tax-info.md) | Tax token tokenTaxInfo parameters and constraints |
| [token-query-api.md](references/token-query-api.md) | Token list / detail / rankings REST API |
| [errors.md](references/errors.md) | buy/sell error codes; X Mode / TaxToken / AntiSniperFeeMode; Agent Creator |
| [agent-creator-and-wallets.md](references/agent-creator-and-wallets.md) | Token created by Agent Creator; AgentIdentifier contract and Agent wallets |
| [execute-trade.md](references/execute-trade.md) | Execute buy/sell CLI and contract usage |
| [event-listening.md](references/event-listening.md) | TokenManager2 event listening (V2) |
| [tax-token-query.md](references/tax-token-query.md) | TaxToken on-chain fee/tax query (tax-info) |
| **Official four.meme API and contracts (online)**: [Protocol Integration](https://four-meme.gitbook.io/four.meme/brand/protocol-integration) | API documents, ABIs: TokenManager, TokenManager2, Helper3, TaxToken, AgentIdentifier, etc. |
