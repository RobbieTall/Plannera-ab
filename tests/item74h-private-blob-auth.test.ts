import assert from "node:assert/strict";
import test from "node:test";

import { resolveItem74hPrivateBlobAuth } from "../src/lib/item74h-private-blob-auth";

test("prefers short-lived OIDC authentication when both modes are present", () => {
  assert.deepEqual(
    resolveItem74hPrivateBlobAuth({
      ITEM74H_PRIVATE_BLOB_READ_WRITE_TOKEN: "legacy-token",
      ITEM74H_PRIVATE_BLOB_STORE_ID: "store_preview",
      VERCEL_OIDC_TOKEN: "oidc-token",
    }),
    {
      oidcToken: "oidc-token",
      storeId: "store_preview",
    },
  );
});

test("retains the legacy read-write token fallback", () => {
  assert.deepEqual(
    resolveItem74hPrivateBlobAuth({
      ITEM74H_PRIVATE_BLOB_READ_WRITE_TOKEN: "legacy-token",
      ITEM74H_PRIVATE_BLOB_STORE_ID: "store_preview",
    }),
    {
      storeId: "store_preview",
      token: "legacy-token",
    },
  );
});

test("trims protected values before constructing Blob options", () => {
  assert.deepEqual(
    resolveItem74hPrivateBlobAuth({
      ITEM74H_PRIVATE_BLOB_STORE_ID: "  store_preview  ",
      VERCEL_OIDC_TOKEN: "  oidc-token  ",
    }),
    {
      oidcToken: "oidc-token",
      storeId: "store_preview",
    },
  );
});

test("fails closed without a store or supported credential", () => {
  assert.throws(
    () =>
      resolveItem74hPrivateBlobAuth({
        VERCEL_OIDC_TOKEN: "oidc-token",
      }),
    /Dedicated Preview private Blob configuration is unavailable/,
  );
  assert.throws(
    () =>
      resolveItem74hPrivateBlobAuth({
        ITEM74H_PRIVATE_BLOB_STORE_ID: "store_preview",
      }),
    /Dedicated Preview private Blob configuration is unavailable/,
  );
});
