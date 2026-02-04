#!/usr/bin/env node

/**
 * Script to deploy the singleton factory to a custom network
 * Based on https://github.com/Arachnid/deterministic-deployment-proxy
 */

const { ethers } = require('ethers');

const DEPLOYER_ADDRESS = '0xBb6e024b9cFFACB947A71991E386681B1Cd1477D';
const FACTORY_ADDRESS = '0xce0042B868300000d44A59004Da54A005ffdcf9f';
const DEPLOYMENT_TX = '0xf8a58085174876e800830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf31ba02222222222222222222222222222222222222222222222222222222222222222a02222222222222222222222222222222222222222222222222222222222222222';
const FUNDING_AMOUNT = '0.01'; // ETH needed for deployment

async function deploySingletonFactory() {
  console.log('');
  console.log('============================================================');
  console.log('  Singleton Factory Deployment');
  console.log('============================================================');
  console.log('');

  const rpcUrl = process.env.NODE_URL || process.env.RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;

  if (!rpcUrl) {
    console.error('❌ Error: RPC_URL or NODE_URL environment variable is required');
    process.exit(1);
  }

  if (!privateKey) {
    console.error('❌ Error: PRIVATE_KEY environment variable is required');
    process.exit(1);
  }

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log(`📡 Connected to: ${rpcUrl}`);
  console.log(`👤 Deployer: ${wallet.address}`);
  console.log('');

  // Check if factory is already deployed and verify it's the correct one
  const factoryCode = await provider.getCode(FACTORY_ADDRESS);
  const expectedArachnidCode = '0x604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf3';
  const expectedERC2470Length = 618; // ERC-2470 factory bytecode length

  if (factoryCode !== '0x') {
    if (factoryCode === expectedArachnidCode) {
      console.log('✅ Arachnid singleton factory already deployed at:', FACTORY_ADDRESS);
      console.log('');
      return FACTORY_ADDRESS;
    } else if (factoryCode.length === expectedERC2470Length) {
      // This is the ERC-2470 factory (Arbitrum Orbit)
      console.log('✅ ERC-2470 factory detected at:', FACTORY_ADDRESS);
      console.log('   This is the Arbitrum/ERC-2470 variant with deploy(bytes,bytes32) interface');
      console.log('   Will use custom ERC-2470 deployment method');
      console.log('');
      return FACTORY_ADDRESS;
    } else {
      console.log('⚠️  Warning: Different contract found at', FACTORY_ADDRESS);
      console.log('   Expected Arachnid factory bytecode length:', expectedArachnidCode.length);
      console.log('   Expected ERC-2470 factory bytecode length:', expectedERC2470Length);
      console.log('   Found bytecode length:', factoryCode.length);
      console.log('   This is NOT a recognized singleton factory!');
      console.log('');
      console.log('❌ Cannot proceed - singleton factory address is occupied by wrong contract');
      console.log('   The standard singleton factory requires deterministic address:', FACTORY_ADDRESS);
      console.log('');
      console.log('💡 Options:');
      console.log('   1. Use DEPLOYMENT_MODE=standard (recommended)');
      console.log('      Standard mode works fine and contracts are already deployed.');
      console.log('');
      console.log('   2. Deploy alternative factory at different address');
      console.log('      Set: DEPLOY_ALT_FACTORY=true');
      console.log('      Then use: DEPLOYMENT_MODE=custom with the factory address');
      console.log('');

      // Check if user wants to deploy alternative factory
      if (process.env.DEPLOY_ALT_FACTORY === 'true') {
        console.log('🔄 DEPLOY_ALT_FACTORY=true detected, deploying alternative factory...');
        const { deployAlternativeFactory } = require('./deploy-alternative-factory.js');
        const altAddress = await deployAlternativeFactory();
        console.log('✅ Use this address with DEPLOYMENT_MODE=custom');
        console.log(`   FACTORY_ADDRESS=${altAddress}`);
        return altAddress;
      }

      process.exit(1);
    }
  }

  console.log('📦 Deploying singleton factory...');
  console.log(`   Factory address: ${FACTORY_ADDRESS}`);
  console.log(`   Deployer address: ${DEPLOYER_ADDRESS}`);
  console.log('');

  // Step 1: Fund the deployer address
  console.log('💰 Funding deployer address...');
  const balance = await provider.getBalance(DEPLOYER_ADDRESS);
  const requiredFunding = ethers.utils.parseEther(FUNDING_AMOUNT);

  if (balance.lt(requiredFunding)) {
    const fundingTx = await wallet.sendTransaction({
      to: DEPLOYER_ADDRESS,
      value: requiredFunding.sub(balance),
    });
    console.log(`   Transaction hash: ${fundingTx.hash}`);
    console.log('   Waiting for confirmation...');
    await fundingTx.wait();
    console.log('✅ Deployer funded');
  } else {
    console.log('✅ Deployer already has sufficient funds');
  }

  // Step 2: Deploy the factory using the signed transaction
  console.log('');
  console.log('🚀 Broadcasting factory deployment transaction...');
  try {
    const deployTx = await provider.sendTransaction(DEPLOYMENT_TX);
    console.log(`   Transaction hash: ${deployTx.hash}`);
    console.log('   Waiting for confirmation...');
    const receipt = await deployTx.wait();

    if (receipt.status === 1) {
      console.log('✅ Singleton factory deployed successfully!');
      console.log(`   Address: ${FACTORY_ADDRESS}`);
      console.log(`   Block: ${receipt.blockNumber}`);
      console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
    } else {
      console.error('❌ Factory deployment failed');
      process.exit(1);
    }
  } catch (error) {
    if (error.message.includes('already known') || error.message.includes('nonce too low')) {
      // Transaction might already be in mempool or deployed
      console.log('⚠️  Transaction already known, checking deployment...');
      const code = await provider.getCode(FACTORY_ADDRESS);
      if (code !== '0x') {
        console.log('✅ Factory is deployed');
      } else {
        console.error('❌ Factory deployment failed:', error.message);
        process.exit(1);
      }
    } else {
      console.error('❌ Error deploying factory:', error.message);
      process.exit(1);
    }
  }

  console.log('');
  return FACTORY_ADDRESS;
}

// Run if called directly
if (require.main === module) {
  deploySingletonFactory()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { deploySingletonFactory };
