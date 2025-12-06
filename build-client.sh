#!/bin/bash
# Build script for Digital Muse Client Docker image

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Building Digital Muse Client Docker Image${NC}"
echo ""

# Check if required environment variables are set
if [ -z "$DIGITALMUSE_API_URL" ]; then
    echo -e "${RED}Error: DIGITALMUSE_API_URL environment variable is required${NC}"
    echo "Example: export DIGITALMUSE_API_URL=https://api.your-domain.com"
    exit 1
fi

# Default values
IMAGE_NAME=${IMAGE_NAME:-"digitalmuse-client"}
IMAGE_TAG=${IMAGE_TAG:-"latest"}
REGISTRY=${REGISTRY:-""}

# Full image name
if [ -n "$REGISTRY" ]; then
    FULL_IMAGE_NAME="${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
else
    FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG}"
fi

echo -e "${YELLOW}Configuration:${NC}"
echo "  Image: $FULL_IMAGE_NAME"
echo "  DIGITALMUSE_API_URL: $DIGITALMUSE_API_URL"
echo ""

# Build the Docker image
echo -e "${GREEN}Building Docker image...${NC}"
docker build \
    -f Dockerfile.client \
    --build-arg DIGITALMUSE_API_URL="$DIGITALMUSE_API_URL" \
    -t "$FULL_IMAGE_NAME" \
    .

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ Build successful!${NC}"
    echo ""
    echo "Image: $FULL_IMAGE_NAME"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Test locally: docker run -p 8080:80 $FULL_IMAGE_NAME"
    echo "  2. Push to registry: docker push $FULL_IMAGE_NAME"
    echo "  3. Deploy to Kubernetes: helm install digital-muse ./helm/digital-muse"
else
    echo ""
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi
