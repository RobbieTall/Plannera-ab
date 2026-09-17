import assert from "node:assert/strict";
import test from "node:test";

import { deletePrivateBlobWithReconciliation } from "../src/lib/item74h-private-blob-delete-reconciliation";

test("deletes by the provider-returned private URL first", async () => {
  const attempts: string[] = [];

  await deletePrivateBlobWithReconciliation(
    { primaryTarget: "private-url", fallbackTarget: "opaque-pathname" },
    {
      deleteTarget: async (target) => {
        attempts.push(target);
      },
      countExactObjects: async () => 1,
    },
  );

  assert.deepEqual(attempts, ["private-url"]);
});

test("uses the exact pathname when URL deletion fails and residue remains", async () => {
  const attempts: string[] = [];

  await deletePrivateBlobWithReconciliation(
    { primaryTarget: "private-url", fallbackTarget: "opaque-pathname" },
    {
      deleteTarget: async (target) => {
        attempts.push(target);
        if (target === "private-url") throw new Error("provider failure");
      },
      countExactObjects: async () => 1,
    },
  );

  assert.deepEqual(attempts, ["private-url", "opaque-pathname"]);
});

test("accepts a provider error only when the exact object is proven absent", async () => {
  const attempts: string[] = [];

  await deletePrivateBlobWithReconciliation(
    { primaryTarget: "private-url", fallbackTarget: "opaque-pathname" },
    {
      deleteTarget: async (target) => {
        attempts.push(target);
        throw new Error("ambiguous provider response");
      },
      countExactObjects: async () => 0,
    },
  );

  assert.deepEqual(attempts, ["private-url"]);
});

test("fails closed when both delete forms fail and residue remains", async () => {
  const attempts: string[] = [];

  await assert.rejects(
    deletePrivateBlobWithReconciliation(
      { primaryTarget: "private-url", fallbackTarget: "opaque-pathname" },
      {
        deleteTarget: async (target) => {
          attempts.push(target);
          throw new Error(`delete failed for ${target}`);
        },
        countExactObjects: async () => 1,
      },
    ),
    /opaque-pathname/,
  );

  assert.deepEqual(attempts, ["private-url", "opaque-pathname"]);
});

test("does not duplicate an identical primary and fallback target", async () => {
  let attempts = 0;

  await assert.rejects(
    deletePrivateBlobWithReconciliation(
      { primaryTarget: "opaque-pathname", fallbackTarget: "opaque-pathname" },
      {
        deleteTarget: async () => {
          attempts += 1;
          throw new Error("delete failed");
        },
        countExactObjects: async () => 1,
      },
    ),
    /delete failed/,
  );

  assert.equal(attempts, 1);
});
