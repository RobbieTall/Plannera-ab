import { NextResponse } from "next/server";
import OpenAI from "openai";
import { type ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { z } from "zod";

import { WorkspaceSourceType } from "@prisma/client";

import { searchClauses } from "@/lib/legislation";
import {
  getSiteContextForProject,
  persistSiteContextFromCandidate,
  resolveInstrumentsForSite,
  serializeSiteContext,
  type SiteInstrumentMatch,
} from "@/lib/site-context";
import { prisma } from "@/lib/prisma";
import { findProjectByExternalId, normalizeProjectId } from "@/lib/project-identifiers";
import { extractCandidateAddress, resolveSiteFromText } from "@/lib/site-resolver";
import type { SiteCandidate, SiteContextSummary } from "@/types/site";
import { buildSiteContextMessage } from "@/lib/chat/site-context-message";
import type { LepParseResult } from "@/lib/lep/types";
import {
  buildLepPromptMessage,
  getLepContextForProject,
  type LepContext,
} from "@/lib/lep/lep-context";
import {
  buildWorkspaceSourcePrompt,
  COUNCIL_DCP_TYPES,
  getWorkspaceSourceContext,
  type WorkspaceSourceContext,
} from "@/lib/workspace-source-context";
import { normalizeCouncilLgaCode } from "@/lib/council/lga-normaliser";

const SYSTEM_PROMPT = `You are Plannera, an NSW planning assistant.
Always read the user's question literally.
Never invent user messages or assume multiple questions.
If no SiteContext is available, ask for the NSW suburb, council or address before quoting detailed controls.
Use provided site context (address, LGA, zone, LEP, SEPP) whenever available and reference the LGA name in your answer.
In all answers, rely on any provided site details and do not ask the user to repeat an address that is already set.
If a relevant LEP is not yet in Plannera, clearly explain that you are answering at a higher/state level using NSW SEPPs.`;

const SITE_CHANGE_REGEX = /(change|update|set).*(site|address|property)|new site|different (?:address|property)/i;

const DCP_INTENT_REGEX = /(\bdcp\b|development control plan)/i;
const CONTROL_KEYWORDS = [
  "setback",
  "set back",
  "height",
  "storey",
  "story",
  "parking",
  "car space",
  "carpark",
  "driveway",
  "garage",
  "landscaping",
  "landscape",
  "private open space",
  "pos",
  "site coverage",
  "floor space ratio",
  "fsr",
  "building envelope",
  "dual occupancy",
  "duplex",
];
const BYRON_LGA_CODE = "BYRON";

const hasExplicitDcpIntent = (message: string) => DCP_INTENT_REGEX.test(message.toLowerCase());
const isControlsQuestion = (message: string) => {
  const normalised = message.toLowerCase();
  return CONTROL_KEYWORDS.some((keyword) => normalised.includes(keyword));
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
  const project = await findProjectByExternalId(prisma, normalizeProjectId(projectId));
  if (!project) return null;
  const { zoningCode, zoningName, zoningSource, lepData, dcpData } = project;
  return { zoningCode, zoningName, zoningSource, lepData, dcpData };
};

const getProjectZoningByInternalId = (projectId: string) =>
  prisma.project.findUnique({ where: { id: projectId }, select: projectZoningSelect });

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
  } else if (params.instrumentMatch?.lepInstrumentSlug && params.siteContext?.lgaName) {
    introParts.push(
      `LEP: ${params.instrumentMatch.lepInstrumentSlug} is not yet available for ${params.siteContext.lgaName}; rely on NSW SEPPs and confirm with council or the official LEP.`,
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
  const clausesLabel = clauseSummaries.length ? `Key clauses:\n${clauseSummaries.join("\n")}` : "";
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

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey && !debugSources) {
      throw new Error("Missing OPENAI_API_KEY environment variable");
    }

    const workspaceKey = projectId ?? "default";
    const existingMemory = workspaceMemory.get(workspaceKey);

    let siteContextSummary: SiteContextSummary | null = existingMemory?.siteContext ?? null;
    let lepData: LepParseResult | null = existingMemory?.lepData ?? null;
    let lepContext: LepContext | null = existingMemory?.lepContext ?? null;
    let usedLepFallback = existingMemory?.usedLepFallback ?? false;
    if (projectId) {
      try {
        const dbSite = await getSiteContextForProject(projectId);
        const project = await getProjectZoningByExternalId(projectId);
        lepData = (project?.lepData as LepParseResult | null | undefined) ?? lepData;
        siteContextSummary = serializeSiteContext(dbSite, project);
      } catch (siteLoadError) {
        console.warn("[workspace-chat-warning] Failed to load stored site context", getErrorDetails(siteLoadError));
      }
    }

    const wantsSiteChange = SITE_CHANGE_REGEX.test(userMessage);
    if (projectId && (!siteContextSummary || wantsSiteChange)) {
      const candidateAddress = extractCandidateAddress(userMessage);
      if (candidateAddress) {
        try {
          const resolution = await resolveSiteFromText(candidateAddress, { source: "chat" });
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
          if (resolution.status === "ok" && resolution.decision === "auto" && resolution.candidates[0]) {
            const persisted = await persistSiteContextFromCandidate({
              projectId,
              addressInput: candidateAddress,
              candidate: resolution.candidates[0],
            });
            const project = await getProjectZoningByInternalId(persisted.projectId);
            lepData = (project?.lepData as LepParseResult | null | undefined) ?? lepData;
            siteContextSummary = serializeSiteContext(persisted, project);
          } else if (resolution.status === "ok" && resolution.decision === "ambiguous") {
            return NextResponse.json({
              requiresSiteSelection: true,
              addressInput: candidateAddress,
              candidates: summarizeCandidates(resolution.candidates),
              siteContext: siteContextSummary,
            });
          } else {
            console.warn("[workspace-chat-warning] Site resolution returned no matches", resolution.status);
          }
        } catch (addressError) {
          console.warn("[workspace-chat-warning] Failed to resolve address", getErrorDetails(addressError));
        }
      }
    }

    const instrumentMatch = siteContextSummary ? resolveInstrumentsForSite(siteContextSummary) : null;
    const instrumentSlugs = instrumentMatch
      ? Array.from(
          new Set([
            ...(instrumentMatch.lepInstrumentSlug ? [instrumentMatch.lepInstrumentSlug] : []),
            ...instrumentMatch.seppInstrumentSlugs,
          ]),
        ).filter(Boolean) as string[]
      : existingMemory?.instruments ?? [];

    const fallbackLga = siteContextSummary?.lgaName ?? existingMemory?.lga ?? null;

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

    let clauses: Awaited<ReturnType<typeof searchClauses>> = [];
    if (instrumentSlugs.length) {
      try {
        clauses = await searchClauses({
          query: userMessage,
          instrumentSlugs,
          instrumentTypes: ["LEP", "SEPP"],
          limit: 12,
        });
      } catch (clauseError) {
        console.warn("[workspace-chat-warning] Failed to search clauses", getErrorDetails(clauseError));
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

    const userAskedForDcp = hasExplicitDcpIntent(userMessage);
    const controlsRelatedQuestion = isControlsQuestion(userMessage);
    let sourceContextPrompt: string | null = null;
    let councilDcpPrompt: string | null = null;
    let dcpGroundingPrompt: string | null = null;
    let sourceContext: WorkspaceSourceContext | null = null;
    let dcpContext: WorkspaceSourceContext | null = null;
    let canonicalLgaCode = normalizeCouncilLgaCode(
      siteContextSummary?.lgaCode ?? siteContextSummary?.lgaName ?? fallbackLga,
    );
    let isByronLga = canonicalLgaCode === BYRON_LGA_CODE;
    let usedChunksForPrompt: WorkspaceSourceContext["chunks"] = [];
    const lgaCode = siteContextSummary?.lgaCode ?? null;
    const lgaName = siteContextSummary?.lgaName ?? null;
    try {
      sourceContext = await getWorkspaceSourceContext({
        projectId: projectId ?? null,
        lgaCode,
        lgaName,
        query: userMessage,
        limit: userAskedForDcp ? 20 : 8,
        allowedSourceTypes: userAskedForDcp ? COUNCIL_DCP_TYPES : undefined,
      });

      canonicalLgaCode = sourceContext.canonicalLgaCode ?? canonicalLgaCode;
      isByronLga = canonicalLgaCode === BYRON_LGA_CODE;

      if ((isByronLga && controlsRelatedQuestion) || userAskedForDcp) {
        dcpContext = userAskedForDcp
          ? sourceContext
          : await getWorkspaceSourceContext({
              projectId: projectId ?? null,
              lgaCode: BYRON_LGA_CODE,
              lgaName,
              query: userMessage,
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
          councilDcpSampleHeadings: (dcpContext ?? sourceContext)?.councilDcpSampleHeadings.slice(0, 5),
        });
      }

      const baseChunks = sourceContext?.chunks ?? [];
      const dcpChunks = (dcpContext ?? sourceContext)?.chunks.filter((chunk) =>
        COUNCIL_DCP_TYPES.includes(chunk.sourceType),
      );

      if (userAskedForDcp) {
        usedChunksForPrompt = dcpChunks ?? [];
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
      const activeDcpContext = dcpContext ?? sourceContext;
      if ((dcpChunks?.length ?? 0) > 0 && canonicalLgaCode) {
        const headingLines = (activeDcpContext?.councilDcpSampleHeadings ?? [])
          .map((heading) => `- ${heading}`)
          .join("\n");
        councilDcpPrompt = `You have access to ${lgaLabel ?? "the relevant LGA"} Development Control Plan (DCP) content for LGA code ${canonicalLgaCode}.
Use these council DCP sections as the primary source when answering questions about detailed design controls (for example setbacks, parking, landscaping, and built form):
${headingLines}
When the user asks about local controls, rely first on the council Development Control Plan content provided and state that your answer is based on that DCP. You may add NSW guidance for additional context.`;
        const dcpNameLabel = isByronLga ? "Byron Shire DCP 2014" : "this council DCP";
        dcpGroundingPrompt = `DCP grounding: The user is asking about development controls. Use the provided ${dcpNameLabel} excerpts as your primary source. Quote numeric requirements directly and cite the clause or section heading referenced in the source bullets. Avoid hedging phrases when values are present. If the provided DCP excerpts do not cover a control, say that the excerpts do not specify it instead of guessing.`;
        if (userAskedForDcp) {
          dcpGroundingPrompt += " Answer solely from the DCP excerpts unless noting that no relevant clause is available.";
        }
      } else if (userAskedForDcp) {
        councilDcpPrompt =
          `The user asked for Development Control Plan requirements, but no DCP excerpts are available for ${lgaLabel ?? "this LGA"}. Explain that you cannot quote local DCP controls and avoid inventing numbers.`;
      } else if (lgaLabel) {
        councilDcpPrompt =
          `This workspace does not yet have the council DCP ingested for ${lgaLabel}. I can only provide general NSW guidance. For exact local controls, refer to the council DCP.`;
      }

      sourceContextPrompt = buildWorkspaceSourcePrompt(usedChunksForPrompt);
    } catch (sourceError) {
      console.warn("[workspace-chat-warning] Failed to retrieve workspace sources", getErrorDetails(sourceError));
    }

    const siteContextMessage = buildSiteContextMessage(siteContextSummary, lepData);
    const lepContextMessage = buildLepPromptMessage(lepContext);

    const historyMessages = existingMemory?.messages ?? [];
    const messages: ChatCompletionMessageParam[] = [{ role: "system", content: SYSTEM_PROMPT }];

    if (siteContextMessage) {
      messages.push({ role: "system", content: siteContextMessage });
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
    }

    if (legislationContext) {
      messages.push({ role: "system", content: `Site context:\n${legislationContext}` });
    }

    if (councilDcpPrompt) {
      messages.push({ role: "system", content: councilDcpPrompt });
    }

    if (dcpGroundingPrompt) {
      messages.push({ role: "system", content: dcpGroundingPrompt });
    }

    if (sourceContextPrompt) {
      messages.push({ role: "system", content: sourceContextPrompt });
    }

    messages.push(...historyMessages);
    messages.push({ role: "user", content: userMessage });

    if (debugSources) {
      const systemPrompt = messages
        .filter((message) => message.role === "system")
        .map((message) => (typeof message.content === "string" ? message.content : ""))
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
          perSourceTotals: (dcpContext ?? sourceContext)?.perSourceTotals ?? {},
          sampleHeadings: (dcpContext ?? sourceContext)?.councilDcpSampleHeadings?.slice(0, 10) ?? [],
        },
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

    if (!apiKey) {
      throw new Error("Missing OPENAI_API_KEY environment variable");
    }
    const client = new OpenAI({ apiKey });

    const reply = await (async () => {
      try {
        const completion = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages,
          max_tokens: 512,
        });

        const aiReply = completion.choices?.[0]?.message?.content;
        if (!aiReply) {
          throw new Error("Empty response from OpenAI");
        }
        return aiReply;
      } catch (error) {
        console.error("[openai-chat-error]", getErrorDetails(error));
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
    });
  } catch (error) {
    console.error("[workspace-chat-error]", getErrorDetails(error));
    return NextResponse.json(
      {
        error: "assistant_unavailable",
        message: "The planning assistant is unavailable right now. Please try again shortly.",
      },
      { status: 500 },
    );
  }
}
