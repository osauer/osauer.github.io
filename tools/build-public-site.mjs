import { execFileSync } from "node:child_process";
import { copyFile, lstat, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkPublicArtifact } from "./check-public-artifact.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "output", "site");
const pages = new Set([
  ".nojekyll", "CNAME", "404.html", "index.html", "llms.txt", "robots.txt", "sitemap.xml",
  "desk/index.html", "hyperserve/index.html", "torok/index.html",
]);
const fontLicences = new Set([
  "assets/fonts/instrument-sans-OFL.txt", "assets/fonts/instrument-serif-OFL.txt",
]);
const assetExtensions = new Set([
  ".css", ".js", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".woff2", ".pdf", ".mp4", ".vtt",
]);
const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" })
  .split("\0").filter(Boolean);
const selected = tracked.filter((file) => pages.has(file) || fontLicences.has(file) || (
  file.startsWith("assets/") &&
  !file.split("/").some((part) => part.startsWith(".")) &&
  assetExtensions.has(path.extname(file))
));

for (const page of pages) {
  if (!selected.includes(page)) throw new Error(`Missing public page: ${page}`);
}
for (const file of selected) {
  const source = path.join(root, file);
  if (!(await lstat(source)).isFile()) throw new Error(`Public file must be a regular file: ${file}`);
}

await rm(output, { recursive: true, force: true });
for (const file of selected) {
  const target = path.join(output, file);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(path.join(root, file), target);
}
execFileSync("python3", [path.join(root, "tools/site-seo.py"), "generate", output], { stdio: "inherit" });
await checkPublicArtifact(output);
console.log(`Public site: ${selected.length} tracked pages and assets copied to output/site`);
