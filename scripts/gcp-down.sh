#!/usr/bin/env bash

PROJECT_ID=$(gcloud config get-value project)
REGION="europe-west1"
BUCKET_NAME="${PROJECT_ID}-avatars"
QUEUE_NAME="avatar-generation"
DB_INSTANCE_NAME="dvora-db"

echo "============================================="
echo " Destroying Dvora HQ Infrastructure on GCP"
echo " Active Project: ${PROJECT_ID}"
echo " Region: ${REGION}"
echo "============================================="

read -p "Are you sure you want to delete all resources? This is irreversible! (y/N): " -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  # 1. Delete Cloud SQL Instance
  echo "[1/3] Deleting Cloud SQL instance ${DB_INSTANCE_NAME}..."
  if gcloud sql instances describe "${DB_INSTANCE_NAME}" &>/dev/null; then
    gcloud sql instances delete "${DB_INSTANCE_NAME}" --quiet
    echo "Database instance ${DB_INSTANCE_NAME} deleted."
  else
    echo "Database instance ${DB_INSTANCE_NAME} does not exist."
  fi

  # 2. Delete Cloud Storage Bucket
  echo "[2/3] Deleting Cloud Storage bucket gs://${BUCKET_NAME}..."
  if gcloud storage buckets describe "gs://${BUCKET_NAME}" &>/dev/null; then
    # Empty bucket first
    gsutil rm -r "gs://${BUCKET_NAME}/**" || true
    gcloud storage buckets delete "gs://${BUCKET_NAME}" --quiet
    echo "Bucket gs://${BUCKET_NAME} deleted."
  else
    echo "Bucket gs://${BUCKET_NAME} does not exist."
  fi

  # 3. Delete Cloud Tasks Queue
  echo "[3/3] Deleting Cloud Tasks queue ${QUEUE_NAME}..."
  if gcloud tasks queues describe "${QUEUE_NAME}" --location="${REGION}" &>/dev/null; then
    gcloud tasks queues delete "${QUEUE_NAME}" --location="${REGION}" --quiet
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
