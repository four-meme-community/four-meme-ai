import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { decodeAbiParameters, decodeFunctionData, encodeAbiParameters, encodeEventTopics, encodeFunctionResult } from 'viem';
import { OPENFOUR_CORE_ABI, OPENFOUR_REGISTRY_ABI, OPENFOUR_TOOLS_ABI } from '../skills/four-meme-integration/scripts/openfour-abi.ts';
import { buildCreatePayload, computeCreatePayment, CREATE_ARG_ABI, createViaApi, decodeCreateArg, encodeModuleParams, normalizeCreateArg, OPENFOUR_REGISTRY_BSC, prepareChain, tokenAddressFromLogs } from '../skills/four-meme-integration/scripts/openfour.ts';

const quote = '0x1111111111111111111111111111111111111111';
const otherQuote = '0x2222222222222222222222222222222222222222';
const empty = { kind: 'empty', version: 1, params: [] };

test('module values use one ABI tuple and preserve decimal precision', () => {
  const schema = { kind: 'custom', version: 1, params: [
    { name: 'memo', abiType: 'string', decimals: 0, optional: false, defaultValue: '', title: '', hint: '', minValue: '', maxValue: '' },
    { name: 'stake', abiType: 'uint256', decimals: 18, optional: false, defaultValue: '', title: '', hint: '', minValue: '', maxValue: '' },
  ] };
  const encoded = encodeModuleParams(schema, { memo: 'hello', stake: '1.234567890123456789' });
  const [decoded] = decodeAbiParameters([{ name: 'params', type: 'tuple', components: [
    { name: 'memo', type: 'string' }, { name: 'stake', type: 'uint256' },
  ] }], encoded);
  assert.equal(decoded.memo, 'hello');
  assert.equal(decoded.stake, 1234567890123456789n);
});

test('schema validation rejects unknown and out-of-range module values', () => {
  const schema = { kind: 'tax', version: 1, params: [
    { name: 'buyFeeRate', abiType: 'uint256', decimals: 0, optional: false,
      defaultValue: '300', minValue: '100', maxValue: '1000', title: '', hint: '' },
  ] };
  assert.throws(() => encodeModuleParams(schema, { buyFeeRat: '300' }), /Unknown parameter/);
  assert.throws(() => encodeModuleParams(schema, { buyFeeRate: '99' }), /below schema minimum/);
  assert.throws(() => encodeModuleParams(schema, { buyFeeRate: '1001' }), /exceeds schema maximum/);
  assert.match(encodeModuleParams(schema, {}), /^0x[0-9a-f]+$/);
});

test('payload uses selected template config and six module byte fields', () => {
  const payload = buildCreatePayload({
    templateId: '1778027615722', name: 'Example', shortName: 'EX', desc: 'description',
    imgUrl: 'https://example.com/token.png', presaleQuote: '0',
  }, { symbol: 'BNC4', totalSupply: '1000000000', saleAmount: '800000000', raisedAmount: '18' },
  { token: empty, vault: empty, curve: empty, trade: empty, migrate: empty, customData: empty },
  'https://example.com/token.png');
  assert.equal(payload.templateId, 1778027615722);
  assert.equal(payload.symbol, 'BNC4');
  assert.equal(payload.totalSupply, '1000000000');
  assert.deepEqual(payload.initParams, {
    tokenParams: '0x', vaultParams: '0x', curveParams: '0x', tradeParams: '0x',
    migrateParams: '0x', customDataParams: '0x',
  });
});

test('createArg fee uses native presale only for wrapped-native quote', () => {
  const createArg = encodeAbiParameters(CREATE_ARG_ABI, [{
    requestId: 1n, presetId: 1778027615722n, validTimestamp: 9999999999n,
    createFee: 3000000000000000n, presaleQuote: 1000000000000000000n,
    antiSniperEnabled: false, partner: '0x0000000000000000000000000000000000000000',
    initParams: {
      name: 'Example', symbol: 'EX', tokenUri: '', maxSupply: 1000000000000000000n,
      saleAmount: 800000000000000000n, raiseAmount: 18000000000000000000n,
      quoteAsset: quote, tokenSalt: `0x${'0'.repeat(64)}`,
      tokenParams: '0x', vaultParams: '0x', curveParams: '0x',
      tradeParams: '0x', migrateParams: '0x', customDataParams: '0x',
    },
  }]);
  const decoded = decodeCreateArg(createArg);
  assert.equal(decoded.presetId, 1778027615722n);
  assert.equal(computeCreatePayment(decoded, quote).valueWei, 1003000000000000000n);
  assert.equal(computeCreatePayment(decoded, otherQuote).valueWei, 3000000000000000n);
});

test('legacy createArg is normalized to the partner-aware ABI', () => {
  const oldAbi = [{ name: 'args', type: 'tuple', components: [
    ...CREATE_ARG_ABI[0].components.slice(0, -2),
    { name: 'initParams', type: 'tuple', components: CREATE_ARG_ABI[0].components.at(-1).components.slice(0, -1) },
  ] }];
  const oldArg = encodeAbiParameters(oldAbi, [{
    requestId: 1n, presetId: 2n, validTimestamp: 3n, createFee: 4n,
    presaleQuote: 5n, antiSniperEnabled: false,
    initParams: {
      name: 'Legacy', symbol: 'OLD', tokenUri: '', maxSupply: 100n,
      saleAmount: 80n, raiseAmount: 20n, quoteAsset: quote,
      tokenSalt: `0x${'0'.repeat(64)}`, tokenParams: '0x', vaultParams: '0x',
      curveParams: '0x', tradeParams: '0x', migrateParams: '0x',
    },
  }]);
  const normalized = normalizeCreateArg(oldArg);
  assert.equal(normalized.decoded.partner, '0x0000000000000000000000000000000000000000');
  assert.equal(normalized.decoded.initParams.customDataParams, '0x');
  assert.equal(decodeCreateArg(normalized.createArg).createFee, 4n);
});

test('TokenCreated receipt parser returns the on-chain token address', () => {
  const event = OPENFOUR_CORE_ABI.find((item) => item.type === 'event' && item.name === 'TokenCreated');
  const token = '0x5555555555555555555555555555555555555555';
  const inputs = event.inputs.filter((input) => !input.indexed);
  const values = inputs.map((input) => input.type === 'address' ? quote
    : input.type === 'string' ? '' : input.type === 'bytes' ? '0x' : 0n);
  const log = {
    address: '0x3333333333333333333333333333333333333333',
    topics: encodeEventTopics({ abi: [event], eventName: 'TokenCreated',
      args: { presetId: 7n, creator: otherQuote, token } }),
    data: encodeAbiParameters(inputs, values),
  };
  assert.equal(tokenAddressFromLogs([log], log.address), token);
  assert.equal(tokenAddressFromLogs([log], otherQuote), null);
});

test('OpenFour API creation uses template schema, BSC login and signed response', async () => {
  const originalFetch = globalThis.fetch;
  const originalRpc = process.env.BSC_RPC_URL;
  const originalKey = process.env.PRIVATE_KEY;
  const core = '0x3333333333333333333333333333333333333333';
  const tools = '0x4444444444444444444444444444444444444444';
  const tempDir = mkdtempSync(join(tmpdir(), 'openfour-test-'));
  const imagePath = join(tempDir, 'logo.png');
  writeFileSync(imagePath, Buffer.from('test image bytes'));
  const calls = [];
  const createArg = encodeAbiParameters(CREATE_ARG_ABI, [{
    requestId: 1n, presetId: 1778027615722n, validTimestamp: 9999999999n,
    createFee: 0n, presaleQuote: 0n, antiSniperEnabled: false,
    partner: '0x0000000000000000000000000000000000000000',
    initParams: {
      name: 'Example', symbol: 'EX', tokenUri: '', maxSupply: 1000000000000000000n,
      saleAmount: 800000000000000000n, raiseAmount: 18000000000000000000n,
      quoteAsset: quote, tokenSalt: `0x${'0'.repeat(64)}`,
      tokenParams: '0x', vaultParams: '0x', curveParams: '0x',
      tradeParams: '0x', migrateParams: '0x', customDataParams: '0x',
    },
  }]);
  const response = (data) => Response.json(data);
  try {
    process.env.BSC_RPC_URL = 'https://mock-rpc.invalid';
    process.env.PRIVATE_KEY = `0x${'1'.repeat(64)}`;
    globalThis.fetch = async (input, init = {}) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.startsWith('https://mock-rpc.invalid')) {
        const rpc = JSON.parse(init.body);
        if (rpc.method === 'eth_chainId') return response({ jsonrpc: '2.0', id: rpc.id, result: '0x38' });
        assert.equal(rpc.method, 'eth_call');
        const tx = rpc.params[0];
        const isRegistry = tx.to.toLowerCase() === OPENFOUR_REGISTRY_BSC.toLowerCase();
        const isCore = tx.to.toLowerCase() === core.toLowerCase();
        const abi = isRegistry ? OPENFOUR_REGISTRY_ABI : isCore ? OPENFOUR_CORE_ABI : OPENFOUR_TOOLS_ABI;
        const { functionName } = decodeFunctionData({ abi, data: tx.data });
        const result = functionName === 'openFourCore' ? core
          : functionName === 'openFourTool' ? tools
          : functionName === 'wrappedNative' ? otherQuote
          : functionName === 'getTokenBaseSchema' ? []
          : Array.from({ length: 6 }, () => ({ kind: 'empty', version: 1, params: [] }));
        return response({ jsonrpc: '2.0', id: rpc.id, result: encodeFunctionResult({ abi, functionName, result }) });
      }
      const path = new URL(url).pathname;
      calls.push({ path, body: init.body instanceof FormData ? '[multipart]' : init.body ? JSON.parse(init.body) : null, headers: init.headers });
      if (path.endsWith('/public/token_template/config')) return response({ code: 0, data: [{ symbol: 'BNC4', symbolAddress: quote, totalSupply: '1', saleAmount: '0.8', raisedAmount: '18' }] });
      if (path.endsWith('/private/user/nonce/generate')) return response({ code: 0, data: '123' });
      if (path.endsWith('/private/user/login/dex')) return response({ code: 0, data: 'access-token' });
      if (path.endsWith('/private/token/upload')) return response({ code: 0, data: { url: 'https://example.com/token.png' } });
      if (path.endsWith('/private/token_template/token/create')) return response({ code: 0, data: [{ createArg, signature: `0x${'a'.repeat(130)}`, tokenId: '42' }] });
      throw new Error(`Unexpected API request ${path}`);
    };
    const result = await createViaApi({ templateId: '1778027615722', name: 'Example', shortName: 'EX', desc: 'description', imagePath });
    assert.equal(result.createArg, createArg);
    assert.equal(result.tokenId, '42');
    assert.equal(calls.find((call) => call.path.endsWith('/private/user/nonce/generate')).body.networkCode, 0);
    const create = calls.find((call) => call.path.endsWith('/private/token_template/token/create'));
    assert.equal(create.headers['meme-network-code'], '0');
    assert.equal(create.headers['meme-web-access'], 'access-token');
    assert.equal(create.body.templateId, 1778027615722);
    assert.equal(create.body.initParams.customDataParams, '0x');
    assert.equal(create.body.imgUrl, 'https://example.com/token.png');
    const prepared = await prepareChain(result);
    assert.equal(prepared.core, core);
    assert.equal(prepared.valueWei, 0n);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
    globalThis.fetch = originalFetch;
    if (originalRpc === undefined) delete process.env.BSC_RPC_URL;
    else process.env.BSC_RPC_URL = originalRpc;
    if (originalKey === undefined) delete process.env.PRIVATE_KEY;
    else process.env.PRIVATE_KEY = originalKey;
  }
});
