import assert from "node:assert/strict";
import test from "node:test";

import { countExactPrivateBlobObjectsByMetadata } from "../src/lib/item74h-private-blob-metadata";

test("reports one exact object when metadata exists", async () => {
  const count = await countExactPrivateBlobObjectsByMetadata("opaque-ref", {
    headObject: async (objectRef) => {
      assert.equal(objectRef, "opaque-ref");
      return { pathname: objectRef };
    },
    isNotFoundError: () => false,
  });

  assert.equal(count, 1);
});

test("reports zero only for the provider not-found error", async () => {
  const notFound = new Error("provider not found");

  const count = await countExactPrivateBlobObjectsByMetadata("opaque-ref", {
    headObject: async () => {
      throw notFound;
    },
    isNotFoundError: (error) => error === notFound,
  });

  assert.equal(count, 0);
});

test("fails closed when metadata access is denied", async () => {
  const accessDenied = new Error("provider access denied");

  await assert.rejects(
    countExactPrivateBlobObjectsByMetadata("opaque-ref", {
      headObject: async () => {
        throw accessDenied;
      },
      isNotFoundError: () => false,
    }),
    (error: unknown) => error === accessDenied,
  );
});
