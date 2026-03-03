# Token query REST API (Four.meme)

Base: `https://four.meme/meme-api/v1`. Requests need `Accept: application/json`; POST needs `Content-Type: application/json`. No login or cookie required.

## 1. Token list (filter / paginate)

**GET** `/private/token/query`

| Parameter | Description | Example |
|-----------|-------------|---------|
| orderBy | Sort order | Hot, Time, ... |
| tokenName | Filter by token name | Empty or name |
| symbol | Filter by symbol | Empty or symbol |
| labels | Filter by label | Empty or label |
| listedPancake | Listed on Pancake | false / true |
| pageIndex | Page number | 1 |
| pageSize | Page size | 30 |

CLI: `fourmeme token-list [--orderBy=Hot] [--pageIndex=1] [--pageSize=30] [--tokenName=] [--symbol=] [--labels=] [--listedPancake=false]`

## 2. Token detail and trading info

**GET** `/private/token/get/v2?address=<tokenAddress>`

CLI: `fourmeme token-get <tokenAddress>`

## 3. Rankings (advanced)

**POST** `/private/token/query/advanced`  
Body (JSON): `{ "orderBy": "<value>" }` or `{ "orderBy": "TradingDesc", "barType": "HOUR24" }`

| orderBy | Description |
|---------|-------------|
| Time | Newest tokens |
| ProgressDesc | Fundraise progress ranking |
| TradingDesc | 24h trading volume (can use barType: HOUR24) |
| Hot | Hot ranking |
| Graduated | Recently graduated / launched |

CLI: `fourmeme token-rankings <orderBy> [--barType=HOUR24]`
