# Helm Chart Structure for Digital Muse

This directory contains a complete Helm chart for deploying Digital Muse to Kubernetes.

## Chart Structure

```
digital-muse/
├── Chart.yaml                 # Main chart metadata
├── values.yaml               # Default values for the parent chart
├── templates/
│   ├── namespace.yaml        # Kubernetes namespace
│   └── secrets-example.yaml  # Example secrets
└── charts/
    ├── client/               # Client service subchart
    │   ├── Chart.yaml
    │   ├── values.yaml
    │   └── templates/
    │       ├── deployment.yaml
    │       ├── service.yaml
    │       ├── ingress.yaml
    │       ├── hpa.yaml
    │       ├── serviceaccount.yaml
    │       └── _helpers.tpl
    ├── server/               # Server service subchart
    │   ├── Chart.yaml
    │   ├── values.yaml
    │   └── templates/
    │       ├── deployment.yaml
    │       ├── service.yaml
    │       ├── ingress.yaml
    │       ├── hpa.yaml
    │       ├── serviceaccount.yaml
    │       └── _helpers.tpl
    └── redis/                # Redis database subchart
        ├── Chart.yaml
        ├── values.yaml
        └── templates/
            ├── deployment.yaml
            ├── service.yaml
            ├── pvc.yaml
            └── _helpers.tpl
```

## Prerequisites

1. **Kubernetes Cluster**: 1.24+
2. **Helm**: 3.8+
3. **Ingress Controller**: Nginx (or configure for your controller)
4. **Cert Manager**: For automatic SSL certificates (optional)

## Installation

### 1. Create Namespace and Secrets

```bash
# Create namespace
kubectl create namespace digital-muse

# Create secrets (change the values!)
kubectl create secret generic digitalmuse-redis-url \
  --from-literal=redis-url="redis://digital-muse-redis:6379" \
  -n digital-muse

kubectl create secret generic digitalmuse-session-secret \
  --from-literal=session-secret="$(openssl rand -base64 32)" \
  -n digital-muse
```

### 2. Configure Values

Edit `values.yaml` to match your environment:

```yaml
global:
  domain: "your-domain.com"
  apiUrl: "https://api.your-domain.com"

client:
  image:
    tag: "v1.0.3-client"
  ingress:
    hosts:
      - host: "your-domain.com"

server:
  image:
    tag: "v1.0.0-server"
  env:
    CORS_ORIGIN: "https://your-domain.com"
  ingress:
    hosts:
      - host: "api.your-domain.com"
```

### 3. Deploy the Chart

```bash
# Install the chart
helm install digital-muse ./digital-muse \
  -n digital-muse

# Or upgrade if already installed
helm upgrade digital-muse ./digital-muse \
  -n digital-muse
```

### 4. Verify Deployment

```bash
# Check pods
kubectl get pods -n digital-muse

# Check services
kubectl get svc -n digital-muse

# Check ingress
kubectl get ingress -n digital-muse

# View logs
kubectl logs -n digital-muse -l app.kubernetes.io/name=server --tail=100
```

## Configuration

### Client Configuration

The client is deployed as a static Nginx server. Key settings:

- **replicas**: Number of instances (default: 2)
- **autoscaling**: Enable HPA with min/max replicas
- **ingress**: Configure domain and TLS
- **resources**: CPU/memory limits and requests

### Server Configuration

The server is an Express.js application. Key settings:

- **replicas**: Number of instances (default: 2)
- **env**: Environment variables (NODE_ENV, PORT, CORS_ORIGIN)
- **secrets**: Reference to REDIS_URL and SESSION_SECRET
- **autoscaling**: HPA with higher max replicas
- **ingress**: API domain configuration

### Redis Configuration

Redis provides session storage. Key settings:

- **persistence**: Enable PVC for data durability
- **size**: PVC size (default: 5Gi)
- **resources**: CPU/memory limits
- **config**: Redis settings (save policy, maxmemory)

## Customization

### Use different image registry

```bash
helm install digital-muse ./digital-muse \
  --set client.image.repository=your-registry.io/digitalmuse-client \
  --set server.image.repository=your-registry.io/digitalmuse-server \
  --set redis.image.repository=your-registry.io/redis \
  -n digital-muse
```

### Change replicas

```bash
helm install digital-muse ./digital-muse \
  --set client.replicaCount=3 \
  --set server.replicaCount=5 \
  -n digital-muse
```

### Disable autoscaling

```bash
helm install digital-muse ./digital-muse \
  --set client.autoscaling.enabled=false \
  --set server.autoscaling.enabled=false \
  -n digital-muse
```

### Use different ingress class

```bash
helm install digital-muse ./digital-muse \
  --set client.ingress.className=traefik \
  --set server.ingress.className=traefik \
  -n digital-muse
```

## Upgrades

To update the chart:

```bash
# Pull latest images
docker pull docker.io/dotrollen/digitalmuse:v1.1.0-client
docker pull docker.io/dotrollen/digitalmuse:v1.1.0-server

# Update values
helm upgrade digital-muse ./digital-muse \
  --set client.image.tag=v1.1.0-client \
  --set server.image.tag=v1.1.0-server \
  -n digital-muse
```

## Scaling

The chart includes HorizontalPodAutoscaler for automatic scaling:

**Client**: Scales 2-5 replicas based on CPU (80%) and memory (80%)
**Server**: Scales 2-10 replicas based on CPU (70%) and memory (80%)

To disable or adjust:

```bash
helm upgrade digital-muse ./digital-muse \
  --set client.autoscaling.maxReplicas=10 \
  --set server.autoscaling.maxReplicas=20 \
  -n digital-muse
```

## Monitoring

Add monitoring with Prometheus:

```bash
# Install Prometheus Operator (if not already installed)
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack

# Update values to enable monitoring
helm upgrade digital-muse ./digital-muse \
  --set monitoring.enabled=true \
  -n digital-muse
```

## Troubleshooting

### Pods not starting

```bash
# Check pod events
kubectl describe pod <pod-name> -n digital-muse

# Check logs
kubectl logs <pod-name> -n digital-muse
```

### CORS errors

Verify `CORS_ORIGIN` matches client domain:
```bash
kubectl get secret digitalmuse-session-secret -n digital-muse -o yaml
```

### Redis connection failed

Check Redis service:
```bash
kubectl get svc digital-muse-redis -n digital-muse
kubectl logs -l app.kubernetes.io/name=redis -n digital-muse
```

### Ingress not working

```bash
# Check ingress status
kubectl get ingress -n digital-muse
kubectl describe ingress -n digital-muse

# Check cert-manager if using HTTPS
kubectl get certificates -n digital-muse
```

## Cleanup

To remove the deployment:

```bash
helm uninstall digital-muse -n digital-muse
kubectl delete namespace digital-muse
```

## Testing

### Local testing with Minikube

```bash
minikube start
helm install digital-muse ./digital-muse -n digital-muse
minikube service digital-muse-client -n digital-muse
```

### Using port-forward

```bash
# Forward client
kubectl port-forward -n digital-muse svc/digital-muse-client 8080:80

# Forward server
kubectl port-forward -n digital-muse svc/digital-muse-server 3000:3000

# Visit http://localhost:8080
```

## License

Same as Digital Muse project
