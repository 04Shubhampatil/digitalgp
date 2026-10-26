import type { ErrorCode } from "@/types/api";

/** Error that maps directly to an HTTP response. Services throw these; the http layer renders them. */
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const Errors = {
  unauthenticated: (message = "Authentication required") => new AppError("UNAUTHENTICATED", 401, message),
  forbidden: (message = "You do not have permission to perform this action") =>
    new AppError("FORBIDDEN", 403, message),
  /** Also used to hide the existence of records outside the caller's scope. */
  notFound: (entity = "Resource") => new AppError("NOT_FOUND", 404, `${entity} not found`),
  conflict: (message: string, details?: unknown) => new AppError("CONFLICT", 409, message, details),
  validation: (details: unknown, message = "Invalid request") =>
    new AppError("VALIDATION_ERROR", 400, message, details),
  badRequest: (message: string, details?: unknown) => new AppError("BAD_REQUEST", 400, message, details),
  rateLimited: (retryAfterSeconds: number) =>
    new AppError("RATE_LIMITED", 429, "Too many attempts. Please try again later.", { retryAfterSeconds }),
  invalidTransition: (from: string, to: string) =>
    new AppError("INVALID_TRANSITION", 409, `Cannot move content from ${from} to ${to}`, { from, to }),
};

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
