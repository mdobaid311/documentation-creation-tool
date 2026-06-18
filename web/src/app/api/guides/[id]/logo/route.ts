import { error, json } from "@/lib/api";
import { getGuideRepository } from "@/lib/data";

export const runtime = "nodejs";

// Set or clear the guide's header logo.
// Body: { image: <data URL> } to set, or { image: null } to remove.
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/guides/[id]/logo">
) {
  const { id } = await ctx.params;
  let image: string | null = null;
  try {
    image = (await request.json())?.image ?? null;
  } catch {
    return error("Invalid JSON body");
  }
  const guide = await getGuideRepository().setLogo(id, image);
  if (!guide) return error("Guide not found", 404);
  return json({ guide });
}
