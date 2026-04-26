# GCP Setup Guide

## Prerequisites

```bash
# Install gcloud CLI — https://cloud.google.com/sdk/docs/install
# Install Docker    — https://docs.docker.com/engine/install/

gcloud auth login
gcloud auth application-default login
```

---

## Step 1 — Fill in `.env`

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `GCP_PROJECT_ID` | Your GCP project ID (e.g. `medion-kis-prod`) |
| `GCP_REGION` | GCP region — default: `europe-west1` |
| `OPENSEARCH_ADMIN_PASSWORD` | Strong password for OpenSearch admin |
| `PIONEER_API_KEY` | Your Pioneer API key (`pio_sk_...`) |
| `PIONEER_NER_MODEL_ID` | `f9ebf6b0-6d63-4360-b8d3-82411760ae20` |
| `PIONEER_SOAP_MODEL_ID` | Your SOAP model ID |

---

## Step 2 — Run the setup script

```bash
chmod +x scripts/setup_gcp.sh
./scripts/setup_gcp.sh
```

The script runs these steps in order:

1. Sets gcloud project + region
2. Enables APIs (Cloud Run, Artifact Registry, Firestore, Compute, etc.)
3. Creates Firestore database (native mode, `europe-west1`)
4. Creates Artifact Registry repo `kis-docker`
5. Builds + pushes 3 Docker images: `kis-backend`, `kis-frontend`, `kis-stt`
6. Stores secrets in Secret Manager (`kis-opensearch-password`, `kis-pioneer-api-key`)
7. Creates OpenSearch GCE VM (`n1-standard-2`) with persistent disk
8. Creates Parakeet STT GCE VM (`n1-standard-4` + T4 GPU) and installs NVIDIA drivers
9. Deploys backend to Cloud Run — injects `PARAKEET_URL`, `GCP_PROJECT_ID`, Pioneer model IDs
10. Deploys frontend to Cloud Run
11. Seeds OpenSearch with patient data
12. Prints all service URLs

**Expected runtime: ~10–15 minutes** (first run). The script is idempotent — safe to re-run.

---

## Step 3 — Start the Parakeet model on the VM

After the script finishes, SSH into the STT VM and start the container.  
> The NVIDIA drivers installed by the startup script take a few minutes after VM creation — wait until `nvidia-smi` returns output before running Docker.

```bash
# Get the VM IP (also printed by the script)
STT_IP=$(gcloud compute instances describe parakeet-stt \
  --zone=europe-west1-b --format="value(networkInterfaces[0].networkIP)")

# SSH and start the container
gcloud compute ssh parakeet-stt --zone=europe-west1-b -- "
  docker run -d --gpus all --name kis-stt --restart=always \
    -p 8001:8001 \
    europe-west1-docker.pkg.dev/${GCP_PROJECT_ID}/kis-docker/kis-stt:latest
"
```

The NeMo model download (`johannhartmann/parakeet_de_med`) takes ~5 minutes on first start.

---

## Step 4 — Verify everything

```bash
# Backend health (use the URL printed by the script)
curl https://<backend-cloud-run-url>/health
# Expected:
# {"status":"ok","models_loaded":{"stt":"parakeet","soap":"pioneer","ner":"pioneer","omi":"stub"}}

# Parakeet STT health (from GCP Cloud Shell or IAP tunnel)
curl http://${STT_IP}:8001/health
# Expected: {"status":"ok","model_loaded":true,"stub_mode":false}

# Patients endpoint
curl https://<backend-cloud-run-url>/patients
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `GCP_PROJECT_ID missing` | Ensure `.env` is filled in and sourced |
| `docker: permission denied` | `sudo usermod -aG docker $USER` then re-login |
| STT model not loaded | `docker logs kis-stt` on the VM — NeMo download takes ~5 min |
| `PARAKEET_URL` unreachable | Verify firewall rule `allow-parakeet-internal` exists and VM tag is `parakeet-stt` |
| Pioneer returns 401 | Check `PIONEER_API_KEY` in Secret Manager matches your key |
| Firestore permission denied | Run `gcloud auth application-default login` and ensure the service account has `roles/datastore.user` |
