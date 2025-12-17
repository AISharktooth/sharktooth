// Redact common PII patterns. This is intentionally conservative to avoid leaking PII.
export const redactPii = (text: string): string => {
  let result = text;

  // Emails
  result = result.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]");

  // Phone numbers (simple heuristic for 10+ digits with separators)
  result = result.replace(/(\+?\d[\d\s().-]{8,}\d)/g, "[REDACTED_PHONE]");

  // VINs (17 chars alphanumeric excluding I,O,Q)
  result = result.replace(/\b[0-9A-HJ-NPR-Z]{17}\b/gi, "[REDACTED_VIN]");

  // Addresses (very rough heuristic: number + street words)
  result = result.replace(/\b\d{1,5}\s+[A-Z0-9#.,\s]{3,}\b/gi, "[REDACTED_ADDRESS]");

  return result;
};
