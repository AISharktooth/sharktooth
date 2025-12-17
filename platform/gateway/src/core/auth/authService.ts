export type AuthSession = {
  userId: string;
  tenantId: string;
  role: string;
  token: string;
};

// Placeholder auth service; real implementation will validate credentials and issue tokens.
export const authenticate = async (): Promise<AuthSession> => {
  throw new Error("Auth service not implemented.");
};

