import { notFound } from "next/navigation";
import { GuideEditor } from "@/components/GuideEditor";
import { getGuideRepository } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function GuidePage(
  props: PageProps<"/guides/[id]">
) {
  const { id } = await props.params;
  const guide = await getGuideRepository().get(id);
  if (!guide) notFound();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:5000";
  return <GuideEditor initialGuide={guide} appUrl={appUrl} />;
}
