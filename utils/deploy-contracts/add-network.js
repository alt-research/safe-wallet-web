#!/usr/bin/env node

/**
 * Script to add a network configuration to hardhat.config.ts
 * This handles the TypeScript syntax properly
 */

const fs = require('fs');
const path = require('path');

const networkName = process.env.NETWORK_NAME || 'custom';
const chainId = process.env.CHAIN_ID;
const rpcUrl = process.env.NODE_URL || process.env.RPC_URL;

if (!chainId) {
  console.error('Error: CHAIN_ID environment variable is required');
  process.exit(1);
}

const configPath = path.join(process.cwd(), 'hardhat.config.ts');

// Read the config file
let content = fs.readFileSync(configPath, 'utf8');

// Check if network already exists
// Escape special regex characters in network name
const escapedNetworkName = networkName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const networkPattern = new RegExp(`['"]${escapedNetworkName}['"]\\s*:\\s*{`, 'g');
if (networkPattern.test(content)) {
  console.log(`⚠️  Network '${networkName}' already exists in hardhat.config.ts`);
  console.log('ℹ️  Using existing configuration');
  process.exit(0);
}

console.log(`📝 Adding network '${networkName}' to hardhat.config.ts...`);

// Backup original
fs.writeFileSync(configPath + '.backup', content);

// Network configuration to add
// Always quote the network name to handle special characters like hyphens
const networkConfig = `    "${networkName}": {
      url: process.env.NODE_URL || "",
      chainId: ${chainId},
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gas: "auto",
      gasPrice: "auto",
      gasMultiplier: 1.5,
      timeout: 60000,
    },
`;

// Find the networks section and add our configuration
// Look for "networks: {" and insert after it
const networksPattern = /(\s*networks:\s*{)/;
const match = content.match(networksPattern);

if (!match) {
  console.error('Error: Could not find "networks: {" section in hardhat.config.ts');
  process.exit(1);
}

// Insert the network configuration right after "networks: {"
const insertPosition = match.index + match[0].length;
content = content.slice(0, insertPosition) + '\n' + networkConfig + content.slice(insertPosition);

// Write the modified content back
fs.writeFileSync(configPath, content);

console.log('✅ Network configuration added successfully');
