import { chunkText } from "../../workloads/ro-assistant/src/services/ingest/chunk";
import { redactPii } from "../../workloads/ro-assistant/src/services/ingest/redact";

const sample = "Customer email john.doe@example.com and phone 555-123-4567 with VIN 1HGCM82633A123456";
const redacted = redactPii(sample);
const chunks = chunkText(redacted);

const hasPii = chunks.some((c) => {
  return (
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(c.text) ||
    /(\+?\d[\d\s().-]{8,}\d)/.test(c.text) ||
    /\b[0-9A-HJ-NPR-Z]{17}\b/i.test(c.text)
  );
});

if (hasPii) {
  console.error("PII detected in chunks:", chunks);
  process.exit(1);
}

console.log("Redaction harness passed: no PII detected in chunks.");
