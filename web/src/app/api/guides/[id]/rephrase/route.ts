import { error, json } from "@/lib/api";
import { generateGuideContent, isAiConfigured } from "@/lib/ai";
import { getGuideRepository } from "@/lib/data";

export const runtime = "nodejs";
export const maxDuration = 60; // model calls can take a few seconds

// Generate a polished title, description, and per-step text for a guide
// by inferring the overall flow from its captured steps.
export async function POST(
  _req: Request,
  ctx: RouteContext<"/api/guides/[id]/rephrase">
) {
  const { id } = await ctx.params;

  if (!isAiConfigured()) {
    return error(
      "AI isn't configured. Add GEMINI_API_KEY to web/.env and restart the dev server.",
      503
    );
  }

  const repo = getGuideRepository();
  const guide = await repo.get(id);
  if (!guide) return error("Guide not found", 404);

  if (guide.steps.length === 0) return json({ guide });

  const payloadSteps = guide.steps.map((step, index) => ({
    index,
    type: step.type,
    title: step.title || "",
    description: step.description || "",
    pageUrl: step.pageUrl || "",
  }));

  let generated;
  try {
    generated = await generateGuideContent({
      title: guide.title || "",
      description: guide.description || "",
      sourceUrl: guide.sourceUrl || "",
      steps: payloadSteps,
    });
  } catch (e) {
    return error(
      `Generation failed: ${(e as Error).message || "unknown error"}`,
      502
    );
  }

  let updated = guide;

  const newTitle = generated.title?.trim();
  const newDescription = generated.description?.trim();
  if (newTitle || newDescription) {
    const next = await repo.update(id, {
      ...(newTitle ? { title: newTitle } : {}),
      ...(newDescription ? { description: newDescription } : {}),
    });
    if (next) updated = next;
  }

  for (const item of generated.steps ?? []) {
    if (
      !Number.isInteger(item.index) ||
      item.index < 0 ||
      item.index >= guide.steps.length
    )
      continue;
    const stepId = guide.steps[item.index].id;
    const patch: { title?: string; description?: string } = {};
    if (typeof item.title === "string" && item.title.trim()) {
      patch.title = item.title.trim();
    }
    if (typeof item.description === "string" && item.description.trim()) {
      patch.description = item.description.trim();
    }
    if (Object.keys(patch).length === 0) continue;
    const next = await repo.updateStep(id, stepId, patch);
    if (next) updated = next;
  }

  return json({ guide: updated });
}
