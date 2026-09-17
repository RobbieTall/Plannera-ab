import assert from "node:assert/strict";
import test from "node:test";

import { deletePrivateBlobWithReconciliation } from "../src/lib/item74h-private-blob-delete-reconciliation";

test("deletes by the provider-returned private URL first", async () => {
  const attempts: string[] = [];
  const counts = [1, 0];

  await deletePrivateBlobWithReconciliation(
    {
      primaryTarget: "private-url",
      fallbackTarget: "opaque-pathname",
      verificationDelaysMs: [0, 0],
      fallbackAfterVerificationCount: 1,
    },
    {
      deleteTarget: async (target) => {
        attempts.push(target);
      },
      countExactObjects: async () => counts.shift() ?? 0,
      wait: async () => {},
    },
  );

  assert.deepEqual(attempts, ["private-url", "opaque-pathname"]);
});

test("uses the exact pathname when URL deletion fails and residue remains", async () => {
  const attempts: string[] = [];
  const counts = [1, 0];

  await deletePrivateBlobWithReconciliation(
    {
      primaryTarget: "private-url",
      fallbackTarget: "opaque-pathname",
      verificationDelaysMs: [0, 0],
      fallbackAfterVerificationCount: 1,
    },
    {
      deleteTarget: async (target) => {
        attempts.push(target);
        if (target === "private-url") throw new Error("provider failure");
      },
      countExactObjects: async () => counts.shift() ?? 0,
      wait: async () => {},
    },
  );

  assert.deepEqual(attempts, ["private-url", "opaque-pathname"]);
});

test("accepts a provider error only when the exact object is proven absent", async () => {
  const attempts: string[] = [];

  await deletePrivateBlobWithReconciliation(
    {
      primaryTarget: "private-url",
      fallbackTarget: "opaque-pathname",
      verificationDelaysMs: [0, 0],
      fallbackAfterVerificationCount: 1,
    },
    {
      deleteTarget: async (target) => {
        attempts.push(target);
        throw new Error("ambiguous provider response");
      },
      countExactObjects: async () => 0,
      wait: async () => {},
    },
  );

  assert.deepEqual(attempts, ["private-url"]);
});

test("fails closed when both delete forms fail and residue remains", async () => {
  const attempts: string[] = [];

  await assert.rejects(
    deletePrivateBlobWithReconciliation(
      {
        primaryTarget: "private-url",
        fallbackTarget: "opaque-pathname",
        verificationDelaysMs: [0, 0],
        fallbackAfterVerificationCount: 1,
      },
      {
        deleteTarget: async (target) => {
          attempts.push(target);
          throw new Error(`delete failed for ${target}`);
        },
        countExactObjects: async () => 1,
        wait: async () => {},
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
      {
        primaryTarget: "opaque-pathname",
        fallbackTarget: "opaque-pathname",
        verificationDelaysMs: [0, 0],
        fallbackAfterVerificationCount: 1,
      },
      {
        deleteTarget: async () => {
          attempts += 1;
          throw new Error("delete failed");
        },
        countExactObjects: async () => 1,
        wait: async () => {},
      },
    ),
    /delete failed/,
  );

  assert.equal(attempts, 1);
});

test("waits for exact absence after a provider reports successful deletion", async () => {
  const observedDelays: number[] = [];
  const counts = [1, 1, 0];

  await deletePrivateBlobWithReconciliation(
    {
      primaryTarget: "private-url",
      fallbackTarget: "opaque-pathname",
      verificationDelaysMs: [0, 25, 50],
      fallbackAfterVerificationCount: 2,
    },
    {
      deleteTarget: async () => {},
      countExactObjects: async () => counts.shift() ?? 0,
      wait: async (delayMs) => {
        observedDelays.push(delayMs);
      },
    },
  );

  assert.deepEqual(observedDelays, [25, 50]);
});

test("fails closed when exact residue survives the bounded verification window", async () => {
  await assert.rejects(
    deletePrivateBlobWithReconciliation(
      {
        primaryTarget: "private-url",
        fallbackTarget: "opaque-pathname",
        verificationDelaysMs: [0, 10, 20],
        fallbackAfterVerificationCount: 1,
      },
      {
        deleteTarget: async () => {},
        countExactObjects: async () => 1,
        wait: async () => {},
      },
    ),
    /residual object/,
  );
});
