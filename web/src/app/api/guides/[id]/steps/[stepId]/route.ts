import { error, json } from "@/lib/api";
import { getGuideRepository } from "@/lib/data";
import type { UpdateStepInput } from "@/lib/data";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/guides/[id]/steps/[stepId]">
) {
  const { id, stepId } = await ctx.params;
  let body: UpdateStepInput;
  try {
    body = await request.json();
  } catch {
    return error("Invalid JSON body");
  }
  const guide = await getGuideRepository().updateStep(id, stepId, {
    title: body.title,
    description: body.description,
    annotation: body.annotation,
  });
  if (!guide) return error("Step not found", 404);
  return json({ guide });
}

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/guides/[id]/steps/[stepId]">
) {
  const { id, stepId } = await ctx.params;
  const guide = await getGuideRepository().removeStep(id, stepId);
  if (!guide) return error("Step not found", 404);
  return json({ guide });
}
