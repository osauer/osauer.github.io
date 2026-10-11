import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { checkPublicArtifact } from "./check-public-artifact.mjs";

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), "site-privacy-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "ibkr", "old-guide"), { recursive: true });
  return root;
}

test("the final generated redirect tree is scanned for account identifiers", async (t) => {
  const root = await fixture(t);
  await writeFile(path.join(root, "ibkr", "old-guide", "index.html"), "<!-- U1234567 -->");
  await assert.rejects(checkPublicArtifact(root), /Possible private content/);
});

test("ordinary generated redirect markup passes", async (t) => {
  const root = await fixture(t);
  await writeFile(path.join(root, "ibkr", "old-guide", "index.html"), '<meta http-equiv="refresh" content="0; url=https://osauer.dev/canary/">');
  await checkPublicArtifact(root);
});

test("generated artifacts cannot publish symlink targets", async (t) => {
  const root = await fixture(t);
  await writeFile(path.join(root, "plain.txt"), "public");
  await symlink(path.join(root, "plain.txt"), path.join(root, "ibkr", "alias.txt"));
  await assert.rejects(checkPublicArtifact(root), /non-regular file/);
});
