import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

import { getApplicableClausesForSite, serializeApplicableClausesResult } from "@/lib/legislation";
import { generatePlanningInsights, type PlanningSummary } from "@/lib/mock-planning-data";
import { getNswPlanningSnapshot } from "@/lib/nsw";
import { parseProjectDescription, type ProjectParameters } from "@/lib/project-parser";

const MAX_LEGISLATION_CONTEXT = 5;

const buildLegislationContext = (result: Awaited<ReturnType<typeof getApplicableClausesForSite>> | null) => {
  if (!result) {
    return null;
  }

  const instrumentsLabel = result.siteInstruments
    .map((instrument) => `${instrument.shortName} (${instrument.instrumentType})`)
    .join(", ");

  const clauseSummaries = result.clauses.slice(0, MAX_LEGISLATION_CONTEXT).map((clause) => {
    const title = clause.title ?? clause.clauseKey;
    const dateLabel = clause.currentAsAt ? ` – current as at ${clause.currentAsAt.toLocaleDateString("en-AU")}` : "";
    return `${clause.instrumentName} • ${title}${dateLabel}: ${clause.snippet}`;
  });

  if (!clauseSummaries.length) {
    return `Applicable instruments: ${instrumentsLabel}.`;
  }

  return `Applicable instruments: ${instrumentsLabel}. Key clauses:\n${clauseSummaries.join("\n")}`;
};

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().min(1),
});

const requestSchema = z.object({
  prompt: z.string().min(10, "Describe your project in a bit more detail."),
  history: z.array(messageSchema).optional(),
});

const summarySchema = z.object({
  location: z.string(),
  scale: z.string(),
  developmentType: z.string(),
  council: z.string(),
  state: z.string(),
  requirements: z.array(z.string()).min(1),
  documents: z.array(z.string()).min(1),
  timelineWeeks: z.tuple([z.number(), z.number()]),
  budgetRange: z.string(),
  hurdles: z.array(z.string()).min(1),
  description: z.string().optional(),
});

const openaiApiKey = process.env.OPENAI_API_KEY;
const openaiClient = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

export async function POST(request: Request) {
  let promptValue = "";
  let parsedProject: ProjectParameters | null = null;
  let legislationResult: Awaited<ReturnType<typeof getApplicableClausesForSite>> | null = null;
  let serializedLegislation: ReturnType<typeof serializeApplicableClausesResult> | null = null;
  let nswSnapshot: Awaited<ReturnType<typeof getNswPlanningSnapshot>> | null = null;
  try {
    const body = await request.json();
    const { prompt, history } = requestSchema.parse(body);
    promptValue = prompt;

    parsedProject = parseProjectDescription(prompt);

    try {
      nswSnapshot = await getNswPlanningSnapshot(parsedProject);
    } catch (nswError) {
      console.warn("NSW planning data unavailable", nswError);
    }

    try {
      legislationResult = await getApplicableClausesForSite({
        address: parsedProject.location,
        topic: parsedProject.developmentType,
      });
      serializedLegislation = serializeApplicableClausesResult(legislationResult);
    } catch (legislationError) {
      console.warn("Legislation context unavailable", legislationError);
    }

    if (!openaiClient) {
      return NextResponse.json(
        {
          summary: generatePlanningInsights(parsedProject, { nswData: nswSnapshot }),
          source: "mock",
          legislation: serializedLegislation,
        },
        { status: 200 }
      );
    }

    const historyMessages = history?.map((entry) => ({ role: entry.role, content: entry.content })) ?? [];
    const legislationContext = buildLegislationContext(legislationResult);
    const legislationMessages = legislationContext
      ? [
          {
            role: "system" as const,
            content: `Reference the following NSW planning clauses when relevant. ${legislationContext}`,
          },
        ]
      : [];

    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an Australian town-planning assistant. Respond ONLY with JSON that matches the PlanningSummary schema.",
        },
        ...legislationMessages,
        ...historyMessages,
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Project description: "${prompt}"\nParsed location: ${parsedProject.location}\nParsed development type: ${parsedProject.developmentType}\nParsed scale: ${parsedProject.scale}.\nReturn JSON with keys location, state, council, developmentType, scale, requirements (3-5), documents (3-5), hurdles (2-4), timelineWeeks (two integers min first), budgetRange (string). Ensure the response is valid JSON.`,
            },
          ],
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error("OpenAI returned an empty response");
    }

    const parsed = summarySchema.safeParse(JSON.parse(content));

    if (!parsed.success) {
      throw new Error("Unable to parse response from AI");
    }

    const summary: PlanningSummary = {
      ...parsed.data,
      description: parsed.data.description ?? prompt,
      nswData: nswSnapshot ?? undefined,
    };

    return NextResponse.json({ summary, source: "openai", legislation: serializedLegislation });
  } catch (error) {
    console.error("Planning assistant error", error);
    const fallbackSummary = generatePlanningInsights(
      parsedProject ?? {
        description: promptValue || "Concept development",
        location: "Australia",
        developmentType: "Mixed development",
        scale: "Mid-scale",
      },
      { nswData: nswSnapshot }
    );
    return NextResponse.json(
      {
        error: "We couldn't reach the planning assistant. Showing a generic pathway instead.",
        summary: fallbackSummary,
        source: "error-fallback",
        legislation: serializedLegislation,
      },
      { status: 200 }
    );
  }
}
