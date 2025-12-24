#!/bin/bash
set -e

# Build and push Safe Wallet Web UI to ECR
# This includes all custom chain patches
#
# Usage:
#   ./build-and-push-to-ecr.sh                    # Push as custom-{git-hash}
#   ./build-and-push-to-ecr.sh v1.0.1             # Push as v1.0.1 and latest
#   ./build-and-push-to-ecr.sh v1.0.1 --no-latest # Push as v1.0.1 only (no latest)

ECR_REGISTRY="305587085711.dkr.ecr.us-west-2.amazonaws.com"
ECR_REPOSITORY="safe-wallet-web"

# Parse arguments
CUSTOM_TAG="${1:-}"
NO_LATEST="${2:-}"

if [ -n "$CUSTOM_TAG" ]; then
    IMAGE_TAG="$CUSTOM_TAG"
    LATEST_TAG="latest"
else
    IMAGE_TAG="custom-$(git rev-parse --short HEAD)"
    LATEST_TAG="custom-latest"
fi

echo "🏗️  Building Safe Wallet Web with custom chain patches..."
echo ""
echo "Current git commit: $(git rev-parse --short HEAD)"
echo "Primary tag: ${IMAGE_TAG}"
if [ "$NO_LATEST" != "--no-latest" ]; then
    echo "Latest tag: ${LATEST_TAG}"
fi
echo ""

# Check if repository exists, create if not
echo "📝 Step 1/6: Checking ECR repository..."
if ! aws ecr describe-repositories --repository-names ${ECR_REPOSITORY} --region us-west-2 >/dev/null 2>&1; then
    echo "Creating ECR repository ${ECR_REPOSITORY}..."
    aws ecr create-repository \
        --repository-name ${ECR_REPOSITORY} \
        --region us-west-2 \
        --image-scanning-configuration scanOnPush=true
else
    echo "Repository ${ECR_REPOSITORY} already exists"
fi

echo ""
echo "📝 Step 2/6: Logging into ECR..."
aws ecr get-login-password --region us-west-2 | \
  docker login --username AWS --password-stdin ${ECR_REGISTRY}

echo ""
echo "🔨 Step 3/6: Building Docker image..."
echo "This will take 10-15 minutes as it builds the Next.js app..."
if [ "$NO_LATEST" != "--no-latest" ]; then
    docker build \
      --platform linux/amd64 \
      -t ${ECR_REPOSITORY}:${IMAGE_TAG} \
      -t ${ECR_REPOSITORY}:${LATEST_TAG} \
      .
else
    docker build \
      --platform linux/amd64 \
      -t ${ECR_REPOSITORY}:${IMAGE_TAG} \
      .
fi

echo ""
echo "🏷️  Step 4/6: Tagging images for ECR..."
docker tag ${ECR_REPOSITORY}:${IMAGE_TAG} ${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}
if [ "$NO_LATEST" != "--no-latest" ]; then
    docker tag ${ECR_REPOSITORY}:${LATEST_TAG} ${ECR_REGISTRY}/${ECR_REPOSITORY}:${LATEST_TAG}
fi

echo ""
echo "📤 Step 5/6: Pushing image with tag ${IMAGE_TAG}..."
docker push ${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}

if [ "$NO_LATEST" != "--no-latest" ]; then
    echo ""
    echo "📤 Step 6/6: Pushing image with tag ${LATEST_TAG}..."
    docker push ${ECR_REGISTRY}/${ECR_REPOSITORY}:${LATEST_TAG}
fi

echo ""
echo "✅ Safe Wallet Web image successfully pushed to ECR!"
echo ""
echo "Images:"
echo "  - ${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}"
if [ "$NO_LATEST" != "--no-latest" ]; then
    echo "  - ${ECR_REGISTRY}/${ECR_REPOSITORY}:${LATEST_TAG}"
fi
echo ""
echo "To use in Kubernetes, update your values file:"
echo "  ui:"
echo "    image: ${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}"
echo "    containerPort: 8080"
echo ""
echo "Or manually restart the deployment to pull latest:"
echo "  kubectl rollout restart deployment gnosis-safe-core-ui -n gnosis-safe"
echo ""
