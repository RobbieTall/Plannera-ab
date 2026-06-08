import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

import { parseConfidenceFromMessage } from "./confidence-scorer";

export type PersistableChatRole = "user" | "assistant";

type ChatMessageCreateManyInput = {
  projectId: string;
  role: PersistableChatRole;
  content: string;
  confidenceScore?: number | null;
  confidenceBreakdown?: Record<string, unknown> | null;
};

type ChatMessageWriter = {
  createMany: unknown;
};

type PersistWorkspaceChatExchangeParams = {
  prisma: { chatMessage: ChatMessageWriter };
  projectId: string | null | undefined;
  incomingMessages: ChatCompletionMessageParam[];
  assistantReply: string | null | undefined;
  parseConfidence?: boolean;
};

const isTextContent = (content: ChatCompletionMessageParam["content"]): content is string => typeof content === "string";

export const getLastPersistableUserMessage = (messages: ChatCompletionMessageParam[]) => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role === "user" && isTextContent(message.content) && message.content.trim().length > 0) {
      return message.content;
    }
  }

  return null;
};

export const persistWorkspaceChatExchange = async ({
  prisma,
  projectId,
  incomingMessages,
  assistantReply,
  parseConfidence = false,
}: PersistWorkspaceChatExchangeParams): Promise<void> => {
  if (!projectId) {
    return;
  }

  const userContent = getLastPersistableUserMessage(incomingMessages);
  const assistantContent = typeof assistantReply === "string" && assistantReply.trim().length > 0 ? assistantReply : null;
  const data: ChatMessageCreateManyInput[] = [];

  if (userContent) {
    data.push({ projectId, role: "user", content: userContent });
  }

  if (assistantContent) {
    const assistantMessage: ChatMessageCreateManyInput = { projectId, role: "assistant", content: assistantContent };

    if (parseConfidence) {
      try {
        const confidence = parseConfidenceFromMessage(assistantContent);
        assistantMessage.confidenceScore = confidence.score;
        assistantMessage.confidenceBreakdown = confidence.breakdown;
      } catch (error) {
        console.error("[workspace-chat-persistence] Failed to parse assistant confidence", error);
      }
    }

    data.push(assistantMessage);
  }

  if (!data.length) {
    return;
  }

  try {
    await (prisma.chatMessage.createMany as (args: { data: ChatMessageCreateManyInput[] }) => Promise<unknown>)({ data });
  } catch (error) {
    console.error("[workspace-chat-persistence] Failed to persist chat messages", error);
  }
};
