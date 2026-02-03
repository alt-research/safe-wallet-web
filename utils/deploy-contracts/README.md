# Safe 1.4.1 Contract Deployment Guide

Complete guide for deploying Safe 1.4.1 smart contracts to custom chains.

## Table of Contents
- [Quick Start](#quick-start)
- [Deployment Methods](#deployment-methods)
- [Detailed Instructions](#detailed-instructions)
- [Post-Deployment](#post-deployment)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

Choose the deployment method that best fits your needs:

### 🚀 Method 1: Official Safe Repo (Recommended)

**Best for:** Production deployments, deterministic addresses

```bash
# Clone and setup
git clone https://github.com/safe-global/safe-smart-account.git
cd safe-smart-account
git checkout v1.4.1
yarn install

# Configure .env
cat > .env << EOF
MNEMONIC="your twelve word mnemonic here"
NODE_URL="https://your-rpc-endpoint.com"
EOF

# Add network to hardhat.config.ts (see detailed instructions)

# Deploy
yarn deploy-all custom
```

**Pros:** ✅ Official ✅ Well-tested ✅ Deterministic
**Cons:** ❌ Requires cloning repo

---

### ⚡ Method 2: Standalone Hardhat Script

**Best for:** Quick deployments, custom networks

```bash
# Create project
mkdir safe-deployment && cd safe-deployment
npm init -y

# Install dependencies
npm install --save-dev hardhat @nomiclabs/hardhat-ethers ethers
npm install @safe-global/safe-contracts@1.4.1

# Copy deployment script
cp /path/to/safe-wallet-web/utils/deploy-contracts/hardhat-deploy-safe.js ./

# Create hardhat.config.js (see template below)

# Deploy
npx hardhat run hardhat-deploy-safe.js --network custom
```

**Pros:** ✅ Fast setup ✅ Auto-generates config
**Cons:** ❌ Non-deterministic addresses

---

### 🛠️ Method 3: CreateX (Advanced)

**Best for:** Cross-chain deterministic deployments

**Pros:** ✅ Same addresses across chains ✅ Permissioned
**Cons:** ❌ Complex ❌ Advanced users only

See [CreateX Deployment](#method-3-createx-advanced) section below.

---

## Deployment Methods

## Method 1: Official Safe Repository (Recommended)

### Prerequisites
- Node.js v16+
- Git
- RPC endpoint for your target chain
- Mnemonic with sufficient native tokens for gas (~0.05-0.1 ETH equivalent)

### Step 1: Clone and Setup

```bash
git clone https://github.com/safe-global/safe-smart-account.git
cd safe-smart-account
git checkout v1.4.1
yarn install
```

### Step 2: Configure Environment

Create `.env` file:

```bash
# .env
MNEMONIC="your twelve word mnemonic phrase here"
NODE_URL="https://your-rpc-endpoint.com"

# Optional: If using Infura
INFURA_KEY="your-infura-key"
```

### Step 3: Add Custom Network

Edit `hardhat.config.ts` and add your network:

```typescript
// In the networks section
custom: {
  url: process.env.NODE_URL || "",
  chainId: 957, // Your chain ID
  accounts: {
    mnemonic: process.env.MNEMONIC,
  },
},
```

### Step 4: Deploy

```bash
# Deploy all Safe contracts
yarn deploy-all custom

# The output will show deployed addresses
```

### Step 5: Verify (Optional)

If your chain has an Etherscan-compatible explorer:

```bash
# Add to .env
ETHERSCAN_API_KEY="your-api-key"

# Add to hardhat.config.ts
customExplorers: {
  custom: {
    apiURL: "https://your-explorer.com/api",
    browserURL: "https://your-explorer.com"
  }
}

# Verify
yarn sourcify custom
yarn etherscan-verify custom
```

---

## Method 2: Standalone Hardhat Script

### Setup

```bash
# Create project directory
mkdir safe-deployment && cd safe-deployment
npm init -y

# Install dependencies
npm install --save-dev hardhat @nomiclabs/hardhat-ethers ethers
npm install @safe-global/safe-contracts@1.4.1
npm install dotenv
```

### Create hardhat.config.js

```javascript
require("@nomiclabs/hardhat-ethers");
require('dotenv').config();

module.exports = {
  solidity: {
    version: "0.7.6",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    custom: {
      url: process.env.RPC_URL || "",
      chainId: 957, // Your chain ID
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};
```

### Create .env

```bash
RPC_URL=https://your-rpc-endpoint.com
PRIVATE_KEY=0xyourprivatekeyhere
```

### Copy Deployment Script

```bash
# Copy the hardhat-deploy-safe.js script from this directory
cp /path/to/utils/deploy-contracts/hardhat-deploy-safe.js ./
```

### Deploy

```bash
npx hardhat run hardhat-deploy-safe.js --network custom
```

The script will:
- Deploy all 9 Safe 1.4.1 contracts
- Display deployment progress and gas costs
- Generate a configuration JSON file
- Save deployment info to `safe-deployment-<chainId>.json`

---

## Method 3: CreateX (Advanced)

For users who need deterministic addresses across multiple chains.

### Overview

CreateX allows deploying contracts with the same address on multiple chains using CREATE2. This method requires deep understanding of both Safe and CreateX.

### Key Steps

1. **Configure Setup Function** - Prepare Safe initialization parameters
2. **Encode Setup Call** - Use `cast` to encode the setup function
3. **Generate Salt** - Create permissioned deployment salt
4. **Get Proxy Code** - Query SafeProxyFactory for creation code
5. **Construct InitCode** - Combine proxy code with singleton address
6. **Deploy via CreateX** - Execute deployment through CreateX

### Detailed Guide

See the CreateX deployment gist: https://gist.github.com/pcaversaccio/0411f521eb923dd1159ed483e2d7d564

⚠️ **Warning:** This method is complex and recommended only for advanced users who need cross-chain deterministic addresses.

---

## Post-Deployment

### 1. Verify Deployment

Check that all 9 contracts are deployed:

```bash
# Verify contract has code
cast code <contract-address> --rpc-url <your-rpc>

# Should return bytecode, not 0x
```

**Required contracts:**
- ✅ CompatibilityFallbackHandler
- ✅ CreateCall
- ✅ Safe (L1)
- ✅ SafeL2
- ✅ MultiSend
- ✅ MultiSendCallOnly
- ✅ SafeProxyFactory
- ✅ SignMessageLib
- ✅ SimulateTxAccessor

### 2. Update Configuration

Add deployed addresses to `config/chains/custom-chains.json`:

```json
{
  "chainId": "957",
  "name": "Your Chain",
  "contracts": {
    "1.4.1": {
      "compatibilityFallbackHandler": {
        "address": "0x..."
      },
      "createCall": {
        "address": "0x..."
      },
      "safe": {
        "address": "0x..."
      },
      "safeL2": {
        "address": "0x..."
      },
      "multiSend": {
        "address": "0x..."
      },
      "multiSendCallOnly": {
        "address": "0x..."
      },
      "safeProxyFactory": {
        "address": "0x..."
      },
      "signMessageLib": {
        "address": "0x..."
      },
      "simulateTxAccessor": {
        "address": "0x..."
      }
    }
  }
}
```

### 3. Test Safe Creation

Try creating a Safe using the Safe Wallet Web interface to verify the deployment works correctly.

### 4. Commit Changes

```bash
git add config/chains/custom-chains.json
git commit -m "Add Safe 1.4.1 contracts for chain <chain-id>"
git push
```

### 5. Deploy Application

```bash
# Rebuild Docker
docker build -t safe-wallet-web .

# Or just restart with volume mount (no rebuild)
docker restart safe-wallet-web
```

---

## Helper Scripts

This directory contains helper scripts to assist with deployment:

### `deploy-safe-141.js`
Interactive helper for official repo deployment

```bash
node utils/deploy-contracts/deploy-safe-141.js custom
```

### `hardhat-deploy-safe.js`
Standalone Hardhat deployment script

```bash
npx hardhat run utils/deploy-contracts/hardhat-deploy-safe.js --network custom
```

---

## Troubleshooting

### Compilation Errors

**Problem:** Contracts fail to compile

**Solutions:**
- Ensure Solidity version is exactly 0.7.6
- Enable optimizer with 200 runs
- Verify all dependencies are installed
- Try `yarn install --force` or `npm install --force`

### Deployment Fails

**Problem:** Transaction reverts or fails

**Solutions:**
- Verify RPC endpoint is accessible and responding
- Check deployer account has sufficient funds
- Ensure chain ID matches in config
- Try increasing gas limit/price
- Check if contracts are already deployed

### Gas Estimation Errors

**Problem:** Gas estimation fails

**Solutions:**
- Manually set gas limit: `--gas-limit 3000000`
- Check RPC endpoint supports gas estimation
- Verify account has sufficient balance

### Verification Fails

**Problem:** Block explorer verification fails

**Solutions:**
- Ensure exact source code matches (no comments changed)
- Verify compiler version (0.7.6) and settings
- Check optimizer runs = 200
- Ensure API key is correct
- Try manual verification with flattened source

### Different Addresses Than Expected

**Problem:** Deployed addresses don't match other chains

**Solutions:**
- Use Method 1 (Official Repo) for deterministic deployments
- Ensure deploying from same account with same nonce
- For cross-chain matching, use CreateX method
- Check that contract source code is identical

---

## Important Notes

⚠️ **Gas Costs:** Deploying all Safe contracts costs approximately 0.05-0.1 ETH equivalent in gas

⚠️ **Version Locking:** Do NOT modify contract source files - any change results in different addresses

⚠️ **Testnet First:** Always test on testnet before mainnet deployment

⚠️ **Key Security:** Keep deployment private keys/mnemonics secure and never commit to git

⚠️ **Nonce Management:** If deployment fails partway, some contracts may be deployed - check before retrying

---

## References

- **Safe Contracts Repository:** https://github.com/safe-global/safe-smart-account
- **Safe Deployments:** https://github.com/safe-global/safe-deployments
- **Safe Documentation:** https://docs.safe.global
- **CreateX Documentation:** https://github.com/pcaversaccio/createx
- **Adding Custom Chains:** `../../docs/CUSTOM_CHAINS.md`

---

## Contract Details

### Safe v1.4.1 Contracts

| Contract | Purpose |
|----------|---------|
| **Safe** | Main Safe singleton for L1 chains |
| **SafeL2** | Main Safe singleton optimized for L2 chains |
| **SafeProxyFactory** | Creates Safe proxy instances |
| **CompatibilityFallbackHandler** | Handles fallback function calls |
| **CreateCall** | Allows Safe to deploy contracts |
| **MultiSend** | Batches multiple transactions |
| **MultiSendCallOnly** | Batches multiple calls (no delegatecalls) |
| **SignMessageLib** | EIP-1271 message signing library |
| **SimulateTxAccessor** | Simulates transactions for gas estimation |

### Solidity Version
- **Version:** 0.7.6
- **Optimizer:** Enabled
- **Runs:** 200

---

## Need Help?

1. Check the troubleshooting section above
2. Review Safe documentation: https://docs.safe.global
3. Check existing deployments: https://github.com/safe-global/safe-deployments
4. Review custom chains guide: `../../docs/CUSTOM_CHAINS.md`
