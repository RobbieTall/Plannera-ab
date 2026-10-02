import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verifyRepositoryBuildContract } from "./verify-vercel-build-safety.mjs";

export const OFFLINE_LAUNCH_GATES = Object.freeze([
  { name: "launch", script: "scripts/launch-smoke.ts", blocked: "SOFT LAUNCH: BLOCKED" },
  { name: "whole-lga", script: "scripts/whole-lga-matrix-smoke.ts", blocked: "WHOLE-LGA SOURCE MATRIX: BLOCKED" },
]);
const missingDatabase = "[FAIL] Global / database: DATABASE_URL is not configured.";
const require = createRequire(import.meta.url);

/** No deployment credentials, database aliases, NODE_OPTIONS or dotenv files survive. */
export function offlineLaunchEnvironment(source = {}) {
  return {
    ...(typeof source.PATH === "string" ? { PATH: source.PATH } : {}),
    ...(typeof source.HOME === "string" ? { HOME: source.HOME } : {}),
    CI: "true",
    NEXT_TELEMETRY_DISABLED: "1",
    DOTENV_CONFIG_PATH: "/dev/null",
  };
}

/** A rejected absent database is a guard test, never a readiness pass. */
export function assertOfflineLaunchRejection(gate, result) {
  const lines = String(result.stdout ?? "").split(/\r?\n/).map(line => line.trim());
  if (result.error || result.signal || result.status !== 1 ||
    !lines.includes(missingDatabase) || !lines.includes(gate.blocked) ||
    lines.some(line => /: READY$/.test(line))) {
    // Never echo child output: unexpected diagnostics may contain sensitive data.
    throw new Error("Offline missing-database guard failed: " + gate.name);
  }
}

export function verifyOfflineLaunchGuards({
  rootDirectory = process.cwd(), environment = process.env, runner = spawnSync,
} = {}) {
  verifyRepositoryBuildContract(rootDirectory);
  const cli = require.resolve("tsx/cli");
  const env = offlineLaunchEnvironment(environment);
  for (const gate of OFFLINE_LAUNCH_GATES) {
    const result = runner(process.execPath, [cli, gate.script], {
      cwd: rootDirectory, env, encoding: "utf8", shell: false,
      timeout: 30000, maxBuffer: 1024 * 1024,
    });
    assertOfflineLaunchRejection(gate, result);
  }
  return { checked: OFFLINE_LAUNCH_GATES.length, databaseReadiness: "NOT_ASSESSED" };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = verifyOfflineLaunchGuards();
    console.log("OFFLINE GUARD CHECK: PASS (" + result.checked +
      " missing-database rejections; database readiness NOT ASSESSED)");
  } catch {
    console.error("OFFLINE GUARD CHECK: FAILED; database readiness NOT ASSESSED");
    process.exitCode = 1;
  }
}
