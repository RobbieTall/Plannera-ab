import assert from "node:assert/strict";
import { test } from "node:test";

import { inspectPreviewDatabaseTarget } from "../src/lib/preview-database-target";

const byron = {
  VERCEL: "1",
  VERCEL_ENV: "preview",
  VERCEL_GIT_COMMIT_REF: "see-doc-byron-20260930",
};

const kempsey = {
  VERCEL: "1",
  VERCEL_ENV: "preview",
  VERCEL_GIT_COMMIT_REF: "see-doc-kempsey-20260930",
};

test("fails closed outside the two named Preview branches", () => {
  const url = "postgresql://user:synthetic-password@ep-sweet-glade-a74ukspj.aws.neon.tech/neondb";
  assert.equal(inspectPreviewDatabaseTarget({ ...byron, VERCEL_ENV: "production", DATABASE_URL: url }), null);
  assert.equal(inspectPreviewDatabaseTarget({ ...byron, VERCEL: undefined, DATABASE_URL: url }), null);
  assert.equal(inspectPreviewDatabaseTarget({ ...byron, VERCEL_GIT_COMMIT_REF: "main", DATABASE_URL: url }), null);
  assert.equal(inspectPreviewDatabaseTarget({ ...byron, VERCEL_GIT_COMMIT_REF: undefined, DATABASE_URL: url }), null);
});

test("reports only status for each isolated Preview database", () => {
  assert.equal(
    inspectPreviewDatabaseTarget({
      ...byron,
      DATABASE_URL: "postgresql://user:synthetic-password@ep-sweet-glade-a74ukspj-pooler.aws.neon.tech/neondb",
    }),
    "match",
  );
  assert.equal(
    inspectPreviewDatabaseTarget({
      ...kempsey,
      DATABASE_URL: "postgresql://user:synthetic-password@ep-delicate-sound-a7l88m83.aws.neon.tech/neondb",
    }),
    "match",
  );
  assert.equal(inspectPreviewDatabaseTarget({ ...byron }), "unavailable");
});

test("rejects wrong endpoint, council crossover, and host spoofing", () => {
  assert.equal(
    inspectPreviewDatabaseTarget({
      ...byron,
      DATABASE_URL: "postgresql://user:synthetic-password@ep-delicate-sound-a7l88m83.aws.neon.tech/neondb",
    }),
    "mismatch",
  );
  assert.equal(
    inspectPreviewDatabaseTarget({
      ...kempsey,
      DATABASE_URL: "postgresql://user:synthetic-password@ep-sweet-glade-a74ukspj.aws.neon.tech/neondb",
    }),
    "mismatch",
  );
  assert.equal(
    inspectPreviewDatabaseTarget({
      ...byron,
      DATABASE_URL: "postgresql://user:synthetic-password@ep-sweet-glade-a74ukspj.aws.neon.tech.evil.example/neondb",
    }),
    "mismatch",
  );
});

test("never returns connection-string material", () => {
  const secret = "synthetic-password";
  const result = inspectPreviewDatabaseTarget({
    ...byron,
    DATABASE_URL: "postgresql://user:" + secret + "@ep-sweet-glade-a74ukspj.aws.neon.tech/neondb",
  });
  assert.equal(result, "match");
  assert.equal(JSON.stringify(result).includes(secret), false);
});
