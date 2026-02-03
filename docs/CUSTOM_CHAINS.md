# Adding Custom Chain Addresses

This document explains how to add Safe contract addresses for custom chains without modifying npm package patches.

## Overview

The Safe Wallet Web now supports dynamic loading of custom chain contract addresses through a JSON configuration file. This eliminates the need to:
- Create and maintain large patch files
- Rebuild Docker images for every chain addition
- Deal with merge conflicts in patches

## Quick Start

### Adding a New Chain

1. Open `config/chains/custom-chains.json`
2. Add your chain configuration to the `chains` array
3. Deploy your changes (Docker restart or rebuild)

### Example Configuration

```json
{
  "version": "1.0.0",
  "chains": [
    {
      "chainId": "12345",
      "name": "My Custom Chain",
      "contracts": {
        "1.3.0": {
          "compatibilityFallbackHandler": {
            "address": "0x..."
          },
          "createCall": {
            "address": "0x..."
          },
          "gnosisSafe": {
            "address": "0x..."
          },
          "gnosisSafeL2": {
            "address": "0x..."
          },
          "multiSend": {
            "address": "0x..."
          },
          "multiSendCallOnly": {
            "address": "0x..."
          },
          "proxyFactory": {
            "address": "0x..."
          },
          "signMessageLib": {
            "address": "0x..."
          },
          "simulateTxAccessor": {
            "address": "0x..."
          }
        },
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
  ]
}
```

## Contract Addresses Required

### Safe v1.3.0 Contracts
- `compatibilityFallbackHandler` - Handles fallback calls
- `createCall` - Contract creation via Safe
- `gnosisSafe` - Main Safe singleton (L1)
- `gnosisSafeL2` - Main Safe singleton (L2)
- `multiSend` - Batch transactions
- `multiSendCallOnly` - Batch transactions (call only)
- `proxyFactory` - Creates Safe proxy instances
- `signMessageLib` - EIP-1271 message signing
- `simulateTxAccessor` - Transaction simulation

### Safe v1.4.1 Contracts
- `compatibilityFallbackHandler` - Handles fallback calls
- `createCall` - Contract creation via Safe
- `safe` - Main Safe singleton (L1)
- `safeL2` - Main Safe singleton (L2)
- `multiSend` - Batch transactions
- `multiSendCallOnly` - Batch transactions (call only)
- `safeProxyFactory` - Creates Safe proxy instances
- `signMessageLib` - EIP-1271 message signing
- `simulateTxAccessor` - Transaction simulation

## Optional: Block Numbers

You can optionally include deployment block numbers for more efficient event filtering:

```json
{
  "compatibilityFallbackHandler": {
    "address": "0x...",
    "blockNumber": 1234567
  }
}
```

## Deployment Methods

### Method 1: File-Based (Recommended)

**Development:**
```bash
# Edit the config file
vim config/chains/custom-chains.json

# Restart the development server
yarn dev
```

**Docker (Rebuild):**
```bash
# Edit the config file
vim config/chains/custom-chains.json

# Rebuild and restart
docker build -t safe-wallet-web .
docker run -p 8080:8080 safe-wallet-web
```

**Docker (Volume Mount - No Rebuild Required):**
```bash
docker run -p 8080:8080 \
  -v $(pwd)/config/chains/custom-chains.json:/app/config/chains/custom-chains.json:ro \
  safe-wallet-web
```

### Method 2: Environment Variable

```bash
export CUSTOM_CHAINS_CONFIG='{
  "version": "1.0.0",
  "chains": [{
    "chainId": "12345",
    "contracts": {...}
  }]
}'

yarn dev
```

Or in Docker:
```bash
docker run -p 8080:8080 \
  -e CUSTOM_CHAINS_CONFIG='{"version":"1.0.0","chains":[...]}' \
  safe-wallet-web
```

## How It Works

1. **Initialization**: The `customDeploymentLoader` initializes when the application starts
2. **Configuration Loading**: It tries to load from:
   - Environment variable `CUSTOM_CHAINS_CONFIG`
   - File `config/chains/custom-chains.json`
3. **Deployment Resolution**: When the app needs a contract address:
   - First checks custom configurations
   - Falls back to `@safe-global/safe-deployments` package defaults
4. **No Rebuild Required**: For Docker deployments with volume mounts, just:
   - Edit `custom-chains.json`
   - Restart the container

## Migration from Patches

### Before (Patch-Based)
```bash
# Add chain addresses to 16,000+ line patch file
vim patches/@safe-global+safe-deployments+1.36.0.patch

# Commit the patch
git add patches/
git commit -m "Add chain 12345"

# Rebuild Docker image
docker build -t safe-wallet-web .
```

### After (Config-Based)
```bash
# Add chain to config file
vim config/chains/custom-chains.json

# Commit the config
git add config/chains/custom-chains.json
git commit -m "Add chain 12345"

# Just restart container (with volume mount)
docker restart safe-wallet-web
# OR rebuild if not using volumes
docker build -t safe-wallet-web .
```

## Troubleshooting

### Chain not loading
- Check the JSON syntax in `custom-chains.json`
- Verify the chainId matches exactly (as string)
- Check browser/server console for errors
- Ensure all required contracts are specified

### Addresses not being used
- Confirm the custom deployment loader initialized (check console logs)
- Verify contract name spelling matches exactly
- Check that you're using the correct version (1.3.0 or 1.4.1)

### Docker not seeing changes
- If using volume mount: restart container
- If not using volume mount: rebuild image
- Verify the config file is being copied correctly

## Files Modified

This feature added/modified the following files:
- `src/config/custom-deployments.types.ts` - TypeScript types
- `src/services/contracts/custom-deployment-loader.ts` - Configuration loader
- `src/services/contracts/deployments.ts` - Updated to use custom loader
- `config/chains/custom-chains.json` - Configuration file
- `Dockerfile` - Copies config file into image
- `package.json` - Removed patch-package from postinstall

## Benefits

✅ **No Docker rebuild** - Update config and restart container
✅ **Cleaner version control** - Small JSON changes instead of 16K+ line patches
✅ **Easy rollback** - Revert a single config file
✅ **Multiple environments** - Different configs for dev/staging/prod
✅ **Merge conflict free** - No more patch conflicts
✅ **Self-documenting** - JSON structure is clear and readable
