import { error, json } from "@/lib/api";
import { getGuideRepository } from "@/lib/data";

export const runtime = "nodejs";

// Duplicate a step, inserting the copy right after the original.
export async function POST(
  _req: Request,
  ctx: RouteContext<"/api/guides/[id]/steps/[stepId]/duplicate">
) {
  const { id, stepId } = await ctx.params;
  const guide = await getGuideRepository().duplicateStep(id, stepId);
  if (!guide) return error("Step not found", 404);
  return json({ guide }, { status: 201 });
}
