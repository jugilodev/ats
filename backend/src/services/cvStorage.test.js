import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { openCvFile } from "./cvStorage.js";

const pathPrefix = "/home/node/.n8n-files/CVs/";

test("opens only PDFs within the configured root", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ats-cvs-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "Vendedor punto de venta"));
  await writeFile(
    path.join(root, "Vendedor punto de venta", "hoja de vida.pdf"),
    "%PDF-test",
  );

  const file = await openCvFile({
    rootDir: root,
    pathPrefix,
    storedPath: `${pathPrefix}Vendedor punto de venta/hoja de vida.pdf`,
  });
  try {
    assert.equal(file.size, 9);
    assert.equal((await file.fileHandle.readFile()).toString(), "%PDF-test");
  } finally {
    await file.fileHandle.close();
  }
});

test("rejects paths outside the prefix, traversal, and non-PDF files", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ats-cvs-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  for (const storedPath of [
    "/etc/passwd",
    `${pathPrefix}../secrets.pdf`,
    `${pathPrefix}folder\\..\\secrets.pdf`,
    `${pathPrefix}document.txt`,
    `${pathPrefix}missing.pdf`,
  ]) {
    await assert.rejects(
      openCvFile({ rootDir: root, pathPrefix, storedPath }),
      { statusCode: 404 },
    );
  }
});

test("requires an absolute configured root and rejects invalid prefixes", async () => {
  await assert.rejects(
    openCvFile({
      rootDir: "relative-cvs",
      pathPrefix,
      storedPath: `${pathPrefix}resume.pdf`,
    }),
    { statusCode: 503 },
  );
  await assert.rejects(
    openCvFile({
      rootDir: os.tmpdir(),
      pathPrefix: "/home/node/../private/",
      storedPath: "/home/node/../private/resume.pdf",
    }),
    { statusCode: 503 },
  );
});

test("rejects a directory link that resolves outside the CV root", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ats-cvs-"));
  const outside = await mkdtemp(path.join(os.tmpdir(), "ats-outside-"));
  t.after(async () => {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  });

  await writeFile(path.join(outside, "private.pdf"), "%PDF-private");
  try {
    await symlink(
      outside,
      path.join(root, "escape"),
      process.platform === "win32" ? "junction" : "dir",
    );
  } catch (error) {
    if (["EPERM", "EACCES", "ENOTSUP"].includes(error.code)) {
      t.skip("Directory links are not permitted in this environment");
      return;
    }
    throw error;
  }

  await assert.rejects(
    openCvFile({
      rootDir: root,
      pathPrefix,
      storedPath: `${pathPrefix}escape/private.pdf`,
    }),
    { statusCode: 404 },
  );
});
