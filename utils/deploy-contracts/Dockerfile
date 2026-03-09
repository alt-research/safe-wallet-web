# Safe 1.4.1 Contract Deployment
#
# Deploys Safe contracts using the official Safe Singleton Factory
# at 0x914d7Fec6aaC8cd542e72Bca78B30650d45643d7 (pre-deployed by the Safe team).
#
# Build:
#   docker build -t safe-deployer . -f Dockerfile --platform=linux/amd64
#
# Run (basic):
#   docker run --rm \
#     -e PRIVATE_KEY="0xyourprivatekeyhere" \
#     -e RPC_URL="https://your-rpc-endpoint.com" \
#     -e CHAIN_ID="957" \
#     safe-deployer
#
# Run (with Blockscout verification):
#   docker run --rm \
#     -e PRIVATE_KEY="0xyourprivatekeyhere" \
#     -e RPC_URL="https://your-rpc-endpoint.com" \
#     -e CHAIN_ID="957" \
#     -e BLOCKSCOUT_URL="https://your-blockscout-explorer.com" \
#     -e ETHERSCAN_API_KEY="any" \
#     safe-deployer

FROM node:18-alpine

RUN apk add --no-cache git python3 make g++

WORKDIR /app

RUN git clone https://github.com/safe-global/safe-smart-account.git . && \
    git checkout v1.4.1

RUN yarn install --frozen-lockfile

RUN yarn hardhat compile

ARG CACHE_BUST=1
COPY deploy-wrapper.sh add-network.js patch-hardhat-config.js patch-deploy-task.js /app/
RUN chmod +x /app/deploy-wrapper.sh

ENTRYPOINT ["/app/deploy-wrapper.sh"]
