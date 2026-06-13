#!/usr/bin/env bash

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
echo " Destroying Dvora HQ Infrastructure on GCP"
echo " Active Project: ${PROJECT_ID}"
echo " Region: ${REGION}"
echo "============================================="

read -p "Are you sure you want to delete all resources? This is irreversible! (y/N): " -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  # Redirect stdout and stderr to terminal and log file
  LOG_FILE="gcp-infra.log"
  exec > >(tee -ia "$LOG_FILE") 2>&1

  # 1. Delete Cloud Storage Bucket
  echo "[1/2] Deleting Cloud Storage bucket gs://${BUCKET_NAME}..."
  if gcloud storage buckets describe "gs://${BUCKET_NAME}" --project="${PROJECT_ID}" &>/dev/null; then
    # Empty bucket first
    gsutil rm -r "gs://${BUCKET_NAME}/**" || true
    gcloud storage buckets delete "gs://${BUCKET_NAME}" --project="${PROJECT_ID}" --quiet
    echo "Bucket gs://${BUCKET_NAME} deleted."
  else
    echo "Bucket gs://${BUCKET_NAME} does not exist."
  fi

  # 2. Delete Cloud Tasks Queue
  echo "[2/2] Deleting Cloud Tasks queue ${QUEUE_NAME}..."
  if gcloud tasks queues describe "${QUEUE_NAME}" --location="${REGION}" --project="${PROJECT_ID}" &>/dev/null; then
    gcloud tasks queues delete "${QUEUE_NAME}" --location="${REGION}" --project="${PROJECT_ID}" --quiet
    echo "Queue ${QUEUE_NAME} deleted."
  else
    echo "Queue ${QUEUE_NAME} does not exist."
  fi

  echo "============================================="
  echo " Infrastructure teardown completed!"
  echo "============================================="
else
  echo "Teardown cancelled."
fi
