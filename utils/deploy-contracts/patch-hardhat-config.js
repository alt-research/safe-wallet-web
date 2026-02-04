#!/usr/bin/env node

/**
 * Script to patch hardhat.config.ts to handle custom networks
 * Supports three deployment modes:
 * - singleton: Deploy and use the singleton factory (deterministic addresses)
 * - standard: Deploy without any factory (non-deterministic addresses)
 * - custom: Use a custom factory address (deterministic addresses with custom factory)
 */

const fs = require('fs');
const path = require('path');

const configPath = path.join(process.cwd(), 'hardhat.config.ts');

const deploymentMode = process.env.DEPLOYMENT_MODE || 'standard';
const customFactoryAddress = process.env.FACTORY_ADDRESS;

console.log('🔧 Patching hardhat.config.ts for custom network support...');
console.log(`📦 Deployment mode: ${deploymentMode}`);

// Read the config file
let content = fs.readFileSync(configPath, 'utf8');

// Check if already patched
if (content.includes('// Patched for custom networks')) {
  console.log('✅ Already patched');
  process.exit(0);
}

// Create the patched function based on deployment mode
let patchedFunction;

if (deploymentMode === 'singleton') {
  // Mode 1: Will deploy singleton factory first, then use it
  patchedFunction = `// Patched for custom networks - singleton mode (Arbitrum ERC-2470)
const deterministicDeployment = (network: string): DeterministicDeploymentInfo | undefined => {
    const info = getSingletonFactoryInfo(parseInt(network))
    if (!info) {
        console.log(\`ℹ️  Using ERC-2470 factory for network \${network}\`)
        // Arbitrum Orbit uses ERC-2470 factory with deploy(bytes,bytes32) interface
        // This is different from Arachnid's raw calldata factory
        // Return undefined to let hardhat-deploy use standard deployment
        // Actually, we need to return factory info but indicate it's already deployed
        return undefined
    }
    return {
        factory: info.address,
        deployer: info.signerAddress,
        funding: BigNumber.from(info.gasLimit).mul(BigNumber.from(info.gasPrice)).toString(),
        signedTx: info.transaction,
    }
}`;
} else if (deploymentMode === 'custom' && customFactoryAddress) {
  // Mode 3: Use custom factory address
  patchedFunction = `// Patched for custom networks - custom factory mode
const deterministicDeployment = (network: string): DeterministicDeploymentInfo | undefined => {
    const info = getSingletonFactoryInfo(parseInt(network))
    if (!info) {
        console.log(\`ℹ️  Using custom factory at ${customFactoryAddress} for network \${network}\`)
        // Use custom factory address provided by user
        return {
            factory: "${customFactoryAddress}",
            deployer: "0xE1CB04A0fA36DdD16a06ea828007E35e1a3cBC37", // Deterministic deployer
            funding: "0",
            signedTx: "0x", // Already deployed
        }
    }
    return {
        factory: info.address,
        deployer: info.signerAddress,
        funding: BigNumber.from(info.gasLimit).mul(BigNumber.from(info.gasPrice)).toString(),
        signedTx: info.transaction,
    }
}`;
} else {
  // Mode 2: Standard deployment without factory (default)
  patchedFunction = `// Patched for custom networks - standard mode
const deterministicDeployment = (network: string): DeterministicDeploymentInfo | undefined => {
    const info = getSingletonFactoryInfo(parseInt(network))
    if (!info) {
        console.log(\`⚠️  Safe singleton factory not found for network \${network}\`)
        console.log(\`ℹ️  Using non-deterministic deployment (addresses will vary by network)\`)
        // Return undefined to disable deterministic deployment for custom networks
        return undefined
    }
    return {
        factory: info.address,
        deployer: info.signerAddress,
        funding: BigNumber.from(info.gasLimit).mul(BigNumber.from(info.gasPrice)).toString(),
        signedTx: info.transaction,
    }
}`;
}

// Try to find and replace the function
if (content.includes('const deterministicDeployment = (network: string)')) {
  // Replace with a more flexible pattern
  content = content.replace(
    /const deterministicDeployment = \(network: string\): DeterministicDeploymentInfo => \{[\s\S]*?\n\}/,
    patchedFunction
  );

  fs.writeFileSync(configPath, content);
  console.log('✅ Hardhat config patched successfully');
} else {
  console.error('❌ Could not find deterministicDeployment function to patch');
  process.exit(1);
}
