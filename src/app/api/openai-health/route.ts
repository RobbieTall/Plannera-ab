import OpenAI from "openai";

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

export async function GET() {
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "health check" }],
      max_tokens: 10,
    });

    return new Response(
      JSON.stringify({ ok: true, model: res.model }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const details = getErrorDetails(error);
    return new Response(
      JSON.stringify({
        ok: false,
        ...details,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
