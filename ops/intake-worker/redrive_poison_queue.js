"use strict";

const { DefaultAzureCredential } = require("@azure/identity");
const { QueueClient, QueueServiceClient } = require("@azure/storage-queue");

const parsePositiveInt = (value, fallback) => {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("REDRIVE_MAX_MESSAGES must be a positive integer");
  }
  return parsed;
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

const config = (() => {
  const queueName = process.env.EVENTGRID_QUEUE_NAME ?? "ro-sftp-events";
  return {
    queueName,
    poisonQueueName: process.env.EVENTGRID_QUEUE_POISON_NAME ?? `${queueName}-poison`,
    queueAccount: process.env.EVENTGRID_QUEUE_ACCOUNT ?? process.env.INTAKE_STORAGE_ACCOUNT,
    queueConnectionString:
      process.env.EVENTGRID_QUEUE_CONNECTION_STRING ?? process.env.AZURE_STORAGE_CONNECTION_STRING,
    maxMessages: parsePositiveInt(process.env.REDRIVE_MAX_MESSAGES, 100),
    batchSize: parsePositiveInt(process.env.REDRIVE_BATCH_SIZE, 16)
  };
})();

if (!config.queueConnectionString && !config.queueAccount) {
  throw new Error("EVENTGRID_QUEUE_ACCOUNT or EVENTGRID_QUEUE_CONNECTION_STRING required");
}

const buildQueueClient = (queueName) => {
  if (config.queueConnectionString) {
    return QueueServiceClient.fromConnectionString(config.queueConnectionString).getQueueClient(queueName);
  }
  const credential = new DefaultAzureCredential();
  const queueUrl = `https://${config.queueAccount}.queue.core.windows.net/${queueName}`;
  return new QueueClient(queueUrl, credential);
};

const poisonQueueClient = buildQueueClient(config.poisonQueueName);
const mainQueueClient = buildQueueClient(config.queueName);

const main = async () => {
  await poisonQueueClient.createIfNotExists();
  await mainQueueClient.createIfNotExists();

  let moved = 0;
  logJson("info", "redrive_started", {
    poison_queue: config.poisonQueueName,
    target_queue: config.queueName,
    max_messages: config.maxMessages
  });

  while (moved < config.maxMessages) {
    const response = await poisonQueueClient.receiveMessages({
      numberOfMessages: Math.min(config.batchSize, config.maxMessages - moved),
      visibilityTimeout: 30
    });

    const messages = response.receivedMessageItems ?? [];
    if (!messages.length) break;

    for (const message of messages) {
      await mainQueueClient.sendMessage(message.messageText ?? "");
      await poisonQueueClient.deleteMessage(message.messageId, message.popReceipt);
      moved += 1;
      if (moved >= config.maxMessages) break;
    }
  }

  logJson("info", "redrive_completed", { moved });
};

main().catch((err) => {
  logJson("error", "redrive_failed", { error: err instanceof Error ? err.message : err });
  process.exit(1);
});
