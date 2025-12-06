# Docker Hub Private Registry Authentication Setup

This guide explains how to configure Kubernetes to authenticate with Docker Hub for pulling private images.

## Overview

The Helm charts are now configured to use `imagePullSecrets` to authenticate with Docker Hub. This allows Kubernetes to pull images from your private Docker Hub repository (`docker.io/dotrollen/digitalmuse`).

## Prerequisites

- Access to your Kubernetes cluster
- Docker Hub account credentials (username and password/access token)
- `kubectl` configured to communicate with your cluster

## Quick Setup

### 1. Create the Docker Registry Secret

Use one of the following methods to create the secret in your Kubernetes cluster:

#### Method A: Using kubectl (Recommended)

```bash
kubectl create secret docker-registry dockerhub-secret \
  --docker-server=https://index.docker.io/v1/ \
  --docker-username=dotrollen \
  --docker-password=YOUR_DOCKERHUB_PASSWORD \
  --docker-email=YOUR_EMAIL \
  --namespace=default
```

**Replace:**
- `YOUR_DOCKERHUB_USERNAME` - Your Docker Hub username (e.g., `dotrollen`)
- `YOUR_DOCKERHUB_PASSWORD` - Your Docker Hub password or access token (recommended)
- `YOUR_EMAIL` - Your email address

**For different namespaces:**
```bash
# For development namespace
kubectl create secret docker-registry dockerhub-secret \
  --docker-server=https://index.docker.io/v1/ \
  --docker-username=YOUR_DOCKERHUB_USERNAME \
  --docker-password=YOUR_DOCKERHUB_PASSWORD \
  --docker-email=YOUR_EMAIL \
  --namespace=digital-muse-dev

# For production namespace
kubectl create secret docker-registry dockerhub-secret \
  --docker-server=https://index.docker.io/v1/ \
  --docker-username=YOUR_DOCKERHUB_USERNAME \
  --docker-password=YOUR_DOCKERHUB_PASSWORD \
  --docker-email=YOUR_EMAIL \
  --namespace=digital-muse-prod
```

#### Method B: Using Docker Hub Access Token (More Secure)

1. Generate an access token in Docker Hub:
   - Go to https://hub.docker.com/settings/security
   - Click "New Access Token"
   - Give it a descriptive name (e.g., "k8s-digitalmuse")
   - Select appropriate permissions (Read-only is sufficient for pulling)
   - Copy the generated token

2. Create the secret using the token:
```bash
kubectl create secret docker-registry dockerhub-secret \
  --docker-server=https://index.docker.io/v1/ \
  --docker-username=YOUR_DOCKERHUB_USERNAME \
  --docker-password=YOUR_ACCESS_TOKEN \
  --docker-email=YOUR_EMAIL \
  --namespace=default
```

#### Method C: Using a YAML Manifest

1. Create a base64-encoded auth string:
```bash
echo -n "YOUR_DOCKERHUB_USERNAME:YOUR_DOCKERHUB_PASSWORD" | base64
```

2. Create a file `dockerhub-secret.yaml`:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: dockerhub-secret
  namespace: default
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: BASE64_ENCODED_DOCKER_CONFIG
```

Where `BASE64_ENCODED_DOCKER_CONFIG` is:
```bash
echo -n '{"auths":{"https://index.docker.io/v1/":{"username":"YOUR_USERNAME","password":"YOUR_PASSWORD","email":"YOUR_EMAIL","auth":"BASE64_AUTH_STRING"}}}' | base64
```

3. Apply the manifest:
```bash
kubectl apply -f dockerhub-secret.yaml
```

### 2. Verify the Secret

```bash
# Check if secret exists
kubectl get secret dockerhub-secret --namespace=default

# View secret details (without exposing credentials)
kubectl describe secret dockerhub-secret --namespace=default
```

### 3. Deploy with Helm

Once the secret is created, deploy the Helm chart as usual:

```bash
# Development
helm install digital-muse ./digital-muse \
  -f helm/values-development.yaml \
  --namespace=digital-muse-dev \
  --create-namespace

# Production
helm install digital-muse ./digital-muse \
  -f helm/values-production.yaml \
  --namespace=digital-muse-prod \
  --create-namespace
```

## How It Works

The Helm charts have been updated with the following configuration:

### In Values Files
```yaml
client:
  image:
    repository: docker.io/dotrollen/digitalmuse
    tag: "v1.0.2-client"
  imagePullSecrets:
    - name: dockerhub-secret

server:
  image:
    repository: docker.io/dotrollen/digitalmuse
    tag: "v1.0.0-server"
  imagePullSecrets:
    - name: dockerhub-secret
```

### In Deployment Templates
The deployment templates already reference `imagePullSecrets` from values:
```yaml
spec:
  {{- with .Values.imagePullSecrets }}
  imagePullSecrets:
    {{- toYaml . | nindent 8 }}
  {{- end }}
```

## Troubleshooting

### ImagePullBackOff Error

If you see `ImagePullBackOff` or `ErrImagePull` errors:

1. Check if the secret exists in the correct namespace:
```bash
kubectl get secret dockerhub-secret -n YOUR_NAMESPACE
```

2. Verify the secret is correctly formatted:
```bash
kubectl get secret dockerhub-secret -n YOUR_NAMESPACE -o jsonpath='{.data.\.dockerconfigjson}' | base64 -d
```

3. Check pod events for more details:
```bash
kubectl describe pod POD_NAME -n YOUR_NAMESPACE
```

4. Verify Docker Hub credentials are correct:
```bash
docker login
# Enter your credentials
# If successful, credentials work
```

### Multiple Namespaces

If deploying to multiple namespaces, create the secret in each namespace:
```bash
for ns in digital-muse-dev digital-muse-staging digital-muse-prod; do
  kubectl create secret docker-registry dockerhub-secret \
    --docker-server=https://index.docker.io/v1/ \
    --docker-username=YOUR_USERNAME \
    --docker-password=YOUR_PASSWORD \
    --docker-email=YOUR_EMAIL \
    --namespace=$ns
done
```

### Updating Credentials

To update the secret with new credentials:
```bash
# Delete old secret
kubectl delete secret dockerhub-secret -n YOUR_NAMESPACE

# Create new secret
kubectl create secret docker-registry dockerhub-secret \
  --docker-server=https://index.docker.io/v1/ \
  --docker-username=YOUR_USERNAME \
  --docker-password=YOUR_NEW_PASSWORD \
  --docker-email=YOUR_EMAIL \
  --namespace=YOUR_NAMESPACE

# Restart deployments to use new secret
kubectl rollout restart deployment/digital-muse-client -n YOUR_NAMESPACE
kubectl rollout restart deployment/digital-muse-server -n YOUR_NAMESPACE
```

## Security Best Practices

1. **Use Access Tokens**: Instead of your Docker Hub password, use access tokens with minimal permissions
2. **Rotate Regularly**: Periodically rotate your access tokens
3. **Namespace Isolation**: Create separate secrets per namespace/environment
4. **RBAC**: Ensure only authorized service accounts can access the secrets
5. **Audit**: Monitor secret access using Kubernetes audit logs

## Alternative: Using a Service Account with ImagePullSecrets

You can also attach the imagePullSecret directly to a service account:

```bash
kubectl patch serviceaccount default \
  -p '{"imagePullSecrets": [{"name": "dockerhub-secret"}]}' \
  -n YOUR_NAMESPACE
```

This allows any pod using that service account to pull images without explicitly specifying `imagePullSecrets`.

## References

- [Kubernetes: Pull an Image from a Private Registry](https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/)
- [Docker Hub Access Tokens](https://docs.docker.com/docker-hub/access-tokens/)
- [Helm: Using imagePullSecrets](https://helm.sh/docs/howto/charts_tips_and_tricks/#using-the-tpl-function)
