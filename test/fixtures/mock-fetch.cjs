const { encodeAbiParameters, parseAbiItem, toEventSelector } = require('viem');

const event = parseAbiItem(
  'event TokenSale(address token, address account, uint256 price, uint256 amount, uint256 cost, uint256 fee, uint256 offers, uint256 funds)'
);
const args = [
  '0x1111111111111111111111111111111111111111',
  '0x2222222222222222222222222222222222222222',
  19632191647493n,
  16750804996967000000000n,
  328867741247144912n,
  3288677412471449n,
  158860814152143529000000000n,
  5072811057614651296759n,
];
const log = {
  address: '0x5c952063c7fc8610FFDB798152D69F0B9550762b',
  topics: [toEventSelector(event)],
  data: encodeAbiParameters(event.inputs, args),
  blockNumber: '0x64',
  transactionHash: `0x${'3'.repeat(64)}`,
  blockHash: `0x${'4'.repeat(64)}`,
  transactionIndex: '0x0',
  logIndex: '0x0',
  removed: false,
};

globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input.url;
  if (url === 'https://four.meme/meme-api/v1/public/config') {
    return Response.json({ code: '0', data: { raisedToken: [] } });
  }
  if (url !== 'https://mock-rpc.invalid/') throw new Error(`Unexpected request: ${url}`);

  const request = JSON.parse(init.body);
  const result = request.method === 'eth_blockNumber'
    ? '0x64'
    : request.method === 'eth_getLogs'
      ? [log]
      : null;
  if (result === null) throw new Error(`Unexpected RPC method: ${request.method}`);
  return Response.json({ jsonrpc: '2.0', id: request.id, result });
};
