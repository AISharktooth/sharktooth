import type { Role } from "../../../../../shared/types/domain";

export type Permission = "INGEST" | "SEARCH" | "ANSWER" | "AUDIT_VIEW" | "PII_READ" | "PII_WRITE";

export const permissionsByRole: Record<Role, Permission[]> = {
  TECH: ["SEARCH", "ANSWER"],
  ADMIN: ["INGEST", "SEARCH", "ANSWER", "AUDIT_VIEW", "PII_WRITE", "PII_READ"],
  PII_APPROVED: ["SEARCH", "ANSWER", "PII_READ"]
};

