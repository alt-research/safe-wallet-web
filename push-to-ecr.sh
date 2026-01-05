#!/bin/bash
set -e

# Configuration
ECR_REGISTRY="305587085711.dkr.ecr.us-west-2.amazonaws.com"
IMAGE_NAME="safe-wallet-web"
REGION="us-west-2"

# Get version from command line or use 'latest'
VERSION="${1:-latest}"

# Full image tag
IMAGE_TAG="${ECR_REGISTRY}/${IMAGE_NAME}:${VERSION}"

echo "Building Docker image: ${IMAGE_TAG}"
docker build -t "${IMAGE_TAG}" --platform linux/amd64 .

echo "Logging in to ECR..."
aws ecr get-login-password --region "${REGION}" | docker login --username AWS --password-stdin "${ECR_REGISTRY}"

echo "Pushing image to ECR..."
docker push "${IMAGE_TAG}"

echo "✅ Successfully pushed ${IMAGE_TAG}"

# If version is not 'latest', also tag and push as 'latest'
if [ "${VERSION}" != "latest" ]; then
    LATEST_TAG="${ECR_REGISTRY}/${IMAGE_NAME}:latest"
    echo "Tagging as latest: ${LATEST_TAG}"
    docker tag "${IMAGE_TAG}" "${LATEST_TAG}"
    docker push "${LATEST_TAG}"
    echo "✅ Also pushed ${LATEST_TAG}"
fi

echo ""
echo "To deploy to Kubernetes:"
echo "  kubectl rollout restart deployment gnosis-safe-core-ui -n gnosis-safe"
