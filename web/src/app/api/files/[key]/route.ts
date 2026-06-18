import { readFile } from "node:fs/promises";
import { error } from "@/lib/api";
import { getLocalStorage } from "@/lib/storage";

export const runtime = "nodejs";

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  ico: "image/x-icon",
};

// Serves screenshot bytes stored by the local storage provider.
export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/files/[key]">
) {
  const { key } = await ctx.params;
  const safeKey = decodeURIComponent(key);

  // Guard against path traversal — only a bare filename is valid.
  if (safeKey.includes("/") || safeKey.includes("\\") || safeKey.includes("..")) {
    return error("Invalid file key", 400);
  }

  const ext = safeKey.split(".").pop()?.toLowerCase() ?? "";
  const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";

  try {
    const data = await readFile(getLocalStorage().resolvePath(safeKey));
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return error("File not found", 404);
  }
}
