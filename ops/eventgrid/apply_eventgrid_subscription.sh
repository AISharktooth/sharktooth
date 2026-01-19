#!/usr/bin/env bash
set -euo pipefail

RESOURCE_GROUP="${RESOURCE_GROUP:-SharktoothAI}"
STORAGE_ACCOUNT="${STORAGE_ACCOUNT:-stairostorage}"
CONTAINER_NAME="${CONTAINER_NAME:-ro-raw}"
SYSTEM_TOPIC="${SYSTEM_TOPIC:-stairostorage-events}"
SUBSCRIPTION_NAME="${SUBSCRIPTION_NAME:-ro-sftp}"
QUEUE_NAME="${QUEUE_NAME:-ro-sftp-events}"

SUBSCRIPTION_ID="$(az account show --query id -o tsv)"
QUEUE_ID="/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.Storage/storageAccounts/${STORAGE_ACCOUNT}/queueServices/default/queues/${QUEUE_NAME}"

SUBJECT_PREFIX="/blobServices/default/containers/${CONTAINER_NAME}/blobs/"

if az eventgrid system-topic event-subscription show \
  --resource-group "${RESOURCE_GROUP}" \
  --system-topic-name "${SYSTEM_TOPIC}" \
  --name "${SUBSCRIPTION_NAME}" >/dev/null 2>&1; then
  az eventgrid system-topic event-subscription update \
    --resource-group "${RESOURCE_GROUP}" \
    --system-topic-name "${SYSTEM_TOPIC}" \
    --name "${SUBSCRIPTION_NAME}" \
    --endpoint-type storagequeue \
    --endpoint "${QUEUE_ID}" \
    --included-event-types Microsoft.Storage.BlobCreated \
    --subject-begins-with "${SUBJECT_PREFIX}" \
    --advanced-filter data.api StringIn SftpCommit
else
  az eventgrid system-topic event-subscription create \
    --resource-group "${RESOURCE_GROUP}" \
    --system-topic-name "${SYSTEM_TOPIC}" \
    --name "${SUBSCRIPTION_NAME}" \
    --endpoint-type storagequeue \
    --endpoint "${QUEUE_ID}" \
    --included-event-types Microsoft.Storage.BlobCreated \
    --subject-begins-with "${SUBJECT_PREFIX}" \
    --advanced-filter data.api StringIn SftpCommit
fi
