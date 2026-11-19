# OpenFour token creation (BSC mainnet)

OpenFour is a separate creation flow from classic Four.Meme. Its template API returns signed `createArg` bytes for `OpenFourCore.createToken`. The CLI discovers Core and Tools through the [OpenFour Registry](https://github.com/four-meme-community/openfour-docs/blob/main/docs/integration-guide.md) and reads module schemas from Tools. Do not pass OpenFour API output to the classic `create-chain` command.

## Inspect a template before creating

```bash
fourmeme openfour-templates
fourmeme openfour-schema <templateId> [quoteSymbol]
```

The schema output includes the selected quote configuration and six module schemas. `templateId` is the business API's name for the on-chain `presetId`. `shortName` is the new token's ticker; `quoteSymbol` selects the asset used to raise funds. Omit `quoteSymbol` to use the first returned quote configuration.

## Creation config

Save a JSON file, for example `openfour.json`:

```json
{
  "templateId": "<id from openfour-templates>",
  "name": "Example Token",
  "shortName": "EXAMPLE",
  "desc": "Example description",
  "imagePath": "./logo.png",
  "quoteSymbol": "<symbol from openfour-schema>",
  "presaleQuote": "0",
  "feePlan": true,
  "fields": {
    "token": {},
    "vault": {},
    "curve": {},
    "trade": {},
    "migrate": {},
    "customData": {}
  }
}
```

Use `imgUrl` instead of `imagePath` if the image is already hosted. An `imagePath` is resolved relative to the config file. The CLI fills `totalSupply`, `saleAmount`, and `raisedAmount` from the selected template config unless you specify them in the JSON file. Put each module parameter under its module name in `fields`; the CLI uses on-chain defaults, checks required fields, and ABI-encodes one tuple per module. Numeric fields are decimal strings in the units shown by the schema (`decimals` is applied during encoding). Advanced template-specific API fields may be placed in `extraPayload`; known creation fields are still controlled by the top-level config.

Some presets require extra setup, such as a tax vault selection or a pre-mined Uni V4 hook salt. Inspect their schema and the [official OpenFour examples](https://github.com/four-meme-community/openfour-docs/blob/main/scripts/README.en.md) before using them. This CLI encodes supplied module values; it does not auto-select vaults or mine hook salts.

## Preview and submit

```bash
fourmeme openfour-preview openfour.json
fourmeme openfour-create-api openfour.json > signed-openfour.json
fourmeme openfour-quote signed-openfour.json
fourmeme openfour-create-chain signed-openfour.json
# Or use one command for the API and chain steps:
# First add "maxCreateFeeWei": "<reviewed integer wei cap>" to openfour.json.
fourmeme openfour-create-instant openfour.json
```

`openfour-preview` is read-only and does not upload the image; its `imgUrl` field is a placeholder when `imagePath` is used. `openfour-create-api` uses `PRIVATE_KEY` to sign in and writes to the Four.Meme creation API, but sends no blockchain transaction. `openfour-quote` decodes the API-signed args to display the exact creation fee, presale budget, native value, and whether ERC20 approval may be needed; it is read-only. `openfour-create-chain` simulates and submits `OpenFourCore.createToken` on BSC; when the presale quote is ERC20, it may first send an approval transaction. The CLI computes native value from the API-signed `createArg`, waits for the receipt, and takes the final token address from `TokenCreated` when present. `BSC_RPC_URL` may override the default PublicNode BSC endpoint.

`openfour-create-instant` requires `maxCreateFeeWei` in the config and stops before the chain transaction if the API-signed creation fee exceeds it. Its signed API response is printed to stderr so it can be used with the split flow if the chain step fails.

Creation and ERC20 approval spend gas and may spend the configured creation fee and presale budget. Review the template, quote asset, config, and fee before running either creation command. The split flow allows review of the signed amounts before the on-chain step. Agents must follow the agreement and confirmation rules in [SKILL.md](../SKILL.md).
