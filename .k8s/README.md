# K8s Deployment Branch

This branch (`k8s-deployment`) is dedicated to building and deploying Safe Wallet Web UI to Kubernetes clusters.

## What's Different from Upstream?

This branch is **not** synced with the official Safe wallet (https://github.com/safe-global/safe-wallet-web).

**Key differences:**
- ✅ Custom chain support via patches
- ✅ Docker build for K8s (not S3 deployment)
- ✅ ECR image registry integration
- ✅ GitOps-friendly workflow
- ❌ No S3/CloudFront deployment
- ❌ No official Safe release process

## Branch Purpose

**Use this branch for:**
- Adding custom chains to Safe UI
- Building Docker images for K8s deployment
- Tracking which chains are deployed in K8s environments

**Do NOT use this branch for:**
- Official Safe releases
- S3/CloudFront deployments
- Syncing with upstream Safe changes (unless intentional)

## Quick Start

### Adding a New Chain

1. **Check if chain patches exist:**
   ```bash
   grep -r "\"YOUR_CHAIN_ID\"" patches/
   ```

2. **If not, add patches:**
   - Follow instructions in `/ADDING-NEW-CHAINS.md`
   - Update `.k8s/CHAINS.md` with chain details

3. **Commit and push:**
   ```bash
   git add patches/ .k8s/CHAINS.md
   git commit -m "Add support for Chain XYZ (ID: 12345)"
   git push origin k8s-deployment
   ```

4. **GitHub Actions will auto-build:**
   - Watch: https://github.com/alt-research/safe-wallet-web/actions
   - Image pushed to ECR: `305587085711.dkr.ecr.us-west-2.amazonaws.com/safe-wallet-web:k8s-latest`

5. **Deploy to K8s:**
   - Update GitOps HelmRelease
   - See: `gitops-staging-others/gnosis-safe/`

### Manual Build (Local Testing)

```bash
# Build Docker image
docker build --platform linux/amd64 -t safe-wallet-web:test .

# Test locally
docker run -p 8080:8080 safe-wallet-web:test

# Open browser
open http://localhost:8080
```

### Manual Push to ECR

```bash
# Use the helper script
./build-and-push-to-ecr.sh
```

## GitHub Actions Workflows

### Active Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `deploy-k8s-ecr.yml` | Push to k8s-deployment | Build & push Docker image to ECR |
| `lint.yml` | Push, PR | Code linting |
| `unit-tests.yml` | Push, PR | Run unit tests |

### Removed Workflows

These workflows were removed from k8s-deployment branch (not needed for K8s):

- ❌ `deploy-dev.yml` - S3 deployment
- ❌ `deploy-production.yml` - S3 production deployment
- ❌ `deploy-dockerhub.yml` - Docker Hub deployment
- ❌ `e2e-*.yml` - End-to-end tests
- ❌ `cla.yml` - Contributor License Agreement
- ❌ `tag-release.yml` - Release tagging
- ❌ `nextjs-bundle-analysis.yml` - Bundle analysis

## File Structure

```
.k8s/
├── README.md           # This file
├── CHAINS.md           # Chain inventory
└── orbit-demo.md       # Per-chain deployment notes (example)

.github/workflows/
├── deploy-k8s-ecr.yml  # K8s ECR deployment
├── lint.yml            # Linting
├── unit-tests.yml      # Tests
├── build/              # Reusable build action
└── yarn/               # Reusable yarn action

patches/                # Chain contract patches
build-and-push-to-ecr.sh  # Manual ECR push script
Dockerfile              # K8s-optimized Dockerfile
```

## Deployment Flow

```
┌─────────────────────────────────────────────────┐
│ 1. Developer adds chain patches                │
│    - Edit node_modules contract JSONs          │
│    - Run: npx patch-package                    │
│    - Update .k8s/CHAINS.md                      │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ 2. Push to k8s-deployment branch                │
│    git push origin k8s-deployment               │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ 3. GitHub Actions auto-builds                   │
│    - Runs yarn build (static export)            │
│    - Builds Docker image                        │
│    - Pushes to ECR with tags:                   │
│      * k8s-latest                               │
│      * k8s-{short-sha}                          │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ 4. Update GitOps HelmRelease                    │
│    - Edit: gitops-staging-others/               │
│      gnosis-safe/core/helmrelease.yaml          │
│    - Update ui.image to k8s-latest              │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ 5. FluxCD deploys to K8s                        │
│    - Pulls new image from ECR                   │
│    - Rolls out new UI pods                      │
│    - Chain now available in UI                  │
└─────────────────────────────────────────────────┘
```

## Image Tags Explained

| Tag | Description | Use Case |
|-----|-------------|----------|
| `k8s-latest` | Latest k8s-deployment build | Staging, auto-update |
| `k8s-{sha}` | Specific commit (e.g., k8s-a1b2c3d) | Production, pinned version |
| `k8s-{custom}` | Manual workflow tag | Special deployments |

**Recommendation:**
- **Staging:** Use `k8s-latest` for automatic updates
- **Production:** Use `k8s-{sha}` or `k8s-{version}` for stability

## Syncing with Upstream (Optional)

If you want to pull updates from official Safe:

```bash
# Add upstream remote (one-time)
git remote add upstream https://github.com/safe-global/safe-wallet-web.git

# Fetch upstream changes
git fetch upstream

# Cherry-pick specific commits
git cherry-pick <commit-hash>

# Or merge entire branch (risky - may conflict with patches)
git merge upstream/main
```

**Warning:** Merging upstream may:
- Break your custom patches
- Require re-creating patches
- Introduce dependency version conflicts

Only sync when necessary and test thoroughly!

## Troubleshooting

### Build fails with patch errors

```bash
# Clean and reinstall
rm -rf node_modules
yarn cache clean
yarn install

# Verify patches
npx patch-package --reverse
npx patch-package
```

### Image not updating in K8s

1. **Check image tag in HelmRelease:**
   ```bash
   kubectl get helmrelease -n gnosis-safe gnosis-safe-core -o yaml | grep image
   ```

2. **Force pod restart:**
   ```bash
   kubectl rollout restart deployment gnosis-safe-core-ui -n gnosis-safe
   ```

3. **Check image pull:**
   ```bash
   kubectl describe pod -n gnosis-safe | grep -A 5 "Events:"
   ```

### Chain not showing in UI

1. **Verify patches applied:** Check `node_modules/@safe-global/safe-deployments/`
2. **Rebuild image:** Push to k8s-deployment branch
3. **Check Config Service:** Chain must be in database
4. **Clear browser cache:** Hard refresh (Cmd+Shift+R)

## Support

- **Chain patches:** See `/ADDING-NEW-CHAINS.md`
- **K8s deployment:** See `gitops-staging-others/gnosis-safe/ADDING_CHAINS.md`
- **GitHub Actions:** https://github.com/alt-research/safe-wallet-web/actions

## Maintainers

This branch is maintained separately from upstream Safe.

**Contact:** Your team's DevOps/Platform team
