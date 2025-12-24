# Chains in K8s Deployment

This file tracks which chains are configured in the K8s deployment of Safe Wallet Web.

Last updated: 2025-12-24

---

## Active Chains

### Orbit-demo (Chain ID: 20240328)
- **Status:** ✅ Ready (patches exist)
- **Added to patches:** 2025-12-24 (fixed chain ID)
- **Network Type:** Testnet (Arb Orbit)
- **Safe Contracts Version:** v1.4.1
- **RPC:** https://orbit-demo.alt.technology/
- **Explorer:** https://orbit-demo-explorer.alt.technology/
- **Transaction Service:** TBD (deploy to K8s)

**Contract Addresses (Deployed 2025-12-24):**
```json
{
  "SafeProxyFactory": "0x1970996dAcE0e304e98888d54C8ff5B8541B6e53",
  "SafeL2": "0x7d17ce1410eD66417aA8Ab8c61a10e4cD1312e01",
  "Safe": "0x3FF82beB47F9AD9e5FF31C79ad87375acad19f81",
  "CompatibilityFallbackHandler": "0x3C7455c65b8B179412046e95147a58557DdA176C",
  "MultiSend": "0x44a2d054F69910A7D439ffFa510Bdc00CbBF66Ce",
  "SimulateTxAccessor": "0x47e367b6c6480464DBB953541Be53e7534d2b498",
  "CreateCall": "0xA60dd58079F2bc7e2C7DeC9314ce0ba46C39e55d",
  "TokenCallbackHandler": "0xeb8546c79EC8356224c031b11e7FB7F02857fF0B"
}
```

**Note:** These are NON-deterministic addresses (deployed without CREATE2) and differ from other chains.

### Lyra Mainnet (Chain ID: 957)
- **Status:** ✅ Deployed (staging)
- **Added to patches:** 2023-12
- **Network Type:** Mainnet
- **Safe Contracts Version:** v1.4.1
- **RPC:** https://rpc.derive.xyz/
- **Explorer:** https://explorer.derive.xyz/
- **Transaction Service:** lyra-mainnet namespace (K8s staging)

**Contract Addresses:**
```json
{
  "SimulateTxAccessor": "0xf48f2B2d2a534e402487b3ee7C18c33Aec0Fe5e4",
  "SafeProxyFactory": "0x7cbB62EaA69F79e6873cD1ecB2392971036cFAa4",
  "SafeL2": "0x3E5c63644E683549055b9Be8653de26E0B4CD36E"
}
```

---

## Other Chains in Patches

These chains are configured in the patches but not yet deployed to K8s:

| Chain ID | Name | Status | Notes |
|----------|------|--------|-------|
| 4078 | Muster | In patches | Not deployed |
| 88188 | B2 | In patches | Not deployed |
| Various | 50+ chains | In patches | Inherited from upstream patches |

---

## How to Add a New Chain

### Prerequisites

1. **Safe contracts deployed** on the target chain
2. **Contract addresses** for all required Safe contracts
3. **RPC endpoint** accessible from K8s cluster
4. **Block explorer** URL (optional but recommended)

### Steps

1. **Update patches**
   ```bash
   # Follow instructions in ADDING-NEW-CHAINS.md
   yarn install
   cd node_modules/@safe-global/safe-deployments/src/assets/v1.4.1/
   # Edit contract JSON files to add chain ID + addresses
   cd ../../../../..
   npx patch-package @safe-global/safe-deployments
   ```

2. **Update this file**
   - Add chain to "Active Chains" section
   - Document RPC, explorer, contract addresses
   - Set status to "✅ Ready"

3. **Commit and push**
   ```bash
   git add patches/ .k8s/CHAINS.md
   git commit -m "Add chain XYZ (ID: 12345)"
   git push origin k8s-deployment
   ```

4. **Create and push git tag**
   ```bash
   # Version tag
   git tag v1.0.0
   git push origin v1.0.0

   # Or chain-specific tag
   git tag v1.0.0-orbit  # For orbit-demo
   git push origin v1.0.0-orbit
   ```

5. **GitHub Actions will auto-build**
   - Watch: https://github.com/alt-research/safe-wallet-web/actions
   - Images pushed to ECR:
     - `305587085711.dkr.ecr.us-west-2.amazonaws.com/safe-wallet-web:v1.0.0`
     - `305587085711.dkr.ecr.us-west-2.amazonaws.com/safe-wallet-web:latest`

6. **Deploy to K8s**
   - Update GitOps HelmRelease to use tagged version
   - Add chain to Config Service database
   - Deploy chain-specific transaction service
   - See: gitops-staging-others/gnosis-safe/ADDING_CHAINS.md

---

## Image Tags

GitHub Actions creates tags based on git tags:

- `latest` - Always points to latest tagged build
- `v*` - Version tags (e.g., `v1.0.0`, `v2.1.3`)
- `*-orbit` - Orbit-specific releases (e.g., `v1.0.0-orbit`)
- `*-lyra` - Lyra-specific releases (e.g., `v1.0.0-lyra`)

**ECR Repository:**
```
305587085711.dkr.ecr.us-west-2.amazonaws.com/safe-wallet-web
```

**Tag workflow triggers:**
```bash
# Triggers build on tags matching: v*, *-orbit, *-lyra
git tag v1.0.0        # ✅ Triggers build
git tag v1.0.0-orbit  # ✅ Triggers build
git tag test-abc      # ❌ Does NOT trigger
```

---

## Deployment Environments

| Environment | Image Tag | GitOps Repo | Namespace |
|-------------|-----------|-------------|-----------|
| Staging | `latest` or `v*` | gitops-staging-others | gnosis-safe |
| Production | `v{version}` | gitops-mainnet-others | gnosis-safe |

**Recommendation:**
- **Staging:** Use `latest` for automatic updates or specific version `v1.0.0`
- **Production:** Always use specific version tags `v1.0.0` for stability

---

## Troubleshooting

### Chain not appearing in UI

1. **Check patches are applied:**
   ```bash
   grep -r "\"20240328\"" node_modules/@safe-global/safe-deployments/
   ```

2. **Rebuild image:**
   ```bash
   git push origin k8s-deployment  # Triggers GitHub Actions
   ```

3. **Check Config Service:**
   - Chain must be in Config Service database
   - See: gitops-staging-others/gnosis-safe/ADDING_CHAINS.md

### Image build fails

1. **Check GitHub Actions logs:**
   https://github.com/alt-research/safe-wallet-web/actions

2. **Test build locally:**
   ```bash
   docker build --platform linux/amd64 -t test .
   ```

3. **Verify patches:**
   ```bash
   yarn install  # Should apply patches without errors
   ```

---

## References

- **Adding chains guide:** `/ADDING-NEW-CHAINS.md`
- **GitOps deployment guide:** `gitops-staging-others/gnosis-safe/ADDING_CHAINS.md`
- **GitHub Actions:** `.github/workflows/deploy-k8s-ecr.yml`
- **ECR build script:** `build-and-push-to-ecr.sh`
