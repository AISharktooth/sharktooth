import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { AppError } from "../../../../../shared/utils/errors";
import type { PiiPayload } from "./piiExtract";
import { getSecretsProvider } from "../../../../../platform/gateway/src/core/secrets/secretsProvider";

export type EncryptedPiiPayload = {
  keyRef: string;
  nonce: Buffer;
  ciphertext: Buffer;
};

type KeyRing = {
  activeKeyRef: string;
  keys: Map<string, Buffer>;
};

let cachedKeyRing: KeyRing | null = null;

const parseKeyRing = (ringValue: string, activeKeyRefOverride?: string): KeyRing => {
  const legacyKeyRef = process.env.PII_KEY_ID ?? "";
  const legacyKeyMaterial = process.env.PII_KEY_MATERIAL ?? "";
  const activeKeyRef = activeKeyRefOverride ?? process.env.PII_ACTIVE_KEY ?? legacyKeyRef;
  const keys = new Map<string, Buffer>();

  if (ringValue) {
    const entries = ringValue.split(",").map((entry) => entry.trim()).filter(Boolean);
    for (const entry of entries) {
      const [keyRef, keyMaterial] = entry.split(":");
      if (!keyRef || !keyMaterial) continue;
      const key = Buffer.from(keyMaterial, "base64");
      keys.set(keyRef, key);
    }
  } else if (legacyKeyRef && legacyKeyMaterial) {
    keys.set(legacyKeyRef, Buffer.from(legacyKeyMaterial, "base64"));
  }

  if (!activeKeyRef || keys.size === 0) {
    throw new AppError("PII key ring not configured", { status: 500, code: "PII_KEY_MISSING" });
  }

  return { activeKeyRef, keys };
};

const loadKeyRing = async (): Promise<KeyRing> => {
  const ringSecret = process.env.PII_KEY_RING_SECRET;
  if (ringSecret) {
    const provider = getSecretsProvider();
    const secret = await provider.get(ringSecret);
    return parseKeyRing(secret.value, process.env.PII_ACTIVE_KEY);
  }
  return parseKeyRing(process.env.PII_KEY_RING ?? "", process.env.PII_ACTIVE_KEY);
};

const getKeyRing = async (): Promise<KeyRing> => {
  if (!cachedKeyRing) cachedKeyRing = await loadKeyRing();
  return cachedKeyRing;
};

const assertKey = (keyRef: string, key: Buffer | undefined) => {
  if (!key) {
    throw new AppError("PII key not found", { status: 500, code: "PII_KEY_NOT_FOUND" });
  }
  if (key.length !== 32) {
    throw new AppError("PII key length invalid", { status: 500, code: "PII_KEY_INVALID" });
  }
};

export const encryptPiiPayload = async (payload: PiiPayload): Promise<EncryptedPiiPayload> => {
  const { activeKeyRef, keys } = await getKeyRing();
  const key = keys.get(activeKeyRef);
  assertKey(activeKeyRef, key);

  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key as Buffer, nonce);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return { keyRef: activeKeyRef, nonce, ciphertext: Buffer.concat([ciphertext, tag]) };
};

export const decryptPiiPayload = async (encrypted: EncryptedPiiPayload): Promise<PiiPayload> => {
  const { keys } = await getKeyRing();
  const key = keys.get(encrypted.keyRef);
  assertKey(encrypted.keyRef, key);

  if (encrypted.ciphertext.length <= 16) {
    throw new AppError("PII ciphertext invalid", { status: 500, code: "PII_DECRYPT_FAIL" });
  }

  const tag = encrypted.ciphertext.subarray(encrypted.ciphertext.length - 16);
  const data = encrypted.ciphertext.subarray(0, encrypted.ciphertext.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", key as Buffer, encrypted.nonce);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(plaintext.toString("utf8")) as PiiPayload;
};
