import assert from "node:assert/strict";
import test from "node:test";

import {
  ITEM74H_PRIVATE_BLOB_ACCEPTANCE_STAGES,
  classifyItem74hPrivateBlobError,
  createItem74hPrivateBlobFailureDiagnostic,
} from "../src/lib/item74h-private-blob-acceptance-diagnostics";

test("emits only an allowlisted, privacy-safe Blob failure diagnostic", () => {
  const secret = "vercel_blob_rw_sensitive_example";
  const objectRef = "ev_sensitive_example";
  const directUrl =
    "https://sensitive.private.blob.vercel-storage.com/ev_sensitive_example";
  const error = Object.assign(
    new Error(`${secret} ${objectRef} ${directUrl}`),
    {
      name: "BlobAccessError",
      statusCode: 403,
      token: secret,
      objectRef,
      url: directUrl,
    },
  );

  const diagnostic = createItem74hPrivateBlobFailureDiagnostic(
    "AUTHENTICATED_READ",
    error,
  );
  const encoded = JSON.stringify(diagnostic);

  assert.deepEqual(Object.keys(diagnostic), [
    "gate",
    "status",
    "stage",
    "errorCategory",
    "productionCheckoutEnabled",
    "secretValueIncluded",
    "objectReferenceIncluded",
    "directUrlIncluded",
    "errorDetailIncluded",
  ]);
  assert.equal(diagnostic.errorCategory, "BLOB_ACCESS_DENIED");
  assert.equal(diagnostic.productionCheckoutEnabled, false);
  assert.equal(diagnostic.secretValueIncluded, false);
  assert.equal(diagnostic.objectReferenceIncluded, false);
  assert.equal(diagnostic.directUrlIncluded, false);
  assert.equal(diagnostic.errorDetailIncluded, false);
  assert.equal(encoded.includes(secret), false);
  assert.equal(encoded.includes(objectRef), false);
  assert.equal(encoded.includes(directUrl), false);
  assert.equal(encoded.includes(error.message), false);
});

test("normalizes error categories without reading raw error details", () => {
  const cases = [
    [{ name: "BlobStoreNotFoundError", statusCode: 404 }, "BLOB_STORE_NOT_FOUND"],
    [{ name: "BlobNotFoundError", statusCode: 404 }, "BLOB_NOT_FOUND"],
    [{ name: "BlobServiceRateLimited", statusCode: 429 }, "BLOB_RATE_LIMITED"],
    [{ name: "FetchError", code: "ECONNRESET" }, "NETWORK_ERROR"],
    [{ name: "UnexpectedFailure", message: "secret" }, "UNKNOWN"],
  ] as const;

  for (const [error, expected] of cases) {
    assert.equal(classifyItem74hPrivateBlobError(error), expected);
  }
});

test("classifies SDK errors by constructor without emitting their messages", () => {
  class BlobAccessError extends Error {}
  class BlobStoreSuspendedError extends Error {}
  class BlobServiceNotAvailable extends Error {}
  class BlobUnknownError extends Error {}
  class BlobError extends Error {}

  const cases = [
    [new BlobAccessError("sensitive"), "BLOB_ACCESS_DENIED"],
    [new BlobStoreSuspendedError("sensitive"), "BLOB_STORE_SUSPENDED"],
    [new BlobServiceNotAvailable("sensitive"), "BLOB_SERVICE_UNAVAILABLE"],
    [new BlobUnknownError("sensitive"), "BLOB_PROVIDER_UNKNOWN"],
    [new BlobError("sensitive"), "BLOB_REQUEST_REJECTED"],
  ] as const;

  for (const [error, expected] of cases) {
    const diagnostic = createItem74hPrivateBlobFailureDiagnostic(
      "BLOB_CLEANUP",
      error,
    );
    assert.equal(diagnostic.errorCategory, expected);
    assert.equal(JSON.stringify(diagnostic).includes(error.message), false);
  }
});

test("fails closed to a fixed stage when supplied an unexpected value", () => {
  const diagnostic = createItem74hPrivateBlobFailureDiagnostic(
    "ev_user_controlled_stage",
    { name: "UnexpectedFailure" },
  );

  assert.equal(diagnostic.stage, "UNKNOWN_STAGE");
  assert.equal(
    ITEM74H_PRIVATE_BLOB_ACCEPTANCE_STAGES.includes(
      diagnostic.stage as (typeof ITEM74H_PRIVATE_BLOB_ACCEPTANCE_STAGES)[number],
    ),
    false,
  );
});
