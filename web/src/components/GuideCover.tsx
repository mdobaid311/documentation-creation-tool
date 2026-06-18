import type { Guide } from "@/lib/data";

// A print-only title/cover page (hidden on screen via the Tailwind `hidden`
// utility AND the `.print-cover` rule). Rendered as the first element on the
// editor/share pages so the exported PDF opens with a large logo + title page.
export function GuideCover({ guide }: { guide: Guide }) {
  return (
    <section className="print-cover hidden">
      {guide.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={guide.logoUrl} alt="" className="cover-logo" />
      ) : (
        <svg
          className="cover-logo-fallback"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M5 3.5h9.5L19 8v12.5a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-17Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M8.5 12.5l2.2 2.2 4.3-4.6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      <span className="cover-eyebrow">Step-by-step guide</span>
      <h1>{guide.title}</h1>
      {guide.description && <p>{guide.description}</p>}
      <span className="cover-rule" />
    </section>
  );
}
