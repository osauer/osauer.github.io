#!/usr/bin/env node

// Deterministic, dependency-free renderer for the site's architecture diagrams.
// Each module in tools/diagrams exports render() returning the SVG text; the
// output lands in assets/ so the pages can embed it with a plain <img>.
// `--check` verifies the checked-in SVGs match the sources without rewriting.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "assets");
const modules = ["desk-system", "torok-architecture"];
const check = process.argv.includes("--check");
let failed = false;

for (const name of modules) {
  const file = path.join(root, "tools/diagrams", `${name}.mjs`);
  if (!fs.existsSync(file)) {
    console.error(`${name}: source ${path.relative(root, file)} is missing`);
    failed = true;
    continue;
  }
  const { render } = await import(file);
  const svg = render();
  const target = path.join(outDir, `${name}.svg`);
  if (check) {
    if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== svg) {
      console.error(`${name}.svg is stale; run node tools/render-diagrams.mjs`);
      failed = true;
    } else {
      console.log(`${name}.svg matches its source`);
    }
  } else {
    fs.writeFileSync(target, svg);
    console.log(`wrote ${path.relative(root, target)}`);
  }
}

process.exit(failed ? 1 : 0);
