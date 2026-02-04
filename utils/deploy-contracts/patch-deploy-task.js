#!/usr/bin/env node

/**
 * Script to patch the deploy_contracts task to skip Etherscan verification
 * when ETHERSCAN_API_KEY is not provided
 */

const fs = require('fs');
const path = require('path');

const taskPath = path.join(process.cwd(), 'src/tasks/deploy_contracts.ts');

console.log('🔧 Patching deploy_contracts task to skip Etherscan verification...');

// Read the task file
let content = fs.readFileSync(taskPath, 'utf8');

// Check if already patched
if (content.includes('// Patched to skip verification')) {
  console.log('✅ Already patched');
  process.exit(0);
}

// Find the line that runs etherscan-verify and make it conditional
// Original pattern: await hre.run("etherscan-verify", {...})
const originalPattern = /await hre\.run\("etherscan-verify",\s*\{[\s\S]*?\}\);?/;

const patchedCode = `// Patched to skip verification when no API key is provided
    if (process.env.ETHERSCAN_API_KEY) {
        await hre.run("etherscan-verify", {
            license: "LGPL-3.0",
            solcInput: true,
        });
    } else {
        console.log("⚠️  Skipping Etherscan verification (no ETHERSCAN_API_KEY provided)");
    }`;

if (originalPattern.test(content)) {
  content = content.replace(originalPattern, patchedCode);
  fs.writeFileSync(taskPath, content);
  console.log('✅ Deploy task patched successfully');
} else {
  console.log('⚠️  Could not find etherscan-verify call, deployment will continue');
  // Don't fail - just continue without patching
  process.exit(0);
}
