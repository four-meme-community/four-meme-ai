// Synthetic fixtures (not real chain data). The wire logs are built with viem's encoders,
// so this guards the scripts' JSON serialization of decoded bigint args, not the ABI itself.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { encodeAbiParameters, encodeEventTopics, getAddress, parseAbiItem, parseAbiParameters, toHex } from 'viem';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tsxCli = path.join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const scriptDir = path.join(root, 'skills', 'four-meme-integration', 'scripts');
const MANAGER = '0x5c952063c7fc8610FFDB798152D69F0B9550762b';
const U256_MAX = 2n ** 256n - 1n;
const BIG = 2n ** 53n + 1n;
const A1 = getAddress('0x1111111111111111111111111111111111111111');
const A2 = getAddress('0x2222222222222222222222222222222222222222');
const A3 = getAddress('0x3333333333333333333333333333333333333333');

const ev = {
  TokenCreate: parseAbiItem('event TokenCreate(address creator, address token, uint256 requestId, string name, string symbol, uint256 totalSupply, uint256 launchTime, uint256 launchFee)'),
  TokenPurchase: parseAbiItem('event TokenPurchase(address token, address account, uint256 price, uint256 amount, uint256 cost, uint256 fee, uint256 offers, uint256 funds)'),
  TokenSale: parseAbiItem('event TokenSale(address token, address account, uint256 price, uint256 amount, uint256 cost, uint256 fee, uint256 offers, uint256 funds)'),
  LiquidityAdded: parseAbiItem('event LiquidityAdded(address base, uint256 offers, address quote, uint256 funds)'),
};

const cases = [
  { name: 'TokenCreate', args: [A1, A2, 0n, 'Plain Name', 'PLN', BIG, U256_MAX, 12345n], types: 'address creator, address token, uint256 requestId, string name, string symbol, uint256 totalSupply, uint256 launchTime, uint256 launchFee' },
  { name: 'TokenPurchase', args: [A2, A3, U256_MAX, BIG, 0n, 9007199254740993n, 7n, 10n ** 30n], types: 'address token, address account, uint256 price, uint256 amount, uint256 cost, uint256 fee, uint256 offers, uint256 funds' },
  { name: 'TokenSale', args: [A2, A3, 1n, 0n, U256_MAX, BIG + 2n, 0n, 99n], types: 'address token, address account, uint256 price, uint256 amount, uint256 cost, uint256 fee, uint256 offers, uint256 funds' },
  { name: 'LiquidityAdded', args: [A1, U256_MAX, A3, BIG], types: 'address base, uint256 offers, address quote, uint256 funds' },
];

function wireLog(c, i) {
  const topics = encodeEventTopics({ abi: [ev[c.name]], eventName: c.name });
  const data = encodeAbiParameters(parseAbiParameters(c.types), c.args);
  return {
    address: MANAGER.toLowerCase(),
    blockHash: '0x' + (0xa0 + i).toString(16).padStart(64, '0'),
    blockNumber: toHex(60 + i),
    data,
    logIndex: toHex(i),
    removed: false,
    topics,
    transactionHash: '0x' + (0xb0 + i).toString(16).padStart(64, '0'),
    transactionIndex: toHex(0),
  };
}

function expectedArgs(c) {
  const names = c.types.split(',').map((s) => s.trim().split(' ')[1]);
  return Object.fromEntries(names.map((n, i) => [n, typeof c.args[i] === 'bigint' ? c.args[i].toString() : c.args[i]]));
}

async function withMock(handler, fn) {
  const calls = [];
  const unexpected = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (d) => (body += d));
    req.on('end', () => {
      const reply = (r) => {
        const rpc = (q) => {
          calls.push(q);
          const out = r(q);
          return out.error ? { jsonrpc: '2.0', id: q.id, error: out.error } : { jsonrpc: '2.0', id: q.id, result: out.result };
        };
        const q = JSON.parse(body);
        const payload = Array.isArray(q) ? q.map(rpc) : rpc(q);
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify(payload));
      };
      reply((q) => {
        const out = handler(q);
        if (!out) {
          unexpected.push(q.method);
          return { error: { code: -32601, message: `unexpected method ${q.method}` } };
        }
        return out;
      });
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    return await fn(`http://127.0.0.1:${server.address().port}`, calls, unexpected);
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
}

function runScript(script, args, rpcUrl, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [tsxCli, path.join(scriptDir, script), ...args], {
      cwd: root,
      env: { PATH: process.env.PATH, HOME: process.env.HOME, BSC_RPC_URL: rpcUrl },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`timeout running ${script}\n${stderr}`));
    }, timeoutMs);
    child.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

const rpcHandler = (logs) => (q) => {
  if (q.method === 'eth_blockNumber') return { result: toHex(100) };
  if (q.method === 'eth_getLogs') return { result: logs };
  return null;
};
const failHandler = (q) => {
  if (q.method === 'eth_blockNumber') return { result: toHex(100) };
  if (q.method === 'eth_getLogs') return { error: { code: -32000, message: 'mock getLogs failure' } };
  return null;
};

const scripts = [
  {
    file: 'get-recent-events.ts',
    args: ['56', '50', '100'],
    parse: (j) => ({ list: j }),
  },
  {
    file: 'verify-events.ts',
    args: ['50'],
    parse: (j) => {
      assert.equal(j.fromBlock, '50');
      assert.equal(j.toBlock, '100');
      return { list: j.events, count: j.count };
    },
  },
];

for (const s of scripts) {
  test(`${s.file}: four event types serialize bigint args as exact decimal strings`, async () => {
    const logs = cases.map(wireLog);
    await withMock(rpcHandler(logs), async (url, _calls, unexpected) => {
      const r = await runScript(s.file, s.args, url);
      assert.equal(r.code, 0, r.stderr);
      const { list, count } = s.parse(JSON.parse(r.stdout));
      if (count !== undefined) assert.equal(count, 4);
      assert.equal(list.length, 4);
      cases.forEach((c, i) => {
        assert.equal(list[i].eventName, c.name);
        assert.equal(list[i].blockNumber, 60 + i);
        assert.deepEqual(list[i].args, expectedArgs(c));
      });
      assert.deepEqual(unexpected, []);
    });
  });

  test(`${s.file}: empty log array exits 0 with empty result`, async () => {
    await withMock(rpcHandler([]), async (url, _calls, unexpected) => {
      const r = await runScript(s.file, s.args, url);
      assert.equal(r.code, 0, r.stderr);
      const { list, count } = s.parse(JSON.parse(r.stdout));
      assert.deepEqual(list, []);
      if (count !== undefined) assert.equal(count, 0);
      assert.deepEqual(unexpected, []);
    });
  });

  test(`${s.file}: RPC error exits non-zero and is not reported as empty success`, async () => {
    await withMock(failHandler, async (url, _calls, unexpected) => {
      const r = await runScript(s.file, s.args, url);
      assert.notEqual(r.code, 0);
      assert.equal(r.stdout.trim(), '');
      assert.match(r.stderr, /mock getLogs failure/);
      assert.deepEqual(unexpected, []);
    });
  });
}
