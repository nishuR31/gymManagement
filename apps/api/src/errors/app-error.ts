export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  public constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const errors = {
  badRequest: (message: string, details?: unknown): AppError => new AppError(400, "BAD_REQUEST", message, details),
  unauthorized: (message = "Authentication required"): AppError => new AppError(401, "UNAUTHORIZED", message),
  forbidden: (message = "Insufficient permissions"): AppError => new AppError(403, "FORBIDDEN", message),
  notFound: (message: string): AppError => new AppError(404, "NOT_FOUND", message),
  conflict: (message: string): AppError => new AppError(409, "CONFLICT", message),
  domain: (statusCode: number, code: string, message: string, details?: unknown): AppError =>
    new AppError(statusCode, code, message, details),
  tooManyRequests: (message = "Too many requests"): AppError => new AppError(429, "TOO_MANY_REQUESTS", message)
};
