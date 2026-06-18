import { error, json } from "@/lib/api";
import { getGuideRepository } from "@/lib/data";

export const runtime = "nodejs";

// Toggle public sharing. Body: { enabled: boolean }
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/guides/[id]/share">
) {
  const { id } = await ctx.params;
  let enabled = true;
  try {
    const body = await request.json();
    if (typeof body?.enabled === "boolean") enabled = body.enabled;
  } catch {
    // default: enable
  }
  const guide = await getGuideRepository().setSharing(id, enabled);
  if (!guide) return error("Guide not found", 404);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:5000";
  const shareUrl =
    guide.shareEnabled && guide.shareId
      ? `${appUrl}/share/${guide.shareId}`
      : null;
  return json({ guide, shareUrl });
}
