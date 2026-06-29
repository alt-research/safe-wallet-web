#!/usr/bin/env node

/**
 * Patches the deploy_contracts task (TypeScript source — hardhat runs via ts-node) to:
 * 1. Skip local-verify (downloads Solc binaries from solc-bin.ethereum.org)
 * 2. Skip sourcify (also downloads Solc binaries and fails on custom chains)
 * 3. Skip Etherscan verification when ETHERSCAN_API_KEY is not set
 */

const fs = require('fs');
const path = require('path');

const taskPath = path.join(process.cwd(), 'src/tasks/deploy_contracts.ts');
let content = fs.readFileSync(taskPath, 'utf8');

if (content.includes('// Patched: skip solc-downloading steps')) {
  process.exit(0);
}

// Remove local-verify (downloads Solc to recompile and compare bytecode)
content = content.replace(/\s*await hre\.run\("local-verify"\);/, '');

// Remove sourcify (downloads Solc as part of verification payload)
content = content.replace(/\s*await hre\.run\("sourcify"\);/, '');

// Wrap etherscan-verify so it only runs when ETHERSCAN_API_KEY is set
const originalPattern = /await hre\.run\("etherscan-verify",\s*\{[\s\S]*?\}\);?/;

if (originalPattern.test(content)) {
  const patchedCode =
    '// Patched: skip solc-downloading steps\n' +
    '    if (process.env.ETHERSCAN_API_KEY) {\n' +
    '        await hre.run("etherscan-verify", { forceLicense: true, license: "LGPL-3.0" });\n' +
    '    }';
  content = content.replace(originalPattern, patchedCode);
} else {
  // etherscan-verify already removed or missing — just add the guard comment so the idempotency check works
  content = content.replace(
    /(\s*}\);?\s*$)/,
    '\n    // Patched: skip solc-downloading steps$1'
  );
}

fs.writeFileSync(taskPath, content);
