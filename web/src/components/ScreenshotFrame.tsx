import type { Rect, Step, StepAnnotation } from "@/lib/data";
import {
  MARKER_PCT,
  markerFramePos,
  panFractions,
  resolveFocus,
  resolveZoom,
} from "@/lib/zoom";

export interface ZoomOverride {
  zoom: number;
  /** Marker / zoom-focus point in viewport px. Omitted → no marker, centered zoom. */
  focusX?: number;
  focusY?: number;
  blurs?: Rect[];
  /** Coordinate system for the image (captured viewport, or an upload's natural size). */
  viewport?: { w: number; h: number };
}

// Renders a step's screenshot with Scribe-style zoom-to-cursor and a soft
// orange spotlight marker. Used read-only on the share page and (with `override`
// + `onPick`) interactively in the editor.
export function ScreenshotFrame({
  step,
  index,
  override,
  onPick,
}: {
  step: Step;
  index: number;
  override?: ZoomOverride | null;
  onPick?: (cx: number, cy: number) => void;
}) {
  if (!step.screenshotUrl) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--background)] text-sm text-[var(--muted)]">
        No screenshot for this step
      </div>
    );
  }

  // When an override is supplied (editor), it is the single source of truth for
  // the marker — we do NOT fall back to the step's stored click/rect, so an
  // upload with no marker stays marker-free and a removed marker stays removed.
  const ann: StepAnnotation | null = override
    ? {
        viewport: override.viewport ?? step.annotation?.viewport,
        zoom: override.zoom,
        focusX: override.focusX,
        focusY: override.focusY,
        blurs: override.blurs ?? step.annotation?.blurs,
      }
    : step.annotation;

  const vw = ann?.viewport?.w;
  const vh = ann?.viewport?.h;
  const focus = resolveFocus(ann);

  // No geometry to work with → plain full-bleed image.
  if (!vw || !vh) {
    return (
      <div className="shot-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={step.screenshotUrl} alt={`Step ${index + 1}`} className="block w-full" />
      </div>
    );
  }

  const z = resolveZoom(ann);
  const f = focus ?? { fx: 0.5, fy: 0.5 };
  const { tx, ty } = panFractions(f.fx, f.fy, z);
  const marker = focus ? markerFramePos(f.fx, f.fy, z) : null;
  const markerW = MARKER_PCT;

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!onPick) return;
    const r = e.currentTarget.getBoundingClientRect();
    onPick((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  }

  return (
    <div
      className="zoom-frame"
      style={{ aspectRatio: `${vw} / ${vh}`, cursor: onPick ? "crosshair" : undefined }}
      onClick={onPick ? handleClick : undefined}
    >
      <div
        className="zoom-layer"
        style={{ transform: `translate(${tx * 100}%, ${ty * 100}%) scale(${z})` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={step.screenshotUrl} alt={`Step ${index + 1}`} />
        {ann?.blurs?.map((b, i) => (
          <div
            key={i}
            className="absolute backdrop-blur-md"
            style={{
              left: `${(b.x / vw) * 100}%`,
              top: `${(b.y / vh) * 100}%`,
              width: `${(b.w / vw) * 100}%`,
              height: `${(b.h / vh) * 100}%`,
              background: "rgba(120,120,140,0.35)",
            }}
          />
        ))}
      </div>

      {marker && (
        <svg
          className="click-marker"
          viewBox="0 0 100 100"
          style={{ left: `${marker.mx * 100}%`, top: `${marker.my * 100}%`, width: `${markerW}%` }}
        >
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="rgba(249,115,22,0.13)"
            stroke="#f97316"
            strokeWidth="5"
          />
        </svg>
      )}
    </div>
  );
}
