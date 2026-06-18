import { corsPreflight, error, json } from "@/lib/api";
import { getGuideRepository } from "@/lib/data";
import type { CapturedStepInput, CreateGuideInput } from "@/lib/data";

export const runtime = "nodejs";

export function OPTIONS() {
  return corsPreflight();
}

// Receives a finished recording from the browser extension and turns it into a
// guide. Body shape:
// { title, description?, sourceUrl?, steps: CapturedStepInput[] }
export async function POST(request: Request) {
  let body: Partial<CreateGuideInput>;
  try {
    body = await request.json();
  } catch {
    return error("Invalid JSON body", 400, true);
  }

  if (!Array.isArray(body.steps) || body.steps.length === 0) {
    return error("A recording needs at least one step", 422, true);
  }

  const steps: CapturedStepInput[] = body.steps.map((s) => ({
    type: s.type ?? "click",
    title: s.title ?? "",
    description: s.description ?? "",
    screenshot: s.screenshot ?? null,
    annotation: s.annotation ?? null,
    pageUrl: s.pageUrl ?? "",
  }));

  const guide = await getGuideRepository().create({
    title: body.title?.trim() || "Untitled guide",
    description: body.description ?? "",
    sourceUrl: body.sourceUrl ?? "",
    faviconUrl: body.faviconUrl,
    steps,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:5000";
  return json(
    { id: guide.id, editUrl: `${appUrl}/guides/${guide.id}`, guide },
    { status: 201, cors: true }
  );
}
