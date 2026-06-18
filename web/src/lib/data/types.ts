// Domain types — the shapes the rest of the app speaks in. These are kept
// independent of Prisma so the storage engine can change without rippling
// through the UI or API layers.

export type StepType = "click" | "type" | "navigate" | "note";
export type GuideStatus = "draft" | "published";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface StepAnnotation {
  /** Click position within the captured viewport, in CSS pixels. */
  clickX?: number;
  clickY?: number;
  /** Bounding box of the interacted element. */
  rect?: Rect;
  /** Size of the viewport when the screenshot was taken. */
  viewport?: { w: number; h: number };
  /** Regions the user chose to blur/redact. */
  blurs?: Rect[];
  /** Zoom factor for the displayed screenshot (1 = fit, >1 = zoomed in). */
  zoom?: number;
  /** Point (in viewport CSS px) the zoom is centered on. Defaults to the click. */
  focusX?: number;
  focusY?: number;
}

export interface Step {
  id: string;
  guideId: string;
  order: number;
  type: StepType;
  title: string;
  description: string;
  screenshotUrl: string | null;
  annotation: StepAnnotation | null;
  pageUrl: string;
  createdAt: string;
}

export interface Guide {
  id: string;
  title: string;
  description: string;
  status: GuideStatus;
  shareId: string | null;
  shareEnabled: boolean;
  sourceUrl: string;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  steps: Step[];
}

export interface GuideSummary {
  id: string;
  title: string;
  description: string;
  status: GuideStatus;
  shareEnabled: boolean;
  stepCount: number;
  coverUrl: string | null;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---- Inputs used when importing a recording from the extension ----

export interface CapturedStepInput {
  type: StepType;
  title?: string;
  description?: string;
  /** Base64-encoded PNG (data URL or raw base64). */
  screenshot?: string | null;
  annotation?: StepAnnotation | null;
  pageUrl?: string;
}

export interface CreateGuideInput {
  title: string;
  description?: string;
  sourceUrl?: string;
  /** Favicon URL of the captured site; downloaded and used as the guide logo. */
  faviconUrl?: string;
  steps: CapturedStepInput[];
}

export interface AddStepInput {
  type?: StepType;
  title?: string;
  description?: string;
  /** Base64-encoded image (data URL or raw base64). */
  screenshot?: string | null;
  /** Position to insert at (0 = before first). Appends if omitted. */
  index?: number;
}

export interface UpdateGuideInput {
  title?: string;
  description?: string;
  status?: GuideStatus;
}

export interface UpdateStepInput {
  title?: string;
  description?: string;
  annotation?: StepAnnotation | null;
}
