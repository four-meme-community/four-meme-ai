import { basename, dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import {
  createPublicClient,
  createWalletClient,
  decodeAbiParameters,
  decodeEventLog,
  encodeAbiParameters,
  getAddress,
  http,
  isAddress,
  isHex,
  parseAbi,
  parseUnits,
  type AbiParameter,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { bsc } from 'viem/chains';
import { OPENFOUR_CORE_ABI, OPENFOUR_REGISTRY_ABI, OPENFOUR_TOOLS_ABI } from './openfour-abi.js';

const API_BASE = 'https://four.meme/meme-api/v1';
const DEFAULT_RPC = 'https://bsc-rpc.publicnode.com';
export const OPENFOUR_REGISTRY_BSC = '0x912CEf0C3aE9Ab6eB3Ec87cab69371cFb317Ab94' as const;
const MODULES = ['token', 'vault', 'curve', 'trade', 'migrate', 'customData'] as const;
type ModuleName = typeof MODULES[number];

export interface ParamDescriptor {
  name: string;
  abiType: string;
  decimals: number;
  optional: boolean;
  title: string;
  defaultValue: string;
  hint: string;
  minValue: string;
  maxValue: string;
}
export interface ModuleSchema { kind: string; version: number; params: ParamDescriptor[] }
export type Schemas = Record<ModuleName, ModuleSchema>;
export interface CreateInput {
  templateId: string;
  name: string;
  shortName: string;
  desc: string;
  quoteSymbol?: string;
  imagePath?: string;
  imgUrl?: string;
  webUrl?: string;
  telegramUrl?: string;
  twitterUrl?: string;
  presaleQuote?: string;
  maxCreateFeeWei?: string;
  feePlan?: boolean;
  totalSupply?: string;
  saleAmount?: string;
  raisedAmount?: string;
  fields?: Partial<Record<ModuleName, Record<string, unknown>>>;
  extraPayload?: Record<string, unknown>;
}
export interface CreateData { createArg: Hex; signature: Hex; tokenId?: string | number }

const INIT_COMPONENTS = [
  { name: 'name', type: 'string' }, { name: 'symbol', type: 'string' },
  { name: 'tokenUri', type: 'string' }, { name: 'maxSupply', type: 'uint256' },
  { name: 'saleAmount', type: 'uint256' }, { name: 'raiseAmount', type: 'uint256' },
  { name: 'quoteAsset', type: 'address' }, { name: 'tokenSalt', type: 'bytes32' },
  { name: 'tokenParams', type: 'bytes' }, { name: 'vaultParams', type: 'bytes' },
  { name: 'curveParams', type: 'bytes' }, { name: 'tradeParams', type: 'bytes' },
  { name: 'migrateParams', type: 'bytes' }, { name: 'customDataParams', type: 'bytes' },
] as const;
const OUTER_FIELDS = [
  { name: 'requestId', type: 'uint256' }, { name: 'presetId', type: 'uint256' },
  { name: 'validTimestamp', type: 'uint256' }, { name: 'createFee', type: 'uint256' },
  { name: 'presaleQuote', type: 'uint256' }, { name: 'antiSniperEnabled', type: 'bool' },
  { name: 'partner', type: 'address' },
] as const;
export const CREATE_ARG_ABI = [{
  name: 'args', type: 'tuple', components: [
    ...OUTER_FIELDS,
    { name: 'initParams', type: 'tuple', components: INIT_COMPONENTS },
  ],
}] as const;
const LEGACY_NO_PARTNER_ABI = [{ name: 'args', type: 'tuple', components: [
  ...OUTER_FIELDS.slice(0, -1), { name: 'initParams', type: 'tuple', components: INIT_COMPONENTS },
] }] as const;
const LEGACY_NO_CUSTOM_ABI = [{ name: 'args', type: 'tuple', components: [
  ...OUTER_FIELDS.slice(0, -1), { name: 'initParams', type: 'tuple', components: INIT_COMPONENTS.slice(0, -1) },
] }] as const;
const ERC20_ABI = parseAbi([
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
]);

function rpcUrl() { return process.env.BSC_RPC_URL || DEFAULT_RPC; }
function publicClient() { return createPublicClient({ chain: bsc, transport: http(rpcUrl()) }); }

function asObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label}: expected object`);
  return value as Record<string, unknown>;
}

function checkedId(value: unknown): string {
  const id = String(value ?? '');
  if (!/^\d+$/.test(id) || BigInt(id) === 0n) throw new Error('templateId must be a positive integer');
  if (BigInt(id) > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('templateId exceeds JSON safe integer range');
  return id;
}

export function loadCreateInput(filePath: string): CreateInput {
  const absolute = resolve(filePath);
  const input = asObject(JSON.parse(readFileSync(absolute, 'utf8')), 'create config') as unknown as CreateInput;
  input.templateId = checkedId(input.templateId);
  for (const name of ['name', 'shortName', 'desc'] as const) {
    if (typeof input[name] !== 'string' || !input[name].trim()) throw new Error(`${name} is required`);
  }
  if (!input.imagePath && !input.imgUrl) throw new Error('imagePath or imgUrl is required');
  if (input.imagePath) input.imagePath = resolve(dirname(absolute), input.imagePath);
  if (input.fields && (typeof input.fields !== 'object' || Array.isArray(input.fields))) throw new Error('fields must be an object');
  if (input.feePlan !== undefined && typeof input.feePlan !== 'boolean') throw new Error('feePlan must be boolean');
  if (input.presaleQuote !== undefined && !/^\d+(\.\d+)?$/.test(String(input.presaleQuote))) {
    throw new Error('presaleQuote must be a non-negative decimal string');
  }
  if (input.maxCreateFeeWei !== undefined && !/^\d+$/.test(String(input.maxCreateFeeWei))) {
    throw new Error('maxCreateFeeWei must be a non-negative integer string');
  }
  if (input.extraPayload && (typeof input.extraPayload !== 'object' || Array.isArray(input.extraPayload))) {
    throw new Error('extraPayload must be an object');
  }
  return input;
}

function apiHeaders(token?: string): Record<string, string> {
  return { 'meme-network-code': '0', ...(token ? { 'meme-web-access': token } : {}) };
}

async function apiJson(path: string, method = 'GET', body?: unknown, token?: string): Promise<Record<string, unknown>> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { ...apiHeaders(token), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) throw new Error(`OpenFour API ${path}: HTTP ${response.status}`);
  const data = asObject(await response.json(), `OpenFour API ${path}`);
  if (data.code !== 0 && data.code !== '0') throw new Error(`OpenFour API ${path}: ${String(data.msg ?? 'request failed')}`);
  return data;
}

export async function searchTemplates(): Promise<unknown[]> {
  const response = await apiJson('/public/token_template/search', 'POST', { sort: 'LAST' });
  if (!Array.isArray(response.data)) throw new Error('Template search returned no list');
  return response.data;
}

export async function getTemplateConfig(templateId: string, quoteSymbol?: string): Promise<Record<string, unknown>> {
  const response = await apiJson(`/public/token_template/config?templateId=${checkedId(templateId)}`);
  if (!Array.isArray(response.data) || response.data.length === 0) throw new Error('Template has no quote configuration');
  const configs = response.data.map((item) => asObject(item, 'template config'));
  if (!quoteSymbol) return configs[0];
  const selected = configs.find((item) => String(item.symbol).toLowerCase() === quoteSymbol.toLowerCase());
  if (!selected) throw new Error(`Template does not support quote symbol ${quoteSymbol}`);
  return selected;
}

function descriptor(raw: Record<string, unknown>): ParamDescriptor {
  return {
    name: String(raw.name ?? ''), abiType: String(raw.abiType ?? ''), decimals: Number(raw.decimals ?? 0),
    optional: Boolean(raw.optional), title: String(raw.title ?? ''), defaultValue: String(raw.defaultValue ?? ''),
    hint: String(raw.hint ?? ''), minValue: String(raw.minValue ?? ''), maxValue: String(raw.maxValue ?? ''),
  };
}

function moduleSchema(raw: unknown): ModuleSchema {
  const value = asObject(raw, 'module schema');
  if (!Array.isArray(value.params)) throw new Error('Module schema has no params');
  return { kind: String(value.kind ?? ''), version: Number(value.version ?? 0), params: value.params.map((p) => descriptor(asObject(p, 'parameter'))) };
}

export async function getOpenFourContracts() {
  const client = publicClient();
  const [core, tools] = await Promise.all([
    client.readContract({ address: OPENFOUR_REGISTRY_BSC, abi: OPENFOUR_REGISTRY_ABI, functionName: 'openFourCore' }),
    client.readContract({ address: OPENFOUR_REGISTRY_BSC, abi: OPENFOUR_REGISTRY_ABI, functionName: 'openFourTool' }),
  ]);
  if (!isAddress(core) || !isAddress(tools)) throw new Error('Registry returned invalid OpenFour contract addresses');
  return { core: getAddress(core), tools: getAddress(tools) };
}

export async function getCreateSchema(templateId: string) {
  const id = BigInt(checkedId(templateId));
  const { core, tools } = await getOpenFourContracts();
  const client = publicClient();
  if (await client.getChainId() !== 56) throw new Error('BSC_RPC_URL must point to BSC mainnet (chainId 56)');
  const [baseRaw, modulesRaw] = await Promise.all([
    client.readContract({ address: tools, abi: OPENFOUR_TOOLS_ABI, functionName: 'getTokenBaseSchema' }),
    client.readContract({ address: tools, abi: OPENFOUR_TOOLS_ABI, functionName: 'getPresetEncodeSchemas', args: [id] }),
  ]);
  const base = (baseRaw as readonly unknown[]).map((p) => descriptor(asObject(p, 'base parameter')));
  const modules = modulesRaw as readonly unknown[];
  if (modules.length !== MODULES.length) throw new Error('Unexpected number of module schemas');
  const schemas = Object.fromEntries(MODULES.map((name, index) => [name, moduleSchema(modules[index])])) as Schemas;
  return { templateId, registry: OPENFOUR_REGISTRY_BSC, core, tools, base, schemas };
}

function zeroValue(type: string): unknown {
  if (type === 'address') return '0x0000000000000000000000000000000000000000';
  if (type === 'bool') return false;
  if (type === 'string') return '';
  if (type === 'bytes32') return `0x${'0'.repeat(64)}`;
  if (type === 'bytes') return '0x';
  if (/^u?int\d*$/.test(type)) return 0n;
  throw new Error(`Unsupported optional ABI type ${type}`);
}

function paramValue(param: ParamDescriptor, fields: Record<string, unknown>): unknown {
  let raw = fields[param.name];
  if (raw === undefined || raw === null || raw === '') raw = param.defaultValue || undefined;
  if (raw === undefined || raw === null || raw === '') {
    if (param.optional) return zeroValue(param.abiType);
    throw new Error(`Missing required module parameter ${param.name}`);
  }
  const text = String(raw);
  if (param.abiType === 'bool') {
    if (raw === true || text === 'true' || text === '1') return true;
    if (raw === false || text === 'false' || text === '0') return false;
    throw new Error(`Invalid bool for ${param.name}`);
  }
  if (param.abiType === 'address') {
    if (!isAddress(text)) throw new Error(`Invalid address for ${param.name}`);
    return getAddress(text);
  }
  if (param.abiType === 'string') return text;
  if (param.abiType.startsWith('bytes')) {
    if (!isHex(text)) throw new Error(`Invalid hex for ${param.name}`);
    if (param.abiType === 'bytes32' && text.length !== 66) throw new Error(`Invalid bytes32 for ${param.name}`);
    return text;
  }
  if (/^u?int\d*$/.test(param.abiType)) {
    const number = param.decimals > 0 ? parseUnits(text, param.decimals) : BigInt(text);
    const bound = (value: string) => param.decimals > 0 ? parseUnits(value, param.decimals) : BigInt(value);
    if (param.minValue && number < bound(param.minValue)) throw new Error(`${param.name} is below schema minimum ${param.minValue}`);
    if (param.maxValue && number > bound(param.maxValue)) throw new Error(`${param.name} exceeds schema maximum ${param.maxValue}`);
    return number;
  }
  throw new Error(`Unsupported ABI type ${param.abiType} for ${param.name}`);
}

export function encodeModuleParams(schema: ModuleSchema, fields: Record<string, unknown> = {}): Hex {
  const names = new Set(schema.params.map((p) => p.name));
  for (const name of Object.keys(fields)) if (!names.has(name)) throw new Error(`Unknown parameter ${name} for module ${schema.kind}`);
  if (schema.params.length === 0) return '0x';
  const components = schema.params.map((p) => ({ name: p.name, type: p.abiType }));
  const values = schema.params.map((p) => paramValue(p, fields));
  return encodeAbiParameters([{ name: 'params', type: 'tuple', components }] as AbiParameter[], [values] as never);
}

export function buildCreatePayload(input: CreateInput, config: Record<string, unknown>, schemas: Schemas, imgUrl: string) {
  const templateId = Number(checkedId(input.templateId));
  for (const name of Object.keys(input.fields ?? {})) {
    if (!MODULES.includes(name as ModuleName)) throw new Error(`Unknown module ${name}`);
  }
  const initParams = Object.fromEntries(MODULES.map((name) => [
    `${name}Params`, encodeModuleParams(schemas[name], input.fields?.[name] ?? {}),
  ]));
  const payload = {
    ...input.extraPayload,
    templateId,
    name: input.name,
    shortName: input.shortName,
    symbol: String(config.symbol),
    desc: input.desc,
    imgUrl,
    totalSupply: input.totalSupply ?? config.totalSupply,
    saleAmount: input.saleAmount ?? config.saleAmount,
    raisedAmount: input.raisedAmount ?? config.raisedAmount,
    presaleQuote: input.presaleQuote ?? '0',
    feePlan: input.feePlan ?? true,
    initParams,
    ...(input.webUrl ? { webUrl: input.webUrl } : {}),
    ...(input.telegramUrl ? { telegramUrl: input.telegramUrl } : {}),
    ...(input.twitterUrl ? { twitterUrl: input.twitterUrl } : {}),
  };
  for (const key of ['totalSupply', 'saleAmount', 'raisedAmount'] as const) {
    if (payload[key] === undefined || payload[key] === '') throw new Error(`Missing ${key} in template config and input`);
  }
  return payload;
}

function keyAccount() {
  const raw = process.env.PRIVATE_KEY;
  if (!raw || !/^(0x)?[0-9a-fA-F]{64}$/.test(raw)) throw new Error('Set a valid PRIVATE_KEY');
  return privateKeyToAccount((raw.startsWith('0x') ? raw : `0x${raw}`) as Hex);
}

async function login(account: ReturnType<typeof keyAccount>): Promise<string> {
  const nonce = await apiJson('/private/user/nonce/generate', 'POST', {
    accountAddress: account.address, verifyType: 'LOGIN', networkCode: 0,
  });
  if (typeof nonce.data !== 'string') throw new Error('Nonce response missing data');
  const signature = await account.signMessage({ message: `You are sign in Meme ${nonce.data}` });
  const response = await apiJson('/private/user/login/dex', 'POST', {
    region: 'WEB', langType: 'EN', loginIp: '', inviteCode: '', walletName: 'MetaMask',
    verifyInfo: { address: account.address, networkCode: 0, signature, verifyType: 'LOGIN' },
  });
  if (typeof response.data !== 'string') throw new Error('Login response missing token');
  return response.data;
}

async function imageUrl(input: CreateInput, token: string): Promise<string> {
  if (input.imgUrl) return input.imgUrl;
  const form = new FormData();
  const path = input.imagePath!;
  form.append('file', new Blob([readFileSync(path)]), basename(path));
  const response = await fetch(`${API_BASE}/private/token/upload`, {
    method: 'POST', headers: apiHeaders(token), body: form,
  });
  if (!response.ok) throw new Error(`Image upload: HTTP ${response.status}`);
  const data = asObject(await response.json(), 'image upload');
  if (data.code !== 0 && data.code !== '0') throw new Error(`Image upload: ${String(data.msg ?? 'failed')}`);
  const image = typeof data.data === 'string' ? null : asObject(data.data, 'image upload data');
  const url = typeof data.data === 'string' ? data.data : image?.url ?? image?.imgUrl ?? image?.imageUrl ?? image?.path;
  if (typeof url !== 'string' || !url) throw new Error('Image upload response missing URL');
  return url;
}

function toHex(value: unknown, label: string): Hex {
  if (typeof value !== 'string' || !value) throw new Error(`Create response missing ${label}`);
  if (isHex(value)) return value;
  if (/^[a-fA-F0-9]+$/.test(value) && value.length % 2 === 0) return `0x${value}`;
  const bytes = Buffer.from(value, 'base64');
  if (bytes.length === 0 || bytes.toString('base64').replace(/=+$/, '') !== value.replace(/=+$/, '')) throw new Error(`Invalid ${label}`);
  return `0x${bytes.toString('hex')}`;
}

export async function createViaApi(input: CreateInput): Promise<CreateData> {
  const account = keyAccount();
  const [config, schema] = await Promise.all([
    getTemplateConfig(input.templateId, input.quoteSymbol),
    getCreateSchema(input.templateId),
  ]);
  if (typeof config.symbolAddress !== 'string' || !isAddress(config.symbolAddress)) {
    throw new Error('Template config has no valid quote asset');
  }
  // Validate required module values before login or image upload.
  buildCreatePayload(input, config, schema.schemas, input.imgUrl ?? '<uploaded at create time>');
  const token = await login(account);
  const imgUrl = await imageUrl(input, token);
  const payload = buildCreatePayload(input, config, schema.schemas, imgUrl);
  const response = await apiJson('/private/token_template/token/create', 'POST', payload, token);
  const item = Array.isArray(response.data) ? response.data[0] : response.data;
  const data = asObject(item, 'create response');
  const result = { createArg: normalizeCreateArg(toHex(data.createArg, 'createArg')).createArg,
    signature: toHex(data.signature, 'signature'),
    ...(data.tokenId !== undefined ? { tokenId: String(data.tokenId) } : {}) };
  const signed = decodeCreateArg(result.createArg);
  if (signed.presetId !== BigInt(input.templateId)) throw new Error('API signed a different templateId');
  if (signed.initParams.name !== input.name || signed.initParams.symbol !== input.shortName) {
    throw new Error('API signed different token metadata');
  }
  if (signed.initParams.quoteAsset.toLowerCase() !== config.symbolAddress.toLowerCase()) {
    throw new Error('API signed a different quote asset');
  }
  if (config.decimals !== undefined &&
      signed.presaleQuote !== parseUnits(String(input.presaleQuote ?? '0'), Number(config.decimals))) {
    throw new Error('API signed a different presale budget from the requested amount');
  }
  return result;
}

export function normalizeCreateArg(createArg: Hex) {
  if (!isHex(createArg) || createArg === '0x') throw new Error('Invalid createArg');
  try { return { createArg, decoded: decodeAbiParameters(CREATE_ARG_ABI, createArg)[0] }; }
  catch {
    try {
      const legacy = decodeAbiParameters(LEGACY_NO_PARTNER_ABI, createArg)[0];
      const decoded = { ...legacy, partner: '0x0000000000000000000000000000000000000000' as const };
      return { createArg: encodeAbiParameters(CREATE_ARG_ABI, [decoded]), decoded };
    } catch {
      try {
        const legacy = decodeAbiParameters(LEGACY_NO_CUSTOM_ABI, createArg)[0];
        const decoded = { ...legacy, partner: '0x0000000000000000000000000000000000000000' as const,
          initParams: { ...legacy.initParams, customDataParams: '0x' as const } };
        return { createArg: encodeAbiParameters(CREATE_ARG_ABI, [decoded]), decoded };
      } catch { throw new Error('Could not decode OpenFour createArg'); }
    }
  }
}

export function decodeCreateArg(createArg: Hex) { return normalizeCreateArg(createArg).decoded; }

export function computeCreatePayment(decoded: ReturnType<typeof decodeCreateArg>, wrappedNative: string) {
  const quoteAsset = getAddress(decoded.initParams.quoteAsset);
  const presaleNative = quoteAsset.toLowerCase() === wrappedNative.toLowerCase();
  const valueWei = decoded.createFee + (presaleNative ? decoded.presaleQuote : 0n);
  return { quoteAsset, presaleNative, valueWei,
    createFeeWei: decoded.createFee, presaleQuoteWei: decoded.presaleQuote,
    presetId: decoded.presetId };
}

export async function prepareChain(data: CreateData) {
  const { core } = await getOpenFourContracts();
  const client = publicClient();
  const wrappedNative = await client.readContract({ address: core, abi: OPENFOUR_CORE_ABI, functionName: 'wrappedNative' });
  return { core, wrappedNative, ...computeCreatePayment(decodeCreateArg(data.createArg), wrappedNative) };
}

export async function createOnChain(data: CreateData) {
  const account = keyAccount();
  const client = publicClient();
  if (await client.getChainId() !== 56) throw new Error('BSC_RPC_URL must point to BSC mainnet (chainId 56)');
  const prepared = await prepareChain(data);
  const normalizedArg = normalizeCreateArg(data.createArg).createArg;
  const wallet = createWalletClient({ account, chain: bsc, transport: http(rpcUrl()) });
  let approvalHash: Hex | undefined;
  if (!prepared.presaleNative && prepared.presaleQuoteWei > 0n) {
    const balance = await client.readContract({ address: prepared.quoteAsset, abi: ERC20_ABI, functionName: 'balanceOf', args: [account.address] });
    if (balance < prepared.presaleQuoteWei) throw new Error('Insufficient quote token balance for presale');
    const allowance = await client.readContract({ address: prepared.quoteAsset, abi: ERC20_ABI, functionName: 'allowance', args: [account.address, prepared.core] });
    if (allowance < prepared.presaleQuoteWei) {
      const approval = await client.simulateContract({ address: prepared.quoteAsset, abi: ERC20_ABI, functionName: 'approve', args: [prepared.core, prepared.presaleQuoteWei], account });
      approvalHash = await wallet.writeContract(approval.request);
      const approvalReceipt = await client.waitForTransactionReceipt({ hash: approvalHash });
      if (approvalReceipt.status !== 'success') throw new Error('Quote token approval reverted');
    }
  }
  const simulation = await client.simulateContract({ address: prepared.core, abi: OPENFOUR_CORE_ABI,
    functionName: 'createToken', args: [normalizedArg, data.signature], value: prepared.valueWei, account });
  const txHash = await wallet.writeContract(simulation.request);
  const receipt = await client.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== 'success') throw new Error(`OpenFour create transaction reverted: ${txHash}`);
  return { txHash, tokenAddress: tokenAddressFromLogs(receipt.logs, prepared.core), tokenId: data.tokenId, presetId: prepared.presetId.toString(),
    valueWei: prepared.valueWei.toString(), ...(approvalHash ? { approvalHash } : {}) };
}

export function tokenAddressFromLogs(logs: readonly { address: string; data: Hex; topics: readonly Hex[] }[], core: string): string | null {
  for (const log of logs) {
    if (log.address.toLowerCase() !== core.toLowerCase()) continue;
    if (log.topics.length === 0) continue;
    try {
      const decoded = decodeEventLog({ abi: OPENFOUR_CORE_ABI, data: log.data,
        topics: [...log.topics] as [Hex, ...Hex[]], eventName: 'TokenCreated' });
      return decoded.args.token;
    } catch { /* Ignore other Core events. */ }
  }
  return null;
}
