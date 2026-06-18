import { error, json } from "@/lib/api";
import { getGuideRepository } from "@/lib/data";
import type { UpdateGuideInput } from "@/lib/data";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/guides/[id]">
) {
  const { id } = await ctx.params;
  const guide = await getGuideRepository().get(id);
  if (!guide) return error("Guide not found", 404);
  return json({ guide });
}

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/guides/[id]">
) {
  const { id } = await ctx.params;
  let body: UpdateGuideInput;
  try {
    body = await request.json();
  } catch {
    return error("Invalid JSON body");
  }
  const guide = await getGuideRepository().update(id, {
    title: body.title,
    description: body.description,
    status: body.status,
  });
  if (!guide) return error("Guide not found", 404);
  return json({ guide });
}

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/guides/[id]">
) {
  const { id } = await ctx.params;
  const ok = await getGuideRepository().remove(id);
  if (!ok) return error("Guide not found", 404);
  return json({ ok: true });
}
