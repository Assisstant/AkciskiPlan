import { NextResponse } from "next/server";

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export function apiErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: error.message,
        details: error.details ?? null
      },
      { status: error.status }
    );
  }

  console.error(error);

  return NextResponse.json(
    {
      error: "Настана неочекувана грешка."
    },
    { status: 500 }
  );
}
