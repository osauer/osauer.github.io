// The Canary companion for the web. The Desk companion's bird, ported from the
// native app's Core Animation layers (Desk, cmd/desk-presence/Canary.swift):
// the same traced mark, the same idle loops of unrelated lengths, the same
// reactions and bits of business, drawn in SVG and driven by one keyframe
// engine. It plays a scripted day on a synthetic book. Nothing here is live
// and nothing is a recommendation. No dependencies.

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

// ---------------------------------------------------------------- The mark
// Master pixel coordinates of Canary's 512 px icon, y down.
const ART = {
  box: [104, 94, 316, 308],
  head: { c: [294.95, 182.88], r: 86.57 },
  breast: { c: [209.93, 230.18], r: 168.55 },
  back: [183.5, 233], tail: [106.5, 373.5],
  eye: { c: [322.4, 159], r: 15 }, glint: { dx: 3.6, dy: -5.8, r: 3.4 },
  beakTip: [415.6, 173.1], hinge: [363.2, 175],
  shoulder: [214, 236], belly: [212, 399],
  face: { near: [292, 162], far: [350, 160], hinge: [322, 179] },
};
const deg = (r) => (r * 180) / Math.PI;
const f2 = (n) => Number(n.toFixed(2));
function bodyPath() {
  const [hx, hy] = ART.head.c, hr = ART.head.r, [bx, by] = ART.breast.c, br = ART.breast.r;
  const end = [bx + br * Math.cos((72.64 * Math.PI) / 180), by + br * Math.sin((72.64 * Math.PI) / 180)];
  return `M183.5 233 L213.99 152.32 A${hr} ${hr} 0 0 1 377.24 209.76 A${br} ${br} 0 0 1 ${f2(end[0])} ${f2(end[1])} C230.8 400.2 175.3 398.1 146 382.5 L106.5 373.5 Z`;
}
const WING = "M183.5 233 C221.8 186.6 285.8 207.1 285.8 258 C285.8 310.7 228.5 359.5 181.5 373 C169.8 376.4 122 387.7 106.5 373.5 Z";
const UPPER = "M372.5 147.5 L413 171.6 Q415.6 173.1 412.6 173.2 L363.2 175 Q364.6 158 372.5 147.5 Z";
const LOWER = "M372.5 197.5 L413 174.6 Q415.6 173.1 412.6 173.2 L363.2 175 Q364.2 190 372.5 197.5 Z";
const MOUTH = "M363.2 175 L406 172.4 L366 181 Z";
function chirpPath() {
  const c = [ART.beakTip[0] - 4, ART.beakTip[1] - 2];
  return [30, 50].map((r) => `M${f2(c[0] + r * Math.cos(-0.62))} ${f2(c[1] + r * Math.sin(-0.62))} A${r} ${r} 0 0 1 ${f2(c[0] + r * Math.cos(0.62))} ${f2(c[1] + r * Math.sin(0.62))}`).join(" ");
}
const EDGE = Math.atan2(ART.beakTip[1] - ART.hinge[1], ART.beakTip[0] - ART.hinge[0]);
const REACH = 0.84 * Math.hypot(ART.beakTip[0] - ART.hinge[0], ART.beakTip[1] - ART.hinge[1]);
function gapePath(drop, lift) {
  const [hx, hy] = ART.hinge;
  const ray = (a, r) => [hx + r * Math.cos(a), hy + r * Math.sin(a)];
  const up = ray(EDGE - lift, REACH), down = ray(EDGE + drop, REACH), ctl = ray(EDGE + (drop - lift) / 2, 0.55 * REACH);
  return `M${hx} ${hy} L${f2(up[0])} ${f2(up[1])} Q${f2(ctl[0])} ${f2(ctl[1])} ${f2(down[0])} ${f2(down[1])} Z`;
}

const PALETTE = {
  body: ["#FDE15A", "#FDDA38", "#FED20F", "#FDC604", "#FABB01", "#EFA801"], bodyStops: [0, 0.05, 0.25, 0.52, 0.75, 1],
  wing: ["#FFDA2E", "#FED417", "#FDCB05", "#FCC301"], wingStops: [0, 0.3, 0.6, 1],
  upperBeak: "#FDB827", lowerBeak: "#DB6D01", mouth: "#9A4200", eye: "#0C1017", gape: "#7A200C", tongue: "#EF5B6E",
};
const DIM = {
  body: ["#E6E3DC", "#DCD8CF", "#D1CCC2", "#C6C1B6", "#BCB7AC", "#AFAA9F"], wing: ["#E8E5DE", "#DEDAD1", "#D2CDC3", "#C8C3B8"],
  upperBeak: "#BDB6AA", lowerBeak: "#9F988C", mouth: "#7F786D", eye: "#4A4D55", gape: "#5E5A52", tongue: "#A39C92",
};

const NS = "http://www.w3.org/2000/svg";
function el(name, attrs = {}, parent) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (parent) parent.append(node);
  return node;
}
function html(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// ------------------------------------------------------ The keyframe engine
// One requestAnimationFrame loop drives every layer, the way the native bird
// hangs its loops and one-off acts on Core Animation. A layer is an SVG group
// with a transform origin; a track is a list of (seconds, value) keys for one
// property, eased between keys, looping or once. A later track on the same
// layer and property wins while it runs, like an animation added on top.
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
class Engine {
  constructor() { this.tracks = []; this.layers = new Map(); this.frame = null; this.now = performance.now(); }
  layer(node, ox, oy, base = {}) {
    const rec = { node, ox, oy, base: { tx: 0, ty: 0, rot: 0, sx: 1, sy: 1, op: 1, ...base }, state: null, custom: null };
    node.style.transformBox = "view-box";
    node.style.transformOrigin = `${ox}px ${oy}px`;
    // Tracks target the record, so the table is keyed by it too.
    this.layers.set(rec, rec);
    return rec;
  }
  // A virtual layer whose scalar props are turned into real ones by `apply`.
  virtual(name, base, apply) {
    const rec = { node: name, base, state: null, custom: apply };
    this.layers.set(name, rec);
    return rec;
  }
  add(target, prop, keys, { loop = false, delay = 0, tag = "" } = {}) {
    const period = keys[keys.length - 1][0];
    const track = { target, prop, keys, loop, tag, start: performance.now() + delay * 1000, period: period * 1000, done: false };
    this.tracks.push(track);
    this.run();
    return track;
  }
  clear(tag) { for (const t of this.tracks) if (t.tag === tag) t.done = true; }
  clearAll() { for (const t of this.tracks) t.done = true; }
  value(track, at) {
    let t = (at - track.start) / 1000;
    const keys = track.keys, period = track.period / 1000;
    if (t < 0) return keys[0][1];
    if (track.loop) t = period > 0 ? t % period : 0;
    else if (t >= period) { track.done = true; return keys[keys.length - 1][1]; }
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) {
        const [t0, a] = keys[i - 1], [t1, b] = keys[i];
        const k = t1 > t0 ? ease((t - t0) / (t1 - t0)) : 1;
        return a + (b - a) * k;
      }
    }
    return keys[keys.length - 1][1];
  }
  run() {
    if (this.frame !== null) return;
    const step = (now) => {
      this.now = now;
      this.frame = null;
      const values = new Map();
      this.tracks = this.tracks.filter((t) => !t.done);
      for (const track of this.tracks) {
        if (now < track.start) continue;
        const v = this.value(track, now);
        // Later tracks on the same target and prop win (they sit later in the list).
        values.set(track.target, Object.assign(values.get(track.target) || {}, { [track.prop]: v }));
      }
      const ordered = [...this.layers].sort(([a], [b]) => (typeof a === "string" ? 0 : 1) - (typeof b === "string" ? 0 : 1));
      for (const [target, rec] of ordered) {
        const next = Object.assign({}, rec.base, values.get(target) || {});
        const changed = !rec.state || Object.keys(next).some((k) => next[k] !== rec.state[k]);
        if (!changed) continue;
        rec.state = next;
        if (rec.custom) { rec.custom(next); continue; }
        const { tx, ty, rot, sx, sy, op } = next;
        rec.node.style.transform = `translate(${tx}px, ${ty}px) rotate(${rot}rad) scale(${sx}, ${sy})`;
        if (op !== 1 || rec.node.style.opacity !== "") rec.node.style.opacity = op;
      }
      if (this.tracks.length && document.visibilityState !== "hidden" && this.visible !== false) this.frame = requestAnimationFrame(step);
    };
    this.frame = requestAnimationFrame(step);
  }
  // Nothing animates while the bird is scrolled out of view; it picks up again when it returns.
  watch(node) {
    if (!("IntersectionObserver" in window)) return;
    new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      if (this.visible) this.run();
      else if (this.frame !== null) { cancelAnimationFrame(this.frame); this.frame = null; }
    }).observe(node);
  }
}

// ------------------------------------------------------------ The canary
export class Canary {
  constructor(host) {
    this.host = host;
    this.engine = new Engine();
    this.facingRight = false;
    this.mood = null;
    this.open = 1;
    this.busyUntil = 0;
    this.lastNod = 0;
    this.quietSince = performance.now();
    this.lastSquawk = -Infinity;
    this.build();
    reduceMotion.addEventListener("change", () => this.startLoops());
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") this.engine.run(); });
  }

  build() {
    const [bx, by, bw, bh] = ART.box;
    const svg = el("svg", { viewBox: `${bx - 40} ${by - 46} ${bw + 80} ${bh + 40}`, "aria-hidden": "true", focusable: "false" }, this.host);
    this.svg = svg;
    const defs = el("defs", {}, svg);
    const grad = (id, colors, stops, y1, y2) => {
      const g = el("linearGradient", { id, gradientUnits: "userSpaceOnUse", x1: 0, y1, x2: 0, y2 }, defs);
      colors.forEach((c, i) => el("stop", { offset: stops[i], "stop-color": c }, g));
      return g;
    };
    const uid = Math.random().toString(36).slice(2, 7);
    this.ids = { body: `cb-${uid}`, wing: `cw-${uid}`, ground: `cg-${uid}` };
    this.bodyGradient = grad(this.ids.body, PALETTE.body, PALETTE.bodyStops, 96, 399);
    this.wingGradient = grad(this.ids.wing, PALETTE.wing, PALETTE.wingStops, 206.5, 386);
    const rg = el("radialGradient", { id: this.ids.ground }, defs);
    el("stop", { offset: 0, "stop-color": "#000", "stop-opacity": 0.26 }, rg);
    el("stop", { offset: 1, "stop-color": "#000", "stop-opacity": 0 }, rg);
    const shadow = el("filter", { id: `cs-${uid}`, x: "-20%", y: "-20%", width: "140%", height: "140%" }, defs);
    el("feDropShadow", { dx: 0, dy: 5, stdDeviation: 5, "flood-color": "#000", "flood-opacity": 0.22 }, shadow);
    const wingShadow = el("filter", { id: `cws-${uid}`, x: "-20%", y: "-20%", width: "140%", height: "140%" }, defs);
    el("feDropShadow", { dx: 3, dy: 4, stdDeviation: 4, "flood-color": "#7A4300", "flood-opacity": 0.45 }, wingShadow);

    const E = this.engine, L = {};
    this.L = L;
    // The bird's shadow on the ground, and the stage everything hangs from.
    L.ground = E.layer(el("ellipse", { cx: 236, cy: 406, rx: 96, ry: 14, fill: `url(#${this.ids.ground})` }, svg), 236, 406);
    const stage = el("g", {}, svg);
    L.stage = E.layer(stage, ART.belly[0], ART.belly[1]);
    // perch flips the bird to face left; hop moves it up; squash flattens it on landing;
    // lean tilts it; puff and breath scale it about the belly.
    const perch = el("g", {}, stage); L.perch = E.layer(perch, bx + bw / 2, by + bh / 2);
    const hop = el("g", {}, perch); L.hop = E.layer(hop, ART.belly[0], ART.belly[1]);
    const squash = el("g", {}, hop); L.squash = E.layer(squash, ART.belly[0], ART.belly[1]);
    const lean = el("g", {}, squash); L.lean = E.layer(lean, ART.belly[0], ART.belly[1]);
    const puff = el("g", {}, lean); L.puff = E.layer(puff, ART.belly[0], ART.belly[1]);
    const breath = el("g", { filter: `url(#cs-${uid})` }, puff); L.breath = E.layer(breath, ART.belly[0], ART.belly[1]);

    // Fluffed feathers wait behind the body.
    const ruffleG = el("g", {}, breath); L.ruffle = E.layer(ruffleG, 262, 248, { op: 0 });
    const ruffleS = el("g", {}, ruffleG); L.ruffleScale = E.layer(ruffleS, 262, 248);
    this.ruffle = el("path", { d: "", fill: `url(#${this.ids.body})` }, ruffleS);
    this.body = el("path", { d: bodyPath(), fill: `url(#${this.ids.body})` }, breath);
    this.blush = el("ellipse", { cx: 333, cy: 190, rx: 15, ry: 7, fill: "#FF6B7F", opacity: 0.55 }, breath);
    L.blush = E.layer(this.blush, 333, 190, { op: 0 });
    const wing = el("g", { filter: `url(#cws-${uid})` }, breath); L.wing = E.layer(wing, ART.shoulder[0], ART.shoulder[1]);
    this.wing = el("path", { d: WING, fill: `url(#${this.ids.wing})` }, wing);

    // The beak: both facets turn on the hinge; a little open shows the mouth,
    // wide open the gape and the tongue riding the lower facet.
    const beakTurn = el("g", {}, breath); L.beakTurn = E.layer(beakTurn, ART.hinge[0], ART.hinge[1]);
    this.mouth = el("path", { d: MOUTH, fill: PALETTE.mouth }, beakTurn); L.mouth = E.layer(this.mouth, ART.hinge[0], ART.hinge[1]);
    this.gape = el("path", { d: gapePath(0, 0), fill: PALETTE.gape }, beakTurn);
    const jaw = el("g", {}, beakTurn); L.jaw = E.layer(jaw, ART.hinge[0], ART.hinge[1]);
    const tc = [ART.hinge[0] + 0.4 * (REACH / 0.84) * Math.cos(EDGE) + 3.5 * Math.sin(EDGE), ART.hinge[1] + 0.4 * (REACH / 0.84) * Math.sin(EDGE) - 3.5 * Math.cos(EDGE)];
    this.tongue = el("ellipse", { cx: f2(tc[0]), cy: f2(tc[1]), rx: 11, ry: 3.8, fill: PALETTE.tongue, transform: `rotate(${f2(deg(EDGE))} ${f2(tc[0])} ${f2(tc[1])})` }, jaw);
    this.lowerBeak = el("path", { d: LOWER, fill: PALETTE.lowerBeak }, jaw);
    const upper = el("g", {}, beakTurn); L.upper = E.layer(upper, ART.hinge[0], ART.hinge[1]);
    this.upperBeak = el("path", { d: UPPER, fill: PALETTE.upperBeak }, upper);
    E.virtual("beak", { drop: 0, lift: 0 }, ({ drop, lift }) => {
      L.jaw.base.rot = drop; L.upper.base.rot = -lift; L.jaw.state = null; L.upper.state = null;
      this.gape.setAttribute("d", gapePath(Math.max(0, drop), Math.max(0, lift)));
    });

    // The eye: a lid that shuts, a white that shows only when the eyes go wide,
    // the gaze that wanders, and the closed eyes drawn as strokes.
    const [ex, ey] = ART.eye.c, r = ART.eye.r;
    const eye = el("g", {}, breath); L.eye = E.layer(eye, ex, ey);
    const lid = el("g", {}, eye); L.lid = E.layer(lid, ex, ey);
    this.sclera = el("ellipse", { cx: ex, cy: ey, rx: 1.15 * r, ry: 1.15 * r, fill: "#fff", stroke: "#3A2A12", "stroke-opacity": 0.55, "stroke-width": 2.6 }, lid);
    L.sclera = E.layer(this.sclera, ex, ey, { op: 0, sx: 0.4, sy: 0.4 });
    const gaze = el("g", {}, lid); L.gaze = E.layer(gaze, ex, ey);
    this.pupil = el("circle", { cx: ex, cy: ey, r, fill: PALETTE.eye }, gaze);
    el("circle", { cx: ex + ART.glint.dx, cy: ey + ART.glint.dy, r: ART.glint.r, fill: "#fff", "fill-opacity": 0.92 }, gaze);
    const stroke = { fill: "none", stroke: PALETTE.eye, "stroke-width": 5.5, "stroke-linecap": "round" };
    const k = 0.75 * r;
    this.shutEye = el("path", { d: `M${ex - r} ${ey - 0.1 * r} Q${ex} ${ey + 0.9 * r} ${ex + r} ${ey - 0.1 * r}`, ...stroke }, eye);
    this.gleeEye = el("path", { d: `M${ex - r} ${ey + 0.4 * r} Q${ex} ${ey - 1.1 * r} ${ex + r} ${ey + 0.4 * r}`, ...stroke }, eye);
    this.outEye = el("path", { d: `M${ex - k} ${ey - k} L${ex + k} ${ey + k} M${ex - k} ${ey + k} L${ex + k} ${ey - k}`, ...stroke }, eye);
    L.shutEye = E.layer(this.shutEye, ex, ey, { op: 0 }); L.gleeEye = E.layer(this.gleeEye, ex, ey, { op: 0 }); L.outEye = E.layer(this.outEye, ex, ey, { op: 0 });
    // The far eye shows only while the canary looks at the reader.
    const [fx, fy] = ART.face.far;
    const farEye = el("g", {}, breath); L.farEye = E.layer(farEye, fx, fy, { op: 0 });
    el("circle", { cx: fx, cy: fy, r: 0.85 * r, fill: PALETTE.eye }, farEye);
    el("circle", { cx: fx + 0.85 * ART.glint.dx, cy: fy + 0.85 * ART.glint.dy, r: 0.85 * ART.glint.r, fill: "#fff", "fill-opacity": 0.92 }, farEye);
    E.virtual("stare", { v: 0 }, ({ v }) => {
      const w = Math.min(1, v);
      L.sclera.base.op = Math.min(1, 3 * v); L.sclera.base.sx = L.sclera.base.sy = 0.4 + 0.6 * v; L.sclera.state = null;
      L.gaze.base.sx = L.gaze.base.sy = 1 - 0.28 * w; L.gaze.state = null;
    });
    E.virtual("fluff", { v: 0 }, ({ v }) => {
      L.ruffle.base.op = Math.min(1, 4 * v); L.ruffle.state = null;
      L.ruffleScale.base.sx = L.ruffleScale.base.sy = 0.9 + 0.1 * v; L.ruffleScale.state = null;
    });
    // Two chirp marks in front of the beak.
    this.chirp = el("path", { d: chirpPath(), fill: "none", stroke: PALETTE.eye, "stroke-width": 5, "stroke-linecap": "round" }, breath);
    L.chirp = E.layer(this.chirp, ART.beakTip[0], ART.beakTip[1], { op: 0 });
    // Props live above the bird and never mirror, so marks read the right way round.
    this.props = el("g", {}, svg);
    this.buildRuffle();
    this.placeFacing();
  }

  // The outline fluffed out: a point every 22 px along the body, tufts alternating
  // 38 and 26 px outward around the head, back and breast; belly and tail stay smooth.
  buildRuffle() {
    const path = this.body, total = path.getTotalLength();
    const ring = [];
    for (let s = 0; s < total; s += 22) { const p = path.getPointAtLength(s); ring.push([p.x, p.y]); }
    const test = this.svg.createSVGPoint();
    const inside = (x, y) => { test.x = x; test.y = y; return path.isPointInFill(test); };
    let d = `M${f2(ring[0][0])} ${f2(ring[0][1])}`;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], len = Math.max(Math.hypot(b[0] - a[0], b[1] - a[1]), 0.01);
      let out = [(b[1] - a[1]) / len, (a[0] - b[0]) / len];
      if (inside(mid[0] + 2 * out[0], mid[1] + 2 * out[1])) out = [-out[0], -out[1]];
      const tuft = mid[1] < 360 && mid[0] > 120 ? (i % 2 === 0 ? 38 : 26) : 0;
      d += ` Q${f2(mid[0] + tuft * out[0])} ${f2(mid[1] + tuft * out[1])} ${f2(b[0])} ${f2(b[1])}`;
    }
    this.ruffle.setAttribute("d", d + " Z");
  }

  paint(dim) {
    const p = dim ? DIM : PALETTE;
    [...this.bodyGradient.children].forEach((s, i) => s.setAttribute("stop-color", p.body[i]));
    [...this.wingGradient.children].forEach((s, i) => s.setAttribute("stop-color", p.wing[i]));
    this.upperBeak.setAttribute("fill", p.upperBeak); this.lowerBeak.setAttribute("fill", p.lowerBeak);
    this.mouth.setAttribute("fill", p.mouth); this.gape.setAttribute("fill", p.gape); this.tongue.setAttribute("fill", p.tongue);
    this.pupil.setAttribute("fill", p.eye);
    for (const s of [this.shutEye, this.gleeEye, this.outEye, this.chirp]) s.setAttribute("stroke", p.eye);
    this.host.style.transition = "filter 0.6s";
    this.host.style.filter = dim ? "saturate(0.9)" : "";
  }

  placeFacing() { this.L.perch.base.sx = this.facingRight ? 1 : -1; this.L.perch.state = null; this.engine.run(); }
  face(right) { if (right !== this.facingRight) { this.facingRight = right; this.placeFacing(); } }
  // A point of the master box, mirrored to the side the bird faces.
  spot(x, y) { return [this.facingRight ? x : 2 * (ART.box[0] + ART.box[2] / 2) - x, y]; }

  // -------------------------------------------------------------- Moods
  show(mood) {
    if (mood === this.mood) return;
    const was = this.mood;
    this.mood = mood;
    this.open = mood === "resting" ? 0.62 : 1;
    this.paint(mood === "away");
    if (was === "away" || mood === "away") this.engine.add(this.L.shutEye, "op", [[0, mood === "away" ? 0 : 1], [0.4, mood === "away" ? 1 : 0]], { tag: "sleep" });
    this.startLoops();
  }
  startLoops() {
    const E = this.engine, L = this.L, mood = this.mood;
    E.clear("loop");
    if (!mood) return;
    const still = reduceMotion.matches, loop = (target, prop, keys) => E.add(target, prop, keys, { loop: true, tag: "loop" });
    if (still) return;
    const base = mood === "alert" ? 1.03 : 1;
    const breathe = mood === "away" || mood === "resting" ? 3.4 : 2.4;
    loop(L.breath, "sy", [[0, base], [breathe, base * 1.03], [2 * breathe, base]]);
    // A slow sway, so the bird is never a still image even between blinks.
    loop(L.lean, "rot", [[0, 0], [3.1, 0.018], [6.2, -0.014], [9.3, 0]]);
    if (mood === "away") { loop(L.lid, "sy", [[0, 0.06], [1, 0.06]]); return; }
    const open = this.open, blinkAt = mood === "busy" ? [1.9, 5.6] : [2.4, 8.6, 8.95], period = mood === "busy" ? 7.9 : 11.3;
    const blinks = blinkAt.flatMap((t) => [[t, open], [t + 0.07, 0.1], [t + 0.17, open]]);
    loop(L.lid, "sy", [[0, open], ...blinks, [period, open]]);
    const look = (dx, dy) => [dx * 6, dy * 6]; // points of the native bird to master pixels
    if (mood === "busy") {
      // Reading: the eye steps forward along a line, then returns.
      const path = [[0, -0.3, 0], [0.7, -0.3, 0], [1.2, 0.1, 0.1], [1.9, 0.1, 0.1], [2.4, 0.5, 0.1], [3.1, 0.5, 0.1], [3.6, 0.9, 0.2], [4.4, 0.9, 0.2], [4.9, -0.3, 0], [5.3, -0.3, 0]];
      loop(L.gaze, "tx", path.map(([t, x, y]) => [t, look(x, y)[0]])); loop(L.gaze, "ty", path.map(([t, x, y]) => [t, look(x, y)[1]]));
      return;
    }
    const glance = [[0, 0, 0], [5.0, 0, 0], [5.35, 0.9, 0.3], [6.8, 0.9, 0.3], [7.15, 0, 0], [12.0, 0, 0], [12.35, -0.6, -0.6], [13.5, -0.6, -0.6], [13.85, 0, 0], [17.7, 0, 0]];
    loop(L.gaze, "tx", glance.map(([t, x, y]) => [t, look(x, y)[0]])); loop(L.gaze, "ty", glance.map(([t, x, y]) => [t, look(x, y)[1]]));
    if (mood === "resting") return;
    const tiltEvery = mood === "alert" ? 19.1 : 23.3;
    loop(L.squash, "rot", [[0, 0], [tiltEvery - 5, 0], [tiltEvery - 4.5, -0.09], [tiltEvery - 2.9, -0.09], [tiltEvery - 2.4, 0], [tiltEvery, 0]]);
    if (mood === "calm") loop(L.wing, "rot", [[0, 0], [14, 0], [14.12, 0.1], [14.24, 0], [14.36, 0.07], [14.5, 0], [27.9, 0]]);
    if (mood === "approval" || mood === "waiting") {
      // A chirp now and then, never more often than every half minute.
      const every = mood === "approval" ? 21 : 27;
      loop("beak", "drop", [[0, 0], [18, 0], [18.08, 0.32], [18.2, 0], [18.3, 0.26], [18.42, 0], [every, 0]]);
      loop(L.chirp, "op", [[0, 0], [18, 0], [18.1, 1], [18.9, 0], [every, 0]]);
      if (mood === "approval") {
        if (!still) loop(L.hop, "ty", [[0, 0], [23.7, 0], [23.85, -21], [24.0, 0], [every, 0]]);
        if (!still) loop(L.ground, "sx", [[0, 1], [23.7, 1], [23.85, 0.8], [24.0, 1], [every, 1]]);
      }
    }
  }

  // ----------------------------------------------------------- Reactions
  // One-off parts on top of the idle loops. `act` is one part of a bit of
  // business; `stopBusiness` ends them all so a reaction starts clean.
  act(target, prop, keys, delay = 0) {
    const t = this.engine.add(target, prop, keys, { delay, tag: "act" });
    this.busyUntil = Math.max(this.busyUntil, performance.now() + (delay + keys[keys.length - 1][0]) * 1000);
    return t;
  }
  scale(target, keys, delay = 0) { this.act(target, "sx", keys, delay); this.act(target, "sy", keys, delay); }
  beak(frames, delay = 0) { this.act("beak", "drop", frames.map(([t, d]) => [t, d]), delay); this.act("beak", "lift", frames.map(([t, , l]) => [t, l]), delay); }
  stare(frames, delay = 0) { this.act("stare", "v", frames, delay); }
  fluff(frames, delay = 0) { this.act("fluff", "v", frames, delay); }
  look(frames, delay = 0) { this.act(this.L.gaze, "tx", frames.map(([t, x]) => [t, x * 6]), delay); this.act(this.L.gaze, "ty", frames.map(([t, , y]) => [t, y * 6]), delay); }
  stopBusiness() { this.engine.clear("act"); for (const p of [...this.props.children]) p.remove(); this.busyUntil = 0; }
  get still() { return reduceMotion.matches; }

  hops(count, height, delay = 0) {
    if (this.still) return;
    for (let i = 0; i < count; i++) {
      const at = delay + i * 0.5, h = height * 6;
      this.act(this.L.hop, "ty", [[0, 0], [0.1, 0.8 * 6], [0.26, -h], [0.42, 0], [0.48, 0]], at);
      this.act(this.L.squash, "sy", [[0, 1], [0.1, 0.9], [0.2, 1.06], [0.42, 0.93], [0.48, 1]], at);
      this.scale(this.L.ground, [[0, 1], [0.26, 0.7], [0.42, 1], [0.48, 1]], at);
    }
  }
  flutter(delay) { if (!this.still) this.act(this.L.wing, "rot", [[0, 0], [0.08, 0.24], [0.16, -0.04], [0.24, 0.2], [0.32, -0.03], [0.42, 0]], delay); }
  chirpOnce(delay) {
    this.act(this.L.chirp, "op", [[0, 0], [0.08, 1], [0.8, 0]], delay);
    if (this.still) return;
    this.scale(this.L.chirp, [[0, 0.8], [0.8, 1.15]], delay);
    this.flap(delay);
  }
  flap(delay) { if (!this.still) this.act("beak", "drop", [[0, 0], [0.04, 0.34], [0.12, 0.08], [0.2, 0.32], [0.34, 0]], delay); }
  puff() { if (!this.still) this.act(this.L.puff, "sx", [[0, 1], [0.14, 1.08], [0.5, 1]]); }
  nod(angle, delay) { if (!this.still) this.act(this.L.lean, "rot", [[0, 0], [0.16, -angle], [0.4, 0]], delay); }
  shake() { if (!this.still) this.act(this.L.lean, "rot", [[0, 0], [0.08, -0.06], [0.16, 0.06], [0.24, -0.04], [0.34, 0]]); }
  blink(delay) { this.act(this.L.lid, "sy", [[0, this.open], [0.07, 0.1], [0.17, this.open]], delay); }
  arrive() {
    if (this.still) { this.act(this.L.stage, "op", [[0, 0], [0.5, 1]]); return; }
    this.scale(this.L.stage, [[0, 0.55], [0.28, 1.07], [0.42, 1]]);
    this.act(this.L.stage, "op", [[0, 0], [0.18, 1], [0.42, 1]]);
    this.act(this.L.ground, "op", [[0, 0], [0.18, 1], [0.42, 1]]);
    this.hops(1, 4, 0.45);
  }

  // The reaction a cue deserves, and when the speech may open without covering
  // the bird's business. The first need or alarm after a quiet spell is the squawk.
  react(cue) {
    const now = performance.now();
    if (["need", "news", "alarm", "wake", "panic"].includes(cue)) {
      this.stopBusiness();
      const quiet = now - this.quietSince;
      this.quietSince = now;
      if ((cue === "need" || cue === "alarm" || cue === "panic") && !this.still && quiet > 20000 && now - this.lastSquawk > 45000) {
        this.lastSquawk = now;
        return this.squawk();
      }
    }
    switch (cue) {
      case "need": case "news": this.hops(2, 7); this.flutter(0.12); this.chirpOnce(1.0); return { speech: 0 };
      case "alarm": case "panic": this.puff(); this.nod(0.1, 0.35); this.flap(0.35); return { speech: 0 };
      case "wake": this.shake(); this.blink(0.45); break;
      case "busy": this.hops(1, 4); break;
      case "step": if (now - this.lastNod > 8000) { this.lastNod = now; this.nod(-0.06, 0); } break;
    }
    return { speech: 0 };
  }

  // The big one: the canary crouches, springs up fluffed out with its eyes wide,
  // squawks with its beak wide open, then settles. Sometimes a feather comes loose.
  squawk() {
    const b = this.mood === "alert" ? 1.03 : 1, L = this.L;
    this.act(L.hop, "ty", [[0, 0], [0.12, 6], [0.27, -24], [0.42, 0], [0.5, 0]]);
    this.act(L.squash, "sy", [[0, 1], [0.12, 0.9], [0.24, 1.04], [0.42, 0.97], [0.5, 1]]);
    this.scale(L.ground, [[0, 1], [0.12, 1.1], [0.27, 0.8], [0.42, 1.12], [1.1, 1.12], [1.35, 1]]);
    this.act(L.puff, "sx", [[0, b], [0.12, 1.05 * b], [0.26, 1.2 * b], [0.36, 1.15 * b], [1.1, 1.15 * b], [1.3, 0.95 * b], [1.45, 1.01 * b], [1.55, b]]);
    this.act(L.puff, "sy", [[0, b], [0.12, 0.94 * b], [0.26, 1.16 * b], [0.36, 1.12 * b], [1.1, 1.12 * b], [1.3, 0.96 * b], [1.45, 1.01 * b], [1.55, b]]);
    this.fluff([[0, 0], [0.16, 0], [0.26, 1.1], [0.36, 1], [0.6, 1], [0.64, 1.2], [0.68, 1], [0.72, 1.2], [0.76, 1], [1.1, 1], [1.3, 0]]);
    this.act(L.wing, "rot", [[0, 0], [0.14, -0.04], [0.26, 0.3], [0.38, 0.16], [0.64, 0.22], [0.68, 0.16], [0.72, 0.22], [0.76, 0.16], [1.1, 0.16], [1.35, 0]]);
    this.act(L.lean, "rot", [[0, 0], [0.12, -0.03], [0.26, 0.02], [0.36, 0], [0.6, 0], [0.64, -0.02], [0.68, 0.02], [0.72, -0.02], [0.76, 0.02], [0.8, 0]]);
    this.act(L.lid, "sy", [[0, 1], [0.12, 0.5], [0.22, 1.12], [0.3, 1], [1.4, 1], [1.47, 0.1], [1.57, 1]]);
    this.stare([[0, 0], [0.18, 0], [0.28, 1.15], [0.36, 1], [1.15, 1], [1.3, 0]]);
    this.look([[0, 0, 0], [1.3, 0, 0]]);
    this.beak([[0, 0, 0], [0.14, 0, 0], [0.24, 0.62, 0.2], [0.28, 0.42, 0.13], [0.31, 0.64, 0.2], [0.37, 0.4, 0.13], [0.42, 0.64, 0.2], [0.46, 0.44, 0.14], [0.49, 0.66, 0.21], [0.57, 0.5, 0.16], [0.7, 0.08, 0.02], [0.78, 0, 0]]);
    this.mark("!", "#FF8833", this.spot(300, 70), 0.16, 1.0);
    this.sing(this.spot(440, 150), 0.26); this.sing(this.spot(440, 150), 0.44, true);
    if (Math.random() < 0.35) this.moult(this.spot(200, 250), 0.26);
    return { speech: 1.5 };
  }

  // ------------------------------------------------------------ Business
  // A little tune, eyes shut with glee and the head swaying.
  song() {
    const o = this.open;
    this.act(this.L.lid, "sy", [[0, o], [0.2, 0.01], [2.2, 0.01], [2.4, o]]);
    this.act(this.L.gleeEye, "op", [[0, 0], [0.15, 0], [0.25, 1], [2.15, 1], [2.3, 0]]);
    this.act(this.L.lean, "rot", [[0, 0], [0.35, -0.06], [0.7, 0.03], [1.05, -0.06], [1.4, 0.03], [1.75, -0.06], [2.1, 0.02], [2.5, 0]]);
    this.beak([[0, 0, 0], [0.3, 0, 0], [0.4, 0.26, 0.06], [0.6, 0, 0], [1.0, 0, 0], [1.1, 0.3, 0.08], [1.3, 0, 0], [1.7, 0, 0], [1.8, 0.26, 0.06], [2.0, 0, 0]]);
    for (const [beamed, delay] of [[false, 0.4], [true, 1.1], [false, 1.8]]) this.sing(this.spot(430, 160), delay, beamed);
  }
  // Looks up at something, blinks twice and wonders.
  lookUp() {
    const o = this.open;
    this.act(this.L.lean, "rot", [[0, 0], [0.35, -0.2], [1.6, -0.2], [1.8, -0.26], [2.3, -0.26], [2.6, 0]]);
    this.look([[0, 0, 0], [0.3, 0.3, -1.1], [2.3, 0.3, -1.1], [2.6, 0, 0]]);
    this.act(this.L.lid, "sy", [[0, o], [1.0, o], [1.07, 0.1], [1.17, o], [1.3, o], [1.37, 0.1], [1.47, o]]);
    this.mark("?", "#0D7680", this.spot(270, 66), 1.2, 2.3);
  }
  // Glances over its shoulder, turns back, then whips round again, eyes wide.
  doubleTake() {
    const f = this.facingRight ? 1 : -1, o = this.open;
    this.act(this.L.perch, "sx", [[0, f], [0.28, -f], [0.8, -f], [1.08, f], [1.3, f], [1.42, -f], [1.9, -f], [2.18, f]]);
    this.look([[0, 0, 0], [0.3, 0.6, -0.1], [0.55, -0.3, -0.1], [0.8, 0, 0]]);
    this.act(this.L.hop, "ty", [[0, 0], [1.3, 0], [1.36, -15], [1.46, 0]]);
    this.stare([[0, 0], [1.38, 0], [1.46, 1.12], [1.52, 1], [1.9, 1], [2.05, 0]]);
    this.act(this.L.lid, "sy", [[0, o], [2.25, o], [2.32, 0.1], [2.42, o]]);
  }
  // A slow yawn, beak wide and eyes squeezed shut, then a shake of the feathers.
  yawn() {
    const o = this.open;
    this.act(this.L.breath, "sy", [[0, 1], [0.9, 1.08], [1.6, 1.08], [2.0, 1]]);
    this.act(this.L.puff, "sx", [[0, 1], [0.9, 0.96], [1.6, 0.96], [2.0, 1]]);
    this.beak([[0, 0, 0], [0.3, 0, 0], [0.9, 0.55, 0.18], [1.5, 0.55, 0.18], [1.9, 0, 0]]);
    this.act(this.L.lid, "sy", [[0, o], [0.3, o], [0.6, 0.02], [1.6, 0.02], [1.9, o]]);
    this.act(this.L.shutEye, "op", [[0, 0], [0.5, 0], [0.6, 1], [1.6, 1], [1.7, 0]]);
    this.fluff([[0, 0], [2.1, 0], [2.2, 1.1], [2.5, 0.8], [2.7, 0]]);
    this.act(this.L.lean, "rot", [[0, 0], [2.1, 0], [2.18, -0.05], [2.26, 0.05], [2.34, -0.04], [2.44, 0]]);
    this.act(this.L.wing, "rot", [[0, 0], [2.1, 0], [2.16, 0.14], [2.26, 0], [2.36, 0.1], [2.46, 0]]);
  }
  // Nods off: the eyes droop shut in stages while a "z" drifts up; then a jolt,
  // and it snaps upright wide-eyed, looks both ways and is all attention again.
  nodOff() {
    const o = this.open, jolt = 3.8, end = 5.2, L = this.L;
    this.act(L.lid, "sy", [[0, o], [0.7, 0.7 * o], [1.1, 0.5 * o], [1.3, 0.72 * o], [2.1, 0.3 * o], [2.35, 0.45 * o], [3.1, 0.1], [3.6, 0.04], [jolt, 0.04], [jolt + 0.06, 1.15], [4.9, 1.1], [end, o]]);
    this.act(L.lean, "rot", [[0, 0], [1.1, 0.05], [1.3, 0.025], [2.3, 0.1], [2.5, 0.07], [3.4, 0.15], [jolt, 0.17], [jolt + 0.08, -0.05], [jolt + 0.2, 0.02], [jolt + 0.3, 0], [end, 0]]);
    this.act(L.breath, "sy", [[0, 1], [jolt, 0.965], [jolt + 0.08, 1.05], [jolt + 0.24, 1], [end, 1]]);
    this.act(L.wing, "rot", [[0, 0], [jolt, -0.06], [jolt + 0.06, 0.2], [jolt + 0.2, 0], [end, 0]]);
    this.act(L.hop, "ty", [[0, 0], [jolt, 0], [jolt + 0.08, -15], [jolt + 0.22, 0], [end, 0]]);
    this.fluff([[0, 0], [jolt, 0], [jolt + 0.05, 1.1], [jolt + 0.3, 0], [end, 0]]);
    this.stare([[0, 0], [jolt, 0], [jolt + 0.06, 1.1], [4.9, 1], [end, 0]]);
    this.look([[0, 0, 0], [jolt + 0.2, 0, 0], [jolt + 0.4, 0.7, 0], [jolt + 0.7, -0.6, -0.1], [jolt + 1.0, 0, 0], [end, 0, 0]]);
    this.float("z", "#6B635C", this.spot(340, 110), 2.5, jolt);
  }
  // Turns its head to look at the reader: the eye slides to the near side of the
  // face, the far eye appears and the beak points down between them.
  peek() {
    const o = this.open, turned = 0.24, back = 2.5, end = 2.76, L = this.L;
    const hold = (target, prop, rest, turn) => this.act(target, prop, [[0, rest], [turned, turn], [back, turn], [end, rest]]);
    hold(L.eye, "tx", 0, ART.face.near[0] - ART.eye.c[0]); hold(L.eye, "ty", 0, ART.face.near[1] - ART.eye.c[1]);
    this.act(L.farEye, "op", [[0, 0], [0.1, 0], [turned, 1], [back, 1], [back + 0.14, 0], [end, 0]]);
    hold(L.beakTurn, "rot", 0, Math.PI / 2); hold(L.beakTurn, "sx", 1, 0.5); hold(L.beakTurn, "sy", 1, 0.65);
    hold(L.beakTurn, "tx", 0, ART.face.hinge[0] - ART.hinge[0]); hold(L.beakTurn, "ty", 0, ART.face.hinge[1] - ART.hinge[1]);
    hold(L.mouth, "op", 1, 0);
    this.look([[0, 0, 0], [end, 0, 0]]);
    this.act(L.lid, "sy", [[0, o], [1.0, o], [1.2, 0.06], [1.32, 0.06], [1.6, o], [end, o]]);
    this.act(L.farEye, "sy", [[0, o], [1.0, o], [1.2, 0.06], [1.32, 0.06], [1.6, o], [end, o]]);
    this.act(L.lean, "rot", [[0, 0], [1.7, 0], [1.95, -0.07], [2.35, -0.07], [2.6, 0], [end, 0]]);
  }
  // A good stretch: leans forward and lifts its wing high, quivering, eyes shut,
  // then folds it and shakes its feathers into place.
  stretch() {
    const o = this.open, end = 2.8, L = this.L;
    this.act(L.lean, "rot", [[0, 0], [0.5, 0.1], [1.6, 0.1], [1.9, 0], [2.2, 0], [2.28, -0.05], [2.36, 0.05], [2.44, -0.04], [2.54, 0], [end, 0]]);
    this.act(L.wing, "rot", [[0, 0], [0.5, 0.6], [0.9, 0.56], [1.0, 0.62], [1.1, 0.56], [1.2, 0.62], [1.3, 0.58], [1.6, 0.58], [1.9, 0], [2.2, 0], [2.26, 0.16], [2.34, 0], [2.42, 0.1], [2.52, 0], [end, 0]]);
    this.act(L.breath, "sy", [[0, 1], [0.5, 1.05], [1.6, 1.05], [1.9, 1], [end, 1]]);
    this.act(L.lid, "sy", [[0, o], [0.4, 0.01], [1.6, 0.01], [1.8, o], [end, o]]);
    this.act(L.shutEye, "op", [[0, 0], [0.35, 0], [0.45, 1], [1.6, 1], [1.7, 0], [end, 0]]);
    this.beak([[0, 0, 0], [0.6, 0.14, 0.03], [1.4, 0.14, 0.03], [1.6, 0, 0], [end, 0, 0]]);
    this.fluff([[0, 0], [2.2, 0], [2.26, 1.1], [2.5, 0.9], [2.7, 0], [end, 0]]);
  }
  static get antics() { return ["song", "lookUp", "doubleTake", "yawn", "nodOff", "peek", "stretch"]; }
  play(name) {
    if (this.still || !Canary.antics.includes(name)) return false;
    this.stopBusiness();
    this[name]();
    return true;
  }
  get busy() { return performance.now() < this.busyUntil; }

  // ---------------------------------------------------------------- Props
  prop(node, seconds) {
    this.props.append(node);
    setTimeout(() => node.remove(), seconds * 1000 + 50);
    return node;
  }
  // A mark pops up over the canary, wobbles, and fades.
  mark(glyph, colour, [x, y], start, end) {
    const t = el("text", { x, y, "text-anchor": "middle", "font-family": "Instrument Sans, system-ui, sans-serif", "font-weight": 700, "font-size": 64, fill: colour });
    t.textContent = glyph;
    const layer = this.engine.layer(this.prop(t, end), x, y - 22, { op: 0, sx: 0.3, sy: 0.3 });
    this.act(layer, "op", [[0, 0], [start, 0], [start + 0.1, 1], [end - 0.25, 1], [end, 0]]);
    this.scale(layer, [[0, 0.3], [start, 0.3], [start + 0.14, 1.2], [start + 0.26, 1], [end, 1]]);
    this.act(layer, "rot", [[0, 0], [start, 0], [start + 0.2, -0.12], [start + 0.45, 0.1], [start + 0.7, -0.06], [start + 0.95, 0], [end, 0]]);
  }
  // A note floats up from the beak, swaying, and fades. Beamed: two notes together.
  sing([x, y], delay, beamed = false) {
    const t = el("text", { x, y, "text-anchor": "middle", "font-family": "Instrument Sans, system-ui, sans-serif", "font-size": 42, fill: "#101827" });
    t.textContent = beamed ? "♫" : "♪";
    this.float(t, null, [x, y], delay, delay + 1.5, 1.2);
  }
  // A small glyph drifts up from `start`, swaying, from `delay` and fades out by `end`.
  float(glyph, colour, [x, y], delay, end, seconds = 1.6) {
    const t = typeof glyph === "string" ? el("text", { x, y, "text-anchor": "middle", "font-family": "Instrument Sans, system-ui, sans-serif", "font-weight": 700, "font-size": 40, fill: colour }) : glyph;
    if (typeof glyph === "string") t.textContent = glyph;
    const f = this.facingRight ? 1 : -1, d = end - delay;
    const layer = this.engine.layer(this.prop(t, end), x, y, { op: 0 });
    this.act(layer, "op", [[0, 0], [delay, 0], [delay + 0.15, 0.95], [end - 0.35, 0.8], [end, 0]]);
    this.act(layer, "ty", [[0, 0], [delay, 0], [end, -70]]);
    this.act(layer, "tx", [[0, 0], [delay, 0], [delay + d * 0.33, f * 12], [delay + d * 0.66, -f * 8], [end, f * 10]]);
    this.act(layer, "rot", [[0, 0], [delay, 0], [delay + d * 0.5, 0.18], [end, -0.12]]);
  }
  // A feather comes loose, pops up and rocks down, then fades.
  moult([x, y], delay) {
    const p = el("path", { d: "M0 -18 Q14 -1 1 18 Q-11 4 0 -18 Z", fill: "#FDC604", stroke: "#DB6D01", "stroke-width": 1.2 });
    p.setAttribute("transform", `translate(${x} ${y})`);
    const g = el("g", {}); g.append(p);
    const layer = this.engine.layer(this.prop(g, delay + 2.6), x, y, { op: 0 });
    this.act(layer, "op", [[0, 0], [delay, 0], [delay + 0.05, 1], [delay + 2.1, 1], [delay + 2.5, 0]]);
    this.act(layer, "ty", [[0, 0], [delay, 0], [delay + 0.2, -40], [delay + 0.6, -20], [delay + 1.1, 20], [delay + 1.6, 45], [delay + 2.1, 70], [delay + 2.5, 80]]);
    this.act(layer, "tx", [[0, 0], [delay, 0], [delay + 0.6, -30], [delay + 1.1, -60], [delay + 1.6, -40], [delay + 2.1, -75], [delay + 2.5, -60]]);
    this.act(layer, "rot", [[0, 0], [delay, 0], [delay + 0.6, 0.9], [delay + 1.1, -0.6], [delay + 1.6, 0.8], [delay + 2.1, -0.5], [delay + 2.5, 0.3]]);
  }
}

// ------------------------------------------------------------ The companion
// The capsule beside the bird pages through what waits, the way the native
// one does, and a scripted day supplies the sights. Nothing is live.
const ICONS = {
  order: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17c3.333 -3.333 5 -6 5 -8c0 -3 -1 -3 -2 -3s-2.032 1.085 -2 3c.034 2.048 1.658 4.877 2.5 6c1.5 2 2.5 2.5 3.5 1l2 -3c.333 2.667 1.333 4 3 4c.5 0 2 -.5 2 -1"/><path d="M14 16c1 1 2 1 3 0"/></svg>',
  tool_brief: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 6h3a1 1 0 0 1 1 1v11a2 2 0 0 1 -4 0v-13a1 1 0 0 0 -1 -1h-10a1 1 0 0 0 -1 1v12a3 3 0 0 0 3 3h11"/><path d="M8 8l4 0M8 12l4 0M8 16l4 0"/></svg>',
  tool_review: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3l8 -8"/><path d="M20 12v6a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h9"/></svg>',
  tool_open: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17l10 -10"/><path d="M8 7l9 0l0 9"/></svg>',
  question: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 8a3.5 3 0 0 1 3.5 -3h1a3.5 3 0 0 1 3.5 3a3 3 0 0 1 -2 3a3 4 0 0 0 -2 4"/><path d="M12 19l0 .01"/></svg>',
  brief: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 6h3a1 1 0 0 1 1 1v11a2 2 0 0 1 -4 0v-13a1 1 0 0 0 -1 -1h-10a1 1 0 0 0 -1 1v12a3 3 0 0 0 3 3h11"/><path d="M8 8l4 0M8 12l4 0M8 16l4 0"/></svg>',
  issue: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0z"/><path d="M12 16h.01"/></svg>',
  status: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"/><path d="M12 7v5l3 3"/></svg>',
  step: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 1 0 9 9"/><path d="M12 7v5l3 3"/></svg>',
};

const BRIEF = {
  title: "Europe morning brief",
  when: "Friday 2 October · 07:00 CEST",
  sections: [
    ["Markets", "blue", "S&P 500 5,542.60, +0.42% on the session. Nasdaq 100 +0.58%, Russell 2000 −0.45%. VIX 18.42, −1.34%. Regime as recorded by Canary: {watch}, volatility easing."],
    ["Book", "ink", "Net liquidation 250,000 USD; day P&L +991 USD, +0.39% of NLV. Five stock positions, three option legs. Margin headroom 68% of NLV."],
    ["Risk", "amber", "DDD at 27.1% of NLV exceeds the 25% cap. CCC and NVDA 16 Oct puts are 21 sessions from expiry; the runway floor is 30. Risk policy: {new risk allowed}."],
    ["Calendar", "slate", "US equities 15:30–22:00 CEST. Pre-open review due 14:30, pre-close 21:15. No approved impactful events today."],
    ["Needs you", "orange", "One reduction proposal awaits authorisation: sell 2 CCC 16 Oct 26 145 puts, theta hygiene. Nothing else is queued."],
  ],
};
// Figures and states in the brief get their colour: gains green, losses red, states as pills.
function briefLine(text) {
  const p = html("p", "");
  const parts = text.split(/([+−-]\d[\d,.]*%?|\{[^}]+\})/g);
  for (const part of parts) {
    if (!part) continue;
    if (/^\{/.test(part)) { const pill = html("span", "pill", part.slice(1, -1)); pill.dataset.state = part.slice(1, -1).split(" ")[0]; p.append(pill); }
    else if (/^[+]/.test(part)) p.append(html("span", "pos", part));
    else if (/^[−-]\d/.test(part)) p.append(html("span", "neg", part));
    else p.append(part);
  }
  return p;
}

// One day on the desk, as sights the companion reacts to.
const DAY = [
  // Seconds into the visit; a visitor sees the first reaction within ten.
  { at: 0, mood: "calm", waiting: [["status", "Quiet book · next review 14:30 CEST"]] },
  { at: 6, mood: "calm", brief: "europe-morning", title: "Europe morning brief is in", waiting: [["brief", "Positions, risk, calendar: what changed overnight"], ["status", "Book +0.39% since the close · risk: watch"]] },
  { at: 18, mood: "busy", step: "calendar", waiting: [["step", "Pre-open review: reading the calendar"]] },
  { at: 23, mood: "busy", step: "exposure", waiting: [["step", "Pre-open review: checking exposure and margin"]] },
  { at: 28, mood: "busy", step: "draft", waiting: [["step", "Pre-open review: drafting, second reviewer next"]] },
  { at: 36, mood: "approval", approvals: 1, waiting: [["order", "Sell 2 CCC 16 Oct 26 145 puts · theta hygiene"], ["status", "Confirm on the companion, or let it expire"]] },
  { at: 54, mood: "waiting", approvals: 1, decisions: 1, waiting: [["question", "Keep the NVDA 145 put through expiry?"], ["order", "Sell 2 CCC 16 Oct 26 145 puts · theta hygiene"]] },
  { at: 70, mood: "alert", waiting: [["issue", "DDD at 27.1% of NLV exceeds the 25% cap"], ["status", "Reduce-only advice drafted by rule, waiting for you"]] },
  { at: 84, mood: "calm", waiting: [["status", "Calm · pre-close review at 21:15 CEST"]] },
  { at: 112, mood: "resting", waiting: [["status", "Paused for the night · Europe brief at 07:00"]] },
  { at: 132, mood: "calm", waiting: [["status", "Good morning · watching the book"]] },
];
const TITLES = {
  calm: "Canary Desk is watching the book", busy: "Canary Desk is working", approval: "1 order awaits your authorisation",
  waiting: "A question for you", alert: "Risk: watch", resting: "Canary Desk is paused", away: "Canary Desk cannot be seen",
};

class Companion {
  constructor() {
    if (sessionStorage.getItem("canary-hidden")) return;
    this.root = html("div", "canary-companion");
    this.root.setAttribute("role", "group");
    this.root.setAttribute("aria-label", "Desk's canary companion, a demo");
    this.speech = html("div", "canary-speech");
    const lines = html("div", "lines");
    this.title = html("p", "title", "");
    const line2 = html("div", "line2");
    this.ticker = html("div", "ticker");
    this.sizer = html("span", "sizer");
    this.sizer.setAttribute("aria-hidden", "true");
    this.dots = html("ul", "dots");
    line2.append(this.ticker, this.dots);
    lines.append(this.title, line2);
    const tools = html("div", "tools");
    const tool = (name, label, onClick) => {
      const b = html("button", "tool " + name); b.type = "button"; b.setAttribute("aria-label", label); b.title = label;
      b.innerHTML = ICONS["tool_" + name]; b.addEventListener("click", onClick); return b;
    };
    this.briefButton = tool("brief", "Read the brief", () => this.openBrief());
    this.briefButton.append(html("i", "unread"));
    this.reviewButton = tool("review", "What waits for you", () => this.openForYou());
    this.count = html("b", "count", ""); this.reviewButton.append(this.count);
    const open = html("a", "tool open"); open.href = document.body.dataset.deskHref || "desk/"; const openLabel = open.getAttribute("href").startsWith("#") ? "Go to Decisions" : "Open Canary Desk"; open.setAttribute("aria-label", openLabel); open.title = openLabel; open.innerHTML = ICONS.tool_open;
    const close = html("button", "tool close"); close.type = "button"; close.setAttribute("aria-label", "Hide the companion"); close.title = "Hide"; close.textContent = "×";
    close.addEventListener("click", () => this.hide());
    tools.append(this.briefButton, this.reviewButton, open, close);
    this.speech.append(lines, tools);
    this.demoNote = html("p", "canary-note", "A day at the desk · demo, synthetic book");
    this.perch = html("div", "canary-perch");
    this.perch.setAttribute("role", "button"); this.perch.tabIndex = 0;
    this.perch.setAttribute("aria-label", "The canary. Press for a move.");
    this.badge = html("span", "canary-badge", "");
    const column = html("div", "column"); column.append(this.speech, this.demoNote);
    this.root.append(column, this.perch);
    this.perch.append(this.badge);
    (document.querySelector(".site-header") || document.body).after(this.root);
    document.body.classList.add("has-companion");
    this.root.addEventListener("focusin", () => { this.hovering = true; this.setSpeech(true); });
    this.root.addEventListener("focusout", (e) => { if (!this.root.contains(e.relatedTarget)) { this.hovering = false; this.schedule(); } });
    this.canary = new Canary(this.perch);
    this.canary.engine.watch(this.perch);
    this.pages = []; this.page = 0; this.speechUntil = 0; this.sight = null; this.brief = null; this.hovering = false;
    this.perch.addEventListener("click", () => this.clicked());
    this.perch.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this.clicked(); } });
    for (const node of [this.perch, this.speech]) {
      node.addEventListener("pointerenter", () => { this.hovering = true; this.setSpeech(true); });
      node.addEventListener("pointerleave", () => { this.hovering = false; this.schedule(); });
    }
    this.pager = setInterval(() => this.turnPage(), 5000);
    this.start();
  }
  hide() { clearInterval(this.pager); clearTimeout(this.timer); clearTimeout(this.anticTimer); this.root.remove(); this.briefCard?.remove(); this.forYouCard?.remove(); try { sessionStorage.setItem("canary-hidden", "1"); } catch {} }

  start() {
    this.canary.arrive();
    this.t0 = performance.now();
    this.step(0);
  }
  step(i) {
    const scene = DAY[i % DAY.length];
    this.see(scene);
    const next = DAY[(i + 1) % DAY.length];
    const gap = ((i + 1) % DAY.length === 0 ? DAY[DAY.length - 1].at + 22 : next.at) - scene.at;
    this.timer = setTimeout(() => this.step(i + 1), gap * 1000);
    // Now and then, while nothing needs the reader, a bit of business.
    clearTimeout(this.anticTimer);
    if (["calm", "resting"].includes(scene.mood) && gap > 14) {
      const pick = scene.mood === "resting" ? "nodOff" : Canary.antics.filter((a) => a !== "nodOff")[Math.floor(Math.random() * 6)];
      this.anticTimer = setTimeout(() => { if (!this.canary.busy && !this.hovering) this.canary.play(pick); }, (4 + Math.random() * 4) * 1000);
    }
  }
  // The reaction a change deserves, as the native companion decides it.
  cue(old, now) {
    if (!old) return now.approvals ? "need" : now.brief ? "news" : null;
    if ((now.approvals || 0) > (old.approvals || 0) || (now.decisions || 0) > (old.decisions || 0)) return "need";
    if (now.brief && now.brief !== old.brief) return "news";
    if (now.mood !== old.mood) {
      if (now.mood === "away") return "doze";
      if (old.mood === "away") return "wake";
      if (now.mood === "alert") return "alarm";
      return now.mood === "busy" ? "busy" : null;
    }
    return now.mood === "busy" && now.step && now.step !== old.step ? "step" : null;
  }
  see(scene) {
    const old = this.sight;
    this.sight = scene;
    this.canary.show(scene.mood);
    if (scene.brief) this.brief = BRIEF;
    const ids = scene.waiting.map((w) => w[1]);
    if (ids.join("|") !== this.pages.map((p) => p[1]).join("|")) {
      this.pages = scene.waiting; this.page = 0;
      // The capsule fits its longest page, so no page is cut short.
      this.sizer.textContent = ids.reduce((a, b) => (b.length > a.length ? b : a), "");
      this.render(false);
    }
    this.title.textContent = scene.title || TITLES[scene.mood] || "Desk";
    this.briefButton.dataset.unread = this.brief ? "1" : "0";
    const cue = this.cue(old, scene);
    const seconds = { need: 9, news: 9, alarm: 7, panic: 7, doze: 6, wake: 4 }[cue];
    let beat = { speech: 0 };
    if (cue) beat = this.canary.react(cue);
    if (!old) { this.announce(6, 0.6); }
    else if (seconds) this.announce(seconds, beat.speech || 0);
    this.setBadge(scene);
  }
  setBadge(scene) {
    const count = (scene.approvals || 0) + (scene.decisions || 0) + (scene.waiting.filter((w) => w[0] === "issue").length) + (scene.waiting.some((w) => w[0] === "brief") ? 1 : 0);
    const orange = (scene.approvals || 0) > 0 || scene.mood === "alert";
    this.badge.textContent = count > 9 ? "9+" : String(count);
    this.badge.dataset.orange = orange ? "1" : "0";
    this.badge.dataset.on = count > 0 && this.speech.dataset.open !== "1" ? "1" : "0";
    this.count.textContent = count > 9 ? "9+" : String(count);
    this.count.dataset.on = count > 0 ? "1" : "0";
    this.count.dataset.orange = orange ? "1" : "0";
  }
  render(animated) {
    const [kind, text] = this.pages[this.page] || ["status", ""];
    const page = html("p", "page");
    const icon = html("span", "kind"); icon.dataset.kind = kind; icon.innerHTML = ICONS[kind] || ICONS.status;
    page.append(icon, html("span", "", text));
    if (animated && !reduceMotion.matches) page.dataset.enter = "1";
    // A scene change can interrupt a page transition. Keep only the current
    // line, so interrupted animations never leave overlapping messages behind.
    this.ticker.replaceChildren(this.sizer, page);
    this.dots.replaceChildren(...this.pages.map((_, i) => { const li = html("li"); if (i === this.page) li.setAttribute("aria-current", "true"); return li; }));
    this.dots.hidden = this.pages.length < 2;
  }
  turnPage() {
    if (this.pages.length < 2 || this.hovering || this.speech.dataset.open !== "1") return;
    this.page = (this.page + 1) % this.pages.length;
    this.render(true);
  }
  announce(seconds, delay) {
    this.speechUntil = performance.now() + (delay + seconds) * 1000;
    clearTimeout(this.speechTimer);
    this.speechTimer = setTimeout(() => this.setSpeech(true), delay * 1000);
    this.schedule();
  }
  schedule() {
    clearTimeout(this.hideTimer);
    const wait = Math.max(500, this.speechUntil - performance.now());
    this.hideTimer = setTimeout(() => { if (!this.hovering && performance.now() >= this.speechUntil) this.setSpeech(false); }, wait);
  }
  setSpeech(open) {
    this.speech.dataset.open = open ? "1" : "0";
    if (this.sight) this.setBadge(this.sight);
  }
  clicked() {
    if (this.brief && this.pages[this.page]?.[0] === "brief") return this.openBrief();
    if (this.sight && ((this.sight.approvals || 0) + (this.sight.decisions || 0)) > 0) return this.openForYou();
    const moves = Canary.antics;
    this.canary.play(moves[Math.floor(Math.random() * moves.length)]);
    this.announce(5, 0);
  }
  card(name, label) {
    const card = html("aside", "canary-brief " + name);
    card.setAttribute("aria-label", label);
    const close = html("button", "close", "×"); close.type = "button"; close.setAttribute("aria-label", "Close");
    const dismiss = () => { if (card.hidden) return; card.hidden = true; card.opener?.focus(); };
    close.addEventListener("click", dismiss);
    card.append(close);
    document.body.append(card);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") dismiss(); });
    return card;
  }
  openBrief() {
    if (!this.briefCard) {
      const card = this.card("brief", "Demo brief");
      card.append(html("p", "eyebrow-line", "Daily brief · demo"), html("h3", "", BRIEF.title), html("p", "when", BRIEF.when));
      for (const [head, tone, body] of BRIEF.sections) {
        const h = html("h4", "", head); h.dataset.tone = tone;
        card.append(h, briefLine(body));
      }
      card.append(html("p", "demo", "A synthetic edition for this page. Real briefs are written by Desk from the day's evidence, checked by a second model, and never shown here."));
      this.briefCard = card;
    }
    if (this.forYouCard) this.forYouCard.hidden = true;
    this.briefCard.opener = document.activeElement;
    this.briefCard.hidden = false;
    this.briefCard.querySelector(".close").focus();
    this.brief = null;
    this.briefButton.dataset.unread = "0";
  }
  openForYou() {
    if (!this.forYouCard) this.forYouCard = this.card("foryou", "What waits for you");
    const card = this.forYouCard;
    card.replaceChildren(card.firstElementChild, html("p", "eyebrow-line", "For you · demo"), html("h3", "", this.title.textContent));
    const list = html("ul", "items");
    for (const [kind, text] of this.pages) {
      const li = html("li"); const icon = html("span", "kind"); icon.dataset.kind = kind; icon.innerHTML = ICONS[kind] || ICONS.status;
      li.append(icon, html("span", "", text)); list.append(li);
    }
    card.append(list, html("p", "demo", "On the desk, an order here is confirmed on the paired companion with Touch ID, or left to expire. Nothing on this page can place one."));
    if (this.briefCard) this.briefCard.hidden = true;
    card.opener = document.activeElement;
    card.hidden = false;
    card.querySelector(".close").focus();
  }
}

if (matchMedia("(min-width: 761px)").matches) window.deskCanary = new Companion();
