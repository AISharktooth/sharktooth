"use strict";

const { DefaultAzureCredential } = require("@azure/identity");
const { QueueClient, QueueServiceClient } = require("@azure/storage-queue");
const intakeHandler = require("./BlobCreatedIntake/index.js");
const { STATUS } = require("./ingestStore");

const parseIntEnv = (name, fallback) => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const config = (() => {
  const queueName = process.env.EVENTGRID_QUEUE_NAME ?? "ro-sftp-events";
  return {
    queueName,
    queueAccount: process.env.EVENTGRID_QUEUE_ACCOUNT ?? process.env.INTAKE_STORAGE_ACCOUNT,
    queueConnectionString:
      process.env.EVENTGRID_QUEUE_CONNECTION_STRING ?? process.env.AZURE_STORAGE_CONNECTION_STRING,
    poisonQueueName: process.env.EVENTGRID_QUEUE_POISON_NAME ?? `${queueName}-poison`,
    pollMs: parseIntEnv("EVENTGRID_QUEUE_POLL_MS", 2000),
    batchSize: parseIntEnv("EVENTGRID_QUEUE_BATCH_SIZE", 10),
    visibilityTimeout: parseIntEnv("EVENTGRID_QUEUE_VISIBILITY_TIMEOUT", 30),
    maxDequeueCount: parseIntEnv("EVENTGRID_QUEUE_MAX_DEQUEUE", 5)
  };
})();

if (!config.queueConnectionString && !config.queueAccount) {
  throw new Error("EVENTGRID_QUEUE_ACCOUNT or EVENTGRID_QUEUE_CONNECTION_STRING required");
}

const buildQueueClient = () => {
  if (config.queueConnectionString) {
    return QueueServiceClient.fromConnectionString(config.queueConnectionString).getQueueClient(
      config.queueName
    );
  }
  const credential = new DefaultAzureCredential();
  const queueUrl = `https://${config.queueAccount}.queue.core.windows.net/${config.queueName}`;
  return new QueueClient(queueUrl, credential);
};

const buildPoisonQueueClient = () => {
  if (config.queueConnectionString) {
    return QueueServiceClient.fromConnectionString(config.queueConnectionString).getQueueClient(
      config.poisonQueueName
    );
  }
  const credential = new DefaultAzureCredential();
  const queueUrl = `https://${config.queueAccount}.queue.core.windows.net/${config.poisonQueueName}`;
  return new QueueClient(queueUrl, credential);
};

const parseEvents = (messageText) => {
  const candidates = [messageText, Buffer.from(messageText, "base64").toString("utf8")];
  for (const candidate of candidates) {
    try {
      const payload = JSON.parse(candidate);
      if (!payload) continue;
      return Array.isArray(payload) ? payload : [payload];
    } catch (err) {
      // Try next candidate.
    }
  }
  throw new Error("Unable to parse Event Grid message payload");
};

const logJson = (level, event, data) => {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...data
  };
  console.log(JSON.stringify(payload));
};

const context = {
  log: (...args) => console.log(...args)
};

const queueClient = buildQueueClient();
const poisonQueueClient = buildPoisonQueueClient();

const handleMessage = async (message) => {
  logJson("info", "queue_message_received", {
    message_id: message.messageId,
    dequeue_count: message.dequeueCount ?? 0
  });
  const events = parseEvents(message.messageText ?? "");
  if (events.length === 0) {
    return;
  }
  const result = await intakeHandler(context, events);
  const failures =
    result?.results?.filter((item) => item?.status === STATUS.FAILED && item.retryable) ?? [];
  if (failures.length) {
    logJson("error", "queue_message_failed", {
      message_id: message.messageId,
      failures: failures.map((item) => ({
        tenant_id: item.tenantId,
        storage_uri: item.storageUri,
        error_code: item.errorCode
      }))
    });
    const error = new Error("queue_message_failed");
    error.failures = failures;
    throw error;
  }

  logJson("info", "queue_message_processed", {
    message_id: message.messageId,
    event_count: result?.results?.length ?? 0
  });
};

const main = async () => {
  await queueClient.createIfNotExists();
  await poisonQueueClient.createIfNotExists();

  logJson("info", "queue_worker_started", {
    queue: config.queueName,
    poison_queue: config.poisonQueueName
  });

  while (true) {
    const response = await queueClient.receiveMessages({
      numberOfMessages: config.batchSize,
      visibilityTimeout: config.visibilityTimeout
    });

    const messages = response.receivedMessageItems ?? [];
    if (!messages.length) {
      await sleep(config.pollMs);
      continue;
    }

    for (const message of messages) {
      try {
        await handleMessage(message);
        await queueClient.deleteMessage(message.messageId, message.popReceipt);
      } catch (err) {
        const dequeueCount = message.dequeueCount ?? 0;
        logJson("error", "queue_message_failed_attempt", {
          message_id: message.messageId,
          dequeue_count: dequeueCount,
          error: err instanceof Error ? err.message : err
        });

        if (dequeueCount >= config.maxDequeueCount) {
          await poisonQueueClient.sendMessage(message.messageText ?? "");
          await queueClient.deleteMessage(message.messageId, message.popReceipt);
          logJson("error", "queue_message_poisoned", {
            message_id: message.messageId,
            poison_queue: config.poisonQueueName
          });
        }
      }
    }
  }
};

process.on("SIGINT", () => {
  logJson("info", "queue_worker_shutdown", {});
  Promise.resolve(intakeHandler.flushMetrics?.()).finally(() => process.exit(0));
});

process.on("SIGTERM", () => {
  logJson("info", "queue_worker_shutdown", { signal: "SIGTERM" });
  Promise.resolve(intakeHandler.flushMetrics?.()).finally(() => process.exit(0));
});

main().catch((err) => {
  logJson("error", "queue_worker_fatal", {
    error: err instanceof Error ? err.message : err
  });
  process.exit(1);
});
