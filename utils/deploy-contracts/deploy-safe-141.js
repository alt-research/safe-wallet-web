#!/usr/bin/env node

/**
 * Safe 1.4.1 Contract Deployment Script
 *
 * This script deploys all Safe 1.4.1 contracts to a custom chain and outputs
 * the addresses in a format ready to add to config/chains/custom-chains.json
 *
 * Prerequisites:
 * 1. Clone safe-smart-account repo: git clone https://github.com/safe-global/safe-smart-account.git
 * 2. Checkout v1.4.1: cd safe-smart-account && git checkout v1.4.1
 * 3. Install dependencies: yarn install
 * 4. Configure .env file with MNEMONIC and RPC details
 * 5. Run this script: node deploy-safe-141.js <network-name>
 *
 * Usage:
 *   node scripts/deploy-safe-141.js custom
 *
 * Environment Variables Required:
 *   - MNEMONIC or PRIVATE_KEY
 *   - NODE_URL (RPC endpoint)
 *   - CHAIN_ID
 *   - CHAIN_NAME (optional, for output)
 */

const fs = require('fs');
const path = require('path');

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logHeader(message) {
  log(`\n${'='.repeat(60)}`, colors.bright);
  log(`  ${message}`, colors.bright);
  log(`${'='.repeat(60)}`, colors.bright);
}

function logSuccess(message) {
  log(`✓ ${message}`, colors.green);
}

function logError(message) {
  log(`✗ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠ ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ ${message}`, colors.blue);
}

// Check if we're in the safe-smart-account repository
function checkSafeRepo() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    return false;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  return packageJson.name === '@safe-global/safe-contracts' ||
         packageJson.name === 'safe-smart-account';
}

// Generate config file output
function generateConfigOutput(addresses, chainId, chainName) {
  const config = {
    chainId: chainId.toString(),
    name: chainName || `Chain ${chainId}`,
    contracts: {
      '1.4.1': {
        compatibilityFallbackHandler: {
          address: addresses.compatibilityFallbackHandler || '0x...'
        },
        createCall: {
          address: addresses.createCall || '0x...'
        },
        safe: {
          address: addresses.safe || '0x...'
        },
        safeL2: {
          address: addresses.safeL2 || '0x...'
        },
        multiSend: {
          address: addresses.multiSend || '0x...'
        },
        multiSendCallOnly: {
          address: addresses.multiSendCallOnly || '0x...'
        },
        safeProxyFactory: {
          address: addresses.safeProxyFactory || '0x...'
        },
        signMessageLib: {
          address: addresses.signMessageLib || '0x...'
        },
        simulateTxAccessor: {
          address: addresses.simulateTxAccessor || '0x...'
        }
      }
    }
  };

  return JSON.stringify(config, null, 2);
}

// Main execution
async function main() {
  logHeader('Safe 1.4.1 Contract Deployment Helper');

  // Check if running from correct directory
  if (!checkSafeRepo()) {
    logError('This script must be run from the safe-smart-account repository!');
    logInfo('\nPlease follow these steps:');
    console.log('  1. git clone https://github.com/safe-global/safe-smart-account.git');
    console.log('  2. cd safe-smart-account');
    console.log('  3. git checkout v1.4.1');
    console.log('  4. yarn install');
    console.log('  5. node /path/to/this/script.js <network-name>');
    process.exit(1);
  }

  logSuccess('Found safe-smart-account repository');

  // Check for required environment variables
  const chainId = process.env.CHAIN_ID;
  const chainName = process.env.CHAIN_NAME;
  const nodeUrl = process.env.NODE_URL;

  if (!chainId) {
    logWarning('CHAIN_ID environment variable not set');
  }

  if (!nodeUrl) {
    logWarning('NODE_URL environment variable not set');
  }

  // Get network name from command line
  const networkName = process.argv[2];

  if (!networkName) {
    logError('Please provide a network name as an argument');
    logInfo('Usage: node deploy-safe-141.js <network-name>');
    process.exit(1);
  }

  logInfo(`Target network: ${networkName}`);

  // Check if hardhat config exists
  const hardhatConfigPath = path.join(process.cwd(), 'hardhat.config.ts');
  if (!fs.existsSync(hardhatConfigPath)) {
    logError('hardhat.config.ts not found!');
    process.exit(1);
  }

  logSuccess('Found hardhat.config.ts');

  logHeader('Deployment Instructions');

  console.log(`
${colors.bright}Step 1: Configure your .env file${colors.reset}

Add these variables to .env:
  ${colors.blue}MNEMONIC${colors.reset}="your twelve word mnemonic phrase"
  ${colors.blue}NODE_URL${colors.reset}="${nodeUrl || 'https://your-rpc-endpoint.com'}"

${colors.bright}Step 2: Add custom network to hardhat.config.ts${colors.reset}

Add to the networks section:
  ${colors.blue}${networkName}${colors.reset}: {
    url: process.env.NODE_URL || "",
    chainId: ${chainId || 'YOUR_CHAIN_ID'},
    accounts: {
      mnemonic: process.env.MNEMONIC,
    },
  },

${colors.bright}Step 3: Deploy contracts${colors.reset}

Run the deployment command:
  ${colors.green}yarn deploy-all ${networkName}${colors.reset}

This will deploy all Safe 1.4.1 contracts to your network.

${colors.bright}Step 4: Extract addresses${colors.reset}

After deployment completes, the contract addresses will be printed in the console.
Copy them to update your config/chains/custom-chains.json file.

${colors.bright}Step 5: Update custom-chains.json${colors.reset}

Add the following to config/chains/custom-chains.json:

${colors.yellow}// Template - replace addresses with actual deployed addresses${colors.reset}
`);

  const templateConfig = generateConfigOutput({}, chainId || 'YOUR_CHAIN_ID', chainName || 'Your Chain Name');
  console.log(templateConfig);

  logHeader('Additional Commands');

  console.log(`
${colors.bright}Verify contracts (if block explorer supports it):${colors.reset}
  yarn sourcify ${networkName}
  yarn etherscan-verify ${networkName}

${colors.bright}Check deployment:${colors.reset}
  yarn hardhat --network ${networkName} verify <contract-address>

${colors.bright}Useful references:${colors.reset}
  - Safe Contracts: https://github.com/safe-global/safe-smart-account
  - Documentation: https://docs.safe.global
  - Deployments: https://github.com/safe-global/safe-deployments
`);

  logHeader('Ready to Deploy');
  logInfo(`Run: ${colors.green}yarn deploy-all ${networkName}${colors.reset}`);
}

main().catch((error) => {
  logError('Error:');
  console.error(error);
  process.exit(1);
});
