import type { RequestContext } from "../../../../../shared/types/api";
import { AppError } from "../../../../../shared/utils/errors";

export const assertTenantContext = (ctx?: RequestContext): Required<RequestContext> => {
  if (!ctx?.tenantId || !ctx?.userId || !ctx?.role || !ctx?.requestId) {
    throw new AppError("Tenant context incomplete", { status: 400, code: "TENANT_CONTEXT_MISSING" });
  }

  return ctx as Required<RequestContext>;
};

