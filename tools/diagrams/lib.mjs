// Shared, dependency-free SVG diagram helpers for osauer.dev.
// Extracted from Canary's scripts/render-architecture.mjs so every diagram on
// the site shares one visual vocabulary: paper background, borderless
// icon-tile components, a dark authority block, typed flow hues and a legend.
// Icons are Tabler Icons 3.45.0 (MIT); see ICON-LICENSE.txt beside the output.

const icons = {
  engine: `<path d="M3 10v6M12 5v3M10 5h4M5 13h-2"/><path d="M6 10h2l2 -2h3.382a1 1 0 0 1 .894 .553l1.448 2.894a1 1 0 0 0 .894 .553h1.382v-2h2a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-2v-2h-3v2a1 1 0 0 1 -1 1h-3.465a1 1 0 0 1 -.832 -.445l-1.703 -2.555h-2v-6"/>`,
  function: `<path d="M4 6.667a2.667 2.667 0 0 1 2.667 -2.667h10.666a2.667 2.667 0 0 1 2.667 2.667v10.666a2.667 2.667 0 0 1 -2.667 2.667h-10.666a2.667 2.667 0 0 1 -2.667 -2.667l0 -10.666"/><path d="M9 15.5v.25c0 .69 .56 1.25 1.25 1.25c.71 0 1.304 -.538 1.374 -1.244l.752 -7.512a1.381 1.381 0 0 1 1.374 -1.244c.69 0 1.25 .56 1.25 1.25v.25M9 12h6"/>`,
  gauge: `<path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0M11 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0M13.41 10.59l2.59 -2.59M7 12a5 5 0 0 1 5 -5"/>`,
  clock: `<path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0M12 7v5l3 3"/>`,
  clockPlay: `<path d="M12 7v5l2 2M17 22l5 -3l-5 -3l0 6M13.017 20.943a9 9 0 1 1 7.831 -7.292"/>`,
  notes: `<path d="M5 5a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2l0 -14M9 7l6 0M9 11l6 0M9 15l4 0"/>`,
  eye: `<path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"/><path d="M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6"/>`,
  receipt: `<path d="M5 21v-16a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16l-3 -2l-2 2l-2 -2l-2 2l-2 -2l-3 2m4 -14h6m-6 4h6m-2 4h2"/>`,
  repeat: `<path d="M4 12v-3a3 3 0 0 1 3 -3h13m-3 -3l3 3l-3 3"/><path d="M20 12v3a3 3 0 0 1 -3 3h-13m3 3l-3 -3l3 -3"/>`,
  gitBranch: `<path d="M5 18a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M5 6a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M15 6a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M7 8l0 8M9 18h6a2 2 0 0 0 2 -2v-5M14 14l3 -3l3 3"/>`,
  fileCheck: `<path d="M14 3v4a1 1 0 0 0 1 1h4M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2M9 15l2 2l4 -4"/>`,
  playerPause: `<path d="M6 6a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1l0 -12M14 6a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1l0 -12"/>`,
  user: `<path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0"/><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"/>`,
  cpu: `<path d="M5 6a1 1 0 0 1 1 -1h12a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-12a1 1 0 0 1 -1 -1l0 -12"/><path d="M8 10v-2h2m6 6v2h-2m-4 0h-2v-2m8 -4v-2h-2"/><path d="M3 10h2M3 14h2M10 3v2M14 3v2M21 10h-2M21 14h-2M14 21v-2M10 21v-2"/>`,
  terminal: `<path d="M8 9l3 3l-3 3M13 15h3"/><path d="M3 6a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z"/>`,
  code: `<path d="M7 8l-4 4l4 4"/><path d="M17 8l4 4l-4 4"/><path d="M14 4l-4 16"/>`,
  plugConnected: `<path d="M7 12l5 5l-1.5 1.5a3.536 3.536 0 1 1 -5 -5l1.5 -1.5M17 12l-5 -5l1.5 -1.5a3.536 3.536 0 1 1 5 5l-1.5 1.5M3 21l2.5 -2.5M18.5 5.5l2.5 -2.5M10 11l-2 2M13 14l-2 2"/>`,
  mobileCode: `<path d="M11.5 21h-3.5a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8M20 21l2 -2l-2 -2M17 17l-2 2l2 2M11 4h2M12 17v.01"/>`,
  exchange: `<path d="M7 10h14l-4 -4M17 14h-14l4 4"/>`,
  serverCog: `<path d="M3 7a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v2a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3v-2M12 20h-6a3 3 0 0 1 -3 -3v-2a3 3 0 0 1 3 -3h10.5"/><path d="M16 18a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M18 14.5v1.5M18 20v1.5M21.032 16.25l-1.299 .75M16.27 19l-1.3 .75M14.97 16.25l1.3 .75M19.733 19l1.3 .75M7 8v.01M7 16v.01"/>`,
  shieldCheck: `<path d="M11.46 20.846a12 12 0 0 1 -7.96 -14.846a12 12 0 0 0 8.5 -3a12 12 0 0 0 8.5 3a12 12 0 0 1 -.09 7.06M15 19l2 2l4 -4"/>`,
  plug: `<path d="M9.785 6l8.215 8.215l-2.054 2.054a5.81 5.81 0 1 1 -8.215 -8.215zM4 20l3.5 -3.5M15 4l-3.5 3.5M20 9l-3.5 3.5"/>`,
  databaseImport: `<path d="M4 6c0 1.657 3.582 3 8 3s8 -1.343 8 -3s-3.582 -3 -8 -3s-8 1.343 -8 3M4 6v6c0 1.657 3.582 3 8 3c.856 0 1.68 -.05 2.454 -.144M20 12v-6M4 12v6c0 1.657 3.582 3 8 3c.171 0 .341 -.002 .51 -.006M19 22v-6M22 19l-3 -3l-3 3"/>`,
  database: `<path d="M4 6a8 3 0 1 0 16 0a8 3 0 1 0 -16 0M4 6v6a8 3 0 0 0 16 0v-6M4 12v6a8 3 0 0 0 16 0v-6"/>`,
  server: `<path d="M3 7a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v2a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3M3 15a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v2a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3zM7 8v.01M7 16v.01"/>`,
  worldDownload: `<path d="M21 12a9 9 0 1 0 -9 9M3.6 9h16.8M3.6 15h8.4M11.578 3a17 17 0 0 0 0 18M12.5 3c1.719 2.755 2.5 5.876 2.5 9M18 14v7m-3 -3l3 3l3 -3"/>`,
  cloud: `<path d="M6.657 18c-2.572 0 -4.657 -2.007 -4.657 -4.483c0 -2.475 2.085 -4.482 4.657 -4.482c.393 -1.762 1.794 -3.2 3.675 -3.773c1.88 -.572 3.956 -.193 5.444 1c1.488 1.19 2.162 3.007 1.77 4.769h.99c1.913 0 3.464 1.56 3.464 3.486c0 1.927 -1.551 3.487 -3.465 3.487h-11.878"/>`,
  bell: `<path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6M9 17v1a3 3 0 0 0 6 0v-1"/>`,
  calendarCode: `<path d="M11.5 21h-5.5a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v6M16 3v4M8 3v4M4 11h16M20 21l2 -2l-2 -2M17 17l-2 2l2 2"/>`,
  settings: `<path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"/>`,
  fileText: `<path d="M14 3v4a1 1 0 0 0 1 1h4M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2M9 9h1M9 13h6M9 17h6"/>`,
  refresh: `<path d="M20 11a8.1 8.1 0 0 0 -15.5 -2M4 5v4h4M4 13a8.1 8.1 0 0 0 15.5 2M20 19v-4h-4"/>`,
  browser: `<path d="M4 8h16M4 6a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2zM8 4v4"/>`,
  lock: `<path d="M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2zM11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0M8 11v-4a4 4 0 1 1 8 0v4"/>`,
  fingerprint: `<path d="M18.9 7a8 8 0 0 1 1.1 5v1a6 6 0 0 0 .8 3M8 11a4 4 0 0 1 8 0v1a10 10 0 0 0 2 6M12 11v2a14 14 0 0 0 2.5 8M8 15a18 18 0 0 0 1.8 6M4.9 19a22 22 0 0 1 -.9 -7v-1a8 8 0 0 1 12 -6.95"/>`,
  deviceMobile: `<path d="M6 5a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2zM11 4h2M12 17v.01"/>`,
  deviceLaptop: `<path d="M3 19h18M5 7a1 1 0 0 1 1 -1h12a1 1 0 0 1 1 1v8a1 1 0 0 1 -1 1h-12a1 1 0 0 1 -1 -1z"/>`,
  inbox: `<path d="M4 6a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2zM4 13h3l3 3h4l3 -3h3"/>`,
  coins: `<path d="M9 14c0 1.657 2.686 3 6 3s6 -1.343 6 -3s-2.686 -3 -6 -3s-6 1.343 -6 3zM9 14v4c0 1.656 2.686 3 6 3s6 -1.344 6 -3v-4M3 6c0 1.072 1.144 2.062 3 2.598s4.144 .536 6 0s3 -1.526 3 -2.598s-1.144 -2.062 -3 -2.598s-4.144 -.536 -6 0s-3 1.526 -3 2.598zM3 6v10c0 .888 .772 1.45 2 2M3 11c0 .888 .772 1.45 2 2"/>`,
  chartLine: `<path d="M4 19h16M4 15l4 -6l4 2l4 -5l4 4"/>`,
  world: `<path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0M3.6 9h16.8M3.6 15h16.8M11.5 3a17 17 0 0 0 0 18M12.5 3a17 17 0 0 1 0 18"/>`,
  layoutDashboard: `<path d="M5 4h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1zM5 16h4a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1zM15 12h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1zM15 4h4a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1z"/>`,
  route: `<path d="M3 19a2 2 0 1 0 4 0a2 2 0 0 0 -4 0M19 7a2 2 0 1 0 0 -4a2 2 0 0 0 0 4M11 19h5.5a3.5 3.5 0 0 0 0 -7h-8a3.5 3.5 0 0 1 0 -7h4.5"/>`,
};

// Tokens mirror docs/shared.css. Flow hues (green/blue/amber) are validated
const C = {
  paper: "#f7f5ef",
  panel: "#fffdf7",
  panelAlt: "#ece7db",
  ink: "#101827",
  muted: "#42526a",
  line: "#d8d2c4",
  terminal: "#0e1626",
  terminal2: "#1b2a45",
  terminalLine: "#26364c",
  textOnDark: "#c9d4e6",
  textOnDarkDim: "#8fa3c2",
  slate: "#42526a",
  green: "#0a8a72",
  greenDark: "#055f52",
  greenSoft: "#e3f0ec",
  greenLine: "#a8cdc2",
  blue: "#2f5fa5",
  blueSoft: "#e8eef7",
  amber: "#b45309",
  amberSoft: "#f9efdd",
  yellow: "#f5c542",
};

const esc = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

function defs(extraStyles = "") {
  const symbols = Object.entries(icons).map(([name, body]) =>
    `<symbol id="icon-${name}" viewBox="0 0 24 24">${body}</symbol>`).join("");
  const marker = (name, color) => `<marker id="arrow-${name}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${color}"/></marker>`;
  return `<defs>${symbols}${marker("slate", C.slate)}${marker("green", C.green)}${marker("blue", C.blue)}${marker("amber", C.amber)}
    <style>
      text { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: ${C.ink}; }
      .kicker { font-size: 13px; font-weight: 700; fill: ${C.muted}; letter-spacing: .4px; }
      .title { font-size: 28px; font-weight: 700; letter-spacing: -.4px; }
      .subtitle { font-size: 14px; fill: ${C.muted}; }
      .layer { font-size: 12px; font-weight: 700; letter-spacing: 1.1px; fill: ${C.muted}; }
      .boundary { font-size: 12px; font-weight: 700; letter-spacing: 1.1px; fill: ${C.slate}; }
      .node-title { font-size: 15px; font-weight: 650; }
      .node-sub { font-size: 12.5px; fill: ${C.muted}; }
      .on-dark { fill: ${C.textOnDark}; }
      .on-dark-dim { fill: ${C.textOnDarkDim}; }
      .module-title { font-size: 13.5px; font-weight: 650; fill: #ffffff; }
      .module-sub { font-size: 12px; fill: ${C.textOnDark}; }
      .mono { font: 11.5px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; fill: ${C.muted}; }
      .mono-small { font: 10.5px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; fill: ${C.muted}; }
      .flow-label { font: 10.5px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; fill: ${C.amber}; }
      .legend { font-size: 11.5px; fill: ${C.muted}; }
      .strip-node { font-size: 12px; font-weight: 650; fill: ${C.ink}; }
      .matrix-head { font-size: 13px; font-weight: 650; fill: ${C.ink}; }
      .matrix-sub { font-size: 11.5px; fill: ${C.muted}; }
      .matrix-owner { font-size: 15px; font-weight: 650; fill: ${C.ink}; }
      .tile-title { font-size: 13.5px; font-weight: 650; fill: ${C.ink}; }
      .tile-sub { font-size: 11.8px; fill: ${C.muted}; }
      .format { font: 10.8px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; fill: ${C.muted}; }
      .footnote { font-size: 10.5px; fill: ${C.muted}; opacity: .85; }
${extraStyles}    </style>
  </defs>`;
}

function icon(name, x, y, size, color = "#ffffff", strokeWidth = 1.8) {
  return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#icon-${name}"/></svg>`;
}

function iconTile(name, x, y, color, size = 44, iconColor = "#ffffff") {
  const pad = Math.round(size * 0.23);
  return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${Math.round(size / 4)}" fill="${color}"/>${icon(name, x + pad, y + pad, size - 2 * pad, iconColor)}`;
}

function textLines(x, y, lines, className, gap = 16) {
  if (!lines.length) return "";
  return `<text x="${x}" y="${y}" class="${className}">${lines.map((line, index) => `<tspan x="${x}" dy="${index ? gap : 0}">${esc(line)}</tspan>`).join("")}</text>`;
}

// Borderless component: icon tile, title, plain sub lines, optional mono line,
function component({ x, y, iconName, color, iconColor = "#ffffff", title, subtitle = [], mono = "", width = 190 }) {
  const labelX = x + 56;
  const monoY = y + 36 + subtitle.length * 15;
  return `<g role="group" aria-label="${esc([title, ...subtitle, mono].filter(Boolean).join(". "))}">
    ${iconTile(iconName, x, y, color, 44, iconColor)}
    <text x="${labelX}" y="${y + 17}" class="node-title">${esc(title)}</text>
    ${textLines(labelX, y + 36, subtitle, "node-sub", 15)}
    ${mono ? `<text x="${labelX}" y="${monoY}" class="mono-small">${esc(mono)}</text>` : ""}
    <rect x="${x}" y="${y + 68}" width="${width}" height="1" fill="${C.line}"/>
  </g>`;
}

function line(d, colorName = "slate", { dashed = false, dotted = false, both = false, width = 1.8 } = {}) {
  const color = C[colorName];
  const dash = dotted ? ' stroke-dasharray="2 5"' : dashed ? ' stroke-dasharray="7 6"' : "";
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"${dash} marker-end="url(#arrow-${colorName})"${both ? ` marker-start="url(#arrow-${colorName})"` : ""}/>`;
}

// Width of a mono chip label at 11.5px (~6.91px/char) plus pill padding.
const chipW = (label) => Math.round(label.length * 6.91 + 22);

function chip(x, y, width, label, fill = C.panelAlt, textClass = "mono") {
  return `<g><rect x="${x}" y="${y}" width="${width}" height="24" rx="12" fill="${fill}"/><text x="${x + width / 2}" y="${y + 16}" text-anchor="middle" class="${textClass}">${esc(label)}</text></g>`;
}

// Mono chip centered on cx with measured width.
function chipAt(cx, y, label, fill = C.panelAlt) {
  const width = chipW(label);
  return chip(Math.round(cx - width / 2), y, width, label, fill);
}

function legendItem(x, y, colorName, label, { dashed = false, dotted = false } = {}) {
  const dash = dotted ? ' stroke-dasharray="2 5"' : dashed ? ' stroke-dasharray="6 5"' : "";
  return `<line x1="${x}" y1="${y}" x2="${x + 28}" y2="${y}" stroke="${C[colorName]}" stroke-width="3" stroke-linecap="round"${dash}/><text x="${x + 36}" y="${y + 4}" class="legend">${esc(label)}</text>`;
}

// Header with an optional square logo (a data URI or a relative href) and a
// kicker naming the product the diagram belongs to.
function header(title, subtitle, { kicker = "", logo = "", logoFill = "" } = {}) {
  const mark = logo
    ? `<image href="${logo}" x="36" y="26" width="46" height="46" preserveAspectRatio="xMidYMid slice"/>`
    : logoFill
      ? `<rect x="36" y="26" width="46" height="46" rx="10" fill="${logoFill}"/>`
      : "";
  const textX = mark ? 96 : 36;
  return `
  ${mark}
  ${kicker ? `<text x="${textX}" y="42" class="kicker">${esc(kicker)}</text>` : ""}
  <text x="${textX}" y="70" class="title">${esc(title)}</text>
  <text x="${textX}" y="92" class="subtitle">${esc(subtitle)}</text>`;
}

function junction(x, y, color = C.slate) {
  return `<circle cx="${x}" cy="${y}" r="3" fill="${color}"/>`;
}

function svgFrame({ width, height, title, description, body, extraStyles = "" }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="diagram-title diagram-desc">
  <title id="diagram-title">${esc(title)}</title>
  <desc id="diagram-desc">${esc(description)}</desc>
  <metadata>Generic component icons derived from Tabler Icons 3.45.0, MIT License. Product marks copyright their projects.</metadata>
  ${defs(extraStyles)}
  <rect width="${width}" height="${height}" fill="${C.paper}"/>
  ${body}
</svg>\n`;
}


export { icons, C, esc, defs, icon, iconTile, textLines, component, line, chipW, chip, chipAt, legendItem, header, junction, svgFrame };
