#!/bin/sh
set -e

echo "============================================================"
echo "  Safe 1.4.1 Contract Deployment"
echo "============================================================"
echo ""

# Validate required environment variables
if [ -z "$PRIVATE_KEY" ]; then
    echo "Error: PRIVATE_KEY environment variable is required"
    echo ""
    echo "Usage:"
    echo "  docker run --rm \\"
    echo "    -e PRIVATE_KEY=\"0xyourprivatekeyhere\" \\"
    echo "    -e RPC_URL=\"https://your-rpc-endpoint.com\" \\"
    echo "    -e CHAIN_ID=\"957\" \\"
    echo "    safe-deployer"
    exit 1
fi

if [ -z "$RPC_URL" ]; then
    echo "Error: RPC_URL environment variable is required"
    exit 1
fi

if [ -z "$CHAIN_ID" ]; then
    echo "Error: CHAIN_ID environment variable is required"
    exit 1
fi

NETWORK_NAME=${NETWORK_NAME:-custom}

echo "Configuration:"
echo "  Network:  $NETWORK_NAME"
echo "  Chain ID: $CHAIN_ID"
echo "  RPC URL:  $RPC_URL"
if [ -n "$BLOCKSCOUT_URL" ]; then
    echo "  Blockscout: $BLOCKSCOUT_URL"
fi
echo ""

# Strip '0x' prefix from private key if present
PRIVATE_KEY_CLEAN=$(echo "$PRIVATE_KEY" | sed 's/^0x//')

# Write .env for hardhat (hardhat.config.ts reads PK, not PRIVATE_KEY)
cat > /app/.env << EOF
NODE_URL=$RPC_URL
PK=$PRIVATE_KEY_CLEAN
EOF

export NODE_URL=$RPC_URL
export CHAIN_ID=$CHAIN_ID
export NETWORK_NAME=$NETWORK_NAME
export BLOCKSCOUT_URL=$BLOCKSCOUT_URL

# Add the target network to hardhat.config.ts
node /app/add-network.js

# Patch hardhat.config.ts to use the official Safe Singleton Factory
echo "Patching hardhat.config.ts..."
node /app/patch-hardhat-config.js
echo "Patching deploy_contracts task..."
node /app/patch-deploy-task.js

DEPLOYER_ADDRESS=$(node -e "const ethers = require('ethers'); const wallet = new ethers.Wallet('$PRIVATE_KEY_CLEAN'); console.log(wallet.address);")
echo "Deployer: $DEPLOYER_ADDRESS"
echo ""
echo "Note: Uses the official Safe Singleton Factory at 0x914d7Fec6aaC8cd542e72Bca78B30650d45643d7"
echo "      Contracts will have the same canonical addresses as on mainnet."
echo ""

echo "============================================================"
echo "  Starting Deployment"
echo "============================================================"
echo ""

DEPLOY_LOG="/tmp/deploy-output.log"
set +e
(yarn deploy-all $NETWORK_NAME 2>&1; echo $? > /tmp/deploy-exit-code.txt) | tee "$DEPLOY_LOG"
DEPLOY_EXIT_CODE=$(cat /tmp/deploy-exit-code.txt 2>/dev/null || echo "1")
set -e

if [ $DEPLOY_EXIT_CODE -eq 0 ]; then
    echo ""
    echo "============================================================"
    echo "  Deployment Successful"
    echo "============================================================"
    echo ""
    echo "Deployed Contract Addresses:"
    echo ""

    DEPLOY_OUTPUT=$(cat "$DEPLOY_LOG")
    for contract in SimulateTxAccessor SafeProxyFactory TokenCallbackHandler CompatibilityFallbackHandler CreateCall MultiSend MultiSendCallOnly SignMessageLib SafeL2 Safe; do
        # Match "deployed at 0x..." or "reusing "Contract" at 0x..."
        ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep "\"$contract\"" | grep -oE 'at 0x[a-fA-F0-9]{40}' | grep -oE '0x[a-fA-F0-9]{40}' | head -1)
        if [ -n "$ADDRESS" ]; then
            printf "   %-32s %s\n" "$contract:" "$ADDRESS"
        fi
    done

    echo ""
    echo "Next steps:"
    echo "  1. Copy the addresses above into config/chains/custom-chains.json"
    echo ""
else
    echo ""
    echo "============================================================"
    echo "  Deployment Failed"
    echo "============================================================"
    exit 1
fi
