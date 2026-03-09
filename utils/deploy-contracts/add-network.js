#!/usr/bin/env node

/**
 * Patches the existing userConfig.networks!.custom block in hardhat.config.ts
 * to add chainId and optional Blockscout verification config.
 *
 * The safe-smart-account repo already has a `userConfig.networks!.custom`
 * block driven by NODE_URL — we extend it rather than adding a duplicate entry.
 */

const fs = require('fs');
const path = require('path');

const chainId = process.env.CHAIN_ID;
const blockscoutUrl = process.env.BLOCKSCOUT_URL;

if (!chainId) {
  console.error('Error: CHAIN_ID environment variable is required');
  process.exit(1);
}

const configPath = path.join(process.cwd(), 'hardhat.config.ts');
let content = fs.readFileSync(configPath, 'utf8');

if (content.includes('// Patched: network config')) {
  process.exit(0);
}

const verifyLine = blockscoutUrl
  ? '\n        verify: { etherscan: { apiUrl: "' + blockscoutUrl.replace(/\/$/, '') + '/api", apiKey: "verifyContract" } },'
  : '';

const patched = content.replace(
  /userConfig\.networks!\.custom\s*=\s*\{([\s\S]*?)\};/,
  'userConfig.networks!.custom = {// Patched: network config\n        chainId: ' + chainId + ',' + verifyLine + '$1};'
);

if (patched === content) {
  console.error('Error: Could not find userConfig.networks!.custom block in hardhat.config.ts');
  process.exit(1);
}

fs.writeFileSync(configPath, patched);
console.log('Network config patched (chainId: ' + chainId + (blockscoutUrl ? ', Blockscout: ' + blockscoutUrl : '') + ')');
