# Helm Chart Summary - Digital Muse

## Overview

Complete Kubernetes Helm charts have been created for deploying Digital Muse with all required services. The charts follow Helm best practices and support multiple deployment scenarios.

## What Was Created

### Chart Structure

```
helm/
├── README.md                      # Quick reference guide
├── validate.sh                    # Chart validation script
├── deploy.sh                      # Interactive deployment script
├── values-production.yaml         # Production configuration
├── values-development.yaml        # Development configuration
├── values-local.yaml              # Local/Minikube configuration
└── digital-muse/                  # Main Helm chart
    ├── Chart.yaml                 # Chart metadata
    ├── values.yaml                # Default values
    ├── README.md                  # Detailed documentation
    ├── templates/
    │   ├── namespace.yaml         # Kubernetes namespace
    │   └── secrets-example.yaml   # Example secret templates
    └── charts/                    # Subcharts
        ├── client/                # Nginx static server (Phaser game)
        ├── server/                # Express.js API server
        └── redis/                 # Redis session store
```

## Components

### 1. Client Subchart (`charts/client`)
- **Container**: Nginx 1.25-alpine
- **Replicas**: 2-5 (production), 1 (dev/local)
- **Service**: LoadBalancer (default)
- **Health Check**: HTTP GET /health
- **Resources**: 100m CPU, 64Mi RAM (requests); 200m CPU, 128Mi RAM (limits)
- **Autoscaling**: Enabled with CPU/memory targets
- **Features**:
  - Serves static Phaser game files
  - Automatic Gzip compression
  - Security headers
  - Cache control with asset versioning
  - SPA routing support

### 2. Server Subchart (`charts/server`)
- **Container**: Node.js 20-alpine (running Express.js)
- **Replicas**: 2-10 (production), 1 (dev/local)
- **Service**: ClusterIP (internal only)
- **Health Check**: HTTP GET /api/health
- **Resources**: 250m CPU, 256Mi RAM (requests); 500m CPU, 512Mi RAM (limits)
- **Autoscaling**: Enabled with CPU/memory targets (up to 10-20 replicas)
- **Features**:
  - Express.js API server
  - WebSocket support (Socket.io)
  - Session management with Redis
  - CORS configuration
  - Rate limiting
  - Input validation

### 3. Redis Subchart (`charts/redis`)
- **Container**: Redis 7-alpine
- **Replicas**: 1 (single instance)
- **Service**: ClusterIP (internal only)
- **Persistence**: PVC-backed (5Gi production, 2Gi dev, disabled local)
- **Resources**: 250m CPU, 256Mi RAM (requests); 500m CPU, 512Mi RAM (limits)
- **Features**:
  - Session storage
  - Data persistence (configurable)
  - Memory management with maxmemory policy
  - Health checks with redis-cli

## Deployment Scenarios

### Production Deployment

```bash
# 1. Create namespace and secrets
kubectl create namespace digital-muse
kubectl create secret generic digitalmuse-redis-url \
  --from-literal=redis-url="redis://digital-muse-redis:6379" \
  -n digital-muse
kubectl create secret generic digitalmuse-session-secret \
  --from-literal=session-secret="$(openssl rand -base64 32)" \
  -n digital-muse

# 2. Deploy with production values
helm install digital-muse ./helm/digital-muse \
  -n digital-muse \
  -f helm/values-production.yaml \
  --set global.domain=your-domain.com \
  --set global.apiUrl=https://api.your-domain.com
```

### Development Deployment

```bash
helm install digital-muse ./helm/digital-muse \
  -n digital-muse \
  -f helm/values-development.yaml \
  --set global.domain=dev.your-domain.com
```

### Local Testing (Minikube/Docker Desktop)

```bash
helm install digital-muse ./helm/digital-muse \
  -n digital-muse \
  -f helm/values-local.yaml

# Port forward to test
kubectl port-forward -n digital-muse svc/digital-muse-client 8080:80
# Visit http://localhost:8080
```

## Key Features

### 1. Multi-Environment Support
- **Production**: Full replication, autoscaling, persistence
- **Development**: Reduced resources, staging SSL
- **Local**: No persistence, NodePort services

### 2. Horizontal Pod Autoscaling (HPA)
- Client: 2-5 replicas (CPU 80%, Memory 80%)
- Server: 2-10 replicas (CPU 70%, Memory 80%)
- Redis: Single instance (stateful)

### 3. Ingress & SSL/TLS
- Nginx Ingress Controller support
- Cert-Manager integration for Let's Encrypt
- WebSocket support for Socket.io
- Configurable hostnames and TLS

### 4. Security
- Non-root containers
- Read-only root filesystems
- Pod security context
- Network policies ready
- Secret management for sensitive data

### 5. Observability
- Liveness and readiness probes
- Structured logging
- Health check endpoints
- Prometheus monitoring ready

### 6. Resource Management
- CPU and memory requests/limits
- Resource scaling based on metrics
- Persistent volumes for stateful data

## Configuration

### Override Values via Command Line

```bash
# Change replicas
--set client.replicaCount=5
--set server.replicaCount=10

# Change image tags
--set client.image.tag=v1.1.0-client
--set server.image.tag=v1.1.0-server

# Change domain
--set global.domain=your-domain.com
--set server.env.CORS_ORIGIN=https://your-domain.com

# Enable/disable components
--set client.enabled=true
--set server.enabled=true
--set redis.enabled=true
```

### Environment-Specific Values Files

Edit `values-production.yaml`, `values-development.yaml`, or `values-local.yaml` to customize:
- Resource limits
- Replica counts
- Autoscaling settings
- Persistence configuration
- Ingress settings
- SSL/TLS configuration

## Usage Examples

### Validate Chart Before Deploying

```bash
# Lint chart
helm lint ./helm/digital-muse

# Template validation
helm template digital-muse ./helm/digital-muse

# Run validation script
chmod +x ./helm/validate.sh
./helm/validate.sh
```

### Check Deployment Status

```bash
# Pod status
kubectl get pods -n digital-muse

# Service endpoints
kubectl get svc -n digital-muse

# Ingress status
kubectl get ingress -n digital-muse

# HPA status
kubectl get hpa -n digital-muse
```

### View Logs

```bash
# Real-time client logs
kubectl logs -f -n digital-muse -l app.kubernetes.io/name=client

# Server logs with tail
kubectl logs -n digital-muse -l app.kubernetes.io/name=server --tail=100

# Redis logs
kubectl logs -n digital-muse -l app.kubernetes.io/name=redis
```

### Scale Services

```bash
# Manual scaling
kubectl scale deployment/digital-muse-server --replicas=8 -n digital-muse

# HPA will adjust automatically based on metrics
kubectl get hpa -n digital-muse --watch
```

### Update to New Version

```bash
helm upgrade digital-muse ./helm/digital-muse \
  -n digital-muse \
  --set client.image.tag=v1.1.0-client \
  --set server.image.tag=v1.1.0-server
```

## Secrets Management

Two Kubernetes secrets are required:

1. **`digitalmuse-redis-url`** - Redis connection string
2. **`digitalmuse-session-secret`** - Session encryption key

### Create Secrets

```bash
# Option 1: kubectl
kubectl create secret generic digitalmuse-redis-url \
  --from-literal=redis-url="redis://digital-muse-redis:6379" \
  -n digital-muse

# Option 2: External secrets (recommended for production)
# Use AWS Secrets Manager, HashiCorp Vault, or similar
# Then reference with external-secrets operator
```

## Ingress Configuration

### With Nginx Ingress Controller

```bash
# The chart automatically creates Ingress resources when enabled
# Configure via values:
--set client.ingress.enabled=true
--set server.ingress.enabled=true
--set client.ingress.className=nginx
--set server.ingress.className=nginx
```

### With SSL/TLS (Cert-Manager)

```bash
# Annotations are already configured in the chart
# Just ensure cert-manager is installed:
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager \
  -n cert-manager --create-namespace

# Create ClusterIssuer
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@your-domain.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

## Troubleshooting

### Chart Validation

```bash
# Lint chart
helm lint ./helm/digital-muse

# Check rendered templates
helm template digital-muse ./helm/digital-muse | less

# Dry run before installing
helm install --dry-run --debug digital-muse ./helm/digital-muse
```

### Pod Issues

```bash
# Check events and status
kubectl describe pod <pod-name> -n digital-muse

# View container logs
kubectl logs <pod-name> -n digital-muse

# Check resource availability
kubectl describe nodes
```

### Service Issues

```bash
# Check service endpoints
kubectl get endpoints digital-muse-server -n digital-muse

# Test service connectivity
kubectl run -it --rm debug --image=busybox:1.28 --restart=Never -- \
  wget -qO- http://digital-muse-server:3000/api/health
```

## Files Reference

### Main Chart Files
- `Chart.yaml` - Chart metadata and dependencies
- `values.yaml` - Default configuration values
- `README.md` - Comprehensive documentation

### Templates
- `templates/namespace.yaml` - Kubernetes namespace creation
- `templates/secrets-example.yaml` - Example secret manifests

### Subcharts

**Client** (`charts/client/`)
- `deployment.yaml` - Nginx deployment
- `service.yaml` - Service for client
- `ingress.yaml` - Ingress for client
- `hpa.yaml` - Horizontal Pod Autoscaler
- `serviceaccount.yaml` - Service account
- `_helpers.tpl` - Template helpers

**Server** (`charts/server/`)
- `deployment.yaml` - Express.js deployment
- `service.yaml` - Service for API
- `ingress.yaml` - Ingress for API
- `hpa.yaml` - Horizontal Pod Autoscaler
- `serviceaccount.yaml` - Service account
- `_helpers.tpl` - Template helpers

**Redis** (`charts/redis/`)
- `deployment.yaml` - Redis deployment
- `service.yaml` - Service for Redis
- `pvc.yaml` - Persistent Volume Claim
- `_helpers.tpl` - Template helpers

### Configuration Files
- `values-production.yaml` - Production settings
- `values-development.yaml` - Development settings
- `values-local.yaml` - Local/Minikube settings

### Scripts
- `deploy.sh` - Interactive deployment helper
- `validate.sh` - Chart validation script

## Best Practices Implemented

✅ **Helm Best Practices**
- Semantic versioning
- Comprehensive values documentation
- Reusable templates and helpers
- Multiple environment support

✅ **Kubernetes Best Practices**
- Resource requests and limits
- Health checks (liveness/readiness)
- Security contexts
- Pod disruption budgets ready
- Network policies ready

✅ **Security**
- Non-root containers
- Read-only root filesystems
- Secret management
- RBAC ready

✅ **Scalability**
- Horizontal pod autoscaling
- Service discovery
- Load balancing
- Stateless design (server)

✅ **Reliability**
- Multiple replicas
- Persistent storage
- Health monitoring
- Graceful shutdown

## Related Documentation

- `KUBERNETES_DEPLOYMENT.md` - Comprehensive deployment guide
- `helm/digital-muse/README.md` - Detailed chart documentation
- `helm/README.md` - Quick reference guide
- [Official Helm Documentation](https://helm.sh/docs/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)

## Next Steps

1. **Review the charts** - Check `helm/digital-muse/README.md`
2. **Validate** - Run `./helm/validate.sh`
3. **Configure** - Edit environment values files
4. **Deploy** - Use `./helm/deploy.sh` or manual commands
5. **Monitor** - Watch pods and check logs
6. **Scale** - Adjust replicas as needed
7. **Update** - Use `helm upgrade` for new versions

## Support

For issues:
1. Check pod events: `kubectl describe pod`
2. View logs: `kubectl logs`
3. Validate chart: `helm lint`
4. Test templates: `helm template --debug`
5. Check Kubernetes version compatibility
6. Verify Helm version is 3.8+
