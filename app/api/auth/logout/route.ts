import { NextResponse } from "next/server";
import { signOut } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/http";

export async function POST() {
  try {
    await signOut({
      redirect: false
    });

    return NextResponse.json({
      ok: true
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
