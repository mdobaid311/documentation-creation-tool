// Docs Capture — content script.
// Runs on every page. When a recording is active it watches the user's clicks
// and typing, builds a human-readable step + click coordinates, and hands it to
// the background worker (which adds the screenshot).

(() => {
  // Guard against double-injection (declared content_script + programmatic
  // injection into already-open tabs). Without this, listeners would be added
  // twice and each action captured twice.
  if (window.__docsCaptureLoaded) return;
  window.__docsCaptureLoaded = true;

  let recording = false;
  let lastCaptureAt = 0;
  const focusValues = new WeakMap();

  // --- recording flag, synced from background via storage --------------------
  chrome.storage.local.get("dc_recording", (d) => {
    recording = Boolean(d.dc_recording);
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.dc_recording) {
      recording = Boolean(changes.dc_recording.newValue);
    }
  });

  // --- element labelling -----------------------------------------------------
  function cleanText(s) {
    return (s || "").replace(/\s+/g, " ").trim().slice(0, 80);
  }

  function labelFor(el) {
    if (!el || el.nodeType !== 1) return "";
    return (
      cleanText(el.getAttribute?.("aria-label")) ||
      cleanText(el.getAttribute?.("alt")) ||
      cleanText(el.getAttribute?.("placeholder")) ||
      cleanText(el.value && el.type !== "password" ? el.value : "") ||
      cleanText(el.innerText || el.textContent) ||
      cleanText(el.getAttribute?.("title")) ||
      cleanText(el.getAttribute?.("name")) ||
      ""
    );
  }

  function roleOf(el) {
    const tag = el.tagName?.toLowerCase();
    if (tag === "a") return "link";
    if (tag === "button") return "button";
    if (tag === "input") {
      const t = (el.getAttribute("type") || "text").toLowerCase();
      if (["submit", "button"].includes(t)) return "button";
      if (["checkbox", "radio"].includes(t)) return t;
      return "field";
    }
    if (tag === "select") return "dropdown";
    if (tag === "textarea") return "field";
    if (el.getAttribute?.("role") === "button") return "button";
    return "element";
  }

  // Walk up to a meaningful, clickable ancestor (e.g. clicked an <svg> inside a button).
  function meaningfulTarget(el) {
    let node = el;
    for (let i = 0; i < 4 && node && node.nodeType === 1; i++) {
      const tag = node.tagName?.toLowerCase();
      if (
        ["a", "button", "input", "select", "textarea"].includes(tag) ||
        node.getAttribute?.("role") === "button" ||
        labelFor(node)
      ) {
        return node;
      }
      node = node.parentElement;
    }
    return el;
  }

  function describeClick(el) {
    const role = roleOf(el);
    const label = labelFor(el);
    if (label) return `Click the “${label}” ${role}`;
    return `Click the ${role}`;
  }

  // --- step assembly ---------------------------------------------------------
  // For small interactive controls, center the marker on the element (matches
  // Scribe and stays accurate even if the pointer lands near an edge). For large
  // targets, keep the actual pointer position.
  function focusPoint(el, ev, r) {
    if (r && r.width > 0 && r.height > 0) {
      const tag = el.tagName?.toLowerCase();
      const isControl =
        ["a", "button", "input", "select", "textarea"].includes(tag) ||
        el.getAttribute?.("role") === "button";
      if (isControl && r.width <= 420 && r.height <= 140) {
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }
    }
    return { x: ev.clientX, y: ev.clientY };
  }

  // Best-effort favicon URL for the current page (used as the guide logo).
  function pageFavicon() {
    const link = document.querySelector(
      'link[rel~="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'
    );
    if (link?.href) return link.href;
    try {
      return location.origin + "/favicon.ico";
    } catch {
      return "";
    }
  }

  function annotationFor(el, ev) {
    const r = el.getBoundingClientRect?.();
    const p = focusPoint(el, ev, r);
    return {
      clickX: p.x,
      clickY: p.y,
      rect: r ? { x: r.left, y: r.top, w: r.width, h: r.height } : undefined,
      viewport: { w: window.innerWidth, h: window.innerHeight },
    };
  }

  function send(step) {
    try {
      chrome.runtime.sendMessage({ type: "CAPTURE_STEP", step });
    } catch {
      /* extension context invalidated (reloaded) — ignore */
    }
  }

  // --- click capture ---------------------------------------------------------
  document.addEventListener(
    "mousedown",
    (ev) => {
      if (!recording || ev.button !== 0) return;
      const now = Date.now();
      if (now - lastCaptureAt < 350) return; // dedupe rapid double events
      lastCaptureAt = now;

      const el = meaningfulTarget(ev.target);
      // Give the page a tick to render any :active state, then capture.
      send({
        type: "click",
        title: cleanText(labelFor(el)) || describeClick(el),
        description: describeClick(el),
        annotation: annotationFor(el, ev),
        pageUrl: location.href,
        favicon: pageFavicon(),
      });
    },
    true
  );

  // --- typing capture --------------------------------------------------------
  const isTextEntry = (el) =>
    el &&
    ((el.tagName === "INPUT" &&
      !["checkbox", "radio", "submit", "button", "file"].includes(
        (el.getAttribute("type") || "text").toLowerCase()
      )) ||
      el.tagName === "TEXTAREA" ||
      el.isContentEditable);

  document.addEventListener(
    "focusin",
    (ev) => {
      if (recording && isTextEntry(ev.target)) {
        focusValues.set(ev.target, ev.target.value ?? ev.target.textContent ?? "");
      }
    },
    true
  );

  document.addEventListener(
    "focusout",
    (ev) => {
      if (!recording || !isTextEntry(ev.target)) return;
      const el = ev.target;
      const before = focusValues.get(el) ?? "";
      const after = el.value ?? el.textContent ?? "";
      if (after === before) return;

      const isPassword = (el.getAttribute?.("type") || "").toLowerCase() === "password";
      const fieldName = labelFor(el) || "field";
      const typed = isPassword ? "••••••••" : cleanText(after);
      const r = el.getBoundingClientRect?.();

      send({
        type: "type",
        title: `Type into “${fieldName}”`,
        description: isPassword
          ? `Enter the password in “${fieldName}”`
          : `Type “${typed}” into “${fieldName}”`,
        annotation: {
          rect: r ? { x: r.left, y: r.top, w: r.width, h: r.height } : undefined,
          viewport: { w: window.innerWidth, h: window.innerHeight },
        },
        pageUrl: location.href,
        favicon: pageFavicon(),
      });
    },
    true
  );
})();
