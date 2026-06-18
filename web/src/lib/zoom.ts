import type { StepAnnotation } from "./data/types";

// Default "zoom in 30%" centered on the cursor, à la Scribe.
export const DEFAULT_ZOOM = 1.3;
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

/** The focus point as image fractions [0..1], or null if the step has none. */
export function resolveFocus(
  ann: StepAnnotation | null | undefined
): { fx: number; fy: number } | null {
  const vw = ann?.viewport?.w;
  const vh = ann?.viewport?.h;
  if (!ann || !vw || !vh) return null;

  const x =
    ann.focusX ??
    ann.clickX ??
    (ann.rect ? ann.rect.x + ann.rect.w / 2 : undefined);
  const y =
    ann.focusY ??
    ann.clickY ??
    (ann.rect ? ann.rect.y + ann.rect.h / 2 : undefined);
  if (x == null || y == null) return null;

  return { fx: clamp(x / vw, 0, 1), fy: clamp(y / vh, 0, 1) };
}

/** Effective zoom: explicit value if set, else the default when a focus exists. */
export function resolveZoom(ann: StepAnnotation | null | undefined): number {
  if (!ann) return 1;
  if (typeof ann.zoom === "number") return clamp(ann.zoom, MIN_ZOOM, MAX_ZOOM);
  return resolveFocus(ann) ? DEFAULT_ZOOM : 1;
}

/**
 * Pan offset (as fractions of the frame) that centers the focus point, clamped
 * so the zoomed image always covers the frame (no empty edges).
 */
export function panFractions(fx: number, fy: number, z: number) {
  return {
    tx: clamp(0.5 - fx * z, 1 - z, 0),
    ty: clamp(0.5 - fy * z, 1 - z, 0),
  };
}

/** Where the focus point lands within the frame after zoom + pan (fractions). */
export function markerFramePos(fx: number, fy: number, z: number) {
  const { tx, ty } = panFractions(fx, fy, z);
  return { mx: tx + fx * z, my: ty + fy * z };
}

/**
 * Fixed marker diameter as a percentage of the frame width. The marker just
 * highlights the cursor position — it is the SAME size everywhere (editor,
 * share, export) and is NOT resized to wrap the clicked element. Because it is
 * drawn in frame space, this stays visually constant regardless of zoom.
 */
export const MARKER_PCT = 9;

/** Convert a click on the displayed frame back to a viewport-px focus point. */
export function frameToViewport(
  cx: number, // click x as fraction of frame [0..1]
  cy: number,
  z: number,
  fx: number, // current focus fractions (for current pan)
  fy: number,
  viewport: { w: number; h: number }
) {
  const { tx, ty } = panFractions(fx, fy, z);
  const imgFx = clamp((cx - tx) / z, 0, 1);
  const imgFy = clamp((cy - ty) / z, 0, 1);
  return { focusX: imgFx * viewport.w, focusY: imgFy * viewport.h };
}
