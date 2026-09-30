// "How Tower is wired": the panel in the Code tab, the coordinator session
// behind it, and the work sessions it steers. Same vocabulary as the other
// diagrams (lib.mjs): paper, borderless components, one dark authority block.

import { C, esc, icon, iconTile, component, line, chipAt, legendItem, header, junction, svgFrame } from "./lib.mjs";

const violet = "#6d4fc2";

function darkBlock(x, y, w, h, title, sub) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${C.terminal}"/>
  <text x="${x + 24}" y="${y + 34}" class="module-title" style="font-size:15px">${esc(title)}</text>
  <text x="${x + 24}" y="${y + 54}" class="module-sub">${esc(sub)}</text>`;
}
function moduleRow({ x, y, width, iconName, iconColor, title, lines }) {
  return `<rect x="${x}" y="${y}" width="${width}" height="64" rx="10" fill="${C.terminal2}"/>
  ${icon(iconName, x + 12, y + 19, 26, iconColor)}
  <text x="${x + 50}" y="${y + 25}" class="module-title">${esc(title)}</text>
  <text x="${x + 50}" y="${y + 45}" class="module-sub">${lines.map((l, i) => `<tspan x="${x + 50}" dy="${i ? 16 : 0}">${esc(l)}</tspan>`).join("")}</text>`;
}
const note = (cx, y, label, color = C.muted) => `<text x="${cx}" y="${y}" text-anchor="middle" class="mono-small" style="fill:${color}">${esc(label)}</text>`;

function render() {
  const owner = { x: 40, y: 190 };
  const panel = { x: 40, y: 300, w: 280, h: 250 };
  const tower = { x: 430, w: 280, top: 190, h: 360 };
  const work = { x: 830, w: 270, rows: [206, 316, 426] };
  const towerCx = tower.x + tower.w / 2;
  const body = `
  ${header("How Tower is wired", "A page in the Code tab, one coordinator session behind it, and the work sessions it steers.", { kicker: "Tower", logoFill: C.terminal })}
  ${icon("layoutDashboard", 47, 37, 24, "#ffffff", 1.8)}
  ${legendItem(900, 40, "slate", "Facts and reports")}
  ${legendItem(900, 62, "amber", "Owner picks")}
  ${legendItem(900, 84, "blue", "Relayed to a session", { dashed: true })}

  <text x="${owner.x}" y="${owner.y - 22}" class="layer">THE OWNER</text>
  ${component({ x: owner.x, y: owner.y, iconName: "user", color: C.slate, title: "Owner", subtitle: ["Reads one page", "Picks with a keystroke"], width: 280 })}

  <text x="${panel.x}" y="${panel.y - 22}" class="layer">THE PANEL · CODE TAB</text>
  <rect x="${panel.x}" y="${panel.y}" width="${panel.w}" height="${panel.h}" rx="14" fill="${C.panel}" stroke="${C.line}"/>
  ${iconTile("browser", panel.x + 20, panel.y + 20, violet, 44)}
  <text x="${panel.x + 76}" y="${panel.y + 37}" class="node-title">A private page</text>
  <text x="${panel.x + 76}" y="${panel.y + 56}" class="node-sub">No libraries, no network</text>
  <text x="${panel.x + 20}" y="${panel.y + 100}" class="node-sub"><tspan x="${panel.x + 20}">Program tabs from rules in the database</tspan><tspan x="${panel.x + 20}" dy="18">Your move: asks, decisions, moves</tspan><tspan x="${panel.x + 20}" dy="18">In flight: sessions, stalls, worktrees</tspan><tspan x="${panel.x + 20}" dy="18">Fixes (m, h) apply at once</tspan></text>
  ${chipAt(panel.x + 80, panel.y + 200, "db: owner only")}
  ${chipAt(panel.x + 200, panel.y + 200, "comment ring")}

  <text x="${tower.x}" y="${tower.top - 22}" class="layer">THE COORDINATOR</text>
  ${darkBlock(tower.x, tower.top, tower.w, tower.h, "Tower session", "Claude Code, pinned, hourly heartbeat")}
  ${moduleRow({ x: tower.x + 16, y: tower.top + 78, width: tower.w - 32, iconName: "refresh", iconColor: C.textOnDark, title: "Refresh", lines: ["facts.py reads every session", "checkouts.py reads the git state"] })}
  ${moduleRow({ x: tower.x + 16, y: tower.top + 154, width: tower.w - 32, iconName: "shieldCheck", iconColor: C.textOnDark, title: "Scrub", lines: ["scrub.py masks amounts and ids", "before anything is written"] })}
  ${moduleRow({ x: tower.x + 16, y: tower.top + 230, width: tower.w - 32, iconName: "route", iconColor: "#f5c542", title: "Relay", lines: ["a pick reaches the owning session", "with a revision check and an audit"] })}
  ${note(towerCx, tower.top + tower.h - 22, "never pushes, deploys or answers for the owner", C.textOnDarkDim)}

  <text x="${work.x}" y="${work.rows[0] - 22}" class="layer">WORK SESSIONS</text>
  ${component({ x: work.x, y: work.rows[0], iconName: "terminal", color: C.terminal, title: "Build session", subtitle: ["A worktree of Desk", "One line per step"], width: work.w })}
  ${component({ x: work.x, y: work.rows[1], iconName: "gitBranch", color: C.terminal, title: "Review session", subtitle: ["Canary main", "Asks for a go to push"], width: work.w })}
  ${component({ x: work.x, y: work.rows[2], iconName: "clockPlay", color: C.terminal, title: "Routine", subtitle: ["A scheduled check", "Under its program"], width: work.w })}

  ${line(`M${panel.x + panel.w} ${panel.y + 60} L${tower.x} ${panel.y + 60}`, "amber", { both: true })}
  ${note((panel.x + panel.w + tower.x) / 2, panel.y + 48, "pick")}
  ${line(`M${tower.x} ${panel.y + 150} L${panel.x + panel.w} ${panel.y + 150}`, "slate")}
  ${note((panel.x + panel.w + tower.x) / 2, panel.y + 138, "facts")}
  ${line(`M${owner.x + 150} ${owner.y + 70} L${owner.x + 150} ${panel.y}`, "amber")}

  ${line(`M${work.x} ${work.rows[0] + 22} L${tower.x + tower.w} ${work.rows[0] + 22}`, "slate")}
  ${line(`M${work.x} ${work.rows[1] + 22} L${tower.x + tower.w} ${work.rows[1] + 22}`, "slate")}
  ${line(`M${work.x} ${work.rows[2] + 22} L${tower.x + tower.w} ${work.rows[2] + 22}`, "slate")}
  ${note((tower.x + tower.w + work.x) / 2, work.rows[0] + 10, "reports")}
  ${line(`M${tower.x + tower.w} ${work.rows[0] + 44} L${work.x} ${work.rows[0] + 44}`, "blue", { dashed: true })}
  ${note((tower.x + tower.w + work.x) / 2, work.rows[0] + 62, "pick, relayed")}
  ${junction(tower.x + tower.w, work.rows[0] + 22)}
  ${junction(tower.x + tower.w, work.rows[1] + 22)}
  ${junction(tower.x + tower.w, work.rows[2] + 22)}

  <text x="40" y="606" class="footnote">Experimental. The first version ran for one day in September 2026; the relay needed the owner's approval on the receiving side, which is what the next version changes.</text>`;
  return svgFrame({ width: 1140, height: 630, title: "How Tower is wired", description: "The owner reads a private panel page in the Code tab. Tower, a coordinator session, refreshes session facts into the panel's database after scrubbing them, and relays the owner's picks to the work session that owns the item, with an audit. Work sessions report one-line status, asks and readiness to Tower.", body });
}

export { render };
