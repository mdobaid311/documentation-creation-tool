"use client";

import Link from "next/link";
import { Fragment, useRef, useState } from "react";
import { GuideAvatar } from "@/components/GuideAvatar";
import { GuideCover } from "@/components/GuideCover";
import { StepCard } from "@/components/StepCard";
import { api } from "@/lib/client";
import { readImageFile } from "@/lib/file";
import { isNoteStep } from "@/lib/steps";
import type { Guide, StepAnnotation } from "@/lib/data";

export function GuideEditor({
  initialGuide,
  appUrl,
}: {
  initialGuide: Guide;
  appUrl: string;
}) {
  const [guide, setGuide] = useState(initialGuide);
  const [title, setTitle] = useState(initialGuide.title);
  const [description, setDescription] = useState(initialGuide.description);
  const [shareUrl, setShareUrl] = useState<string | null>(
    initialGuide.shareEnabled && initialGuide.shareId
      ? `${appUrl}/share/${initialGuide.shareId}`
      : null
  );
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const titleDirty = title !== guide.title || description !== guide.description;

  async function saveMeta() {
    if (!titleDirty) return;
    const updated = await api.updateGuide(guide.id, { title, description });
    setGuide(updated);
    setSavedAt(new Date().toLocaleTimeString());
  }

  // --- header logo upload ---
  const logoRef = useRef<HTMLInputElement>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLogoBusy(true);
    try {
      setGuide(await api.setLogo(guide.id, await readImageFile(file)));
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLogoBusy(false);
    }
  }
  async function removeLogo() {
    setLogoBusy(true);
    try {
      setGuide(await api.setLogo(guide.id, null));
    } finally {
      setLogoBusy(false);
    }
  }

  async function saveStep(
    stepId: string,
    data: { title: string; description: string }
  ) {
    setGuide(await api.updateStep(guide.id, stepId, data));
  }

  async function saveAnnotation(stepId: string, annotation: StepAnnotation) {
    setGuide(await api.updateStep(guide.id, stepId, { annotation }));
  }

  async function setStepImage(stepId: string, image: string) {
    setGuide(await api.setStepImage(guide.id, stepId, image));
  }

  const [adding, setAdding] = useState(false);
  async function addStep(index?: number) {
    setAdding(true);
    try {
      setGuide(await api.addStep(guide.id, index === undefined ? {} : { index }));
    } finally {
      setAdding(false);
    }
  }
  async function addNote(index?: number) {
    setAdding(true);
    try {
      setGuide(await api.addNote(guide.id, "note", index));
    } finally {
      setAdding(false);
    }
  }

  // Sequential numbers for action steps (note callouts are skipped).
  let _stepNo = 0;
  const stepNums = guide.steps.map((s) => (isNoteStep(s) ? null : ++_stepNo));

  async function deleteStep(stepId: string) {
    if (!confirm("Delete this step?")) return;
    setGuide(await api.deleteStep(guide.id, stepId));
  }

  async function move(index: number, dir: -1 | 1) {
    const ids = guide.steps.map((s) => s.id);
    const target = index + dir;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setGuide(await api.reorder(guide.id, ids));
  }

  // --- drag-and-drop reordering ---
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  function endDrag() {
    setDragIndex(null);
    setOverIndex(null);
  }
  async function dropDrag() {
    if (dragIndex === null || overIndex === null || dragIndex === overIndex) {
      endDrag();
      return;
    }
    const ids = guide.steps.map((s) => s.id);
    const [moved] = ids.splice(dragIndex, 1);
    ids.splice(overIndex, 0, moved);
    endDrag();
    setGuide(await api.reorder(guide.id, ids));
  }

  async function toggleShare() {
    const res = await api.setSharing(guide.id, !guide.shareEnabled);
    setGuide(res.guide);
    setShareUrl(res.shareUrl);
    if (res.shareUrl) await navigator.clipboard?.writeText(res.shareUrl).catch(() => {});
  }

  const [rephrasing, setRephrasing] = useState(false);
  async function rephraseDocs() {
    if (
      !confirm(
        "Rephrase every step description with AI to make them formal and clear? This rewrites the current text."
      )
    )
      return;
    setRephrasing(true);
    try {
      setGuide(await api.rephrase(guide.id));
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setRephrasing(false);
    }
  }

  return (
    <div>
      {/* Print-only PDF cover page */}
      <GuideCover guide={guide} />

      {/* Sticky toolbar */}
      <div className="no-print sticky top-15 z-10 border-b border-[var(--border)] bg-[var(--surface)]/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-5 py-2.5">
          <Link href="/" className="btn btn-ghost btn-sm">
            ← All guides
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {savedAt && (
              <span className="text-xs text-[var(--muted)]">Saved {savedAt}</span>
            )}
            <button
              onClick={rephraseDocs}
              disabled={rephrasing}
              className="btn btn-ghost btn-sm"
              title="Rewrite all step descriptions with AI to be formal and clear"
            >
              <SparkleIcon /> {rephrasing ? "Rephrasing…" : "Rephrase docs"}
            </button>
            <a href={`/api/guides/${guide.id}/export?format=md`} className="btn btn-ghost btn-sm">
              Markdown
            </a>
            <a href={`/api/guides/${guide.id}/export?format=html`} className="btn btn-ghost btn-sm">
              HTML
            </a>
            <button
              onClick={() =>
                window.open(
                  `/api/guides/${guide.id}/export?format=print`,
                  "_blank",
                  "noopener"
                )
              }
              className="btn btn-ghost btn-sm"
            >
              PDF
            </button>
            <button onClick={toggleShare} className="btn btn-primary btn-sm">
              {guide.shareEnabled ? "Sharing on" : "Share"}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-5 py-10">
        {/* Share banner */}
        {guide.shareEnabled && shareUrl && (
          <div className="no-print mb-8 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3">
            <span className="text-sm font-medium text-[var(--accent-strong)]">
              Public link:
            </span>
            <code className="flex-1 truncate text-sm">{shareUrl}</code>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigator.clipboard?.writeText(shareUrl)}
            >
              Copy
            </button>
            <a href={shareUrl} target="_blank" className="btn btn-ghost btn-sm">
              Open
            </a>
          </div>
        )}

        {/* Header (on-screen only — the PDF cover page already shows this) */}
        <header className="no-print mb-10 flex items-start gap-4">
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => logoRef.current?.click()}
              disabled={logoBusy}
              title="Upload a logo"
              className="group/logo relative shrink-0 rounded-full transition focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              <GuideAvatar logoUrl={guide.logoUrl} size={60} />
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-[11px] font-semibold text-white opacity-0 transition group-hover/logo:opacity-100">
                {logoBusy ? "…" : "Logo"}
              </span>
            </button>
            {guide.logoUrl && (
              <button
                type="button"
                onClick={removeLogo}
                disabled={logoBusy}
                className="no-print text-[11px] text-[var(--muted)] hover:text-[var(--danger)]"
              >
                Remove
              </button>
            )}
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
          </div>
          <div className="flex-1 pt-1">
            <input
              className="field-bare text-3xl font-bold leading-tight tracking-tight"
              value={title}
              placeholder="Untitled guide"
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveMeta}
            />
            <textarea
              className="field-bare mt-2 leading-relaxed text-[var(--muted)]"
              value={description}
              placeholder="Add a description for this guide…"
              rows={2}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={saveMeta}
            />
          </div>
        </header>

        {/* Steps */}
        <div className="flex flex-col">
          {guide.steps.map((step, i) => (
            <Fragment key={step.id}>
              <StepInserter
                at={i}
                onAddStep={addStep}
                onAddNote={addNote}
                disabled={adding}
              />
              <StepCard
                step={step}
                index={i}
                num={stepNums[i]}
                isNote={isNoteStep(step)}
                total={guide.steps.length}
                onSave={(data) => saveStep(step.id, data)}
                onAnnotate={(annotation) => saveAnnotation(step.id, annotation)}
                onSetImage={(image) => setStepImage(step.id, image)}
                onDelete={() => deleteStep(step.id)}
                onMove={(dir) => move(i, dir)}
                drag={{
                  dragging: dragIndex === i,
                  dragOver: overIndex === i && dragIndex !== null && dragIndex !== i,
                  onDragStart: () => setDragIndex(i),
                  onDragEnter: () => setOverIndex(i),
                  onDrop: dropDrag,
                  onDragEnd: endDrag,
                }}
              />
            </Fragment>
          ))}
        </div>

        {/* Add step / note at the end */}
        <div className="no-print mt-4 flex gap-3">
          <button
            onClick={() => addStep()}
            disabled={adding}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--border)] py-5 font-semibold text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            <span className="text-lg leading-none">＋</span>
            {guide.steps.length === 0 ? "Add a step" : "Add a step"}
          </button>
          <button
            onClick={() => addNote()}
            disabled={adding}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--border)] py-5 font-semibold text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            <span className="text-base leading-none">✎</span>
            Add note
          </button>
        </div>
      </div>
    </div>
  );
}

function SparkleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3l1.8 4.6L18.4 9.4 13.8 11.2 12 15.8 10.2 11.2 5.6 9.4 10.2 7.6 12 3Z"
        fill="currentColor"
      />
      <path d="M18.5 14.5l.9 2.2 2.2.9-2.2.9-.9 2.2-.9-2.2-2.2-.9 2.2-.9.9-2.2Z" fill="currentColor" />
    </svg>
  );
}

// An "insert here" affordance that reveals "Add step" / "Add note" on hover.
function StepInserter({
  at,
  onAddStep,
  onAddNote,
  disabled,
}: {
  at: number;
  onAddStep: (index: number) => void;
  onAddNote: (index: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="no-print group/ins flex h-10 w-full items-center justify-center">
      <span className="h-px flex-1 bg-transparent transition group-hover/ins:bg-[var(--accent)]/25" />
      <span className="mx-2 flex items-center gap-1.5 opacity-0 transition group-hover/ins:opacity-100">
        <button
          type="button"
          onClick={() => !disabled && onAddStep(at)}
          disabled={disabled}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-semibold text-[var(--muted)] shadow-sm transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          <span className="text-sm leading-none">＋</span> Step
        </button>
        <button
          type="button"
          onClick={() => !disabled && onAddNote(at)}
          disabled={disabled}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-semibold text-[var(--muted)] shadow-sm transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          <span className="text-sm leading-none">✎</span> Note
        </button>
      </span>
      <span className="h-px flex-1 bg-transparent transition group-hover/ins:bg-[var(--accent)]/25" />
    </div>
  );
}
