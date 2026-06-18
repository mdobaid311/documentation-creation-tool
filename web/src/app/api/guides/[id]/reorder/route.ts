import { error, json } from "@/lib/api";
import { getGuideRepository } from "@/lib/data";

export const runtime = "nodejs";

// Reorder steps. Body: { orderedStepIds: string[] }
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/guides/[id]/reorder">
) {
  const { id } = await ctx.params;
  let orderedStepIds: string[] = [];
  try {
    const body = await request.json();
    orderedStepIds = Array.isArray(body?.orderedStepIds)
      ? body.orderedStepIds
      : [];
  } catch {
    return error("Invalid JSON body");
  }
  const guide = await getGuideRepository().reorderSteps(id, orderedStepIds);
  if (!guide) return error("Guide or step not found", 404);
  return json({ guide });
}
