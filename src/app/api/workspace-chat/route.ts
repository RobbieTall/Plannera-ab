import { NextResponse } from "next/server";
import OpenAI, { type ChatCompletionMessageParam } from "openai";
import { z } from "zod";

import { resolveSiteInstruments, searchClauses } from "@/lib/legislation";

const SYSTEM_PROMPT = `You are Plannera, an NSW planning assistant.
Always ground answers in the legislation context supplied in system messages.
Never invent user messages or addresses.
If the site or LGA is unknown, politely ask for the address or LGA.
Keep replies concise, professional, and focused on the question without filler.`;

const requestSchema = z.object({
  message: z.string().min(1),
  projectId: z.string().optional(),
  projectName: z.string().optional(),
});

type WorkspaceMemory = {
  messages: ChatCompletionMessageParam[];
  instruments: string[];
  lga: string | null;
};

const openaiApiKey = process.env.OPENAI_API_KEY;
const openaiClient = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;
const workspaceMemory = new Map<string, WorkspaceMemory>();

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

const buildFallbackReply = (params: {
  userMessage: string;
  lga: string | null;
  clauses: Awaited<ReturnType<typeof searchClauses>>;
}) => {
  if (!params.clauses.length) {
    const locationPrompt = params.lga ? ` in ${params.lga}` : "";
    return `I couldn’t reach the planning model just now. Please share the site address or zoning so I can check the LEP/SEPP controls${locationPrompt}.`;
  }

  const bullets = params.clauses.slice(0, 4).map((clause) => {
    const title = clause.title ?? clause.clauseKey;
    return `• ${clause.instrumentName} ${title}: ${clause.snippet}`;
  });
  return `Here’s what I can confirm from the legislation for your question: ${params.userMessage}\n${bullets.join("\n")}\nTell me the exact address or zoning to refine this further.`;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message: userMessage, projectId, projectName } = requestSchema.parse(body);

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

    const completion = openaiClient
      ? await openaiClient.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0.3,
          messages,
        })
      : null;

    const aiReply = completion?.choices?.[0]?.message?.content;

    const reply = aiReply ?? buildFallbackReply({ userMessage, lga, clauses });

    const updatedHistory: ChatCompletionMessageParam[] = [
      ...historyMessages,
      { role: "user", content: userMessage },
      { role: "assistant", content: reply },
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
        reply:
          "I couldn’t reach the planning assistant right now. Please share the address or LGA and I’ll reload the LEP and SEPP details for you.",
      },
      { status: 200 }
    );
  }
}
