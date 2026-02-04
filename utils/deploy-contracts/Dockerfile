# Safe 1.4.1 Contract Deployment Docker Image
#
# Usage:
#   docker build -t safe-deployer .
#
# Deployment Modes:
#
# 1. Standard Mode (default) - Non-deterministic addresses:
#   docker run --rm \
#     -e PRIVATE_KEY="0xyourprivatekeyhere" \
#     -e RPC_URL="https://your-rpc-endpoint.com" \
#     -e CHAIN_ID="957" \
#     -e NETWORK_NAME="custom" \
#     safe-deployer
#
# 2. Singleton Mode - Deploy and use singleton factory (deterministic addresses):
#   docker run --rm \
#     -e PRIVATE_KEY="0xyourprivatekeyhere" \
#     -e RPC_URL="https://your-rpc-endpoint.com" \
#     -e CHAIN_ID="957" \
#     -e NETWORK_NAME="custom" \
#     -e DEPLOYMENT_MODE="singleton" \
#     safe-deployer
#
# 3. Custom Factory Mode - Use existing factory (deterministic addresses):
#   docker run --rm \
#     -e PRIVATE_KEY="0xyourprivatekeyhere" \
#     -e RPC_URL="https://your-rpc-endpoint.com" \
#     -e CHAIN_ID="957" \
#     -e NETWORK_NAME="custom" \
#     -e DEPLOYMENT_MODE="custom" \
#     -e FACTORY_ADDRESS="0xYourFactoryAddress" \
#     safe-deployer
#
# Optional environment variables:
#   -e GAS_PRICE="1000000000" (in wei)
#   -e GAS_LIMIT="8000000"

FROM node:18-alpine

# Install git and other dependencies
RUN apk add --no-cache git python3 make g++

# Set working directory
WORKDIR /app

# Clone Safe Smart Account repository and checkout v1.4.1
RUN git clone https://github.com/safe-global/safe-smart-account.git . && \
    git checkout v1.4.1

# Install dependencies
RUN yarn install --frozen-lockfile

# Compile contracts to generate artifacts
RUN yarn hardhat compile

# Copy the deployment scripts
COPY deploy-wrapper.sh /app/deploy-wrapper.sh
COPY add-network.js /app/add-network.js
COPY patch-hardhat-config.js /app/patch-hardhat-config.js
COPY deploy-singleton-factory.js /app/deploy-singleton-factory.js
COPY deploy-alternative-factory.js /app/deploy-alternative-factory.js
COPY deploy-with-erc2470.js /app/deploy-with-erc2470.js
COPY patch-deploy-task.js /app/patch-deploy-task.js
COPY diagnose-singleton.js /app/diagnose-singleton.js
RUN chmod +x /app/deploy-wrapper.sh /app/add-network.js /app/patch-hardhat-config.js /app/deploy-singleton-factory.js /app/deploy-alternative-factory.js /app/deploy-with-erc2470.js /app/patch-deploy-task.js /app/diagnose-singleton.js

# Set the entrypoint
ENTRYPOINT ["/app/deploy-wrapper.sh"]
