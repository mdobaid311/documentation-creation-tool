// Docs Capture — popup controller.
const DEFAULT_SERVER = "http://localhost:5000";

const el = (id) => document.getElementById(id);
const startBtn = el("startBtn");
const stopBtn = el("stopBtn");
const shotBtn = el("shotBtn");
const cancelBtn = el("cancelBtn");
const statusText = el("statusText");
const dot = el("dot");
const hint = el("hint");
const openApp = el("openApp");

function send(message) {
  return new Promise((resolve) => chrome.runtime.sendMessage(message, resolve));
}

async function getServer() {
  const d = await chrome.storage.local.get("dc_server");
  return (d.dc_server || DEFAULT_SERVER).replace(/\/$/, "");
}

function render(state) {
  const rec = state?.recording;
  dot.classList.toggle("rec", rec);
  startBtn.classList.toggle("hidden", rec);
  stopBtn.classList.toggle("hidden", !rec);
  shotBtn.classList.toggle("hidden", !rec);
  cancelBtn.classList.toggle("hidden", !rec);
  if (rec) {
    statusText.textContent = `Recording — ${state.stepCount} step${
      state.stepCount === 1 ? "" : "s"
    }`;
    hint.textContent =
      "Walk through your process now. Click Stop & save when you're done.";
  } else {
    statusText.textContent = "Ready to capture";
    hint.innerHTML =
      "Click <b>Start</b>, then walk through your process. Every click becomes a step.";
  }
}

async function refresh() {
  render(await send({ type: "GET_STATE" }));
}

startBtn.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && /^(chrome|edge|about|chrome-extension):/.test(tab.url || "")) {
    statusText.textContent = "Can't record browser pages — open a website first.";
    return;
  }
  render(await send({ type: "START", tab }));
});

stopBtn.addEventListener("click", async () => {
  statusText.textContent = "Saving…";
  const res = await send({ type: "STOP" });
  if (res?.ok) {
    statusText.textContent = "Saved! Opening your guide…";
    setTimeout(() => window.close(), 800);
  } else {
    statusText.textContent = res?.error || "Save failed.";
    await refresh();
  }
});

shotBtn.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && /^(chrome|edge|about|chrome-extension):/.test(tab.url || "")) {
    statusText.textContent = "Can't screenshot browser pages — open a website.";
    return;
  }
  shotBtn.disabled = true;
  const before = shotBtn.textContent;
  shotBtn.textContent = "Capturing…";
  const state = await send({ type: "SCREENSHOT", tab });
  shotBtn.textContent = "✓ Screenshot added";
  setTimeout(() => {
    shotBtn.textContent = before;
    shotBtn.disabled = false;
    render(state);
  }, 800);
});

cancelBtn.addEventListener("click", async () => {
  if (!confirm("Discard this recording?")) return;
  render(await send({ type: "CANCEL" }));
});

// Footer / settings
openApp.addEventListener("click", async (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: await getServer() });
});

el("settingsToggle").addEventListener("click", async () => {
  const box = el("settings");
  box.classList.toggle("hidden");
  el("serverUrl").value = await getServer();
});

el("saveServer").addEventListener("click", async () => {
  const url = el("serverUrl").value.trim() || DEFAULT_SERVER;
  await chrome.storage.local.set({ dc_server: url });
  el("settings").classList.add("hidden");
});

refresh();
