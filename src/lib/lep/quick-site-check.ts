import type { Clause, Prisma } from "@prisma/client";

import type { QuickSiteCheckLepClause, QuickSiteCheckLepResponse } from "@/types/quick-site-check-lep";

import { prisma } from "../prisma";
import { findProjectByExternalId, normalizeProjectId } from "../project-identifiers";
import { serializeSiteContext } from "../site-context";
import { buildLepInstrumentFilter } from "./lep-search";
import { resolveCanonicalNswLga } from "./nsw-lga-normaliser";

type ClauseSummary = Pick<Clause, "clauseKey" | "title" | "bodyText" | "hierarchyPath">;

const LIST_SEPARATOR = /[•·\-–]\s*|\d+\.\s*/;

const KEYWORDS: Record<"4" | "5" | "6", string[]> = {
  "4": [
    "height",
    "floor space",
    "fsr",
    "lot size",
    "subdivision",
    "envelope",
    "setback",
  ],
  "5": ["heritage", "archaeolog", "environmental heritage"],
  "6": [
    "acid sulfate",
    "acid sulphate",
    "flood",
    "water",
    "coastal",
    "bush fire",
    "bushfire",
    "biodiversity",
    "riparian",
    "scenic",
    "airport",
  ],
};

const toZoneCode = (value: string | null | undefined) => {
  if (!value) return null;
  const match = value.trim().match(/([A-Z]{1,3}\d?[A-Z]?)/i);
  return match ? match[1]?.toUpperCase() ?? null : null;
};

const extractListFromSection = (text: string, headings: string[]): string[] => {
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  let capture: string | null = null;
  const results: string[] = [];

  for (const line of lines) {
    const headingMatch = headings.find((heading) =>
      new RegExp(`^${heading}`, "i").test(line.replace(/[:–-]+\s*$/, "")),
    );

    if (headingMatch) {
      capture = headingMatch;
      continue;
    }

    const isNewHeading = /^(zone objectives|development permitted|permitted|prohibited|not permitted)/i.test(line);
    if (isNewHeading) {
      capture = null;
    }

    if (!capture) continue;

    const cleaned = line.replace(LIST_SEPARATOR, "").trim();
    if (cleaned) {
      results.push(cleaned);
    }
  }

  return Array.from(new Set(results));
};

const extractZoneObjectives = (text: string) =>
  extractListFromSection(text, ["zone objectives", "objectives of the zone", "zone objective"]);

const extractPermittedWithoutConsent = (text: string) =>
  extractListFromSection(text, ["development permitted without consent", "permitted without consent"]);

const extractPermittedWithConsent = (text: string) =>
  extractListFromSection(text, ["development permitted with consent", "permitted with consent"]);

const extractProhibited = (text: string) =>
  extractListFromSection(text, ["development prohibited", "prohibited", "development not permitted"]);

const parseClauseNumber = (clause: ClauseSummary) => {
  if (clause.clauseKey?.trim()) return clause.clauseKey;
  const titleMatch = clause.title?.match(/(\d+(?:\.\d+)?)/);
  if (titleMatch) return titleMatch[1];
  const hierarchyMatch = clause.hierarchyPath?.find((entry) => /\bclause\s+\d+/i.test(entry));
  if (hierarchyMatch) {
    const match = hierarchyMatch.match(/(\d+(?:\.\d+)?)/);
    if (match) return match[1];
  }
  return "";
};

const derivePart = (clause: ClauseSummary): "4" | "5" | "6" | null => {
  if (clause.clauseKey?.startsWith("4")) return "4";
  if (clause.clauseKey?.startsWith("5")) return "5";
  if (clause.clauseKey?.startsWith("6")) return "6";
  if (clause.hierarchyPath?.some((entry) => /part\s*4/i.test(entry))) return "4";
  if (clause.hierarchyPath?.some((entry) => /part\s*5/i.test(entry))) return "5";
  if (clause.hierarchyPath?.some((entry) => /part\s*6/i.test(entry))) return "6";
  return null;
};

const buildSnippet = (text: string | null | undefined) => {
  if (!text) return "";
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .slice(0, 3)
    .join(" ");
  const snippet = sentences || text.slice(0, 280);
  return snippet.length > 320 ? `${snippet.slice(0, 320)}…` : snippet;
};

const scoreClause = (part: "4" | "5" | "6", clause: ClauseSummary) => {
  const haystack = `${clause.title ?? ""} ${clause.bodyText ?? ""}`.toLowerCase();
  const keywords = KEYWORDS[part];
  return keywords.reduce((score, keyword) => (haystack.includes(keyword) ? score + 2 : score), 0);
};

const selectClauses = (
  part: "4" | "5" | "6",
  clauses: ClauseSummary[],
): QuickSiteCheckLepClause[] => {
  const scored = clauses
    .map((clause) => ({ clause, score: scoreClause(part, clause), clauseNumber: parseClauseNumber(clause) }))
    .sort((first, second) => {
      if (first.score !== second.score) return second.score - first.score;
      return first.clauseNumber.localeCompare(second.clauseNumber, undefined, { numeric: true, sensitivity: "base" });
    });

  return scored
    .slice(0, 8)
    .map(({ clause }) => ({
      part,
      clauseNumber: parseClauseNumber(clause) || "", 
      heading: clause.title?.trim() || "", 
      textSnippet: buildSnippet(clause.bodyText),
    }));
};

const pickZoneClause = (clauses: ClauseSummary[], zoneCode: string | null) => {
  if (!zoneCode) return clauses.find((clause) => /zone/i.test(clause.title ?? "")) ?? null;
  const zonePattern = new RegExp(`\b${zoneCode}\b`, "i");
  return (
    clauses.find((clause) => zonePattern.test(clause.title ?? "")) ??
    clauses.find((clause) => zonePattern.test(clause.bodyText ?? "")) ??
    null
  );
};

const buildZoneSummary = (clause: ClauseSummary | null) => {
  if (!clause) {
    return { objectives: [] as string[], withoutConsent: [] as string[], withConsent: [] as string[], prohibited: [] as string[] };
  }

  const text = clause.bodyText ?? "";

  return {
    objectives: extractZoneObjectives(text),
    withoutConsent: extractPermittedWithoutConsent(text),
    withConsent: extractPermittedWithConsent(text),
    prohibited: extractProhibited(text),
  };
};

const findLepInstrumentForLga = async (lga: string) => {
  const filter = buildLepInstrumentFilter(lga);

  const instrument = await prisma.instrument.findFirst({
    where: {
      ...filter,
      clauses: { some: { isCurrent: true } },
    },
    orderBy: [
      { lastSyncedAt: "desc" },
      { createdAt: "desc" },
    ],
  });

  return instrument;
};

export const buildQuickSiteCheckLep = async (projectId: string): Promise<QuickSiteCheckLepResponse> => {
  try {
    const normalizedId = normalizeProjectId(projectId);
    const project = await findProjectByExternalId(prisma, normalizedId);

    if (!project) {
      return { ok: false, message: "Project not found" } satisfies QuickSiteCheckLepResponse;
    }

    const siteContext = await prisma.siteContext.findUnique({ where: { projectId: project.id } });
    const siteSummary = serializeSiteContext(siteContext, project);

    const lga = siteSummary?.lgaName ?? siteSummary?.lgaCode ?? null;
    const zone =
      project.zoningCode ??
      siteSummary?.zoningCode ??
      siteSummary?.zoningName ??
      siteSummary?.zone ??
      project.zoningName ??
      null;

    const zoneCode = toZoneCode(zone);

    if (!lga) {
      return {
        ok: false,
        projectId: project.id,
        message: "Set a site with LGA to run LEP Quick Site Check.",
      } satisfies QuickSiteCheckLepResponse;
    }

    const lepInstrument = await findLepInstrumentForLga(lga);

    if (!lepInstrument) {
      return {
        ok: false,
        projectId: project.id,
        message: "LEP data for this council is not loaded yet. Quick Site Check will work once LEP is ingested.",
      } satisfies QuickSiteCheckLepResponse;
    }

    const zoneClauses = await prisma.clause.findMany({
      where: {
        instrumentId: lepInstrument.id,
        isCurrent: true,
        OR: [
          { clauseKey: { startsWith: "2" } },
          zoneCode ? { title: { contains: zoneCode, mode: "insensitive" } } : undefined,
          zoneCode ? { bodyText: { contains: zoneCode, mode: "insensitive" } } : undefined,
        ].filter(Boolean) as Prisma.ClauseWhereInput[],
      },
      orderBy: { clauseKey: "asc" },
      select: { clauseKey: true, title: true, bodyText: true, hierarchyPath: true },
    });

    const chosenZoneClause = pickZoneClause(zoneClauses, zoneCode);
    const zoneSummary = buildZoneSummary(chosenZoneClause);

    if (!zoneCode) {
      return {
        ok: false,
        projectId: project.id,
        message: "Zone not set for this project. Set the site and zoning first to run LEP Quick Site Check.",
      } satisfies QuickSiteCheckLepResponse;
    }

    const candidateClauses = await prisma.clause.findMany({
      where: {
        instrumentId: lepInstrument.id,
        isCurrent: true,
        OR: [
          { clauseKey: { startsWith: "4" } },
          { clauseKey: { startsWith: "5" } },
          { clauseKey: { startsWith: "6" } },
          { hierarchyPath: { hasSome: ["Part 4", "Part 5", "Part 6"] } },
        ],
      },
      orderBy: { clauseKey: "asc" },
      select: { clauseKey: true, title: true, bodyText: true, hierarchyPath: true },
    });

    const partBuckets: Record<"4" | "5" | "6", ClauseSummary[]> = { "4": [], "5": [], "6": [] };

    for (const clause of candidateClauses) {
      const part = derivePart(clause);
      if (part) {
        partBuckets[part].push(clause);
      }
    }

    return {
      ok: true,
      projectId: project.id,
      lga: resolveCanonicalNswLga(lga) ?? lga,
      lepName: lepInstrument.name,
      zone: zoneCode,
      zoneObjectives: zoneSummary.objectives,
      permittedWithoutConsent: zoneSummary.withoutConsent,
      permittedWithConsent: zoneSummary.withConsent,
      prohibited: zoneSummary.prohibited,
      part4Clauses: selectClauses("4", partBuckets["4"]),
      part5Clauses: selectClauses("5", partBuckets["5"]),
      part6Clauses: selectClauses("6", partBuckets["6"]),
    } satisfies QuickSiteCheckLepResponse;
  } catch (error) {
    console.error("[quick-site-check-lep] failed", error);
    return {
      ok: false,
      message: "Unable to run LEP Quick Site Check right now.",
    } satisfies QuickSiteCheckLepResponse;
  }
};
