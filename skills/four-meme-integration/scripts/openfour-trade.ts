import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createPublicClient, createWalletClient, getAddress, http, isAddress, isHex, parseAbi, zeroAddress, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { bsc } from 'viem/chains';
import { getOpenFourContracts, OPENFOUR_REGISTRY_BSC } from './openfour.js';
import { OPENFOUR_TRADE_CORE_ABI, OPENFOUR_TRADE_REGISTRY_ABI, OPENFOUR_TRADE_TOOLS_ABI, OPENFOUR_TRADE_VAULT_ABI } from './openfour-trade-abi.js';

const RPC = 'https://bsc-rpc.publicnode.com';
const ERC20 = parseAbi([
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
]);
const BPS = 10_000n;
const RECEIVE_WRAPPED = 1n;
const ZAP_NATIVE = 2n;

export interface TradeInput {
  token: string;
  side: 'buy' | 'sell';
  mode?: 'amount' | 'budget';
  amountWei: string;
  slippageBps: number;
  settlement: 'quote' | 'native' | 'wrappedNative';
  trader?: string;
  proof?: Hex;
}

export function loadTradeInput(file: string): TradeInput {
  const raw = JSON.parse(readFileSync(resolve(file), 'utf8')) as TradeInput;
  if (!isAddress(raw.token)) throw new Error('token must be an EVM address');
  if (raw.side !== 'buy' && raw.side !== 'sell') throw new Error('side must be buy or sell');
  if (raw.side === 'buy' && raw.mode !== 'amount' && raw.mode !== 'budget') throw new Error('buy mode must be amount or budget');
  if (raw.side === 'sell' && raw.mode !== undefined && raw.mode !== 'amount') throw new Error('sell mode must be amount');
  if (!/^\d+$/.test(raw.amountWei) || BigInt(raw.amountWei) === 0n) throw new Error('amountWei must be a positive integer string');
  if (!Number.isInteger(raw.slippageBps) || raw.slippageBps < 0 || raw.slippageBps >= 10_000) throw new Error('slippageBps must be an integer from 0 to 9999');
  if (!['quote', 'native', 'wrappedNative'].includes(raw.settlement)) throw new Error('settlement must be quote, native or wrappedNative');
  if (raw.side === 'buy' && raw.settlement === 'wrappedNative') throw new Error('wrappedNative settlement is only for sells; use quote to pay with WBNB');
  if (raw.trader !== undefined && !isAddress(raw.trader)) throw new Error('trader must be an EVM address');
  if (raw.proof !== undefined && !isHex(raw.proof)) throw new Error('proof must be hex bytes');
  return raw;
}

export function applyTradeSlippage(amount: bigint, bps: number, direction: 'up' | 'down') {
  if (!Number.isInteger(bps) || bps < 0 || bps >= 10_000) throw new Error('Invalid slippageBps');
  // Round payment ceilings up, otherwise a one-wei underpayment can revert.
  return direction === 'up'
    ? (amount * (BPS + BigInt(bps)) + BPS - 1n) / BPS
    : amount * (BPS - BigInt(bps)) / BPS;
}

type Estimate = { curveQuote: bigint; totalFee: bigint; userPays: bigint; userReceives: bigint; tokenAmount: bigint; executionPrice: bigint };

export function buildTradePlan(input: TradeInput, estimate: Estimate, quoteIsWrapped: boolean, nativeEstimate?: Estimate) {
  const amount = BigInt(input.amountWei);
  const proof = input.proof ?? '0x';
  if (estimate.tokenAmount === 0n) throw new Error('Trade estimate returned zero executable tokens');
  if (input.side === 'buy' && input.mode === 'amount') {
    if (estimate.userPays === 0n) throw new Error('Buy estimate returned zero payment');
    const maxQuotePayWei = applyTradeSlippage(estimate.userPays, input.slippageBps, 'up');
    const maxNativePayWei = input.settlement === 'native'
      ? applyTradeSlippage(quoteIsWrapped ? estimate.userPays : nativeEstimate!.userPays, input.slippageBps, 'up') : 0n;
    return { method: 'buy' as const, args: [input.token as Address, amount, maxQuotePayWei, input.settlement === 'native' && !quoteIsWrapped ? ZAP_NATIVE : 0n, proof] as const,
      value: maxNativePayWei, approvalToken: input.settlement === 'quote' ? 'quote' as const : null,
      approvalAmount: input.settlement === 'quote' ? maxQuotePayWei : 0n,
      limitWei: maxQuotePayWei, nativeLimitWei: maxNativePayWei, limitKind: 'maxQuotePayWei' as const };
  }
  if (input.side === 'buy') {
    const nativeZap = input.settlement === 'native' && !quoteIsWrapped;
    const maxQuotePayWei = nativeZap ? estimate.curveQuote + estimate.totalFee : amount;
    const minAmountOutWei = applyTradeSlippage(estimate.tokenAmount, input.slippageBps, 'down');
    if (maxQuotePayWei === 0n || minAmountOutWei === 0n) throw new Error('Budget estimate produced zero trade limit');
    return { method: 'buyByBudget' as const, args: [input.token as Address, maxQuotePayWei, minAmountOutWei, nativeZap ? ZAP_NATIVE : 0n, proof] as const,
      value: input.settlement === 'native' ? amount : 0n, approvalToken: input.settlement === 'quote' ? 'quote' as const : null,
      approvalAmount: input.settlement === 'quote' ? amount : 0n,
      limitWei: minAmountOutWei, nativeLimitWei: input.settlement === 'native' ? amount : 0n, limitKind: 'minAmountOutWei' as const };
  }
  if (estimate.userReceives === 0n) throw new Error('Sell estimate returned zero proceeds');
  const minReceiveWei = applyTradeSlippage(estimate.userReceives, input.slippageBps, 'down');
  if (minReceiveWei === 0n) throw new Error('Sell estimate produced zero receive minimum');
  const options = quoteIsWrapped
    ? input.settlement === 'native' ? 0n : RECEIVE_WRAPPED
    : input.settlement === 'quote' ? 0n : input.settlement === 'native' ? ZAP_NATIVE : ZAP_NATIVE | RECEIVE_WRAPPED;
  return { method: 'sell' as const, args: [input.token as Address, amount, minReceiveWei, options, proof] as const,
    value: 0n, approvalToken: 'token' as const, approvalAmount: amount,
    limitWei: minReceiveWei, nativeLimitWei: 0n, limitKind: 'minReceiveWei' as const };
}

function client() { return createPublicClient({ chain: bsc, transport: http(process.env.BSC_RPC_URL || RPC) }); }

function account() {
  const key = process.env.PRIVATE_KEY;
  if (!key || !/^(0x)?[a-fA-F0-9]{64}$/.test(key)) throw new Error('PRIVATE_KEY must be 32-byte hex in local environment');
  return privateKeyToAccount((key.startsWith('0x') ? key : `0x${key}`) as Hex);
}

export async function quoteTrade(input: TradeInput, trader: Address) {
  const c = client();
  if (await c.getChainId() !== 56) throw new Error('BSC_RPC_URL must point to BSC mainnet (chainId 56)');
  const token = getAddress(input.token);
  const { core, tools } = await getOpenFourContracts();
  const [runtime, wrappedNative] = await Promise.all([
    c.readContract({ address: core, abi: OPENFOUR_TRADE_CORE_ABI, functionName: 'tokens', args: [token] }),
    c.readContract({ address: core, abi: OPENFOUR_TRADE_CORE_ABI, functionName: 'wrappedNative' }),
  ]);
  if (!runtime[17]) throw new Error('Token is not managed by OpenFourCore');
  if (runtime[18]) throw new Error('OpenFour token is paused');
  const quoteAsset = runtime[9];
  const vault = runtime[10];
  const presetId = runtime[2];
  const [phase, presetActive] = await Promise.all([
    c.readContract({ address: vault, abi: OPENFOUR_TRADE_VAULT_ABI, functionName: 'phase' }),
    c.readContract({ address: OPENFOUR_REGISTRY_BSC, abi: OPENFOUR_TRADE_REGISTRY_ABI, functionName: 'isPresetActive', args: [presetId] }),
  ]);
  if (phase !== 1) throw new Error(`OpenFour internal trading requires Trading phase (1); current phase is ${phase}`);
  if (!presetActive) throw new Error('OpenFour preset is inactive');
  const quoteIsWrapped = quoteAsset.toLowerCase() === wrappedNative.toLowerCase();
  const needsZap = !quoteIsWrapped && input.settlement !== 'quote';
  if (needsZap) {
    const zap = await c.readContract({ address: core, abi: OPENFOUR_TRADE_CORE_ABI, functionName: 'zapRouter' });
    if (zap === zeroAddress) throw new Error('OpenFour Core ZapRouter is not configured');
  }
  const amount = BigInt(input.amountWei);
  const proof = input.proof ?? '0x';
  const nativeZap = needsZap && input.settlement !== 'quote';
  const options = input.side === 'sell'
    ? quoteIsWrapped ? input.settlement === 'native' ? 0n : RECEIVE_WRAPPED
      : input.settlement === 'quote' ? 0n : ZAP_NATIVE | (input.settlement === 'wrappedNative' ? RECEIVE_WRAPPED : 0n)
    : nativeZap ? ZAP_NATIVE : 0n;
  const functionName = input.side === 'sell' ? 'estimateSell' : input.mode === 'budget' ? 'estimateBuyByBudget' : 'estimateBuy';
  const args = [token, trader, amount, options, proof] as const;
  const estimate = await c.readContract({ address: tools, abi: OPENFOUR_TRADE_TOOLS_ABI, functionName, args });
  const nativeEstimate = input.side === 'buy' && input.mode === 'amount' && nativeZap
    ? estimate : undefined;
  const quoteEstimate = nativeEstimate
    ? await c.readContract({ address: tools, abi: OPENFOUR_TRADE_TOOLS_ABI, functionName: 'estimateBuy', args: [token, trader, amount, 0n, proof] })
    : estimate;
  const plan = buildTradePlan(input, quoteEstimate, quoteIsWrapped, nativeEstimate);
  return { core, tools, token, trader, quoteAsset, wrappedNative, quoteIsWrapped, phase, presetId,
    estimate, ...(nativeEstimate ? { quoteEstimate } : {}), plan };
}

export async function executeTrade(input: TradeInput) {
  const signer = account();
  if (input.trader && getAddress(input.trader) !== signer.address) throw new Error('trader in config.json does not match PRIVATE_KEY wallet');
  const quoted = await quoteTrade(input, signer.address);
  const c = client();
  const wallet = createWalletClient({ account: signer, chain: bsc, transport: http(process.env.BSC_RPC_URL || RPC) });
  const { plan } = quoted;
  let approvalHash: Hex | undefined;
  if (plan.approvalToken) {
    const asset = plan.approvalToken === 'token' ? quoted.token : quoted.quoteAsset;
    const [balance, allowance] = await Promise.all([
      c.readContract({ address: asset, abi: ERC20, functionName: 'balanceOf', args: [signer.address] }),
      c.readContract({ address: asset, abi: ERC20, functionName: 'allowance', args: [signer.address, quoted.core] }),
    ]);
    if (balance < plan.approvalAmount) throw new Error('Insufficient ERC20 balance');
    if (allowance < plan.approvalAmount) {
      const approval = await c.simulateContract({ address: asset, abi: ERC20, functionName: 'approve', args: [quoted.core, plan.approvalAmount], account: signer });
      approvalHash = await wallet.writeContract(approval.request);
      const receipt = await c.waitForTransactionReceipt({ hash: approvalHash });
      if (receipt.status !== 'success') throw new Error(`ERC20 approval reverted: ${approvalHash}`);
    }
  }
  if (plan.value > 0n && await c.getBalance({ address: signer.address }) < plan.value) throw new Error('Insufficient BNB balance for trade value');
  let txHash: Hex;
  if (plan.method === 'sell') {
    const simulation = await c.simulateContract({ address: quoted.core, abi: OPENFOUR_TRADE_CORE_ABI,
      functionName: 'sell', args: plan.args, account: signer });
    txHash = await wallet.writeContract(simulation.request);
  } else if (plan.method === 'buy') {
    const simulation = await c.simulateContract({ address: quoted.core, abi: OPENFOUR_TRADE_CORE_ABI,
      functionName: 'buy', args: plan.args, value: plan.value, account: signer });
    txHash = await wallet.writeContract(simulation.request);
  } else {
    const simulation = await c.simulateContract({ address: quoted.core, abi: OPENFOUR_TRADE_CORE_ABI,
      functionName: 'buyByBudget', args: plan.args, value: plan.value, account: signer });
    txHash = await wallet.writeContract(simulation.request);
  }
  const receipt = await c.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== 'success') throw new Error(`OpenFour trade reverted: ${txHash}`);
  return { txHash, ...(approvalHash ? { approvalHash } : {}), token: quoted.token,
    side: input.side, mode: input.mode ?? 'amount', settlement: input.settlement,
    limitKind: plan.limitKind, limitWei: plan.limitWei.toString(), nativeLimitWei: plan.nativeLimitWei.toString() };
}

export function quoteJson(result: Awaited<ReturnType<typeof quoteTrade>>) {
  const e = result.estimate;
  const q = result.quoteEstimate;
  return { token: result.token, trader: result.trader, core: result.core, tools: result.tools,
    quoteAsset: result.quoteAsset, wrappedNative: result.wrappedNative, phase: result.phase,
    estimate: Object.fromEntries(Object.entries(e).map(([k, v]) => [k, String(v)])),
    ...(q ? { quoteEstimate: Object.fromEntries(Object.entries(q).map(([k, v]) => [k, String(v)])) } : {}),
    transaction: { method: result.plan.method, args: result.plan.args.map(String), valueWei: result.plan.value.toString(),
      limitKind: result.plan.limitKind, limitWei: result.plan.limitWei.toString(),
      nativeLimitWei: result.plan.nativeLimitWei.toString(), approvalToken: result.plan.approvalToken,
      approvalAmountWei: result.plan.approvalAmount.toString() } };
}
