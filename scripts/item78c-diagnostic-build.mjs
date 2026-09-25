import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BRANCH_TARGET_INDEX = new Map([
  ["accept/item-78c-byron-repaired-20260919", 0],
  ["accept/item-78c-byron-kempsey-20260914", 1],
]);
const START = Date.parse("2026-09-25T00:00:00.000Z");
const END = Date.parse("2026-09-28T00:00:00.000Z");
const SAFE_KEYS = new Set([
  "CI", "HOME", "LANG", "LC_ALL", "PATH", "TEMP", "TMP", "TMPDIR", "TZ",
  "NODE_ENV", "NEXTAUTH_URL", "NEXT_TELEMETRY_DISABLED",
  "VERCEL", "VERCEL_ENV", "VERCEL_BRANCH_URL", "VERCEL_URL",
  "VERCEL_GIT_COMMIT_REF", "VERCEL_GIT_COMMIT_SHA",
]);

export function authorizeDiagnosticBuild(env, now = Date.now()) {
  const targetIndex = BRANCH_TARGET_INDEX.get(env.VERCEL_GIT_COMMIT_REF);
  if (env.VERCEL_ENV !== "preview" || targetIndex === undefined ||
      !Number.isFinite(now) || now < START || now >= END) return false;
  if (!/^[a-f0-9]{40}$/.test(env.VERCEL_GIT_COMMIT_SHA ?? "")) return false;
  if (env.ITEM74H_CONTROLLED_ADDRESS_ACCEPTANCE === "true") return false;
  const targets = (env.ITEM78C_DIAGNOSTIC_DATABASE_TARGETS ?? "").split(",");
  if (targets.length !== 2 || new Set(targets).size !== 2 ||
      targets.some(value => !/^ep-[a-z0-9]+(?:-[a-z0-9]+)+$/.test(value) ||
        value.endsWith("-pooler"))) return false;
  try {
    const value = env.DATABASE_URL;
    if (!value || value !== value.trim()) return false;
    const url = new URL(value);
    if (!["postgres:", "postgresql:"].includes(url.protocol) || url.hash ||
        !/^ep-[a-z0-9-]+\.(?:[a-z0-9-]+\.)+neon\.tech$/.test(url.hostname)) return false;
    const endpoint = url.hostname.split(".")[0].replace(/-pooler$/, "");
    // Ordered non-secret configuration: Byron first, Kempsey second.
    // A permitted endpoint for the other council must still fail closed.
    return endpoint === targets[targetIndex];
  } catch {
    return false;
  }
}

export function diagnosticBuildEnvironment(source) {
  const output = {};
  for (const [key, value] of Object.entries(source)) {
    if (SAFE_KEYS.has(key) || key.startsWith("NEXT_PUBLIC_")) output[key] = value;
  }
  output.DATABASE_URL = source.DATABASE_URL;
  output.NEXT_TELEMETRY_DISABLED = "1";
  return output;
}

export function runDiagnosticBuild(env, spawn = spawnSync, now = Date.now()) {
  if (!authorizeDiagnosticBuild(env, now)) return { status: 1, decision: "TARGET_REFUSED" };
  try {
    const child = spawn("npm", ["run", "vercel-build"], {
      env: diagnosticBuildEnvironment(env),
      shell: false,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
      timeout: 15 * 60 * 1000,
    });
    // Captured child output is never printed or written to an artifact.
    return child.status === 0 && !child.error
      ? { status: 0, decision: "BUILD_PASSED" }
      : { status: 1, decision: "BUILD_FAILED" };
  } catch {
    return { status: 1, decision: "BUILD_FAILED" };
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = runDiagnosticBuild(process.env);
  console.log("[item78c-diagnostic-build] " + result.decision);
  process.exitCode = result.status;
}
