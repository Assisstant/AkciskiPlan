import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/http";
import { requireApiUser } from "@/lib/session";
import { deleteStudent, getStudentForActor, updateStudent } from "@/lib/services/students";
import { updateStudentSchema } from "@/lib/schemas/action-plan";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id } = await context.params;
    const student = await getStudentForActor(actor, id);
    return NextResponse.json({ student });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id } = await context.params;
    const body = updateStudentSchema.parse(await request.json());
    const student = await updateStudent(actor, id, body);
    return NextResponse.json({ student });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id } = await context.params;
    const result = await deleteStudent(actor, id);
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
