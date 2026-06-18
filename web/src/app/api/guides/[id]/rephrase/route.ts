import { error, json } from "@/lib/api";
import { isAiConfigured, rephraseSteps } from "@/lib/ai";
import { getGuideRepository } from "@/lib/data";

export const runtime = "nodejs";
export const maxDuration = 60; // model calls can take a few seconds

// Rephrase every step description in the guide using Claude.
export async function POST(
  _req: Request,
  ctx: RouteContext<"/api/guides/[id]/rephrase">
) {
  const { id } = await ctx.params;

  if (!isAiConfigured()) {
    return error(
      "AI isn't configured. Add ANTHROPIC_API_KEY to web/.env and restart the dev server.",
      503
    );
  }

  const repo = getGuideRepository();
  const guide = await repo.get(id);
  if (!guide) return error("Guide not found", 404);

  // Only rephrase steps that actually have text.
  const targets = guide.steps
    .map((step, index) => ({ index, text: step.description || step.title || "" }))
    .filter((t) => t.text.trim().length > 0);

  if (targets.length === 0) return json({ guide });

  let rephrased: string[];
  try {
    rephrased = await rephraseSteps(targets.map((t) => t.text));
  } catch (e) {
    return error(
      `Rephrase failed: ${(e as Error).message || "unknown error"}`,
      502
    );
  }

  let updated = guide;
  for (let i = 0; i < targets.length; i++) {
    const stepId = guide.steps[targets[i].index].id;
    const next = await repo.updateStep(id, stepId, {
      description: rephrased[i],
    });
    if (next) updated = next;
  }

  return json({ guide: updated });
}
