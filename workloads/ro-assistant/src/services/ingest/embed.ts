import type { Chunk } from "./chunk";
import { loadEnv } from "../../../../../platform/gateway/src/config/env";
import { AppError } from "../../../../../shared/utils/errors";

const env = loadEnv();
const apiVersion = "2023-05-15";
const endpoint = `${env.azureOpenAiEndpoint}/openai/deployments/${env.azureOpenAiEmbeddingDeployment}/embeddings?api-version=${apiVersion}`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const embedText = async (text: string): Promise<number[]> => {
  const body = { input: text };
  const headers = {
    "Content-Type": "application/json",
    "api-key": env.azureOpenAiApiKey
  };

  let attempt = 0;
  const maxAttempts = 2;
  while (attempt < maxAttempts) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (!response.ok) {
        throw new AppError("Embedding service unavailable", { status: 503, code: "EMBED_FAIL" });
      }
      const data = (await response.json()) as any;
      const embedding = data?.data?.[0]?.embedding;
      if (!embedding || !Array.isArray(embedding)) {
        throw new AppError("Embedding response malformed", { status: 502, code: "EMBED_FAIL" });
      }
      return embedding as number[];
    } catch (err) {
      attempt += 1;
      if (attempt >= maxAttempts) {
        throw new AppError("Embedding service unavailable", { status: 503, code: "EMBED_FAIL" });
      }
      await sleep(200 * attempt);
    }
  }
  throw new AppError("Embedding service unavailable", { status: 503, code: "EMBED_FAIL" });
};

export type EmbeddedChunk = {
  chunkId: string;
  embedding: number[];
};

export const embedChunks = async (chunks: Chunk[]): Promise<EmbeddedChunk[]> => {
  const results: EmbeddedChunk[] = [];
  for (const chunk of chunks) {
    const embedding = await embedText(chunk.text);
    results.push({ chunkId: chunk.id, embedding });
  }
  return results;
};

export const embedQuery = async (text: string): Promise<number[]> => embedText(text);
