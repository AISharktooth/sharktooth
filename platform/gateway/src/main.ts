import { config } from "./config";
import { createServer } from "./http/server";
import { logger } from "../../../shared/utils/logger";

const start = async () => {
  const app = createServer();
  app.listen(config.port, () => {
    logger.info(`Platform gateway listening on port ${config.port} [env=${config.env}]`);
  });
};

start().catch((err) => {
  logger.error("Failed to start gateway", err);
  process.exit(1);
});

