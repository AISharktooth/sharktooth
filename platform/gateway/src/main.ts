/*
 * Copyright (c) 2024 Jacob Malm. All rights reserved.
 * Proprietary and confidential. Unauthorized redistribution or commercial use is prohibited without prior written consent.
 */

import { config } from "./config";
import { createServer } from "./http/server";
import { logger } from "../../../shared/utils/logger";
import { AzureKeyVaultSecretsProvider, getSecretsProvider } from "./core/secrets/secretsProvider";

const checkKeyVaultMsi = async () => {
  const providerName = (process.env.SECRETS_PROVIDER ?? "").toLowerCase();
  if (providerName !== "azure_key_vault") return;
  if (process.env.AZURE_KEY_VAULT_TOKEN) {
    logger.info("Azure Key Vault token provided via env.");
    return;
  }
  if (!process.env.AZURE_KEY_VAULT_URL) {
    logger.warn("Azure Key Vault URL missing; MSI token check skipped.");
    return;
  }

  try {
    const provider = getSecretsProvider();
    if (provider instanceof AzureKeyVaultSecretsProvider) {
      await provider.ensureToken();
      logger.info("Azure Key Vault MSI token acquired.");
    }
  } catch (err) {
    logger.error("Azure Key Vault MSI token check failed", err);
  }
};

const start = async () => {
  await checkKeyVaultMsi();
  const app = createServer();
  app.listen(config.port, () => {
    logger.info(`Platform gateway listening on port ${config.port} [env=${config.env}]`);
  });
};

start().catch((err) => {
  logger.error("Failed to start gateway", err);
  process.exit(1);
});
