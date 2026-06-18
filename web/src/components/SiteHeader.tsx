import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="no-print sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface)]/85 backdrop-blur">
      <div className="mx-auto flex h-15 max-w-6xl items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-white">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 3.5h9.5L19 8v12.5a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-17Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path
                d="M8.5 12.5l2.2 2.2 4.3-4.6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="text-[17px] font-bold tracking-tight">
            Docs Capture
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/" className="btn btn-ghost btn-sm">
            My guides
          </Link>
          <Link href="/install" className="btn btn-primary btn-sm">
            Get the extension
          </Link>
        </nav>
      </div>
    </header>
  );
}
