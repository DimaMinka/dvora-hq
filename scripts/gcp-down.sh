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

  # 0. Export Database Backup to GCS and download locally
  echo "[0/3] Creating database backup and exporting to gs://${BUCKET_NAME}..."
  DB_NAME=${DB_NAME:-"dvora_db"}
  if gcloud sql instances describe "${DB_INSTANCE_NAME}" --project="${PROJECT_ID}" &>/dev/null; then
    # Give Cloud SQL service account access to bucket to write export
    SQL_SA=$(gcloud sql instances describe "${DB_INSTANCE_NAME}" --project="${PROJECT_ID}" --format="value(serviceAccountEmailAddress)")
    if [ ! -z "$SQL_SA" ]; then
      gcloud storage buckets add-iam-policy-binding "gs://${BUCKET_NAME}" \
        --member="serviceAccount:${SQL_SA}" \
        --role="roles/storage.objectAdmin" --quiet || true
    fi

    echo "Exporting database to SQL dump..."
    gcloud sql export sql "${DB_INSTANCE_NAME}" "gs://${BUCKET_NAME}/dvora_db_backup.sql" \
      --database="${DB_NAME}" --project="${PROJECT_ID}" --quiet || true
    
    echo "Downloading database backup locally..."
    gcloud storage cp "gs://${BUCKET_NAME}/dvora_db_backup.sql" "./dvora_db_backup.sql" || true
    echo "Database backup saved locally as ./dvora_db_backup.sql"
  else
    echo "Database instance ${DB_INSTANCE_NAME} does not exist. Skipping backup."
  fi

  # 1. Delete Cloud SQL Instance
  echo "[1/3] Deleting Cloud SQL instance ${DB_INSTANCE_NAME}..."
  if gcloud sql instances describe "${DB_INSTANCE_NAME}" --project="${PROJECT_ID}" &>/dev/null; then
    gcloud sql instances delete "${DB_INSTANCE_NAME}" --project="${PROJECT_ID}" --quiet
    echo "Database instance ${DB_INSTANCE_NAME} deleted."
  else
    echo "Database instance ${DB_INSTANCE_NAME} does not exist."
  fi

  # 2. Delete Cloud Storage Bucket
  echo "[2/3] Deleting Cloud Storage bucket gs://${BUCKET_NAME}..."
  if gcloud storage buckets describe "gs://${BUCKET_NAME}" --project="${PROJECT_ID}" &>/dev/null; then
    # Empty bucket first
    gsutil rm -r "gs://${BUCKET_NAME}/**" || true
    gcloud storage buckets delete "gs://${BUCKET_NAME}" --project="${PROJECT_ID}" --quiet
    echo "Bucket gs://${BUCKET_NAME} deleted."
  else
    echo "Bucket gs://${BUCKET_NAME} does not exist."
  fi

  # 3. Delete Cloud Tasks Queue
  echo "[3/3] Deleting Cloud Tasks queue ${QUEUE_NAME}..."
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
