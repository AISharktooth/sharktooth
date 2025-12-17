import { assertNoPii } from "../../workloads/ro-assistant/src/services/ingest/piiScan";

const badSamples = [
  "Contact me at john.doe@example.com",
  "Phone: 555-123-4567",
  "VIN 1HGCM82633A123456",
  "123 Main St, Springfield"
];

let failedCount = 0;
for (const sample of badSamples) {
  try {
    assertNoPii(sample);
    console.error("PII was not detected for sample:", sample);
    failedCount++;
  } catch {
    // expected
  }
}

if (failedCount > 0) {
  console.error("PII scan harness FAILED");
  process.exit(1);
}

console.log("PII scan harness passed: all PII samples rejected.");
