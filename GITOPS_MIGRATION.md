# Migrating Gnosis Safe to GitOps (FluxCD)

## Current State
- Manual Helm deployments active
- GitOps files exist but not committed
- Git rebase in progress on gitops-staging-others
- No Flux GitRepository for helm-charts

## Migration Steps

### Phase 1: Clean Up Git State

```bash
# 1. Navigate to gitops-staging-others
cd /Users/hyunjoongkim/dev/alt-research/gitops-staging-others

# 2. Abort the rebase (if you don't need those changes)
git rebase --abort

# OR complete the rebase if you need those changes:
git rebase --continue

# 3. Create a branch for your work
git checkout -b add-gnosis-safe

# 4. Add the gnosis-safe directory
git add gnosis-safe/

# 5. Commit
git commit -m "Add Gnosis Safe deployment manifests

- Core services (UI, CGW, CFG, Events)
- Chain service for Lyra Mainnet (957)
- Ingress for external access
"

# 6. Push to GitHub
git push origin add-gnosis-safe

# 7. Create PR or merge to master
# If you can merge directly:
git checkout master
git merge add-gnosis-safe
git push origin master
```

### Phase 2: Set Up Flux GitRepositories

Create Flux resources to watch both Git repos:

#### 2.1 Create helm-charts GitRepository

```bash
# Create the file
cat > /tmp/helm-charts-gitrepository.yaml <<EOF
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: helm-charts
  namespace: flux-system
spec:
  interval: 5m
  url: ssh://git@github.com/alt-research/helm-charts
  ref:
    branch: master  # or main, check your default branch
  secretRef:
    name: flux-system  # Uses existing Flux deploy key
EOF

# Apply it
kubectl apply -f /tmp/helm-charts-gitrepository.yaml

# Check status
kubectl get gitrepository helm-charts -n flux-system
```

#### 2.2 Create gitops-staging-others GitRepository

```bash
# Create the file
cat > /tmp/gitops-staging-others-gitrepository.yaml <<EOF
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: gitops-staging-others
  namespace: flux-system
spec:
  interval: 5m
  url: ssh://git@github.com/alt-research/gitops-staging-others
  ref:
    branch: master  # or main
  secretRef:
    name: flux-system  # Uses existing Flux deploy key
EOF

# Apply it
kubectl apply -f /tmp/gitops-staging-others-gitrepository.yaml

# Check status
kubectl get gitrepository gitops-staging-others -n flux-system
```

### Phase 3: Create Kustomization for Gnosis Safe

Create a Kustomization to deploy the gnosis-safe resources:

```bash
cat > /tmp/gnosis-safe-kustomization.yaml <<EOF
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: gnosis-safe
  namespace: flux-system
spec:
  interval: 10m
  timeout: 5m
  sourceRef:
    kind: GitRepository
    name: gitops-staging-others
  path: ./gnosis-safe
  prune: true
  wait: true
  dependsOn:
    - name: flux-system
EOF

# Apply it
kubectl apply -f /tmp/gnosis-safe-kustomization.yaml
```

### Phase 4: Prepare gitops-staging-others/gnosis-safe/

Create a kustomization.yaml in the gnosis-safe directory:

```bash
cd /Users/hyunjoongkim/dev/alt-research/gitops-staging-others/gnosis-safe

cat > kustomization.yaml <<EOF
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: gnosis-safe
resources:
  - namespace.yaml
  - helmrelease-core.yaml
  - helmrelease-chain.yaml
  - ingress.yaml
EOF

# Create namespace resource
cat > namespace.yaml <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: gnosis-safe
EOF

# Commit these new files
git add kustomization.yaml namespace.yaml
git commit -m "Add Kustomization for Gnosis Safe"
git push origin master
```

### Phase 5: Delete Manual Deployments

```bash
# Delete the namespace (removes all manual Helm releases)
kubectl delete namespace gnosis-safe

# Wait for deletion to complete
kubectl get namespace gnosis-safe
# Should show: Error from server (NotFound)
```

### Phase 6: Let Flux Deploy Everything

```bash
# Force Flux to reconcile immediately
flux reconcile source git gitops-staging-others
flux reconcile source git helm-charts
flux reconcile kustomization gnosis-safe

# Watch the deployment
kubectl get pods -n gnosis-safe -w

# Check HelmRelease status
kubectl get helmrelease -n gnosis-safe

# Check logs if issues
kubectl describe helmrelease gnosis-safe-core -n gnosis-safe
kubectl describe helmrelease gnosis-safe-chain -n gnosis-safe
```

### Phase 7: Re-add Chain Configuration

Once pods are running, add Lyra chain to Config Service:

```bash
# Port-forward to config service
kubectl port-forward -n gnosis-safe svc/gnosis-safe-core-cfg 8001:80

# Open browser: http://localhost:8001/cfg/admin/
# Login: root / admin

# Add Lyra Mainnet:
# - Chain ID: 957
# - Chain Name: Lyra Mainnet
# - Short Name: lyra
# - RPC URI: https://rpc.derive.xyz/
# - Block Explorer: https://explorer.derive.xyz/
# - Transaction Service: http://gnosis-safe-chain-web.gnosis-safe.svc.cluster.local:8000
# - Recommended Master Copy Version: 1.4.1
# - Native Currency: ETH, 18 decimals
# - L2: Yes
# - Is Testnet: No
```

## Verification

```bash
# 1. Check all pods are running
kubectl get pods -n gnosis-safe

# 2. Check HelmReleases are ready
kubectl get helmrelease -n gnosis-safe

# 3. Check ingress
kubectl get ingress -n gnosis-safe

# 4. Test the UI
curl https://safe-staging.alt.technology/

# 5. Test CGW API
curl https://safe-staging.alt.technology/cgw/v1/chains
```

## Future Updates

Now that it's managed by GitOps:

### To update configuration:
```bash
# 1. Edit files locally
cd /Users/hyunjoongkim/dev/alt-research/gitops-staging-others/gnosis-safe
nano values-core.yaml

# 2. Commit and push
git add values-core.yaml
git commit -m "Update core service configuration"
git push origin master

# 3. Flux auto-applies in ~5 minutes, or force it:
flux reconcile source git gitops-staging-others
flux reconcile kustomization gnosis-safe
```

### To update UI image:
```bash
# 1. Build new image
cd /Users/hyunjoongkim/dev/alt-research/safe-wallet-web
./build-and-push-to-ecr.sh
# Note the image tag, e.g., custom-abc123

# 2. Update values file
cd /Users/hyunjoongkim/dev/alt-research/gitops-staging-others/gnosis-safe
nano values-core.yaml
# Change: image: 305587085711.dkr.ecr.us-west-2.amazonaws.com/safe-wallet-web:custom-abc123

# 3. Commit and push
git add values-core.yaml
git commit -m "Update UI image to custom-abc123"
git push origin master

# 4. Flux auto-deploys the new image
```

### To add a new chain:
```bash
# 1. Create new values file
cd /Users/hyunjoongkim/dev/alt-research/gitops-staging-others/gnosis-safe
cp values-chain.yaml values-chain-arb1.yaml
nano values-chain-arb1.yaml
# Update chain ID, RPC, etc.

# 2. Create new HelmRelease
cp helmrelease-chain.yaml helmrelease-chain-arb1.yaml
nano helmrelease-chain-arb1.yaml
# Update metadata.name, releaseName, valuesFrom

# 3. Add to kustomization.yaml
nano kustomization.yaml
# Add:
#   - helmrelease-chain-arb1.yaml

# 4. Commit and push
git add values-chain-arb1.yaml helmrelease-chain-arb1.yaml kustomization.yaml
git commit -m "Add Arbitrum One chain support"
git push origin master

# 5. Add chain in Config Service admin panel
```

## Benefits of GitOps

✅ **Version Control**: All changes tracked in Git
✅ **Audit Trail**: See who changed what and when
✅ **Rollback**: `git revert` to undo changes
✅ **Consistency**: Same process for all environments
✅ **Automation**: Flux auto-applies changes from Git
✅ **Disaster Recovery**: Entire infrastructure in Git
✅ **Review Process**: Use PRs for changes

## Troubleshooting

### HelmRelease stuck in "Installing"
```bash
# Check events
kubectl describe helmrelease gnosis-safe-core -n gnosis-safe

# Check Helm controller logs
kubectl logs -n flux-system deployment/helm-controller -f
```

### GitRepository not updating
```bash
# Check GitRepository status
kubectl describe gitrepository helm-charts -n flux-system

# Force reconcile
flux reconcile source git helm-charts
```

### Changes not applying
```bash
# Check Kustomization status
kubectl describe kustomization gnosis-safe -n flux-system

# Force reconcile entire chain
flux reconcile source git gitops-staging-others
flux reconcile kustomization gnosis-safe
```

### Check Flux health
```bash
flux check
flux get all
```

## Files Created/Modified

After migration, you'll have:

```
gitops-staging-others/gnosis-safe/
├── kustomization.yaml          # NEW: Defines what to deploy
├── namespace.yaml              # NEW: Creates gnosis-safe namespace
├── helmrelease-core.yaml       # EXISTING: Core services
├── helmrelease-chain.yaml      # EXISTING: Lyra chain
├── values-core.yaml           # EXISTING: Core config
├── values-chain.yaml          # EXISTING: Lyra config
└── ingress.yaml              # EXISTING: External routing
```

Flux resources in cluster:
- GitRepository: helm-charts
- GitRepository: gitops-staging-others
- Kustomization: gnosis-safe
- HelmRelease: gnosis-safe-core (created by Flux)
- HelmRelease: gnosis-safe-chain (created by Flux)
