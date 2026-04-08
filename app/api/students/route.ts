import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/http";
import { createStudentSchema } from "@/lib/schemas/action-plan";
import { requireApiUser } from "@/lib/session";
import { createStudent, listStudentsForActor } from "@/lib/services/students";

export async function GET() {
  try {
    const actor = await requireApiUser();
    const students = await listStudentsForActor(actor);
    return NextResponse.json({ students });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireApiUser();
    const body = createStudentSchema.parse(await request.json());
    const result = await createStudent(actor, body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
