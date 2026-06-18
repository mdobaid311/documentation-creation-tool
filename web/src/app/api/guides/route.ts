import { json } from "@/lib/api";
import { getGuideRepository } from "@/lib/data";

export const runtime = "nodejs";

// List all guides (dashboard).
export async function GET() {
  const guides = await getGuideRepository().list();
  return json({ guides });
}
