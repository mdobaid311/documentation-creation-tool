// Docs Capture — background service worker (MV3).
// Owns recording state, grabs a screenshot for every captured action, and
// uploads the finished recording to the web app. State lives in
// chrome.storage.local so it survives the service worker being suspended.

const KEYS = {
  recording: "dc_recording",
  session: "dc_session",
  server: "dc_server",
};
const DEFAULT_SERVER = "http://localhost:5000";

// --- small storage helpers ---------------------------------------------------
const get = (keys) => chrome.storage.local.get(keys);
const set = (obj) => chrome.storage.local.set(obj);

async function getServer() {
  const s = await get(KEYS.server);
  return (s[KEYS.server] || DEFAULT_SERVER).replace(/\/$/, "");
}

// Serialize storage read-modify-write of the session so concurrent captures
// don't clobber each other.
let queue = Promise.resolve();
function enqueue(task) {
  queue = queue.then(task, task);
  return queue;
}

async function setBadge(text, color = "#6d28d9") {
  try {
    await chrome.action.setBadgeBackgroundColor({ color });
    await chrome.action.setBadgeText({ text });
  } catch {
    /* action may be unavailable on some pages */
  }
}

async function getState() {
  const data = await get([KEYS.recording, KEYS.session]);
  return {
    recording: Boolean(data[KEYS.recording]),
    stepCount: data[KEYS.session]?.steps?.length ?? 0,
  };
}

// Inject the content script into a tab (no-op if it's already there, thanks to
// the guard in content.js). Fails silently on restricted pages.
async function injectTab(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
  } catch {
    /* chrome://, web store, PDF viewer, etc. */
  }
}

// Declared content_scripts only auto-inject on pages loaded AFTER the extension
// is (re)loaded. Inject into already-open tabs so capture works without a manual
// refresh of every tab.
async function injectExistingTabs() {
  const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });
  await Promise.all(tabs.map((t) => (t.id ? injectTab(t.id) : null)));
}
chrome.runtime.onInstalled.addListener(injectExistingTabs);
chrome.runtime.onStartup.addListener(injectExistingTabs);

// --- recording lifecycle -----------------------------------------------------
async function startRecording(tab) {
  // Make sure the tab we're starting on has the content script, even if it was
  // open before the extension loaded.
  if (tab?.id) await injectTab(tab.id);

  const url = tab?.url ?? "";
  const session = {
    startedAt: Date.now(),
    sourceUrl: url,
    title: tab?.title ?? "",
    favicon: tab?.favIconUrl ?? "",
    steps: [],
  };

  // First step: a screenshot of the page where recording started, with an
  // instruction to navigate to that URL.
  if (/^https?:\/\//i.test(url)) {
    let screenshot = null;
    try {
      screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, {
        format: "png",
      });
    } catch (e) {
      console.warn("initial captureVisibleTab failed:", e?.message);
    }
    session.steps.push({
      type: "navigate",
      title: "Open the page",
      description: `Open your web browser and navigate to the following URL: ${url}`,
      annotation: null,
      pageUrl: url,
      screenshot,
    });
  }

  await set({ [KEYS.recording]: true, [KEYS.session]: session });
  await setBadge(session.steps.length ? String(session.steps.length) : "REC", "#dc2626");
  return getState();
}

async function cancelRecording() {
  await set({ [KEYS.recording]: false, [KEYS.session]: null });
  await setBadge("");
  return getState();
}

async function captureStep(step, windowId) {
  return enqueue(async () => {
    const data = await get([KEYS.recording, KEYS.session]);
    if (!data[KEYS.recording] || !data[KEYS.session]) return;

    let screenshot = null;
    try {
      screenshot = await chrome.tabs.captureVisibleTab(windowId, {
        format: "png",
      });
    } catch (e) {
      // Capture can fail on restricted pages (chrome://, the store, etc.).
      console.warn("captureVisibleTab failed:", e?.message);
    }

    const session = data[KEYS.session];
    // Adopt the first favicon we see if none was captured at start.
    if (step.favicon && !session.favicon) session.favicon = step.favicon;
    const { favicon, ...stepData } = step;
    session.steps.push({ ...stepData, screenshot });
    await set({ [KEYS.session]: session });
    await setBadge(String(session.steps.length), "#dc2626");
  });
}

async function stopRecording() {
  const data = await get([KEYS.recording, KEYS.session]);
  const session = data[KEYS.session];
  await set({ [KEYS.recording]: false });
  await setBadge("");

  if (!session || session.steps.length === 0) {
    await set({ [KEYS.session]: null });
    return { ok: false, error: "No steps were captured." };
  }

  const server = await getServer();
  const payload = {
    title: session.title || "Untitled guide",
    sourceUrl: session.sourceUrl,
    faviconUrl: session.favicon || "",
    steps: session.steps.map((s) => ({
      type: s.type,
      title: s.title,
      description: s.description,
      screenshot: s.screenshot,
      annotation: s.annotation,
      pageUrl: s.pageUrl,
    })),
  };

  try {
    const res = await fetch(`${server}/api/recordings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Upload failed (${res.status})`);
    }
    const result = await res.json();
    await set({ [KEYS.session]: null });
    if (result.editUrl) chrome.tabs.create({ url: result.editUrl });
    return { ok: true, editUrl: result.editUrl };
  } catch (e) {
    // Keep the session so the user can retry.
    return { ok: false, error: e.message };
  }
}

// --- message routing ---------------------------------------------------------
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    switch (msg?.type) {
      case "START":
        sendResponse(await startRecording(msg.tab ?? sender.tab));
        break;
      case "STOP":
        sendResponse(await stopRecording());
        break;
      case "CANCEL":
        sendResponse(await cancelRecording());
        break;
      case "CAPTURE_STEP":
        await captureStep(msg.step, sender.tab?.windowId);
        sendResponse({ ok: true });
        break;
      case "SCREENSHOT": {
        // Manual full-page screenshot step, triggered from the popup button.
        const shotTab = msg.tab ?? sender.tab;
        await captureStep(
          {
            type: "manual",
            title: "",
            description: "",
            annotation: null,
            pageUrl: shotTab?.url ?? "",
            favicon: shotTab?.favIconUrl ?? "",
          },
          shotTab?.windowId
        );
        sendResponse(await getState());
        break;
      }
      case "GET_STATE":
        sendResponse(await getState());
        break;
      default:
        sendResponse({ ok: false, error: "Unknown message" });
    }
  })();
  return true; // keep the channel open for the async response
});
