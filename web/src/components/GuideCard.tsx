"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/client";
import { formatDate } from "@/lib/format";
import type { GuideSummary } from "@/lib/data";

export function GuideCard({ guide }: { guide: GuideSummary }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete(e: React.MouseEvent) {
    e.preventDefault();
    if (!confirm(`Delete "${guide.title}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await api.deleteGuide(guide.id);
      router.refresh();
    } catch (err) {
      alert((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Link
      href={`/guides/${guide.id}`}
      className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md"
      style={{ opacity: busy ? 0.5 : 1 }}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-[var(--background)]">
        {guide.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={guide.coverUrl}
            alt=""
            className="h-full w-full object-cover object-top transition group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
            No preview
          </div>
        )}
        <span className="absolute left-3 top-3 chip chip-muted">
          {guide.stepCount} step{guide.stepCount === 1 ? "" : "s"}
        </span>
        {guide.shareEnabled && (
          <span className="absolute right-3 top-3 chip">Shared</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="line-clamp-1 flex items-center gap-2 font-semibold">
          {guide.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={guide.logoUrl}
              alt=""
              className="h-4 w-4 flex-none rounded-sm object-contain"
            />
          )}
          <span className="line-clamp-1">{guide.title}</span>
        </h3>
        <p className="line-clamp-2 flex-1 text-sm text-[var(--muted)]">
          {guide.description || "No description"}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-[var(--muted)]">
            {formatDate(guide.updatedAt)}
          </span>
          <button onClick={onDelete} className="btn btn-danger btn-sm" disabled={busy}>
            Delete
          </button>
        </div>
      </div>
    </Link>
  );
}
