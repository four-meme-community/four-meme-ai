#!/usr/bin/env node
/**
 * Four.meme - submit createToken tx on BSC (TokenManager2.createToken).
 * Uses createArg and signature from create-token-api.ts output.
 *
 * Usage:
 *   npx tsx create-token-chain.ts <createArgHex> <signatureHex>
 *   echo '{"createArg":"0x...","signature":"0x..."}' | npx tsx create-token-chain.ts --
 *
 * Env: PRIVATE_KEY. Optional: BSC_RPC_URL.
 */

import { createWalletClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { bsc } from 'viem/chains';

const TOKEN_MANAGER2_BSC = '0x5c952063c7fc8610FFDB798152D69F0B9550762b' as const;

const ABI = parseAbi([
  'function createToken(bytes args, bytes signature) payable',
]);

function toHex(s: string): `0x${string}` {
  if (s.startsWith('0x')) return s as `0x${string}`;
  if (/^[0-9a-fA-F]+$/.test(s)) return ('0x' + s) as `0x${string}`;
  const buf = Buffer.from(s, 'base64');
  return ('0x' + buf.toString('hex')) as `0x${string}`;
}

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('Set PRIVATE_KEY');
    process.exit(1);
  }
  const pk = privateKey.startsWith('0x') ? (privateKey as `0x${string}`) : (`0x${privateKey}` as `0x${string}`);
  const account = privateKeyToAccount(pk);

  let createArgHex: `0x${string}`;
  let signatureHex: `0x${string}`;

  const arg1 = process.argv[2];
  if (arg1 === '--' || !arg1) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
    const json = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    createArgHex = toHex(json.createArg);
    signatureHex = toHex(json.signature);
  } else {
    const arg2 = process.argv[3];
    if (!arg2) {
      console.error('Usage: npx tsx create-token-chain.ts <createArgHex> <signatureHex>');
      console.error('   or: echo \'{"createArg":"0x...","signature":"0x..."}\' | npx tsx create-token-chain.ts --');
      process.exit(1);
    }
    createArgHex = toHex(arg1);
    signatureHex = toHex(arg2);
  }

  const rpcUrl = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org';
  const client = createWalletClient({
    account,
    chain: bsc,
    transport: http(rpcUrl),
  });

  const creationFeeWei = process.env.CREATION_FEE_WEI
    ? BigInt(process.env.CREATION_FEE_WEI)
    : 0n;

  const hash = await client.writeContract({
    address: TOKEN_MANAGER2_BSC,
    abi: ABI,
    functionName: 'createToken',
    args: [createArgHex, signatureHex],
    value: creationFeeWei,
  });

  console.log(JSON.stringify({ txHash: hash }, null, 2));
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
