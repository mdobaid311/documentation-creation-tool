import { error, json } from "@/lib/api";
import { getGuideRepository } from "@/lib/data";

export const runtime = "nodejs";

// Set/replace a step's screenshot. Body: { image: <data URL or base64> }
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/guides/[id]/steps/[stepId]/image">
) {
  const { id, stepId } = await ctx.params;
  let image: string | undefined;
  try {
    image = (await request.json())?.image;
  } catch {
    return error("Invalid JSON body");
  }
  if (!image) return error("Missing image", 422);

  const guide = await getGuideRepository().setStepImage(id, stepId, image);
  if (!guide) return error("Step not found", 404);
  return json({ guide });
}
