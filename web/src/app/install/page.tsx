export const metadata = { title: "Install the extension — Docs Capture" };

const STEPS = [
  {
    title: "Open the Extensions page",
    body: "In Chrome or Edge, go to chrome://extensions (or edge://extensions).",
  },
  {
    title: "Enable Developer mode",
    body: "Toggle “Developer mode” on, in the top-right corner of the page.",
  },
  {
    title: "Load the extension",
    body: 'Click “Load unpacked” and select the project\'s extension/ folder.',
  },
  {
    title: "Pin & start capturing",
    body: "Pin the Docs Capture icon, open any site, click the icon, then Start capture.",
  },
];

export default function InstallPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <span className="chip">Browser extension</span>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">
        Capture any process in your browser
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        The Docs Capture extension records each click and keystroke, grabs an
        annotated screenshot, and sends the finished guide here automatically.
      </p>

      <ol className="mt-8 flex flex-col gap-4">
        {STEPS.map((s, i) => (
          <li key={i} className="card flex items-start gap-4 p-5">
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-white">
              {i + 1}
            </span>
            <div>
              <h2 className="font-semibold">{s.title}</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm text-[var(--muted)]">
        Make sure this app is running at{" "}
        <code className="font-semibold">http://localhost:5000</code> while you
        capture — that&apos;s where the extension sends your guides.
      </div>
    </div>
  );
}
