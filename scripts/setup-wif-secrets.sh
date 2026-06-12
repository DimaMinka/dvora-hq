#!/bin/bash
set -e

PROJECT_ID="dvora-hq-net-784d7"
REPO="DimaMinka/dvora-hq"
SA_NAME="github-deployer"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "=== [1/7] Enabling Required Google APIs ==="
gcloud services enable \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  cloudresourcemanager.googleapis.com \
  artifactregistry.googleapis.com \
  run.googleapis.com \
  firebase.googleapis.com \
  firebasehosting.googleapis.com \
  --project="${PROJECT_ID}"

echo "=== [2/7] Creating Artifact Registry ==="
gcloud artifacts repositories create dvora-repo \
  --repository-format=docker \
  --location=europe-west1 \
  --description="Docker repository for Dvora HQ" \
  --project="${PROJECT_ID}" || true

echo "=== [3/7] Creating Service Account ==="
gcloud iam service-accounts create "${SA_NAME}" \
  --description="Service account for GitHub Actions CI/CD" \
  --display-name="GitHub Deployer" \
  --project="${PROJECT_ID}" || true

echo "=== [4/7] Granting Permissions ==="
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/run.developer" \
  --quiet

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/artifactregistry.writer" \
  --quiet

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser" \
  --quiet

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/firebasehosting.admin" \
  --quiet

echo "=== [5/7] Configuring Workload Identity Federation ==="
gcloud iam workload-identity-pools create github-pool \
  --location="global" \
  --description="Identity pool for GitHub Actions" \
  --display-name="GitHub Actions Pool" \
  --project="${PROJECT_ID}" || true

POOL_ID=$(gcloud iam workload-identity-pools describe github-pool \
  --location="global" \
  --format="value(name)" \
  --project="${PROJECT_ID}")

gcloud iam workload-identity-pools providers create-oidc github-provider \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository == '${REPO}'" \
  --display-name="GitHub Provider" \
  --project="${PROJECT_ID}" || true

gcloud iam service-accounts add-iam-policy-binding "${SA_EMAIL}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${POOL_ID}/attribute.repository/${REPO}" \
  --project="${PROJECT_ID}" \
  --quiet

PROJECT_NUMBER=$(gcloud projects describe "${PROJECT_ID}" --format="value(projectNumber)")
PROVIDER_NAME="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-pool/providers/github-provider"

echo "=== [6/7] Creating Firebase JSON Key ==="
gcloud iam service-accounts keys create ./firebase-key.json \
  --iam-account="${SA_EMAIL}" \
  --project="${PROJECT_ID}"

echo "=== [7/7] Setting Secrets in GitHub Repository via gh CLI ==="
gh secret set GCP_PROJECT_ID --body "${PROJECT_ID}" --repo "${REPO}"
gh secret set GCP_SERVICE_ACCOUNT --body "${SA_EMAIL}" --repo "${REPO}"
gh secret set GCP_WORKLOAD_IDENTITY_PROVIDER --body "${PROVIDER_NAME}" --repo "${REPO}"
gh secret set FIREBASE_SERVICE_ACCOUNT --repo "${REPO}" < ./firebase-key.json

echo "=== Cleaning Up ==="
rm -f ./firebase-key.json

echo "=== SETUP COMPLETE! GitHub Secrets are registered ==="
