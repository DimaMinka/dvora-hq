#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

# Redirect stdout and stderr to terminal and log file
LOG_FILE="gcp-infra.log"
exec > >(tee -ia "$LOG_FILE") 2>&1

PROJECT_ID=$(gcloud config get-value project)
REGION="europe-west1"
BUCKET_NAME="${PROJECT_ID}-avatars"
QUEUE_NAME="avatar-generation"
DB_INSTANCE_NAME="dvora-db"

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
  iam.googleapis.com

# 2. Create Cloud Storage Bucket
echo "[2/4] Checking and creating Cloud Storage bucket..."
if gcloud storage buckets describe "gs://${BUCKET_NAME}" &>/dev/null; then
  echo "Bucket gs://${BUCKET_NAME} already exists."
else
  gcloud storage buckets create "gs://${BUCKET_NAME}" --location="${REGION}"
  echo "Bucket gs://${BUCKET_NAME} created successfully."
fi

# 3. Create Cloud Tasks Queue
echo "[3/4] Checking and creating Cloud Tasks queue..."
if gcloud tasks queues describe "${QUEUE_NAME}" --location="${REGION}" &>/dev/null; then
  echo "Queue ${QUEUE_NAME} already exists."
else
  if ! gcloud tasks queues create "${QUEUE_NAME}" --location="${REGION}" 2>queue_err.log; then
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

# 4. Create Cloud SQL (MySQL 8) Database Instance
echo "[4/4] Creating Cloud SQL instance (db-f1-micro) - this might take 5-10 minutes..."
if gcloud sql instances describe "${DB_INSTANCE_NAME}" &>/dev/null; then
  echo "Database instance ${DB_INSTANCE_NAME} already exists."
else
  gcloud sql instances create "${DB_INSTANCE_NAME}" \
    --database-version=MYSQL_8_0 \
    --tier=db-f1-micro \
    --region="${REGION}" \
    --async
  echo "Database instance ${DB_INSTANCE_NAME} creation initiated in the background."
  echo "Monitor creation status using: gcloud sql instances list"
fi

echo "============================================="
echo " Infrastructure deployment script completed!"
echo "============================================="
