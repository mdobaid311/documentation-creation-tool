import { Fragment } from "react";

// Renders step text with emphasis applied to:
//   - Markdown bold: **Login**
//   - Straight or curly double-quotes: "Login" / “Login”
// Both render as bold UI-element chips, matching the style produced by the AI
// "Generate descriptions" feature and Scribe-style step text.
export function RichText({ text }: { text: string }) {
  if (!text) return null;
  const tokens: Array<{ bold: boolean; value: string }> = [];
  const re = /\*\*([^*\n]+)\*\*|[“"]([^”"\n]+)[”"]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      tokens.push({ bold: false, value: text.slice(last, m.index) });
    }
    tokens.push({ bold: true, value: m[1] ?? m[2] ?? "" });
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    tokens.push({ bold: false, value: text.slice(last) });
  }
  return (
    <>
      {tokens.map((t, i) =>
        t.bold ? (
          <strong key={i} className="font-semibold text-[var(--foreground)]">
            {t.value}
          </strong>
        ) : (
          <Fragment key={i}>{t.value}</Fragment>
        )
      )}
    </>
  );
}
