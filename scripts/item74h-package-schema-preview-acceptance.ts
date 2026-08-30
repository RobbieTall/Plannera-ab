import { prisma } from "../src/lib/prisma";

const TARGET_BRANCHES = new Set([
  "agent/item74h-pathway-check",
  "integration/item74h-resolution-20260830",
  "integration/item74h-public-da-20260830",
  "agent/item74h-evidence-refinement-20260830",
]);
const TARGET_NEON_ENDPOINT_PREFIXES = new Set([
  "ep-misty-dream-a7l6wcp8",
  "ep-bold-shadow-a7y8j17d",
  "ep-frosty-star-a7gsaexu",
  "ep-damp-recipe-a7wm9fuq",
  "ep-rapid-shape-a72cicyh",
]);
const ENABLED_VALUES = new Set(["1", "true", "yes", "on"]);

const EXPECTED_CONSTRAINTS = new Map<string, readonly string[]>([
  [
    "PathwayPrivateEvidencePackageAssembly_environment_check",
    ['"environment"', "'preview'"],
  ],
  [
    "PathwayPrivateEvidencePackageAssembly_version_check",
    ['"assemblyversion"', "'item74h-private-evidence-package-assembly.v1'"],
  ],
  [
    "PathwayPrivateEvidencePackageAssembly_status_check",
    ['"status"', "'ready_for_real_site_assessment'"],
  ],
  [
    "PathwayPrivateEvidencePackageAssembly_document_count_check",
    ['"documentcount"', "3"],
  ],
  [
    "PathwayPrivateEvidencePackageAssembly_package_ref_check",
    ['"packageref"', "^[a-za-z0-9_-]{8,160}$"],
  ],
  [
    "PathwayPrivateEvidencePackageAssembly_idempotency_check",
    ['"idempotencykey"', "^[a-za-z0-9:_-]{8,200}$"],
  ],
  [
    "PathwayPrivateEvidencePackageAssembly_hashes_check",
    [
      '"reviewsetdigest"',
      '"siteevidencedigest"',
      '"requesthash"',
      '"recordhash"',
      "^[a-f0-9]{64}$",
    ],
  ],
  [
    "PathwayPrivateEvidencePackageItem_role_check",
    [
      '"role"',
      "'road_classification'",
      "'cadastral_survey'",
      "'proposed_shed_layout'",
    ],
  ],
  [
    "PathwayPrivateEvidencePackageItem_evidence_ref_check",
    ['"evidenceref"', "^[a-za-z0-9_-]{8,160}$"],
  ],
  [
    "PathwayPrivateEvidencePackageItem_promotion_ref_check",
    ['"promotionid"', "^[a-za-z0-9_-]{8,160}$"],
  ],
  [
    "PathwayPrivateEvidencePackageItem_hashes_check",
    ['"contenthash"', '"reviewrecordhash"', "^[a-f0-9]{64}$"],
  ],
]);

type ColumnRow = {
  dataType: string;
  precision: number | null;
};

type ConstraintRow = {
  constraintName: string;
  definition: string;
};

type ResidueRow = {
  assemblyCount: number;
  itemCount: number;
};

let currentStage = "startup";

function skip(reason: string): never {
  console.log("[item74h:package-schema] skipped: " + reason);
  process.exit(0);
}

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new Error("[item74h:package-schema] " + message);
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
      "[item74h:package-schema] refused: " +
        variable +
        " must remain disabled",
    );
  }
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("[item74h:package-schema] refused: DATABASE_URL unavailable");
}

let databaseHost: string;
try {
  databaseHost = new URL(databaseUrl).hostname.toLowerCase();
} catch {
  throw new Error("[item74h:package-schema] refused: invalid DATABASE_URL");
}

if (
  ![...TARGET_NEON_ENDPOINT_PREFIXES].some((endpoint) =>
    databaseHost.startsWith(endpoint),
  ) ||
  !databaseHost.endsWith(".neon.tech")
) {
  throw new Error(
    "[item74h:package-schema] refused: unapproved Preview database endpoint",
  );
}

const main = async () => {
  currentStage = "timestamp_contract";
  const columns = await prisma.$queryRaw<ColumnRow[]>`
    SELECT
      data_type AS "dataType",
      datetime_precision AS "precision"
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'PathwayPrivateEvidencePackageAssembly'
      AND column_name = 'createdAt'
  `;

  assertCondition(
    columns.length === 1 &&
      columns[0]?.dataType === "timestamp without time zone" &&
      columns[0]?.precision === 3,
    "createdAt is not TIMESTAMP(3) without time zone",
  );

  currentStage = "constraint_inventory";
  const constraints = await prisma.$queryRaw<ConstraintRow[]>`
    SELECT
      conname AS "constraintName",
      pg_get_constraintdef(oid) AS "definition"
    FROM pg_constraint
    WHERE conrelid IN (
      'public."PathwayPrivateEvidencePackageAssembly"'::regclass,
      'public."PathwayPrivateEvidencePackageItem"'::regclass
    )
  `;

  const actual = new Map(
    constraints.map((row) => [
      row.constraintName,
      row.definition.toLowerCase().replaceAll('"', ""),
    ]),
  );

  for (const [constraintName, requiredTerms] of EXPECTED_CONSTRAINTS) {
    currentStage = "constraint_contract_" + constraintName;
    const definition = actual.get(constraintName);
    assertCondition(definition, "missing constraint " + constraintName);
    for (const requiredTerm of requiredTerms) {
      assertCondition(
        definition.includes(
          requiredTerm.toLowerCase().replaceAll('"', ""),
        ),
        "constraint contract mismatch for " + constraintName,
      );
    }
  }

  currentStage = "residue_contract";
  const residue = await prisma.$queryRaw<ResidueRow[]>`
    SELECT
      (SELECT COUNT(*)::integer
       FROM "PathwayPrivateEvidencePackageAssembly") AS "assemblyCount",
      (SELECT COUNT(*)::integer
       FROM "PathwayPrivateEvidencePackageItem") AS "itemCount"
  `;

  assertCondition(
    residue.length === 1 &&
      residue[0]?.assemblyCount === 0 &&
      residue[0]?.itemCount === 0,
    "package acceptance residue is not zero",
  );

  console.log(
    "[item74h:package-schema] passed: timestamp=TIMESTAMP(3), constraints=" +
      EXPECTED_CONSTRAINTS.size +
      ", assemblyResidue=0, itemResidue=0, checkout=false",
  );
};

main()
  .catch((error) => {
    console.error(
      "[item74h:package-schema] failed stage=" +
        currentStage +
        " type=" +
        (error instanceof Error ? error.name : "unknown_error"),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });
