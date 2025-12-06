#!/bin/bash
# Quick deployment script for Digital Muse Helm chart

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Digital Muse Helm Chart Deployment${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Error: kubectl not found${NC}"
    exit 1
fi

if ! command -v helm &> /dev/null; then
    echo -e "${RED}Error: helm not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ kubectl and helm found${NC}"
echo ""

# Get configuration
read -p "Enter namespace (default: digital-muse): " NAMESPACE
NAMESPACE=${NAMESPACE:-digital-muse}

read -p "Enter domain (e.g., your-domain.com): " DOMAIN
read -p "Enter API domain (e.g., api.your-domain.com): " API_DOMAIN
read -p "Enter Redis URL (default: redis://digital-muse-redis:6379): " REDIS_URL
REDIS_URL=${REDIS_URL:-redis://digital-muse-redis:6379}

# Generate session secret
SESSION_SECRET=$(openssl rand -base64 32)

echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo "  Namespace: $NAMESPACE"
echo "  Domain: $DOMAIN"
echo "  API Domain: $API_DOMAIN"
echo "  Redis URL: $REDIS_URL"
echo ""

# Create namespace
echo -e "${YELLOW}Creating namespace...${NC}"
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
echo -e "${GREEN}✓ Namespace created${NC}"
echo ""

# Create secrets
echo -e "${YELLOW}Creating secrets...${NC}"
kubectl create secret generic digitalmuse-redis-url \
  --from-literal=redis-url="$REDIS_URL" \
  -n $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic digitalmuse-session-secret \
  --from-literal=session-secret="$SESSION_SECRET" \
  -n $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

echo -e "${GREEN}✓ Secrets created${NC}"
echo ""

# Create values override file
VALUES_FILE="/tmp/digital-muse-values.yaml"
cat > $VALUES_FILE << EOF
global:
  domain: "$DOMAIN"
  apiUrl: "https://$API_DOMAIN"

client:
  ingress:
    hosts:
      - host: "$DOMAIN"
        paths:
          - path: /
            pathType: Prefix
    tls:
      - secretName: "$DOMAIN-tls"
        hosts:
          - "$DOMAIN"

server:
  env:
    CORS_ORIGIN: "https://$DOMAIN"
  ingress:
    hosts:
      - host: "$API_DOMAIN"
        paths:
          - path: /
            pathType: Prefix
    tls:
      - secretName: "$API_DOMAIN-tls"
        hosts:
          - "$API_DOMAIN"
EOF

# Install/upgrade chart
echo -e "${YELLOW}Installing/upgrading Helm chart...${NC}"
helm upgrade --install digital-muse ./digital-muse \
  -f $VALUES_FILE \
  -n $NAMESPACE

echo ""
echo -e "${GREEN}✓ Deployment complete!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Wait for pods to be ready: kubectl get pods -n $NAMESPACE"
echo "  2. Check ingress: kubectl get ingress -n $NAMESPACE"
echo "  3. Configure your DNS to point to the ingress IP"
echo "  4. View logs: kubectl logs -n $NAMESPACE -l app.kubernetes.io/name=server"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "  # Port forward client"
echo "  kubectl port-forward -n $NAMESPACE svc/digital-muse-client 8080:80"
echo ""
echo "  # Port forward server"
echo "  kubectl port-forward -n $NAMESPACE svc/digital-muse-server 3000:3000"
echo ""
echo "  # View deployment status"
echo "  kubectl rollout status deployment/digital-muse-client -n $NAMESPACE"
echo "  kubectl rollout status deployment/digital-muse-server -n $NAMESPACE"
echo ""
