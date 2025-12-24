# Gnosis Safe Setup Guide

## Current State of Your Deployment

### ✅ What's Running

**Core Services (Shared Across All Chains):**
- ✅ UI: Web interface at https://safe-staging.alt.technology
- ✅ Client Gateway (CGW): API aggregator
- ✅ Config Service (CFG): Chain registry
- ✅ Events Service: Webhooks/notifications
- ✅ Ingress: External routing configured

**Chain Services (Per-Chain):**
- ✅ Chain 957 (Lyra Mainnet): Transaction indexing service running

**Currently Configured Chains:**
- Lyra Mainnet (Chain ID: 957)
  - RPC: https://rpc.derive.xyz/
  - Explorer: https://explorer.derive.xyz/

---

## Architecture Explained

### Core Services (1 instance total)
```
┌─────────────────────────────────────────────┐
│           Core Services                      │
│  (Shared by ALL chains)                     │
├─────────────────────────────────────────────┤
│ UI          → Web interface                 │
│ CGW         → API that fetches data         │
│ CFG         → Chain registry/config         │
│ Events      → Notifications                 │
└─────────────────────────────────────────────┘
```

### Chain Services (1 instance per chain)
```
┌─────────────────────────────────────────────┐
│        Chain Service: Lyra (957)            │
├─────────────────────────────────────────────┤
│ TXS Web     → Transaction API               │
│ TXS Worker  → Blockchain indexer            │
│ Database    → Stores transactions           │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│     Future: Chain Service: Chain 2          │
├─────────────────────────────────────────────┤
│ TXS Web     → Transaction API               │
│ TXS Worker  → Blockchain indexer            │
│ Database    → Stores transactions           │
└─────────────────────────────────────────────┘
```

---

## How to Add More Chains

### Step 1: Add Chain to Config Service

Access the Django admin panel:
```bash
# Port-forward to config service
kubectl port-forward -n gnosis-safe svc/gnosis-safe-core-cfg 8001:80

# Open in browser
open http://localhost:8001/cfg/admin/

# Login credentials (from values-core.yaml)
Username: root
Password: admin
```

Navigate to: **Chains** → **Add Chain**

Fill in the required fields:
- **Chain ID**: e.g., `42161` (Arbitrum One)
- **Chain Name**: e.g., `Arbitrum One`
- **Short Name**: e.g., `arb1`
- **RPC URI**: e.g., `https://arb1.arbitrum.io/rpc`
- **Block Explorer**: e.g., `https://arbiscan.io/`
- **Transaction Service URL**: `http://gnosis-safe-chain-arb1-web.gnosis-safe.svc.cluster.local:8000`
- **Recommended Master Copy Version**: `1.4.1`
- **Native Currency**: ETH, 18 decimals
- **Theme**: Text color, background color
- **L2**: Check if it's a layer 2
- **Is Testnet**: Check if testnet

### Step 2: Add Safe Contract Addresses (Important!)

For the chain to work, you need to configure Safe contract deployments. Check if your chain has official Safe deployments:

**Option A: Chain has official Safe deployments**
1. Check: https://github.com/safe-global/safe-deployments/tree/main/src/assets
2. Find your chain ID in the JSON files
3. The UI patches in your repo already include these

**Option B: Chain needs custom Safe contracts**
1. Deploy Safe contracts to your chain
2. Update the patches in: `/Users/hyunjoongkim/dev/alt-research/safe-wallet-web/patches/`
3. Rebuild the UI Docker image

### Step 3: Deploy Chain-Specific Transaction Service

Create a new Helm release for the chain:

```bash
# Copy the chain values template
cp gitops-staging-others/gnosis-safe/values-chain.yaml \
   gitops-staging-others/gnosis-safe/values-chain-arb1.yaml

# Edit the new file
```

Update these values in `values-chain-arb1.yaml`:
```yaml
web:
  env:
    ETH_L2_NETWORK: "42161"                    # Arbitrum One chain ID
    ETHEREUM_NODE_URL: "https://arb1.arbitrum.io/rpc"
    ETHEREUM_TRACING_NODE_URL: "https://arb1.arbitrum.io/rpc"
```

Deploy it:
```bash
helm upgrade --install gnosis-safe-chain-arb1 \
  /Users/hyunjoongkim/dev/alt-research/helm-charts/charts/gnosis-safe/gnosis-safe-chain \
  -f gitops-staging-others/gnosis-safe/values-chain-arb1.yaml \
  -n gnosis-safe
```

### Step 4: Update Config Service with Transaction Service URL

Go back to the Django admin and update the chain's transaction service URL to match your deployment:
```
http://gnosis-safe-chain-arb1-web.gnosis-safe.svc.cluster.local:8000
```

---

## Data That Needs to Be Filled In

### For Core Services (One-time setup)
Located in: `gitops-staging-others/gnosis-safe/values-core.yaml`

**Required:**
- ✅ WalletConnect Project ID (you have: `dce8b76eeca269d6a63782777c1972d9`)
- ✅ Domain name (you have: `safe-staging.alt.technology`)

**Optional (for production):**
- Exchange rates API key
- Price provider API key (CoinGecko)
- Email service credentials
- Alert provider credentials

### For Each Chain Service
Located in: `gitops-staging-others/gnosis-safe/values-chain.yaml`

**Required per chain:**
- ✅ Chain ID (ETH_L2_NETWORK)
- ✅ RPC URL (ETHEREUM_NODE_URL)
- ✅ Safe contract addresses (in UI patches)

**Optional:**
- Archive RPC for historical data (ETHEREUM_TRACING_NODE_URL)
- Database size (default 50Gi is good for most chains)

---

## Can You Delete and Restart?

### Yes, but be aware of data loss:

**What you'll lose:**
- All indexed transactions
- All Safe account metadata
- All chain configurations in Config Service
- All webhooks/subscriptions

**What you'll keep:**
- Your Safe accounts on the blockchain (they're immutable)
- Your configuration files in gitops-staging-others/

### To delete and restart:

```bash
# Delete everything
kubectl delete namespace gnosis-safe

# Recreate namespace
kubectl create namespace gnosis-safe

# Redeploy core services
helm upgrade --install gnosis-safe-core \
  /Users/hyunjoongkim/dev/alt-research/helm-charts/charts/gnosis-safe/gnosis-safe-core \
  -f gitops-staging-others/gnosis-safe/values-core.yaml \
  -n gnosis-safe

# Redeploy chain services
helm upgrade --install gnosis-safe-chain \
  /Users/hyunjoongkim/dev/alt-research/helm-charts/charts/gnosis-safe/gnosis-safe-chain \
  -f gitops-staging-others/gnosis-safe/values-chain.yaml \
  -n gnosis-safe

# Recreate ingress
kubectl apply -f gitops-staging-others/gnosis-safe/ingress.yaml

# Re-add chains in Config Service admin panel
```

---

## Common Issues & Solutions

### Issue: "Can't connect wallet" or "Chain not showing"

**Cause:** Safe contract addresses not configured for this chain

**Solution:**
1. Check if chain has official Safe deployments
2. Update patches if needed
3. Rebuild UI image

### Issue: Transaction service returns 404

**Cause:** Transaction service not deployed or URL incorrect

**Solution:**
1. Check transaction service is running: `kubectl get pods -n gnosis-safe | grep chain`
2. Verify URL in Config Service matches the Kubernetes service name

### Issue: UI shows old gateway URL

**Cause:** Environment variables override build-time values

**Solution:**
1. Remove `NEXT_PUBLIC_*` env vars from Helm values
2. Ensure `.env.local` has correct values before building
3. Rebuild and push UI image

---

## Monitoring Your Deployment

```bash
# Check all pods
kubectl get pods -n gnosis-safe

# Check core services logs
kubectl logs -n gnosis-safe -l app.kubernetes.io/instance=gnosis-safe-core -f

# Check chain service logs
kubectl logs -n gnosis-safe -l app.kubernetes.io/instance=gnosis-safe-chain -f

# Check CGW is returning chains
kubectl run -n gnosis-safe test-curl --image=curlimages/curl:latest --rm -it --restart=Never \
  -- curl -s http://gnosis-safe-core-cgw/v1/chains

# Access config service admin
kubectl port-forward -n gnosis-safe svc/gnosis-safe-core-cfg 8001:80
# Then open: http://localhost:8001/cfg/admin/
```

---

## File Structure

```
gitops-staging-others/gnosis-safe/
├── helmrelease-core.yaml       # FluxCD release for core
├── helmrelease-chain.yaml      # FluxCD release for chain
├── values-core.yaml            # Core services config
├── values-chain.yaml           # Chain services config
└── ingress.yaml                # External routing

helm-charts/charts/gnosis-safe/
├── gnosis-safe-core/           # Core Helm chart
│   ├── templates/
│   │   ├── ui-deployment.yaml
│   │   ├── cgw-deployment.yaml
│   │   ├── cfg-deployment.yaml
│   │   └── events-deployment.yaml
│   └── values.yaml
└── gnosis-safe-chain/          # Chain Helm chart
    ├── templates/
    │   ├── web-deployment.yaml
    │   └── worker-deployment.yaml
    └── values.yaml

safe-wallet-web/
├── patches/                    # Safe contract addresses
├── .env.local                  # Build-time env vars
├── Dockerfile
└── build-and-push-to-ecr.sh   # Build script
```

---

## Next Steps

1. **Test wallet connection**: Try connecting MetaMask to Lyra Mainnet
2. **Create a Safe**: Use the UI to create a new Safe account
3. **Add more chains**: Follow steps above to add Arbitrum, Optimism, etc.
4. **Production hardening**:
   - Change default passwords
   - Enable TLS/HTTPS with cert-manager
   - Set up proper monitoring
   - Configure backup for PostgreSQL databases

---

## Support Resources

- Official Gnosis Safe docs: https://docs.safe.global/
- Safe deployments: https://github.com/safe-global/safe-deployments
- Safe contracts: https://github.com/safe-global/safe-contracts
- Transaction service: https://github.com/safe-global/safe-transaction-service
- Config service: https://github.com/safe-global/safe-config-service
