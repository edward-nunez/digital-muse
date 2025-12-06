# Building Docker Images

This guide explains how to build Docker images for Digital Muse client and server.

## Quick Start

```bash
# Set required environment variable
export DIGITALMUSE_API_URL=https://api-digitalmuse.edwardnunez.io

# Build both client and server
./build-client.sh

# Build only client
./build-client.sh client

# Build only server
./build-client.sh server
```

## Environment Variables

### Required
- `DIGITALMUSE_API_URL` - API endpoint URL (required for client build)

### Optional
- `IMAGE_NAME` - Base image name (default: `digitalmuse`)
- `VERSION` - Version tag (default: `latest`)
- `REGISTRY` - Docker registry (default: `docker.io/dotrollen`)

## Examples

### Build with custom version
```bash
export DIGITALMUSE_API_URL=https://api-digitalmuse.edwardnunez.io
export VERSION=v1.2.0
./build-client.sh
```

This creates:
- `docker.io/dotrollen/digitalmuse:v1.2.0-client`
- `docker.io/dotrollen/digitalmuse:v1.2.0-server`

### Build only server (no API URL needed)
```bash
./build-client.sh server
```

### Build and push to registry
```bash
export DIGITALMUSE_API_URL=https://api-digitalmuse.edwardnunez.io
export VERSION=v1.2.0

# Build images
./build-client.sh

# Push to registry
docker push docker.io/dotrollen/digitalmuse:v1.2.0-client
docker push docker.io/dotrollen/digitalmuse:v1.2.0-server
```

### Build for different registry
```bash
export DIGITALMUSE_API_URL=https://api.example.com
export REGISTRY=ghcr.io/myorg
export VERSION=v1.0.0

./build-client.sh
```

This creates:
- `ghcr.io/myorg/digitalmuse:v1.0.0-client`
- `ghcr.io/myorg/digitalmuse:v1.0.0-server`

## Testing Built Images

### Test Client
```bash
docker run -p 8080:80 docker.io/dotrollen/digitalmuse:latest-client
# Open http://localhost:8080
```

### Test Server
```bash
docker run -p 3000:3000 \
  -e REDIS_URL=redis://localhost:6379 \
  -e SESSION_SECRET=test-secret \
  -e CORS_ORIGIN=http://localhost:8080 \
  docker.io/dotrollen/digitalmuse:latest-server
```

## Deployment

After building and pushing images, update your Helm values:

```yaml
# helm/values-development.yaml
client:
  image:
    repository: docker.io/dotrollen/digitalmuse
    tag: "v1.2.0-client"

server:
  image:
    repository: docker.io/dotrollen/digitalmuse
    tag: "v1.2.0-server"
```

Then deploy:
```bash
helm upgrade --install digital-muse ./helm/digital-muse \
  -f helm/values-development.yaml \
  --namespace digital-muse-dev
```

## Build Control Variables

You can control what gets built:

```bash
# Build only client
BUILD_CLIENT=true BUILD_SERVER=false ./build-client.sh

# Build only server
BUILD_CLIENT=false BUILD_SERVER=true ./build-client.sh

# Build both (default)
BUILD_CLIENT=true BUILD_SERVER=true ./build-client.sh
```

## Troubleshooting

### DIGITALMUSE_API_URL not set
```
Error: DIGITALMUSE_API_URL environment variable is required for client build
```
**Solution:** Set the environment variable or build only the server:
```bash
export DIGITALMUSE_API_URL=https://api-digitalmuse.edwardnunez.io
# OR
./build-client.sh server
```

### Docker build fails
Check Docker is running:
```bash
docker ps
```

### Permission denied
Make script executable:
```bash
chmod +x build-client.sh
```
