import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { decodeFunctionData, encodeFunctionResult } from 'viem';
import { OPENFOUR_REGISTRY_ABI } from '../skills/four-meme-integration/scripts/openfour-abi.ts';
import { OPENFOUR_TRADE_CORE_ABI, OPENFOUR_TRADE_REGISTRY_ABI, OPENFOUR_TRADE_TOOLS_ABI, OPENFOUR_TRADE_VAULT_ABI } from '../skills/four-meme-integration/scripts/openfour-trade-abi.ts';
import { OPENFOUR_REGISTRY_BSC } from '../skills/four-meme-integration/scripts/openfour.ts';
import { applyTradeSlippage, buildTradePlan, loadTradeInput, quoteJson, quoteTrade } from '../skills/four-meme-integration/scripts/openfour-trade.ts';

const token = '0x1111111111111111111111111111111111111111';
const estimate = { curveQuote: 90n, totalFee: 10n, userPays: 100n, userReceives: 80n,
  tokenAmount: 1_000n, executionPrice: 1n };
const base = { token, side: 'buy', mode: 'amount', amountWei: '1000', slippageBps: 100,
  settlement: 'quote' };

test('trade config rejects unsafe limits and malformed inputs', () => {
  const dir = mkdtempSync(join(tmpdir(), 'openfour-trade-'));
  const file = join(dir, 'trade.json');
  try {
    writeFileSync(file, JSON.stringify(base));
    assert.deepEqual(loadTradeInput(file), base);
    for (const bad of [
      { amountWei: '0' }, { amountWei: '1.1' }, { slippageBps: 10000 },
      { slippageBps: -1 }, { token: '0x1234' }, { settlement: 'wrappedNative' },
    ]) {
      writeFileSync(file, JSON.stringify({ ...base, ...bad }));
      assert.throws(() => loadTradeInput(file));
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('slippage rounds buy ceilings up and sell floors down', () => {
  assert.equal(applyTradeSlippage(101n, 100, 'up'), 103n);
  assert.equal(applyTradeSlippage(101n, 100, 'down'), 99n);
});

test('exact buy separates quote ceiling and native zap value', () => {
  const native = { ...estimate, userPays: 200n };
  const plan = buildTradePlan({ ...base, settlement: 'native' }, estimate, false, native);
  assert.equal(plan.method, 'buy');
  assert.equal(plan.args[2], 101n);
  assert.equal(plan.args[3], 2n);
  assert.equal(plan.value, 202n);
  assert.equal(plan.approvalToken, null);
});

test('budget buy uses quote budget or native budget correctly', () => {
  const quotePlan = buildTradePlan({ ...base, mode: 'budget', amountWei: '120' }, estimate, false);
  assert.equal(quotePlan.args[1], 120n);
  assert.equal(quotePlan.args[2], 990n);
  assert.equal(quotePlan.approvalAmount, 120n);
  assert.equal(quotePlan.value, 0n);
  const nativePlan = buildTradePlan({ ...base, mode: 'budget', amountWei: '200', settlement: 'native' }, estimate, false);
  assert.equal(nativePlan.args[1], 100n);
  assert.equal(nativePlan.args[2], 990n);
  assert.equal(nativePlan.args[3], 2n);
  assert.equal(nativePlan.value, 200n);
});

test('sell settlement options distinguish quote, native and wrapped native', () => {
  for (const [quoteIsWrapped, settlement, options] of [
    [true, 'quote', 1n], [true, 'native', 0n], [true, 'wrappedNative', 1n],
    [false, 'quote', 0n], [false, 'native', 2n], [false, 'wrappedNative', 3n],
  ]) {
    const plan = buildTradePlan({ ...base, side: 'sell', mode: 'amount', settlement }, estimate, quoteIsWrapped);
    assert.equal(plan.args[3], options);
    assert.equal(plan.args[2], 79n);
    assert.equal(plan.approvalToken, 'token');
  }
});

test('zero executable estimates cannot produce a trade', () => {
  assert.throws(() => buildTradePlan(base, { ...estimate, tokenAmount: 0n }, false), /zero executable/);
  assert.throws(() => buildTradePlan({ ...base, side: 'sell' }, { ...estimate, userReceives: 0n }, false), /zero proceeds/);
});

test('read-only quote resolves live-style Core runtime and rejects migrated phase', async () => {
  const originalFetch = globalThis.fetch;
  const originalRpc = process.env.BSC_RPC_URL;
  const core = '0x3333333333333333333333333333333333333333';
  const tools = '0x4444444444444444444444444444444444444444';
  const vault = '0x5555555555555555555555555555555555555555';
  const wrapped = '0x6666666666666666666666666666666666666666';
  const quoteAsset = '0x7777777777777777777777777777777777777777';
  let phase = 1;
  const calls = [];
  try {
    process.env.BSC_RPC_URL = 'https://mock-rpc.invalid';
    globalThis.fetch = async (_url, init) => {
      const rpc = JSON.parse(init.body);
      if (rpc.method === 'eth_chainId') return Response.json({ jsonrpc: '2.0', id: rpc.id, result: '0x38' });
      assert.equal(rpc.method, 'eth_call');
      const tx = rpc.params[0];
      const address = tx.to.toLowerCase();
      const abi = address === OPENFOUR_REGISTRY_BSC.toLowerCase()
        ? [...OPENFOUR_REGISTRY_ABI, ...OPENFOUR_TRADE_REGISTRY_ABI]
        : address === core.toLowerCase() ? OPENFOUR_TRADE_CORE_ABI
          : address === vault.toLowerCase() ? OPENFOUR_TRADE_VAULT_ABI : OPENFOUR_TRADE_TOOLS_ABI;
      const { functionName } = decodeFunctionData({ abi, data: tx.data });
      calls.push(functionName);
      const result = {
        openFourCore: core, openFourTool: tools, wrappedNative: wrapped, zapRouter: tools,
        isPresetActive: true, phase,
        tokens: [1, core, 42n, token, 'T', 'T', 1000n, 900n, 100n, quoteAsset, vault,
          core, core, core, core, core, 1n, true, false, false],
        estimateBuy: estimate,
      }[functionName];
      assert.notEqual(result, undefined);
      return Response.json({ jsonrpc: '2.0', id: rpc.id,
        result: encodeFunctionResult({ abi, functionName, result }) });
    };
    const result = await quoteTrade({ ...base, trader: core }, core);
    assert.equal(result.plan.method, 'buy');
    assert.equal(result.plan.approvalAmount, 101n);
    assert.equal(quoteJson(result).estimate.userPays, '100');
    assert.deepEqual(calls.includes('estimateBuy'), true);
    phase = 3;
    await assert.rejects(quoteTrade({ ...base, trader: core }, core), /current phase is 3/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalRpc === undefined) delete process.env.BSC_RPC_URL;
    else process.env.BSC_RPC_URL = originalRpc;
  }
});
