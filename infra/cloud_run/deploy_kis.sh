#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  Medion KIS — Cloud Run deployment (re-deploy after code changes)
#  For first-time project setup run scripts/setup_gcp.sh instead.
#
#  Usage:
#    ./infra/cloud_run/deploy_kis.sh                  # build + deploy all
#    ./infra/cloud_run/deploy_kis.sh --backend-only   # only backend
#    ./infra/cloud_run/deploy_kis.sh --frontend-only  # only nginx frontend
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

if [ -f .env ]; then
  set -a
  source <(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' .env)
  set +a
fi

PROJECT="${GCP_PROJECT_ID:?Set GCP_PROJECT_ID in .env}"
REGION="${GCP_REGION:-europe-west1}"
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT}/kis-docker"
OS_PASSWORD="${OPENSEARCH_ADMIN_PASSWORD:-Medion!KIS2026}"
OS_INDEX="${OPENSEARCH_INDEX:-viaticum-transcripts}"

BOLD='\033[1m'; GREEN='\033[32m'; CYAN='\033[36m'; RESET='\033[0m'
step() { printf "\n${BOLD}${CYAN}▶ %s${RESET}\n" "$*"; }
ok()   { printf "${GREEN}  ✓ %s${RESET}\n" "$*"; }

DEPLOY_BACKEND=true
DEPLOY_FRONTEND=true
for arg in "$@"; do
  case $arg in
    --backend-only)  DEPLOY_FRONTEND=false ;;
    --frontend-only) DEPLOY_BACKEND=false  ;;
  esac
done

gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

# ── Backend ────────────────────────────────────────────────────────────────────
if $DEPLOY_BACKEND; then
  step "Building & pushing backend"
  docker build -t "${REGISTRY}/kis-backend:latest" -f Dockerfile.backend .
  docker push "${REGISTRY}/kis-backend:latest"

  # Resolve OpenSearch internal IP
  OS_ZONE="${REGION}-b"
  OS_IP=$(gcloud compute instances describe kis-opensearch \
    --zone="$OS_ZONE" --format="value(networkInterfaces[0].networkIP)" 2>/dev/null || echo "")
  if [ -z "$OS_IP" ]; then
    printf "  WARNING: kis-opensearch GCE instance not found — falling back to OPENSEARCH_URL env\n"
    OS_IP="${OPENSEARCH_HOST:-localhost}"
  fi

  gcloud run deploy kis-backend \
    --image="${REGISTRY}/kis-backend:latest" \
    --region="$REGION" \
    --platform=managed \
    --allow-unauthenticated \
    --memory=2Gi --cpu=2 \
    --min-instances=0 --max-instances=3 \
    --timeout=120 \
    --set-env-vars="VECTOR_STORE=opensearch,\
OPENSEARCH_URL=https://${OS_IP}:9200,\
OPENSEARCH_USER=admin,\
OPENSEARCH_INDEX=${OS_INDEX},\
STT_PROVIDER=${STT_PROVIDER:-stub},\
PIONEER_SOAP_MODEL_ID=${PIONEER_SOAP_MODEL_ID:-},\
PIONEER_NER_MODEL_ID=${PIONEER_NER_MODEL_ID:-}" \
    --set-secrets="OPENSEARCH_PASSWORD=kis-opensearch-password:latest,\
PIONEER_API_KEY=kis-pioneer-api-key:latest"

  BACKEND_URL=$(gcloud run services describe kis-backend \
    --region="$REGION" --format="value(status.url)")
  ok "Backend: $BACKEND_URL"
fi

# ── Frontend ───────────────────────────────────────────────────────────────────
if $DEPLOY_FRONTEND; then
  step "Building & pushing frontend"
  docker build -t "${REGISTRY}/kis-frontend:latest" -f Dockerfile.frontend_react .
  docker push "${REGISTRY}/kis-frontend:latest"

  if [ -z "${BACKEND_URL:-}" ]; then
    BACKEND_URL=$(gcloud run services describe kis-backend \
      --region="$REGION" --format="value(status.url)" 2>/dev/null || echo "")
  fi

  gcloud run deploy kis-frontend \
    --image="${REGISTRY}/kis-frontend:latest" \
    --region="$REGION" \
    --platform=managed \
    --allow-unauthenticated \
    --memory=256Mi --cpu=1 \
    --min-instances=0 --max-instances=5 \
    --set-env-vars="BACKEND_URL=${BACKEND_URL}"

  FRONTEND_URL=$(gcloud run services describe kis-frontend \
    --region="$REGION" --format="value(status.url)")
  ok "Frontend: $FRONTEND_URL"
fi

# ── Seed patient data ──────────────────────────────────────────────────────────
if $DEPLOY_BACKEND && [ -f scripts/seed_opensearch.py ]; then
  step "Seeding patient data"
  BACKEND_URL="${BACKEND_URL}" python3 scripts/seed_opensearch.py
fi

# ── Summary ────────────────────────────────────────────────────────────────────
FRONTEND_URL="${FRONTEND_URL:-$(gcloud run services describe kis-frontend --region="$REGION" --format="value(status.url)" 2>/dev/null)}"
BACKEND_URL="${BACKEND_URL:-$(gcloud run services describe kis-backend --region="$REGION" --format="value(status.url)" 2>/dev/null)}"
printf "\n${BOLD}${GREEN}KIS deployed${RESET}\n"
printf "  Frontend : %s\n" "$FRONTEND_URL"
printf "  Backend  : %s/docs\n" "$BACKEND_URL"
