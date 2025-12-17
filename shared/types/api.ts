import type { Role } from "./domain";

export type RequestContext = {
  requestId: string;
  userId?: string;
  tenantId?: string;
  role?: Role;
  ip?: string;
  userAgent?: string;
};

export type RequestWithContext<TParams = any, TResBody = any, TReqBody = any, TQuery = any> =
  ExpressRequest<TParams, TResBody, TReqBody, TQuery> & { context?: RequestContext };

// Local alias keeps Express imports centralized for future augmentation.
type ExpressRequest<TParams, TResBody, TReqBody, TQuery> = import("express").Request<
  TParams,
  TResBody,
  TReqBody,
  TQuery
>;
