import { NextResponse } from "next/server";
import OpenAI from "openai";
import { type ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { z } from "zod";

import { searchClauses } from "@/lib/legislation";
import {
  decideSiteFromCandidates,
  extractCandidateAddress,
  getSiteContextForProject,
  persistSiteContextFromCandidate,
  resolveAddressToSite,
  resolveInstrumentsForSite,
  serializeSiteContext,
  type SiteInstrumentMatch,
} from "@/lib/site-context";
import type { SiteCandidate, SiteContextSummary } from "@/types/site";

const SYSTEM_PROMPT = `You are Plannera, an NSW planning assistant.
Always read the user's question literally.
Never invent user messages or assume multiple questions.
If no SiteContext is available, ask for the NSW suburb, council or address before quoting detailed controls.
Use provided site context (address, LGA, zone, LEP, SEPP) whenever available and reference the LGA name in your answer.
If a relevant LEP is not yet in Plannera, clearly explain that you are answering at a higher/state level using NSW SEPPs.`;

const SITE_CHANGE_REGEX = /(change|update|set).*(site|address|property)|new site|different (?:address|property)/i;

const requestSchema = z.object({
  message: z.string().min(1),
  projectId: z.string().optional(),
  projectName: z.string().optional(),
  isDemo: z.boolean().optional(),
});

type WorkspaceMemory = {
  messages: ChatCompletionMessageParam[];
  instruments: string[];
  lga: string | null;
  siteContext?: SiteContextSummary | null;
};

const workspaceMemory = new Map<string, WorkspaceMemory>();

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

  if (params.instrumentMatch?.lepInstrumentSlug) {
    introParts.push(`LEP: ${params.instrumentMatch.lepInstrumentSlug}`);
  } else if (params.siteContext?.lgaName) {
    introParts.push(`LEP: Not yet ingested for ${params.siteContext.lgaName}`);
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
    const body = await request.json();
    const { message: userMessage, projectId, projectName, isDemo } = requestSchema.parse(body);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey && !isDemo) {
      throw new Error("Missing OPENAI_API_KEY environment variable");
    }

    const workspaceKey = projectId ?? "default";
    const existingMemory = workspaceMemory.get(workspaceKey);

    let siteContextSummary: SiteContextSummary | null = existingMemory?.siteContext ?? null;
    if (projectId) {
      try {
        const dbSite = await getSiteContextForProject(projectId);
        siteContextSummary = serializeSiteContext(dbSite);
      } catch (siteLoadError) {
        console.warn("[workspace-chat-warning] Failed to load stored site context", getErrorDetails(siteLoadError));
      }
    }

    const wantsSiteChange = SITE_CHANGE_REGEX.test(userMessage);
    if (projectId && (!siteContextSummary || wantsSiteChange)) {
      const candidateAddress = extractCandidateAddress(userMessage);
      if (candidateAddress) {
        try {
          const candidates = await resolveAddressToSite(candidateAddress);
          const decision = decideSiteFromCandidates(candidates);
          if (decision === "auto" && candidates[0]) {
            const persisted = await persistSiteContextFromCandidate({
              projectId,
              addressInput: candidateAddress,
              candidate: candidates[0],
            });
            siteContextSummary = serializeSiteContext(persisted);
          } else if (decision === "ambiguous") {
            return NextResponse.json({
              requiresSiteSelection: true,
              addressInput: candidateAddress,
              candidates: summarizeCandidates(candidates),
              siteContext: siteContextSummary,
            });
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

    const fallbackLga = siteContextSummary?.lgaName ?? existingMemory?.lga ?? null;
    const legislationContext = buildLegislationContext({
      siteContext: siteContextSummary,
      fallbackLga,
      instruments: instrumentSlugs,
      clauses,
      instrumentMatch,
    });

    const historyMessages = existingMemory?.messages ?? [];
    const messages: ChatCompletionMessageParam[] = [{ role: "system", content: SYSTEM_PROMPT }];

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

    messages.push(...historyMessages);
    messages.push({ role: "user", content: userMessage });

    const reply = isDemo
      ? "This is a demo response. Provide a real address or LGA for full analysis."
      : await (async () => {
          if (!apiKey) {
            throw new Error("Missing OPENAI_API_KEY environment variable");
          }
          const client = new OpenAI({ apiKey });

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
