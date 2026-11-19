# OpenFour internal-market trading (BSC)

OpenFour tokens trade through `OpenFourCore` during Vault phase `Trading (1)`. These commands use `OpenFourTools` estimates, check the token's Core runtime, Vault phase and preset status, apply slippage, and send the Core transaction. They do not route migrated tokens through an external DEX.

## Config

Save a JSON file with integer base-unit amounts:

```json
{
  "token": "0x1111111111111111111111111111111111111111",
  "trader": "0x2222222222222222222222222222222222222222",
  "side": "buy",
  "mode": "budget",
  "amountWei": "10000000000000000",
  "slippageBps": 100,
  "settlement": "native",
  "proof": "0x"
}
```

- `side`: `buy` or `sell`. Buy `mode` is `amount` (exact meme-token amount) or `budget` (maximum spend). Sell uses `amount`.
- `amountWei`: meme token base units for amount mode; quote-asset base units for quote budget; BNB wei for native budget.
- `settlement`: `quote` uses the token's ERC20 quote asset (including WBNB); `native` uses BNB; `wrappedNative` is available for sells and returns WBNB. For non-WBNB quotes, native and wrapped-native settlement require the Core ZapRouter route.
- `slippageBps`: integer from 0 to 9999. Exact buys increase the payment ceiling; budget buys decrease minimum token output; sells decrease minimum proceeds.
- `trader`: required for read-only quotes because some presets use trader-specific rules. Execution derives the wallet from `PRIVATE_KEY` and checks that it matches this field when present.
- `proof`: optional hex bytes, default `0x`. Provide the preset-specific proof if its trade rules require one.

## Commands

```bash
fourmeme openfour-trade-quote trade.json
fourmeme openfour-trade trade.json
```

`openfour-trade-quote` is read-only and prints the estimate, Core call, transaction value, limits and required approval. `openfour-trade` obtains a fresh estimate, approves exactly the necessary ERC20 amount if allowance is low, simulates the Core call, submits it, and waits for the receipt. It may send an approval transaction even if the later trade simulation fails. Check the quote and transaction limits before execution.

The internal market only accepts phase `Trading (1)`. When a token reaches `Migrated (3)` or another non-trading phase, these commands stop; use a separately verified DEX route for migrated tokens.

See the [official OpenFour integration guide](https://github.com/four-meme-community/openfour-docs/blob/main/docs/integration-guide.md) for settlement options, proofs, and migration routes.
