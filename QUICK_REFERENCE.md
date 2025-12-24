# Gnosis Safe - Quick Reference

## Current Setup Summary

**✅ What You Have:**
- 1 Core service (shared infrastructure)
- 1 Chain service (Lyra Mainnet - Chain ID 957)
- UI accessible at: https://safe-staging.alt.technology
- Ingress configured for external access

**📊 Current Status:**
```bash
# Check status
kubectl get pods -n gnosis-safe

# Should see:
# - gnosis-safe-core-ui (1/1 Running)
# - gnosis-safe-core-cgw (1/1 Running)
# - gnosis-safe-core-cfg (2/2 Running)
# - gnosis-safe-core-events (1/1 Running)
# - gnosis-safe-chain-web (2/2 Running)
# - gnosis-safe-chain-worker (3/3 Running)
# - Plus databases (psql, redis, rabbitmq)
```

---

## Quick Commands

### View Everything
```bash
# All resources
kubectl get all -n gnosis-safe

# Just pods
kubectl get pods -n gnosis-safe

# Ingress
kubectl get ingress -n gnosis-safe
```

### Check Logs
```bash
# UI logs
kubectl logs -n gnosis-safe -l app=gnosis-safe-core-ui -f

# Client Gateway logs
kubectl logs -n gnosis-safe -l app=gnosis-safe-core-cgw -f

# Transaction service logs
kubectl logs -n gnosis-safe -l app=gnosis-safe-chain-web -f
```

### Access Admin Panels
```bash
# Config Service Admin (add/edit chains)
kubectl port-forward -n gnosis-safe svc/gnosis-safe-core-cfg 8001:80
# Open: http://localhost:8001/cfg/admin/
# Login: root / admin

# RabbitMQ Management (message queue)
kubectl port-forward -n gnosis-safe svc/gnosis-safe-core-general-mq 15672:15672
# Open: http://localhost:15672
# Login: guest / guest
```

### Test APIs
```bash
# Test chain list from CGW
curl https://safe-staging.alt.technology/cgw/v1/chains

# Test config service
curl https://safe-staging.alt.technology/cfg/api/v1/chains/

# Test transaction service (internal only)
kubectl run -n gnosis-safe test-curl --image=curlimages/curl:latest --rm -it --restart=Never \
  -- curl -s http://gnosis-safe-chain-web:8000/api/v1/about/
```

---

## To Add a New Chain

### 1. Add to Config Service
```bash
# Access admin panel
kubectl port-forward -n gnosis-safe svc/gnosis-safe-core-cfg 8001:80

# Open browser: http://localhost:8001/cfg/admin/
# Navigate to: Chains > Add Chain

# Fill in:
# - Chain ID: e.g., 42161
# - Chain Name: e.g., Arbitrum One
# - Short Name: e.g., arb1
# - RPC URI: https://arb1.arbitrum.io/rpc
# - Explorer: https://arbiscan.io/
# - Transaction Service: http://gnosis-safe-chain-arb1-web.gnosis-safe.svc.cluster.local:8000
```

### 2. Deploy Transaction Service
```bash
# Copy chain config
cp gitops-staging-others/gnosis-safe/values-chain.yaml \
   gitops-staging-others/gnosis-safe/values-chain-arb1.yaml

# Edit values-chain-arb1.yaml:
# - Change ETH_L2_NETWORK to new chain ID
# - Change ETHEREUM_NODE_URL to new RPC
# - Change ETHEREUM_TRACING_NODE_URL to new RPC

# Deploy
helm upgrade --install gnosis-safe-chain-arb1 \
  helm-charts/charts/gnosis-safe/gnosis-safe-chain \
  -f gitops-staging-others/gnosis-safe/values-chain-arb1.yaml \
  -n gnosis-safe
```

### 3. Verify
```bash
# Check new pods are running
kubectl get pods -n gnosis-safe | grep arb1

# Check CGW can see the chain
curl https://safe-staging.alt.technology/cgw/v1/chains
```

---

## To Delete and Start Fresh

### Delete Everything
```bash
# Warning: This deletes ALL data!
kubectl delete namespace gnosis-safe
kubectl create namespace gnosis-safe
```

### Redeploy Core
```bash
helm upgrade --install gnosis-safe-core \
  helm-charts/charts/gnosis-safe/gnosis-safe-core \
  -f gitops-staging-others/gnosis-safe/values-core.yaml \
  -n gnosis-safe
```

### Redeploy Chain (Lyra)
```bash
helm upgrade --install gnosis-safe-chain \
  helm-charts/charts/gnosis-safe/gnosis-safe-chain \
  -f gitops-staging-others/gnosis-safe/values-chain.yaml \
  -n gnosis-safe
```

### Recreate Ingress
```bash
kubectl apply -f gitops-staging-others/gnosis-safe/ingress.yaml
```

### Re-add Chain in Admin
```bash
# Port-forward to admin panel
kubectl port-forward -n gnosis-safe svc/gnosis-safe-core-cfg 8001:80

# Open: http://localhost:8001/cfg/admin/
# Add Lyra Mainnet chain again (see above)
```

---

## To Update UI

### Rebuild UI Image
```bash
cd /Users/hyunjoongkim/dev/alt-research/safe-wallet-web

# Make sure .env.local is correct
cat .env.local

# Build and push
./build-and-push-to-ecr.sh

# Note the image tag (e.g., custom-abc123)
```

### Update Helm Release
```bash
# Edit values-core.yaml to use new image tag
# ui:
#   image: 305587085711.dkr.ecr.us-west-2.amazonaws.com/safe-wallet-web:custom-abc123

# Deploy
helm upgrade gnosis-safe-core \
  helm-charts/charts/gnosis-safe/gnosis-safe-core \
  -f gitops-staging-others/gnosis-safe/values-core.yaml \
  -n gnosis-safe

# Wait for new pod
kubectl get pods -n gnosis-safe -w | grep ui
```

---

## Troubleshooting

### UI doesn't show my chain
1. Check chain is in config service: `curl https://safe-staging.alt.technology/cfg/api/v1/chains/`
2. Check CGW can see it: `curl https://safe-staging.alt.technology/cgw/v1/chains`
3. Check browser console for errors
4. Verify Safe contracts are deployed on that chain

### Transaction service returns errors
1. Check RPC is accessible: `curl -X POST https://rpc.derive.xyz/ -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'`
2. Check worker logs: `kubectl logs -n gnosis-safe -l app=gnosis-safe-chain-worker -f`
3. Check database is accessible: `kubectl exec -n gnosis-safe gnosis-safe-chain-txs-psql-0 -- psql -U postgres -c "SELECT version();"`

### Can't connect wallet
1. Check MetaMask is on correct network
2. Check network is configured in Config Service
3. Check Safe contracts exist on that chain
4. Check browser console for errors

### Ingress not working
1. Check ingress exists: `kubectl get ingress -n gnosis-safe`
2. Check DNS resolves: `nslookup safe-staging.alt.technology`
3. Check services are running: `kubectl get svc -n gnosis-safe`
4. Test from inside cluster: `kubectl run -n gnosis-safe test-curl --image=curlimages/curl:latest --rm -it --restart=Never -- curl -s http://gnosis-safe-core-ui/`

---

## Important Files

### Configuration
- `gitops-staging-others/gnosis-safe/values-core.yaml` - Core services config
- `gitops-staging-others/gnosis-safe/values-chain.yaml` - Lyra chain config
- `gitops-staging-others/gnosis-safe/ingress.yaml` - External routing
- `safe-wallet-web/.env.local` - UI build-time env vars

### Charts
- `helm-charts/charts/gnosis-safe/gnosis-safe-core/` - Core chart
- `helm-charts/charts/gnosis-safe/gnosis-safe-chain/` - Chain chart

### UI
- `safe-wallet-web/patches/` - Safe contract addresses per chain
- `safe-wallet-web/Dockerfile` - UI build instructions
- `safe-wallet-web/build-and-push-to-ecr.sh` - Build script

---

## Database Access

### Config Service DB
```bash
kubectl exec -n gnosis-safe gnosis-safe-core-cfg-psql-0 -- \
  bash -c 'PGPASSWORD=postgres psql -U postgres -d postgres'

# Useful queries:
# \dt - list tables
# SELECT * FROM chains_chain;
# SELECT * FROM chains_gasPrice;
```

### Transaction Service DB
```bash
kubectl exec -n gnosis-safe gnosis-safe-chain-txs-psql-0 -- \
  bash -c 'PGPASSWORD=postgres psql -U postgres -d postgres'

# Useful queries:
# \dt - list tables
# SELECT * FROM history_safemasterCopy;
# SELECT * FROM history_chain;
```

---

## Service URLs

**External (browser):**
- UI: https://safe-staging.alt.technology/
- CGW API: https://safe-staging.alt.technology/cgw/
- Config API: https://safe-staging.alt.technology/cfg/

**Internal (Kubernetes):**
- UI: http://gnosis-safe-core-ui.gnosis-safe.svc.cluster.local
- CGW: http://gnosis-safe-core-cgw.gnosis-safe.svc.cluster.local
- Config: http://gnosis-safe-core-cfg.gnosis-safe.svc.cluster.local
- TXS: http://gnosis-safe-chain-web.gnosis-safe.svc.cluster.local:8000

---

## What Data Persists

**In Databases (survives pod restarts):**
- Chain configurations (Config Service PostgreSQL)
- Indexed transactions (Transaction Service PostgreSQL)
- Cached data (Redis)

**Lost on namespace delete:**
- All of the above
- RabbitMQ messages
- Any custom configurations

**Never lost (on blockchain):**
- Your Safe accounts
- Your transactions
- Your funds
