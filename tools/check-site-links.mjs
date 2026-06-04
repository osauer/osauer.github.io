import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const siteOrigin = "https://osauer.dev";
const problems = [];

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch (err) {
    if (err && err.code === "ENOENT") {
      return false;
    }
    throw err;
  }
}

function localTarget(raw) {
  if (!raw || raw.startsWith("#")) {
    return "";
  }
  if (/^(mailto|tel|javascript):/i.test(raw)) {
    return "";
  }
  let url;
  if (raw.startsWith(siteOrigin)) {
    url = new URL(raw);
  } else if (raw.startsWith("/")) {
    url = new URL(raw, siteOrigin);
  } else {
    return "";
  }
  if (url.origin !== siteOrigin) {
    return "";
  }
  return decodeURIComponent(url.pathname);
}

function targetFile(pathname) {
  if (!pathname || pathname === "/") {
    return "index.html";
  }
  const clean = pathname.replace(/^\/+/, "");
  if (pathname.endsWith("/")) {
    return path.join(clean, "index.html");
  }
  return clean;
}

async function checkPath(source, raw) {
  const target = localTarget(raw);
  if (!target) {
    return;
  }
  const file = targetFile(target);
  if (!(await exists(path.join(root, file)))) {
    problems.push(`${source}: ${raw} -> missing ${file}`);
  }
}

async function checkHTML(file) {
  const data = await readFile(file, "utf8");
  for (const match of data.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)) {
    await checkPath(file, match[1]);
  }
}

async function checkSitemap(file) {
  const data = await readFile(file, "utf8");
  for (const match of data.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)) {
    await checkPath(file, match[1]);
  }
}

async function checkRobots(file) {
  const data = await readFile(file, "utf8");
  for (const line of data.split(/\r?\n/)) {
    const match = line.match(/^Sitemap:\s*(\S+)/i);
    if (match) {
      await checkPath(file, match[1]);
    }
  }
}

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === ".git") {
      continue;
    }
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(file);
      continue;
    }
    yield file;
  }
}

for await (const file of walk(root)) {
  if (file.endsWith(".html")) {
    await checkHTML(file);
  } else if (file.endsWith("sitemap.xml")) {
    await checkSitemap(file);
  } else if (file.endsWith("robots.txt")) {
    await checkRobots(file);
  }
}

if (problems.length > 0) {
  console.error(`site link check failed with ${problems.length} problem(s):`);
  for (const problem of problems) {
    console.error(`  - ${problem}`);
  }
  process.exit(1);
}

console.log("site link check: all local osauer.dev links resolve to files");
