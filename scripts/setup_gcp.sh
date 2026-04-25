#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  Medion KIS — GCP project bootstrap
#  Run once per GCP project to enable APIs, create registries, and configure
#  credentials. All secrets are read from .env — never hard-coded here.
#
#  Prerequisites:
#    gcloud CLI >= 460  (gcloud version)
#    docker (for local image builds)
#    .env file with GCP_PROJECT_ID, GCP_REGION, OPENSEARCH_ADMIN_PASSWORD, …
#
#  Usage:
#    cp .env.example .env && vim .env   # fill in your keys
#    chmod +x scripts/setup_gcp.sh
#    ./scripts/setup_gcp.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Load .env ─────────────────────────────────────────────────────────────────
if [ -f .env ]; then
  # Export only lines that look like KEY=VALUE (skip comments and blanks)
  set -a
  # shellcheck source=/dev/null
  source <(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' .env)
  set +a
fi

# ── Required vars ─────────────────────────────────────────────────────────────
PROJECT="${GCP_PROJECT_ID:?GCP_PROJECT_ID missing — set it in .env}"
REGION="${GCP_REGION:-europe-west1}"
REPO="kis-docker"
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT}/${REPO}"
OS_PASSWORD="${OPENSEARCH_ADMIN_PASSWORD:-Medion!KIS2026}"
OS_INDEX="${OPENSEARCH_INDEX:-viaticum-transcripts}"

BOLD='\033[1m'; CYAN='\033[36m'; GREEN='\033[32m'; RESET='\033[0m'
step() { printf "\n${BOLD}${CYAN}▶ %s${RESET}\n" "$*"; }
ok()   { printf "${GREEN}  ✓ %s${RESET}\n" "$*"; }

# ── 1. Auth & project ─────────────────────────────────────────────────────────
step "Configuring gcloud project"
gcloud config set project "$PROJECT"
gcloud config set run/region "$REGION"
ok "Project: $PROJECT  |  Region: $REGION"

# ── 2. Enable APIs ────────────────────────────────────────────────────────────
step "Enabling required GCP APIs (this may take ~2 min on first run)"
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  compute.googleapis.com \
  vpcaccess.googleapis.com \
  cloudresourcemanager.googleapis.com \
  --quiet
ok "APIs enabled"

# ── 3. Artifact Registry ──────────────────────────────────────────────────────
step "Creating Artifact Registry repository: $REPO"
if ! gcloud artifacts repositories describe "$REPO" --location="$REGION" &>/dev/null; then
  gcloud artifacts repositories create "$REPO" \
    --repository-format=docker \
    --location="$REGION" \
    --description="Medion KIS container images"
  ok "Created $REGISTRY"
else
  ok "Already exists: $REGISTRY"
fi

# Configure Docker to authenticate with the registry
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet
ok "Docker configured for $REGION-docker.pkg.dev"

# ── 4. Build and push images ──────────────────────────────────────────────────
step "Building Docker images"
docker build -t "${REGISTRY}/kis-backend:latest"  -f Dockerfile.backend  .
docker build -t "${REGISTRY}/kis-frontend:latest" -f Dockerfile.frontend_react .
ok "Images built"

step "Pushing images to Artifact Registry"
docker push "${REGISTRY}/kis-backend:latest"
docker push "${REGISTRY}/kis-frontend:latest"
ok "Images pushed"

# ── 5. GCP Secret Manager — OpenSearch password ───────────────────────────────
step "Storing secrets in Secret Manager"
create_secret() {
  local name="$1" value="$2"
  if gcloud secrets describe "$name" &>/dev/null; then
    printf "%s" "$value" | gcloud secrets versions add "$name" --data-file=-
    ok "Updated secret: $name"
  else
    printf "%s" "$value" | gcloud secrets create "$name" \
      --replication-policy=automatic --data-file=-
    ok "Created secret: $name"
  fi
}
create_secret "kis-opensearch-password"    "$OS_PASSWORD"
create_secret "kis-pioneer-api-key"        "${PIONEER_API_KEY:-placeholder}"
create_secret "kis-opensearch-index"       "$OS_INDEX"

# ── 6. OpenSearch on GCE (single-node, persistent disk) ──────────────────────
step "Setting up OpenSearch on Compute Engine"
OS_ZONE="${REGION}-b"
OS_INSTANCE="kis-opensearch"
OS_DISK="kis-opensearch-data"
OS_MACHINE="e2-standard-2"   # 2 vCPU, 8 GB RAM — enough for single-node demo

if ! gcloud compute instances describe "$OS_INSTANCE" --zone="$OS_ZONE" &>/dev/null; then
  # Create persistent disk for OpenSearch data
  if ! gcloud compute disks describe "$OS_DISK" --zone="$OS_ZONE" &>/dev/null; then
    gcloud compute disks create "$OS_DISK" \
      --zone="$OS_ZONE" \
      --size=20GB \
      --type=pd-standard
    ok "Created disk: $OS_DISK (20 GB)"
  fi

  # Startup script — installs Docker + starts OpenSearch
  STARTUP=$(cat <<STARTUPEOF
#!/bin/bash
set -e
apt-get update -qq && apt-get install -y docker.io
systemctl enable --now docker
sysctl -w vm.max_map_count=262144
echo 'vm.max_map_count=262144' >> /etc/sysctl.conf
mkdir -p /mnt/opensearch-data
if ! blkid /dev/sdb; then
  mkfs.ext4 /dev/sdb
fi
mount /dev/sdb /mnt/opensearch-data || true
echo '/dev/sdb /mnt/opensearch-data ext4 defaults 0 2' >> /etc/fstab
chown -R 1000:1000 /mnt/opensearch-data
docker run -d --name opensearch --restart=always \
  -p 9200:9200 \
  -e discovery.type=single-node \
  -e OPENSEARCH_INITIAL_ADMIN_PASSWORD=${OS_PASSWORD} \
  -e OPENSEARCH_JAVA_OPTS="-Xms1g -Xmx1g" \
  -v /mnt/opensearch-data:/usr/share/opensearch/data \
  --ulimit memlock=-1:-1 \
  opensearchproject/opensearch:2.14.0
STARTUPEOF
)

  gcloud compute instances create "$OS_INSTANCE" \
    --zone="$OS_ZONE" \
    --machine-type="$OS_MACHINE" \
    --disk="name=${OS_DISK},device-name=opensearch-data,mode=rw,boot=no" \
    --scopes=cloud-platform \
    --tags=opensearch \
    --metadata="startup-script=${STARTUP}"
  ok "Created GCE instance: $OS_INSTANCE"

  # Firewall: allow backend (Cloud Run) to reach port 9200 via VPC
  if ! gcloud compute firewall-rules describe "allow-opensearch-internal" &>/dev/null; then
    gcloud compute firewall-rules create "allow-opensearch-internal" \
      --direction=INGRESS \
      --action=ALLOW \
      --rules=tcp:9200 \
      --target-tags=opensearch \
      --source-ranges=10.0.0.0/8 \
      --description="Allow internal access to OpenSearch"
    ok "Firewall rule created"
  fi

  printf "  Waiting 90s for OpenSearch to start…"
  sleep 90
  printf " done\n"
else
  ok "GCE instance already exists: $OS_INSTANCE"
fi

OS_INTERNAL_IP=$(gcloud compute instances describe "$OS_INSTANCE" \
  --zone="$OS_ZONE" --format="value(networkInterfaces[0].networkIP)")
ok "OpenSearch internal IP: $OS_INTERNAL_IP"
OPENSEARCH_URL_INTERNAL="https://${OS_INTERNAL_IP}:9200"

# ── 7. Deploy backend to Cloud Run ────────────────────────────────────────────
step "Deploying backend to Cloud Run"
gcloud run deploy kis-backend \
  --image="${REGISTRY}/kis-backend:latest" \
  --region="$REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --memory=2Gi \
  --cpu=2 \
  --min-instances=0 \
  --max-instances=3 \
  --timeout=120 \
  --set-env-vars="VECTOR_STORE=opensearch,\
OPENSEARCH_URL=${OPENSEARCH_URL_INTERNAL},\
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

# ── 8. Deploy frontend (nginx) to Cloud Run ───────────────────────────────────
step "Deploying KIS frontend to Cloud Run"

# Patch nginx.conf to proxy to the actual backend URL on GCP
# We inject BACKEND_URL via nginx env substitution at runtime
gcloud run deploy kis-frontend \
  --image="${REGISTRY}/kis-frontend:latest" \
  --region="$REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --memory=256Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=5 \
  --set-env-vars="BACKEND_URL=${BACKEND_URL}"

FRONTEND_URL=$(gcloud run services describe kis-frontend \
  --region="$REGION" --format="value(status.url)")
ok "Frontend: $FRONTEND_URL"

# ── 9. Seed OpenSearch index with patient data ────────────────────────────────
step "Seeding OpenSearch with dummy patient data"
BACKEND_INGEST="${BACKEND_URL}/ingest"
if command -v python3 &>/dev/null && [ -f scripts/seed_opensearch.py ]; then
  BACKEND_URL="$BACKEND_URL" python3 scripts/seed_opensearch.py
  ok "Patient data seeded via backend /ingest"
else
  printf "  Skipping seed — run: BACKEND_URL=%s python3 scripts/seed_opensearch.py\n" "$BACKEND_URL"
fi

# ── 10. Summary ───────────────────────────────────────────────────────────────
printf "\n${BOLD}${GREEN}═══════════════════════════════════════${RESET}\n"
printf "${BOLD}${GREEN}  Medion KIS deployed to GCP${RESET}\n"
printf "${BOLD}${GREEN}═══════════════════════════════════════${RESET}\n"
printf "  Frontend  : %s\n" "$FRONTEND_URL"
printf "  Backend   : %s/docs\n" "$BACKEND_URL"
printf "  OpenSearch: %s  (internal)\n" "$OPENSEARCH_URL_INTERNAL"
printf "\n  Login: dr.weber / aura2026\n"
printf "${BOLD}${GREEN}═══════════════════════════════════════${RESET}\n\n"
