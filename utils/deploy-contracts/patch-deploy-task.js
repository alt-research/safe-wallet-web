#!/usr/bin/env node

/**
 * Patches the deploy_contracts task to skip Etherscan verification
 * when ETHERSCAN_API_KEY is not set. Pass -e ETHERSCAN_API_KEY="..." to enable it.
 */

const fs = require('fs');
const path = require('path');

const taskPath = path.join(process.cwd(), 'src/tasks/deploy_contracts.ts');
let content = fs.readFileSync(taskPath, 'utf8');

if (content.includes('// Patched to skip verification')) {
  process.exit(0);
}

const originalPattern = /await hre\.run\("etherscan-verify",\s*\{[\s\S]*?\}\);?/;

if (!originalPattern.test(content)) {
  process.exit(0);
}

const patchedCode =
  '// Patched to skip verification when no API key is provided\n' +
  '    if (process.env.ETHERSCAN_API_KEY) {\n' +
  '        await hre.run("etherscan-verify", { forceLicense: true, license: "LGPL-3.0" });\n' +
  '    }';

content = content.replace(originalPattern, patchedCode);
fs.writeFileSync(taskPath, content);
