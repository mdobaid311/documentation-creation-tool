import type { NoteKind } from "@/lib/data";
import { NOTE_ICON } from "@/lib/steps";

export function NoteIcon({ kind, size = 20 }: { kind: NoteKind; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: NOTE_ICON[kind] }}
    />
  );
}
