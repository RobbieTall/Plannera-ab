import { spawnSync } from "node:child_process";

const TARGET_BRANCH = "agent/item74h-pathway-check";
const TARGET_NEON_ENDPOINT_PREFIX = "ep-misty-dream-a7l6wcp8";
const ENABLED_VALUES = new Set(["1", "true", "yes", "on"]);

function skip(reason: string): never {
  console.log(`[item74h:migrate] skipped: ${reason}`);
  process.exit(0);
}

if (process.env.VERCEL !== "1") {
  skip("not running in Vercel");
}

if (process.env.VERCEL_ENV !== "preview") {
  skip("not a Vercel Preview deployment");
}

if (process.env.VERCEL_GIT_COMMIT_REF !== TARGET_BRANCH) {
  skip("not the protected Item 74H branch");
}

const checkoutValue = process.env.PLANNING_PACK_CHECKOUT_ENABLED?.trim().toLowerCase() ?? "";
if (ENABLED_VALUES.has(checkoutValue)) {
  throw new Error("[item74h:migrate] refused: Production checkout must remain disabled");
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("[item74h:migrate] refused: DATABASE_URL is unavailable");
}

let databaseHost: string;
try {
  databaseHost = new URL(databaseUrl).hostname.toLowerCase();
} catch {
  throw new Error("[item74h:migrate] refused: DATABASE_URL is not a valid URL");
}

if (
  !databaseHost.startsWith(TARGET_NEON_ENDPOINT_PREFIX) ||
  !databaseHost.endsWith(".neon.tech")
) {
  throw new Error("[item74h:migrate] refused: DATABASE_URL is not the approved Item 74H Neon endpoint");
}

console.log("[item74h:migrate] protected Preview target confirmed; applying pending Prisma migrations");

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const migration = spawnSync(
  command,
  ["--no-install", "prisma", "migrate", "deploy", "--schema", "prisma/schema.prisma"],
  {
    env: process.env,
    stdio: "inherit",
  },
);

if (migration.error) {
  throw migration.error;
}

if (migration.status !== 0) {
  throw new Error(`[item74h:migrate] Prisma migration failed with exit code ${migration.status ?? "unknown"}`);
}

console.log("[item74h:migrate] pending Prisma migrations applied successfully");
