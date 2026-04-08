import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/http";
import { updateUserSchema } from "@/lib/schemas/action-plan";
import { requireApiUser } from "@/lib/session";
import { updateUser } from "@/lib/services/users";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id } = await context.params;
    const body = updateUserSchema.parse(await request.json());
    const user = await updateUser(actor, id, body);
    return NextResponse.json({ user });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
