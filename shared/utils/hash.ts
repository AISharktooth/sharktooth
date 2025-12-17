import { createHash } from "crypto";

export const sha256 = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");

