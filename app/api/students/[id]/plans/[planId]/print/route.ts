import { apiErrorResponse } from "@/lib/http";
import { renderPrintablePlan } from "@/lib/print";
import { requireApiUser } from "@/lib/session";
import { getPlanForActor } from "@/lib/services/plans";

export async function GET(_: Request, context: { params: Promise<{ id: string; planId: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id, planId } = await context.params;
    const plan = await getPlanForActor(actor, id, planId);
    const html = renderPrintablePlan(plan);

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8"
      }
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
