import "dotenv/config";

import { InstrumentType, WorkspaceSourceType } from "@prisma/client";

import { searchDcpClauses } from "../src/lib/dcp/search";
import { prisma } from "../src/lib/prisma";

type State = "green" | "amber" | "red";

type Check = {
  lga: string;
  area: string;
  state: State;
  detail: string;
};

type LaunchLga = {
  code: "BYRON" | "KEMPSEY";
  name: string;
  instrumentNeedle: string;
  requiredZones: string[];
  dcpQuery: string;
  dcpSiteZone: string;
};

const LAUNCH_LGAS: LaunchLga[] = [
  {
    code: "BYRON",
    name: "Byron",
    instrumentNeedle: "byron",
    requiredZones: ["SP3", "R2", "R3"],
    dcpQuery: "SP3 tourist dual occupancy setbacks parking landscaping",
    dcpSiteZone: "SP3 Tourist",
  },
  {
    code: "KEMPSEY",
    name: "Kempsey",
    instrumentNeedle: "kempsey",
    requiredZones: ["E2", "SP2"],
    dcpQuery: "E2 commercial centre setbacks parking active frontage",
    dcpSiteZone: "E2 Commercial Centre",
  },
];

const checks: Check[] = [];

const record = (lga: string, area: string, state: State, detail: string) => {
  checks.push({ lga, area, state, detail });
};

const cleanError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[database-url-redacted]");
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

const checkLga = async (launch: LaunchLga) => {
  const coverage = await prisma.lgaCoverageState.findUnique({
    where: { lgaCode: launch.code },
    select: { state: true, lastPreparedAt: true, errorMessage: true },
  });

  if (!coverage) {
    record(launch.name, "coverage", "red", "No coverage-state record exists.");
  } else if (coverage.state !== "VERIFIED") {
    record(
      launch.name,
      "coverage",
      "red",
      `Coverage is ${coverage.state}; commercial launch requires VERIFIED.`,
    );
  } else if (!coverage.lastPreparedAt) {
    record(
      launch.name,
      "coverage",
      "red",
      "Coverage is VERIFIED but has no preparation timestamp.",
    );
  } else {
    record(
      launch.name,
      "coverage",
      "green",
      `VERIFIED at ${coverage.lastPreparedAt.toISOString()}.`,
    );
  }

  const lep = await prisma.instrument.findFirst({
    where: {
      instrumentType: InstrumentType.LEP,
      OR: [
        { slug: { contains: launch.instrumentNeedle, mode: "insensitive" } },
        { name: { contains: launch.instrumentNeedle, mode: "insensitive" } },
        { shortName: { contains: launch.instrumentNeedle, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      sourceUrl: true,
      lastSyncedAt: true,
      _count: {
        select: {
          clauses: true,
          lepZoneObjectives: true,
          lepZoneLandUses: true,
        },
      },
    },
    orderBy: { lastSyncedAt: "desc" },
  });

  if (!lep) {
    record(launch.name, "LEP", "red", "No matching LEP instrument was found.");
  } else if (!lep._count.clauses) {
    record(launch.name, "LEP", "red", `${lep.name} exists but has no clauses.`);
  } else {
    record(
      launch.name,
      "LEP",
      "green",
      `${lep.name} has ${lep._count.clauses} clauses, ${lep._count.lepZoneObjectives} zone objectives, and ${lep._count.lepZoneLandUses} land-use rows.`,
    );
  }

  if (lep) {
    if (!isHttpsUrl(lep.sourceUrl) || !lep.lastSyncedAt) {
      record(
        launch.name,
        "LEP provenance",
        "red",
        `sourceUrl=${isHttpsUrl(lep.sourceUrl) ? "https" : "invalid"}, lastSyncedAt=${lep.lastSyncedAt ? lep.lastSyncedAt.toISOString() : "missing"}.`,
      );
    } else {
      record(
        launch.name,
        "LEP provenance",
        "green",
        `HTTPS source recorded; synced at ${lep.lastSyncedAt.toISOString()}.`,
      );
    }

    const [objectives, landUses] = await Promise.all([
      prisma.lepZoneObjective.groupBy({
        by: ["zoneCode"],
        where: {
          instrumentId: lep.id,
          zoneCode: { in: launch.requiredZones },
        },
        _count: { _all: true },
      }),
      prisma.lepZoneLandUse.groupBy({
        by: ["zoneCode", "permission"],
        where: {
          instrumentId: lep.id,
          zoneCode: { in: launch.requiredZones },
        },
        _count: { _all: true },
      }),
    ]);

    for (const zone of launch.requiredZones) {
      const objectiveCount =
        objectives.find((entry) => entry.zoneCode === zone)?._count._all ?? 0;
      const zoneLandUses = landUses.filter((entry) => entry.zoneCode === zone);
      const landUseCount = zoneLandUses.reduce(
        (total, entry) => total + entry._count._all,
        0,
      );
      const permissions = zoneLandUses
        .filter((entry) => entry._count._all > 0)
        .map((entry) => entry.permission)
        .sort();

      if (!objectiveCount || !landUseCount) {
        record(
          launch.name,
          `zone ${zone}`,
          "red",
          `Projection incomplete: objectives=${objectiveCount}, landUses=${landUseCount}.`,
        );
      } else {
        record(
          launch.name,
          `zone ${zone}`,
          "green",
          `objectives=${objectiveCount}, landUses=${landUseCount}, permissions=${permissions.join(",")}.`,
        );
      }
    }
  }

  const [dcpClauseCount, councilDocumentCount, councilChunkCount] =
    await Promise.all([
      prisma.dCPClause.count({ where: { lgaCode: launch.code } }),
      prisma.councilDocument.count({ where: { lgaCode: launch.code } }),
      prisma.workspaceSourceChunk.count({
        where: {
          lgaCode: launch.code,
          sourceType: {
            in: [WorkspaceSourceType.council_dcp, WorkspaceSourceType.dcp],
          },
        },
      }),
    ]);

  if (!dcpClauseCount) {
    record(launch.name, "DCP", "red", "No DCP clauses are indexed.");
  } else {
    record(launch.name, "DCP", "green", `${dcpClauseCount} clauses indexed.`);
  }

  if (!councilDocumentCount || !councilChunkCount) {
    record(
      launch.name,
      "provenance",
      "red",
      `documents=${councilDocumentCount}, sourceChunks=${councilChunkCount}. Both are required before release.`,
    );
  } else {
    record(
      launch.name,
      "provenance",
      "green",
      `documents=${councilDocumentCount}, sourceChunks=${councilChunkCount}.`,
    );
  }

  const results = await searchDcpClauses({
    query: launch.dcpQuery,
    lgaCode: launch.code,
    siteZone: launch.dcpSiteZone,
    limit: 5,
  });

  if (!results.length) {
    record(
      launch.name,
      "DCP retrieval",
      "red",
      `No results for launch query: ${launch.dcpQuery}.`,
    );
  } else {
    const top = results[0];
    const cited =
      Boolean(top.ref?.trim()) &&
      Boolean(top.instrumentSlug?.trim()) &&
      Boolean(top.bodyText.trim()) &&
      Number.isFinite(top.score) &&
      top.score > 0;

    if (!cited) {
      record(
        launch.name,
        "DCP retrieval",
        "red",
        `Top ${launch.dcpSiteZone} result lacks a positive score, clause reference, instrument slug, or substantive body.`,
      );
    } else {
      record(
        launch.name,
        "DCP retrieval",
        "green",
        `Top ${launch.dcpSiteZone} result: ${top.ref} ${top.title ?? top.headingPath.at(-1) ?? "untitled"} (score=${top.score}).`,
      );
    }
  }
};

const printSummary = async () => {
  console.log("\n[smoke:launch] Byron + Kempsey representative commercial preflight\n");

  for (const check of checks) {
    const marker =
      check.state === "green" ? "PASS" : check.state === "amber" ? "WARN" : "FAIL";
    console.log(`[${marker}] ${check.lga} / ${check.area}: ${check.detail}`);
  }

  const red = checks.filter((check) => check.state === "red").length;
  const amber = checks.filter((check) => check.state === "amber").length;
  const green = checks.length - red - amber;

  console.log(`\nSummary: ${green} green, ${amber} amber, ${red} red.`);
  console.log(red ? "SOFT LAUNCH: BLOCKED" : "SOFT LAUNCH: READY");

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

    for (const launch of LAUNCH_LGAS) {
      await checkLga(launch);
    }
  } catch (error) {
    record("Global", "database", "red", cleanError(error));
  }
};

main().finally(printSummary);
