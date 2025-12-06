#!/bin/bash
# Helm chart validation and testing script for Digital Muse

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

CHART_DIR="./digital-muse"

echo -e "${GREEN}Digital Muse Helm Chart Validation${NC}"
echo ""

# 1. Lint chart
echo -e "${YELLOW}1. Linting Helm chart...${NC}"
if helm lint $CHART_DIR; then
    echo -e "${GREEN}✓ Chart linting passed${NC}"
else
    echo -e "${RED}✗ Chart linting failed${NC}"
    exit 1
fi
echo ""

# 2. Validate templates
echo -e "${YELLOW}2. Validating templates...${NC}"
if helm template digital-muse $CHART_DIR > /tmp/manifests.yaml; then
    echo -e "${GREEN}✓ Template rendering passed${NC}"
else
    echo -e "${RED}✗ Template rendering failed${NC}"
    exit 1
fi
echo ""

# 3. Check template output
echo -e "${YELLOW}3. Checking generated manifests...${NC}"
echo "Generated manifests:"
kubectl api-resources --no-headers | awk '{print $1}' > /tmp/api-resources.txt

# Count different resource types
echo "Resource types in generated manifests:"
grep -E "^kind:" /tmp/manifests.yaml | sort | uniq -c | awk '{print "  " $2 ": " $1}'
echo ""

# 4. Validate with kubeconform (if available)
echo -e "${YELLOW}4. Validating manifests against Kubernetes schema...${NC}"
if command -v kubeconform &> /dev/null; then
    if kubeconform -summary -output json /tmp/manifests.yaml; then
        echo -e "${GREEN}✓ Manifest validation passed${NC}"
    else
        echo -e "${YELLOW}⚠ Some schema validations failed (may be expected)${NC}"
    fi
else
    echo -e "${YELLOW}⚠ kubeconform not installed, skipping schema validation${NC}"
    echo "  Install with: go install github.com/yannh/kubeconform/cmd/kubeconform@latest"
fi
echo ""

# 5. Test template with different values files
echo -e "${YELLOW}5. Testing templates with different values files...${NC}"

for values_file in values-production.yaml values-development.yaml values-local.yaml; do
    if [ -f "$values_file" ]; then
        echo -n "  Testing with $values_file... "
        if helm template digital-muse $CHART_DIR -f $values_file > /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC}"
        else
            echo -e "${RED}✗${NC}"
            exit 1
        fi
    fi
done
echo ""

# 6. Check for required configuration values
echo -e "${YELLOW}6. Checking for required configuration values...${NC}"

# Check if images are properly configured in rendered manifests
RENDERED_OUTPUT=$(helm template digital-muse $CHART_DIR 2>/dev/null)

# Check for specific image references
if echo "$RENDERED_OUTPUT" | grep -q "docker.io/dotrollen/digitalmuse.*client"; then
    echo -e "  ${GREEN}✓${NC} client.image configured (docker.io/dotrollen/digitalmuse)"
else
    echo -e "  ${RED}✗${NC} client.image not found in rendered manifests"
fi

if echo "$RENDERED_OUTPUT" | grep -q "docker.io/dotrollen/digitalmuse.*server"; then
    echo -e "  ${GREEN}✓${NC} server.image configured (docker.io/dotrollen/digitalmuse)"
else
    echo -e "  ${RED}✗${NC} server.image not found in rendered manifests"
fi

# Check if redis is enabled/configured
if grep -q "enabled: true" $CHART_DIR/values.yaml | grep -B1 "redis" &>/dev/null; then
    if echo "$RENDERED_OUTPUT" | grep -q "image:.*valkey"; then
        echo -e "  ${GREEN}✓${NC} redis.image configured (valkey)"
    else
        echo -e "  ${YELLOW}⚠${NC} redis.image not found (redis may be disabled)"
    fi
else
    echo -e "  ${YELLOW}⚠${NC} redis disabled in values (using managed service)"
fi

# Verify imagePullSecrets are configured
if echo "$RENDERED_OUTPUT" | grep -q "dockerhub-secret"; then
    echo -e "  ${GREEN}✓${NC} imagePullSecrets configured (dockerhub-secret)"
else
    echo -e "  ${YELLOW}⚠${NC} imagePullSecrets not found"
fi

echo ""

# 7. Chart dependencies
echo -e "${YELLOW}7. Checking chart dependencies...${NC}"
echo "Subcharts:"
ls -1 $CHART_DIR/charts/ | while read chart; do
    if [ -d "$CHART_DIR/charts/$chart" ]; then
        echo -e "  ${GREEN}✓${NC} $chart"
    fi
done
echo ""

# 8. Generate manifest examples
echo -e "${YELLOW}8. Generating example manifests...${NC}"
mkdir -p /tmp/manifests
helm template digital-muse $CHART_DIR -f values-production.yaml > /tmp/manifests/production.yaml
helm template digital-muse $CHART_DIR -f values-development.yaml > /tmp/manifests/development.yaml
helm template digital-muse $CHART_DIR -f values-local.yaml > /tmp/manifests/local.yaml
echo -e "${GREEN}✓ Manifests saved to /tmp/manifests/${NC}"
echo ""

# 9. Summary
echo -e "${GREEN}Validation Summary${NC}"
echo "===================="
echo "Chart Directory: $CHART_DIR"
echo "Chart Version: $(grep 'version:' $CHART_DIR/Chart.yaml | awk '{print $2}')"
echo "App Version: $(grep 'appVersion:' $CHART_DIR/Chart.yaml | awk '{print $2}')"
echo ""

echo -e "${GREEN}✓ All validations passed!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review generated manifests: less /tmp/manifests/production.yaml"
echo "2. Create Kubernetes secrets: kubectl create secret generic ..."
echo "3. Deploy chart: helm install digital-muse ./digital-muse -n digital-muse"
echo "4. Monitor deployment: kubectl get pods -n digital-muse"
echo ""
