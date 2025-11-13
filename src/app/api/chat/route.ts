import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

import { generatePlanningInsights, type PlanningSummary } from "@/lib/mock-planning-data";
import { parseProjectDescription, type ProjectParameters } from "@/lib/project-parser";

const requestSchema = z.object({
  prompt: z.string().min(10, "Describe your project in a bit more detail."),
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
  try {
    const body = await request.json();
    const { prompt } = requestSchema.parse(body);
    promptValue = prompt;

    parsedProject = parseProjectDescription(prompt);

    if (!openaiClient) {
      return NextResponse.json(
        { summary: generatePlanningInsights(parsedProject), source: "mock" },
        { status: 200 }
      );
    }

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
    };

    return NextResponse.json({ summary, source: "openai" });
  } catch (error) {
    console.error("Planning assistant error", error);
    const fallbackSummary = generatePlanningInsights(
      parsedProject ?? {
        description: promptValue || "Concept development",
        location: "Australia",
        developmentType: "Mixed development",
        scale: "Mid-scale",
      }
    );
    return NextResponse.json(
      {
        error: "We couldn't reach the planning assistant. Showing a generic pathway instead.",
        summary: fallbackSummary,
        source: "error-fallback",
      },
      { status: 200 }
    );
  }
}
