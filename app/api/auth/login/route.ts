import { AuthError } from "next-auth";
import { NextResponse } from "next/server";
import { signIn } from "@/lib/auth";
import { apiErrorResponse, ApiError } from "@/lib/http";
import { loginBodySchema } from "@/lib/schemas/action-plan";

export async function POST(request: Request) {
  try {
    const body = loginBodySchema.parse(await request.json());
    await signIn("credentials", {
      username: body.username.trim().toLowerCase(),
      password: body.password,
      redirect: false
    });

    return NextResponse.json({
      ok: true
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        {
          error: "Погрешно корисничко име или лозинка."
        },
        { status: 401 }
      );
    }

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        {
          error: "Невалиден формат за најава."
        },
        { status: 400 }
      );
    }

    if (error instanceof ApiError) {
      return apiErrorResponse(error);
    }

    return apiErrorResponse(error);
  }
}
