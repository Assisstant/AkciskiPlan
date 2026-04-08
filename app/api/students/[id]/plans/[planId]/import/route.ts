import { apiErrorResponse } from "@/lib/http";
import { importPlanSchema } from "@/lib/schemas/action-plan";
import { requireApiUser } from "@/lib/session";
import { importPlan } from "@/lib/services/plans";

export async function POST(request: Request, context: { params: Promise<{ id: string; planId: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id, planId } = await context.params;
    const body = importPlanSchema.parse(await request.json());
    const result = await importPlan(actor, id, planId, body.source);
    return Response.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
