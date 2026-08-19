import "dotenv/config";

import { WorkspaceSourceType } from "@prisma/client";

import { getLgaMapInfo } from "../src/lib/lga-map-registry";
import { prisma } from "../src/lib/prisma";

type State = "green" | "red";

type Check = {
  lga: string;
  area: string;
  state: State;
  detail: string;
};

type MatrixLga = {
  code: "BYRON" | "KEMPSEY";
  name: string;
  lepSlug: string;
  mapName: string;
  expectedZones: readonly string[];
};

const STANDARD_PERMISSIONS = [
  "PROHIBITED",
  "WITHOUT_CONSENT",
  "WITH_CONSENT",
] as const;
const C1_PERMISSIONS = ["PROHIBITED", "WITHOUT_CONSENT"] as const;

const MATRIX_LGAS: MatrixLga[] = [
  {
    code: "BYRON",
    name: "Byron",
    lepSlug: "byron-lep-2014",
    mapName: "Byron Shire",
    expectedZones: [
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
  },
  {
    code: "KEMPSEY",
    name: "Kempsey",
    lepSlug: "kempsey-lep-2013",
    mapName: "Kempsey",
    expectedZones: [
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
  },
];

const checks: Check[] = [];

const record = (lga: string, area: string, state: State, detail: string) => {
  checks.push({ lga, area, state, detail });
};

const cleanError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(
    /postgres(?:ql)?:\/\/[^\s]+/gi,
    "[database-url-redacted]",
  );
};

const isHttpsUrl = (value: string | null | undefined) => {
  if (!value) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

const getDatabaseUrl = () =>
  process.env.DATABASE_URL ||
  process.env.SMOKE_DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  "";

const expectedPermissionsFor = (zoneCode: string): readonly string[] =>
  zoneCode === "C1" ? C1_PERMISSIONS : STANDARD_PERMISSIONS;

const sameValues = (actual: string[], expected: readonly string[]) =>
  actual.length === expected.length &&
  actual.every((value, index) => value === [...expected].sort()[index]);

const checkLga = async (matrix: MatrixLga) => {
  const coverage = await prisma.lgaCoverageState.findUnique({
    where: { lgaCode: matrix.code },
    select: { state: true, lastPreparedAt: true },
  });

  if (coverage?.state !== "VERIFIED" || !coverage.lastPreparedAt) {
    record(
      matrix.name,
      "coverage",
      "red",
      `state=${coverage?.state ?? "missing"}, lastPreparedAt=${
        coverage?.lastPreparedAt?.toISOString() ?? "missing"
      }.`,
    );
  } else {
    record(
      matrix.name,
      "coverage",
      "green",
      `VERIFIED at ${coverage.lastPreparedAt.toISOString()}.`,
    );
  }

  const lep = await prisma.instrument.findUnique({
    where: { slug: matrix.lepSlug },
    select: {
      id: true,
      name: true,
      sourceUrl: true,
      lastSyncedAt: true,
    },
  });

  if (!lep) {
    record(matrix.name, "LEP", "red", `${matrix.lepSlug} is missing.`);
    return;
  }

  const [currentClauseCount, objectives, landUses] = await Promise.all([
    prisma.clause.count({
      where: { instrumentId: lep.id, isCurrent: true },
    }),
    prisma.lepZoneObjective.findMany({
      where: { instrumentId: lep.id },
      select: { zoneCode: true, objective: true },
    }),
    prisma.lepZoneLandUse.findMany({
      where: { instrumentId: lep.id },
      select: { zoneCode: true, permission: true, description: true },
    }),
  ]);

  if (!currentClauseCount) {
    record(matrix.name, "LEP", "red", `${lep.name} has no current clauses.`);
  } else {
    record(
      matrix.name,
      "LEP",
      "green",
      `${lep.name} has ${currentClauseCount} current clauses.`,
    );
  }

  if (!isHttpsUrl(lep.sourceUrl) || !lep.lastSyncedAt) {
    record(
      matrix.name,
      "LEP provenance",
      "red",
      `sourceUrl=${isHttpsUrl(lep.sourceUrl) ? "https" : "invalid"}, lastSyncedAt=${
        lep.lastSyncedAt?.toISOString() ?? "missing"
      }.`,
    );
  } else {
    record(
      matrix.name,
      "LEP provenance",
      "green",
      `HTTPS source recorded; synced at ${lep.lastSyncedAt.toISOString()}.`,
    );
  }

  const actualZones = Array.from(
    new Set([
      ...objectives.map((entry) => entry.zoneCode),
      ...landUses.map((entry) => entry.zoneCode),
    ]),
  ).sort();
  const expectedZones = [...matrix.expectedZones].sort();
  const missingZones = expectedZones.filter((zone) => !actualZones.includes(zone));
  const unexpectedZones = actualZones.filter((zone) => !expectedZones.includes(zone));

  if (missingZones.length || unexpectedZones.length) {
    record(
      matrix.name,
      "zone set",
      "red",
      `missing=${missingZones.join(",") || "none"}; unexpected=${
        unexpectedZones.join(",") || "none"
      }.`,
    );
  } else {
    record(
      matrix.name,
      "zone set",
      "green",
      `Exact authoritative matrix present (${expectedZones.length} zones).`,
    );
  }

  for (const zoneCode of matrix.expectedZones) {
    const zoneObjectives = objectives.filter(
      (entry) => entry.zoneCode === zoneCode,
    );
    const zoneLandUses = landUses.filter(
      (entry) => entry.zoneCode === zoneCode,
    );
    const permissions = Array.from(
      new Set(zoneLandUses.map((entry) => String(entry.permission))),
    ).sort();
    const expectedPermissions = expectedPermissionsFor(zoneCode);
    const blankObjectives = zoneObjectives.filter(
      (entry) => !entry.objective.trim(),
    ).length;
    const blankLandUses = zoneLandUses.filter(
      (entry) => !entry.description.trim(),
    ).length;

    if (
      !zoneObjectives.length ||
      !zoneLandUses.length ||
      blankObjectives ||
      blankLandUses ||
      !sameValues(permissions, expectedPermissions)
    ) {
      record(
        matrix.name,
        `zone ${zoneCode}`,
        "red",
        `objectives=${zoneObjectives.length}, landUses=${zoneLandUses.length}, blankObjectives=${blankObjectives}, blankLandUses=${blankLandUses}, permissions=${
          permissions.join(",") || "none"
        }, expectedPermissions=${[...expectedPermissions].sort().join(",")}.`,
      );
    } else {
      record(
        matrix.name,
        `zone ${zoneCode}`,
        "green",
        `objectives=${zoneObjectives.length}, landUses=${zoneLandUses.length}, permissions=${permissions.join(",")}.`,
      );
    }
  }

  const [dcpClauses, councilDocuments, councilChunkCount] = await Promise.all([
    prisma.dCPClause.findMany({
      where: { lgaCode: matrix.code },
      select: {
        ref: true,
        instrumentSlug: true,
        bodyText: true,
      },
    }),
    prisma.councilDocument.findMany({
      where: { lgaCode: matrix.code },
      select: {
        title: true,
        sourceUrl: true,
      },
    }),
    prisma.workspaceSourceChunk.count({
      where: {
        lgaCode: matrix.code,
        sourceType: {
          in: [WorkspaceSourceType.council_dcp, WorkspaceSourceType.dcp],
        },
      },
    }),
  ]);

  const incompleteDcpClauses = dcpClauses.filter(
    (clause) =>
      !clause.ref?.trim() ||
      !clause.instrumentSlug?.trim() ||
      !clause.bodyText.trim(),
  ).length;

  if (!dcpClauses.length || incompleteDcpClauses) {
    record(
      matrix.name,
      "DCP corpus",
      "red",
      `clauses=${dcpClauses.length}, incomplete=${incompleteDcpClauses}.`,
    );
  } else {
    record(
      matrix.name,
      "DCP corpus",
      "green",
      `${dcpClauses.length} referenced, substantive clauses.`,
    );
  }

  const invalidDcpSources = councilDocuments.filter(
    (document) => !isHttpsUrl(document.sourceUrl),
  );
  if (
    !councilDocuments.length ||
    !councilChunkCount ||
    invalidDcpSources.length
  ) {
    record(
      matrix.name,
      "DCP provenance",
      "red",
      `documents=${councilDocuments.length}, sourceChunks=${councilChunkCount}, invalidHttpsSources=${invalidDcpSources.length}.`,
    );
  } else {
    record(
      matrix.name,
      "DCP provenance",
      "green",
      `documents=${councilDocuments.length}, sourceChunks=${councilChunkCount}; all document sources are HTTPS.`,
    );
  }

  const mapInfo = getLgaMapInfo(matrix.mapName);
  const mapUrls = [
    mapInfo?.primaryMapUrl,
    ...(mapInfo?.fallbackMapUrls ?? []),
    mapInfo?.nswSpatialViewerUrl,
  ].filter((value): value is string => Boolean(value));
  const invalidMapUrls = mapUrls.filter((value) => !isHttpsUrl(value));

  if (!mapInfo || !mapUrls.length || invalidMapUrls.length) {
    record(
      matrix.name,
      "spatial source registry",
      "red",
      `registry=${mapInfo ? "present" : "missing"}, urls=${mapUrls.length}, invalidHttpsUrls=${invalidMapUrls.length}.`,
    );
  } else {
    record(
      matrix.name,
      "spatial source registry",
      "green",
      `platform=${mapInfo.platform}, httpsSources=${mapUrls.length}.`,
    );
  }
};

const printSummary = async () => {
  console.log(
    "\n[smoke:whole-lga] Byron + Kempsey whole-LGA source matrix preflight\n",
  );

  for (const check of checks) {
    console.log(
      `[${check.state === "green" ? "PASS" : "FAIL"}] ${check.lga} / ${check.area}: ${check.detail}`,
    );
  }

  const red = checks.filter((check) => check.state === "red").length;
  const green = checks.length - red;

  console.log(`\nSummary: ${green} green, ${red} red.`);
  console.log(
    red
      ? "WHOLE-LGA SOURCE MATRIX: BLOCKED"
      : "WHOLE-LGA SOURCE MATRIX: READY",
  );
  console.log(
    "Boundary: this does not certify address-level spatial resolution, every-zone proposal flight tests, SEE rendering, payment credit, or operator sign-off.",
  );

  await prisma.$disconnect().catch(() => {});
  if (red) process.exitCode = 1;
};

const main = async () => {
  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl) {
    record("Global", "database", "red", "DATABASE_URL is not configured.");
    return;
  }

  try {
    const url = new URL(databaseUrl);
    if (!["postgres:", "postgresql:"].includes(url.protocol)) {
      record("Global", "database", "red", "DATABASE_URL is not PostgreSQL.");
      return;
    }

    await prisma.$queryRaw`SELECT 1`;
    record("Global", "database", "green", "PostgreSQL connection succeeded.");

    for (const matrix of MATRIX_LGAS) {
      await checkLga(matrix);
    }
  } catch (error) {
    record("Global", "database", "red", cleanError(error));
  }
};

main().finally(printSummary);
