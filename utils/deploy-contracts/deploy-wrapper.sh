#!/bin/sh
set -e

echo "============================================================"
echo "  Safe 1.4.1 Contract Deployment"
echo "============================================================"
echo ""

# Validate required environment variables
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY environment variable is required"
    echo ""
    echo "Usage:"
    echo "  docker run --rm \\"
    echo "    -e PRIVATE_KEY=\"0xyourprivatekeyhere\" \\"
    echo "    -e RPC_URL=\"https://your-rpc-endpoint.com\" \\"
    echo "    -e CHAIN_ID=\"957\" \\"
    echo "    -e NETWORK_NAME=\"custom\" \\"
    echo "    safe-deployer"
    exit 1
fi

if [ -z "$RPC_URL" ]; then
    echo "❌ Error: RPC_URL environment variable is required"
    exit 1
fi

if [ -z "$CHAIN_ID" ]; then
    echo "❌ Error: CHAIN_ID environment variable is required"
    exit 1
fi

# Set default values if not provided
NETWORK_NAME=${NETWORK_NAME:-custom}
DEPLOYMENT_MODE=${DEPLOYMENT_MODE:-standard}

echo "ℹ️  Configuration:"
echo "  Network: $NETWORK_NAME"
echo "  Chain ID: $CHAIN_ID"
echo "  RPC URL: $RPC_URL"
echo "  Deployment Mode: $DEPLOYMENT_MODE"
if [ "$DEPLOYMENT_MODE" = "custom" ]; then
    echo "  Factory Address: ${FACTORY_ADDRESS:-not set}"
fi
echo ""

# Strip '0x' prefix if present
PRIVATE_KEY_CLEAN=$(echo "$PRIVATE_KEY" | sed 's/^0x//')

# Create .env file with NODE_URL for compatibility
cat > /app/.env << EOF
NODE_URL=$RPC_URL
PRIVATE_KEY=$PRIVATE_KEY_CLEAN
EOF

# Validate deployment mode
if [ "$DEPLOYMENT_MODE" = "custom" ] && [ -z "$FACTORY_ADDRESS" ]; then
    echo "❌ Error: FACTORY_ADDRESS is required when DEPLOYMENT_MODE=custom"
    exit 1
fi

# Export environment variables
export NODE_URL=$RPC_URL
export CHAIN_ID=$CHAIN_ID
export NETWORK_NAME=$NETWORK_NAME
export DEPLOYMENT_MODE=$DEPLOYMENT_MODE
export FACTORY_ADDRESS=$FACTORY_ADDRESS

# Add network configuration using Node.js script (more reliable than shell text manipulation)
node /app/add-network.js

# Deploy singleton factory if requested
if [ "$DEPLOYMENT_MODE" = "singleton" ]; then
    node /app/deploy-singleton-factory.js
    if [ $? -ne 0 ]; then
        echo "❌ Failed to deploy singleton factory"
        exit 1
    fi

    # Run diagnostics to understand why factory calls might fail
    echo ""
    echo "🔍 Running factory diagnostics..."
    node /app/diagnose-singleton.js
    echo ""
fi

# Patch hardhat config to support the selected deployment mode
node /app/patch-hardhat-config.js

# Patch deploy task to skip Etherscan verification when no API key
node /app/patch-deploy-task.js

echo ""
echo "============================================================"
echo "  Starting Deployment"
echo "============================================================"
echo ""

# Show deployer info for transparency
DEPLOYER_ADDRESS=$(node -e "const ethers = require('ethers'); const wallet = new ethers.Wallet(process.env.PRIVATE_KEY); console.log(wallet.address);")
echo "ℹ️  Deployer Address: $DEPLOYER_ADDRESS"
echo ""
if [ "$DEPLOYMENT_MODE" = "standard" ]; then
    echo "💡 Note: Standard mode will reuse existing contracts if found on-chain."
    echo "   If you see 'reusing' messages, contracts are already deployed."
    echo ""
fi

# Run the deployment, showing output in real-time and capturing to file
DEPLOY_LOG="/tmp/deploy-output.log"
set +e  # Temporarily disable exit on error to capture exit code

if [ "$DEPLOYMENT_MODE" = "singleton" ] || [ "$DEPLOYMENT_MODE" = "custom" ]; then
    # Check if this is an ERC-2470 factory (Arbitrum Orbit)
    IS_ERC2470="false"
    if [ "$DEPLOYMENT_MODE" = "singleton" ]; then
        IS_ERC2470="true"
    elif [ "$DEPLOYMENT_MODE" = "custom" ] && [ -n "$FACTORY_ADDRESS" ]; then
        # Check if the custom factory is the ERC-2470 factory
        if [ "$FACTORY_ADDRESS" = "0xce0042B868300000d44A59004Da54A005ffdcf9f" ]; then
            IS_ERC2470="true"
        fi
    fi

    if [ "$IS_ERC2470" = "true" ]; then
        echo "ℹ️  Using ERC-2470 factory deployment method for Arbitrum Orbit"
        echo ""
        # Compile contracts first to generate artifacts
        echo "📦 Compiling contracts..."
        yarn hardhat compile 2>&1 | grep -E "(Compiled|Nothing|Error)" || true
        echo ""
        (node /app/deploy-with-erc2470.js 2>&1; echo $? > /tmp/deploy-exit-code.txt) | tee "$DEPLOY_LOG"
    else
        (yarn deploy-all $NETWORK_NAME 2>&1; echo $? > /tmp/deploy-exit-code.txt) | tee "$DEPLOY_LOG"
    fi
else
    (yarn deploy-all $NETWORK_NAME 2>&1; echo $? > /tmp/deploy-exit-code.txt) | tee "$DEPLOY_LOG"
fi

DEPLOY_EXIT_CODE=$(cat /tmp/deploy-exit-code.txt 2>/dev/null || echo "1")
set -e  # Re-enable exit on error

# Read the captured output for parsing
DEPLOY_OUTPUT=$(cat "$DEPLOY_LOG" 2>/dev/null || echo "")

# Check if deployment was successful
if [ $DEPLOY_EXIT_CODE -eq 0 ]; then
    echo ""
    echo "============================================================"
    echo "  ✅ Deployment Successful"
    echo "============================================================"
    echo ""
    echo "📋 Deployed Contract Addresses:"
    echo ""

    # Extract addresses from the deployment output (from "reusing" or "deployed" messages)
    for contract in SimulateTxAccessor SafeProxyFactory TokenCallbackHandler CompatibilityFallbackHandler CreateCall MultiSend MultiSendCallOnly SignMessageLib SafeL2 Safe; do
        ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -i "\"$contract\"" | grep -oE '0x[a-fA-F0-9]{40}' | head -1)
        if [ -z "$ADDRESS" ]; then
            # Try alternate pattern for "reusing" messages
            ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep "reusing \"$contract\"" | grep -oE '0x[a-fA-F0-9]{40}' | head -1)
        fi
        if [ -n "$ADDRESS" ]; then
            printf "   %-32s %s\n" "$contract:" "$ADDRESS"
        fi
    done

    echo ""
    echo "📋 Next steps:"
    echo "  1. Copy the contract addresses above"
    echo "  2. Add them to your Safe Wallet Web config"
    echo "  3. Update config/chains/custom-chains.json"
    echo ""
    echo "💡 Deployment mode used: $DEPLOYMENT_MODE"
    if [ "$DEPLOYMENT_MODE" = "standard" ]; then
        echo "   Note: Addresses are non-deterministic (unique to this network)"
    else
        echo "   Note: Addresses are deterministic (same across networks)"
    fi
    echo ""
else
    echo ""
    echo "============================================================"
    echo "  ❌ Deployment Failed"
    echo "============================================================"
    exit 1
fi
