#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { buildCreatePayload, createOnChain, createViaApi, getCreateSchema, getTemplateConfig, loadCreateInput, prepareChain, searchTemplates, type CreateData } from './openfour.js';

async function main() {
  const [command, ...args] = process.argv.slice(2);
  switch (command) {
    case 'templates':
      console.log(JSON.stringify(await searchTemplates(), null, 2));
      break;
    case 'schema': {
      const templateId = args[0];
      if (!templateId) throw new Error('Usage: fourmeme openfour-schema <templateId> [quoteSymbol]');
      const [schema, config] = await Promise.all([
        getCreateSchema(templateId), getTemplateConfig(templateId, args[1]),
      ]);
      console.log(JSON.stringify({ ...schema, templateConfig: config }, null, 2));
      break;
    }
    case 'preview': {
      if (!args[0]) throw new Error('Usage: fourmeme openfour-preview <config.json>');
      const input = loadCreateInput(args[0]);
      const [schema, config] = await Promise.all([
        getCreateSchema(input.templateId), getTemplateConfig(input.templateId, input.quoteSymbol),
      ]);
      const payload = buildCreatePayload(input, config, schema.schemas, input.imgUrl ?? '<uploaded at create time>');
      console.log(JSON.stringify({ previewOnly: true, core: schema.core, quoteAsset: config.symbolAddress,
        createFee: config.createFee, quoteDecimals: config.decimals, payload }, null, 2));
      break;
    }
    case 'quote': {
      if (!args[0]) throw new Error('Usage: fourmeme openfour-quote <api-output.json|->');
      const raw = args[0] === '-' ? readFileSync(0, 'utf8') : readFileSync(args[0], 'utf8');
      const data = JSON.parse(raw) as CreateData;
      const prepared = await prepareChain(data);
      console.log(JSON.stringify({ core: prepared.core, quoteAsset: prepared.quoteAsset,
        presetId: prepared.presetId.toString(), createFeeWei: prepared.createFeeWei.toString(),
        presaleQuoteWei: prepared.presaleQuoteWei.toString(), valueWei: prepared.valueWei.toString(),
        erc20ApprovalMayBeNeeded: !prepared.presaleNative && prepared.presaleQuoteWei > 0n }, null, 2));
      break;
    }
    case 'create-api': {
      if (!args[0]) throw new Error('Usage: fourmeme openfour-create-api <config.json>');
      const data = await createViaApi(loadCreateInput(args[0]));
      console.log(JSON.stringify(data, null, 2));
      break;
    }
    case 'create-chain': {
      if (!args[0]) throw new Error('Usage: fourmeme openfour-create-chain <api-output.json|->');
      const raw = args[0] === '-' ? readFileSync(0, 'utf8') : readFileSync(args[0], 'utf8');
      const data = JSON.parse(raw) as CreateData;
      console.log(JSON.stringify(await createOnChain(data), null, 2));
      break;
    }
    case 'create-instant': {
      if (!args[0]) throw new Error('Usage: fourmeme openfour-create-instant <config.json>');
      const input = loadCreateInput(args[0]);
      if (input.maxCreateFeeWei === undefined) throw new Error('openfour-create-instant requires maxCreateFeeWei in config.json');
      const data = await createViaApi(input);
      console.error(`Signed API output for recovery: ${JSON.stringify(data)}`);
      const prepared = await prepareChain(data);
      if (prepared.createFeeWei > BigInt(input.maxCreateFeeWei)) throw new Error('Signed creation fee exceeds maxCreateFeeWei');
      console.error(`OpenFour creation fee + native presale: ${prepared.valueWei} wei`);
      console.log(JSON.stringify(await createOnChain(data), null, 2));
      break;
    }
    default:
      throw new Error('Unknown OpenFour command');
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
