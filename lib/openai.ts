import OpenAI from "openai";

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

export interface InsightGenerationInput {
  journalContent: string;
  mood?: number;
  energy?: number;
  numerologyContext?: {
    lifePath: number;
    personalDay: number;
    lifePathMeaning: string;
    personalDayMeaning: string;
  };
  astrologyContext?: {
    sunSign: string;
    moonPhase: string;
    dailyGuidance: string;
  };
  recentPatterns?: string[];
}

const OPENAI_TIMEOUT_MS = 25_000;

export async function generateJournalInsight(
  input: InsightGenerationInput
): Promise<{ title: string; content: string; type: string }> {
  const client = getClient();
  const signal = AbortSignal.timeout(OPENAI_TIMEOUT_MS);

  const systemPrompt = `You are a compassionate spiritual advisor and journaling coach who specializes in
numerology and astrology. Provide thoughtful, personalized insights based on journal entries and cosmic context.
Keep insights concise (2-3 paragraphs), warm, actionable, and grounded. Never be vague or generic.`;

  const userPrompt = `Analyze this journal entry and provide a meaningful insight:

Journal Entry: "${input.journalContent}"
${input.mood !== undefined ? `Mood (1-10): ${input.mood}` : ""}
${input.energy !== undefined ? `Energy (1-10): ${input.energy}` : ""}

${
  input.numerologyContext
    ? `Numerology Context:
- Life Path Number: ${input.numerologyContext.lifePath} (${input.numerologyContext.lifePathMeaning})
- Personal Day Number: ${input.numerologyContext.personalDay} (${input.numerologyContext.personalDayMeaning})`
    : ""
}

${
  input.astrologyContext
    ? `Astrology Context:
- Sun Sign: ${input.astrologyContext.sunSign}
- Moon Phase: ${input.astrologyContext.moonPhase}
- Daily Guidance: ${input.astrologyContext.dailyGuidance}`
    : ""
}

${input.recentPatterns?.length ? `Recent Patterns: ${input.recentPatterns.join(", ")}` : ""}

Respond with JSON: { "title": "...", "content": "...", "type": "reflection|pattern|cosmic|action" }`;

  const response = await client.chat.completions.create(
    {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 600,
      temperature: 0.7,
    },
    { signal }
  );

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw);

  return {
    title: parsed.title ?? "Your Daily Insight",
    content: parsed.content ?? "Reflect on what resonates most deeply today.",
    type: parsed.type ?? "reflection",
  };
}

export async function analyzeJournalPatterns(
  entries: Array<{ content: string; mood?: number; entryDate: string }>
): Promise<Array<{ type: string; description: string }>> {
  if (entries.length < 3) return [];

  const client = getClient();

  const summary = entries
    .map((e) => `[${e.entryDate}] Mood:${e.mood ?? "?"} — ${e.content.slice(0, 200)}`)
    .join("\n\n");

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Identify recurring emotional, behavioral, or thematic patterns in these journal entries. Return JSON array of {type, description}.",
      },
      {
        role: "user",
        content: `Identify up to 5 patterns:\n\n${summary}\n\nRespond with JSON: { "patterns": [...] }`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 400,
    temperature: 0.5,
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed.patterns) ? parsed.patterns : [];
}
