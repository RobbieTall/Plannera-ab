import { resolveSiteInstruments, searchClauses } from "@/lib/legislation";
import type { ClauseSummary } from "@/lib/legislation";

const ZONE_REGEX = /\b([A-Z]{1,2}\d{1,2})\b/;
const LGA_KEYWORDS: Record<string, RegExp[]> = {
  "City of Sydney": [/\bcity of sydney\b/i, /\bsydney\b/i],
};

export const inferZoneFromMessage = (message: string): string | null => {
  const match = message.toUpperCase().match(ZONE_REGEX);
  if (!match) return null;
  return match[1];
};

const inferLgaFromMessage = (message: string): string | null => {
  for (const [lga, patterns] of Object.entries(LGA_KEYWORDS)) {
    if (patterns.some((regex) => regex.test(message))) {
      return lga;
    }
  }
  return null;
};

const categorizeClause = (clause: ClauseSummary) => {
  const haystack = `${clause.title ?? ""} ${clause.snippet}`.toLowerCase();
  if (haystack.includes("permiss") || haystack.includes("permitted") || haystack.includes("land use")) {
    return "use" as const;
  }
  if (haystack.includes("lot size") || haystack.includes("minimum lot") || haystack.includes("site area") || haystack.includes("subdivision")) {
    return "lot" as const;
  }
  if (haystack.includes("height") || haystack.includes("storey") || haystack.includes("fsr") || haystack.includes("floor space")) {
    return "built" as const;
  }
  if (haystack.includes("prohibit") || haystack.includes("must not")) {
    return "constraint" as const;
  }
  return "other" as const;
};

const buildBulletPoint = (clause: ClauseSummary) => {
  const title = clause.title ?? clause.clauseKey;
  return `${title} – ${clause.snippet}`;
};

const buildCitations = (clauses: ClauseSummary[]) => {
  const citationSet = new Set<string>();
  for (const clause of clauses) {
    citationSet.add(`${clause.instrumentName} ${clause.clauseKey}`);
  }
  return Array.from(citationSet).join(", ");
};

export const generatePlanningReplyForNswSite = async (
  params: {
    messageText: string;
    projectId?: string;
    zone?: string | null;
  }
): Promise<{ reply: string; lga: string | null; zone: string | null; instruments: string[] }> => {
  const { messageText } = params;
  const zone = params.zone ?? inferZoneFromMessage(messageText);
  const lgaFromText = inferLgaFromMessage(messageText);

  const site = await resolveSiteInstruments({ address: messageText, topic: messageText });
  const lga = site.localGovernmentArea ?? lgaFromText;

  const clauseQuery = [messageText, zone].filter(Boolean).join(" ").trim();
  const instrumentSlugs = site.instrumentSlugs ?? [];

  const clauses = instrumentSlugs.length
    ? await searchClauses({
        query: clauseQuery || messageText,
        instrumentSlugs,
        instrumentTypes: ["LEP", "SEPP"],
        limit: 12,
      })
    : [];

  if (!clauses.length) {
    return {
      reply:
        "I couldn’t find detailed LEP or SEPP controls for that question yet. If you can confirm the site address or zone, I can pull the relevant clauses for City of Sydney and NSW SEPPs.",
      lga,
      zone,
      instruments: instrumentSlugs,
    };
  }

  const buckets: Record<string, ClauseSummary[]> = { use: [], lot: [], built: [], constraint: [], other: [] };
  for (const clause of clauses) {
    const category = categorizeClause(clause);
    buckets[category].push(clause);
  }

  const sections: string[] = [];
  const useClause = buckets.use[0];
  if (useClause) {
    sections.push(`• Zoning/permissibility: ${buildBulletPoint(useClause)}`);
  }
  const lotClause = buckets.lot[0];
  if (lotClause) {
    sections.push(`• Lot size / subdivision: ${buildBulletPoint(lotClause)}`);
  }
  const builtClause = buckets.built[0];
  if (builtClause) {
    sections.push(`• Height/FSR: ${buildBulletPoint(builtClause)}`);
  }
  const constraintClause = buckets.constraint[0] ?? buckets.other[0];
  if (constraintClause) {
    sections.push(`• Constraints to note: ${buildBulletPoint(constraintClause)}`);
  }

  const introLocation = lga ? `in ${lga}` : "in NSW";
  const zoneLabel = zone ? ` in ${zone}` : "";
  const intro = `Here’s an initial view for this query ${introLocation}${zoneLabel}. I’ve pulled clauses from the local LEP and NSW SEPPs.`;
  const body = sections.join("\n");
  const citations = buildCitations(clauses.slice(0, 4));

  return {
    reply: `${intro}\n\n${body}\n\nBased on ${citations}.`,
    lga,
    zone,
    instruments: instrumentSlugs,
  };
};
