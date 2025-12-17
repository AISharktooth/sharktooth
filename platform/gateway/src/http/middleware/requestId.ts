import { randomUUID } from "crypto";
import type { RequestHandler } from "express";
import type { RequestContext, RequestWithContext } from "../../../../../shared/types/api";

export const requestId: RequestHandler = (req, _res, next) => {
  const ctxReq = req as RequestWithContext;
  const existingContext = (ctxReq.context ?? {}) as Partial<RequestContext>;
  ctxReq.context = {
    ...existingContext,
    requestId: existingContext.requestId ?? req.header("x-request-id") ?? randomUUID(),
    ip: req.ip,
    userAgent: req.get("user-agent") ?? existingContext.userAgent
  };
  next();
};
