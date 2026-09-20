// Torok runtime architecture for osauer.dev/torok.
// Six layers left to right: the host application, Torok's typed surfaces, the
// Program/Runtime contract, the execution engine, its adapters, and the
// external systems they reach. A strip inside the runtime boundary shows the
// resident service's inbox, admission, episodes, receipts and archive.
// Facts come from the Torok README, DESIGN.md and package docs.

import { C, esc, icon, iconTile, component, line, chipAt, legendItem, header, junction, svgFrame } from "./lib.mjs";

const extraStyles = `      .flow-label-blue { font: 10.5px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; fill: ${C.blue}; }
      .flow-label-slate { font: 10.5px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; fill: ${C.slate}; }
      .state { font: 9.5px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
`;

// Pill node for the service strip, outlined in the flow hue.
function stripNode(x, y, width, label, iconName = "", color = C.blue) {
  const textX = iconName ? x + width / 2 + 11 : x + width / 2;
  return `<g>
    <rect x="${x}" y="${y}" width="${width}" height="28" rx="14" fill="${C.panel}" stroke="${color}" stroke-width="1.2"/>
    ${iconName ? icon(iconName, x + 12, y + 6, 16, color, 2) : ""}
    <text x="${textX}" y="${y + 18.5}" text-anchor="middle" class="strip-node">${esc(label)}</text>
  </g>`;
}

// Run-state pill on the dark engine block; returns its width for chaining.
function statePill(x, y, label, textFill) {
  const width = Math.round(label.length * 5.7 + 14);
  const svg = `<rect x="${x}" y="${y}" width="${width}" height="22" rx="11" fill="${C.terminal2}"/><text x="${x + width / 2}" y="${y + 15}" text-anchor="middle" class="state" style="fill:${textFill}">${esc(label)}</text>`;
  return { width, svg };
}

function stateRow(x, y, entries, separator = "", gap = 7) {
  let cursor = x;
  const parts = [];
  entries.forEach(([label, fill], index) => {
    if (index) {
      if (separator) {
        parts.push(`<text x="${cursor + 9}" y="${y + 15}" text-anchor="middle" class="state" style="fill:${C.textOnDarkDim}">${esc(separator)}</text>`);
        cursor += 18;
      } else {
        cursor += gap;
      }
    }
    const pill = statePill(cursor, y, label, fill);
    parts.push(pill.svg);
    cursor += pill.width;
  });
  return parts.join("");
}

function engineModule(y, iconName, iconColor, title, sub) {
  return `
  <rect x="620" y="${y}" width="272" height="64" rx="10" fill="${C.terminal2}"/>
  ${icon(iconName, 632, y + 15, 26, iconColor)}
  <text x="670" y="${y + 25}" class="module-title">${esc(title)}</text>
  <text x="670" y="${y + 45}" class="module-sub">${esc(sub)}</text>`;
}

const flowLabel = (cx, y, text, className = "flow-label") =>
  `<text x="${cx}" y="${y}" text-anchor="middle" class="${className}">${esc(text)}</text>`;

export function render() {
  const appRows = [212, 344, 476, 608];        // application and surface tile tops
  const appArrow = appRows.map((y) => y + 22);
  const adRows = [212, 312, 404, 496, 588, 680]; // adapter tile tops
  const adArrow = adRows.map((y) => y + 22);
  const busX = 926;

  // Resident service strip: row one is the durable path, row two feeds it.
  const strip = { x: 264, y: 772, w: 896, h: 124 };
  const row1 = strip.y + 34;
  const row2 = strip.y + 84;
  const nodes1 = [["Post", 46], ["Inbox", 53], ["Admission", 79], ["Episode", 66], ["Receipt", 66], ["Archive", 66]];
  const arrow1 = 94;
  const labels1 = ["stable ID", "budget · gate", "one run", "usage back", "when resolved"];
  let cursor = strip.x + 20;
  const centers = [];
  let stripRow1 = "";
  nodes1.forEach(([label, width], index) => {
    if (index) {
      const from = cursor + 2;
      const to = cursor + arrow1 - 2;
      stripRow1 += line(`M${from} ${row1 + 14}H${to}`, "blue", { dashed: true, width: 1.6 });
      stripRow1 += flowLabel((from + to) / 2, row1 + 6, labels1[index - 1], "flow-label-blue");
      cursor += arrow1;
    }
    stripRow1 += stripNode(cursor, row1, width, label);
    centers.push(cursor + width / 2);
    cursor += width;
  });
  const upArrow = (cx) => line(`M${cx} ${row2 - 2}V${row1 + 30}`, "blue", { dashed: true, width: 1.6 });
  const under = (cx, width) => Math.round(cx - width / 2);

  const body = `
  ${header("Runtime Architecture", "One engine runs the tool loop, checks typed answers and commits progress; work resumes after human input or a process restart.", { kicker: "Torok", logoFill: C.terminal })}
  ${icon("engine", 45, 35, 28, "#ffffff", 1.6)}

  ${legendItem(1104, 40, "slate", "Local typed calls")}
  ${legendItem(1276, 40, "amber", "Paid inference", { dotted: true })}
  ${legendItem(1104, 64, "blue", "Committed progress", { dashed: true })}
  ${legendItem(1276, 64, "green", "Tool effects")}

  <rect x="244" y="120" width="936" height="796" rx="16" fill="${C.panel}" stroke="${C.muted}" stroke-width="1.2"/>
  <path d="M244 156h936v-20a16 16 0 0 0 -16 -16h-904a16 16 0 0 0 -16 16z" fill="${C.panelAlt}"/>
  <text x="264" y="143" class="boundary">TOROK RUNTIME</text>
  <text x="1160" y="143" text-anchor="end" class="mono-small">one Go module · runs inside the host process · Go 1.27</text>

  <text x="36" y="184" class="layer">1 · APPLICATION</text>
  <text x="266" y="184" class="layer">2 · SURFACES</text>
  <text x="468" y="184" class="layer">3 · CONTRACT</text>
  <text x="596" y="184" class="layer">4 · EXECUTION ENGINE</text>
  <text x="940" y="184" class="layer">5 · ADAPTERS</text>
  <text x="1200" y="184" class="layer">6 · EXTERNAL SYSTEMS</text>

  ${component({ x: 36, y: appRows[0], iconName: "user", color: C.yellow, iconColor: C.ink, title: "Human", subtitle: ["typed answers", "exact approvals"], width: 168 })}
  ${component({ x: 36, y: appRows[1], iconName: "gitBranch", color: C.slate, title: "Agent · Workflow", subtitle: ["immutable config", "model · tools · checks", "Flow in a Go function"], width: 168 })}
  ${component({ x: 36, y: appRows[2], iconName: "function", color: C.slate, title: "Tool Functions", subtitle: ["typed in and out", "ordinary Go functions"], mono: "tool.Func · ReadOnly", width: 168 })}
  ${component({ x: 36, y: appRows[3], iconName: "settings", color: C.slate, title: "Resident Config", subtitle: ["one identity", "state dir · budget", "observers · schedules"], width: 168 })}

  ${line(`M206 ${appArrow[0]}H260`, "slate", { both: true })}
  ${flowLabel(233, appArrow[0] + 12, "reply", "flow-label-slate")}
  ${line(`M206 ${appArrow[1]}H260`, "slate")}
  ${flowLabel(233, appArrow[1] + 12, "input", "flow-label-slate")}
  ${line(`M206 ${appArrow[2]}H260`, "slate")}
  ${flowLabel(233, appArrow[2] + 12, "funcs", "flow-label-slate")}
  ${line(`M206 ${appArrow[3]}H260`, "slate")}
  ${flowLabel(233, appArrow[3] + 12, "config", "flow-label-slate")}

  ${component({ x: 266, y: appRows[0], iconName: "server", color: C.slate, title: "HTTP Adapter", subtitle: ["runs · input · SSE", "service routes · auth"], mono: "torokhttp", width: 180 })}
  ${chipAt(356, appRows[0] + 80, "cmd/torok-chat · demo")}
  ${component({ x: 266, y: appRows[1], iconName: "code", color: C.slate, title: "Typed Go API", subtitle: ["Run · RunAs[T] · Flow", "Session · Runtime"], mono: "torok", width: 180 })}
  ${chipAt(356, appRows[1] + 80, "schemas from Go types")}
  ${component({ x: 266, y: appRows[2], iconName: "plug", color: C.slate, title: "Tool Package", subtitle: ["frozen typed catalog", "ReadOnly · approval"], mono: "tool", width: 180 })}
  ${chipAt(356, appRows[2] + 80, "Dynamic · Registry")}
  ${component({ x: 266, y: appRows[3], iconName: "clockPlay", color: C.slate, title: "Resident Service", subtitle: ["inbox · schedules", "memory · observers"], mono: "service", width: 180 })}
  ${chipAt(376, appRows[3] + 80, "Post · Reply · Status")}
  ${line(`M288 ${appRows[3] + 48}V${strip.y - 4}`, "blue", { dashed: true })}

  ${line(`M448 ${appArrow[0]}H462`, "slate")}
  ${line(`M448 ${appArrow[1]}H462`, "slate")}
  ${line(`M448 ${appArrow[2]}H462`, "slate")}
  ${line(`M448 ${appArrow[3]}H462`, "slate")}

  <rect x="468" y="200" width="104" height="560" rx="14" fill="${C.greenSoft}" stroke="${C.greenLine}"/>
  ${icon("exchange", 505, 222, 30, C.greenDark, 1.8)}
  <text x="520" y="286" text-anchor="middle" class="node-title"><tspan x="520">One</tspan><tspan x="520" dy="17">Runtime</tspan></text>
  ${chipAt(520, 320, "Program", C.panel)}
  <text x="520" y="376" text-anchor="middle" class="node-sub"><tspan x="520">Start · Open</tspan><tspan x="520" dy="16">Resume · Cancel</tspan><tspan x="520" dy="16">Subscribe</tspan></text>
  <text x="520" y="530" text-anchor="middle" class="node-sub"><tspan x="520">Snapshot</tspan><tspan x="520" dy="16">Events</tspan><tspan x="520" dy="16">Result.Value</tspan></text>
  <text x="520" y="690" text-anchor="middle" class="node-sub"><tspan x="520">same rules</tspan><tspan x="520" dy="16">behind every</tspan><tspan x="520" dy="16">surface</tspan></text>

  ${line("M574 480H590", "slate")}

  <rect x="596" y="200" width="320" height="560" rx="16" fill="${C.terminal}"/>
  ${iconTile("engine", 620, 224, C.green, 46)}
  <text x="680" y="246" style="fill:#ffffff;font-size:18px;font-weight:700">torok runtime</text>
  <text x="680" y="267" class="node-sub on-dark">one engine for every surface</text>
  ${engineModule(300, "repeat", "#9fb3d9", "Tool Loop", "calls · typed-answer repair")}
  ${engineModule(372, "shieldCheck", "#6fd3c2", "Checks & Acceptance", "completed vs accepted")}
  ${engineModule(444, "gauge", C.yellow, "Shared Limits", "calls · steps · time · tokens")}
  ${engineModule(516, "lock", "#9fb3d9", "Leases & Cancellation", "fencing · recovery · replay")}
  ${engineModule(588, "fileCheck", "#6fd3c2", "Intent & Reconciliation", "commit → effect → receipt")}
  <rect x="620" y="664" width="272" height="1" fill="${C.terminalLine}"/>
  ${stateRow(620, 674, [["queued", C.textOnDark], ["running", C.textOnDark], ["waiting", C.textOnDark]], "→")}
  ${stateRow(620, 702, [["completed", "#6fd3c2"], ["accepted", "#6fd3c2"], ["failed", C.textOnDarkDim], ["cancelled", C.textOnDarkDim]])}
  <text x="620" y="746" class="mono-small" style="fill:${C.textOnDarkDim}">model window: 12 prior turns · 128 KiB</text>

  ${component({ x: 940, y: adRows[0], iconName: "cpu", color: C.amber, title: "Model Adapter", subtitle: ["Responses · Chat", "one inference per call"], mono: "model", width: 222 })}
  ${component({ x: 940, y: adRows[1], iconName: "receipt", color: C.amber, title: "Spend Ledger", subtitle: ["reserves before HTTP", "allowance · grace · ceiling"], mono: "model.Spend", width: 222 })}
  ${component({ x: 940, y: adRows[2], iconName: "database", color: C.blue, title: "Storage", subtitle: ["memory or SQLite · WAL", "atomic state + events"], mono: "store/sqlite", width: 222 })}
  ${component({ x: 940, y: adRows[3], iconName: "plugConnected", color: C.green, title: "MCP Client", subtitle: ["stdio · frozen catalog", "owns its child process"], mono: "tool/mcp", width: 222 })}
  ${component({ x: 940, y: adRows[4], iconName: "worldDownload", color: C.green, title: "Web Retrieval", subtitle: ["bounded HTTPS · PDF text", "exact public hosts"], mono: "tool/web", width: 222 })}
  ${component({ x: 940, y: adRows[5], iconName: "terminal", color: C.green, title: "Process Tool", subtitle: ["bounded time · output", "owned process group"], mono: "tool/command", width: 222 })}

  <path d="M916 480H${busX}M${busX} ${adArrow[0]}V${adArrow[5]}" fill="none" stroke="${C.slate}" stroke-width="1.5" stroke-linecap="round"/>
  ${junction(busX, 480)}
  ${line(`M${busX} ${adArrow[0]}H934`, "amber", { dotted: true })}
  ${line(`M${busX} ${adArrow[2]}H934`, "blue", { dashed: true })}
  ${line(`M${busX} ${adArrow[3]}H934`, "green")}
  ${line(`M${busX} ${adArrow[4]}H934`, "green")}
  ${line(`M${busX} ${adArrow[5]}H934`, "green")}
  ${line(`M962 ${adRows[0] + 70}V${adRows[1] - 6}`, "amber", { dotted: true })}
  <text x="974" y="${adRows[1] - 13}" class="flow-label">reserve → receipt</text>

  ${component({ x: 1200, y: adRows[0], iconName: "cloud", color: C.amber, title: "Model Endpoint", subtitle: ["explicit endpoint", "HTTPS · streamed text"], width: 204 })}
  ${chipAt(1302, adRows[0] + 84, "JSON · tool calls · usage", C.amberSoft)}
  ${component({ x: 1200, y: adRows[2], iconName: "database", color: C.blue, title: "State Directory", subtitle: ["private SQLite files", "app owns retention"], width: 204 })}
  ${component({ x: 1200, y: adRows[3], iconName: "server", color: C.green, title: "MCP Servers", subtitle: ["e.g. Canary", "JSON-RPC 2.0 · stdio"], width: 204 })}
  ${component({ x: 1200, y: adRows[4], iconName: "worldDownload", color: C.green, title: "Public Sources", subtitle: ["allow-listed hosts", "text · PDF"], width: 204 })}
  ${component({ x: 1200, y: adRows[5], iconName: "terminal", color: C.green, title: "Local Processes", subtitle: ["explicit executable", "not an OS sandbox"], width: 204 })}
  ${chipAt(1302, adRows[5] + 84, "args · output · exit code", C.greenSoft)}

  ${line(`M1164 ${adArrow[0]}H1194`, "amber", { dotted: true, both: true })}
  ${line(`M1164 ${adArrow[2]}H1194`, "blue", { dashed: true })}
  ${line(`M1164 ${adArrow[3]}H1194`, "green", { both: true })}
  ${line(`M1164 ${adArrow[4]}H1194`, "green")}
  ${line(`M1164 ${adArrow[5]}H1194`, "green")}

  <rect x="${strip.x}" y="${strip.y}" width="${strip.w}" height="${strip.h}" rx="14" fill="${C.blueSoft}" stroke="${C.blue}" stroke-width="1.2" stroke-dasharray="8 6"/>
  <text x="${strip.x + 20}" y="${strip.y + 24}" class="layer" style="fill:${C.blue}">RESIDENT SERVICE</text>
  <text x="${strip.x + strip.w - 20}" y="${strip.y + 24}" text-anchor="end" class="legend">one Serve owner per state directory · idle waiting costs no inference</text>
  ${stripRow1}
  ${stripNode(under(centers[1], 101), row2, 101, "Schedules", "clock")}
  ${upArrow(centers[1])}
  <text x="${centers[1] + 7}" y="${row2 - 7}" class="flow-label-blue">wakeups</text>
  ${stripNode(under(centers[2], 128), row2, 128, "Pause · Ready", "playerPause")}
  ${upArrow(centers[2])}
  <text x="${centers[2] + 7}" y="${row2 - 7}" class="flow-label-blue">holds admission</text>
  ${stripNode(under(centers[3], 134), row2, 134, "Working memory", "notes")}
  ${upArrow(centers[3])}
  <text x="${centers[3] + 7}" y="${row2 - 7}" class="flow-label-blue">notes · recall</text>
  ${stripNode(under(centers[4], 101), row2, 101, "Observers", "eye")}
  ${line(`M${under(centers[4], 101) + 103} ${row2 + 14}H${under(centers[5], 46) - 3}`, "blue", { dashed: true, width: 1.6 })}
  ${flowLabel((under(centers[4], 101) + 103 + under(centers[5], 46) - 3) / 2, row2 + 6, "no inference", "flow-label-blue")}
  ${stripNode(under(centers[5], 46), row2, 46, "View")}

  <text x="36" y="942" class="footnote">proof/Acceptance.lean models the acceptance boundary in Lean 4 and CI checks it · Go 1.27 · three direct dependencies: modernc sqlite, jsonschema, a PDF reader</text>
  <text x="1404" y="942" text-anchor="end" class="footnote">deterministic SVG · tools/render-diagrams.mjs · icons: Tabler 3.45 (MIT)</text>
  `;

  return svgFrame({
    width: 1440,
    height: 960,
    title: "Runtime Architecture (Torok)",
    description: "Six layers: the host application (human, agent and workflow, tool functions, resident configuration), Torok's typed surfaces (HTTP adapter, Go API, tool package, resident service), the Program and Runtime contract, the execution engine with shared limits, leases, intent commits and run states, the model, spend, storage and tool adapters, and the external systems they reach. A strip shows the resident service's inbox, admission, episodes, receipts and archive.",
    body,
    extraStyles,
  });
}
