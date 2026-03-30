# Token query REST API (Four.meme)

Base: `https://four.meme/meme-api/v1`. Requests need `Accept: application/json`; POST needs `Content-Type: application/json`. No login or cookie required.

## 1. Token list (filter / paginate)

**POST** `/public/token/search`  
JSON body: `type`, `listType`, `pageIndex`, `pageSize`, `status`, `sort`, optional `keyword`, `symbol`, `tag` (array), `version`.

| Parameter | Description |
|-----------|-------------|
| type | Ranking sort context: NEW, HOT, PROGRESS, VOL, LAST, CAP, DEX, BURN, … |
| listType | NOR, NOR_DEX, BIN, USD1, BIN_DEX, USD1_DEX, ADV |
| status | PUBLISH, TRADE, ALL |
| sort | DESC, ASC |
| keyword | Search keyword |
| symbol | Quote symbol (e.g. BNB, USDT) |
| tag | Label filters (e.g. Meme, AI) |
| version | V9 (tax), V10 (AI); omit for all |

CLI: `fourmeme token-list` — legacy flags still map to the above (e.g. `--orderBy` → `type`, `--tokenName` → `keyword`, `--labels` → `tag`, `--listedPancake=false` → `status=PUBLISH`). See script header for full list.

## 2. Token detail and trading info

**GET** `/private/token/get/v2?address=<tokenAddress>`

CLI: `fourmeme token-get <tokenAddress>`

## 3. Rankings

**POST** `/public/token/ranking`  
JSON body: `type` (required RankingType), `pageSize`, optional `rankingKind`, `version`, `symbol`, `minCap`, `maxCap`, `minVol`, `maxVol`, `minHold`, `maxHold`.

| Legacy CLI orderBy | Maps to type |
|--------------------|--------------|
| Time | NEW |
| ProgressDesc | PROGRESS |
| TradingDesc | VOL_DAY_1 (default); `--barType` selects VOL_HOUR_1, VOL_HOUR_4, VOL_MIN_30, VOL_MIN_5, … |
| Hot | HOT |
| Graduated | DEX |

You may also pass a native `type` as the first argument (e.g. `VOL_DAY_1`, `CAP`, `BURN`).

CLI: `fourmeme token-rankings <orderBy|type> [--barType=HOUR24] [--pageSize=20] [--symbol=] [--version=] …`
