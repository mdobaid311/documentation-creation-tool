import { error, json } from "@/lib/api";
import { getGuideRepository } from "@/lib/data";
import type { AddStepInput } from "@/lib/data";

export const runtime = "nodejs";

// Add a manual step to a guide. Body: { description?, screenshot?, type? }
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/guides/[id]/steps">
) {
  const { id } = await ctx.params;
  let body: AddStepInput = {};
  try {
    body = await request.json();
  } catch {
    // empty body → blank step
  }
  const guide = await getGuideRepository().addStep(id, {
    type: body.type ?? "note",
    title: body.title,
    description: body.description,
    screenshot: body.screenshot ?? null,
    index: body.index,
  });
  if (!guide) return error("Guide not found", 404);
  return json({ guide }, { status: 201 });
}
