import Link from "next/link";
import { GuideCard } from "@/components/GuideCard";
import { getGuideRepository } from "@/lib/data";

// Server component: read guides directly from the repository.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const guides = await getGuideRepository().list();

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My guides</h1>
          <p className="mt-1 text-[var(--muted)]">
            {guides.length === 0
              ? "Capture your first process to get started."
              : `${guides.length} guide${guides.length === 1 ? "" : "s"} captured.`}
          </p>
        </div>
        <Link href="/install" className="btn btn-primary">
          <RecordIcon /> Capture a process
        </Link>
      </div>

      {guides.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map((g) => (
            <GuideCard key={g.id} guide={g} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card flex flex-col items-center gap-4 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
        <RecordIcon size={26} />
      </div>
      <h2 className="text-xl font-semibold">No guides yet</h2>
      <p className="max-w-md text-[var(--muted)]">
        Install the browser extension, click <strong>Start capture</strong>, and
        walk through any process. Each click is captured and turned into a
        step-by-step guide automatically.
      </p>
      <Link href="/install" className="btn btn-primary mt-2">
        Get the extension
      </Link>
    </div>
  );
}

function RecordIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4" fill="currentColor" />
    </svg>
  );
}
