# Docs Capture

A Scribe-style documentation tool: a **browser extension** records any process
in your browser (clicks + typing + annotated screenshots) and turns it into a
**step-by-step guide**, plus a **web app** to manage, edit, share, and export
those guides.

Built **local-first but cloud-ready** — everything runs on your machine with no
external services, but the storage and data layers are abstracted behind
interfaces so a real cloud backend can be dropped in later without a rewrite.

```
Documentation Creator Tool/
├── extension/        Chrome/Edge MV3 capture extension
└── web/              Next.js 16 web app (dashboard, editor, sharing, export)
```

## How it works

```
 ┌─────────────┐   click/type events   ┌──────────────┐   POST /api/recordings   ┌────────────┐
 │ content.js  │ ─────────────────────▶ │ background.js │ ───────────────────────▶ │  Web app    │
 │ (any page)  │                        │ + screenshots │   (steps + screenshots)  │  (Next.js)  │
 └─────────────┘                        └──────────────┘                          └────────────┘
                                                                                         │
                                                          dashboard · editor · share · export
```

1. The **content script** watches the active page. On each click it captures the
   element, a human-readable description ("Click the *Submit* button"), the click
   coordinates, and the viewport size.
2. The **background service worker** takes a screenshot for every step and stores
   the in-progress recording in `chrome.storage.local`.
3. On **Stop**, the recording is POSTed to the web app, which creates a guide and
   opens it in the editor.
4. The **web app** lets you edit step text, reorder/delete steps, redact regions,
   toggle a public share link, and export to **Markdown / HTML / PDF**.

## Quick start

### 1. Run the web app

```bash
cd web
npm install              # if not already installed
npx prisma migrate dev   # creates the local SQLite DB (first time)
npm run dev              # http://localhost:5000
```

### 2. Load the extension

1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the `extension/` folder.
4. Pin the **Docs Capture** icon.

### 3. Capture a guide

Open any website, click the extension icon → **Start capture**, walk through your
process, then **Stop & save**. The finished guide opens automatically in the web
app at `http://localhost:5000`.

> The extension posts to `http://localhost:5000` by default. Change it under the
> popup's **Settings** if you run the app elsewhere.

## Architecture notes (cloud-ready seams)

- **`web/src/lib/data/`** — `GuideRepository` interface + a Prisma implementation.
  Swap in an API/cloud-DB implementation by changing the factory in `index.ts`.
- **`web/src/lib/storage/`** — `StorageProvider` interface; screenshots use a
  local-disk provider today. Add an S3/GCS provider and switch the factory.
- **Database** — SQLite via Prisma. To go cloud, change the datasource to
  `postgresql` in `prisma/schema.prisma` and point `DATABASE_URL` at Postgres.

## Tech

- **Web**: Next.js 16 (App Router, TypeScript), Tailwind v4, Prisma 6 + SQLite.
- **Extension**: Manifest V3 (Chrome/Edge), vanilla JS.

## Status / roadmap

Implemented: capture (clicks + typing), auto-screenshots with click markers,
dashboard, editor (edit/reorder/delete steps, redaction data model), public
sharing, Markdown/HTML/PDF export.

Not yet: user accounts, drag-and-drop reordering, in-editor blur drawing UI,
team workspaces, cloud sync (the seams above are ready for it).
# documentation-creation-tool
