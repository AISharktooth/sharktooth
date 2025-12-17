import { AppError } from "../../../../../shared/utils/errors";

const patterns = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, // email
  /(\+?\d[\d\s().-]{8,}\d)/, // phone heuristic
  /\b[0-9A-HJ-NPR-Z]{17}\b/i, // VIN
  /\b\d{1,5}\s+[A-Z0-9#.,\s]{3,}\b/i // address heuristic
];

export const assertNoPii = (text: string) => {
  const matched = patterns.find((re) => re.test(text));
  if (matched) {
    throw new AppError("PII detected in content", { status: 400, code: "PII_DETECTED" });
  }
};
