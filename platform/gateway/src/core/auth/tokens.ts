import type { Role } from "../../../../../shared/types/domain";
import { AppError } from "../../../../../shared/utils/errors";
import { loadEnv } from "../../config/env";
import jwt from "jsonwebtoken";

export type VerifiedToken = {
  userId: string;
  tenantId: string;
  role: Role;
};

const envConfig = loadEnv();

export const issueToken = async (claims: VerifiedToken) => {
  const payload = {
    user_id: claims.userId,
    tenant_id: claims.tenantId,
    role: claims.role
  };
  return jwt.sign(payload, envConfig.jwtSecret as jwt.Secret, {
    algorithm: "HS256",
    expiresIn: envConfig.jwtExpiresIn
  } as jwt.SignOptions);
};

export const verifyToken = async (token: string): Promise<VerifiedToken> => {
  try {
    const decoded = jwt.verify(token, envConfig.jwtSecret as jwt.Secret) as jwt.JwtPayload;
    const userId = decoded.user_id as string;
    const tenantId = decoded.tenant_id as string;
    const role = decoded.role as Role;
    if (!userId || !tenantId || !role) {
      throw new Error("missing claims");
    }
    return { userId, tenantId, role };
  } catch (err) {
    throw new AppError("Invalid or unsupported token", { status: 401, code: "AUTH_INVALID" });
  }
};
