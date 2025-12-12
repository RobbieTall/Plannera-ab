import type { Clause } from "@prisma/client";

export type ZoneSectionKey = "objectives" | "withoutConsent" | "withConsent" | "prohibited";

export const GLOBAL_ZONE_PATTERNS = [
  /the land use zones under this plan are as follows/i,
  /zones under this plan are as follows/i,
  /the land use zones under this plan/i,
];

const ZONE_SECTION_HEADERS: { key: ZoneSectionKey; regex: RegExp }[] = [
  { key: "objectives", regex: /(?:objectives of (the )?zone|zone objectives)/i },
  { key: "withoutConsent", regex: /permitted without consent/i },
  { key: "withConsent", regex: /permitted with consent/i },
  { key: "prohibited", regex: /prohibited/i },
];

export type ZoneContent = {
  objectives: string[];
  withoutConsent: string[];
  withConsent: string[];
  prohibited: string[];
  looksTabular: boolean;
};

export type ClauseLike = Pick<Clause, "clauseKey" | "title" | "bodyText" | "hierarchyPath">;

export type LandUseTableExtraction = {
  heading: string | null;
  block: string;
  extractionMode: "xml-traverse" | "string-search" | "link-resolve";
  resolvedViaLink: boolean;
  resolvedTargetIds: string[];
};

export const cleanXmlLikeString = (text: string | null | undefined) => {
  if (!text) return "";

  const normalized = text.replace(/\r\n/g, "\n");
  const withBreaks = normalized
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*\/(p|div|li|tr|td|tier|attrib)[^>]*>/gi, "\n")
    .replace(/<\s*(p|div|li|tr|td|tier|attrib)[^>]*>/gi, "\n");

  const stripped = withBreaks.replace(/<[^>]+>/g, " ");

  return stripped
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

export const toZoneCode = (value: string | null | undefined) => {
  if (!value) return null;
  const match = value.trim().match(/([A-Z]{1,3}\d?[A-Z]?)/i);
  return match ? match[1]?.toUpperCase() ?? null : null;
};

export const splitZoneSections = (text: string): Record<ZoneSectionKey, string> => {
  const normalized = text.replace(/\r\n/g, "\n");
  const lower = normalized.toLowerCase();

  const matches = ZONE_SECTION_HEADERS.map((header) => {
    const match = lower.match(header.regex);
    if (!match || typeof match.index !== "number") return null;
    return { key: header.key, start: match.index, end: match.index + match[0].length };
  })
    .filter(Boolean)
    .sort((first, second) => (first!.start ?? 0) - (second!.start ?? 0)) as {
    key: ZoneSectionKey;
    start: number;
    end: number;
  }[];

  const sections: Record<ZoneSectionKey, string> = {
    objectives: "",
    withoutConsent: "",
    withConsent: "",
    prohibited: "",
  };

  matches.forEach((match, index) => {
    const nextStart = matches[index + 1]?.start ?? normalized.length;
    sections[match.key] = normalized.slice(match.end, nextStart).trim();
  });

  return sections;
};

export const cleanListItems = (section: string): string[] => {
  if (!section) return [];

  const rawEntries = section
    .split(/\r?\n|;/)
    .flatMap((line) => line.split(/[•·\-–—]/))
    .map((entry) => entry.trim())
    .filter(Boolean);

  const cleaned = rawEntries
    .map((entry) => entry.replace(/^\d+[).]\s*/, "").replace(/^[-–—]\s*/, "").replace(/\s+[-–—]\s*$/, ""))
    .map((entry) => entry.replace(/^\W+/, "").replace(/\s+$/, ""))
    .map((entry) => entry.replace(/\[[^\]]+\]/g, ""))
    .map((entry) => entry.replace(/\s+\.$/, "."))
    .filter((entry) => entry.length > 0)
    .filter((entry) => !/^none\b/i.test(entry) && !/^nil\b/i.test(entry));

  return Array.from(new Set(cleaned));
};

export const parseZoneContent = (text: string): ZoneContent => {
  const sections = splitZoneSections(text);

  const objectives = cleanListItems(sections.objectives);
  const withoutConsent = cleanListItems(sections.withoutConsent);
  const withConsent = cleanListItems(sections.withConsent);
  const prohibited = cleanListItems(sections.prohibited);
  const looksTabular = /<table/i.test(text) || /\|/.test(text) || /\t/.test(text);

  return { objectives, withoutConsent, withConsent, prohibited, looksTabular };
};

export const findLandUseTableClause = (clauses: ClauseLike[], zoneCode: string | null): ClauseLike | null => {
  const filtered = clauses.filter((clause) => {
    const hierarchy = clause.hierarchyPath?.join(" ") ?? "";
    const title = clause.title ?? "";

    const isWrongPart =
      /^4/i.test(clause.clauseKey ?? "") ||
      /^5/i.test(clause.clauseKey ?? "") ||
      /^6/i.test(clause.clauseKey ?? "") ||
      /part\s*4/i.test(hierarchy) ||
      /part\s*5/i.test(hierarchy) ||
      /part\s*6/i.test(hierarchy);

    if (isWrongPart) return false;

    const looksRelevant = /land use table/i.test(title) || /land use table/i.test(hierarchy);
    const isClauseTwo = /^2/i.test(clause.clauseKey ?? "");

    return looksRelevant || isClauseTwo;
  });

  const scored = filtered
    .map((clause) => {
    const title = clause.title ?? "";
    const hierarchy = clause.hierarchyPath?.join(" ") ?? "";
    let score = 0;

      if (/land use table/i.test(title)) score += 10;
      if (/land use table/i.test(hierarchy)) score += 6;
      if (clause.hierarchyPath?.some((entry) => /part\s*2/i.test(entry))) score += 2;
      if (clause.clauseKey?.startsWith("2")) score += 1;
      if (zoneCode && new RegExp(`\b${zoneCode}\b`, "i").test(title)) score += 2;

      return { clause, score };
    })
    .filter(({ score }) => score > 0);

  if (!scored.length) return null;

  return scored.sort((first, second) => second.score - first.score)[0]?.clause ?? null;
};

export const extractZoneBlockFromLandUseXml = (
  xml: string | null | undefined,
  zoneCode: string | null,
): LandUseTableExtraction | null => {
  if (!xml || !zoneCode) return null;

  const startRegex = new RegExp(`<level[^>]+id="[^"]*Zone[_\-.\s]*${zoneCode}[^\"]*"[^>]*>`, "i");
  const startMatch = startRegex.exec(xml);
  if (!startMatch || typeof startMatch.index !== "number") return null;

  const tagRegex = /<level\b[^>]*>|<\/level>/gi;
  tagRegex.lastIndex = startMatch.index;

  let depth = 0;
  let endIndex = xml.length;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(xml)) !== null) {
    if (/^<level\b/i.test(match[0])) {
      depth += 1;
    } else {
      depth -= 1;
      if (depth === 0) {
        endIndex = tagRegex.lastIndex;
        break;
      }
    }
  }

  const rawBlock = xml.slice(startMatch.index, endIndex);
  const headingMatch = rawBlock.match(/<heading[^>]*>([\s\S]*?)<\/heading>/i);
  const heading = headingMatch ? cleanXmlLikeString(headingMatch[1]) || null : null;
  const cleanedBlock = cleanXmlLikeString(rawBlock);

  if (!cleanedBlock) return null;

  return {
    heading,
    block: cleanedBlock,
    extractionMode: "xml-traverse",
    resolvedViaLink: false,
    resolvedTargetIds: [],
  } satisfies LandUseTableExtraction;
};
