#!/usr/bin/env node

/**
 * Diagnostic script to check why singleton factory deployments are failing
 */

const { ethers } = require('ethers');

const FACTORY_ADDRESS = '0xce0042B868300000d44A59004Da54A005ffdcf9f';

async function diagnose() {
  console.log('🔍 Diagnosing Singleton Factory Issues...\n');

  const rpcUrl = process.env.NODE_URL || process.env.RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;

  if (!rpcUrl || !privateKey) {
    console.error('❌ Missing RPC_URL or PRIVATE_KEY');
    process.exit(1);
  }

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log(`📡 Network: ${rpcUrl}`);
  console.log(`👤 Deployer: ${wallet.address}\n`);

  // Check factory exists
  const factoryCode = await provider.getCode(FACTORY_ADDRESS);
  console.log(`Factory at ${FACTORY_ADDRESS}:`);
  console.log(`   Code length: ${factoryCode.length}`);
  console.log(`   Deployed: ${factoryCode !== '0x' ? 'YES ✅' : 'NO ❌'}\n`);

  if (factoryCode === '0x') {
    console.log('❌ Factory not deployed!');
    return;
  }

  // Try to compute a CREATE2 address and check if something is there
  // This is a simple test contract bytecode (just returns)
  const testBytecode = '0x6000';
  const salt = '0x' + '0'.repeat(64);

  // CREATE2 address = keccak256(0xff ++ factory ++ salt ++ keccak256(bytecode))
  const bytecodeHash = ethers.utils.keccak256(testBytecode);
  const create2Input = ethers.utils.solidityPack(
    ['bytes1', 'address', 'bytes32', 'bytes32'],
    ['0xff', FACTORY_ADDRESS, salt, bytecodeHash]
  );
  const create2Address = '0x' + ethers.utils.keccak256(create2Input).slice(-40);

  console.log(`Test CREATE2 calculation:`);
  console.log(`   Salt: ${salt}`);
  console.log(`   Bytecode hash: ${bytecodeHash}`);
  console.log(`   Would deploy to: ${create2Address}`);

  const codeAtCreate2 = await provider.getCode(create2Address);
  console.log(`   Already deployed there: ${codeAtCreate2 !== '0x' ? 'YES' : 'NO'}\n`);

  // Try to estimate gas for a simple CREATE2 call
  console.log(`Testing factory call with simple bytecode...`);
  try {
    // The factory's function signature is just sending the bytecode as calldata
    // Format: 32 bytes salt + bytecode
    const calldata = salt + testBytecode.slice(2);

    const gasEstimate = await provider.estimateGas({
      from: wallet.address,
      to: FACTORY_ADDRESS,
      data: calldata,
    });

    console.log(`   ✅ Gas estimate succeeded: ${gasEstimate.toString()}`);
  } catch (error) {
    console.log(`   ❌ Gas estimate failed: ${error.reason || error.message}`);
    console.log(`   Error data: ${error.error?.data || 'none'}`);

    // Try calling it anyway to see what happens
    console.log(`\n   Attempting actual call to see revert reason...`);
    try {
      await provider.call({
        from: wallet.address,
        to: FACTORY_ADDRESS,
        data: salt + testBytecode.slice(2),
      });
    } catch (callError) {
      console.log(`   Revert reason: ${callError.reason || callError.message}`);
      if (callError.error?.data) {
        console.log(`   Revert data: ${callError.error.data}`);
      }
    }
  }

  console.log('\n💡 Checking network chain ID handling...');
  const network = await provider.getNetwork();
  console.log(`   Chain ID from provider: ${network.chainId}`);
  console.log(`   Chain ID from env: ${process.env.CHAIN_ID}`);

  if (network.chainId.toString() !== process.env.CHAIN_ID) {
    console.log(`   ⚠️  Chain ID mismatch!`);
  } else {
    console.log(`   ✅ Chain ID matches`);
  }
}

diagnose().catch(console.error);
