#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

# Redirect stdout and stderr to terminal and log file
LOG_FILE="gcp-infra.log"
exec > >(tee -ia "$LOG_FILE") 2>&1

# Load environment variables from .env if it exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

PROJECT_ID=${GCP_PROJECT_ID:-$(gcloud config get-value project)}
REGION=${GCP_REGION:-"europe-west1"}
BUCKET_NAME=${GCS_AVATAR_BUCKET:-"${PROJECT_ID}-avatars"}
QUEUE_NAME=${CLOUDTASKS_QUEUE_NAME:-"avatar-generation"}
DB_INSTANCE_NAME=${CLOUDSQL_INSTANCE_NAME:-"dvora-db"}

echo "============================================="
echo " Deploying Dvora HQ Infrastructure on GCP"
echo " Active Project: ${PROJECT_ID}"
echo " Region: ${REGION}"
echo "============================================="

# 1. Enable Required Google APIs
echo "[1/4] Enabling required APIs..."
gcloud services enable \
  sqladmin.googleapis.com \
  run.googleapis.com \
  cloudtasks.googleapis.com \
  secretmanager.googleapis.com \
  storage.googleapis.com \
  iam.googleapis.com \
  --project="${PROJECT_ID}"

# 2. Create Cloud Storage Bucket
echo "[2/4] Checking and creating Cloud Storage bucket..."
if gcloud storage buckets describe "gs://${BUCKET_NAME}" --project="${PROJECT_ID}" &>/dev/null; then
  echo "Bucket gs://${BUCKET_NAME} already exists."
  else
  gcloud storage buckets create "gs://${BUCKET_NAME}" --location="${REGION}" --project="${PROJECT_ID}"
  echo "Bucket gs://${BUCKET_NAME} created successfully."
fi

# 3. Create Cloud Tasks Queue
echo "[3/4] Checking and creating Cloud Tasks queue..."
if gcloud tasks queues describe "${QUEUE_NAME}" --location="${REGION}" --project="${PROJECT_ID}" &>/dev/null; then
  echo "Queue ${QUEUE_NAME} already exists."
else
  if ! gcloud tasks queues create "${QUEUE_NAME}" --location="${REGION}" --project="${PROJECT_ID}" 2>queue_err.log; then
    if grep -q "existed too recently" queue_err.log; then
      echo "WARNING: Could not create queue '${QUEUE_NAME}' because it was deleted too recently."
      echo "GCP enforces a cooldown period before a deleted queue name can be reused."
      echo "Continuing setup anyway..."
    else
      cat queue_err.log
      exit 1
    fi
  else
    echo "Queue ${QUEUE_NAME} created successfully."
  fi
  rm -f queue_err.log
fi

# 4. Create Cloud Firestore Database Instance
echo "[4/4] Ensuring Cloud Firestore database (default) exists..."
gcloud services enable firestore.googleapis.com --project="${PROJECT_ID}"
if gcloud firestore databases describe --project="${PROJECT_ID}" &>/dev/null; then
  echo "Firestore database (default) already exists."
else
  gcloud firestore databases create --location="${REGION}" --project="${PROJECT_ID}" || true
  echo "Firestore database (default) setup completed."
fi

echo "============================================="
echo " Infrastructure deployment script completed!"
echo "============================================="
