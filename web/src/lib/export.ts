import type { Guide, Step } from "./data";
import {
  markerFramePos,
  panFractions,
  resolveFocus,
  resolveZoom,
} from "./zoom";
import { estimateMinutes, formatDate } from "./format";

// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

function abs(url: string | null, base: string): string | null {
  if (!url) return null;
  return url.startsWith("http") ? url : `${base}${url}`;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

// Quoted UI element names render as inline "key chips" (Stripe-style).
function rich(text: string): string {
  return esc(text).replace(/[“"]([^”"]+)[”"]/g, '<b class="k">$1</b>');
}

function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function instructionOf(step: Step, i: number): string {
  return step.description?.trim() || step.title?.trim() || `Step ${i + 1}`;
}

// ---------------------------------------------------------------------------
//  Markdown export (lightweight)
// ---------------------------------------------------------------------------

export function guideToMarkdown(guide: Guide, baseUrl: string): string {
  const lines: string[] = [`# ${guide.title}`, ""];
  if (guide.description) lines.push(guide.description, "");
  guide.steps.forEach((step, i) => {
    lines.push(`### ${i + 1}. ${instructionOf(step, i)}`, "");
    const img = abs(step.screenshotUrl, baseUrl);
    if (img) lines.push(`![Step ${i + 1}](${img})`, "");
  });
  lines.push("---", `_Created with Docs Capture_`);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
//  Annotation: numbered hotspot + arrow
// ---------------------------------------------------------------------------

function annotationSvg(
  mx: number,
  my: number,
  vw: number,
  vh: number,
  num: number
): string {
  const H = (100 * vh) / vw; // viewBox height so 1 unit-x == 1 unit-y visually
  const px = mx * 100;
  const py = my * H;
  const r = 2.5;

  const L = 13;
  const ox = clamp(px + (mx < 0.5 ? 1 : -1) * L, 6, 94);
  const oy = clamp(py + (my < 0.5 ? 1 : -1) * L, 6, H - 6);
  const dx = px - ox;
  const dy = py - oy;
  const d = Math.hypot(dx, dy) || 1;
  const ux = dx / d;
  const uy = dy / d;
  const tipGap = r + 1.6;
  const tx = px - ux * tipGap;
  const ty = py - uy * tipGap;
  const s = 2.4;
  const bx = tx - ux * s;
  const by = ty - uy * s;
  const hw = s * 0.62;
  const ax = `${bx + -uy * hw},${by + ux * hw}`;
  const cx = `${bx - -uy * hw},${by - ux * hw}`;

  return `<svg class="anno" viewBox="0 0 100 ${H.toFixed(2)}" preserveAspectRatio="none">
      <line x1="${ox.toFixed(2)}" y1="${oy.toFixed(2)}" x2="${bx.toFixed(2)}" y2="${by.toFixed(2)}" stroke="#F4631E" stroke-width="0.7" stroke-linecap="round"/>
      <polygon points="${tx.toFixed(2)},${ty.toFixed(2)} ${ax} ${cx}" fill="#F4631E"/>
      <circle cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" r="${(r + 1).toFixed(2)}" fill="#FFE9DD" opacity="0.55"/>
    </svg>`;
}

// ---------------------------------------------------------------------------
//  Screenshot frame: browser chrome + zoom-to-cursor + hotspot/arrow
// ---------------------------------------------------------------------------

function stepFrame(step: Step, index: number, baseUrl: string): string {
  const img = abs(step.screenshotUrl, baseUrl);
  if (!img) return "";

  const ann = step.annotation;
  const vw = ann?.viewport?.w;
  const vh = ann?.viewport?.h;
  const domain = hostOf(step.pageUrl);
  const chrome = `<div class="chrome"><span class="tl"></span><span class="tl"></span><span class="tl"></span>${
    domain ? `<span class="urlpill">${esc(domain)}</span>` : ""
  }</div>`;

  if (!vw || !vh) {
    return `<figure class="frame">${chrome}<div class="shot"><img class="plain" src="${img}" alt="Step ${index + 1}"/></div></figure>`;
  }

  const z = resolveZoom(ann);
  const focus = resolveFocus(ann);
  const f = focus ?? { fx: 0.5, fy: 0.5 };
  const { tx, ty } = panFractions(f.fx, f.fy, z);
  const blurs = (ann?.blurs ?? [])
    .map(
      (b) =>
        `<div class="blur" style="left:${(b.x / vw) * 100}%;top:${(b.y / vh) * 100}%;width:${(b.w / vw) * 100}%;height:${(b.h / vh) * 100}%"></div>`
    )
    .join("");
  const marker = focus ? markerFramePos(f.fx, f.fy, z) : null;
  const anno = marker ? annotationSvg(marker.mx, marker.my, vw, vh, index + 1) : "";

  return `<figure class="frame">${chrome}
    <div class="shot" style="aspect-ratio:${vw}/${vh}">
      <div class="layer" style="transform:translate(${(tx * 100).toFixed(3)}%, ${(ty * 100).toFixed(3)}%) scale(${z})">
        <img src="${img}" alt="Step ${index + 1}"/>${blurs}
      </div>${anno}
    </div>
  </figure>`;
}

// ---------------------------------------------------------------------------
//  Page / block builders
// ---------------------------------------------------------------------------

function coverPage(guide: Guide, baseUrl: string): string {
  const logo = abs(guide.logoUrl, baseUrl);
  const N = guide.steps.length;
  const docIcon = `<svg viewBox="0 0 24 24" fill="none"><path d="M5 3.5h9.5L19 8v12.5a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-17Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8.5 12.5l2.2 2.2 4.3-4.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const logoBlock = logo
    ? `<div class="logo-plate"><img src="${logo}" alt=""/></div>`
    : `<div class="logo-glyph">${docIcon}</div>`;
  return `<section class="cover">
    <div class="cover-inner">
      ${logoBlock}
      <div class="cover-eyebrow">Product Guide</div>
      <h1 class="cover-title">${esc(guide.title)}</h1>
      ${guide.description ? `<p class="cover-sub">${esc(guide.description)}</p>` : ""}
      <div class="chips">
        <span class="chip">${estimateMinutes(N)} min read</span>
        <span class="chip">${N} step${N === 1 ? "" : "s"}</span>
        <span class="chip">Updated ${formatDate(guide.updatedAt)}</span>
      </div>
    </div>
  </section>`;
}

function stepBlock(
  guide: Guide,
  step: Step,
  i: number,
  baseUrl: string
): string {
  const last = i === guide.steps.length - 1;
  return `<article class="step${last ? " last" : ""}">
    <div class="spine"><span class="badge">${i + 1}</span><span class="spine-line"></span></div>
    <div class="content">
      <p class="action">${rich(instructionOf(step, i))}</p>
      ${stepFrame(step, i, baseUrl)}
    </div>
  </article>`;
}

// ---------------------------------------------------------------------------
//  Document
// ---------------------------------------------------------------------------

export function guideToHtml(
  guide: Guide,
  baseUrl: string,
  opts: { autoPrint?: boolean } = {}
): string {
  const steps = guide.steps
    .map((s, i) => stepBlock(guide, s, i, baseUrl))
    .join("\n");

  const autoPrint = opts.autoPrint
    ? `<script>window.addEventListener("load",function(){setTimeout(function(){window.print();},300);});</script>`
    : "";

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(guide.title)}</title>
<style>
  :root {
    --ink-0: #ffffff;
    --ink-50: #f8fafc;
    --ink-100: #f1f5f9;
    --ink-200: #e2e8f0;
    --ink-300: #cbd5e1;
    --ink-500: #64748b;
    --ink-700: #334155;
    --ink-900: #0f172a;
    --ink-950: #030712;
    
    --accent: #4f46e5;
    --accent-light: #6366f1;
    --accent-dark: #3730a3;
    --accent-soft: #eef2ff;
    
    --sans: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    --mono: "SF Mono", JetBrains Mono, ui-monospace, monospace;
  }
  
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #f3f4f6; }
  body { font-family: var(--sans); color: var(--ink-700); -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
  
  @page { size: A4; margin: 18mm 16mm 20mm; }
  @page:first { margin: 0; }

  /* Premium Cover Page */
  .cover { 
    position: relative; 
    width: 210mm; 
    min-height: 297mm; 
    margin: 0 auto; 
    background: var(--ink-950);
    color: #ffffff; 
    display: flex; 
    flex-direction: column; 
    padding: 32mm 24mm; 
    overflow: hidden; 
    break-after: page; 
  }
  .cover::before { 
    content: ""; 
    position: absolute; 
    inset: 0;
    background-image: linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
    background-size: 24px 24px; 
  }
  .cover::after { 
    content: ""; 
    position: absolute; 
    inset: 0;
    background: radial-gradient(75% 60% at 90% 10%, rgba(79, 70, 229, 0.24), transparent 75%); 
  }
  .cover-inner { position: relative; z-index: 1; flex: 1; display: flex; flex-direction: column; justify-content: center; }
  
  .logo-plate { 
    align-self: flex-start; 
    background: #ffffff; 
    border-radius: 14px; 
    padding: 14px 20px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3); 
  }
  .logo-plate img { display: block; max-height: 48px; max-width: 220px; object-fit: contain; }
  .logo-glyph { width: 56px; height: 56px; color: var(--accent-light); }
  .logo-glyph svg { width: 100%; height: 100%; }
  
  .cover-eyebrow { 
    margin-top: 48px; 
    font-size: 12px; 
    font-weight: 700; 
    letter-spacing: 0.14em;
    text-transform: uppercase; 
    color: var(--accent-light); 
  }
  .cover-title { 
    margin: 16px 0 0; 
    font-size: 46px; 
    line-height: 1.12; 
    font-weight: 800; 
    letter-spacing: -0.03em;
    color: #ffffff; 
    max-width: 18ch; 
  }
  .cover-sub { 
    margin: 20px 0 0; 
    font-size: 16px; 
    line-height: 1.6; 
    color: var(--ink-300); 
    max-width: 56ch; 
    font-weight: 400; 
  }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 40px; }
  .chip { 
    font-size: 12px; 
    font-weight: 500; 
    color: rgba(255, 255, 255, 0.85); 
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1); 
    border-radius: 100px; 
    padding: 6px 14px; 
    letter-spacing: -0.01em; 
  }

  /* Document Body Layout */
  .body { background: var(--ink-0); max-width: 210mm; margin: 0 auto; padding: 8mm 16mm 12mm; }

  .step { 
    display: flex; 
    gap: 24px; 
    padding: 24px 0 32px; 
    border-bottom: 1px solid var(--ink-100);
    break-inside: avoid; 
    page-break-inside: avoid; 
  }
  .step.last { border-bottom: none; }
  
  /* Timeline Spine styling */
  .spine { width: 36px; flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; }
  .badge { 
    width: 32px; 
    height: 32px; 
    border-radius: 10px; 
    display: inline-flex; 
    align-items: center;
    justify-content: center; 
    font-family: var(--sans); 
    font-weight: 700; 
    font-size: 13px; 
    color: #ffffff;
    background: linear-gradient(135deg, var(--accent-light), var(--accent));
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25); 
  }
  .spine-line { flex: 1; width: 2px; background: var(--ink-100); margin-top: 12px; border-radius: 2px; }
  
  .content { flex: 1; min-width: 0; }
  .action { 
    margin: 4px 0 16px; 
    font-size: 17px; 
    line-height: 1.45; 
    font-weight: 600; 
    color: var(--ink-900);
    letter-spacing: -0.015em; 
    max-width: 60ch; 
  }
  
  /* Elegant Stripe/Linear UI Key Chips */
  .k { 
    display: inline-block; 
    font-weight: 600; 
    color: var(--ink-900); 
    background: var(--ink-50);
    border: 1px solid var(--ink-200); 
    border-radius: 6px; 
    padding: 1px 6px; 
    font-size: 0.9em; 
    font-family: var(--sans); 
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04); 
    margin: 0 2px; 
  }

  /* Polished Browser Window Container Frame */
  .frame { 
    margin: 0; 
    border: 1px solid var(--ink-200); 
    border-radius: 12px; 
    overflow: hidden; 
    background: #ffffff;
    box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.02); 
  }
  .chrome { 
    display: flex; 
    align-items: center; 
    gap: 6px; 
    height: 36px; 
    padding: 0 16px; 
    background: var(--ink-50);
    border-bottom: 1px solid var(--ink-100); 
    position: relative; 
  }
  /* Modern Neutral Mac-style Window Controls */
  .chrome .tl { width: 9px; height: 9px; border-radius: 50%; background: var(--ink-200); }
  .chrome .tl:nth-child(1) { background: #fca5a5; } /* Minimal muted red */
  .chrome .tl:nth-child(2) { background: #fde047; } /* Minimal muted yellow */
  .chrome .tl:nth-child(3) { background: #86efac; } /* Minimal muted green */
  
  .chrome .urlpill { 
    position: absolute; 
    left: 50%; 
    transform: translateX(-50%); 
    background: #ffffff;
    border: 1px solid var(--ink-200); 
    border-radius: 6px; 
    padding: 3px 16px; 
    font-family: var(--mono);
    font-size: 11px; 
    color: var(--ink-500); 
    max-width: 50%; 
    overflow: hidden; 
    text-overflow: ellipsis; 
    white-space: nowrap; 
  }
  
  .shot { position: relative; overflow: hidden; background: var(--ink-50); }
  .shot .plain { display: block; width: 100%; }
  .layer { position: absolute; inset: 0; transform-origin: 0 0; }
  .layer img { display: block; width: 100%; }
  .blur { position: absolute; background: rgba(226, 232, 240, 0.4); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
  .anno { 
    position: absolute; 
    inset: 0; 
    width: 100%; 
    height: 100%; 
    overflow: visible; 
    pointer-events: none;
    filter: drop-shadow(0 4px 12px rgba(244, 99, 30, 0.3)); 
  }

  /* Document Footer styling */
  .doc-footer { 
    text-align: center; 
    color: var(--ink-500); 
    font-size: 11px; 
    font-weight: 500; 
    padding: 20px 0 4px;
    letter-spacing: -0.01em; 
    white-space: nowrap; 
    overflow: hidden; 
    text-overflow: ellipsis; 
  }

  @media print {
    html, body { background: #ffffff; }
    .body { padding: 0; max-width: none; }
    .doc-footer { position: fixed; left: 0; right: 0; bottom: 8mm; padding: 0; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style></head>
<body>
${coverPage(guide, baseUrl)}
<main class="body">
${steps}
</main>
${autoPrint}
</body></html>`;
}