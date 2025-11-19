import { NextResponse } from "next/server";
import OpenAI from "openai";
import { type ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { z } from "zod";

import { resolveSiteInstruments, searchClauses } from "@/lib/legislation";

const SYSTEM_PROMPT = `You are Plannera, an NSW planning assistant.
Always read the user's question literally.
Never invent user messages.
Never assume a second question.
If the user doesn't provide an address or LGA, ask politely.
Use provided site context (address, LGA, zone, LEP, SEPP) if available.
If no controls exist yet for that LGA, say so clearly.`;

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
};

const openaiApiKey = process.env.OPENAI_API_KEY;
const openaiClient = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;
const workspaceMemory = new Map<string, WorkspaceMemory>();

type ErrorWithResponse = {
  message?: string;
  status?: number;
  response?: {
    status?: number;
    data?: unknown;
  };
};

const getOpenAIErrorDetails = (error: unknown) => {
  if (typeof error === "object" && error !== null) {
    const err = error as ErrorWithResponse;
    return {
      message: err.message,
      status: err.status ?? err.response?.status,
      data: err.response?.data,
    };
  }

  return {
    message: error instanceof Error ? error.message : undefined,
    status: undefined,
    data: undefined,
  };
};

const buildLegislationContext = (params: {
  lga: string | null;
  instruments: string[];
  clauses: Awaited<ReturnType<typeof searchClauses>>;
}) => {
  const introParts = [] as string[];
  if (params.lga) {
    introParts.push(`LGA: ${params.lga}`);
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message: userMessage, projectId, projectName, isDemo } = requestSchema.parse(body);

    const workspaceKey = projectId ?? "default";
    const existingMemory = workspaceMemory.get(workspaceKey);

    const siteContext = await resolveSiteInstruments({ address: userMessage, topic: userMessage });
    const lga = siteContext.localGovernmentArea ?? existingMemory?.lga ?? null;
    const instruments = siteContext.instrumentSlugs?.length
      ? siteContext.instrumentSlugs
      : existingMemory?.instruments ?? [];

    const clauses = instruments.length
      ? await searchClauses({
          query: userMessage,
          instrumentSlugs: instruments,
          instrumentTypes: ["LEP", "SEPP"],
          limit: 12,
        })
      : [];

    const legislationContext = buildLegislationContext({ lga, instruments, clauses });

    const historyMessages = existingMemory?.messages ?? [];
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    if (legislationContext) {
      messages.push({ role: "system", content: `Site context:\n${legislationContext}` });
    }

    messages.push(...historyMessages);
    messages.push({ role: "user", content: userMessage });

    const reply = isDemo
      ? "This is a demo response. Provide a real address or LGA for full analysis."
      : await (async () => {
          if (!openaiClient) {
            throw new Error("OpenAI client not configured");
          }

          try {
            const completion = await openaiClient.chat.completions.create({
              model: "gpt-4o-mini",
              messages,
            });

            const aiReply = completion.choices?.[0]?.message?.content;
            if (!aiReply) {
              throw new Error("Empty response from OpenAI");
            }
            return aiReply;
          } catch (error) {
            console.error("[openai-chat-error]", getOpenAIErrorDetails(error));
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
      instruments,
      lga,
    });

    return NextResponse.json({
      reply,
      lga,
      zone: null,
      projectName,
      instruments,
    });
  } catch (error) {
    console.error("Workspace chat error", error);
    return NextResponse.json(
      {
        reply: "The planning assistant is unavailable right now. Please try again shortly.",
      },
      { status: 200 }
    );
  }
}
