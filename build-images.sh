#!/bin/bash
# Build script for Digital Muse Docker images (Client and Server)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
IMAGE_NAME=${IMAGE_NAME:-"digitalmuse"}
VERSION=${VERSION:-"latest"}
REGISTRY=${REGISTRY:-"docker.io/dotrollen"}

# Build targets (default: both)
BUILD_CLIENT=${BUILD_CLIENT:-true}
BUILD_SERVER=${BUILD_SERVER:-true}

# Allow command line args to specify what to build
if [ "$1" = "client" ]; then
    BUILD_SERVER=false
elif [ "$1" = "server" ]; then
    BUILD_CLIENT=false
elif [ "$1" = "both" ] || [ "$1" = "all" ]; then
    BUILD_CLIENT=true
    BUILD_SERVER=true
fi

echo -e "${BLUE}==================================================${NC}"
echo -e "${GREEN}Building Digital Muse Docker Images${NC}"
echo -e "${BLUE}==================================================${NC}"
echo ""

# Check if required environment variables are set for client build
if [ "$BUILD_CLIENT" = true ] && [ -z "$DIGITALMUSE_API_URL" ]; then
    echo -e "${RED}Error: DIGITALMUSE_API_URL environment variable is required for client build${NC}"
    echo "Example: export DIGITALMUSE_API_URL=https://api.your-domain.com"
    exit 1
fi

echo -e "${YELLOW}Configuration:${NC}"
echo "  Registry: $REGISTRY"
echo "  Image Name: $IMAGE_NAME"
echo "  Version: $VERSION"
echo "  Build Client: $BUILD_CLIENT"
echo "  Build Server: $BUILD_SERVER"
if [ "$BUILD_CLIENT" = true ]; then
    echo "  API URL: $DIGITALMUSE_API_URL"
fi
echo ""

# Build client
if [ "$BUILD_CLIENT" = true ]; then
    CLIENT_TAG="${VERSION}-client"
    if [ -n "$REGISTRY" ]; then
        CLIENT_IMAGE="${REGISTRY}/${IMAGE_NAME}:${CLIENT_TAG}"
    else
        CLIENT_IMAGE="${IMAGE_NAME}:${CLIENT_TAG}"
    fi

    echo -e "${GREEN}[1/$([ "$BUILD_SERVER" = true ] && echo "2" || echo "1")] Building Client Image${NC}"
    echo "  Image: $CLIENT_IMAGE"
    echo ""

    docker build \
        -f Dockerfile.client \
        --build-arg DIGITALMUSE_API_URL="$DIGITALMUSE_API_URL" \
        -t "$CLIENT_IMAGE" \
        .

    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✓ Client build successful!${NC}"
        echo ""
    else
        echo ""
        echo -e "${RED}✗ Client build failed${NC}"
        exit 1
    fi
fi

# Build server
if [ "$BUILD_SERVER" = true ]; then
    SERVER_TAG="${VERSION}-server"
    if [ -n "$REGISTRY" ]; then
        SERVER_IMAGE="${REGISTRY}/${IMAGE_NAME}:${SERVER_TAG}"
    else
        SERVER_IMAGE="${IMAGE_NAME}:${SERVER_TAG}"
    fi

    echo -e "${GREEN}[$([ "$BUILD_CLIENT" = true ] && echo "2/2" || echo "1/1")] Building Server Image${NC}"
    echo "  Image: $SERVER_IMAGE"
    echo ""

    docker build \
        -f Dockerfile.server \
        -t "$SERVER_IMAGE" \
        .

    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✓ Server build successful!${NC}"
        echo ""
    else
        echo ""
        echo -e "${RED}✗ Server build failed${NC}"
        exit 1
    fi
fi

# Summary
echo -e "${BLUE}==================================================${NC}"
echo -e "${GREEN}✓ Build Complete!${NC}"
echo -e "${BLUE}==================================================${NC}"
echo ""

if [ "$BUILD_CLIENT" = true ]; then
    echo -e "${YELLOW}Client Image:${NC}"
    echo "  $CLIENT_IMAGE"
    echo ""
fi

if [ "$BUILD_SERVER" = true ]; then
    echo -e "${YELLOW}Server Image:${NC}"
    echo "  $SERVER_IMAGE"
    echo ""
fi

echo -e "${YELLOW}Next steps:${NC}"
if [ "$BUILD_CLIENT" = true ]; then
    echo "  • Test client: docker run -p 8080:80 $CLIENT_IMAGE"
    echo "  • Push client: docker push $CLIENT_IMAGE"
fi
if [ "$BUILD_SERVER" = true ]; then
    echo "  • Test server: docker run -p 3000:3000 -e REDIS_URL=... $SERVER_IMAGE"
    echo "  • Push server: docker push $SERVER_IMAGE"
fi
echo "  • Deploy: helm install digital-muse ./helm/digital-muse -f helm/values-development.yaml"
echo ""