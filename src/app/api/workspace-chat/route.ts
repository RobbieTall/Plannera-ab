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

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey && !isDemo) {
      throw new Error("Missing OPENAI_API_KEY environment variable");
    }

    const workspaceKey = projectId ?? "default";
    const existingMemory = workspaceMemory.get(workspaceKey);

    let siteContext: Awaited<ReturnType<typeof resolveSiteInstruments>> | null = null;
    try {
      siteContext = await resolveSiteInstruments({ address: userMessage, topic: userMessage });
    } catch (siteError) {
      console.warn("[workspace-chat-warning] Failed to resolve site context", getErrorDetails(siteError));
    }

    const lga = siteContext?.localGovernmentArea ?? existingMemory?.lga ?? null;
    const instruments = siteContext?.instrumentSlugs?.length
      ? siteContext.instrumentSlugs
      : existingMemory?.instruments ?? [];

    let clauses: Awaited<ReturnType<typeof searchClauses>> = [];
    if (instruments.length) {
      try {
        clauses = await searchClauses({
          query: userMessage,
          instrumentSlugs: instruments,
          instrumentTypes: ["LEP", "SEPP"],
          limit: 12,
        });
      } catch (clauseError) {
        console.warn("[workspace-chat-warning] Failed to search clauses", getErrorDetails(clauseError));
      }
    }

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
    console.error("[workspace-chat-error]", getErrorDetails(error));
    return NextResponse.json(
      {
        error: "assistant_unavailable",
        message: "The planning assistant is unavailable right now. Please try again shortly.",
      },
      { status: 500 }
    );
  }
}
