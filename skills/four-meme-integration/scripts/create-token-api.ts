#!/usr/bin/env node
/**
 * Four.meme - create token API flow (nonce → login → upload image → create).
 * Outputs createArg and signature (hex) for use with create-token-chain.ts.
 *
 * Usage: all options as --key=value
 *   npx tsx create-token-api.ts --image=./logo.png --name=MyToken --short-name=MTK --desc="My desc" --label=AI [options]
 *
 * Required: --image= --name= --short-name= --desc= --label=
 * Optional: --web-url= --twitter-url= --telegram-url= (omit if empty); --pre-sale=0 (in BNB/ether, e.g. 0.001); --fee-plan=false --tax-options=<path>
 * Tax token: --tax-options=tax.json or --tax-token --tax-fee-rate=5 ... (burn+divide+liquidity+recipient=100)
 * Labels: Meme | AI | Defi | Games | Infra | De-Sci | Social | Depin | Charity | Others
 * Env: PRIVATE_KEY
 */

import { createPublicClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { bsc } from 'viem/chains';
import { readFileSync, existsSync } from 'node:fs';
import { basename } from 'node:path';

const API_BASE = 'https://four.meme/meme-api/v1';
const TOKEN_MANAGER2_BSC = '0x5c952063c7fc8610FFDB798152D69F0B9550762b' as const;
const TM2_ABI = parseAbi([
  'function _launchFee() view returns (uint256)',
  'function _tradingFeeRate() view returns (uint256)',
]);
const NETWORK_CODE = 'BSC';

/** Get option from argv: --key=value or --key value; fallback to env (key as UPPER_SNAKE). */
function getOpt(key: string, defaultValue: string): string {
  const prefix = key + '=';
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === key && i + 1 < process.argv.length) return process.argv[i + 1];
    if (arg.startsWith(prefix)) return arg.slice(prefix.length);
  }
  return process.env[key.replace(/-/g, '_').toUpperCase()] ?? defaultValue;
}

/** Get boolean option from argv: --fee-plan or --fee-plan=true; fallback to env. */
function getOptBool(key: string, defaultValue: boolean): boolean {
  const prefix = key + '=';
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === key) return true;
    if (arg.startsWith(prefix)) {
      const v = arg.slice(prefix.length).toLowerCase();
      return v === '1' || v === 'true' || v === 'yes';
    }
  }
  const envKey = key.replace(/-/g, '_').toUpperCase();
  if (process.env[envKey] !== undefined) {
    const v = process.env[envKey]!.toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
  }
  return defaultValue;
}

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

  const imagePath = getOpt('--image', '');
  const name = getOpt('--name', '');
  const shortName = getOpt('--short-name', '');
  const desc = getOpt('--desc', '');
  const label = getOpt('--label', '');
  const taxOptionsPath = getOpt('--tax-options', '');

  if (!imagePath || !name || !shortName || !desc || !label) {
    console.error(
      'Usage: npx tsx create-token-api.ts --image=<path> --name= --short-name= --desc= --label= [options]'
    );
    console.error('Example: npx tsx create-token-api.ts --image=./logo.png --name=MyToken --short-name=MTK --desc="My desc" --label=AI');
    console.error('Required: --image= --name= --short-name= --desc= --label=');
    console.error('Optional: --web-url= --twitter-url= --telegram-url= --pre-sale=0 --fee-plan=false --tax-options=<path>');
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
  const labelCanonical = labelNorm; // API expects exact label from list (case-sensitive)

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
  // raisedAmount / totalSupply / saleRate from raisedToken or docs (API-CreateToken)
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
    preSale: getOpt('--pre-sale', '0'),
    clickFun: false,
    symbol: (raisedToken as { symbol: string }).symbol,
    dexType: 'PANCAKE_SWAP',
    rushMode: false,
    onlyMPC: false,
    feePlan: getOptBool('--fee-plan', false),
  };
  const webUrl = getOpt('--web-url', '');
  const twitterUrl = getOpt('--twitter-url', '');
  const telegramUrl = getOpt('--telegram-url', '');
  if (webUrl != null && webUrl !== '') body.webUrl = webUrl;
  if (twitterUrl != null && twitterUrl !== '') body.twitterUrl = twitterUrl;
  if (telegramUrl != null && telegramUrl !== '') body.telegramUrl = telegramUrl;

  let tokenTaxInfo: Record<string, unknown> | null = null;
  if (taxOptionsPath && existsSync(taxOptionsPath)) {
    const taxOpts = JSON.parse(readFileSync(taxOptionsPath, 'utf8'));
    if (taxOpts.tokenTaxInfo && typeof taxOpts.tokenTaxInfo === 'object') {
      tokenTaxInfo = taxOpts.tokenTaxInfo as Record<string, unknown>;
    }
  }
  const taxFromCli =
    getOptBool('--tax-token', false) ||
    getOpt('--tax-fee-rate', '') !== '' ||
    process.env.TAX_TOKEN === '1';
  if (!tokenTaxInfo && taxFromCli) {
    const feeRate = Number(getOpt('--tax-fee-rate', '5'));
    const burnRate = Number(getOpt('--tax-burn-rate', '0'));
    const divideRate = Number(getOpt('--tax-divide-rate', '0'));
    const liquidityRate = Number(getOpt('--tax-liquidity-rate', '100'));
    const recipientRate = Number(getOpt('--tax-recipient-rate', '0'));
    const recipientAddress = getOpt('--tax-recipient-address', '');
    const minSharing = Number(getOpt('--tax-min-sharing', '100000'));
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

  // Estimate required value (CREATION_FEE_WEI) for createToken tx
  const rpcUrl = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org';
  const client = createPublicClient({ chain: bsc, transport: http(rpcUrl) });
  const launchFee = await client.readContract({
    address: TOKEN_MANAGER2_BSC,
    abi: TM2_ABI,
    functionName: '_launchFee',
  });
  const preSaleStr = String(body.preSale ?? '0');
  // API preSale is in ether (BNB); convert to wei for value calculation
  const presaleWei = BigInt(Math.round(parseFloat(preSaleStr || '0') * 1e18));
  const quoteIsBnb = (raisedToken as { symbol?: string }).symbol === 'BNB';
  let requiredValueWei = launchFee;
  if (presaleWei > 0n && quoteIsBnb) {
    const feeRate = await client.readContract({
      address: TOKEN_MANAGER2_BSC,
      abi: TM2_ABI,
      functionName: '_tradingFeeRate',
    });
    const tradingFee = (presaleWei * feeRate) / 10000n;
    requiredValueWei = launchFee + presaleWei + tradingFee;
  }
  const creationFeeWei = requiredValueWei.toString();

  const out = { createArg: createArgHex, signature: signatureHex, creationFeeWei };
  console.log(JSON.stringify(out, null, 2));
  console.error(
    `\n→ For create-token-chain pass --value=${creationFeeWei} (or more).`
  );
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
