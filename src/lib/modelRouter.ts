import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI, { type ClientOptions } from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export type TaskType = "planning_chat" | "doc_extraction" | "embedding";

export type CallOptions = {
  maxTokens?: number;
  temperature?: number;
};

const CLAUDE_MODEL = "claude-3-5-sonnet-20240620";
const OPENAI_MODEL = "gpt-4.1";
const DEEPSEEK_MODEL = "deepseek-chat";
const GEMINI_MODEL = "gemini-1.5-flash";

const extractTextContent = (content: ChatCompletionMessageParam["content"]) => {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if ("text" in part && typeof part.text === "string") return part.text;
        return "";
      })
      .join("\n");
  }
  return "";
};

const toAnthropicMessages = (messages: ChatCompletionMessageParam[]) => {
  let systemPrompt = "";
  const chatMessages: MessageParam[] = [];

  messages.forEach((message) => {
    const content = extractTextContent(message.content);
    if (message.role === "system") {
      if (content) {
        systemPrompt = systemPrompt ? `${systemPrompt}\n\n${content}` : content;
      }
      return;
    }

    if (message.role === "user" || message.role === "assistant") {
      chatMessages.push({
        role: message.role,
        content,
      });
    }
  });

  return { system: systemPrompt || undefined, messages: chatMessages };
};

const buildOpenAIClient = (options?: ClientOptions) => new OpenAI(options);

const resolveClaudeApiKey = () => process.env.CLAUDE_API_KEY ?? process.env.CLUADE_API_KEY;

export const hasPlanningChatProvider = () => Boolean(resolveClaudeApiKey() || process.env.OPENAI_API_KEY);

const callClaude = async (messages: ChatCompletionMessageParam[], options?: CallOptions) => {
  const apiKey = resolveClaudeApiKey();
  if (!apiKey) {
    throw new Error("Missing CLAUDE_API_KEY environment variable");
  }

  const { system, messages: anthropicMessages } = toAnthropicMessages(messages);
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: options?.maxTokens ?? 512,
    temperature: options?.temperature ?? 0,
    messages: anthropicMessages,
    system,
  });

  const textResponse = response.content
    .map((part) => (part.type === "text" ? part.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();

  if (!textResponse) {
    throw new Error("Empty response from Claude");
  }

  return textResponse;
};

const callOpenAI = async (messages: ChatCompletionMessageParam[], options?: CallOptions) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable");
  }

  const client = buildOpenAIClient({ apiKey });
  const completion = await client.chat.completions.create({
    model: OPENAI_MODEL,
    messages,
    max_tokens: options?.maxTokens ?? 512,
    temperature: options?.temperature ?? 0,
  });

  const aiReply = completion.choices?.[0]?.message?.content;
  if (!aiReply) {
    throw new Error("Empty response from OpenAI");
  }
  return aiReply;
};

const callDeepSeek = async (messages: ChatCompletionMessageParam[], options?: CallOptions) => {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("Missing DEEPSEEK_API_KEY environment variable");
  }

  const client = buildOpenAIClient({ apiKey, baseURL: "https://api.deepseek.com" });
  const completion = await client.chat.completions.create({
    model: DEEPSEEK_MODEL,
    messages,
    max_tokens: options?.maxTokens ?? 512,
    temperature: options?.temperature ?? 0,
  });

  const reply = completion.choices?.[0]?.message?.content;
  if (!reply) {
    throw new Error("Empty response from DeepSeek");
  }
  return reply;
};

const callGeminiChat = async (messages: ChatCompletionMessageParam[]) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const prompt = messages.map((message) => `${message.role.toUpperCase()}: ${extractTextContent(message.content)}`).join("\n\n");
  const result = await model.generateContent(prompt);
  const text = result.response.text();

  if (!text) {
    throw new Error("Empty response from Gemini");
  }
  return text;
};

export const callModel = async (
  taskType: TaskType,
  messages: ChatCompletionMessageParam[],
  options?: CallOptions,
): Promise<string> => {
  if (taskType === "planning_chat") {
    if (resolveClaudeApiKey()) {
      try {
        return await callClaude(messages, options);
      } catch (error) {
        console.warn("[model-router] Claude call failed, falling back to OpenAI", error);
      }
    }

    if (process.env.OPENAI_API_KEY) {
      return callOpenAI(messages, options);
    }

    throw new Error("No available LLM providers for planning_chat");
  }

  if (taskType === "doc_extraction") {
    if (process.env.DEEPSEEK_API_KEY) {
      return callDeepSeek(messages, options);
    }

    if (process.env.OPENAI_API_KEY) {
      return callOpenAI(messages, options);
    }

    throw new Error("No available providers for doc_extraction");
  }

  if (taskType === "embedding") {
    if (process.env.GEMINI_API_KEY) {
      return callGeminiChat(messages);
    }

    throw new Error("No available providers for embedding tasks");
  }

  const exhaustiveCheck: never = taskType;
  throw new Error(`Unsupported task type: ${exhaustiveCheck}`);
};
