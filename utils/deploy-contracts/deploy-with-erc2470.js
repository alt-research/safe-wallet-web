#!/usr/bin/env node

/**
 * Deploy Safe contracts using ERC-2470 factory (Arbitrum Orbit)
 * This script manually deploys contracts using the deploy(bytes, bytes32) interface
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const FACTORY_ADDRESS = '0xce0042B868300000d44A59004Da54A005ffdcf9f';
const FACTORY_ABI = [
  'function deploy(bytes memory _initCode, bytes32 _salt) public returns (address payable createdContract)'
];

// Contract artifacts to deploy
const CONTRACTS = [
  'SimulateTxAccessor',
  'SafeProxyFactory',
  'TokenCallbackHandler',
  'CompatibilityFallbackHandler',
  'CreateCall',
  'MultiSend',
  'MultiSendCallOnly',
  'SignMessageLib',
  'SafeL2',
  'Safe'
];

async function deployWithERC2470() {
  console.log('🚀 Deploying Safe contracts with ERC-2470 factory...\n');

  const rpcUrl = process.env.NODE_URL || process.env.RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;
  const networkName = process.env.NETWORK_NAME;

  if (!rpcUrl || !privateKey) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
  }

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, wallet);

  console.log(`📡 Network: ${rpcUrl}`);
  console.log(`👤 Deployer: ${wallet.address}`);
  console.log(`🏭 Factory: ${FACTORY_ADDRESS}\n`);

  const deployedAddresses = {};

  for (const contractName of CONTRACTS) {
    console.log(`\n📦 Deploying ${contractName}...`);

    try {
      // Find the contract artifact (artifacts are in /app/build/artifacts)
      const artifactPath = path.join('/app/build/artifacts/contracts', getContractPath(contractName));

      if (!fs.existsSync(artifactPath)) {
        console.log(`   ⚠️  Artifact not found at: ${artifactPath}`);
        console.log(`   Skipping...`);
        continue;
      }

      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
      const bytecode = artifact.bytecode;

      if (!bytecode || bytecode === '0x') {
        console.log(`   ⚠️  No bytecode, skipping`);
        continue;
      }

      // Use contract name hash as salt for deterministic addresses
      const salt = ethers.utils.id(contractName);

      // Calculate expected address
      const expectedAddress = ethers.utils.getCreate2Address(
        FACTORY_ADDRESS,
        salt,
        ethers.utils.keccak256(bytecode)
      );

      console.log(`   Expected address: ${expectedAddress}`);

      // Check if already deployed
      const existingCode = await provider.getCode(expectedAddress);
      if (existingCode !== '0x') {
        console.log(`   ✅ Already deployed, reusing`);
        deployedAddresses[contractName] = expectedAddress;
        continue;
      }

      // Deploy using factory
      console.log(`   Deploying...`);
      const tx = await factory.deploy(bytecode, salt, {
        gasLimit: 5000000
      });

      console.log(`   TX: ${tx.hash}`);
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        console.log(`   ✅ Deployed at: ${expectedAddress}`);
        console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
        deployedAddresses[contractName] = expectedAddress;
      } else {
        console.log(`   ❌ Deployment failed`);
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error.reason || error.message}`);
    }
  }

  console.log(`\n\n${'='.repeat(60)}`);
  console.log('  ✅ Deployment Complete');
  console.log('='.repeat(60));
  console.log('\n📋 Deployed Contracts:\n');

  for (const [name, address] of Object.entries(deployedAddresses)) {
    console.log(`   ${name.padEnd(35)} ${address}`);
  }

  console.log('');
}

function getContractPath(contractName) {
  const paths = {
    'SimulateTxAccessor': 'accessors/SimulateTxAccessor.sol/SimulateTxAccessor.json',
    'SafeProxyFactory': 'proxies/SafeProxyFactory.sol/SafeProxyFactory.json',
    'TokenCallbackHandler': 'handler/TokenCallbackHandler.sol/TokenCallbackHandler.json',
    'CompatibilityFallbackHandler': 'handler/CompatibilityFallbackHandler.sol/CompatibilityFallbackHandler.json',
    'CreateCall': 'libraries/CreateCall.sol/CreateCall.json',
    'MultiSend': 'libraries/MultiSend.sol/MultiSend.json',
    'MultiSendCallOnly': 'libraries/MultiSendCallOnly.sol/MultiSendCallOnly.json',
    'SignMessageLib': 'libraries/SignMessageLib.sol/SignMessageLib.json',
    'SafeL2': 'SafeL2.sol/SafeL2.json',
    'Safe': 'Safe.sol/Safe.json'
  };

  return paths[contractName] || `${contractName}.sol/${contractName}.json`;
}

if (require.main === module) {
  deployWithERC2470()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('\n❌ Fatal error:', error);
      process.exit(1);
    });
}
