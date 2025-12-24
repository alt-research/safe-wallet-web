#!/bin/bash
set -e

# Build and push Safe Wallet Web UI to ECR
# This includes all custom chain patches

ECR_REGISTRY="305587085711.dkr.ecr.us-west-2.amazonaws.com"
ECR_REPOSITORY="safe-wallet-web"
IMAGE_TAG="custom-$(git rev-parse --short HEAD)"
LATEST_TAG="custom-latest"

echo "🏗️  Building Safe Wallet Web with custom chain patches..."
echo ""
echo "Current git commit: $(git rev-parse --short HEAD)"
echo "Image tag: ${IMAGE_TAG}"
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
docker build \
  --platform linux/amd64 \
  -t ${ECR_REPOSITORY}:${IMAGE_TAG} \
  -t ${ECR_REPOSITORY}:${LATEST_TAG} \
  .

echo ""
echo "🏷️  Step 4/6: Tagging images for ECR..."
docker tag ${ECR_REPOSITORY}:${IMAGE_TAG} ${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}
docker tag ${ECR_REPOSITORY}:${LATEST_TAG} ${ECR_REGISTRY}/${ECR_REPOSITORY}:${LATEST_TAG}

echo ""
echo "📤 Step 5/6: Pushing image with tag ${IMAGE_TAG}..."
docker push ${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}

echo ""
echo "📤 Step 6/6: Pushing image with tag ${LATEST_TAG}..."
docker push ${ECR_REGISTRY}/${ECR_REPOSITORY}:${LATEST_TAG}

echo ""
echo "✅ Safe Wallet Web image successfully pushed to ECR!"
echo ""
echo "Images:"
echo "  - ${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}"
echo "  - ${ECR_REGISTRY}/${ECR_REPOSITORY}:${LATEST_TAG}"
echo ""
echo "To use in Kubernetes, update your values file:"
echo "  ui:"
echo "    image: ${ECR_REGISTRY}/${ECR_REPOSITORY}:${LATEST_TAG}"
echo "    containerPort: 8080"
echo ""
