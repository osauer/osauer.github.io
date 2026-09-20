// "How Desk is put together": every component Desk is built from and how they
// connect. Same visual vocabulary as Canary's diagrams (lib.mjs); absolute
// coordinates, helper calls, nothing external but the Canary mark.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { C, esc, icon, iconTile, component, line, chipAt, legendItem, header, junction, svgFrame } from "./lib.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const canaryMark = fs.readFileSync(path.join(root, "assets/canary-icon.png")).toString("base64");

// Amber-outlined pill used in the paid-model strip (same idiom as Canary's remote strip).
function stripNode(x, y, width, label, iconName = "") {
  const textX = iconName ? x + width / 2 + 11 : x + width / 2;
  return `<g>
    <rect x="${x}" y="${y}" width="${width}" height="28" rx="14" fill="${C.panel}" stroke="${C.amber}" stroke-width="1.2"/>
    ${iconName ? icon(iconName, x + 12, y + 6, 16, C.amber, 2) : ""}
    <text x="${textX}" y="${y + 18.5}" text-anchor="middle" class="strip-node">${esc(label)}</text>
  </g>`;
}

// Inner module row of a dark authority block.
function moduleRow({ x, y, width, height = 64, iconName, iconColor, title, lines }) {
  const titleY = y + (height === 64 ? 25 : 27);
  const gap = 16;
  const firstSub = titleY + 20;
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="10" fill="${C.terminal2}"/>
  ${icon(iconName, x + 12, y + (height === 64 ? 19 : 26), 26, iconColor)}
  <text x="${x + 50}" y="${titleY}" class="module-title">${esc(title)}</text>
  <text x="${x + 50}" y="${firstSub}" class="module-sub">${lines.map((l, i) => `<tspan x="${x + 50}" dy="${i ? gap : 0}">${esc(l)}</tspan>`).join("")}</text>`;
}

// Mono label sitting above or below a horizontal arrow.
const flowNote = (cx, y, label, color = C.muted) =>
  `<text x="${cx}" y="${y}" text-anchor="middle" class="mono-small" style="fill:${color}">${esc(label)}</text>`;

function render() {
  // Columns (x): owner 36..186 · box 214..894 · canary 970..1182 · providers 1214..1404
  const owner = { x: 36, w: 150, rows: [212, 312, 412, 512, 612] };
  const host = { x: 234, w: 130, top: 200, h: 524 };
  const torok = { x: 390, w: 270, top: 200, h: 524 };
  const busX = 670;
  const conf = { x: 684, w: 196, rows: [212, 312, 412, 512, 612] };
  const canary = { x: 970, w: 212, top: 200, h: 472 };
  const prov = { x: 1214, w: 190, rows: [212, 370, 528, 686] };
  const ay = (top) => top + 22;
  const hostCx = host.x + host.w / 2;
  const torokCx = torok.x + torok.w / 2;
  const gapCx = 926; // centre of the arrows between the Desk box and Canary
  const provCx = prov.x + 95;
  const strip = { x: 36, y: 790, w: 1368, h: 112 };
  const openai = { x: torokCx - 80, y: 818, w: 160, h: 64 };
  const toCanary = 886; // arrows leave the capability tiles here

  const body = `
  ${header("How Desk is put together", "One Go process on the owner's Mac: Torok runs the work, hyperserve serves the console, Canary owns the broker session.", { kicker: "Desk", logoFill: C.terminal })}
  ${icon("layoutDashboard", 47, 37, 24, "#ffffff", 1.8)}

  ${legendItem(1157, 40, "slate", "Local typed flow")}
  ${legendItem(1304, 40, "green", "Broker path")}
  ${legendItem(1138, 64, "blue", "Observed data", { dashed: true })}
  ${legendItem(1268, 64, "amber", "Paid model calls", { dotted: true })}

  <rect x="214" y="120" width="680" height="628" rx="16" fill="${C.panel}" stroke="${C.muted}" stroke-width="1.2"/>
  <path d="M214 156h680v-20a16 16 0 0 0 -16 -16h-648a16 16 0 0 0 -16 16z" fill="${C.panelAlt}"/>
  <text x="234" y="143" class="boundary">DESK PROCESS</text>
  <text x="874" y="143" text-anchor="end" class="mono-small">one Go binary · macOS LaunchAgent com.osauer.desk · loopback listeners</text>

  <text x="36" y="184" class="layer">1 · OWNER</text>
  <text x="${host.x}" y="184" class="layer">2 · HOST</text>
  <text x="${torok.x}" y="184" class="layer">3 · WORK AUTHORITY</text>
  <text x="${conf.x}" y="184" class="layer">4 · DESK CAPABILITIES</text>
  <text x="${canary.x}" y="184" class="layer">5 · BROKER AUTHORITY</text>
  <text x="${prov.x}" y="184" class="layer">6 · PROVIDERS / DATA</text>

  ${component({ x: owner.x, y: owner.rows[0], iconName: "user", color: C.slate, title: "Owner", subtitle: ["browser console"], mono: "127.0.0.1:8791", width: owner.w })}
  ${component({ x: owner.x, y: owner.rows[1], iconName: "deviceMobile", color: C.slate, title: "Phone", subtitle: ["same console", "over loopback"], width: owner.w })}
  ${component({ x: owner.x, y: owner.rows[2], iconName: "fingerprint", color: C.green, title: "Passkey", subtitle: ["WebAuthn device", "confirms orders"], width: owner.w })}
  ${component({ x: owner.x, y: owner.rows[3], iconName: "bell", color: C.slate, title: "Notifications", subtitle: ["macOS helper"], mono: "terminal-notifier", width: owner.w })}
  ${component({ x: owner.x, y: owner.rows[4], iconName: "deviceLaptop", color: C.slate, title: "macOS", subtitle: ["launchd at login"], mono: "com.osauer.desk", width: owner.w })}

  ${line(`M192 ${ay(owner.rows[0])}H228`, "slate", { both: true })}
  ${line(`M192 ${ay(owner.rows[1])}H228`, "slate", { both: true })}
  ${line(`M192 ${ay(owner.rows[2])}H228`, "green")}
  ${line(`M228 ${ay(owner.rows[3])}H204`, "slate")}
  ${line(`M192 ${ay(owner.rows[4])}H215`, "slate")}

  <rect x="${host.x}" y="${host.top}" width="${host.w}" height="${host.h}" rx="14" fill="${C.greenSoft}" stroke="${C.greenLine}"/>
  ${icon("server", hostCx - 15, 222, 30, C.greenDark, 1.8)}
  <text x="${hostCx}" y="282" text-anchor="middle" class="node-title">hyperserve</text>
  <text x="${hostCx}" y="300" text-anchor="middle" class="node-sub">HTTP host · v2</text>
  ${chipAt(hostCx, 316, "127.0.0.1:8791", C.panel)}
  <text x="${hostCx}" y="376" text-anchor="middle" class="node-sub"><tspan x="${hostCx}">console files</tspan><tspan x="${hostCx}" dy="16">JSON API</tspan><tspan x="${hostCx}" dy="16">MCP status</tspan></text>
  ${chipAt(hostCx, 448, "127.0.0.1:8792", C.panel)}
  <text x="${hostCx}" y="500" text-anchor="middle" class="node-sub"><tspan x="${hostCx}">health listener</tspan><tspan x="${hostCx}" dy="16">/healthz · /livez</tspan><tspan x="${hostCx}" dy="16">/readyz</tspan></text>
  <text x="${hostCx}" y="588" text-anchor="middle" class="node-sub"><tspan x="${hostCx}">SSE live feed</tspan><tspan x="${hostCx}" dy="16">snapshots · quotes</tspan></text>
  <text x="${hostCx}" y="672" text-anchor="middle" class="node-sub"><tspan x="${hostCx}">no sign-in</tspan><tspan x="${hostCx}" dy="16">loopback only</tspan></text>

  ${line(`M370 352H384`, "slate", { both: true })}
  ${line(`M384 599H370`, "blue", { dashed: true })}

  <rect x="${torok.x}" y="${torok.top}" width="${torok.w}" height="${torok.h}" rx="16" fill="${C.terminal}"/>
  ${iconTile("serverCog", torok.x + 20, 224, C.blue, 46)}
  <text x="${torok.x + 80}" y="246" style="fill:#ffffff;font-size:18px;font-weight:700">torok resident</text>
  <text x="${torok.x + 80}" y="267" class="node-sub on-dark">durable work authority</text>
  ${moduleRow({ x: torok.x + 20, y: 296, width: 230, height: 78, iconName: "inbox", iconColor: "#9fb3d9", title: "Inbox & schedules", lines: ["durable inbox · wakeups", "07:00 Berlin · venue times"] })}
  ${moduleRow({ x: torok.x + 20, y: 384, width: 230, height: 78, iconName: "clock", iconColor: "#9fb3d9", title: "Bounded episodes", lines: ["12 model · 64 tool · 8 min", "daily 120 model · 400 tool"] })}
  ${moduleRow({ x: torok.x + 20, y: 472, width: 230, height: 78, iconName: "coins", iconColor: C.yellow, title: "Spending ledger", lines: ["$100 monthly · 48 h grace", "$200 absolute ceiling"] })}
  ${moduleRow({ x: torok.x + 20, y: 560, width: 230, height: 78, iconName: "database", iconColor: "#6fd3c2", title: "Records & memory", lines: ["decisions · working memory", "observers · SQLite state"] })}
  <rect x="${torok.x + 20}" y="654" width="230" height="1" fill="${C.terminalLine}"/>
  <text x="${torok.x + 20}" y="676" class="mono-small" style="fill:${C.textOnDarkDim}">decisions carry reasons,</text>
  <text x="${torok.x + 20}" y="692" class="mono-small" style="fill:${C.textOnDarkDim}">falsification conditions, deadlines</text>
  <text x="${torok.x + 20}" y="708" class="mono-small" style="fill:${C.textOnDarkDim}">~/Library/Application Support/Desk</text>

  ${component({ x: conf.x, y: conf.rows[0], iconName: "fileText", color: C.slate, title: "Instructions", subtitle: ["agent · specialist", "reviewer · assessment"], width: conf.w })}
  ${component({ x: conf.x, y: conf.rows[1], iconName: "route", color: C.slate, title: "Chat workflow", subtitle: ["interpret → evidence", "analyst → review"], width: conf.w })}
  ${component({ x: conf.x, y: conf.rows[2], iconName: "lock", color: C.green, title: "Order path", subtitle: ["passkey-confirmed", "single-leg DAY limit"], width: conf.w })}
  ${component({ x: conf.x, y: conf.rows[3], iconName: "code", color: C.blue, title: "Canary Go client", subtitle: ["reads 30 s – 5 min", "display feed 100 ms"], width: conf.w })}
  ${component({ x: conf.x, y: conf.rows[4], iconName: "plugConnected", color: C.slate, title: "Specialist tools", subtitle: ["19 read-only tools", "official web sources"], width: conf.w })}

  <path d="M${torok.x + torok.w} 462H${busX}M${busX} ${ay(conf.rows[0])}V${ay(conf.rows[4])}" fill="none" stroke="${C.slate}" stroke-width="1.5" stroke-linecap="round"/>
  ${junction(busX, 462)}
  ${line(`M${busX} ${ay(conf.rows[0])}H${conf.x - 6}`, "slate")}
  ${line(`M${busX} ${ay(conf.rows[1])}H${conf.x - 6}`, "slate")}
  ${line(`M${busX} ${ay(conf.rows[3])}H${conf.x - 6}`, "blue", { dashed: true })}
  ${line(`M${busX} ${ay(conf.rows[4])}H${conf.x - 6}`, "slate")}

  ${line(`M${toCanary} ${ay(conf.rows[2])}H${canary.x - 6}`, "green")}
  ${flowNote(gapCx, ay(conf.rows[2]) - 6, "gated CLI", C.greenDark)}
  ${flowNote(gapCx, ay(conf.rows[2]) + 15, "exact order", C.greenDark)}
  ${line(`M${toCanary} ${ay(conf.rows[3])}H${canary.x - 6}`, "blue", { dashed: true, both: true })}
  ${flowNote(gapCx, ay(conf.rows[3]) - 6, "typed RPC", C.blue)}
  ${flowNote(gapCx, ay(conf.rows[3]) + 15, "Unix socket", C.blue)}
  ${line(`M${toCanary} ${ay(conf.rows[4])}H${canary.x - 6}`, "slate")}
  ${flowNote(gapCx, ay(conf.rows[4]) - 6, "stdio MCP")}
  ${line(`M${toCanary} ${ay(conf.rows[4]) + 20}H${gapCx}V${ay(prov.rows[3])}H${prov.x - 6}`, "blue", { dashed: true })}
  ${flowNote(1070, ay(prov.rows[3]) - 8, "Torok web tool · HTTPS", C.blue)}
  ${flowNote(1070, ay(prov.rows[3]) + 15, "retrieval only · no news feed", C.blue)}

  <rect x="${canary.x}" y="${canary.top}" width="${canary.w}" height="${canary.h}" rx="16" fill="${C.terminal}"/>
  <clipPath id="canary-mark"><rect x="${canary.x + 16}" y="222" width="36" height="36" rx="8"/></clipPath>
  <image href="data:image/png;base64,${canaryMark}" x="${canary.x + 16}" y="222" width="36" height="36" preserveAspectRatio="xMidYMid slice" clip-path="url(#canary-mark)"/>
  <text x="${canary.x + 64}" y="246" style="fill:#ffffff;font-size:18px;font-weight:700">canary daemon</text>
  <text x="${canary.x + 64}" y="267" class="node-sub on-dark">broker authority</text>
  ${moduleRow({ x: canary.x + 16, y: 296, width: 180, iconName: "plug", iconColor: "#6fd3c2", title: "Broker session", lines: ["primary + breadth"] })}
  ${moduleRow({ x: canary.x + 16, y: 372, width: 180, iconName: "shieldCheck", iconColor: "#6fd3c2", title: "Risk & calendars", lines: ["risk rules · venues"] })}
  ${moduleRow({ x: canary.x + 16, y: 448, width: 180, iconName: "fileText", iconColor: C.yellow, title: "Proposals & recon", lines: ["hedges · Flex-backed"] })}
  ${moduleRow({ x: canary.x + 16, y: 524, width: 180, iconName: "chartLine", iconColor: "#9fb3d9", title: "Display & history", lines: ["quotes · P&L · bars"] })}
  <rect x="${canary.x + 16}" y="604" width="180" height="1" fill="${C.terminalLine}"/>
  <text x="${canary.x + 16}" y="628" class="mono-small" style="fill:${C.textOnDarkDim}">own process · autospawned</text>
  <text x="${canary.x + 16}" y="644" class="mono-small" style="fill:${C.textOnDarkDim}">1 of 4 display subscriptions</text>

  ${component({ x: prov.x, y: prov.rows[0], iconName: "server", color: C.green, title: "TWS / IB Gateway", subtitle: ["owner's IBKR login", "own entitlements"], width: prov.w })}
  ${chipAt(provCx, 292, "TWS wire · TCP", C.greenSoft)}
  ${component({ x: prov.x, y: prov.rows[1], iconName: "fileText", color: C.blue, title: "IBKR Flex", subtitle: ["daily statements", "recon · performance"], width: prov.w })}
  ${chipAt(provCx, 450, "Flex · HTTPS", C.blueSoft)}
  ${component({ x: prov.x, y: prov.rows[2], iconName: "worldDownload", color: C.blue, title: "Market sources", subtitle: ["FRED · CBOE · Nasdaq", "Treasury · Fed"], width: prov.w })}
  ${chipAt(provCx, 608, "HTTPS · JSON/CSV/XML", C.blueSoft)}
  ${component({ x: prov.x, y: prov.rows[3], iconName: "world", color: C.blue, title: "Official sources", subtitle: ["Fed · BLS · BEA", "ECB · SEC · Treasury"], width: prov.w })}

  ${line(`M${canary.x + canary.w + 6} ${ay(prov.rows[0])}H${prov.x - 6}`, "green", { both: true })}
  ${line(`M${canary.x + canary.w + 6} ${ay(prov.rows[1])}H${prov.x - 6}`, "blue", { dashed: true })}
  ${line(`M${canary.x + canary.w + 6} ${ay(prov.rows[2])}H${prov.x - 6}`, "blue", { dashed: true })}

  ${line(`M${torokCx} ${torok.top + torok.h}V${openai.y - 6}`, "amber", { dotted: true, width: 1.6 })}
  <text x="${torokCx + 10}" y="776" class="flow-label">Responses API · HTTPS</text>

  <rect x="${strip.x}" y="${strip.y}" width="${strip.w}" height="${strip.h}" rx="14" fill="${C.amberSoft}" stroke="${C.amber}" stroke-width="1.2" stroke-dasharray="8 6"/>
  <text x="56" y="816" class="layer" style="fill:${C.amber}">PAID MODEL CALLS</text>
  <text x="1384" y="816" text-anchor="end" class="legend">every call reserves the monthly allowance before it is sent</text>
  <text x="56" y="846" class="legend">key from the environment or a private local file</text>
  <text x="56" y="864" class="legend">loaded at request time · never in instructions</text>
  <text x="56" y="882" class="legend">sent only to the permitted HTTPS host</text>

  <rect x="${openai.x}" y="${openai.y}" width="${openai.w}" height="${openai.h}" rx="14" fill="${C.panel}" stroke="${C.amber}" stroke-width="1.2"/>
  ${icon("cloud", openai.x + 14, openai.y + 20, 24, C.amber, 2)}
  <text x="${openai.x + 48}" y="${openai.y + 28}" class="strip-node">OpenAI</text>
  <text x="${openai.x + 48}" y="${openai.y + 46}" class="legend">model provider</text>
  ${line(`M${openai.x + openai.w + 8} 832H800`, "amber", { dotted: true, width: 1.6 })}
  <text x="${(openai.x + openai.w + 8 + 800) / 2}" y="826" text-anchor="middle" class="flow-label">analyst · medium reasoning</text>
  ${stripNode(808, 818, 118, "gpt-6-astra")}
  ${line(`M${openai.x + openai.w + 8} 868H800`, "amber", { dotted: true, width: 1.6 })}
  <text x="${(openai.x + openai.w + 8 + 800) / 2}" y="862" text-anchor="middle" class="flow-label">reviewer · research specialist</text>
  ${stripNode(808, 854, 128, "gpt-5.6-terra")}
  <text x="1384" y="864" text-anchor="end" class="legend">the reviewer is a different model from the analyst</text>
  <text x="1384" y="882" text-anchor="end" class="legend">delegation and review share the episode's limits</text>

  <text x="1404" y="930" text-anchor="end" class="footnote">deterministic SVG · tools/render-diagrams.mjs · icons: Tabler 3.45 (MIT)</text>
  `;

  return svgFrame({
    width: 1440,
    height: 952,
    title: "How Desk is put together",
    description: "Six layers show the owner's devices, the hyperserve HTTP host, the Torok resident service that owns durable work and limits, Desk's own capabilities, the Canary daemon that owns the broker session, and the external providers. A separate strip shows the paid OpenAI model calls.",
    body,
  });
}

export { render };
