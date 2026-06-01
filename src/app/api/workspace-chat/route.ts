import { NextResponse } from "next/server";
import { type ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { z } from "zod";

import {
  LgaCoverageMaturity,
  WorkspaceSourceType,
  type DCPClause,
} from "@prisma/client";

import { searchClauses, type ClauseSummary } from "@/lib/legislation";
import {
  getSiteContextForProject,
  persistSiteContextFromCandidate,
  resolveInstrumentsForSite,
  serializeSiteContext,
  type SiteInstrumentMatch,
} from "@/lib/site-context";
import { prisma } from "@/lib/prisma";
import {
  findProjectByExternalId,
  normalizeProjectId,
} from "@/lib/project-identifiers";
import {
  extractCandidateAddress,
  resolveSiteFromText,
} from "@/lib/site-resolver";
import type { SiteCandidate, SiteContextSummary } from "@/types/site";
import { buildSiteContextMessage } from "@/lib/chat/site-context-message";
import type { LepParseResult } from "@/lib/lep/types";
import {
  buildLepPromptMessage,
  getLepContextForProject,
  type LepContext,
} from "@/lib/lep/lep-context";
import { getDCPContext } from "@/lib/dcp/get-dcp-context";
import {
  buildWorkspaceSourcePrompt,
  COUNCIL_DCP_TYPES,
  getWorkspaceSourceContext,
  type WorkspaceSourceContext,
} from "@/lib/workspace-source-context";
import { normalizeCouncilLgaCode } from "@/lib/council/lga-normaliser";
import { callModel, hasPlanningChatProvider } from "@/lib/modelRouter";
import { queueLgaPreparation } from "@/lib/lga-activation";

const SYSTEM_PROMPT = `You are Plannera, an NSW planning assistant.
Always read the user's question literally.
Never invent user messages or assume multiple questions.
If no SiteContext is available, ask for the NSW suburb, council or address before quoting detailed controls.
Use provided site context (address, LGA, zone, LEP, SEPP) whenever available and reference the LGA name in your answer.
In all answers, rely on any provided site details and do not ask the user to repeat an address that is already set.
If a relevant LEP is not yet in Plannera, clearly explain that you are answering at a higher/state level using NSW SEPPs.`;

const SITE_CHANGE_REGEX =
  /(change|update|set).*(site|address|property)|new site|different (?:address|property)/i;

const DCP_INTENT_REGEX = /(\bdcp\b|development control plan)/i;
const CONTROL_KEYWORDS = [
  "setback",
  "set back",
  "setbacks",
  "height",
  "storey",
  "story",
  "parking",
  "parking rate",
  "parking rates",
  "parking requirement",
  "car space",
  "carpark",
  "driveway",
  "garage",
  "landscaping",
  "landscape",
  "landscape area",
  "private open space",
  "pos",
  "site coverage",
  "site cover",
  "floor space ratio",
  "fsr",
  "floor area",
  "gross floor area",
  "building envelope",
  "dual occupancy",
  "duplex",
];
const CONTROLS_INVENTORY_REGEX =
  /(?:what|which|show|list).{0,60}(?:controls|rules|constraints).{0,100}(?:site|land|property|address)|(?:site|land|property|address).{0,100}(?:controls|rules|constraints)/i;
const STATUTORY_CONTROL_QUERY_TERMS = [
  "land use table",
  "zone objectives",
  "height of buildings",
  "floor space ratio",
  "minimum subdivision lot size",
  "heritage conservation",
  "acid sulfate soils",
  "earthworks",
];
const BYRON_LGA_CODE = "BYRON";
const DUAL_OCC_REGEX = /(dual occ|dual occupancy|duplex)/i;
const MAX_DCP_CLAUSE_TEXT = 420;

const MAX_STATUTORY_CLAUSES = 5;

type StatutoryBaseline = {
  site: {
    address: string | null;
    lgaName: string | null;
    lgaCode: string | null;
    zone: string | null;
  };
  instruments: string[];
  lep: {
    matchedInstrument: string | null;
    instrumentName: string | null;
    clauseCount: number;
    usedFallback: boolean;
  };
  clauseSearch: {
    count: number;
    instruments: { name: string; type: string }[];
    clauses: {
      instrumentName: string;
      instrumentType: string;
      clauseKey: string;
      title: string | null;
      snippet: string;
    }[];
  };
  confidenceTags: string[];
};

const uniqueBy = <T>(items: T[], keyFor: (item: T) => string) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keyFor(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const isControlsInventoryQuestion = (message: string) =>
  CONTROLS_INVENTORY_REGEX.test(message.toLowerCase());

const buildStatutorySearchQueries = (params: {
  message: string;
  siteContext: SiteContextSummary | null;
  controlsInventoryQuestion: boolean;
}) => {
  const baseQueries = [params.message];
  if (params.controlsInventoryQuestion) {
    const zone = params.siteContext?.zone ?? params.siteContext?.zoningCode;
    baseQueries.push(
      ...(zone ? [`Zone ${zone}`, `${zone} land use table`] : []),
      ...STATUTORY_CONTROL_QUERY_TERMS,
    );
  }

  return uniqueBy(
    baseQueries.map((query) => query.trim()).filter(Boolean),
    (query) => query.toLowerCase(),
  );
};

const searchStatutoryClauses = async (params: {
  message: string;
  siteContext: SiteContextSummary | null;
  instrumentSlugs: string[];
  controlsInventoryQuestion: boolean;
}) => {
  const queries = buildStatutorySearchQueries({
    message: params.message,
    siteContext: params.siteContext,
    controlsInventoryQuestion: params.controlsInventoryQuestion,
  });
  const results: ClauseSummary[] = [];

  for (const query of queries) {
    const remaining = Math.max(12 - results.length, 0);
    if (!remaining) break;
    const found = await searchClauses({
      query,
      instrumentSlugs: params.instrumentSlugs,
      instrumentTypes: ["LEP", "SEPP"],
      limit: params.controlsInventoryQuestion
        ? Math.min(4, remaining)
        : remaining,
    });
    results.push(...found);
  }

  return uniqueBy(
    results,
    (clause) => `${clause.instrumentId}:${clause.clauseKey}:${clause.clauseId}`,
  ).slice(0, 12);
};

const buildStatutoryBaseline = (params: {
  siteContext: SiteContextSummary | null;
  instrumentSlugs: string[];
  clauses: ClauseSummary[];
  instrumentMatch: SiteInstrumentMatch | null;
  lepContext: LepContext | null;
  usedLepFallback: boolean;
}): StatutoryBaseline => {
  const clauseSummaries = params.clauses
    .slice(0, MAX_STATUTORY_CLAUSES)
    .map((clause) => ({
      instrumentName: clause.instrumentName,
      instrumentType: clause.instrumentType,
      clauseKey: clause.clauseKey,
      title: clause.title,
      snippet: clause.snippet,
    }));
  const confidenceTags = [
    params.instrumentSlugs.length ? "STATUTORY_INSTRUMENTS_MATCHED" : null,
    params.lepContext ? "LEP_CONTEXT_READY" : null,
    params.clauses.length ? "STATUTORY_CLAUSES_RETRIEVED" : null,
    params.usedLepFallback ? "LEP_FALLBACK_USED" : null,
  ].filter((tag): tag is string => Boolean(tag));

  return {
    site: {
      address: params.siteContext?.formattedAddress ?? null,
      lgaName: params.siteContext?.lgaName ?? null,
      lgaCode: params.siteContext?.lgaCode ?? null,
      zone: params.siteContext?.zone ?? params.siteContext?.zoningCode ?? null,
    },
    instruments: params.instrumentSlugs,
    lep: {
      matchedInstrument:
        params.lepContext?.instrumentCode ??
        params.instrumentMatch?.lepInstrumentSlug ??
        null,
      instrumentName: params.lepContext?.instrumentName ?? null,
      clauseCount: params.lepContext?.clauses.length ?? 0,
      usedFallback: params.usedLepFallback,
    },
    clauseSearch: {
      count: params.clauses.length,
      instruments: uniqueBy(
        params.clauses.map((clause) => ({
          name: clause.instrumentName,
          type: clause.instrumentType,
        })),
        (instrument) => `${instrument.type}:${instrument.name}`,
      ),
      clauses: clauseSummaries,
    },
    confidenceTags,
  };
};

const buildStatutoryBaselinePrompt = (baseline: StatutoryBaseline) => {
  if (
    !baseline.instruments.length &&
    !baseline.clauseSearch.clauses.length &&
    !baseline.lep.matchedInstrument
  ) {
    return null;
  }

  const siteBits = [
    baseline.site.address,
    baseline.site.lgaName ? `LGA: ${baseline.site.lgaName}` : null,
    baseline.site.zone ? `Zone: ${baseline.site.zone}` : null,
  ].filter(Boolean);
  const clauseLines = baseline.clauseSearch.clauses.map((clause) => {
    const title = clause.title ?? clause.clauseKey;
    return `- ${clause.instrumentName} (${clause.instrumentType}) ${clause.clauseKey} ${title}: ${clause.snippet}`;
  });
  const instrumentLine = baseline.instruments.length
    ? `Matched statutory instruments: ${baseline.instruments.join(", ")}.`
    : null;
  const lepLine = baseline.lep.matchedInstrument
    ? `LEP context: ${baseline.lep.instrumentName ?? baseline.lep.matchedInstrument} (${baseline.lep.clauseCount} loaded clauses).`
    : null;
  const clauseBlock = clauseLines.length
    ? `Retrieved LEP/SEPP clauses for this question:
${clauseLines.join("\n")}`
    : "No LEP/SEPP clause snippets were retrieved for this exact question.";

  return [
    "Statutory baseline: Use this LEP/SEPP context as the always-on factual backbone. Do not let missing DCP excerpts suppress available statutory context, and distinguish statutory controls from unresolved council DCP controls.",
    siteBits.length ? `Site: ${siteBits.join(" | ")}.` : null,
    instrumentLine,
    lepLine,
    clauseBlock,
  ]
    .filter(Boolean)
    .join("\n");
};

const buildStatutoryFallbackContext = (baseline: StatutoryBaseline) => {
  const clauseLines = baseline.clauseSearch.clauses
    .slice(0, 3)
    .map((clause) => {
      const title = clause.title ?? clause.clauseKey;
      return `- ${clause.instrumentName} ${clause.clauseKey} (${title}): ${clause.snippet}`;
    });

  if (clauseLines.length) {
    return `

Statutory context available now (separate from unresolved council DCP controls):
${clauseLines.join("\n")}

DCP status: council DCP numeric controls remain unresolved until matching DCP clauses are ingested/retrieved.`;
  }

  if (baseline.instruments.length || baseline.lep.matchedInstrument) {
    const matched = [
      baseline.lep.matchedInstrument,
      ...baseline.instruments,
    ].filter(Boolean);
    return `

Statutory context available now: matched ${matched.join(", ")}. No LEP/SEPP clause snippets were retrieved for this exact question yet, so I’m not going to invent statutory or DCP numbers.`;
  }

  return "";
};
const buildControlsInventoryReply = (params: {
  baseline: StatutoryBaseline;
  dcpAvailable: boolean;
  dcpHeadings: string[];
}) => {
  const { baseline } = params;
  const siteBits = [
    baseline.site.address,
    baseline.site.lgaName ? `LGA: ${baseline.site.lgaName}` : null,
    baseline.site.zone ? `Zone: ${baseline.site.zone}` : null,
  ].filter(Boolean);
  const lines = [
    siteBits.length
      ? `For ${siteBits.join(" | ")}, here is what Plannera can tell you from loaded, source-backed data right now.`
      : "Here is what Plannera can tell you from loaded, source-backed data right now.",
  ];

  const clauseLines = baseline.clauseSearch.clauses.map((clause) => {
    const title = clause.title ?? clause.clauseKey;
    return `- ${clause.instrumentName} ${clause.clauseKey} (${title}): ${clause.snippet}`;
  });

  lines.push("\n**Confirmed site context**");
  lines.push(`- Address: ${baseline.site.address ?? "not confirmed"}`);
  lines.push(
    `- LGA: ${baseline.site.lgaName ?? baseline.site.lgaCode ?? "not confirmed"}`,
  );
  lines.push(`- Zone: ${baseline.site.zone ?? "not confirmed"}`);

  lines.push("\n**Statutory controls currently available**");
  if (clauseLines.length) {
    lines.push(...clauseLines);
  } else if (baseline.instruments.length || baseline.lep.matchedInstrument) {
    const matched = [baseline.lep.matchedInstrument, ...baseline.instruments]
      .filter(Boolean)
      .join(", ");
    lines.push(
      `- Matched instruments: ${matched}. Clause search did not return specific excerpts for this broad controls question yet, so I will not summarise controls from memory.`,
    );
  } else {
    lines.push(
      "- No LEP/SEPP clause excerpts are currently available for this site in this request.",
    );
  }

  lines.push("\n**Council DCP controls**");
  if (params.dcpAvailable) {
    const headings = params.dcpHeadings.slice(0, 5);
    lines.push(
      headings.length
        ? `- DCP material is loaded. Retrieved DCP sections include: ${headings.map((heading) => `"${heading}"`).join(", ")}. Ask for a specific control and I will answer only from matching DCP clauses.`
        : "- DCP material is loaded, but no section headings were retrieved for this broad question. Ask for a specific control to retrieve matching clauses.",
    );
  } else {
    lines.push(
      "- Detailed council DCP numeric controls (for example setbacks, parking, landscaping, private open space and site coverage) are not available from retrieved DCP excerpts in this request, so I will not provide indicative figures.",
    );
  }

  lines.push("\n**Best next question**");
  lines.push(
    "- Ask a specific source-backed question such as: ‘is dual occupancy permitted under the LEP?’, ‘what height/FSR/minimum lot clauses are loaded?’, or ‘retrieve DCP setback clauses for this LGA’. I will answer with clause references where the data is available.",
  );

  return lines.join("\n");
};

const buildCoverageConfidencePrompt = (
  lgaLabel: string,
  coverageState: LgaCoverageMaturity | null,
) => {
  const state = coverageState ?? LgaCoverageMaturity.NOT_STARTED;
  if (state === LgaCoverageMaturity.VERIFIED) {
    return `Coverage status for ${lgaLabel}: VERIFIED. You may present local numeric controls as confirmed when backed by retrieved DCP/LEP excerpts, and cite those excerpts clearly.`;
  }
  return `Coverage status for ${lgaLabel}: ${state}. Treat local council controls as provisional only. Label local-control statements as inferred or unresolved unless directly quoted from retrieved excerpts. Do not frame local numeric controls as confirmed.`;
};

const hasExplicitDcpIntent = (message: string) =>
  DCP_INTENT_REGEX.test(message.toLowerCase());
const isControlsQuestion = (message: string) => {
  const normalised = message.toLowerCase();
  return CONTROL_KEYWORDS.some((keyword) => normalised.includes(keyword));
};
const shouldSearchDcpClauses = (message: string) => {
  const normalised = message.toLowerCase();
  return (
    hasExplicitDcpIntent(message) ||
    isControlsQuestion(message) ||
    DUAL_OCC_REGEX.test(normalised)
  );
};
const SETBACK_QUERY_REGEX = /(setback|set back)/i;
const hasSetbackEvidence = (text: string) => {
  const normalized = text.toLowerCase();
  const hasSetbackWord = /(setback|set back)/.test(normalized);
  const hasNumericMeasure =
    /\b\d+(?:\.\d+)?\s*m\b/.test(normalized) ||
    /\b45\s*degrees?\b/.test(normalized);
  const hasBoundaryContext =
    /\bfront\b/.test(normalized) ||
    /\bside\b/.test(normalized) ||
    /\brear\b/.test(normalized) ||
    /\bboundar(y|ies)\b/.test(normalized) ||
    /\bbuilding envelope\b/.test(normalized);
  return hasSetbackWord && hasNumericMeasure && hasBoundaryContext;
};
const buildEvidenceGapGuidance = (params: {
  lgaLabel: string;
  dualOccQuestion: boolean;
  clauseHeadings: string[];
  dcpChunkHeadings: string[];
}) => {
  const headingSample = [...params.clauseHeadings, ...params.dcpChunkHeadings]
    .filter(Boolean)
    .slice(0, 3);
  const availableSections = headingSample.length
    ? `Available retrieved sections right now: ${headingSample.map((heading) => `"${heading}"`).join(", ")}.`
    : "No relevant DCP section headings were retrieved for this query.";
  return `I can’t confirm ${params.dualOccQuestion ? "dual occupancy " : ""}setback requirements for ${params.lgaLabel} from the currently retrieved council excerpts. ${availableSections} I won’t infer numbers from memory. Next best step: ask me to extract the exact setback clause text (for example the Dual Occupancy / setbacks section) after it is ingested, and I will return clause-based numeric controls only.`;
};

const buildDcpClausePrompt = (
  clauses: DCPClause[],
  lgaLabel: string | null,
) => {
  if (!clauses.length) return null;
  const lines = clauses.map((clause) => {
    const heading = (
      clause.headingPath?.[clause.headingPath.length - 1] ??
      clause.title ??
      clause.ref ??
      "Clause"
    ).trim();
    const refLabel = clause.ref ? ` (${clause.ref})` : "";
    const snippet = clause.bodyText?.length
      ? clause.bodyText.slice(0, MAX_DCP_CLAUSE_TEXT).trimEnd() +
        (clause.bodyText.length > MAX_DCP_CLAUSE_TEXT ? "…" : "")
      : "";
    return `• ${heading}${refLabel}: ${snippet}`;
  });
  const headingLabel = lgaLabel
    ? `${lgaLabel} Development Control Plan clauses`
    : "Development Control Plan clauses";
  return `${headingLabel}: Use these council DCP controls as the primary source before LEP or SEPP guidance.\n${lines.join("\n")}`;
};

const requestSchema = z.object({
  message: z.string().min(1),
  projectId: z.string().optional(),
  projectName: z.string().optional(),
  debugSources: z.boolean().optional(),
  token: z.string().optional(),
});

type WorkspaceMemory = {
  messages: ChatCompletionMessageParam[];
  instruments: string[];
  lga: string | null;
  siteContext?: SiteContextSummary | null;
  lepData?: LepParseResult | null;
  lepContext?: LepContext | null;
  usedLepFallback?: boolean;
};

const workspaceMemory = new Map<string, WorkspaceMemory>();

const projectZoningSelect = {
  zoningCode: true,
  zoningName: true,
  zoningSource: true,
  lepData: true,
  dcpData: true,
} as const;

const getProjectZoningByExternalId = async (projectId: string) => {
  const project = await findProjectByExternalId(
    prisma,
    normalizeProjectId(projectId),
  );
  if (!project) return null;
  const { zoningCode, zoningName, zoningSource, lepData, dcpData } = project;
  return { zoningCode, zoningName, zoningSource, lepData, dcpData };
};

const getProjectZoningByInternalId = (projectId: string) =>
  prisma.project.findUnique({
    where: { id: projectId },
    select: projectZoningSelect,
  });

type ErrorWithResponse = {
  message?: string;
  status?: number;
  response?: {
    status?: number;
    data?: unknown;
  };
};

const getErrorDetails = (error: unknown) => {
  if (typeof error === "object" && error !== null) {
    const err = error as ErrorWithResponse & { name?: string; stack?: string };
    return {
      message: err.message,
      name: err.name,
      stack: err.stack,
      status: err.status ?? err.response?.status,
      data: err.response?.data,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
      status: undefined,
      data: undefined,
    };
  }

  return {
    message: typeof error === "string" ? error : undefined,
    name: undefined,
    stack: undefined,
    status: undefined,
    data: undefined,
  };
};

const buildLegislationContext = (params: {
  siteContext: SiteContextSummary | null;
  fallbackLga: string | null;
  instruments: string[];
  clauses: Awaited<ReturnType<typeof searchClauses>>;
  instrumentMatch: SiteInstrumentMatch | null;
  lepContext?: LepContext | null;
  lepUsedFallback: boolean;
}) => {
  const introParts: string[] = [];
  if (params.siteContext) {
    const siteBits = [params.siteContext.formattedAddress];
    if (params.siteContext.lgaName) {
      siteBits.push(`LGA: ${params.siteContext.lgaName}`);
    }
    if (params.siteContext.zone) {
      siteBits.push(`Zone: ${params.siteContext.zone}`);
    }
    introParts.push(`Site: ${siteBits.join(" | ")}`);
  } else if (params.fallbackLga) {
    introParts.push(`LGA: ${params.fallbackLga}`);
  }

  if (params.lepContext) {
    introParts.push(`LEP: ${params.lepContext.instrumentCode}`);
  } else if (
    params.instrumentMatch?.lepInstrumentSlug &&
    params.siteContext?.lgaName
  ) {
    const hasLepClauseSearchResults = params.clauses.some(
      (clause) => clause.instrumentType === "LEP",
    );
    introParts.push(
      hasLepClauseSearchResults
        ? `LEP: ${params.instrumentMatch.lepInstrumentSlug} matched for ${params.siteContext.lgaName}; retrieved LEP clause snippets are listed below.`
        : `LEP: ${params.instrumentMatch.lepInstrumentSlug} matched for ${params.siteContext.lgaName}, but no LEP clause snippets were retrieved for this exact question.`,
    );
  } else if (params.siteContext?.lgaName && params.lepUsedFallback) {
    introParts.push(
      `LEP: No direct LEP clauses available yet for ${params.siteContext.lgaName}; rely on NSW SEPPs and confirm with council or the official LEP.`,
    );
  }

  if (params.instruments.length) {
    introParts.push(`Instruments: ${params.instruments.join(", ")}`);
  }

  const clauseSummaries = params.clauses.slice(0, 8).map((clause) => {
    const title = clause.title ?? clause.clauseKey;
    return `${clause.instrumentName} • ${title}: ${clause.snippet}`;
  });

  if (!introParts.length && !clauseSummaries.length) {
    return null;
  }

  const preface = introParts.length ? introParts.join(" | ") : "";
  const clausesLabel = clauseSummaries.length
    ? `Key clauses:\n${clauseSummaries.join("\n")}`
    : "";
  return [preface, clausesLabel].filter(Boolean).join("\n");
};

const summarizeCandidates = (candidates: SiteCandidate[]) =>
  candidates.map((candidate) => ({
    id: candidate.id,
    formattedAddress: candidate.formattedAddress,
    lgaName: candidate.lgaName,
  }));

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const body = await request.json();
    const parsed = requestSchema.parse(body);
    const { message: userMessage, projectId, projectName } = parsed;
    const debugSources =
      parsed.debugSources === true ||
      ["1", "true"].includes(url.searchParams.get("debugSources") ?? "");

    if (debugSources && process.env.ADMIN_ACCESS_TOKEN) {
      const token = parsed.token ?? url.searchParams.get("token");
      if (token !== process.env.ADMIN_ACCESS_TOKEN) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
    }

    if (!hasPlanningChatProvider() && !debugSources) {
      throw new Error("Missing planning chat provider environment variable");
    }

    const workspaceKey = projectId ?? "default";
    const existingMemory = workspaceMemory.get(workspaceKey);

    let siteContextSummary: SiteContextSummary | null =
      existingMemory?.siteContext ?? null;
    let lepData: LepParseResult | null = existingMemory?.lepData ?? null;
    let lepContext: LepContext | null = existingMemory?.lepContext ?? null;
    let usedLepFallback = existingMemory?.usedLepFallback ?? false;
    let dcpClauses: Awaited<ReturnType<typeof getDCPContext>> = [];
    if (projectId) {
      try {
        const dbSite = await getSiteContextForProject(projectId);
        const project = await getProjectZoningByExternalId(projectId);
        lepData =
          (project?.lepData as LepParseResult | null | undefined) ?? lepData;
        siteContextSummary = serializeSiteContext(dbSite, project);
      } catch (siteLoadError) {
        console.warn(
          "[workspace-chat-warning] Failed to load stored site context",
          getErrorDetails(siteLoadError),
        );
      }
    }

    const wantsSiteChange = SITE_CHANGE_REGEX.test(userMessage);
    if (projectId && (!siteContextSummary || wantsSiteChange)) {
      const candidateAddress = extractCandidateAddress(userMessage);
      if (candidateAddress) {
        try {
          const resolution = await resolveSiteFromText(candidateAddress, {
            source: "chat",
          });
          if (resolution.status === "property_search_not_configured") {
            console.warn(
              "[chat-site-resolver]",
              "property search not configured; falling back to manual address",
            );
            return NextResponse.json({
              reply:
                "I can keep helping if you share the NSW suburb or council and the exact address—property search isn't configured here yet.",
              siteContext: siteContextSummary,
            });
          }
          if (
            resolution.status === "ok" &&
            resolution.decision === "auto" &&
            resolution.candidates[0]
          ) {
            const persisted = await persistSiteContextFromCandidate({
              projectId,
              addressInput: candidateAddress,
              candidate: resolution.candidates[0],
            });
            const project = await getProjectZoningByInternalId(
              persisted.projectId,
            );
            lepData =
              (project?.lepData as LepParseResult | null | undefined) ??
              lepData;
            siteContextSummary = serializeSiteContext(persisted, project);
          } else if (
            resolution.status === "ok" &&
            resolution.decision === "ambiguous"
          ) {
            return NextResponse.json({
              requiresSiteSelection: true,
              addressInput: candidateAddress,
              candidates: summarizeCandidates(resolution.candidates),
              siteContext: siteContextSummary,
            });
          } else {
            console.warn(
              "[workspace-chat-warning] Site resolution returned no matches",
              resolution.status,
            );
          }
        } catch (addressError) {
          console.warn(
            "[workspace-chat-warning] Failed to resolve address",
            getErrorDetails(addressError),
          );
        }
      }
    }

    const instrumentMatch = siteContextSummary
      ? resolveInstrumentsForSite(siteContextSummary)
      : null;
    const instrumentSlugs = instrumentMatch
      ? (Array.from(
          new Set([
            ...(instrumentMatch.lepInstrumentSlug
              ? [instrumentMatch.lepInstrumentSlug]
              : []),
            ...instrumentMatch.seppInstrumentSlugs,
          ]),
        ).filter(Boolean) as string[])
      : (existingMemory?.instruments ?? []);

    const fallbackLga =
      siteContextSummary?.lgaName ?? existingMemory?.lga ?? null;

    console.log("[workspace-chat] instrument resolution", {
      lgaName: siteContextSummary?.lgaName,
      lgaCode: siteContextSummary?.lgaCode,
      instrumentMatch,
      instrumentSlugs,
      fallbackLga,
    });

    if (siteContextSummary || fallbackLga) {
      const lepResolution = await getLepContextForProject({
        siteContext: siteContextSummary,
        fallbackLga,
        instrumentSlug: instrumentMatch?.lepInstrumentSlug,
      });
      lepContext = lepResolution.lepContext;
      usedLepFallback = lepResolution.usedFallback;
      console.log("[workspace-chat] LEP context resolution", {
        rawLga: lepResolution.rawLga,
        normalisedLga: lepResolution.normalisedLga,
        instruments: lepResolution.instruments?.map((instrument) => ({
          id: instrument.id,
          code: instrument.code,
          clauseCount: instrument.clauseCount,
        })),
        chosenInstrumentId: lepResolution.chosenInstrumentId,
        lepClauseCount: lepResolution.lepClauseCount,
        usedFallback: usedLepFallback,
      });
    }

    const userAskedForDcp = hasExplicitDcpIntent(userMessage);
    const controlsRelatedQuestion = isControlsQuestion(userMessage);
    const controlsInventoryQuestion =
      isControlsInventoryQuestion(userMessage) && !controlsRelatedQuestion;
    const dualOccQuestion = DUAL_OCC_REGEX.test(userMessage.toLowerCase());

    let clauses: Awaited<ReturnType<typeof searchClauses>> = [];
    if (instrumentSlugs.length) {
      try {
        clauses = await searchStatutoryClauses({
          message: userMessage,
          siteContext: siteContextSummary,
          instrumentSlugs,
          controlsInventoryQuestion,
        });
      } catch (clauseError) {
        console.warn(
          "[workspace-chat-warning] Failed to search clauses",
          getErrorDetails(clauseError),
        );
      }
    }

    console.log("[workspace-chat] legislation context", {
      lepContextInstrument: lepContext?.instrumentCode,
      lepClauses: lepContext?.clauses?.length ?? 0,
      clauseSearchCount: clauses.length,
      instrumentSlugs,
    });
    const legislationContext = buildLegislationContext({
      siteContext: siteContextSummary,
      fallbackLga,
      instruments: instrumentSlugs,
      clauses,
      instrumentMatch,
      lepContext,
      lepUsedFallback: usedLepFallback,
    });
    const statutoryBaseline = buildStatutoryBaseline({
      siteContext: siteContextSummary,
      instrumentSlugs,
      clauses,
      instrumentMatch,
      lepContext,
      usedLepFallback,
    });
    const statutoryBaselinePrompt =
      buildStatutoryBaselinePrompt(statutoryBaseline);

    let canonicalLgaCode = normalizeCouncilLgaCode(
      siteContextSummary?.lgaCode ?? siteContextSummary?.lgaName ?? fallbackLga,
    );
    let isByronLga = canonicalLgaCode === BYRON_LGA_CODE;
    const retrievalQuery =
      canonicalLgaCode === BYRON_LGA_CODE &&
      controlsRelatedQuestion &&
      dualOccQuestion
        ? `${userMessage} dual occupancy setbacks parking Chapter D1 Chapter B4 Byron DCP 2014`
        : userMessage;
    let sourceContextPrompt: string | null = null;
    let councilDcpPrompt: string | null = null;
    let lgaPreparationPrompt: string | null = null;
    let dcpGroundingPrompt: string | null = null;
    let dcpClausePrompt: string | null = null;
    let coverageConfidencePrompt: string | null = null;
    let forcedFallbackReply: string | null = null;
    let sourceContext: WorkspaceSourceContext | null = null;
    let dcpContext: WorkspaceSourceContext | null = null;
    let usedChunksForPrompt: WorkspaceSourceContext["chunks"] = [];
    const lgaCode = siteContextSummary?.lgaCode ?? null;
    const lgaName = siteContextSummary?.lgaName ?? null;
    try {
      sourceContext = await getWorkspaceSourceContext({
        projectId: projectId ?? null,
        lgaCode,
        lgaName,
        query: retrievalQuery,
        limit: userAskedForDcp ? 20 : 8,
        allowedSourceTypes: userAskedForDcp ? COUNCIL_DCP_TYPES : undefined,
      });

      canonicalLgaCode = sourceContext.canonicalLgaCode ?? canonicalLgaCode;
      isByronLga = canonicalLgaCode === BYRON_LGA_CODE;

      if (canonicalLgaCode && shouldSearchDcpClauses(userMessage)) {
        try {
          dcpClauses = await getDCPContext(canonicalLgaCode, retrievalQuery);
        } catch (dcpError) {
          console.warn(
            "[workspace-chat-warning] Failed to search DCP clauses",
            getErrorDetails(dcpError),
          );
        }
      }

      if ((isByronLga && controlsRelatedQuestion) || userAskedForDcp) {
        dcpContext = userAskedForDcp
          ? sourceContext
          : await getWorkspaceSourceContext({
              projectId: projectId ?? null,
              lgaCode: BYRON_LGA_CODE,
              lgaName,
              query: retrievalQuery,
              limit: 20,
              allowedSourceTypes: COUNCIL_DCP_TYPES,
            });
      }

      if (process.env.NODE_ENV !== "production") {
        const dcpTotals = (dcpContext ?? sourceContext)?.perSourceTotals ?? {};
        console.log("[workspace-chat] DCP prompt debug", {
          canonicalLgaCode: sourceContext.canonicalLgaCode,
          hasCouncilDcp: (dcpContext ?? sourceContext)?.hasCouncilDcp,
          councilDcpChunkCount: dcpTotals[WorkspaceSourceType.council_dcp] ?? 0,
          councilDcpSampleHeadings: (
            dcpContext ?? sourceContext
          )?.councilDcpSampleHeadings.slice(0, 5),
        });
      }

      const baseChunks = sourceContext?.chunks ?? [];
      const dcpChunks = (dcpContext ?? sourceContext)?.chunks.filter((chunk) =>
        COUNCIL_DCP_TYPES.includes(chunk.sourceType),
      );
      const hasDcpClauses = dcpClauses.length > 0;
      const hasDcpChunks = (dcpChunks?.length ?? 0) > 0;

      if (
        isByronLga &&
        controlsRelatedQuestion &&
        dualOccQuestion &&
        dcpChunks?.length
      ) {
        dcpChunks.sort((a, b) => {
          const boost = (chunk: (typeof dcpChunks)[number]) => {
            const heading = (chunk.heading ?? "").toLowerCase();
            const content = chunk.content.toLowerCase();
            const metadata =
              chunk.metadata &&
              typeof chunk.metadata === "object" &&
              !Array.isArray(chunk.metadata)
                ? (chunk.metadata as Record<string, unknown>)
                : null;
            const clauseKey =
              typeof metadata?.clauseKey === "string"
                ? metadata.clauseKey.toLowerCase()
                : "";
            const instrumentSlug =
              typeof metadata?.instrumentSlug === "string"
                ? metadata.instrumentSlug.toLowerCase()
                : "";
            let score = 0;
            if (
              DUAL_OCC_REGEX.test(heading) ||
              DUAL_OCC_REGEX.test(content) ||
              DUAL_OCC_REGEX.test(clauseKey)
            ) {
              score += 2;
            }
            if (
              /\bd1\b|chapter d1/.test(
                `${heading} ${clauseKey} ${instrumentSlug}`,
              )
            ) {
              score += 1;
            }
            if (
              /\bb4\b|chapter b4/.test(
                `${heading} ${clauseKey} ${instrumentSlug}`,
              )
            ) {
              score += 1;
            }
            return score;
          };
          return boost(b) - boost(a);
        });
      }

      if (userAskedForDcp) {
        usedChunksForPrompt = dcpChunks ?? [];
      } else if (isByronLga && controlsRelatedQuestion && dcpChunks?.length) {
        usedChunksForPrompt = dcpChunks;
      } else if (dcpChunks?.length) {
        const seen = new Set<string>();
        usedChunksForPrompt = [...dcpChunks];
        dcpChunks.forEach((chunk) => seen.add(chunk.id));
        for (const chunk of baseChunks) {
          if (!seen.has(chunk.id)) {
            usedChunksForPrompt.push(chunk);
            seen.add(chunk.id);
          }
        }
      } else {
        usedChunksForPrompt = baseChunks;
      }

      const lgaLabel = lgaName ?? canonicalLgaCode;
      const coverageState = canonicalLgaCode
        ? ((
            await prisma.lgaCoverageState.findUnique({
              where: { lgaCode: canonicalLgaCode },
              select: { state: true },
            })
          )?.state ?? null)
        : null;
      if (lgaLabel) {
        coverageConfidencePrompt = buildCoverageConfidencePrompt(
          lgaLabel,
          coverageState,
        );
      }
      const activeDcpContext = dcpContext ?? sourceContext;
      dcpClausePrompt = buildDcpClausePrompt(dcpClauses, lgaLabel);
      if ((hasDcpChunks || hasDcpClauses) && canonicalLgaCode) {
        const dcpEvidenceText = [
          ...dcpClauses.map((clause) =>
            [
              clause.title ?? "",
              clause.ref ?? "",
              clause.headingPath?.join(" ") ?? "",
              clause.bodyText ?? "",
            ].join(" "),
          ),
          ...(dcpChunks ?? []).map(
            (chunk) => `${chunk.heading ?? ""} ${chunk.content}`,
          ),
        ]
          .join("\n")
          .toLowerCase();
        const queryNeedsSetbackEvidence =
          controlsRelatedQuestion && SETBACK_QUERY_REGEX.test(userMessage);
        const missingSetbackEvidence =
          queryNeedsSetbackEvidence && !hasSetbackEvidence(dcpEvidenceText);
        const missingDualOccEvidence =
          dualOccQuestion &&
          !/\bdual occupanc(y|ies)|duplex\b/i.test(dcpEvidenceText);
        const clauseHeadingSamples = dcpClauses
          .map(
            (clause) =>
              clause.headingPath?.[clause.headingPath.length - 1] ??
              clause.title,
          )
          .filter((heading): heading is string => Boolean(heading))
          .slice(0, 5);
        const dcpChunkHeadingSamples = (dcpChunks ?? [])
          .map((chunk) => chunk.heading)
          .filter((heading): heading is string => Boolean(heading))
          .slice(0, 5);
        if (missingSetbackEvidence || missingDualOccEvidence) {
          forcedFallbackReply = buildEvidenceGapGuidance({
            lgaLabel: lgaLabel ?? canonicalLgaCode,
            dualOccQuestion,
            clauseHeadings: clauseHeadingSamples,
            dcpChunkHeadings: dcpChunkHeadingSamples,
          });
        }
        const headingLines = (
          activeDcpContext?.councilDcpSampleHeadings?.length
            ? activeDcpContext?.councilDcpSampleHeadings
            : clauseHeadingSamples
        )
          .map((heading) => `- ${heading}`)
          .join("\n");
        councilDcpPrompt = `You have access to ${lgaLabel ?? "the relevant LGA"} Development Control Plan (DCP) content for LGA code ${canonicalLgaCode}.
Use these council DCP sections as the primary source when answering questions about detailed design controls (for example setbacks, parking, landscaping, and built form):
${headingLines}
When the user asks about local controls, rely first on the council Development Control Plan content provided and state that your answer is based on that DCP. You may add NSW guidance for additional context.`;
        const dcpNameLabel = isByronLga
          ? "Byron Shire DCP 2014"
          : "this council DCP";
        const dcpHasSpecificFigures =
          hasDcpClauses &&
          dcpClauses.some((clause) => /\d/.test(clause.bodyText ?? ""))
            ? true
            : (dcpChunks ?? []).some((chunk) => /\d/.test(chunk.content));
        dcpGroundingPrompt = `DCP grounding: The user is asking about development controls. Use the provided ${dcpNameLabel} excerpts as your primary source. Quote numeric requirements directly and cite the clause or section heading referenced in the source bullets or metadata labels. Do not invent measurements or parking rates that are not visible in the DCP excerpts. Avoid hedging phrases when values are present. If the provided DCP excerpts do not cover a control, say that the excerpts do not specify it instead of guessing.`;
        if (controlsRelatedQuestion) {
          dcpGroundingPrompt +=
            " Be directly useful: when numeric values are present in the excerpts, provide a concise control-by-control list (for example front setback, side setback, rear setback, parking) with the exact figures and their source heading.";
        }
        if (userAskedForDcp) {
          dcpGroundingPrompt +=
            " Answer solely from the DCP excerpts unless noting that no relevant clause is available.";
        }
        if (isByronLga && controlsRelatedQuestion) {
          dcpGroundingPrompt +=
            " For Byron Shire questions, answer using the Byron DCP 2014 text provided and avoid generic NSW priors. Reference Chapter D1 for built form/setbacks and Chapter B4 for parking when relevant. Do not use phrases like 'typically' or 'generally' when quoting controls; if the excerpt is silent, say so explicitly instead of inventing a number.";
          if (dualOccQuestion) {
            dcpGroundingPrompt +=
              " For dual occupancy queries, focus on DCP clauses labelled Dual Occupancy or Medium Density in Chapters D1 and B4, and quote their stated setback and parking controls directly. Do not substitute generic 6 m setbacks or blanket 2 spaces per dwelling if those numbers are not visible in the provided excerpts.";
          }
        }
        if (!dcpHasSpecificFigures) {
          dcpGroundingPrompt +=
            " If no numeric requirements appear in the supplied DCP excerpts, explicitly state that the excerpts do not give a specific figure rather than inferring typical controls.";
        }
      } else if (userAskedForDcp) {
        councilDcpPrompt = `The user asked for Development Control Plan requirements, but no DCP excerpts are available for ${lgaLabel ?? "this LGA"}. Explain that you cannot quote local DCP controls. Do not provide specific numeric controls (for example setbacks, POS areas, heights, or parking rates) from memory. If asked for figures, state the local controls are unavailable in this workspace and direct the user to official council LEP/DCP sources for exact numbers.`;
        if (controlsRelatedQuestion) {
          forcedFallbackReply = `I can’t confirm local numeric controls for ${lgaLabel ?? "this LGA"} yet because no council DCP excerpts are available in this workspace. I won’t provide indicative setback, parking, height, or POS figures from memory. If you need exact numbers now, check the official council LEP/DCP documents or contact council planning; once local controls are ingested here, I can give clause-based figures with citations.`;
        }
      } else if (lgaLabel) {
        councilDcpPrompt = `This workspace does not yet have the council DCP ingested for ${lgaLabel}. State that local controls are still being prepared and that exact local numeric requirements cannot be confirmed yet. Do not provide specific numeric controls (for example setbacks, POS areas, heights, or parking rates) from memory; keep guidance high-level only and direct the user to official council LEP/DCP sources for exact figures.`;
        if (controlsRelatedQuestion) {
          forcedFallbackReply = `I can’t confirm local numeric controls for ${lgaLabel} yet because council controls are still being prepared in this workspace. I won’t provide indicative setback, parking, height, or POS figures from memory. Please use the official council LEP/DCP documents for exact current numbers, and then ask again here once ingestion completes for clause-based answers.`;
        }
        if (canonicalLgaCode && canonicalLgaCode !== BYRON_LGA_CODE) {
          try {
            const queueResult = await queueLgaPreparation({
              lgaCode: canonicalLgaCode,
              projectId: projectId,
            });
            lgaPreparationPrompt = queueResult.queued
              ? `Local controls for ${lgaLabel ?? canonicalLgaCode} are now being prepared in the background. Tell the user preparation has started and they can ask follow-up DCP questions shortly for clause-level answers.`
              : `Local controls for ${lgaLabel ?? canonicalLgaCode} are still preparing in the background (existing preparation job active). Tell the user preparation is already in progress and avoid repeating the same generic fallback wording.`;
          } catch (queueError) {
            console.warn(
              "[workspace-chat-warning] Failed to queue LGA preparation",
              {
                lgaCode: canonicalLgaCode,
                error: getErrorDetails(queueError),
              },
            );
          }
        }
      }

      if (controlsInventoryQuestion) {
        const activeDcpContext = dcpContext ?? sourceContext;
        forcedFallbackReply = buildControlsInventoryReply({
          baseline: statutoryBaseline,
          dcpAvailable: activeDcpContext?.hasCouncilDcp ?? false,
          dcpHeadings: activeDcpContext?.councilDcpSampleHeadings ?? [],
        });
      }

      sourceContextPrompt = buildWorkspaceSourcePrompt(usedChunksForPrompt);
    } catch (sourceError) {
      console.warn(
        "[workspace-chat-warning] Failed to retrieve workspace sources",
        getErrorDetails(sourceError),
      );
    }

    const siteContextMessage = buildSiteContextMessage(
      siteContextSummary,
      lepData,
    );
    const lepContextMessage = buildLepPromptMessage(lepContext);

    const historyMessages = existingMemory?.messages ?? [];
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    if (siteContextMessage) {
      messages.push({ role: "system", content: siteContextMessage });
    }

    if (dcpClausePrompt) {
      messages.push({ role: "system", content: dcpClausePrompt });
    }

    if (lepContextMessage) {
      messages.push({ role: "system", content: lepContextMessage });
    }

    if (!siteContextSummary) {
      messages.push({
        role: "system",
        content:
          "No SiteContext is confirmed. Ask the user for the NSW suburb, council, or exact address before quoting detailed controls.",
      });
      if (controlsRelatedQuestion) {
        forcedFallbackReply =
          "I don’t have a confirmed site in this workspace yet, so I can’t verify local DCP controls for your property. Please share the exact NSW address (or suburb + council), and I’ll resolve the site first. Until then, I won’t provide indicative numeric setbacks, parking rates, heights, or POS figures from memory.";
      }
    }

    if (legislationContext) {
      messages.push({
        role: "system",
        content: `Site context:\n${legislationContext}`,
      });
    }

    if (statutoryBaselinePrompt) {
      messages.push({ role: "system", content: statutoryBaselinePrompt });
    }

    if (councilDcpPrompt) {
      messages.push({ role: "system", content: councilDcpPrompt });
    }

    if (lgaPreparationPrompt) {
      messages.push({ role: "system", content: lgaPreparationPrompt });
    }

    if (dcpGroundingPrompt) {
      messages.push({ role: "system", content: dcpGroundingPrompt });
    }

    if (coverageConfidencePrompt) {
      messages.push({ role: "system", content: coverageConfidencePrompt });
    }

    if (sourceContextPrompt) {
      messages.push({ role: "system", content: sourceContextPrompt });
    }

    messages.push(...historyMessages);
    messages.push({ role: "user", content: userMessage });

    if (forcedFallbackReply) {
      forcedFallbackReply += buildStatutoryFallbackContext(statutoryBaseline);
    }

    if (debugSources) {
      const systemPrompt = messages
        .filter((message) => message.role === "system")
        .map((message) =>
          typeof message.content === "string" ? message.content : "",
        )
        .join("\n\n");

      return NextResponse.json({
        debug: true,
        workspaceId: projectId ?? null,
        site: {
          address: siteContextSummary?.formattedAddress ?? null,
          canonicalLgaCode: sourceContext?.canonicalLgaCode ?? null,
        },
        dcp: {
          hasCouncilDcp: (dcpContext ?? sourceContext)?.hasCouncilDcp ?? false,
          coverageConfidencePrompt,
          forcedFallbackReply,
          perSourceTotals: (dcpContext ?? sourceContext)?.perSourceTotals ?? {},
          sampleHeadings:
            (dcpContext ?? sourceContext)?.councilDcpSampleHeadings?.slice(
              0,
              10,
            ) ?? [],
        },
        statutoryBaseline,
        dcpClauses: dcpClauses.slice(0, 5).map((clause) => ({
          ref: clause.ref,
          title: clause.title,
          heading: clause.headingPath?.[clause.headingPath.length - 1] ?? null,
          preview: clause.bodyText?.slice(0, 180) ?? null,
        })),
        usedChunks:
          usedChunksForPrompt.map((chunk) => ({
            id: chunk.id,
            lgaCode: chunk.lgaCode,
            sourceType: chunk.sourceType,
            heading: chunk.heading,
            contentPreview: chunk.content.slice(0, 200),
          })) ?? [],
        promptPreview: {
          system: systemPrompt.slice(0, 2000),
          messagesCount: messages.length,
        },
      });
    }

    const reply = forcedFallbackReply
      ? forcedFallbackReply
      : await (async () => {
          try {
            return await callModel("planning_chat", messages, {
              maxTokens: 512,
            });
          } catch (error) {
            console.error("[model-router-error]", getErrorDetails(error));
            throw error;
          }
        })();

    const updatedHistory: ChatCompletionMessageParam[] = [
      ...historyMessages,
      { role: "user", content: userMessage } as ChatCompletionMessageParam,
      { role: "assistant", content: reply } as ChatCompletionMessageParam,
    ].slice(-20);

    workspaceMemory.set(workspaceKey, {
      messages: updatedHistory,
      instruments: instrumentSlugs,
      lga: fallbackLga,
      siteContext: siteContextSummary,
      lepData,
      lepContext,
      usedLepFallback,
    });

    return NextResponse.json({
      reply,
      lga: fallbackLga,
      zone: siteContextSummary?.zone ?? null,
      projectName,
      instruments: instrumentSlugs,
      siteContext: siteContextSummary,
      dcpContext: dcpClauses,
    });
  } catch (error) {
    console.error("[workspace-chat-error]", getErrorDetails(error));
    return NextResponse.json(
      {
        error: "assistant_unavailable",
        message:
          "The planning assistant is unavailable right now. Please try again shortly.",
      },
      { status: 500 },
    );
  }
}
