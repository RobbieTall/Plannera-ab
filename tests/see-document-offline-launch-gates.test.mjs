import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  OFFLINE_LAUNCH_GATES, offlineLaunchEnvironment,
  assertOfflineLaunchRejection, verifyOfflineLaunchGuards,
} from "../scripts/verify-offline-launch-gates.mjs";

const rejection = gate => ({
  status: 1, signal: null,
  stdout: "[FAIL] Global / database: DATABASE_URL is not configured.\n" + gate.blocked + "\n",
  stderr: "",
});

test("offline environment drops database aliases, credentials, dotenv overrides and execution hooks", () => {
  const source = {
    PATH: "/synthetic/bin", HOME: "/synthetic/home",
    DATABASE_URL: "must-not-survive", DIRECT_URL: "must-not-survive",
    SMOKE_DATABASE_URL: "must-not-survive", POSTGRES_PRISMA_URL: "must-not-survive",
    POSTGRES_URL: "must-not-survive", POSTGRES_URL_NON_POOLING: "must-not-survive",
    STRIPE_SECRET_KEY: "must-not-survive", VERCEL_TOKEN: "must-not-survive",
    BLOB_READ_WRITE_TOKEN: "must-not-survive", NODE_OPTIONS: "must-not-survive",
    DOTENV_CONFIG_PATH: "must-not-survive", DOTENV_CONFIG_ENCODING: "must-not-survive",
  };
  const clean = offlineLaunchEnvironment(source);
  assert.deepEqual(Object.keys(clean).sort(),
    ["PATH", "HOME", "CI", "NEXT_TELEMETRY_DISABLED", "DOTENV_CONFIG_PATH"].sort());
  assert.equal(clean.DOTENV_CONFIG_PATH, "/dev/null");
  assert.equal(Object.values(clean).includes("must-not-survive"), false);
});
test("both gates must specifically reject an absent database", () => {
  for (const gate of OFFLINE_LAUNCH_GATES) {
    assert.doesNotThrow(() => assertOfflineLaunchRejection(gate, rejection(gate)));
  }
});
test("success, crashes, timeouts and unrelated failures cannot pass as expected rejection", () => {
  for (const gate of OFFLINE_LAUNCH_GATES) {
    for (const patch of [
      { status: 0 }, { status: null }, { status: 2 }, { signal: "SIGTERM" },
      { error: new Error("synthetic timeout") }, { stdout: "unrelated failure" },
      { stdout: gate.blocked }, { stdout: rejection(gate).stdout + "SOFT LAUNCH: READY\n" },
    ]) assert.throws(() => assertOfflineLaunchRejection(gate, { ...rejection(gate), ...patch }),
      /Offline missing-database guard failed/);
  }
});
test("unexpected child diagnostics are not exposed in failure messages", () => {
  const gate = OFFLINE_LAUNCH_GATES[0];
  assert.throws(() => assertOfflineLaunchRejection(gate, {
    status: 1, stdout: "synthetic-sensitive-diagnostic", stderr: "synthetic-sensitive-diagnostic",
  }), error => !error.message.includes("synthetic-sensitive-diagnostic"));
});
test("runner invokes both unchanged scripts without shell or credentials and never claims readiness", () => {
  const calls = [];
  const result = verifyOfflineLaunchGuards({
    environment: { PATH: "/synthetic/bin", DATABASE_URL: "must-not-survive" },
    runner(command, args, options) {
      calls.push(args[1]);
      assert.equal(command, process.execPath);
      assert.equal(options.shell, false);
      assert.equal(options.env.DATABASE_URL, undefined);
      assert.equal(options.env.DOTENV_CONFIG_PATH, "/dev/null");
      assert.equal(options.timeout, 30000);
      const gate = OFFLINE_LAUNCH_GATES.find(item => item.script === args[1]);
      assert.ok(gate);
      return rejection(gate);
    },
  });
  assert.deepEqual(calls, OFFLINE_LAUNCH_GATES.map(gate => gate.script));
  assert.deepEqual(result, { checked: 2, databaseReadiness: "NOT_ASSESSED" });
});
test("offline CI names its limited proof while the actual Vercel build retains both readiness gates", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.match(pkg.scripts["vercel-build"], /npm run smoke:launch && npm run smoke:whole-lga/);
  const workflow = readFileSync(new URL("../.github/workflows/see-document-delivery.yml", import.meta.url), "utf8");
  assert.match(workflow, /verify-offline-launch-gates\.mjs/);
  assert.match(workflow, /see-document-offline-launch-gates\.test\.mjs/);
  assert.match(workflow, /run-next-build-without-credentials\.mjs/);
  assert.doesNotMatch(workflow, /secrets\.|continue-on-error/);
});
