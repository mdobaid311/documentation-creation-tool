"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { NoteIcon } from "@/components/NoteIcon";
import { RichText } from "@/components/RichText";
import { ScreenshotFrame } from "@/components/ScreenshotFrame";
import type { ZoomOverride } from "@/components/ScreenshotFrame";
import type { NoteKind, Rect, Step, StepAnnotation } from "@/lib/data";
import { NOTE_KINDS, NOTE_LABEL, noteKindOf } from "@/lib/steps";
import {
  DEFAULT_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
  frameToViewport,
  panFractions,
  resolveZoom,
} from "@/lib/zoom";

// The marker / zoom-focus point in viewport px, or null when the step has no
// marker yet (e.g. a freshly uploaded image). Captured steps anchor on the
// recorded click; uploads stay marker-free until the user adds one.
function initialFocus(ann: StepAnnotation | null): { fx: number; fy: number } | null {
  const vp = ann?.viewport;
  if (!vp) return null;
  const fx =
    ann?.focusX ?? ann?.clickX ?? (ann?.rect ? ann.rect.x + ann.rect.w / 2 : undefined);
  const fy =
    ann?.focusY ?? ann?.clickY ?? (ann?.rect ? ann.rect.y + ann.rect.h / 2 : undefined);
  if (fx == null || fy == null) return null;
  return { fx, fy };
}

interface DragProps {
  dragging: boolean;
  dragOver: boolean;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
}

export function StepCard({
  step,
  index,
  num,
  isNote,
  total,
  onSave,
  onAnnotate,
  onSetImage,
  onDelete,
  onDuplicate,
  onMove,
  drag,
}: {
  step: Step;
  index: number;
  num: number | null;
  isNote: boolean;
  total: number;
  onSave: (data: { title: string; description: string }) => Promise<void>;
  onAnnotate: (annotation: StepAnnotation) => Promise<void>;
  onSetImage: (image: string) => Promise<void>;
  onDelete: () => void;
  onDuplicate: () => void;
  onMove: (dir: -1 | 1) => void;
  drag: DragProps;
}) {
  // --- instruction text editing ---
  const initial = step.description || step.title || "";
  const [text, setText] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setText(step.description || step.title || ""), [
    step.description,
    step.title,
  ]);

  // Auto-grow the textarea to fit its content (runs on every change — must NOT
  // touch focus or selection, or the caret would jump to the end on each key).
  useLayoutEffect(() => {
    const ta = taRef.current;
    if (editing && ta) {
      ta.style.height = "auto";
      ta.style.height = `${ta.scrollHeight}px`;
    }
  }, [editing, text]);

  // Focus and place the caret at the end ONCE, when entering edit mode.
  useEffect(() => {
    const ta = taRef.current;
    if (editing && ta) {
      ta.focus();
      const end = ta.value.length;
      ta.setSelectionRange(end, end);
    }
  }, [editing]);

  async function commitText() {
    setEditing(false);
    const trimmed = text.trim();
    if (trimmed === initial) return;
    setSaving(true);
    await onSave({ title: step.title || trimmed.slice(0, 60), description: trimmed });
    setSaving(false);
  }

  // --- zoom / focus / redaction state ---
  // `vp` is the coordinate system for the image. Captured steps carry it; for an
  // uploaded image we derive it from the image's natural size on load (below).
  const [vp, setVp] = useState(step.annotation?.viewport);
  const [zoom, setZoom] = useState(() => resolveZoom(step.annotation));
  const [focus, setFocus] = useState<{ fx: number; fy: number } | null>(() =>
    initialFocus(step.annotation ?? null)
  );
  const [blurs, setBlurs] = useState<Rect[]>(() => step.annotation?.blurs ?? []);
  const [redact, setRedact] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resync if the step reloads from the server (e.g. image replaced).
  useEffect(() => {
    setVp(step.annotation?.viewport);
    setZoom(resolveZoom(step.annotation));
    setFocus(initialFocus(step.annotation ?? null));
    setBlurs(step.annotation?.blurs ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id]);

  const override = useMemo<ZoomOverride | null>(
    () =>
      vp
        ? { zoom, focusX: focus?.fx, focusY: focus?.fy, blurs, viewport: vp }
        : null,
    [vp, zoom, focus, blurs]
  );

  // Build the annotation to persist. The marker is represented solely by
  // focusX/focusY here, so any legacy clickX/rect is normalised away.
  function persistAll(
    next: { zoom?: number; fx?: number | null; fy?: number | null; blurs?: Rect[] },
    immediate = false
  ) {
    const annotation: StepAnnotation = {
      ...(step.annotation ?? {}),
      ...(vp ? { viewport: vp } : {}),
      zoom: next.zoom ?? zoom,
      blurs: next.blurs ?? blurs,
    };
    delete annotation.clickX;
    delete annotation.clickY;
    delete annotation.rect;
    const fx = next.fx !== undefined ? next.fx : focus?.fx ?? null;
    const fy = next.fy !== undefined ? next.fy : focus?.fy ?? null;
    if (fx != null && fy != null) {
      annotation.focusX = fx;
      annotation.focusY = fy;
    } else {
      delete annotation.focusX;
      delete annotation.focusY;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const run = () => onAnnotate(annotation);
    if (immediate) run();
    else saveTimer.current = setTimeout(run, 350);
  }

  // First time we see an uploaded image, capture its natural size as the
  // coordinate system so zoom / marker / redaction all work on it.
  function measureViewport(w: number, h: number) {
    if (vp || !w || !h) return;
    const next = { w, h };
    setVp(next);
    onAnnotate({ ...(step.annotation ?? {}), viewport: next });
  }

  function onZoom(v: number) {
    setZoom(v);
    persistAll({ zoom: v });
  }

  function onPick(cx: number, cy: number) {
    if (!vp) return;
    const curFx = (focus?.fx ?? vp.w / 2) / vp.w;
    const curFy = (focus?.fy ?? vp.h / 2) / vp.h;
    const { focusX, focusY } = frameToViewport(cx, cy, zoom, curFx, curFy, vp);
    setFocus({ fx: focusX, fy: focusY });
    persistAll({ fx: focusX, fy: focusY }, true);
  }

  function addMarker() {
    if (!vp) return;
    const f = { fx: vp.w / 2, fy: vp.h / 2 };
    setFocus(f);
    setZoom((z) => (z > 1 ? z : DEFAULT_ZOOM));
    persistAll({ fx: f.fx, fy: f.fy, zoom: zoom > 1 ? zoom : DEFAULT_ZOOM }, true);
  }

  function removeMarker() {
    setFocus(null);
    persistAll({ fx: null, fy: null }, true);
  }

  function onReset() {
    const f = initialFocus(step.annotation ?? null);
    setZoom(DEFAULT_ZOOM);
    setFocus(f);
    persistAll({ zoom: DEFAULT_ZOOM, fx: f?.fx ?? null, fy: f?.fy ?? null }, true);
  }

  // --- redaction drawing ---
  const overlayRef = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const startRef = useRef({ cx: 0, cy: 0 });
  const [sel, setSel] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);

  function fracOf(e: React.MouseEvent) {
    const r = overlayRef.current!.getBoundingClientRect();
    return { cx: (e.clientX - r.left) / r.width, cy: (e.clientY - r.top) / r.height };
  }

  // Frame-space rect (fractions) for an existing blur — used for hit-testing.
  function blurFrameRect(b: Rect) {
    const ffx = (focus?.fx ?? vp!.w / 2) / vp!.w;
    const ffy = (focus?.fy ?? vp!.h / 2) / vp!.h;
    const { tx, ty } = panFractions(ffx, ffy, zoom);
    return {
      fx: tx + (b.x / vp!.w) * zoom,
      fy: ty + (b.y / vp!.h) * zoom,
      fw: (b.w / vp!.w) * zoom,
      fh: (b.h / vp!.h) * zoom,
    };
  }

  function removeBlur(i: number) {
    const nb = blurs.filter((_, j) => j !== i);
    setBlurs(nb);
    persistAll({ blurs: nb }, true);
  }

  function onOverlayDown(e: React.MouseEvent) {
    const { cx, cy } = fracOf(e);
    // Click on an existing box (topmost first) removes it.
    for (let i = blurs.length - 1; i >= 0; i--) {
      const r = blurFrameRect(blurs[i]);
      if (cx >= r.fx && cx <= r.fx + r.fw && cy >= r.fy && cy <= r.fy + r.fh) {
        removeBlur(i);
        return;
      }
    }
    drawing.current = true;
    startRef.current = { cx, cy };
    setSel({ x0: cx, y0: cy, x1: cx, y1: cy });
  }

  function onOverlayMove(e: React.MouseEvent) {
    if (!drawing.current) return;
    const { cx, cy } = fracOf(e);
    setSel({ x0: startRef.current.cx, y0: startRef.current.cy, x1: cx, y1: cy });
  }

  function onOverlayUp(e: React.MouseEvent) {
    if (!drawing.current || !vp) return;
    drawing.current = false;
    const { cx, cy } = fracOf(e);
    setSel(null);
    const ffx = (focus?.fx ?? vp.w / 2) / vp.w;
    const ffy = (focus?.fy ?? vp.h / 2) / vp.h;
    const p1 = frameToViewport(startRef.current.cx, startRef.current.cy, zoom, ffx, ffy, vp);
    const p2 = frameToViewport(cx, cy, zoom, ffx, ffy, vp);
    const rect: Rect = {
      x: Math.min(p1.focusX, p2.focusX),
      y: Math.min(p1.focusY, p2.focusY),
      w: Math.abs(p2.focusX - p1.focusX),
      h: Math.abs(p2.focusY - p1.focusY),
    };
    if (rect.w < 6 || rect.h < 6) return; // ignore stray clicks
    const nb = [...blurs, rect];
    setBlurs(nb);
    persistAll({ blurs: nb }, true);
  }

  // --- image upload / replace ---
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file.");
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      await onSetImage(dataUrl);
    } finally {
      setUploading(false);
    }
  }

  const selRect = sel
    ? {
        left: `${Math.min(sel.x0, sel.x1) * 100}%`,
        top: `${Math.min(sel.y0, sel.y1) * 100}%`,
        width: `${Math.abs(sel.x1 - sel.x0) * 100}%`,
        height: `${Math.abs(sel.y1 - sel.y0) * 100}%`,
      }
    : null;

  const toolbar = (
    <div className="no-print absolute right-3 top-3 z-10 flex gap-1 opacity-0 transition group-hover:opacity-100">
      <button
        className="btn btn-ghost btn-sm cursor-grab px-2 active:cursor-grabbing"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          if (cardRef.current) e.dataTransfer.setDragImage(cardRef.current, 24, 24);
          drag.onDragStart();
        }}
        onDragEnd={drag.onDragEnd}
        title="Drag to reorder"
      >
        ⠿
      </button>
      <button className="btn btn-ghost btn-sm px-2" onClick={() => onMove(-1)} disabled={index === 0} title="Move up">↑</button>
      <button className="btn btn-ghost btn-sm px-2" onClick={() => onMove(1)} disabled={index === total - 1} title="Move down">↓</button>
      <button className="btn btn-ghost btn-sm px-2" onClick={onDuplicate} title="Duplicate step">⧉</button>
      <button className="btn btn-danger btn-sm px-2" onClick={onDelete} title="Delete step">✕</button>
    </div>
  );

  const setCardRef = (el: HTMLDivElement | null) => {
    cardRef.current = el;
  };
  const dragHandlers = {
    onDragEnter: drag.onDragEnter,
    onDragOver: (e: React.DragEvent) => e.preventDefault(),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      drag.onDrop();
    },
  };

  // --- Note callout step ---
  if (isNote) {
    const kind = noteKindOf(step);
    return (
      <div
        ref={setCardRef}
        {...dragHandlers}
        className={`group relative transition ${drag.dragging ? "opacity-40" : ""} ${
          drag.dragOver ? "ring-2 ring-[var(--accent)] rounded-2xl" : ""
        }`}
      >
        {toolbar}
        <div className={`callout ${kind}`}>
          <span className="callout-ic">
            <NoteIcon kind={kind} size={20} />
          </span>
          <div className="callout-body min-w-0 flex-1 pr-24">
            <div className="mb-1 flex items-center gap-2">
              <span className="callout-kind">{NOTE_LABEL[kind]}</span>
              <select
                className="no-print rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 text-[11px] text-[var(--muted)]"
                value={kind}
                onChange={(e) =>
                  onAnnotate({ ...(step.annotation ?? {}), noteKind: e.target.value as NoteKind })
                }
              >
                {NOTE_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {NOTE_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>
            {editing ? (
              <textarea
                ref={taRef}
                className="field-bare callout-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onBlur={commitText}
                placeholder="Write a note…"
              />
            ) : (
              <p
                className="callout-text cursor-text break-words"
                onClick={() => setEditing(true)}
                title="Click to edit"
              >
                {text ? <RichText text={text} /> : <span className="italic opacity-70">Write a note…</span>}
                {saving && <span className="no-print ml-2 align-middle text-xs opacity-60">saving…</span>}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setCardRef}
      {...dragHandlers}
      className={`step-card group relative flex flex-col gap-3 transition ${
        drag.dragging ? "opacity-40" : ""
      } ${drag.dragOver ? "ring-2 ring-[var(--accent)]" : ""}`}
    >
      {toolbar}

      {/* Number + instruction (click to edit) */}
      <div className="flex items-start gap-3.5 pr-28">
        <span className="step-num mt-0.5">{num ?? index + 1}</span>
        <div className="min-w-0 flex-1">
          {editing ? (
            <textarea
              ref={taRef}
              className="field-bare text-[16px] leading-7 text-[var(--foreground)]"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={commitText}
              placeholder={`Describe step ${index + 1}…`}
            />
          ) : (
            <p
              className="group/desc cursor-text break-words text-[16px] leading-7 text-[var(--foreground)]"
              onClick={() => setEditing(true)}
              title="Click to edit"
            >
              {text ? (
                <RichText text={text} />
              ) : (
                <span className="italic text-[var(--muted)]">Add a description…</span>
              )}
              <span className="no-print ml-1.5 align-middle text-xs text-[var(--muted)] opacity-0 transition group-hover/desc:opacity-100">
                ✎
              </span>
              {saving && (
                <span className="no-print ml-2 align-middle text-xs text-[var(--muted)]">
                  saving…
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Screenshot + controls */}
      <div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        {step.screenshotUrl ? (
          <>
            {!vp && (
              // Establish a coordinate system for an uploaded image from its
              // natural size, so zoom / marker / redaction become available.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={step.screenshotUrl}
                alt=""
                aria-hidden
                className="hidden"
                onLoad={(e) =>
                  measureViewport(
                    e.currentTarget.naturalWidth,
                    e.currentTarget.naturalHeight
                  )
                }
              />
            )}
            <div className="relative">
              <ScreenshotFrame
                step={step}
                index={index}
                override={override}
                onPick={vp && !redact ? onPick : undefined}
              />
              {redact && vp && (
                <div
                  ref={overlayRef}
                  className="absolute inset-0 z-10 cursor-crosshair rounded-xl"
                  onMouseDown={onOverlayDown}
                  onMouseMove={onOverlayMove}
                  onMouseUp={onOverlayUp}
                  onMouseLeave={onOverlayUp}
                >
                  {selRect && (
                    <div
                      className="absolute border-2 border-[var(--accent)] bg-[var(--accent)]/20"
                      style={selRect}
                    />
                  )}
                </div>
              )}
            </div>

            <div className="card-controls no-print flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
              {vp && !redact && (
                <>
                  <span className="flex items-center gap-1.5"><ZoomIcon /> Zoom</span>
                  <input
                    type="range"
                    min={MIN_ZOOM}
                    max={MAX_ZOOM}
                    step={0.05}
                    value={zoom}
                    onChange={(e) => onZoom(Number(e.target.value))}
                    className="h-1.5 max-w-40 flex-1 accent-[var(--accent)]"
                  />
                  <span className="w-10 tabular-nums">{Math.round(zoom * 100)}%</span>
                  <button className="btn btn-ghost btn-sm" onClick={onReset}>Reset</button>
                  <span className="mx-0.5 h-4 w-px bg-[var(--border)]" aria-hidden />
                  {focus ? (
                    <button className="btn btn-ghost btn-sm" onClick={removeMarker} title="Remove the click marker">
                      <MarkerIcon /> Remove marker
                    </button>
                  ) : (
                    <button className="btn btn-ghost btn-sm" onClick={addMarker} title="Add a click marker">
                      <MarkerIcon /> Add marker
                    </button>
                  )}
                </>
              )}
              {vp && (
                <button
                  className={`btn btn-sm ${redact ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setRedact((r) => !r)}
                >
                  {redact ? "Done redacting" : "Redact"}
                </button>
              )}
              {redact ? (
                <span className="text-xs">Drag to blur an area · click a box to remove</span>
              ) : (
                vp && (
                  <span className="text-xs">
                    {focus ? "Click the image to move the marker" : "Click the image to place a marker"}
                  </span>
                )
              )}
              <button
                className="btn btn-ghost btn-sm ml-auto"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? "Uploading…" : "Replace image"}
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border)] py-10 text-sm font-medium text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            <UploadIcon />
            {uploading ? "Uploading…" : "Upload an image"}
          </button>
        )}
      </div>
    </div>
  );
}

function ZoomIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="M20 20l-3.2-3.2M11 8.5v5M8.5 11h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function MarkerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="4" fill="currentColor" />
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" opacity="0.6" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 16V5m0 0L8 9m4-4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
