#!/usr/bin/env node

/**
 * Deploy an alternative CREATE2 factory for networks where the standard
 * singleton factory address is occupied
 */

const { ethers } = require('ethers');

// Simple CREATE2 factory contract bytecode
// This is a minimal factory that supports CREATE2 deployments
const FACTORY_BYTECODE = '0x604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf3';

async function deployAlternativeFactory() {
  console.log('');
  console.log('============================================================');
  console.log('  Alternative Factory Deployment');
  console.log('============================================================');
  console.log('');

  const rpcUrl = process.env.NODE_URL || process.env.RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;

  if (!rpcUrl || !privateKey) {
    console.error('❌ Error: RPC_URL and PRIVATE_KEY are required');
    process.exit(1);
  }

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log(`📡 Connected to: ${rpcUrl}`);
  console.log(`👤 Deployer: ${wallet.address}`);
  console.log('');

  console.log('📦 Deploying alternative CREATE2 factory...');
  console.log('   Note: This will have a different address than the standard factory');
  console.log('');

  try {
    // Deploy the factory
    const tx = await wallet.sendTransaction({
      data: FACTORY_BYTECODE,
      gasLimit: 100000,
    });

    console.log(`   Transaction hash: ${tx.hash}`);
    console.log('   Waiting for confirmation...');

    const receipt = await tx.wait();

    if (receipt.status === 1) {
      console.log('✅ Alternative factory deployed successfully!');
      console.log(`   Address: ${receipt.contractAddress}`);
      console.log(`   Block: ${receipt.blockNumber}`);
      console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
      console.log('');
      console.log('💡 To use this factory, set:');
      console.log(`   DEPLOYMENT_MODE=custom`);
      console.log(`   FACTORY_ADDRESS=${receipt.contractAddress}`);
      console.log('');

      // Save to a file that can be read by other scripts
      const fs = require('fs');
      fs.writeFileSync('/tmp/alternative-factory-address.txt', receipt.contractAddress);

      return receipt.contractAddress;
    } else {
      console.error('❌ Factory deployment failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error deploying factory:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  deployAlternativeFactory()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { deployAlternativeFactory };
