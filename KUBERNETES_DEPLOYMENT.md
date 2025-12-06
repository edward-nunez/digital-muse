# Kubernetes Helm Deployment Guide for Digital Muse

## Overview

This guide covers deploying Digital Muse to Kubernetes using Helm charts. The deployment includes:

- **Client** (Nginx serving static Phaser game)
- **Server** (Express.js API and WebSocket)
- **Redis** (Session and data storage)

## Quick Start

### 1. Prerequisites

```bash
# Install kubectl
# https://kubernetes.io/docs/tasks/tools/

# Install Helm
# https://helm.sh/docs/intro/install/

# Verify installations
kubectl version --client
helm version
```

### 2. Prepare Your Cluster

```bash
# Create namespace
kubectl create namespace digital-muse

# Create secrets (change these!)
kubectl create secret generic digitalmuse-redis-url \
  --from-literal=redis-url="redis://digital-muse-redis:6379" \
  -n digital-muse

kubectl create secret generic digitalmuse-session-secret \
  --from-literal=session-secret="$(openssl rand -base64 32)" \
  -n digital-muse

# Verify secrets
kubectl get secrets -n digital-muse
```

### 3. Deploy with Helm

```bash
# Navigate to helm directory
cd helm

# Install chart
helm install digital-muse ./digital-muse \
  --namespace digital-muse

# Verify deployment
helm list -n digital-muse
```

## Environment-Specific Deployments

### Production Deployment

```bash
cd helm

# Install with production values
helm install digital-muse ./digital-muse \
  --namespace digital-muse \
  --values values-production.yaml \
  --set global.domain=your-domain.com \
  --set global.apiUrl=https://api.your-domain.com

# Monitor rollout
kubectl rollout status deployment/digital-muse-client -n digital-muse
kubectl rollout status deployment/digital-muse-server -n digital-muse
```

### Development Deployment

```bash
cd helm

# Install with development values
helm install digital-muse ./digital-muse \
  --namespace digital-muse \
  --values values-development.yaml \
  --set global.domain=dev.your-domain.com \
  --set global.apiUrl=https://api-dev.your-domain.com
```

### Local Testing (Minikube / Docker Desktop)

```bash
cd helm

# Install with local values
helm install digital-muse ./digital-muse \
  --namespace digital-muse \
  --values values-local.yaml

# Port forward to test
kubectl port-forward -n digital-muse svc/digital-muse-client 8080:80 &
kubectl port-forward -n digital-muse svc/digital-muse-server 3000:3000 &

# Visit http://localhost:8080
```

## Customization

### Change Image Tags

```bash
helm upgrade digital-muse ./digital-muse \
  --namespace digital-muse \
  --set client.image.tag=v1.1.0-client \
  --set server.image.tag=v1.1.0-server
```

### Change Replica Counts

```bash
helm upgrade digital-muse ./digital-muse \
  --namespace digital-muse \
  --set client.replicaCount=5 \
  --set server.replicaCount=10 \
  --set redis.replicaCount=1
```

### Use Custom Registry

```bash
helm install digital-muse ./digital-muse \
  --namespace digital-muse \
  --set client.image.repository=your-registry.io/digitalmuse-client \
  --set server.image.repository=your-registry.io/digitalmuse-server
```

### Enable Autoscaling

```bash
helm upgrade digital-muse ./digital-muse \
  --namespace digital-muse \
  --set client.autoscaling.enabled=true \
  --set server.autoscaling.enabled=true
```

## Ingress Configuration

### Using Nginx Ingress

```bash
# Install Nginx Ingress Controller (if not present)
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx

# Deploy with ingress enabled
helm install digital-muse ./digital-muse \
  --namespace digital-muse \
  --set client.ingress.enabled=true \
  --set server.ingress.enabled=true
```

### Using Traefik Ingress

```bash
# Update ingress class name
helm install digital-muse ./digital-muse \
  --namespace digital-muse \
  --set client.ingress.className=traefik \
  --set server.ingress.className=traefik
```

### Using AWS ALB Ingress

```bash
# Install AWS Load Balancer Controller
helm repo add eks https://aws.github.io/eks-charts
helm install aws-load-balancer-controller eks/aws-load-balancer-controller

# Deploy with ALB annotations
helm install digital-muse ./digital-muse \
  --namespace digital-muse \
  --set client.ingress.className=alb \
  --set server.ingress.className=alb
```

## SSL/TLS Configuration

### Using Cert-Manager with Let's Encrypt

```bash
# Install cert-manager
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager --create-namespace

# Create ClusterIssuer for Let's Encrypt
cat <<EOF | kubectl apply -f -
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

# Deploy with TLS
helm install digital-muse ./digital-muse \
  --namespace digital-muse \
  --set client.ingress.enabled=true \
  --set client.ingress.tls[0].secretName=your-domain-tls \
  --set client.ingress.tls[0].hosts[0]=your-domain.com \
  --set server.ingress.enabled=true \
  --set server.ingress.tls[0].secretName=api-domain-tls \
  --set server.ingress.tls[0].hosts[0]=api.your-domain.com
```

## Monitoring and Logging

### Enable Prometheus Monitoring

```bash
# Install Prometheus Operator
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack

# Deploy with monitoring enabled
helm upgrade digital-muse ./digital-muse \
  --namespace digital-muse \
  --set monitoring.enabled=true \
  --set monitoring.prometheus.enabled=true
```

### View Logs

```bash
# Client logs
kubectl logs -n digital-muse -l app.kubernetes.io/name=client --tail=100

# Server logs
kubectl logs -n digital-muse -l app.kubernetes.io/name=server --tail=100

# Redis logs
kubectl logs -n digital-muse -l app.kubernetes.io/name=redis --tail=100

# Follow logs in real-time
kubectl logs -n digital-muse -f -l app.kubernetes.io/name=server
```

## Storage

### Persistent Volume for Redis

By default, Redis uses a PersistentVolumeClaim (PVC) to store data. Configure it:

```bash
helm upgrade digital-muse ./digital-muse \
  --namespace digital-muse \
  --set redis.persistence.enabled=true \
  --set redis.persistence.size=10Gi \
  --set redis.persistence.storageClassName=standard
```

### Backup Redis Data

```bash
# Create a manual backup
kubectl exec -n digital-muse -it digital-muse-redis -- redis-cli SAVE

# Export data
kubectl cp digital-muse/digital-muse-redis:/data/dump.rdb ./redis-backup.rdb
```

## Scaling

### Horizontal Pod Autoscaling

The chart includes HPA configuration. To adjust:

```bash
helm upgrade digital-muse ./digital-muse \
  --namespace digital-muse \
  --set client.autoscaling.minReplicas=2 \
  --set client.autoscaling.maxReplicas=10 \
  --set server.autoscaling.minReplicas=3 \
  --set server.autoscaling.maxReplicas=20
```

### Manual Scaling

```bash
# Scale client to 5 replicas
kubectl scale deployment/digital-muse-client --replicas=5 -n digital-muse

# Scale server to 10 replicas
kubectl scale deployment/digital-muse-server --replicas=10 -n digital-muse
```

## Troubleshooting

### Check Deployment Status

```bash
# Pod status
kubectl get pods -n digital-muse

# Deployment status
kubectl get deployments -n digital-muse

# Service status
kubectl get svc -n digital-muse

# Ingress status
kubectl get ingress -n digital-muse
```

### Debug a Pod

```bash
# Describe pod for events
kubectl describe pod <pod-name> -n digital-muse

# Execute command in pod
kubectl exec -it <pod-name> -n digital-muse -- /bin/sh

# Copy file from pod
kubectl cp digital-muse/<pod-name>:/path/to/file ./local-file
```

### Common Issues

**Pods stuck in Pending**
```bash
# Check cluster resources
kubectl describe nodes

# Check PVC status
kubectl get pvc -n digital-muse
```

**CORS errors**
```bash
# Verify CORS_ORIGIN setting
kubectl get deployment digital-muse-server -n digital-muse -o yaml | grep CORS_ORIGIN
```

**Redis connection failed**
```bash
# Test Redis connection
kubectl exec -n digital-muse digital-muse-redis -- redis-cli ping

# Check Redis service
kubectl get svc digital-muse-redis -n digital-muse
```

## Updates and Rollbacks

### Update to New Version

```bash
# Pull new images
docker pull docker.io/dotrollen/digitalmuse:v1.1.0-client
docker pull docker.io/dotrollen/digitalmuse:v1.1.0-server

# Upgrade release
helm upgrade digital-muse ./digital-muse \
  --namespace digital-muse \
  --set client.image.tag=v1.1.0-client \
  --set server.image.tag=v1.1.0-server

# Wait for rollout
kubectl rollout status deployment/digital-muse-client -n digital-muse
kubectl rollout status deployment/digital-muse-server -n digital-muse
```

### Rollback to Previous Version

```bash
# List release history
helm history digital-muse -n digital-muse

# Rollback to previous release
helm rollback digital-muse -n digital-muse
```

## Cleanup

### Remove Deployment

```bash
# Uninstall Helm chart
helm uninstall digital-muse -n digital-muse

# Delete namespace
kubectl delete namespace digital-muse
```

## Best Practices

1. **Use separate namespaces** for different environments
2. **Enable pod autoscaling** for production
3. **Use persistent volumes** for Redis in production
4. **Configure resource requests/limits** appropriately
5. **Enable network policies** to restrict traffic
6. **Use secrets** for sensitive data (not ConfigMaps)
7. **Monitor with Prometheus** and visualize with Grafana
8. **Implement health checks** (liveness and readiness probes)
9. **Set up proper logging** (e.g., with Fluentd/ELK)
10. **Regular backup** of Redis persistent data

## Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Helm Documentation](https://helm.sh/docs/)
- [Nginx Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [Cert-Manager Documentation](https://cert-manager.io/docs/)
- [Prometheus Operator](https://github.com/prometheus-operator/prometheus-operator)

## Support

For issues with the Helm chart, check:
1. Kubernetes events: `kubectl describe pod <name> -n digital-muse`
2. Pod logs: `kubectl logs <name> -n digital-muse`
3. Helm release status: `helm status digital-muse -n digital-muse`
