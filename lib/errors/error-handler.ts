import { NextResponse } from "next/server";
import { AuthError } from "../auth";
import { logger } from "../monitoring/logger";

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}

export function handleApiError(err: unknown): NextResponse<ApiError> {
  if (err instanceof AuthError) {
    return NextResponse.json(
      { error: err.message, code: "AUTH_ERROR" },
      { status: 401 }
    );
  }

  if (err instanceof ValidationError) {
    return NextResponse.json(
      { error: err.message, code: "VALIDATION_ERROR", details: err.details },
      { status: 400 }
    );
  }

  if (err instanceof NotFoundError) {
    return NextResponse.json(
      { error: err.message, code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  logger.error("Unhandled API error", { err });
  return NextResponse.json(
    { error: "Internal server error", code: "INTERNAL_ERROR" },
    { status: 500 }
  );
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  constructor(resource: string) {
    super(`${resource} not found`);
    this.name = "NotFoundError";
  }
}
