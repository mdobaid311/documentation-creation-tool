import type { NoteKind, Step } from "./data";

export const NOTE_KINDS: NoteKind[] = [
  "note",
  "tip",
  "warning",
  "important",
  "success",
];

// A step is a callout (no number, no screenshot) when it's a note with no image.
export function isNoteStep(step: Step): boolean {
  return step.type === "note" && !step.screenshotUrl;
}

export function noteKindOf(step: Step): NoteKind {
  const k = step.annotation?.noteKind;
  return k && NOTE_KINDS.includes(k) ? k : "note";
}

export const NOTE_LABEL: Record<NoteKind, string> = {
  note: "Note",
  tip: "Tip",
  warning: "Warning",
  important: "Important",
  success: "Success",
};

// Inner SVG (24x24, stroke) for each kind — shared by React UI and the HTML
// export so the icon is defined once.
export const NOTE_ICON: Record<NoteKind, string> = {
  note: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.6h.01"/>',
  tip: '<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.8 10.6c.6.6.9 1.2.9 2.2v.2h5.8v-.2c0-1 .3-1.6.9-2.2A6 6 0 0 0 12 3Z"/>',
  warning: '<path d="M12 4 2.5 20h19L12 4Z"/><path d="M12 10v4"/><path d="M12 17h.01"/>',
  important:
    '<path d="M8.6 3h6.8L21 8.6v6.8L15.4 21H8.6L3 15.4V8.6L8.6 3Z"/><path d="M12 8v5"/><path d="M12 16h.01"/>',
  success: '<circle cx="12" cy="12" r="9"/><path d="M8.4 12.4l2.5 2.5 4.7-5"/>',
};
