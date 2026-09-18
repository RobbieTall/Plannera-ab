import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("private Blob cleanup verifies origin state instead of cached state", async () => {
  const source = await readFile(
    new URL(
      "../scripts/item74h-private-blob-preview-acceptance.ts",
      import.meta.url,
    ),
    "utf8",
  );
  const cleanupStart = source.indexOf(
    "deleteObject: async ({ objectRef: ref }) =>",
  );
  const cleanupEnd = source.indexOf("privateUrls.delete(ref)", cleanupStart);

  assert.notEqual(cleanupStart, -1, "cleanup adapter must exist");
  assert.notEqual(cleanupEnd, -1, "cleanup adapter must release its local handle");

  const cleanupAdapter = source.slice(cleanupStart, cleanupEnd);
  assert.match(
    cleanupAdapter,
    /get\(ref,\s*\{[\s\S]*access:\s*"private",[\s\S]*useCache:\s*false,/,
    "zero-residue proof must bypass Vercel Blob cache",
  );
  assert.doesNotMatch(
    cleanupAdapter,
    /countExactObjects:[\s\S]*findExact\(ref\)/,
    "zero-residue proof must not depend on the eventually consistent list index",
  );
});
