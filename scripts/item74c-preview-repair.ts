import {
  LgaCoverageMaturity,
  Prisma,
  WorkspaceSourceType,
} from "@prisma/client";

import {
  BYRON_DCP_2014_SOURCES,
  BYRON_DCP_SOURCE_URL,
  ingestByronDcp,
} from "../src/lib/dcp/byron-ingestion";
import {
  KEMPSEY_DCP_2026_PAGE_URL,
  ingestKempseyDcp,
} from "../src/lib/dcp/kempsey-ingestion";
import { prisma } from "../src/lib/prisma";

const APPROVED_BRANCH = "agent/item74c-whole-lga-matrix";
const KEMPSEY_LEP_SOURCE_URL =
  "https://legislation.nsw.gov.au/view/whole/html/inforce/current/epi-2013-0712";

const EXPECTED_ZONES = {
  BYRON: [
    "C1",
    "C2",
    "C3",
    "C4",
    "E1",
    "E3",
    "E4",
    "MU1",
    "R1",
    "R2",
    "R3",
    "R5",
    "RE1",
    "RE2",
    "RU1",
    "RU2",
    "RU5",
    "SP1",
    "SP2",
    "SP3",
    "W1",
    "W2",
  ],
  KEMPSEY: [
    "C1",
    "C2",
    "C3",
    "C4",
    "E1",
    "E2",
    "E3",
    "E4",
    "MU1",
    "R1",
    "R3",
    "R5",
    "RE1",
    "RE2",
    "RU1",
    "RU2",
    "RU3",
    "RU4",
    "RU5",
    "SP2",
    "SP3",
    "W1",
    "W2",
  ],
} as const;

const LGA_CONFIG = {
  BYRON: {
    lepSlug: "byron-lep-2014",
    dcpSlug: "byron-dcp-2014",
    dcpSourceUrl: BYRON_DCP_SOURCE_URL,
  },
  KEMPSEY: {
    lepSlug: "kempsey-lep-2013",
    dcpSlug: "kempsey-dcp-2026",
    dcpSourceUrl: KEMPSEY_DCP_2026_PAGE_URL,
  },
} as const;

type LgaCode = keyof typeof LGA_CONFIG;
type Transaction = Prisma.TransactionClient;

let currentStage = "startup";
const setStage = (stage: string) => {
  currentStage = stage;
};

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new Error(message);
}

const isEnabled = (value: string | undefined) =>
  ["1", "true", "yes", "on"].includes(value?.trim().toLowerCase() ?? "");

export const assertItem74cPreviewBoundary = () => {
  assertCondition(
    process.env.ITEM74C_PREVIEW_WRITE_APPROVED === "1",
    "Explicit one-time Preview write approval flag is absent",
  );
  assertCondition(
    process.env.VERCEL_ENV === "preview",
    "Item 74C repair may run only in Vercel Preview",
  );
  assertCondition(
    process.env.VERCEL_GIT_COMMIT_REF === APPROVED_BRANCH,
    "Item 74C repair may run only on the approved PR branch",
  );
  assertCondition(
    !isEnabled(process.env.PLANNING_PACK_CHECKOUT_ENABLED),
    "Item 74C repair refuses to run while Production checkout is enabled",
  );
};

const sortedUnique = (values: string[]) =>
  [...new Set(values)].sort((a, b) => a.localeCompare(b));

const assertExactZones = (
  lgaCode: LgaCode,
  evidenceType: string,
  actual: string[],
) => {
  const expected = [...EXPECTED_ZONES[lgaCode]].sort((a, b) =>
    a.localeCompare(b),
  );
  const normalizedActual = sortedUnique(actual);
  assertCondition(
    JSON.stringify(normalizedActual) === JSON.stringify(expected),
    `${lgaCode} ${evidenceType} zones do not match the committed whole-LGA matrix`,
  );
};

const validatePermissionProfiles = (
  lgaCode: LgaCode,
  rows: Array<{ zoneCode: string; permission: string }>,
) => {
  for (const zoneCode of EXPECTED_ZONES[lgaCode]) {
    const actual = sortedUnique(
      rows
        .filter((row) => row.zoneCode === zoneCode)
        .map((row) => row.permission),
    );
    const expected =
      zoneCode === "C1"
        ? ["PROHIBITED", "WITHOUT_CONSENT"]
        : ["PROHIBITED", "WITHOUT_CONSENT", "WITH_CONSENT"];
    assertCondition(
      JSON.stringify(actual) === JSON.stringify(sortedUnique(expected)),
      `${lgaCode} ${zoneCode} permission profile is not acceptance-ready`,
    );
  }
};

const validateLgaEvidence = async (
  tx: Transaction,
  lgaCode: LgaCode,
) => {
  const config = LGA_CONFIG[lgaCode];
  const instrument = await tx.instrument.findUnique({
    where: { slug: config.lepSlug },
    select: {
      sourceUrl: true,
      lastSyncedAt: true,
      clauses: {
        where: { isCurrent: true },
        select: { id: true },
      },
      lepZoneObjectives: {
        select: { zoneCode: true, objective: true },
      },
      lepZoneLandUses: {
        select: { zoneCode: true, permission: true, description: true },
      },
    },
  });
  assertCondition(instrument, `${lgaCode} LEP instrument is missing`);
  assertCondition(
    instrument.sourceUrl.startsWith("https://"),
    `${lgaCode} LEP source is not authoritative HTTPS`,
  );
  assertCondition(
    instrument.lastSyncedAt,
    `${lgaCode} LEP sync timestamp is missing`,
  );
  assertCondition(
    instrument.clauses.length > 0,
    `${lgaCode} has no current LEP clauses`,
  );
  assertCondition(
    instrument.lepZoneObjectives.every((row) => row.objective.trim().length > 0),
    `${lgaCode} contains an empty LEP objective`,
  );
  assertCondition(
    instrument.lepZoneLandUses.every(
      (row) => row.description.trim().length > 0,
    ),
    `${lgaCode} contains an empty projected land-use row`,
  );
  assertExactZones(
    lgaCode,
    "objective",
    instrument.lepZoneObjectives.map((row) => row.zoneCode),
  );
  assertExactZones(
    lgaCode,
    "land-use",
    instrument.lepZoneLandUses.map((row) => row.zoneCode),
  );
  validatePermissionProfiles(lgaCode, instrument.lepZoneLandUses);

  const dcpClauses = await tx.dCPClause.findMany({
    where: { lgaCode },
    select: {
      instrumentSlug: true,
      parentRef: true,
      ref: true,
      bodyText: true,
    },
  });
  assertCondition(dcpClauses.length > 0, `${lgaCode} DCP corpus is empty`);
  assertCondition(
    dcpClauses.every(
      (clause) =>
        clause.instrumentSlug === config.dcpSlug &&
        Boolean(clause.ref?.trim()) &&
        clause.bodyText.trim().length >= (lgaCode === "BYRON" ? 1 : 100),
    ),
    `${lgaCode} DCP corpus contains stale, unreferenced, or insubstantial clauses`,
  );

  if (lgaCode === "BYRON") {
    const sources = sortedUnique(
      dcpClauses
        .map((clause) => clause.parentRef)
        .filter((value): value is string => Boolean(value)),
    );
    const expectedSources = sortedUnique(
      BYRON_DCP_2014_SOURCES.map((source) => source.key),
    );
    assertCondition(
      JSON.stringify(sources) === JSON.stringify(expectedSources),
      "Byron DCP 2014 does not contain the complete pinned official source set",
    );
  }

  if (lgaCode === "KEMPSEY") {
    const parts = sortedUnique(
      dcpClauses
        .map((clause) => clause.parentRef)
        .filter((value): value is string => Boolean(value)),
    );
    assertCondition(
      JSON.stringify(parts) ===
        JSON.stringify(["Part A", "Part B", "Part C", "Part D", "Part E"]),
      "Kempsey DCP 2026 does not contain all five official parts",
    );
  }

  const councilDocument = await tx.councilDocument.findUnique({
    where: { lgaCode },
    select: { id: true, sourceUrl: true },
  });
  assertCondition(
    councilDocument?.sourceUrl === config.dcpSourceUrl,
    `${lgaCode} council DCP document does not have the pinned official source`,
  );

  const sourceChunkCount = await tx.workspaceSourceChunk.count({
    where: {
      lgaCode,
      councilDocumentId: councilDocument.id,
      sourceType: WorkspaceSourceType.council_dcp,
    },
  });
  assertCondition(
    sourceChunkCount > 0,
    `${lgaCode} has no current council-source chunks`,
  );

  return {
    lepClauseCount: instrument.clauses.length,
    objectiveCount: instrument.lepZoneObjectives.length,
    landUseCount: instrument.lepZoneLandUses.length,
    dcpClauseCount: dcpClauses.length,
    sourceChunkCount,
  };
};

const repairAndCertifyPreviewEvidence = async (tx: Transaction) => {
  setStage("kempsey_lep_provenance");
  const kempseyLepUpdate = await tx.instrument.updateMany({
    where: { slug: LGA_CONFIG.KEMPSEY.lepSlug },
    data: { sourceUrl: KEMPSEY_LEP_SOURCE_URL },
  });
  assertCondition(
    kempseyLepUpdate.count === 1,
    "Kempsey LEP provenance repair did not target exactly one instrument",
  );

  setStage("byron_dcp_provenance");
  const byronDocumentUpdate = await tx.councilDocument.updateMany({
    where: { lgaCode: "BYRON" },
    data: { sourceUrl: BYRON_DCP_SOURCE_URL },
  });
  assertCondition(
    byronDocumentUpdate.count === 1,
    "Byron DCP provenance repair did not target exactly one council document",
  );

  const byronDocument = await tx.councilDocument.findUnique({
    where: { lgaCode: "BYRON" },
    select: { id: true },
  });
  assertCondition(byronDocument, "Byron council DCP document is missing");

  const byronClauses = await tx.dCPClause.findMany({
    where: {
      lgaCode: "BYRON",
      instrumentSlug: LGA_CONFIG.BYRON.dcpSlug,
    },
    select: {
      ref: true,
      title: true,
      bodyText: true,
    },
  });
  assertCondition(
    byronClauses.length > 0,
    "Byron current DCP clauses are missing",
  );

  setStage("byron_source_chunks");
  await tx.workspaceSourceChunk.deleteMany({
    where: {
      lgaCode: "BYRON",
      sourceType: {
        in: [WorkspaceSourceType.council_dcp, WorkspaceSourceType.dcp],
      },
    },
  });
  const byronChunks = await tx.workspaceSourceChunk.createMany({
    data: byronClauses.map((clause) => ({
      councilDocumentId: byronDocument.id,
      lgaCode: "BYRON",
      heading: clause.title ?? clause.ref ?? "Byron DCP 2014",
      content: clause.bodyText,
      sourceType: WorkspaceSourceType.council_dcp,
      metadata: {
        source: LGA_CONFIG.BYRON.dcpSlug,
        sourceUrl: BYRON_DCP_SOURCE_URL,
        ref: clause.ref,
      },
    })),
  });
  assertCondition(
    byronChunks.count === byronClauses.length,
    "Byron council-source chunk replacement was incomplete",
  );

  setStage("byron_evidence_validation");
  const byronEvidence = await validateLgaEvidence(tx, "BYRON");
  setStage("kempsey_evidence_validation");
  const kempseyEvidence = await validateLgaEvidence(tx, "KEMPSEY");
  const evidence = {
    BYRON: byronEvidence,
    KEMPSEY: kempseyEvidence,
  };

  setStage("coverage_certification");
  const verifiedAt = new Date();
  for (const lgaCode of ["BYRON", "KEMPSEY"] as const) {
    await tx.lgaCoverageState.upsert({
      where: { lgaCode },
      update: {
        state: LgaCoverageMaturity.VERIFIED,
        lastPreparedAt: verifiedAt,
        errorMessage: null,
      },
      create: {
        lgaCode,
        state: LgaCoverageMaturity.VERIFIED,
        lastPreparedAt: verifiedAt,
      },
    });
  }

  return evidence;
};

export const runItem74cPreviewRepair = async () => {
  setStage("preview_boundary");
  assertItem74cPreviewBoundary();

  setStage("byron_dcp_ingestion");
  const byronIngestion = await ingestByronDcp(prisma);
  assertCondition(
    byronIngestion.sourcesIngested === BYRON_DCP_2014_SOURCES.length,
    "Byron DCP ingestion did not complete the pinned official source set",
  );

  setStage("kempsey_dcp_ingestion");
  const ingestion = await ingestKempseyDcp(prisma);
  assertCondition(
    ingestion.partsIngested === 5,
    "Kempsey DCP ingestion did not complete all five parts",
  );

  setStage("evidence_transaction");
  const evidence = await prisma.$transaction(
    (tx) => repairAndCertifyPreviewEvidence(tx),
    { maxWait: 10_000, timeout: 120_000 },
  );

  setStage("completed");
  return {
    ok: true as const,
    branch: APPROVED_BRANCH,
    ingestion: {
      byron: {
        source: byronIngestion.source,
        sourcesIngested: byronIngestion.sourcesIngested,
        totalChunks: byronIngestion.chunkCount,
      },
      kempsey: {
        source: ingestion.source,
      partsIngested: ingestion.partsIngested,
        totalChunks: ingestion.totalChunks,
      },
    },
    evidence,
  };
};

runItem74cPreviewRepair()
  .then((result) => {
    console.log("[item74c-preview-repair] completed", JSON.stringify(result));
  })
  .catch((error) => {
    console.error(
      `[item74c-preview-repair] failed stage=${currentStage}`,
      `type=${error instanceof Error ? error.name : "unknown_error"}`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
