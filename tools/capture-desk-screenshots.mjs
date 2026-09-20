#!/usr/bin/env node

// Recapture the Desk screenshots in assets/ from a running Desk simulation.
// Needs Google Chrome and Node 22+; no npm packages. Start Desk from its
// private checkout first, on spare ports so a live Desk is untouched:
//
//   ./desk -simulate -state "$(mktemp -d)" -addr 127.0.0.1:8891 -health 127.0.0.1:8892
//   node tools/capture-desk-screenshots.mjs assets http://127.0.0.1:8891/
//
// Simulation renders the real console with a synthetic paper book and scripted
// replies, so the captures carry no account data. The script drives Chrome over
// the DevTools protocol: it waits for the holdings table, clicks each section
// button, and saves WebP captures at 2x (desktop) and 3x (phone).

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";

const out = process.argv[2] || "assets";
const base = process.argv[3] || "http://127.0.0.1:8891/";
fs.mkdirSync(out, { recursive: true });
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "desk-capture-"));
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
  "--headless=new", "--remote-debugging-port=9333", `--user-data-dir=${profile}`,
  "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "--window-size=1440,900", "about:blank",
], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let version;
for (let i = 0; i < 60 && !version; i++) {
  try { version = await (await fetch("http://127.0.0.1:9333/json/version")).json(); } catch { await sleep(250); }
}
const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { const { res, rej } = pending.get(d.id); pending.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); } };
const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
const s = (m, p) => send(m, p, sessionId);
await s("Page.enable"); await s("Runtime.enable");
const evaluate = async (expression) => (await s("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value;
async function waitFor(expression, ms = 20000) {
  const start = Date.now();
  while (Date.now() - start < ms) { if (await evaluate(expression)) return true; await sleep(200); }
  throw new Error("timeout waiting for " + expression);
}
async function capture(file, format = "webp", quality = 88) {
  const { data } = await s("Page.captureScreenshot", { format, quality });
  fs.writeFileSync(path.join(out, file), Buffer.from(data, "base64"));
  console.log("wrote", file);
}
const sections = ["overview", "decisions", "risk", "market", "operations"];
const sectionsFor = { desk: ["overview", "decisions", "risk", "operations"], phone: ["overview"] };
async function run({ tag, width, height, scale, mobile, dark }) {
  await s("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: scale, mobile });
  await s("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: dark ? "dark" : "light" }, { name: "prefers-reduced-motion", value: "reduce" }] });
  await s("Page.navigate", { url: base });
  await waitFor("document.querySelectorAll('.underlying-row').length === 6");
  await sleep(1500);
  for (const section of sections) {
    await evaluate(`document.querySelector('button[data-section="${section}"]').click(); true`);
    await sleep(1200);
    if (!sectionsFor[tag].includes(section)) continue;
    await capture(`${tag}-${section}.webp`);
    if (tag === "desk" && section === "overview") await capture(`${tag}-${section}-social.jpg`, "jpeg", 86);
  }
}
try {
  await run({ tag: "desk", width: 1440, height: 900, scale: 2, mobile: false, dark: false });
  await run({ tag: "phone", width: 390, height: 844, scale: 3, mobile: true, dark: false });
} finally {
  ws.close(); chrome.kill();
  fs.rmSync(profile, { recursive: true, force: true });
}
