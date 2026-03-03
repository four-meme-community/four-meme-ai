#!/usr/bin/env node
/**
 * Four.meme - create token API flow (nonce → login → upload image → create).
 * Outputs createArg and signature (hex) for use with create-token-chain.ts.
 *
 * Usage:
 *   npx tsx create-token-api.ts <imagePath> <name> <shortName> <desc> <label> [taxOptions.json]
 *
 * Env: PRIVATE_KEY (wallet private key, no 0x prefix ok)
 * Optional env: WEB_URL, TWITTER_URL, TELEGRAM_URL, PRE_SALE ("0"), FEE_PLAN ("false")
 * Tax token: pass path to a JSON file with "tokenTaxInfo" as last arg, or set TAX_TOKEN=1 and
 *   TAX_FEE_RATE (1|3|5|10), TAX_BURN_RATE, TAX_DIVIDE_RATE, TAX_LIQUIDITY_RATE, TAX_RECIPIENT_RATE,
 *   TAX_RECIPIENT_ADDRESS, TAX_MIN_SHARING (e.g. 100000). burn+divide+liquidity+recipient must = 100.
 *
 * Labels: Meme | AI | Defi | Games | Infra | De-Sci | Social | Depin | Charity | Others
 */

import { privateKeyToAccount } from 'viem/accounts';
import { readFileSync, existsSync } from 'node:fs';
import { basename } from 'node:path';

const API_BASE = 'https://four.meme/meme-api/v1';
const NETWORK_CODE = 'BSC';

function toHex(value: string): string {
  if (value.startsWith('0x')) return value;
  if (/^[0-9a-fA-F]+$/.test(value)) return '0x' + value;
  const buf = Buffer.from(value, 'base64');
  return '0x' + buf.toString('hex');
}

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('Set PRIVATE_KEY');
    process.exit(1);
  }
  const pk = privateKey.startsWith('0x') ? (privateKey as `0x${string}`) : (`0x${privateKey}` as `0x${string}`);
  const account = privateKeyToAccount(pk);
  const address = account.address;

  const imagePath = process.argv[2];
  const name = process.argv[3];
  const shortName = process.argv[4];
  const desc = process.argv[5];
  const label = process.argv[6];
  const taxOptionsPath = process.argv[7]; // optional JSON file with tokenTaxInfo

  if (!imagePath || !name || !shortName || !desc || !label) {
    console.error(
      'Usage: npx tsx create-token-api.ts <imagePath> <name> <shortName> <desc> <label> [taxOptions.json]'
    );
    console.error('Example: npx tsx create-token-api.ts ./logo.png MyToken MTK "My desc" AI');
    console.error('Tax token: add path to JSON with tokenTaxInfo, or use TAX_* env vars (see SKILL.md).');
    process.exit(1);
  }
  if (!existsSync(imagePath)) {
    console.error('Image file not found:', imagePath);
    process.exit(1);
  }

  const validLabels = ['Meme', 'AI', 'Defi', 'Games', 'Infra', 'De-Sci', 'Social', 'Depin', 'Charity', 'Others'];
  const labelNorm = validLabels.find((l) => l.toLowerCase() === label.toLowerCase());
  if (!labelNorm) {
    console.error('Invalid label. Use one of:', validLabels.join(', '));
    process.exit(1);
  }
  const labelCanonical = labelNorm; // API 要求与列表完全一致（含大小写）

  // 1. Get nonce
  const nonceRes = await fetch(`${API_BASE}/private/user/nonce/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accountAddress: address,
      verifyType: 'LOGIN',
      networkCode: NETWORK_CODE,
    }),
  });
  const nonceData = await nonceRes.json();
  if (nonceData.code !== '0' && nonceData.code !== 0) {
    throw new Error('Nonce failed: ' + JSON.stringify(nonceData));
  }
  const nonce = nonceData.data;

  // 2. Sign and login
  const message = `You are sign in Meme ${nonce}`;
  const signature = await account.signMessage({ message });

  const loginRes = await fetch(`${API_BASE}/private/user/login/dex`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      region: 'WEB',
      langType: 'EN',
      loginIp: '',
      inviteCode: '',
      verifyInfo: {
        address,
        networkCode: NETWORK_CODE,
        signature,
        verifyType: 'LOGIN',
      },
      walletName: 'MetaMask',
    }),
  });
  const loginData = await loginRes.json();
  if (loginData.code !== '0' && loginData.code !== 0) {
    throw new Error('Login failed: ' + JSON.stringify(loginData));
  }
  const accessToken = loginData.data;

  // 3. Upload image
  const imageBuffer = readFileSync(imagePath);
  const form = new FormData();
  form.append('file', new Blob([imageBuffer]), basename(imagePath));

  const uploadRes = await fetch(`${API_BASE}/private/token/upload`, {
    method: 'POST',
    headers: { 'meme-web-access': accessToken },
    body: form as unknown as BodyInit,
  });
  const uploadData = await uploadRes.json();
  if (uploadData.code !== '0' && uploadData.code !== 0) {
    throw new Error('Upload failed: ' + JSON.stringify(uploadData));
  }
  const imgUrl = uploadData.data;

  // 4. Public config for raisedToken (data[]: symbol, symbolAddress, totalBAmount, status=PUBLISH|INIT, ...)
  const configRes = await fetch(`${API_BASE}/public/config`);
  if (!configRes.ok) {
    throw new Error('Public config request failed: ' + configRes.status + ' ' + configRes.statusText);
  }
  const configData = await configRes.json();
  if (configData.code !== '0' && configData.code !== 0) {
    throw new Error('Invalid public config response: ' + JSON.stringify(configData));
  }
  const symbols = configData.data;
  if (!Array.isArray(symbols) || symbols.length === 0) {
    throw new Error('Invalid public config (no raisedToken): ' + JSON.stringify(configData));
  }
  // Prefer BNB with status PUBLISH for BSC; else first PUBLISH; else first item
  const published = symbols.filter((c: { status?: string }) => c.status === 'PUBLISH');
  const list = published.length > 0 ? published : symbols;
  const config =
    list.find((c: { symbol?: string }) => c.symbol === 'BNB') ?? list[0];
  const raisedToken = config;
  if (!raisedToken || !raisedToken.symbol) {
    throw new Error('Invalid public config (no raisedToken): ' + JSON.stringify(configData));
  }

  // 5. Build create body and optional tokenTaxInfo
  // raisedAmount / totalSupply / saleRate 等固定参数从 raisedToken 或文档固定值对齐 API-CreateToken.02-02-2026.md
  const launchTime = Date.now();
  const totalSupply =
    typeof (raisedToken as { totalAmount?: string | number }).totalAmount !== 'undefined'
      ? Number((raisedToken as { totalAmount?: string | number }).totalAmount)
      : 1000000000;
  const raisedAmount =
    typeof (raisedToken as { totalBAmount?: string | number }).totalBAmount !== 'undefined'
      ? Number((raisedToken as { totalBAmount?: string | number }).totalBAmount)
      : 24;
  const body: Record<string, unknown> = {
    name,
    shortName,
    desc,
    totalSupply,
    raisedAmount,
    saleRate:
      typeof (raisedToken as { saleRate?: string | number }).saleRate !== 'undefined'
        ? Number((raisedToken as { saleRate?: string | number }).saleRate)
        : 0.8,
    reserveRate: 0,
    imgUrl,
    raisedToken,
    launchTime,
    funGroup: false,
    label: labelCanonical,
    lpTradingFee: 0.0025,
    webUrl: process.env.WEB_URL ?? '',
    twitterUrl: process.env.TWITTER_URL ?? '',
    telegramUrl: process.env.TELEGRAM_URL ?? '',
    preSale: process.env.PRE_SALE ?? '0',
    clickFun: false,
    symbol: (raisedToken as { symbol: string }).symbol,
    dexType: 'PANCAKE_SWAP',
    rushMode: false,
    onlyMPC: false,
    feePlan: process.env.FEE_PLAN === 'true',
  };

  let tokenTaxInfo: Record<string, unknown> | null = null;
  if (taxOptionsPath && taxOptionsPath.endsWith('.json') && existsSync(taxOptionsPath)) {
    const taxOpts = JSON.parse(readFileSync(taxOptionsPath, 'utf8'));
    if (taxOpts.tokenTaxInfo && typeof taxOpts.tokenTaxInfo === 'object') {
      tokenTaxInfo = taxOpts.tokenTaxInfo as Record<string, unknown>;
    }
  }
  if (!tokenTaxInfo && process.env.TAX_TOKEN === '1') {
    const feeRate = Number(process.env.TAX_FEE_RATE ?? 5);
    const burnRate = Number(process.env.TAX_BURN_RATE ?? 0);
    const divideRate = Number(process.env.TAX_DIVIDE_RATE ?? 0);
    const liquidityRate = Number(process.env.TAX_LIQUIDITY_RATE ?? 100);
    const recipientRate = Number(process.env.TAX_RECIPIENT_RATE ?? 0);
    const recipientAddress = process.env.TAX_RECIPIENT_ADDRESS ?? '';
    const minSharing = Number(process.env.TAX_MIN_SHARING ?? 100000);
    const sum = burnRate + divideRate + liquidityRate + recipientRate;
    if (sum !== 100) {
      throw new Error(`Tax rates must sum to 100 (burn+divide+liquidity+recipient). Got ${sum}.`);
    }
    if (![1, 3, 5, 10].includes(feeRate)) {
      throw new Error('TAX_FEE_RATE must be 1, 3, 5, or 10.');
    }
    tokenTaxInfo = {
      feeRate,
      burnRate,
      divideRate,
      liquidityRate,
      recipientRate,
      recipientAddress,
      minSharing,
    };
  }
  if (tokenTaxInfo) {
    body.tokenTaxInfo = tokenTaxInfo;
  }

  const createRes = await fetch(`${API_BASE}/private/token/create`, {
    method: 'POST',
    headers: {
      'meme-web-access': accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const createData = await createRes.json();
  if (createData.code !== '0' && createData.code !== 0) {
    throw new Error('Create API failed: ' + JSON.stringify(createData));
  }
  const { createArg: rawArg, signature: rawSig } = createData.data;
  const createArgHex = toHex(rawArg);
  const signatureHex = toHex(rawSig);

  const out = { createArg: createArgHex, signature: signatureHex };
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
