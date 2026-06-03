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

export type SourceAttribution = {
  confidence: "cited" | "inferred" | "unresolved";
  sources: Array<{
    ref: string;
    type: "LEP" | "SEPP" | "DCP" | "model";
    title: string;
    snippet?: string;
  }>;
  coverageState: string;
  coverageNotice?: string;
};

type SourceAttributionClause = Pick<
  ClauseSummary,
  "instrumentName" | "instrumentType" | "clauseKey" | "title" | "snippet"
>;

type SourceAttributionDcpClause = {
  ref?: string | null;
  title?: string | null;
  headingPath?: string[] | null;
  bodyText?: string | null;
};

type SourceAttributionDcpChunk = {
  heading?: string | null;
  content?: string | null;
  metadata?: unknown;
};

const SEARCHABLE_COVERAGE_STATES = ["SEARCHABLE_READY", "STRUCTURED_PARTIAL", "VERIFIED"] as const;

const isSearchableCoverageState = (coverageState: string | null | undefined) =>
  Boolean(coverageState && SEARCHABLE_COVERAGE_STATES.includes(coverageState as (typeof SEARCHABLE_COVERAGE_STATES)[number]));

const readSourceMetadata = (metadata: unknown) =>
  metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : null;

const truncateSourceSnippet = (snippet: string | null | undefined) => {
  if (!snippet) return undefined;
  const trimmed = snippet.trim();
  if (!trimmed) return undefined;
  return trimmed.length > 240 ? `${trimmed.slice(0, 240).trimEnd()}…` : trimmed;
};

const buildDcpRef = (params: { ref?: string | null; title?: string | null; heading?: string | null }) => {
  if (params.ref?.trim()) return params.ref.trim();
  if (params.heading?.trim()) return params.heading.trim();
  if (params.title?.trim()) return params.title.trim();
  return "DCP excerpt";
};

export const buildSourceAttribution = (params: {
  clauses?: SourceAttributionClause[];
  dcpClauses?: SourceAttributionDcpClause[];
  dcpChunks?: SourceAttributionDcpChunk[];
  coverageState?: string | null;
  coverageNotice?: string | null;
  forcedFallbackReply?: string | null;
  modelWasCalled?: boolean;
}): SourceAttribution => {
  const coverageState = params.coverageState ?? "UNKNOWN";

  if (params.forcedFallbackReply) {
    return {
      confidence: "unresolved",
      sources: [],
      coverageState,
      ...(params.coverageNotice ? { coverageNotice: params.coverageNotice } : {}),
    };
  }

  const sources: SourceAttribution["sources"] = [];

  if (isSearchableCoverageState(params.coverageState)) {
    for (const clause of (params.clauses ?? []).slice(0, 4)) {
      if (clause.instrumentType !== "LEP" && clause.instrumentType !== "SEPP") continue;
      sources.push({
        ref: `${clause.instrumentName} ${clause.clauseKey}`,
        type: clause.instrumentType,
        title: clause.title ?? clause.clauseKey,
        ...(truncateSourceSnippet(clause.snippet) ? { snippet: truncateSourceSnippet(clause.snippet) } : {}),
      });
    }
  }

  for (const clause of (params.dcpClauses ?? []).slice(0, 4)) {
    const heading = clause.headingPath?.[clause.headingPath.length - 1] ?? null;
    const title = clause.title?.trim() || heading?.trim() || clause.ref?.trim() || "DCP clause excerpt";
    sources.push({
      ref: buildDcpRef({ ref: clause.ref, title: clause.title, heading }),
      type: "DCP",
      title,
      ...(truncateSourceSnippet(clause.bodyText) ? { snippet: truncateSourceSnippet(clause.bodyText) } : {}),
    });
  }

  for (const chunk of (params.dcpChunks ?? []).slice(0, Math.max(0, 4 - sources.filter((source) => source.type === "DCP").length))) {
    const metadata = readSourceMetadata(chunk.metadata);
    const metadataRef = typeof metadata?.clauseKey === "string" ? metadata.clauseKey : null;
    const metadataTitle = typeof metadata?.title === "string" ? metadata.title : null;
    const title = chunk.heading?.trim() || metadataTitle?.trim() || metadataRef?.trim() || "DCP excerpt";
    sources.push({
      ref: buildDcpRef({ ref: metadataRef, title, heading: chunk.heading }),
      type: "DCP",
      title,
      ...(truncateSourceSnippet(chunk.content) ? { snippet: truncateSourceSnippet(chunk.content) } : {}),
    });
  }

  if (sources.length) {
    return {
      confidence: "cited",
      sources,
      coverageState,
      ...(params.coverageNotice ? { coverageNotice: params.coverageNotice } : {}),
    };
  }

  if (params.modelWasCalled) {
    return {
      confidence: "inferred",
      sources: [
        {
          ref: "AI reasoning",
          type: "model",
          title: "Model-generated — not from a retrieved statutory source",
        },
      ],
      coverageState,
      ...(params.coverageNotice ? { coverageNotice: params.coverageNotice } : {}),
    };
  }

  return {
    confidence: "unresolved",
    sources: [],
    coverageState,
    ...(params.coverageNotice ? { coverageNotice: params.coverageNotice } : {}),
  };
};
