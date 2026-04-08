import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/http";
import { createPlanSchema } from "@/lib/schemas/action-plan";
import { requireApiUser } from "@/lib/session";
import { createPlanForStudent, listPlansForStudent } from "@/lib/services/plans";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id } = await context.params;
    const plans = await listPlansForStudent(actor, id);
    return NextResponse.json({ plans });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id } = await context.params;
    const body = createPlanSchema.parse(await request.json());
    const plan = await createPlanForStudent(actor, id, body);
    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
