import { error } from "@/lib/api";
import { getGuideRepository } from "@/lib/data";
import { guideToHtml, guideToMarkdown } from "@/lib/export";

export const runtime = "nodejs";

// GET /api/guides/[id]/export?format=md|html
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/guides/[id]/export">
) {
  const { id } = await ctx.params;
  const format = new URL(request.url).searchParams.get("format") ?? "md";

  const guide = await getGuideRepository().get(id);
  if (!guide) return error("Guide not found", 404);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:5000";
  const slug = guide.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "guide";

  if (format === "html" || format === "print") {
    // `print` (or ?print=1) opens the premium document inline and auto-triggers
    // the print dialog so the user can Save as PDF; plain html downloads.
    const wantsPrint =
      format === "print" ||
      new URL(request.url).searchParams.get("print") === "1";
    const html = guideToHtml(guide, baseUrl, { autoPrint: wantsPrint });
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": wantsPrint
          ? "inline"
          : `attachment; filename="${slug}.html"`,
      },
    });
  }

  return new Response(guideToMarkdown(guide, baseUrl), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.md"`,
    },
  });
}
