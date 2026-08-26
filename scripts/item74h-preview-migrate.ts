import { spawnSync } from "node:child_process";

const TARGET_BRANCH = "agent/item74h-pathway-check";
const TARGET_NEON_ENDPOINT_PREFIX = "ep-misty-dream-a7l6wcp8";
const ITEM74H_SQL_FILES = [
  "prisma/migrations/20260824101000_item74h_pathway_persistence/migration.sql",
  "prisma/migrations/20260826113000_item74h_proposal_attestation/migration.sql",
] as const;
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

for (const variable of [
  "PLANNING_PACK_CHECKOUT_ENABLED",
  "SUBMISSION_SEE_CHECKOUT_ENABLED",
] as const) {
  const value = process.env[variable]?.trim().toLowerCase() ?? "";
  if (ENABLED_VALUES.has(value)) {
    throw new Error(
      `[item74h:migrate] refused: ${variable} must remain disabled`,
    );
  }
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
  throw new Error(
    "[item74h:migrate] refused: DATABASE_URL is not the approved Item 74H Neon endpoint",
  );
}

console.log(
  "[item74h:migrate] protected Preview target confirmed; applying approved replay-safe SQL",
);

const command = process.platform === "win32" ? "npx.cmd" : "npx";
for (const sqlFile of ITEM74H_SQL_FILES) {
  const migration = spawnSync(
    command,
    [
      "--no-install",
      "prisma",
      "db",
      "execute",
      "--file",
      sqlFile,
      "--schema",
      "prisma/schema.prisma",
    ],
    {
      env: process.env,
      stdio: "inherit",
    },
  );

  if (migration.error) {
    throw migration.error;
  }

  if (migration.status !== 0) {
    throw new Error(
      `[item74h:migrate] approved SQL failed for ${sqlFile} with exit code ${migration.status ?? "unknown"}`,
    );
  }

  console.log(`[item74h:migrate] applied ${sqlFile}`);
}

console.log("[item74h:migrate] approved Item 74H SQL executed successfully");
