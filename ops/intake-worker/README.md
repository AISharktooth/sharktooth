# Intake Worker (queueWorker) Operations

## Overview
This worker consumes Event Grid messages from a Storage Queue, validates SFTP uploads, and calls the ingest API.
It is designed to run as a long-lived systemd service with managed identity or a queue connection string.

## Install systemd service
1) Copy the unit file and create a dedicated user:
```
sudo useradd --system --no-create-home --shell /usr/sbin/nologin stai-intake
sudo mkdir -p /etc/stai
sudo cp ops/intake-worker/systemd/stai-intake-worker.service /etc/systemd/system/
sudo cp ops/intake-worker/systemd/intake-worker.env /etc/stai/intake-worker.env
```

2) Edit `/etc/stai/intake-worker.env` with real values.

3) Enable and start:
```
sudo systemctl daemon-reload
sudo systemctl enable stai-intake-worker
sudo systemctl start stai-intake-worker
```

Node version: prefer Node 24 if available; `/usr/bin/env node` will pick the system default.

## Start/stop/status
```
sudo systemctl status stai-intake-worker --no-pager
sudo systemctl stop stai-intake-worker
sudo systemctl restart stai-intake-worker
```

CLI-friendly status/health:
```
ops/intake-worker/worker_status.sh
```

## Logs
```
journalctl -u stai-intake-worker -f
```

## Required env vars
- `INTAKE_STORAGE_ACCOUNT`
- `INTAKE_CONTAINER`
- `INTAKE_ALLOWED_EXT`
- `INTAKE_MAX_BYTES`
- `INTAKE_WELLFORMED_XML`
- `INGEST_API_URL`
- `INGEST_AAD_AUDIENCE`
- `DATABASE_URL`

Queue access (choose one):
- `EVENTGRID_QUEUE_ACCOUNT` (MSI)
- `EVENTGRID_QUEUE_CONNECTION_STRING` (shared key)

## Redrive poison messages
```
node ops/intake-worker/redrive_poison_queue.js
```

Control batches:
```
REDRIVE_MAX_MESSAGES=100 REDRIVE_BATCH_SIZE=16 node ops/intake-worker/redrive_poison_queue.js
```

## Troubleshooting checklist
- Verify `/etc/stai/intake-worker.env` values and that no secrets are committed.
- Confirm the VM identity has `Storage Queue Data Contributor` on the storage account.
- Confirm `stairostorage` private endpoint DNS resolves on the VM.
- Check `app.ingest_files` for status and errors.
- Ensure `INGEST_API_URL` is reachable and `INGEST_AAD_AUDIENCE` matches the gateway.
- Review logs in `journalctl -u stai-intake-worker`.
