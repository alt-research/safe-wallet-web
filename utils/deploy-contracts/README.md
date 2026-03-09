# Safe 1.4.1 Contract Deployment Tool

Docker-based tool for deploying Safe (Gnosis Safe) 1.4.1 smart contracts to custom EVM-compatible networks.

## Overview

There are 3 `DEPLOYMENT_MODE` options:

### 1. Standard Mode (Default)

**Characteristics:**
- ✅ No prerequisites
- ✅ Fastest deployment
- ✅ Will reuse existing contracts if already deployed
- ❌ Different addresses on each network
- ❌ Cannot predict addresses before deployment
- ⚠️ Addresses depend on deployer account and nonce state

**Notes:**
1. If you see "reusing" messages during deployment, it means the contracts are already deployed on-chain at those addresses. This is normal and prevents duplicate deployments

### 2. Singleton Factory Mode

**Characteristics:**
- ✅ Deterministic addresses (same across networks using the same factory)
- ✅ Addresses can be predicted before deployment
- ⚠️ Requires ~0.01 ETH for factory deployment (one-time cost)
- ⚠️ Two-step process (factory deployment + Safe contracts)
- ⚠️ **May not work on all networks** - some custom chains have EVM modifications that are incompatible with the singleton factory
- ⚠️ **Addresses differ from official Safe canonical addresses** - due to using different factory addresses (networks may have ERC-2470 factory instead of Safe's Singleton Factory)

**Notes**:
1. How it works: Deploys (if not present) then uses the [Deterministic Deployment Proxy](https://github.com/Arachnid/deterministic-deployment-proxy) (singleton factory) at `0xce0042B868300000d44A59004Da54A005ffdcf9f`
1. For Arbitrum Orbit, the singleton factory uses a different interface than the standard Arachnid factory. It has a `deploy(bytes _initCode, bytes32 _salt)` function instead of just accepting raw calldata. See https://github.com/OffchainLabs/ERCs/blob/892a55cb81f43afeafcfe4e887bf48d400558630/ERCS/erc-2470.md
1. Official Safe deployments use the Safe Singleton Factory at `0x914d7Fec6aaC8cd542e72Bca78B30650d45643d7`, which produces different addresses than the ERC-2470 factory. If customer wants to have same Safe canonical addresses, the chain must be on chainlist.org and we need to contact Safe team to help sign the Safe Singleton Factory deployment transaction
1. If singleton mode fails with "execution reverted" or gas estimation errors, your network may not support the deterministic deployment proxy. Use standard mode instead
 
### 3. Custom Factory Mode

**Characteristics:**
- ✅ Uses existing factory (no deployment cost)
- ✅ Deterministic addresses
- ✅ Flexible - can use any compatible factory
- ⚠️ Requires factory to be already deployed
- ⚠️ Must know the factory address

## Build Steps

```bash
docker build -t safe-deployer . -f Dockerfile --platform=linux/amd64
```

## Usage

1. Standard Mode
   ```bash
   docker run --rm \
      -e PRIVATE_KEY="0x..." \
      -e RPC_URL="https://orbit-demo.alt.technology" \
      -e CHAIN_ID="20240328" \
      -e NETWORK_NAME="orbit-demo-testnet" \
      -e DEPLOYMENT_MODE="standard" \
      safe-deployer
   ```
1. Singleton Factory Mode
   ```bash
   docker run --rm \
      -e PRIVATE_KEY="0x..." \
      -e RPC_URL="https://orbit-demo.alt.technology" \
      -e CHAIN_ID="20240328" \
      -e NETWORK_NAME="orbit-demo-testnet" \
      -e DEPLOYMENT_MODE="singleton" \
      safe-deployer
   ```
1. Custom Factory Mode
   ```bash
   docker run --rm \
      -e PRIVATE_KEY="0x..." \
      -e RPC_URL="https://orbit-demo.alt.technology" \
      -e CHAIN_ID="20240328" \
      -e NETWORK_NAME="orbit-demo-testnet" \
      -e DEPLOYMENT_MODE="custom" \
      -e FACTORY_ADDRESS="0xce0042B868300000d44A59004Da54A005ffdcf9f" \
      safe-deployer
   ```

## Sample Results

### Standard Mode

```bash
============================================================
  Safe 1.4.1 Contract Deployment
============================================================

ℹ️  Configuration:
  Network: orbit-demo-testnet
  Chain ID: 20240328
  RPC URL: https://orbit-demo.alt.technology
  Deployment Mode: standard

📝 Adding network 'orbit-demo-testnet' to hardhat.config.ts...
✅ Network configuration added successfully
🔧 Patching hardhat.config.ts for custom network support...
📦 Deployment mode: standard
✅ Hardhat config patched successfully
🔧 Patching deploy_contracts task to skip Etherscan verification...
✅ Deploy task patched successfully

============================================================
  Starting Deployment
============================================================

ℹ️  Deployer Address: 0xa4a4adc9B25b0Dbe61CBF0Af667BD723f4D7CbeC

💡 Note: Standard mode will reuse existing contracts if found on-chain.
   If you see 'reusing' messages, contracts are already deployed.

yarn run v1.22.22
$ hardhat deploy-contracts --network orbit-demo-testnet
Nothing to compile
⚠️  Safe singleton factory not found for network 20240328
ℹ️  Using non-deterministic deployment (addresses will vary by network)
reusing "SimulateTxAccessor" at 0xB59bD9861a97F9c309B7b73338503507580625D2
⚠️  Safe singleton factory not found for network 20240328
ℹ️  Using non-deterministic deployment (addresses will vary by network)
reusing "SafeProxyFactory" at 0xd9d2Ba03a7754250FDD71333F444636471CACBC4
⚠️  Safe singleton factory not found for network 20240328
ℹ️  Using non-deterministic deployment (addresses will vary by network)
reusing "TokenCallbackHandler" at 0x63117fd9761850f4aC685457E484A01D752D5cC4
⚠️  Safe singleton factory not found for network 20240328
ℹ️  Using non-deterministic deployment (addresses will vary by network)
reusing "CompatibilityFallbackHandler" at 0xcB4a8d3609A7CCa2D9c063a742f75c899BF2f7b5
⚠️  Safe singleton factory not found for network 20240328
ℹ️  Using non-deterministic deployment (addresses will vary by network)
reusing "CreateCall" at 0x8BbCaE989A0Bdf15c8E783357a0E5848e36233d0
⚠️  Safe singleton factory not found for network 20240328
ℹ️  Using non-deterministic deployment (addresses will vary by network)
reusing "MultiSend" at 0x7B21BBDBdE8D01Df591fdc2dc0bE9956Dde1e16C
⚠️  Safe singleton factory not found for network 20240328
ℹ️  Using non-deterministic deployment (addresses will vary by network)
reusing "MultiSendCallOnly" at 0x32228dDEA8b9A2bd7f2d71A958fF241D79ca5eEC
⚠️  Safe singleton factory not found for network 20240328
ℹ️  Using non-deterministic deployment (addresses will vary by network)
reusing "SignMessageLib" at 0x309C7b0A0D2f250Be322739753386911E1187C4E
⚠️  Safe singleton factory not found for network 20240328
ℹ️  Using non-deterministic deployment (addresses will vary by network)
reusing "SafeL2" at 0x76667330c237Fb40f28d74563cdAAae4b06C23Ec
⚠️  Safe singleton factory not found for network 20240328
ℹ️  Using non-deterministic deployment (addresses will vary by network)
reusing "Safe" at 0x639245e8476E03e789a244f279b5843b9633b2E7
Verification status for SimulateTxAccessor: FAILURE
Verification status for SafeProxyFactory: SUCCESS
Verification status for TokenCallbackHandler: SUCCESS
Verification status for CompatibilityFallbackHandler: SUCCESS
Verification status for CreateCall: SUCCESS
Verification status for MultiSend: FAILURE
Verification status for MultiSendCallOnly: SUCCESS
Verification status for SignMessageLib: SUCCESS
Verification status for SafeL2: SUCCESS
Verification status for Safe: SUCCESS
{"error":"Invalid chainIds: 20240328","message":"Invalid chainIds: 20240328"}
verifying SimulateTxAccessor (0xB59bD9861a97F9c309B7b73338503507580625D2 on chain 20240328) ...
{"error":"Chain 20240328 not supported for verification!","message":"Chain 20240328 not supported for verification!"}
{"error":"Invalid chainIds: 20240328","message":"Invalid chainIds: 20240328"}
verifying SafeProxyFactory (0xd9d2Ba03a7754250FDD71333F444636471CACBC4 on chain 20240328) ...
{"error":"Chain 20240328 not supported for verification!","message":"Chain 20240328 not supported for verification!"}
{"error":"Invalid chainIds: 20240328","message":"Invalid chainIds: 20240328"}
verifying TokenCallbackHandler (0x63117fd9761850f4aC685457E484A01D752D5cC4 on chain 20240328) ...
{"error":"Chain 20240328 not supported for verification!","message":"Chain 20240328 not supported for verification!"}
{"error":"Invalid chainIds: 20240328","message":"Invalid chainIds: 20240328"}
verifying CompatibilityFallbackHandler (0xcB4a8d3609A7CCa2D9c063a742f75c899BF2f7b5 on chain 20240328) ...
{"error":"Chain 20240328 not supported for verification!","message":"Chain 20240328 not supported for verification!"}
{"error":"Invalid chainIds: 20240328","message":"Invalid chainIds: 20240328"}
verifying CreateCall (0x8BbCaE989A0Bdf15c8E783357a0E5848e36233d0 on chain 20240328) ...
{"error":"Chain 20240328 not supported for verification!","message":"Chain 20240328 not supported for verification!"}
{"error":"Invalid chainIds: 20240328","message":"Invalid chainIds: 20240328"}
verifying MultiSend (0x7B21BBDBdE8D01Df591fdc2dc0bE9956Dde1e16C on chain 20240328) ...
{"error":"Chain 20240328 not supported for verification!","message":"Chain 20240328 not supported for verification!"}
{"error":"Invalid chainIds: 20240328","message":"Invalid chainIds: 20240328"}
verifying MultiSendCallOnly (0x32228dDEA8b9A2bd7f2d71A958fF241D79ca5eEC on chain 20240328) ...
{"error":"Chain 20240328 not supported for verification!","message":"Chain 20240328 not supported for verification!"}
{"error":"Invalid chainIds: 20240328","message":"Invalid chainIds: 20240328"}
verifying SignMessageLib (0x309C7b0A0D2f250Be322739753386911E1187C4E on chain 20240328) ...
{"error":"Chain 20240328 not supported for verification!","message":"Chain 20240328 not supported for verification!"}
{"error":"Invalid chainIds: 20240328","message":"Invalid chainIds: 20240328"}
verifying SafeL2 (0x76667330c237Fb40f28d74563cdAAae4b06C23Ec on chain 20240328) ...
{"error":"Chain 20240328 not supported for verification!","message":"Chain 20240328 not supported for verification!"}
{"error":"Invalid chainIds: 20240328","message":"Invalid chainIds: 20240328"}
verifying Safe (0x639245e8476E03e789a244f279b5843b9633b2E7 on chain 20240328) ...
{"error":"Chain 20240328 not supported for verification!","message":"Chain 20240328 not supported for verification!"}
⚠️  Skipping Etherscan verification (no ETHERSCAN_API_KEY provided)
Done in 56.97s.

============================================================
  ✅ Deployment Successful
============================================================

📋 Deployed Contract Addresses:

   SimulateTxAccessor:              0xB59bD9861a97F9c309B7b73338503507580625D2
   SafeProxyFactory:                0xd9d2Ba03a7754250FDD71333F444636471CACBC4
   TokenCallbackHandler:            0x63117fd9761850f4aC685457E484A01D752D5cC4
   CompatibilityFallbackHandler:    0xcB4a8d3609A7CCa2D9c063a742f75c899BF2f7b5
   CreateCall:                      0x8BbCaE989A0Bdf15c8E783357a0E5848e36233d0
   MultiSend:                       0x7B21BBDBdE8D01Df591fdc2dc0bE9956Dde1e16C
   MultiSendCallOnly:               0x32228dDEA8b9A2bd7f2d71A958fF241D79ca5eEC
   SignMessageLib:                  0x309C7b0A0D2f250Be322739753386911E1187C4E
   SafeL2:                          0x76667330c237Fb40f28d74563cdAAae4b06C23Ec
   Safe:                            0x639245e8476E03e789a244f279b5843b9633b2E7

📋 Next steps:
  1. Copy the contract addresses above
  2. Add them to your Safe Wallet Web config
  3. Update config/chains/custom-chains.json

💡 Deployment mode used: standard
   Note: Addresses are non-deterministic (unique to this network)
```

### Singleton Factory Mode

```bash
============================================================
  Safe 1.4.1 Contract Deployment
============================================================

ℹ️  Configuration:
  Network: orbit-demo-testnet
  Chain ID: 20240328
  RPC URL: https://orbit-demo.alt.technology
  Deployment Mode: singleton

📝 Adding network 'orbit-demo-testnet' to hardhat.config.ts...
✅ Network configuration added successfully

============================================================
  Singleton Factory Deployment
============================================================

📡 Connected to: https://orbit-demo.alt.technology
👤 Deployer: 0xa4a4adc9B25b0Dbe61CBF0Af667BD723f4D7CbeC

✅ ERC-2470 factory detected at: 0xce0042B868300000d44A59004Da54A005ffdcf9f
   This is the Arbitrum/ERC-2470 variant with deploy(bytes,bytes32) interface
   Will use custom ERC-2470 deployment method


🔍 Running factory diagnostics...
🔍 Diagnosing Singleton Factory Issues...

📡 Network: https://orbit-demo.alt.technology
👤 Deployer: 0xa4a4adc9B25b0Dbe61CBF0Af667BD723f4D7CbeC

Factory at 0xce0042B868300000d44A59004Da54A005ffdcf9f:
   Code length: 618
   Deployed: YES ✅

Test CREATE2 calculation:
   Salt: 0x0000000000000000000000000000000000000000000000000000000000000000
   Bytecode hash: 0x07ad118d6cc8642c86c03827f276d8b791a65e5c99a3845faf186be720a1455d
   Would deploy to: 0xc0b2033aafc6689e2d9a73fbb96acd266935084d
   Already deployed there: NO

Testing factory call with simple bytecode...
   ❌ Gas estimate failed: cannot estimate gas; transaction may fail or may require manual gas limit
   Error data: none

   Attempting actual call to see revert reason...

💡 Checking network chain ID handling...
   Chain ID from provider: 20240328
   Chain ID from env: 20240328
   ✅ Chain ID matches

🔧 Patching hardhat.config.ts for custom network support...
📦 Deployment mode: singleton
✅ Hardhat config patched successfully
🔧 Patching deploy_contracts task to skip Etherscan verification...
✅ Deploy task patched successfully

============================================================
  Starting Deployment
============================================================

ℹ️  Deployer Address: 0xa4a4adc9B25b0Dbe61CBF0Af667BD723f4D7CbeC

ℹ️  Using ERC-2470 factory deployment method for Arbitrum Orbit

📦 Compiling contracts...
Nothing to compile

🚀 Deploying Safe contracts with ERC-2470 factory...

📡 Network: https://orbit-demo.alt.technology
👤 Deployer: 0xa4a4adc9B25b0Dbe61CBF0Af667BD723f4D7CbeC
🏭 Factory: 0xce0042B868300000d44A59004Da54A005ffdcf9f


📦 Deploying SimulateTxAccessor...
   Expected address: 0xeDd0ca2DD8E29885D27bdf80312730654B5E9C50
   ✅ Already deployed, reusing

📦 Deploying SafeProxyFactory...
   Expected address: 0x523A58387ddbd3e735B63bE639057Cc5969Ad7c4
   ✅ Already deployed, reusing

📦 Deploying TokenCallbackHandler...
   Expected address: 0x757807d10fac3ed93Dd9894da13fE9B5B6a7F13E
   ✅ Already deployed, reusing

📦 Deploying CompatibilityFallbackHandler...
   Expected address: 0xEd91C9234AD8D8d9B15ef121B3F8047A8e08C39A
   ✅ Already deployed, reusing

📦 Deploying CreateCall...
   Expected address: 0xef76497d5826f1A5b0d5B4180A55Eb63E8360dd8
   ✅ Already deployed, reusing

📦 Deploying MultiSend...
   Expected address: 0x0beDfC60AA633c51F0eE17C2524B4c2261d13F58
   ✅ Already deployed, reusing

📦 Deploying MultiSendCallOnly...
   Expected address: 0x7FEc2f134AcdBB8E5463375fD3C7232801643a74
   ✅ Already deployed, reusing

📦 Deploying SignMessageLib...
   Expected address: 0x9A5578B307ab490C7c45f7330F416E73C607bE94
   ✅ Already deployed, reusing

📦 Deploying SafeL2...
   Expected address: 0xef911c6af5e7FA6CDc1392e4B9fb783328929967
   Deploying...
   Bytecode size: 24462 bytes
   Gas limit: 35000000
   TX: 0xf558b2e16ec8d5222babc8fb6ace1172c9053dc39ea7c5c7658c07683265efd7
   Gas used: 9526755
   ✅ Deployed at: 0xef911c6af5e7FA6CDc1392e4B9fb783328929967
   Deployed code size: 24421 bytes

📦 Deploying Safe...
   Expected address: 0x6001A5A6a18E5D0d3BEdae2349cf0c6fB99856F6
   Deploying...
   Bytecode size: 23620 bytes
   Gas limit: 35000000
   TX: 0x8a61ca85679b63de7b855e59df70f8b2618809dc0f96bb13f54c267bde64653c
   Gas used: 9178509
   ✅ Deployed at: 0x6001A5A6a18E5D0d3BEdae2349cf0c6fB99856F6
   Deployed code size: 23579 bytes


============================================================
  ✅ Deployment Complete
============================================================

📋 Deployed Contracts:

   SimulateTxAccessor                  0xeDd0ca2DD8E29885D27bdf80312730654B5E9C50
   SafeProxyFactory                    0x523A58387ddbd3e735B63bE639057Cc5969Ad7c4
   TokenCallbackHandler                0x757807d10fac3ed93Dd9894da13fE9B5B6a7F13E
   CompatibilityFallbackHandler        0xEd91C9234AD8D8d9B15ef121B3F8047A8e08C39A
   CreateCall                          0xef76497d5826f1A5b0d5B4180A55Eb63E8360dd8
   MultiSend                           0x0beDfC60AA633c51F0eE17C2524B4c2261d13F58
   MultiSendCallOnly                   0x7FEc2f134AcdBB8E5463375fD3C7232801643a74
   SignMessageLib                      0x9A5578B307ab490C7c45f7330F416E73C607bE94
   SafeL2                              0xef911c6af5e7FA6CDc1392e4B9fb783328929967
   Safe                                0x6001A5A6a18E5D0d3BEdae2349cf0c6fB99856F6


============================================================
  ✅ Deployment Successful
============================================================

📋 Deployed Contract Addresses:


📋 Next steps:
  1. Copy the contract addresses above
  2. Add them to your Safe Wallet Web config
  3. Update config/chains/custom-chains.json

💡 Deployment mode used: singleton
   Note: Addresses are deterministic (same across networks)
```

### Custom Factory Mode
```bash
============================================================
  Safe 1.4.1 Contract Deployment
============================================================

ℹ️  Configuration:
  Network: orbit-demo-testnet
  Chain ID: 20240328
  RPC URL: https://orbit-demo.alt.technology
  Deployment Mode: custom
  Factory Address: 0xce0042B868300000d44A59004Da54A005ffdcf9f

📝 Adding network 'orbit-demo-testnet' to hardhat.config.ts...
✅ Network configuration added successfully
🔧 Patching hardhat.config.ts for custom network support...
📦 Deployment mode: custom
✅ Hardhat config patched successfully
🔧 Patching deploy_contracts task to skip Etherscan verification...
✅ Deploy task patched successfully

============================================================
  Starting Deployment
============================================================

ℹ️  Deployer Address: 0xa4a4adc9B25b0Dbe61CBF0Af667BD723f4D7CbeC

ℹ️  Using ERC-2470 factory deployment method for Arbitrum Orbit

📦 Compiling contracts...
Nothing to compile

🚀 Deploying Safe contracts with ERC-2470 factory...

📡 Network: https://orbit-demo.alt.technology
👤 Deployer: 0xa4a4adc9B25b0Dbe61CBF0Af667BD723f4D7CbeC
🏭 Factory: 0xce0042B868300000d44A59004Da54A005ffdcf9f


📦 Deploying SimulateTxAccessor...
   Expected address: 0xeDd0ca2DD8E29885D27bdf80312730654B5E9C50
   ✅ Already deployed, reusing

📦 Deploying SafeProxyFactory...
   Expected address: 0x523A58387ddbd3e735B63bE639057Cc5969Ad7c4
   ✅ Already deployed, reusing

📦 Deploying TokenCallbackHandler...
   Expected address: 0x757807d10fac3ed93Dd9894da13fE9B5B6a7F13E
   ✅ Already deployed, reusing

📦 Deploying CompatibilityFallbackHandler...
   Expected address: 0xEd91C9234AD8D8d9B15ef121B3F8047A8e08C39A
   ✅ Already deployed, reusing

📦 Deploying CreateCall...
   Expected address: 0xef76497d5826f1A5b0d5B4180A55Eb63E8360dd8
   ✅ Already deployed, reusing

📦 Deploying MultiSend...
   Expected address: 0x0beDfC60AA633c51F0eE17C2524B4c2261d13F58
   ✅ Already deployed, reusing

📦 Deploying MultiSendCallOnly...
   Expected address: 0x7FEc2f134AcdBB8E5463375fD3C7232801643a74
   ✅ Already deployed, reusing

📦 Deploying SignMessageLib...
   Expected address: 0x9A5578B307ab490C7c45f7330F416E73C607bE94
   ✅ Already deployed, reusing

📦 Deploying SafeL2...
   Expected address: 0xef911c6af5e7FA6CDc1392e4B9fb783328929967
   Deploying...
   TX: 0xc26dd18b1e42a36e94530bdc4af41d1542006dd624f712270a17a7a80fc99563
   ✅ Deployed at: 0xef911c6af5e7FA6CDc1392e4B9fb783328929967
   Gas used: 4998124

📦 Deploying Safe...
   Expected address: 0x6001A5A6a18E5D0d3BEdae2349cf0c6fB99856F6
   Deploying...
   TX: 0x41de1f41ebaf73c5fe80cc6b896795769b8471b16d82a6e695bd0b356cfca722
   ✅ Deployed at: 0x6001A5A6a18E5D0d3BEdae2349cf0c6fB99856F6
   Gas used: 4995168


============================================================
  ✅ Deployment Complete
============================================================

📋 Deployed Contracts:

   SimulateTxAccessor                  0xeDd0ca2DD8E29885D27bdf80312730654B5E9C50
   SafeProxyFactory                    0x523A58387ddbd3e735B63bE639057Cc5969Ad7c4
   TokenCallbackHandler                0x757807d10fac3ed93Dd9894da13fE9B5B6a7F13E
   CompatibilityFallbackHandler        0xEd91C9234AD8D8d9B15ef121B3F8047A8e08C39A
   CreateCall                          0xef76497d5826f1A5b0d5B4180A55Eb63E8360dd8
   MultiSend                           0x0beDfC60AA633c51F0eE17C2524B4c2261d13F58
   MultiSendCallOnly                   0x7FEc2f134AcdBB8E5463375fD3C7232801643a74
   SignMessageLib                      0x9A5578B307ab490C7c45f7330F416E73C607bE94
   SafeL2                              0xef911c6af5e7FA6CDc1392e4B9fb783328929967
   Safe                                0x6001A5A6a18E5D0d3BEdae2349cf0c6fB99856F6


============================================================
  ✅ Deployment Successful
============================================================

📋 Deployed Contract Addresses:


📋 Next steps:
  1. Copy the contract addresses above
  2. Add them to your Safe Wallet Web config
  3. Update config/chains/custom-chains.json

💡 Deployment mode used: custom
   Note: Addresses are deterministic (same across networks)
```

## Resources

- [Safe Contracts Repository](https://github.com/safe-global/safe-smart-account)
- [Safe Singleton Factory](https://github.com/safe-global/safe-singleton-factory)
- [Deterministic Deployment Proxy](https://github.com/Arachnid/deterministic-deployment-proxy)
- [Safe Documentation](https://docs.safe.global/)
