import { describe, it, expect } from "vitest";
import { AppError, getClientMessage } from "../errors";

describe("AppError", () => {
  it("creates an error with code and status", () => {
    const err = new AppError("AUTH_REQUIRED", "Please log in", 401);
    expect(err.code).toBe("AUTH_REQUIRED");
    expect(err.message).toBe("Please log in");
    expect(err.statusCode).toBe(401);
    expect(err.name).toBe("AppError");
  });

  it("defaults statusCode to 500", () => {
    const err = new AppError("INTERNAL_ERROR", "Oops");
    expect(err.statusCode).toBe(500);
  });

  it("is an instance of Error", () => {
    const err = AppError.notFound("Event");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  describe("factory methods", () => {
    it("authRequired returns 401", () => {
      const err = AppError.authRequired();
      expect(err.code).toBe("AUTH_REQUIRED");
      expect(err.statusCode).toBe(401);
    });

    it("forbidden returns 403", () => {
      const err = AppError.forbidden();
      expect(err.code).toBe("AUTH_FORBIDDEN");
      expect(err.statusCode).toBe(403);
    });

    it("notFound returns 404 with custom resource name", () => {
      const err = AppError.notFound("Ticket");
      expect(err.message).toBe("Ticket not found");
      expect(err.statusCode).toBe(404);
    });

    it("notFound defaults to 'Resource'", () => {
      const err = AppError.notFound();
      expect(err.message).toBe("Resource not found");
    });

    it("validation returns 400", () => {
      const err = AppError.validation("Invalid email");
      expect(err.code).toBe("VALIDATION_ERROR");
      expect(err.statusCode).toBe(400);
      expect(err.message).toBe("Invalid email");
    });

    it("conflict returns 409", () => {
      const err = AppError.conflict("Already exists");
      expect(err.code).toBe("CONFLICT");
      expect(err.statusCode).toBe(409);
    });

    it("rateLimited returns 429", () => {
      const err = AppError.rateLimited();
      expect(err.code).toBe("RATE_LIMITED");
      expect(err.statusCode).toBe(429);
    });

    it("internal returns 500 with default message", () => {
      const err = AppError.internal();
      expect(err.message).toBe("Something went wrong");
      expect(err.statusCode).toBe(500);
    });

    it("internal accepts custom message", () => {
      const err = AppError.internal("DB connection failed");
      expect(err.message).toBe("DB connection failed");
    });
  });
});

describe("getClientMessage", () => {
  it("returns AppError message for AppError instances", () => {
    const err = AppError.validation("Name is required");
    expect(getClientMessage(err)).toBe("Name is required");
  });

  it("returns generic message for unknown errors", () => {
    expect(getClientMessage(new Error("secret internal details"))).toBe(
      "Something went wrong. Please try again.",
    );
  });

  it("returns generic message for non-Error values", () => {
    expect(getClientMessage("string error")).toBe(
      "Something went wrong. Please try again.",
    );
    expect(getClientMessage(null)).toBe(
      "Something went wrong. Please try again.",
    );
    expect(getClientMessage(undefined)).toBe(
      "Something went wrong. Please try again.",
    );
  });
});
