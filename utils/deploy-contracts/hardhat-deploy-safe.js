/**
 * Standalone Hardhat Deployment Script for Safe 1.4.1
 *
 * This script can be used independently without cloning the safe-smart-account repo.
 * It uses the @safe-global/safe-contracts npm package.
 *
 * Setup:
 * 1. npm install --save-dev hardhat @nomiclabs/hardhat-ethers ethers
 * 2. npm install @safe-global/safe-contracts@1.4.1
 * 3. Create hardhat.config.js (see example below)
 * 4. Run: npx hardhat run scripts/hardhat-deploy-safe.js --network <network>
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// Contract names and their import paths
const CONTRACTS = {
  CompatibilityFallbackHandler: {
    path: "@safe-global/safe-contracts/contracts/handler/CompatibilityFallbackHandler.sol:CompatibilityFallbackHandler",
    name: "compatibilityFallbackHandler"
  },
  CreateCall: {
    path: "@safe-global/safe-contracts/contracts/libraries/CreateCall.sol:CreateCall",
    name: "createCall"
  },
  MultiSend: {
    path: "@safe-global/safe-contracts/contracts/libraries/MultiSend.sol:MultiSend",
    name: "multiSend"
  },
  MultiSendCallOnly: {
    path: "@safe-global/safe-contracts/contracts/libraries/MultiSendCallOnly.sol:MultiSendCallOnly",
    name: "multiSendCallOnly"
  },
  SignMessageLib: {
    path: "@safe-global/safe-contracts/contracts/libraries/SignMessageLib.sol:SignMessageLib",
    name: "signMessageLib"
  },
  SimulateTxAccessor: {
    path: "@safe-global/safe-contracts/contracts/accessors/SimulateTxAccessor.sol:SimulateTxAccessor",
    name: "simulateTxAccessor"
  },
  Safe: {
    path: "@safe-global/safe-contracts/contracts/Safe.sol:Safe",
    name: "safe"
  },
  SafeL2: {
    path: "@safe-global/safe-contracts/contracts/SafeL2.sol:SafeL2",
    name: "safeL2"
  },
  SafeProxyFactory: {
    path: "@safe-global/safe-contracts/contracts/proxies/SafeProxyFactory.sol:SafeProxyFactory",
    name: "safeProxyFactory"
  }
};

async function deployContract(contractKey) {
  const contractInfo = CONTRACTS[contractKey];
  console.log(`\nDeploying ${contractKey}...`);

  try {
    const Factory = await hre.ethers.getContractFactory(contractInfo.path);
    const contract = await Factory.deploy();
    await contract.deployed();

    console.log(`✓ ${contractKey} deployed at: ${contract.address}`);

    return {
      name: contractInfo.name,
      address: contract.address,
      txHash: contract.deployTransaction.hash
    };
  } catch (error) {
    console.error(`✗ Failed to deploy ${contractKey}:`, error.message);
    throw error;
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("  Safe 1.4.1 Contract Deployment");
  console.log("=".repeat(60));

  const network = await hre.ethers.provider.getNetwork();
  console.log(`\nNetwork: ${network.name} (Chain ID: ${network.chainId})`);

  const [deployer] = await hre.ethers.getSigners();
  const balance = await deployer.getBalance();

  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${hre.ethers.utils.formatEther(balance)} ETH`);

  // Confirm before deploying
  console.log(`\n⚠️  This will deploy 9 contracts. Estimated gas cost: ~0.05-0.1 ETH`);
  console.log(`⚠️  Press Ctrl+C to cancel, or wait 5 seconds to continue...\n`);

  await new Promise(resolve => setTimeout(resolve, 5000));

  const deployedContracts = {};
  const deploymentInfo = [];

  // Deploy all contracts
  for (const contractKey of Object.keys(CONTRACTS)) {
    try {
      const result = await deployContract(contractKey);
      deployedContracts[result.name] = result.address;
      deploymentInfo.push(result);

      // Wait a bit between deployments to avoid nonce issues
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`\n✗ Deployment failed at ${contractKey}`);
      console.error(error);
      process.exit(1);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("  Deployment Summary");
  console.log("=".repeat(60) + "\n");

  deploymentInfo.forEach(contract => {
    console.log(`${contract.name}:`);
    console.log(`  Address: ${contract.address}`);
    console.log(`  TX Hash: ${contract.txHash}\n`);
  });

  // Generate config JSON
  const config = {
    chainId: network.chainId.toString(),
    name: `Chain ${network.chainId}`,
    contracts: {
      "1.4.1": {}
    }
  };

  Object.keys(deployedContracts).forEach(name => {
    config.contracts["1.4.1"][name] = {
      address: deployedContracts[name]
    };
  });

  console.log("=".repeat(60));
  console.log("  Configuration for custom-chains.json");
  console.log("=".repeat(60) + "\n");

  const configOutput = JSON.stringify(config, null, 2);
  console.log(configOutput);

  // Save to file
  const outputPath = path.join(__dirname, `safe-deployment-${network.chainId}.json`);
  fs.writeFileSync(outputPath, configOutput);
  console.log(`\n✓ Configuration saved to: ${outputPath}`);

  console.log("\n" + "=".repeat(60));
  console.log("  Next Steps");
  console.log("=".repeat(60) + "\n");

  console.log("1. Add the configuration to config/chains/custom-chains.json");
  console.log("2. Verify contracts on block explorer (if supported)");
  console.log("3. Test Safe creation on your chain");
  console.log(`\nDeployment completed successfully! 🎉\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

/*
 * Example hardhat.config.js:
 *
 * require("@nomiclabs/hardhat-ethers");
 * require('dotenv').config();
 *
 * module.exports = {
 *   solidity: {
 *     version: "0.7.6",
 *     settings: {
 *       optimizer: {
 *         enabled: true,
 *         runs: 200
 *       }
 *     }
 *   },
 *   networks: {
 *     custom: {
 *       url: process.env.RPC_URL || "",
 *       chainId: 957,
 *       accounts: [process.env.PRIVATE_KEY]
 *     }
 *   }
 * };
 */
