import assert from "node:assert/strict";
import test from "node:test";

import { inspectDevDatabaseIsolation } from "../src/lib/dev-db-isolation";

const endpoint = "ep-fancy-sunset-a7zoh8wm.ap-southeast-2.aws.neon.tech";
const project = "crimson-mud-29775341";

test("isolated endpoint and project with successful read-only probe", async () => {
  const result = await inspectDevDatabaseIsolation(
    { DATABASE_URL: `postgres://${endpoint}/neondb`, NEON_PROJECT_ID: project },
    async () => "neondb",
  );
  assert.deepEqual(result, {
    urlConfigured: true,
    projectIdConfigured: true,
    endpointMatches: true,
    projectMatches: true,
    connectionAttempted: true,
    connectionSucceeded: true,
  });
});

test("wrong endpoint never runs a database probe", async () => {
  let called = false;
  const result = await inspectDevDatabaseIsolation(
    { DATABASE_URL: "postgres://unrelated.example/neondb", NEON_PROJECT_ID: project },
    async () => { called = true; return "neondb"; },
  );
  assert.equal(result.endpointMatches, false);
  assert.equal(result.projectMatches, true);
  assert.equal(result.connectionAttempted, false);
  assert.equal(called, false);
});

test("wrong project label is reported separately from a safe connection", async () => {
  const result = await inspectDevDatabaseIsolation(
    { DATABASE_URL: `postgres://${endpoint}/neondb`, NEON_PROJECT_ID: "other-project" },
    async () => "neondb",
  );
  assert.equal(result.endpointMatches, true);
  assert.equal(result.projectMatches, false);
  assert.equal(result.connectionAttempted, true);
  assert.equal(result.connectionSucceeded, true);
});

test("missing URL and project label fail closed", async () => {
  const result = await inspectDevDatabaseIsolation({}, async () => { throw new Error("must not run"); });
  assert.deepEqual(result, {
    urlConfigured: false,
    projectIdConfigured: false,
    endpointMatches: false,
    projectMatches: false,
    connectionAttempted: false,
    connectionSucceeded: false,
  });
});

test("invalid URL fails closed without querying", async () => {
  const result = await inspectDevDatabaseIsolation(
    { DATABASE_URL: "not-a-url", NEON_PROJECT_ID: project },
    async () => { throw new Error("must not run"); },
  );
  assert.equal(result.endpointMatches, false);
  assert.equal(result.connectionAttempted, false);
});

test("connection errors do not leak error details", async () => {
  const result = await inspectDevDatabaseIsolation(
    { DATABASE_URL: `postgres://${endpoint}/neondb`, NEON_PROJECT_ID: project },
    async () => { throw new Error("private detail"); },
  );
  assert.equal(result.connectionAttempted, true);
  assert.equal(result.connectionSucceeded, false);
  assert.equal(JSON.stringify(result).includes("private detail"), false);
});

test("unexpected database name is not accepted", async () => {
  const result = await inspectDevDatabaseIsolation(
    { DATABASE_URL: `postgres://${endpoint}/neondb`, NEON_PROJECT_ID: project },
    async () => "other_database",
  );
  assert.equal(result.connectionSucceeded, false);
});
