import { Fragment } from "react";

// Renders step text with quoted phrases emphasised — e.g.
//   Click the “Login” button   →   Click the **Login** button
// This mirrors Scribe, which bolds the key element in each step.
export function RichText({ text }: { text: string }) {
  if (!text) return null;
  // Split on straight or curly double-quotes, keeping the quoted content.
  const parts = text.split(/[“"]([^”"]+)[”"]/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-[var(--foreground)]">
            {part}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  );
}
