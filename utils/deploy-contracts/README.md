# Safe 1.4.1 Contract Deployment Tool

Deploys Safe 1.4.1 contracts to a custom EVM chain using the [official Safe Singleton Factory](https://github.com/safe-global/safe-singleton-factory) at `0x914d7Fec6aaC8cd542e72Bca78B30650d45643d7`, pre-deployed by the Safe team.

This produces the same canonical contract addresses as on mainnet.

## Prerequisites

- The Safe team must have deployed the Singleton Factory on your target chain. Confirm at `0x914d7Fec6aaC8cd542e72Bca78B30650d45643d7`.
- A funded deployer wallet (`PRIVATE_KEY`).

## Build

```bash
docker build -t safe-deployer . -f Dockerfile --platform=linux/amd64
```

## Deploy

```bash
docker run --rm \
  -e PRIVATE_KEY="0x..." \
  -e RPC_URL="https://your-rpc-endpoint.com" \
  -e CHAIN_ID="1962" \
  safe-deployer
```

## Deploy with Blockscout verification

```bash
docker run --rm \
  -e PRIVATE_KEY="0x..." \
  -e RPC_URL="https://your-rpc-endpoint.com" \
  -e CHAIN_ID="1962" \
  -e BLOCKSCOUT_URL="https://your-blockscout-explorer.com" \
  -e ETHERSCAN_API_KEY="any" \
  safe-deployer
```

`ETHERSCAN_API_KEY` can be any non-empty string — Blockscout does not require a real key.

## Output

```
Deployed Contract Addresses:

   SimulateTxAccessor:              0x...
   SafeProxyFactory:                0x...
   TokenCallbackHandler:            0x...
   CompatibilityFallbackHandler:    0x...
   CreateCall:                      0x...
   MultiSend:                       0x...
   MultiSendCallOnly:               0x...
   SignMessageLib:                  0x...
   SafeL2:                          0x...
   Safe:                            0x...
```

Copy these addresses into `config/chains/custom-chains.json`.

If contracts are already deployed, the script prints `reusing` and skips re-deployment.

## Expected noise

The output includes lines like:

```
{"error":"Invalid chainIds: 1962","message":"Invalid chainIds: 1962"}
verifying SimulateTxAccessor (...) ...
{"error":"Chain 1962 not supported for verification!","message":"Chain 1962 not supported for verification!"}
```

This is harmless. It comes from [Sourcify](https://sourcify.dev), a public contract registry that hardhat-deploy always queries automatically. Private/custom chains are not registered with Sourcify, so it always rejects them. The actual Blockscout verification runs after and succeeds:

```
=> contract SimulateTxAccessor is now verified
```
