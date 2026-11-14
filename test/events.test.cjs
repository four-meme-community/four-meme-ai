const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

const root = path.join(__dirname, '..');
const fixture = path.join(__dirname, 'fixtures', 'mock-fetch.cjs');

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, 'bin', 'fourmeme.cjs'), ...args], {
      cwd: root,
      env: {
        ...process.env,
        BSC_RPC_URL: 'https://mock-rpc.invalid',
        NODE_OPTIONS: `--require=${fixture}`,
      },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => stdout += chunk);
    child.stderr.on('data', (chunk) => stderr += chunk);
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) reject(new Error(`Exit ${code}: ${stderr}`));
      else resolve(stdout);
    });
  });
}

test('events emits decoded uint256 arguments as exact decimal strings', async () => {
  const output = JSON.parse(await run(['events', '90', '100']));
  assert.equal(output.length, 1);
  assert.equal(output[0].eventName, 'TokenSale');
  assert.equal(output[0].args.amount, '16750804996967000000000');
  assert.equal(output[0].args.offers, '158860814152143529000000000');
});

test('verify succeeds when its block range contains an event', async () => {
  const output = await run(['verify']);
  assert.match(output, /"raisedToken": \[\]/);
  const events = JSON.parse(output.slice(output.indexOf('{\n  "fromBlock"')));
  assert.equal(events.count, 1);
  assert.equal(events.events[0].args.amount, '16750804996967000000000');
});
