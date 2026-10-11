import { readdir, readFile, lstat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const textExtensions = new Set([".html", ".txt", ".xml", ".css", ".js", ".svg", ".vtt", ".json"]);
const privateContent = [
  /-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----/,
  /\b(?:ghp_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[0-9A-Z]{16})\b/,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{30,}\b/,
  /\/(?:Users|home)\/[A-Za-z0-9._-]+\//,
  /\b(?:U|DU|DF|F)[0-9]{6,}\b/,
];

export async function checkPublicArtifact(root) {
  async function walk(directory) {
    for (const entry of await readdir(directory)) {
      const file = path.join(directory, entry);
      const info = await lstat(file);
      if (info.isDirectory()) {
        await walk(file);
      } else {
        if (!info.isFile()) throw new Error(`Public artifact contains a non-regular file: ${file}`);
        if (textExtensions.has(path.extname(file))) {
          const text = await readFile(file, "utf8");
          if (privateContent.some((pattern) => pattern.test(text))) {
            throw new Error(`Possible private content in ${file}; review before publishing`);
          }
        }
      }
    }
  }
  await walk(root);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await checkPublicArtifact(path.resolve(process.argv[2] ?? "output/site"));
  console.log("public artifact privacy check: all copied and generated text passed");
}
