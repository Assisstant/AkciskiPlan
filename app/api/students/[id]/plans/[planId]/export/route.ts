import { requireApiUser } from "@/lib/session";
import { exportPlan } from "@/lib/services/plans";
import { apiErrorResponse } from "@/lib/http";
import { slugify } from "@/lib/utils";

export async function GET(_: Request, context: { params: Promise<{ id: string; planId: string }> }) {
  try {
    const actor = await requireApiUser();
    const { id, planId } = await context.params;
    const payload = await exportPlan(actor, id, planId);
    const filename = `${slugify(payload.plan.profile.fullName || "student")}-${slugify(payload.plan.schoolYear)}.json`;

    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
