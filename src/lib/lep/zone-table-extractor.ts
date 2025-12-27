import type { LepZonePermission, PrismaClient } from "@prisma/client";

import type { ParsedClause } from "../legislation/types";
import { GLOBAL_ZONE_PATTERNS, parseZoneContent, toZoneCode, type ClauseLike } from "./zone-utils";

type ZoneBlock = {
  heading: string | null;
  zoneCode: string;
  text: string;
  source: "heading" | "title-block";
};

type ExtractedZoneTable = {
  zoneCode: string;
  heading: string | null;
  clauseKey: string;
  clauseTitle: string | null | undefined;
  objectives: string[];
  landUse: { withoutConsent: string[]; withConsent: string[]; prohibited: string[] };
  looksTabular: boolean;
  source: ZoneBlock["source"];
};

const ZONE_HEADING_REGEX = /(^|\n)\s*zone\s+([A-Z]{1,3}\d?[A-Z]?)[^\n]*/gi;

const extractZoneBlocksFromClause = (clause: ClauseLike): ZoneBlock[] => {
  const text = clause.bodyText ?? "";
  const normalized = text.replace(/\r\n/g, "\n");
  const headingMatches = Array.from(normalized.matchAll(ZONE_HEADING_REGEX));

  const blocks: ZoneBlock[] = headingMatches
    .map((match, index) => {
      const zoneCode = toZoneCode(match[2] ?? match[0]);
      if (!zoneCode) return null;
      const start = (match.index ?? 0) + match[0].length;
      const end = headingMatches[index + 1]?.index ?? normalized.length;
      const block = normalized.slice(start, end).trim();
      if (!block) return null;
      return { heading: match[0].trim(), zoneCode, text: block, source: "heading" } satisfies ZoneBlock;
    })
    .filter(Boolean) as ZoneBlock[];

  if (blocks.length > 0) {
    return blocks;
  }

  const titleZoneCode = toZoneCode(clause.title);
  if (titleZoneCode && normalized.trim()) {
    return [
      {
        heading: clause.title ?? null,
        zoneCode: titleZoneCode,
        text: normalized.trim(),
        source: "title-block",
      },
    ];
  }

  return [];
};

const scoreZoneTable = (table: ExtractedZoneTable) => {
  const { objectives, landUse } = table;
  return (
    objectives.length * 3 +
    landUse.withConsent.length * 2 +
    landUse.withoutConsent.length * 2 +
    landUse.prohibited.length * 2
  );
};

export const extractZoneTables = (
  clauses: (Pick<ParsedClause, "clauseKey" | "title" | "bodyText" | "hierarchyPath"> | ClauseLike)[],
): ExtractedZoneTable[] => {
  const bestByZone = new Map<string, { table: ExtractedZoneTable; score: number }>();

  for (const clause of clauses) {
    const zoneBlocks = extractZoneBlocksFromClause(clause as ClauseLike);
    if (!zoneBlocks.length) continue;

    for (const block of zoneBlocks) {
      if (GLOBAL_ZONE_PATTERNS.some((pattern) => pattern.test(block.text))) {
        continue;
      }
      const parsed = parseZoneContent(block.text);
      const hasContent =
        parsed.objectives.length ||
        parsed.withConsent.length ||
        parsed.withoutConsent.length ||
        parsed.prohibited.length;
      if (!hasContent) {
        continue;
      }
      const extracted: ExtractedZoneTable = {
        zoneCode: block.zoneCode,
        heading: block.heading,
        clauseKey: clause.clauseKey,
        clauseTitle: clause.title,
        objectives: parsed.objectives,
        landUse: {
          withoutConsent: parsed.withoutConsent,
          withConsent: parsed.withConsent,
          prohibited: parsed.prohibited,
        },
        looksTabular: parsed.looksTabular,
        source: block.source,
      };
      const score = scoreZoneTable(extracted);
      const existing = bestByZone.get(block.zoneCode);
      if (!existing || score > existing.score) {
        bestByZone.set(block.zoneCode, { table: extracted, score });
      }
    }
  }

  return Array.from(bestByZone.values()).map(({ table }) => table);
};

export const refreshLepZoneTables = async (
  prisma: PrismaClient,
  instrumentId: string,
  clauses: (Pick<ParsedClause, "clauseKey" | "title" | "bodyText" | "hierarchyPath"> | ClauseLike)[],
) => {
  const zoneTables = extractZoneTables(clauses);

  await prisma.$transaction(async (tx) => {
    await tx.lepZoneObjective.deleteMany({ where: { instrumentId } });
    await tx.lepZoneLandUse.deleteMany({ where: { instrumentId } });

    if (!zoneTables.length) {
      return;
    }

    const objectiveData = zoneTables.flatMap((table) =>
      table.objectives.map((objective) => ({ instrumentId, zoneCode: table.zoneCode, objective })),
    );
    if (objectiveData.length) {
      await tx.lepZoneObjective.createMany({ data: objectiveData, skipDuplicates: true });
    }

    const landUseData = zoneTables.flatMap((table) => [
      ...table.landUse.withoutConsent.map((description) => ({
        instrumentId,
        zoneCode: table.zoneCode,
        permission: "WITHOUT_CONSENT" as LepZonePermission,
        description,
      })),
      ...table.landUse.withConsent.map((description) => ({
        instrumentId,
        zoneCode: table.zoneCode,
        permission: "WITH_CONSENT" as LepZonePermission,
        description,
      })),
      ...table.landUse.prohibited.map((description) => ({
        instrumentId,
        zoneCode: table.zoneCode,
        permission: "PROHIBITED" as LepZonePermission,
        description,
      })),
    ]);
    if (landUseData.length) {
      await tx.lepZoneLandUse.createMany({ data: landUseData, skipDuplicates: true });
    }
  });

  return zoneTables.length;
};
