export class AppError extends Error {
  status?: number;
  code?: string;

  constructor(message: string, options?: { status?: number; code?: string }) {
    super(message);
    this.status = options?.status;
    this.code = options?.code;
  }
}

export const isAppError = (err: unknown): err is AppError => err instanceof AppError;

