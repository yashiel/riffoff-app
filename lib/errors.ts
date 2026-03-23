export type ErrorCode =
  | "AUTH_REQUIRED"
  | "AUTH_INVALID_CREDENTIALS"
  | "AUTH_SESSION_EXPIRED"
  | "AUTH_FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "PAYMENT_FAILED"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;

  constructor(code: ErrorCode, message: string, statusCode = 500) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
  }

  static authRequired() {
    return new AppError("AUTH_REQUIRED", "Authentication required", 401);
  }

  static forbidden() {
    return new AppError("AUTH_FORBIDDEN", "Access denied", 403);
  }

  static notFound(resource = "Resource") {
    return new AppError("NOT_FOUND", `${resource} not found`, 404);
  }

  static validation(message: string) {
    return new AppError("VALIDATION_ERROR", message, 400);
  }

  static conflict(message: string) {
    return new AppError("CONFLICT", message, 409);
  }

  static rateLimited() {
    return new AppError("RATE_LIMITED", "Too many requests", 429);
  }

  static internal(message = "Something went wrong") {
    return new AppError("INTERNAL_ERROR", message, 500);
  }
}

/** Safe error message for client — never expose internals */
export function getClientMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}
