#!/usr/bin/env node
import { executeTrade, loadTradeInput, quoteJson, quoteTrade } from './openfour-trade.js';

async function main() {
  const [command, file] = process.argv.slice(2);
  if (!file || !['quote', 'execute'].includes(command)) {
    throw new Error('Usage: fourmeme openfour-trade-quote <config.json> | fourmeme openfour-trade <config.json>');
  }
  const input = loadTradeInput(file);
  if (command === 'quote') {
    if (!input.trader) throw new Error('Read-only quote requires trader address in config.json');
    console.log(JSON.stringify(quoteJson(await quoteTrade(input, input.trader as `0x${string}`)), null, 2));
  } else {
    console.log(JSON.stringify(await executeTrade(input), null, 2));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
