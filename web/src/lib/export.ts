import type { Guide, Step } from "./data";
import {
  MARKER_PCT,
  markerFramePos,
  panFractions,
  resolveFocus,
  resolveZoom,
} from "./zoom";

function abs(url: string | null, base: string): string | null {
  if (!url) return null;
  return url.startsWith("http") ? url : `${base}${url}`;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Bold quoted phrases, mirroring the on-screen RichText component.
function rich(text: string): string {
  return esc(text).replace(/[“"]([^”"]+)[”"]/g, "<strong>$1</strong>");
}

export function guideToMarkdown(guide: Guide, baseUrl: string): string {
  const lines: string[] = [`# ${guide.title}`, ""];
  if (guide.description) lines.push(guide.description, "");
  guide.steps.forEach((step, i) => {
    const body = step.description || step.title || `Step ${i + 1}`;
    lines.push(`### ${i + 1}. ${body}`, "");
    const img = abs(step.screenshotUrl, baseUrl);
    if (img) lines.push(`![Step ${i + 1}](${img})`, "");
  });
  lines.push("---", `_Created with Docs Capture_`);
  return lines.join("\n");
}

function stepFrame(step: Step, index: number, baseUrl: string): string {
  const img = abs(step.screenshotUrl, baseUrl);
  if (!img) return "";
  const ann = step.annotation;
  const vw = ann?.viewport?.w;
  const vh = ann?.viewport?.h;

  if (!vw || !vh) {
    return `<div class="frame"><img src="${img}" alt="Step ${index + 1}"/></div>`;
  }

  const z = resolveZoom(ann);
  const focus = resolveFocus(ann);
  const f = focus ?? { fx: 0.5, fy: 0.5 };
  const { tx, ty } = panFractions(f.fx, f.fy, z);
  const marker = focus ? markerFramePos(f.fx, f.fy, z) : null;
  const markerW = MARKER_PCT;

  const blurs = (ann?.blurs ?? [])
    .map(
      (b) =>
        `<div class="blur" style="left:${(b.x / vw) * 100}%;top:${(b.y / vh) * 100}%;width:${(b.w / vw) * 100}%;height:${(b.h / vh) * 100}%"></div>`
    )
    .join("");

  const markerSvg = marker
    ? `<svg class="marker" viewBox="0 0 100 100" style="left:${marker.mx * 100}%;top:${marker.my * 100}%;width:${markerW}%">
        <circle cx="50" cy="50" r="45" fill="rgba(249,115,22,0.13)" stroke="#f97316" stroke-width="5"/>
      </svg>`
    : "";

  return `<div class="frame" style="aspect-ratio:${vw}/${vh}">
    <div class="layer" style="transform:translate(${tx * 100}%, ${ty * 100}%) scale(${z})">
      <img src="${img}" alt="Step ${index + 1}"/>${blurs}
    </div>${markerSvg}
  </div>`;
}

export function guideToHtml(guide: Guide, baseUrl: string): string {
  const logo = abs(guide.logoUrl, baseUrl);
  const docIcon = `<svg viewBox="0 0 24 24" fill="none"><path d="M5 3.5h9.5L19 8v12.5a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-17Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8.5 12.5l2.2 2.2 4.3-4.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  // Frameless (no circle) larger logo for the cover page.
  const coverLogoHtml = logo
    ? `<img class="cover-logo" src="${logo}" alt=""/>`
    : `<span class="cover-logo-fallback">${docIcon}</span>`;

  const steps = guide.steps
    .map(
      (step, i) => `
      <li class="step">
        <div class="step-head"><span class="num">${i + 1}</span>
          <p>${rich(step.description || step.title || `Step ${i + 1}`)}</p></div>
        ${stepFrame(step, i, baseUrl)}
      </li>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(guide.title)}</title>
<style>
  :root { --accent:#6d28d9; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 820px;
    margin: 0 auto; padding: 48px 24px; color: #1c1830; line-height: 1.6; }
  .head { display:flex; align-items:flex-start; gap:16px; margin-bottom:36px; }
  .avatar { width:52px; height:52px; border-radius:50%; flex:0 0 auto; display:inline-flex;
    align-items:center; justify-content:center; overflow:hidden;
    background:linear-gradient(135deg,#7c3aed,#c026d3); color:#fff; }
  .avatar.has-logo { background:#fff; border:1px solid #e8e4f2; }
  .avatar img { width:62%; height:62%; object-fit:contain; }
  h1 { font-size: 30px; margin: 0 0 6px; }
  .desc { color:#6b6680; margin:0; }
  ol { list-style:none; padding:0; margin:0; }
  .step { margin-bottom: 22px; padding:22px; background:#fff; border:1px solid #e8e4f2;
    border-radius:16px; box-shadow:0 6px 22px rgba(20,16,48,.07);
    page-break-inside: avoid; break-inside: avoid; }
  .step-head { display:flex; align-items:flex-start; gap:14px; margin-bottom:14px; }
  .num { background:linear-gradient(140deg,#7c3aed,#5b21b6); color:#fff; width:30px; height:30px;
    border-radius:50%; display:inline-flex; align-items:center; justify-content:center;
    font-weight:700; font-size:13.5px; flex:0 0 auto; margin-top:2px;
    box-shadow:0 0 0 4px #f1ebff, 0 4px 10px rgba(109,40,217,.35); }
  .step-head p { margin:0; color:#1c1830; font-size:16px; line-height:1.75; }
  .step-head strong { color:#1c1830; font-weight:700; }
  .frame { position:relative; overflow:hidden; border:1px solid #e8e4f2; border-radius:12px;
    box-shadow:0 10px 34px rgba(20,16,48,.1); background:#fff; }
  .frame > img { display:block; width:100%; }
  .layer { position:absolute; inset:0; transform-origin:0 0; }
  .layer img { display:block; width:100%; }
  .blur { position:absolute; background:rgba(120,120,140,.35); backdrop-filter:blur(8px); }
  .marker { position:absolute; height:auto; transform:translate(-50%,-50%);
    filter:drop-shadow(0 4px 14px rgba(249,115,22,.35)); }
  footer { margin-top:40px; color:#888; font-size:13px; border-top:1px solid #eee; padding-top:16px; }
  @page { margin: 14mm 12mm; }
  .cover { display:flex; flex-direction:column; align-items:center; justify-content:center;
    text-align:center; min-height:86vh; page-break-after:always; break-after:page; }
  .cover .cover-logo { width:auto; height:auto; max-width:280px; max-height:150px; object-fit:contain; }
  .cover .cover-logo-fallback { width:120px; height:120px; color:#6d28d9; display:inline-flex; }
  .cover .cover-logo-fallback svg { width:100%; height:100%; }
  .cover .cover-eyebrow { margin-top:28px; font-size:12px; font-weight:700;
    letter-spacing:.18em; text-transform:uppercase; color:#6d28d9; }
  .cover h1 { font-size:38px; margin:10px 0 0; max-width:20ch; line-height:1.1; }
  .cover p { color:#6b6680; max-width:52ch; margin:14px 0 0; font-size:15px; line-height:1.6; }
  .cover .cover-rule { margin-top:26px; width:56px; height:3px; border-radius:2px; background:#6d28d9; }
</style></head>
<body>
  <section class="cover">
    ${coverLogoHtml}
    <span class="cover-eyebrow">Step-by-step guide</span>
    <h1>${esc(guide.title)}</h1>
    ${guide.description ? `<p>${esc(guide.description)}</p>` : ""}
    <span class="cover-rule"></span>
  </section>
  <ol>${steps}</ol>
  <footer>Created with Docs Capture</footer>
</body></html>`;
}
