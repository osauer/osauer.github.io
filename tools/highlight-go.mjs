#!/usr/bin/env node

// Static Go syntax colouring for the site's code blocks: reads Go source on
// stdin, writes HTML with <span> classes (k keyword, s string, c comment,
// t type or package, n number) on stdout. No runtime JavaScript on the page.

import fs from "node:fs";

const keywords = new Set(["break", "case", "chan", "const", "continue", "default", "defer", "else", "fallthrough", "for", "func", "go", "goto", "if", "import", "interface", "map", "package", "range", "return", "select", "struct", "switch", "type", "var", "nil", "true", "false"]);
const esc = (s) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const src = fs.readFileSync(0, "utf8");
let out = "";
let i = 0;
while (i < src.length) {
  const rest = src.slice(i);
  let m;
  if ((m = rest.match(/^\/\/[^\n]*/))) { out += `<span class="c">${esc(m[0])}</span>`; i += m[0].length; continue; }
  if ((m = rest.match(/^"(?:[^"\\]|\\.)*"/)) || (m = rest.match(/^`[^`]*`/))) { out += `<span class="s">${esc(m[0])}</span>`; i += m[0].length; continue; }
  if ((m = rest.match(/^\d[\d._]*/))) { out += `<span class="n">${esc(m[0])}</span>`; i += m[0].length; continue; }
  if ((m = rest.match(/^[A-Za-z_][A-Za-z0-9_]*/))) {
    const word = m[0];
    const after = rest.slice(word.length);
    if (keywords.has(word)) out += `<span class="k">${word}</span>`;
    else if (/^[A-Z]/.test(word) || (after.startsWith(".") && /^\.[A-Z]/.test(after))) out += `<span class="t">${word}</span>`;
    else out += word;
    i += word.length; continue;
  }
  out += esc(src[i]); i += 1;
}
process.stdout.write(out);
