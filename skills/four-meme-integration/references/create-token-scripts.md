# Create Token Scripts (Four.meme)

## One-shot flow

1. **get-public-config.ts** (optional)  
   Fetches `raisedToken` from `https://four.meme/meme-api/v1/public/config`. Use when building the create body manually.

2. **create-token-api.ts**  
   - Env: `PRIVATE_KEY`.  
   - Args: `imagePath`, `name`, `shortName`, `desc`, `label`.  
   - Optional env: `WEB_URL`, `TWITTER_URL`, `TELEGRAM_URL`, `PRE_SALE` (default `"0"`), `FEE_PLAN` (default `"false"`).  
   - Performs: nonce → login (signs `You are sign in Meme {nonce}`) → upload image → GET public config → POST create.  
   - Output: JSON `{ "createArg": "0x...", "signature": "0x..." }`.

3. **create-token-chain.ts**  
   - Env: same key for wallet; optional `BSC_RPC_URL`, `CREATION_FEE_WEI` (set if you need to attach extra BNB; default 0).  
   - Input: `createArg` and `signature` (hex) as args or JSON on stdin (`--`).  
   - Calls `TokenManager2.createToken(createArg, sign)` on BSC.

## Example (piped)

```bash
export PRIVATE_KEY=your_hex_private_key
npx tsx skills/four-meme-integration/scripts/create-token-api.ts ./logo.png MyToken MTK "My desc" AI \
  | npx tsx skills/four-meme-integration/scripts/create-token-chain.ts --
```

## Example (two steps)

```bash
export PRIVATE_KEY=your_hex_private_key
npx tsx skills/four-meme-integration/scripts/create-token-api.ts ./logo.png MyToken MTK "My desc" AI > create-out.json
npx tsx skills/four-meme-integration/scripts/create-token-chain.ts "$(jq -r .createArg create-out.json)" "$(jq -r .signature create-out.json)"
```

## Tax token

Pass a JSON file path as the last argument; the file must contain `tokenTaxInfo`. Example:

**tax-options.json**:
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

Requirements: `feeRate` must be 1, 3, 5, or 10; `burnRate + divideRate + liquidityRate + recipientRate = 100`. See [token-tax-info.md](token-tax-info.md).

```bash
npx tsx .../create-token-api.ts ./logo.png TaxToken TAX "Tax token" AI tax-options.json
```

You can also use env vars: `TAX_TOKEN=1`, `TAX_FEE_RATE=5`, `TAX_BURN_RATE=20`, `TAX_DIVIDE_RATE=30`, `TAX_LIQUIDITY_RATE=40`, `TAX_RECIPIENT_RATE=10`, `TAX_RECIPIENT_ADDRESS=0x...`, `TAX_MIN_SHARING=100000`.

Chain and Labels: see [SKILL.md](../SKILL.md) or [api-create-token.md](api-create-token.md).
