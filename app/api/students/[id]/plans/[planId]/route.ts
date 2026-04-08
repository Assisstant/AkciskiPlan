import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/http";
import { requireApiUser } from "@/lib/session";
import { getPlanForActor, updatePlan } from "@/lib/services/plans";
import { updatePlanSchema } from "@/lib/schemas/action-plan";

export async function GET(_: Request, context: { params: Promise<{ id: string; planId: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id, planId } = await context.params;
    const plan = await getPlanForActor(actor, id, planId);
    return NextResponse.json({ plan });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string; planId: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id, planId } = await context.params;
    const body = updatePlanSchema.parse(await request.json());
    const plan = await updatePlan(actor, id, planId, {
      expectedVersion: body.expectedVersion,
      note: body.note,
      payload: body.payload ?? null
    });
    return NextResponse.json({ plan });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
