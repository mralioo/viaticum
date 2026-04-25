#!/usr/bin/env bash
set -euo pipefail

PROJECT=${GCP_PROJECT_ID:?Set GCP_PROJECT_ID in .env}
REGION=${GCP_REGION:-europe-west1}

echo "Deploying Viaticum to Cloud Run in $REGION..."

gcloud run deploy viaticum-backend \
    --source ./backend \
    --region "$REGION" \
    --project "$PROJECT" \
    --platform managed \
    --allow-unauthenticated \
    --set-env-vars "STT_PROVIDER=stub"

BACKEND_URL=$(gcloud run services describe viaticum-backend \
    --region "$REGION" --project "$PROJECT" \
    --format "value(status.url)")

echo "Backend URL: $BACKEND_URL"

gcloud run deploy viaticum-frontend \
    --source ./frontend \
    --region "$REGION" \
    --project "$PROJECT" \
    --platform managed \
    --allow-unauthenticated \
    --set-env-vars "BACKEND_URL=$BACKEND_URL"

FRONTEND_URL=$(gcloud run services describe viaticum-frontend \
    --region "$REGION" --project "$PROJECT" \
    --format "value(status.url)")

echo "Frontend URL: $FRONTEND_URL"
echo "Demo ready at $FRONTEND_URL"
