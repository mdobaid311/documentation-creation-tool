import { notFound } from "next/navigation";
import { GuideAvatar } from "@/components/GuideAvatar";
import { GuideCover } from "@/components/GuideCover";
import { NoteIcon } from "@/components/NoteIcon";
import { RichText } from "@/components/RichText";
import { ScreenshotFrame } from "@/components/ScreenshotFrame";
import { getGuideRepository } from "@/lib/data";
import { NOTE_LABEL, isNoteStep, noteKindOf } from "@/lib/steps";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/share/[shareId]">) {
  const { shareId } = await props.params;
  const guide = await getGuideRepository().getByShareId(shareId);
  return { title: guide ? `${guide.title} — Docs Capture` : "Guide not found" };
}

export default async function SharePage(props: PageProps<"/share/[shareId]">) {
  const { shareId } = await props.params;
  const guide = await getGuideRepository().getByShareId(shareId);
  if (!guide) notFound();

  return (
    <>
      {/* Print-only PDF cover page */}
      <GuideCover guide={guide} />

      <div className="mx-auto max-w-3xl px-5 py-12">
        {/* Header (on-screen only — the PDF cover page already shows this) */}
        <header className="no-print mb-10 flex items-start gap-4">
        <GuideAvatar logoUrl={guide.logoUrl} size={60} />
        <div className="flex-1 pt-1">
          <h1 className="text-3xl font-bold leading-tight tracking-tight">
            {guide.title}
          </h1>
          {guide.description && (
            <p className="mt-2 leading-relaxed text-[var(--muted)]">
              {guide.description}
            </p>
          )}
        </div>
      </header>

      {/* Steps */}
      <ol className="flex flex-col gap-6">
        {(() => {
          let n = 0;
          return guide.steps.map((step, i) => {
            if (isNoteStep(step)) {
              const kind = noteKindOf(step);
              return (
                <li key={step.id} className={`callout ${kind}`}>
                  <span className="callout-ic">
                    <NoteIcon kind={kind} size={20} />
                  </span>
                  <div className="callout-body min-w-0 flex-1">
                    <div className="callout-kind">{NOTE_LABEL[kind]}</div>
                    <p className="callout-text break-words">
                      <RichText text={step.description || step.title || NOTE_LABEL[kind]} />
                    </p>
                  </div>
                </li>
              );
            }
            const num = ++n;
            return (
              <li key={step.id} className="step-card flex flex-col gap-3">
                <div className="flex items-start gap-3.5">
                  <span className="step-num mt-0.5">{num}</span>
                  <p className="min-w-0 flex-1 break-words text-[16px] leading-7 text-[var(--foreground)]">
                    <RichText text={step.description || step.title || `Step ${num}`} />
                  </p>
                </div>
                {step.screenshotUrl && <ScreenshotFrame step={step} index={i} />}
              </li>
            );
          });
        })()}
      </ol>

        <footer className="mt-12 border-t border-[var(--border)] pt-6 text-sm text-[var(--muted)]">
          Created with <span className="font-semibold">Docs Capture</span>
        </footer>
      </div>
    </>
  );
}
