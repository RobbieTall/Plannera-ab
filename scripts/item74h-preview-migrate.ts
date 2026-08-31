import { spawnSync } from "node:child_process";

const TARGET_BRANCHES = new Set([
  "agent/item74h-pathway-check",
  "integration/item74h-resolution-20260830",
  "integration/item74h-public-da-20260830",
  "agent/item74h-evidence-refinement-20260830",
  "agent/item74h-layout-evidence-20260831",
  "agent/item74h-setback-evidence-20260831",
  "agent/item74h-registered-plan-proof-20260901",
]);
const TARGET_NEON_ENDPOINT_PREFIXES = new Set([
  "ep-misty-dream-a7l6wcp8",
  "ep-bold-shadow-a7y8j17d",
  "ep-frosty-star-a7gsaexu",
  "ep-damp-recipe-a7wm9fuq",
  "ep-rapid-shape-a72cicyh",
  "ep-late-sun-a7r48wn4",
  "ep-old-flower-a7swrkp3",
  "ep-silent-haze-a7mfgowo",
]);
const ITEM74H_SQL_FILES = [
  "prisma/migrations/20260824101000_item74h_pathway_persistence/migration.sql",
  "prisma/migrations/20260826113000_item74h_proposal_attestation/migration.sql",
  "prisma/migrations/20260826121000_item74h_attestation_assessment_binding/migration.sql",
  "prisma/migrations/20260828100000_item74h_private_evidence_operator_review/migration.sql",
  "prisma/migrations/20260828140000_item74h_private_evidence_package_assembly/migration.sql",
  "prisma/migrations/20260829113000_item74h_package_assembly_hardening/migration.sql",
  "prisma/migrations/20260901170000_item74h_registered_plan_reconciliation/migration.sql",
] as const;
const ITEM74H_ACCEPTANCE_FILES = [
  "scripts/item74h-proposal-attestation-preview.ts",
  "scripts/item74h-proposal-assessment-binding-preview.ts",
  "scripts/item74h-operator-review-preview-acceptance.ts",
  "scripts/item74h-evidence-package-preview-acceptance.ts",
  "scripts/item74h-package-schema-preview-acceptance.ts",
] as const;
const ENABLED_VALUES = new Set(["1", "true", "yes", "on"]);

function skip(reason: string): never {
  console.log("[item74h:migrate] skipped: " + reason);
  process.exit(0);
}

if (process.env.VERCEL !== "1") {
  skip("not running in Vercel");
}

if (process.env.VERCEL_ENV !== "preview") {
  skip("not a Vercel Preview deployment");
}

if (!TARGET_BRANCHES.has(process.env.VERCEL_GIT_COMMIT_REF ?? "")) {
  skip("not the protected Item 74H branch");
}

for (const variable of [
  "PLANNING_PACK_CHECKOUT_ENABLED",
  "SUBMISSION_SEE_CHECKOUT_ENABLED",
] as const) {
  const value = process.env[variable]?.trim().toLowerCase() ?? "";
  if (ENABLED_VALUES.has(value)) {
    throw new Error(
      "[item74h:migrate] refused: " + variable + " must remain disabled",
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
  ![...TARGET_NEON_ENDPOINT_PREFIXES].some((endpoint) =>
    databaseHost.startsWith(endpoint),
  ) ||
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
      "[item74h:migrate] approved SQL failed for " +
        sqlFile +
        " with exit code " +
        (migration.status ?? "unknown"),
    );
  }

  console.log("[item74h:migrate] applied " + sqlFile);
}

for (const acceptanceFile of ITEM74H_ACCEPTANCE_FILES) {
  console.log(
    "[item74h:migrate] running protected synthetic acceptance " +
      acceptanceFile,
  );
  const acceptance = spawnSync(
    command,
    ["--no-install", "tsx", acceptanceFile],
    {
      env: process.env,
      stdio: "inherit",
    },
  );

  if (acceptance.error) {
    throw acceptance.error;
  }

  if (acceptance.status !== 0) {
    throw new Error(
      "[item74h:migrate] protected acceptance failed for " +
        acceptanceFile +
        " with exit code " +
        (acceptance.status ?? "unknown"),
    );
  }
}

console.log(
  "[item74h:migrate] approved Item 74H SQL and zero-residue acceptances executed successfully",
);
