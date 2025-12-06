# Digital Muse Helm Charts

Complete Kubernetes Helm charts for deploying Digital Muse with client, server, and Redis services.

## Quick Start

### Prerequisites

```bash
kubectl version --client  # 1.24+
helm version             # 3.8+
```

### Valkey Setup (Digital Ocean)

1. **Get your Valkey connection string from Digital Ocean:**
   - Go to Digital Ocean Dashboard > Databases > Your Valkey cluster
   - Copy the connection string from Connection Details
   - Format: `valkey://:password@hostname:25061`

2. **Create the Valkey URL secret:**

```bash
kubectl create namespace digital-muse

# Replace with your actual Digital Ocean Valkey connection string
kubectl create secret generic digitalmuse-redis-url \
  --from-literal=redis-url="rediss://default:your-password@your-hostname:25061" \
  -n digital-muse

kubectl create secret generic digitalmuse-session-secret \
  --from-literal=session-secret="$(openssl rand -base64 32)" \
  -n digital-muse
```

### Deploy

```bash
# Production
helm install digital-muse ./digital-muse \
  -n digital-muse \
  -f values-production.yaml

# Development
helm install digital-muse ./digital-muse \
  -n digital-muse \
  -f values-development.yaml

# Local (Minikube/Docker Desktop)
helm install digital-muse ./digital-muse \
  -n digital-muse \
  -f values-local.yaml
```

## Directory Structure

```
helm/
├── README.md                      # This file
├── deploy.sh                      # Interactive deployment script
├── values-production.yaml         # Production configuration
├── values-development.yaml        # Development configuration
├── values-local.yaml              # Local/Minikube configuration
└── digital-muse/
    ├── Chart.yaml                 # Parent chart
    ├── values.yaml                # Default values
    ├── README.md                  # Detailed documentation
    ├── templates/
    │   ├── namespace.yaml
    │   └── secrets-example.yaml
    └── charts/
        ├── client/                # Nginx static server
        ├── server/                # Express API server
        └── redis/                 # Redis session store
```

## Components

### Client (`charts/client`)
- **Image**: `docker.io/dotrollen/digitalmuse:v1.0.2-client`
- **Purpose**: Serves static Phaser game UI via Nginx
- **Scaling**: 2-5 replicas (default: 2)
- **Service**: LoadBalancer (default), can be NodePort
- **Health Check**: `/health` endpoint

### Server (`charts/server`)
- **Image**: `docker.io/dotrollen/digitalmuse:v1.0.0-server`
- **Purpose**: Express.js API and WebSocket server
- **Scaling**: 2-10 replicas (default: 2)
- **Service**: ClusterIP (internal only)
- **Health Check**: `/api/health` endpoint
- **Secrets**: REDIS_URL, SESSION_SECRET

### Redis (`charts/redis`) - Valkey Configuration
- **Type**: Digital Ocean Managed Valkey Service (external)
- **Purpose**: Session storage and data persistence
- **Status**: Local Redis deployment is disabled by default
- **Configuration**: Connection via REDIS_URL secret pointing to Digital Ocean Valkey endpoint
- **Default Port**: 25061 (Digital Ocean Valkey default)

## Usage Examples

### Local Testing with Port Forwarding

```bash
# Terminal 1: Port forward client
kubectl port-forward -n digital-muse svc/digital-muse-client 8080:80

# Terminal 2: Port forward server
kubectl port-forward -n digital-muse svc/digital-muse-server 3000:3000

# Visit http://localhost:8080
```

### Check Deployment Status

```bash
# Pods
kubectl get pods -n digital-muse

# Services
kubectl get svc -n digital-muse

# Ingress
kubectl get ingress -n digital-muse

# HPA status
kubectl get hpa -n digital-muse
```

### View Logs

```bash
# Client logs
kubectl logs -n digital-muse -l app.kubernetes.io/name=client

# Server logs (follow)
kubectl logs -n digital-muse -l app.kubernetes.io/name=server -f

# Redis logs
kubectl logs -n digital-muse -l app.kubernetes.io/name=redis
```

### Scale Manually

```bash
# Horizontal scaling
kubectl scale deployment/digital-muse-server --replicas=5 -n digital-muse

# Or use HPA (if enabled)
# HPA will automatically scale between min/max replicas
```

### Update to New Version

```bash
helm upgrade digital-muse ./digital-muse \
  -n digital-muse \
  --set client.image.tag=v1.0.2-client \
  --set server.image.tag=v1.0.1-server
  -f values-development.yaml
```

### Rollback to Previous Version

```bash
helm rollback digital-muse -n digital-muse
```

## Configuration

### Environment-Specific Values Files

- **`values-production.yaml`**: 3 replicas, autoscaling enabled, full resources
- **`values-development.yaml`**: 1 replica, autoscaling disabled, staging cert
- **`values-local.yaml`**: 1 replica, no persistence, NodePort services

### Customize Via Command Line

```bash
helm install digital-muse ./digital-muse \
  -n digital-muse \
  --set global.domain=your-domain.com \
  --set global.apiUrl=https://api.your-domain.com \
  --set client.replicaCount=3 \
  --set server.replicaCount=5 \
  --set client.autoscaling.enabled=true
```

## Ingress Configuration

### Nginx Ingress Controller

```bash
# Install Nginx Ingress (if needed)
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx

# Enable ingress in chart
helm upgrade digital-muse ./digital-muse \
  -n digital-muse \
  --set client.ingress.enabled=true \
  --set server.ingress.enabled=true
```

### SSL/TLS with Cert-Manager

```bash
# Install cert-manager (if needed)
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

# Enable TLS in chart
helm update digital-muse ./digital-muse \
  -n digital-muse \
  --set client.ingress.tls[0].secretName=your-domain-tls
```

## Secrets Management

The chart expects two Kubernetes secrets to be pre-created:

1. **`digitalmuse-redis-url`**
   - Key: `redis-url`
   - Value: Redis connection string (e.g., `redis://host:6379`)

2. **`digitalmuse-session-secret`**
   - Key: `session-secret`
   - Value: Secure random string (32+ bytes)

### Create Secrets

```bash
# Using kubectl
kubectl create secret generic digitalmuse-redis-url \
  --from-literal=redis-url="redis://digital-muse-redis:6379" \
  -n digital-muse

kubectl create secret generic digitalmuse-session-secret \
  --from-literal=session-secret="$(openssl rand -base64 32)" \
  -n digital-muse

# Or using external secret management (recommended for production)
# AWS Secrets Manager, HashiCorp Vault, etc.
```

## Monitoring

### Enable Prometheus

```bash
# Install Prometheus Operator (if needed)
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack

# Enable in chart
helm upgrade digital-muse ./digital-muse \
  -n digital-muse \
  --set monitoring.enabled=true
```

## Persistence

### Redis Data Backup

```bash
# Create backup
kubectl exec -n digital-muse digital-muse-redis -- redis-cli SAVE

# Export backup file
kubectl cp digital-muse/digital-muse-redis:/data/dump.rdb ./backup.rdb

# Restore from backup
kubectl cp ./backup.rdb digital-muse/digital-muse-redis:/data/dump.rdb
kubectl exec -n digital-muse digital-muse-redis -- redis-cli SHUTDOWN
```

## Troubleshooting

### Pods Not Starting

```bash
# Check events
kubectl describe pod <pod-name> -n digital-muse

# Check logs
kubectl logs <pod-name> -n digital-muse

# Check resource availability
kubectl describe nodes
```

### CORS Errors

Verify `CORS_ORIGIN` environment variable on server matches client domain:

```bash
kubectl get deployment digital-muse-server -n digital-muse -o yaml | grep CORS
```

### Redis Connection Issues

```bash
# Test Redis connectivity
kubectl exec -n digital-muse digital-muse-redis -- redis-cli ping

# Check Redis service
kubectl get svc digital-muse-redis -n digital-muse
```

### Ingress Not Working

```bash
# Check ingress status
kubectl get ingress -n digital-muse
kubectl describe ingress -n digital-muse

# Check certificate status
kubectl get certificate -n digital-muse
```

## Best Practices

1. **Use separate namespaces** for different environments
2. **Enable HPA** for production deployments
3. **Use persistent volumes** for Redis in production
4. **Configure resource requests/limits** for all containers
5. **Use secrets** for sensitive data
6. **Enable network policies** to restrict traffic
7. **Implement proper logging** and monitoring
8. **Regular backup** of Redis data
9. **Use private registries** for images
10. **Follow GitOps** practices with Helm

## Related Documentation

- [KUBERNETES_DEPLOYMENT.md](../KUBERNETES_DEPLOYMENT.md) - Comprehensive deployment guide
- [digital-muse/README.md](./digital-muse/README.md) - Chart-specific documentation
- [Helm Documentation](https://helm.sh/docs/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)

## License

Same as Digital Muse project - Apache License 2.0
