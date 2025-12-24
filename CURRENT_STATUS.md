# Current Gnosis Safe Deployment Status

**Date:** 2025-12-23
**Namespace:** gnosis-safe
**Cluster:** staging (stg20230731v070mp)

---

## ✅ What's Working

### Core Services (Shared Infrastructure)
- ✅ **UI** - https://safe-staging.alt.technology/
- ✅ **Client Gateway (CGW)** - Aggregates data from all chains
- ✅ **Config Service (CFG)** - Chain registry
- ✅ **Events Service** - Notifications/webhooks
- ✅ **Ingress** - External routing configured
- ✅ **Databases** - PostgreSQL, Redis, RabbitMQ

### Chain Services (Lyra Mainnet - Chain ID 957)
- ✅ **Transaction Service** - Indexing Lyra blockchain
  - Version: 4.28.4
  - RPC: https://rpc.derive.xyz/
  - Explorer: https://explorer.derive.xyz/
- ✅ **Worker** - Background indexing jobs
- ✅ **Databases** - PostgreSQL, Redis, RabbitMQ

### Safe Contracts on Lyra (Chain 957)
```
✅ Configured in UI patches:
- SimulateTxAccessor: 0xf48f2B2d2a534e402487b3ee7C18c33Aec0Fe5e4
- SafeProxyFactory: 0x7cbB62EaA69F79e6873cD1ecB2392971036cFAa4
- SafeL2: (and other contracts)
```

---

## 🎯 Current Configuration

### Chain in Config Service
```
Chain ID: 957
Name: Lyra Mainnet
Short Name: lyra
L2: Yes
Testnet: No
RPC: https://rpc.derive.xyz/
Explorer: https://explorer.derive.xyz/
Transaction Service: http://gnosis-safe-chain-web.gnosis-safe.svc.cluster.local:8000
```

### External URLs
- UI: https://safe-staging.alt.technology/
- CGW API: https://safe-staging.alt.technology/cgw/v1/chains
- Config API: https://safe-staging.alt.technology/cfg/api/v1/chains/
- Config Admin: Port-forward to access at http://localhost:8001/cfg/admin/

### Credentials
- Config Admin: `root` / `admin`
- RabbitMQ: `guest` / `guest`
- PostgreSQL: `postgres` / `postgres`

---

## 📝 What You Have Now

### File Structure
```
gitops-staging-others/gnosis-safe/
├── helmrelease-core.yaml    # FluxCD: Core services
├── helmrelease-chain.yaml   # FluxCD: Lyra chain
├── values-core.yaml         # Core config
├── values-chain.yaml        # Lyra chain config
└── ingress.yaml            # External routing

helm-charts/charts/gnosis-safe/
├── gnosis-safe-core/       # Core Helm chart
└── gnosis-safe-chain/      # Chain Helm chart

safe-wallet-web/
├── .env.local              # UI build vars
├── patches/                # Safe contracts for chain 957
├── Dockerfile
├── build-and-push-to-ecr.sh
├── SETUP_GUIDE.md          # Detailed guide (read this!)
├── QUICK_REFERENCE.md      # Quick commands
└── CURRENT_STATUS.md       # This file
```

### Deployed Resources
```bash
$ kubectl get pods -n gnosis-safe

Core Services (1 instance each):
- gnosis-safe-core-ui
- gnosis-safe-core-cgw
- gnosis-safe-core-cfg (2 containers: django + nginx)
- gnosis-safe-core-events
- gnosis-safe-core-cfg-psql
- gnosis-safe-core-events-psql
- gnosis-safe-core-cgw-redis
- gnosis-safe-core-general-mq

Chain Services for Lyra (1 instance each):
- gnosis-safe-chain-web (2 containers: django + nginx)
- gnosis-safe-chain-worker (3 containers: scheduler + 2 workers)
- gnosis-safe-chain-txs-psql
- gnosis-safe-chain-txs-redis
- gnosis-safe-chain-txs-rabbitmq
```

---

## ⚠️ Known Issues / Next Steps

### Wallet Connection Issue
**Symptom:** Can't connect wallet or create Safe

**Possible Causes:**
1. Safe contracts not actually deployed on Lyra blockchain
2. Transaction service still indexing (give it a few minutes)
3. RPC node not responding
4. Missing Safe master copy configuration

**To Debug:**
```bash
# 1. Check if RPC is working
curl -X POST https://rpc.derive.xyz/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# 2. Check if Safe contracts exist on chain
# Visit: https://explorer.derive.xyz/address/0xf48f2B2d2a534e402487b3ee7C18c33Aec0Fe5e4

# 3. Check transaction service logs
kubectl logs -n gnosis-safe -l app=gnosis-safe-chain-web -f

# 4. Check worker is indexing
kubectl logs -n gnosis-safe -l app=gnosis-safe-chain-worker -f

# 5. Check Safe master copies in database
kubectl exec -n gnosis-safe gnosis-safe-chain-txs-psql-0 -- \
  bash -c 'PGPASSWORD=postgres psql -U postgres -d postgres -c "SELECT * FROM history_safemasterCopy;"'
```

### To Verify Safe Contracts on Chain
**IMPORTANT:** The UI patches assume these contracts exist on Lyra at these addresses. You need to verify they're actually deployed:

1. Visit explorer: https://explorer.derive.xyz/address/0xf48f2B2d2a534e402487b3ee7C18c33Aec0Fe5e4
2. Check if contract code exists
3. If NOT deployed, you have two options:
   - **Option A:** Deploy official Safe contracts to Lyra
   - **Option B:** Use existing Safe deployments if Lyra has them at different addresses

---

## 🔄 To Start Fresh

If you want to delete everything and start over:

```bash
# 1. Delete namespace (WARNING: Deletes all data!)
kubectl delete namespace gnosis-safe
kubectl create namespace gnosis-safe

# 2. Redeploy core services
helm upgrade --install gnosis-safe-core \
  helm-charts/charts/gnosis-safe/gnosis-safe-core \
  -f gitops-staging-others/gnosis-safe/values-core.yaml \
  -n gnosis-safe

# 3. Wait for core to be ready (3-5 minutes)
kubectl get pods -n gnosis-safe -w

# 4. Redeploy Lyra chain service
helm upgrade --install gnosis-safe-chain \
  helm-charts/charts/gnosis-safe/gnosis-safe-chain \
  -f gitops-staging-others/gnosis-safe/values-chain.yaml \
  -n gnosis-safe

# 5. Recreate ingress
kubectl apply -f gitops-staging-others/gnosis-safe/ingress.yaml

# 6. Re-add Lyra chain in Config Service admin
kubectl port-forward -n gnosis-safe svc/gnosis-safe-core-cfg 8001:80
# Open: http://localhost:8001/cfg/admin/
# Login: root / admin
# Add chain with settings from values-chain.yaml
```

---

## 📊 To Add More Chains

**Example: Adding Arbitrum One (Chain ID 42161)**

### 1. Check if Arbitrum has Safe contracts
Visit: https://github.com/safe-global/safe-deployments/blob/main/src/assets/v1.4.1/gnosis-safe.json

### 2. Deploy Arbitrum transaction service
```bash
# Copy chain config
cp gitops-staging-others/gnosis-safe/values-chain.yaml \
   gitops-staging-others/gnosis-safe/values-chain-arb1.yaml

# Edit values-chain-arb1.yaml:
nano gitops-staging-others/gnosis-safe/values-chain-arb1.yaml

# Change these values:
#   ETH_L2_NETWORK: "42161"
#   ETHEREUM_NODE_URL: "https://arb1.arbitrum.io/rpc"
#   ETHEREUM_TRACING_NODE_URL: "https://arb1.arbitrum.io/rpc"

# Deploy
helm upgrade --install gnosis-safe-chain-arb1 \
  helm-charts/charts/gnosis-safe/gnosis-safe-chain \
  -f gitops-staging-others/gnosis-safe/values-chain-arb1.yaml \
  -n gnosis-safe
```

### 3. Add Arbitrum to Config Service
```bash
kubectl port-forward -n gnosis-safe svc/gnosis-safe-core-cfg 8001:80
# Open: http://localhost:8001/cfg/admin/
# Chains > Add Chain
# Fill in Arbitrum details
# Transaction Service: http://gnosis-safe-chain-arb1-web.gnosis-safe.svc.cluster.local:8000
```

### 4. Update UI patches (if needed)
If Arbitrum contracts aren't in patches, add them:
```bash
# Edit patches to include Arbitrum contracts
nano safe-wallet-web/patches/@safe-global+safe-deployments+1.25.0.patch

# Rebuild UI
cd safe-wallet-web
./build-and-push-to-ecr.sh

# Update values-core.yaml with new image tag
# Redeploy core
helm upgrade gnosis-safe-core \
  helm-charts/charts/gnosis-safe/gnosis-safe-core \
  -f gitops-staging-others/gnosis-safe/values-core.yaml \
  -n gnosis-safe
```

---

## 📖 Read Next

1. **SETUP_GUIDE.md** - Complete architecture explanation
2. **QUICK_REFERENCE.md** - Handy commands and troubleshooting

---

## 🎓 Learning Resources

- **Gnosis Safe Docs:** https://docs.safe.global/
- **Safe Deployments:** https://github.com/safe-global/safe-deployments
- **Transaction Service:** https://github.com/safe-global/safe-transaction-service
- **Config Service:** https://github.com/safe-global/safe-config-service
- **Safe Contracts:** https://github.com/safe-global/safe-contracts

---

## Summary for Beginners

**Think of it like this:**

1. **Core Services** = The shopping mall (building, security, directory)
   - You only need ONE mall
   - It serves ALL stores

2. **Chain Services** = Individual stores in the mall
   - Each blockchain = one store
   - Want to support 3 blockchains? Need 3 stores
   - Each store has its own inventory (transaction database)

3. **Config Service** = The mall directory
   - Lists which stores (chains) are available
   - Tells people how to find each store

4. **UI** = The mall entrance/website
   - Users enter here
   - Shows all available stores

**You currently have:**
- ✅ 1 mall (core)
- ✅ 1 store (Lyra chain)
- ✅ Mall directory updated
- ✅ Entrance/website working

**To add more chains:**
- Deploy another store (chain service)
- Update the directory (config service)
- Make sure the store has products (Safe contracts deployed on that blockchain)
