# Adding New Chains to Safe Wallet Web

This guide explains how to add support for new chains to your Safe Wallet Web fork.

## Overview

Your Safe Wallet Web fork uses `patch-package` to patch the `@safe-global/safe-deployments` package, adding custom chain configurations with Safe contract addresses.

## How Chain Patches Work

When you add a new chain, you're adding:
1. **Chain ID** - The numeric chain ID (e.g., 957, 4078, 88188)
2. **Contract addresses** for Safe contracts on that chain:
   - MultiSig factory
   - Compatibility fallback handler
   - Safe proxy factory
   - etc.

These are added to the `networkAddresses` field in each contract JSON file.

## Steps to Add a New Chain

### 1. Deploy Safe Contracts to Your Chain

First, you need to deploy the Safe contracts to your new chain. You can either:

**Option A: Use Gnosis's official deployment scripts**
```bash
# Clone safe-smart-account repo
git clone https://github.com/safe-global/safe-smart-account
cd safe-smart-account

# Deploy to your chain
# (Follow their deployment docs)
```

**Option B: Use existing canonical addresses**
If your chain uses deterministic deployment (CREATE2), the addresses might be the same as other chains:
- `0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99` - Common CompatibilityFallbackHandler
- Check existing chains in your patches for common addresses

### 2. Create the Patch

```bash
# 1. Install dependencies (this applies existing patches)
yarn install

# 2. Navigate to the safe-deployments package
cd node_modules/@safe-global/safe-deployments/src/assets/v1.4.1/

# 3. Edit the contract JSON files to add your chain ID and addresses
# For example, in compatibility_fallback_handler.json:
{
  "networkAddresses": {
    "1": "0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99",
    "100": "0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99",
    "YOUR_CHAIN_ID": "0xYourContractAddress"
  }
}

# Repeat for all contract files:
# - compatibility_fallback_handler.json
# - multi_send.json
# - multi_send_call_only.json
# - safe.json
# - safe_l2.json
# - safe_proxy_factory.json
# - sign_message_lib.json
# - simulate_tx_accessor.json

# 4. Go back to project root
cd ../../../../../..

# 5. Generate the patch
yarn patch-package @safe-global/safe-deployments
```

This will update the patch file in `patches/@safe-global+safe-deployments+1.25.0.patch`

### 3. Test Locally

```bash
# Build and test
yarn build
yarn serve

# Open http://localhost:8080 and verify your chain appears
```

### 4. Commit and Push

```bash
git add patches/
git commit -m "feat: support chain ID YOUR_CHAIN_ID"
git push
```

### 5. Build and Deploy Docker Image

```bash
# Build and push to ECR
chmod +x build-and-push-to-ecr.sh
./build-and-push-to-ecr.sh
```

### 6. Update Kubernetes Deployment

Update your `values-core.yaml` or `helmrelease-core.yaml`:

```yaml
ui:
  image: 305587085711.dkr.ecr.us-west-2.amazonaws.com/safe-wallet-web:custom-latest
  containerPort: 8080
```

## Example: Adding Chain ID 12345

```bash
# 1. Edit contract files
cd node_modules/@safe-global/safe-deployments/src/assets/v1.4.1/

# 2. In each JSON file, add:
"networkAddresses": {
  ...existing chains...,
  "12345": "0xYourDeployedContractAddress"
}

# 3. Generate patch
cd ../../../../../..
yarn patch-package @safe-global/safe-deployments

# 4. Commit
git add patches/
git commit -m "feat: support chain 12345 (My Chain Name)"

# 5. Build Docker image
./build-and-push-to-ecr.sh
```

## Viewing Your Current Chains

Check existing patches to see what chains you currently support:

```bash
# View chain IDs in your patches
grep -r '"[0-9]\+":' patches/ | grep -o '"[0-9]\+"' | sort -u
```

## Troubleshooting

**Patch not applying?**
- Delete `node_modules` and `yarn.lock`
- Run `yarn install` again
- Regenerate the patch

**Chain not showing up in UI?**
- Verify contract addresses are correct
- Check browser console for errors
- Ensure Safe Config Service also has your chain configured

**Build failing?**
- Check that all contract files have the same chain IDs
- Verify JSON syntax is valid
- Run `yarn after-install` to see detailed errors

## Related Services

Remember that Safe Wallet Web talks to **Safe Config Service**. You may also need to configure your chain in the Config Service backend.

Check your Config Service admin panel at: `http://gnosis-safe-core-cfg.gnosis-safe.svc.cluster.local:8001/cfg/admin/`
