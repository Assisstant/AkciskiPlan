import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/http";
import { createUserSchema } from "@/lib/schemas/action-plan";
import { requireApiUser } from "@/lib/session";
import { createUser, listUsers } from "@/lib/services/users";

export async function GET() {
  try {
    const actor = await requireApiUser();
    if (actor.role !== "admin") {
      return NextResponse.json({ error: "Недозволено." }, { status: 403 });
    }

    const users = await listUsers();
    return NextResponse.json({ users });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireApiUser();
    const body = createUserSchema.parse(await request.json());
    const user = await createUser(actor, body);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
