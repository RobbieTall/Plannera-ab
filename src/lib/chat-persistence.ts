import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export type PersistableChatRole = "user" | "assistant";

type ChatMessageCreateManyInput = {
  projectId: string;
  role: PersistableChatRole;
  content: string;
};

type ChatMessageWriter = {
  createMany: (args: { data: ChatMessageCreateManyInput[] }) => Promise<unknown>;
};

type PersistWorkspaceChatExchangeParams = {
  prisma: { chatMessage: ChatMessageWriter };
  projectId: string | null | undefined;
  incomingMessages: ChatCompletionMessageParam[];
  assistantReply: string | null | undefined;
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
    data.push({ projectId, role: "assistant", content: assistantContent });
  }

  if (!data.length) {
    return;
  }

  try {
    await prisma.chatMessage.createMany({ data });
  } catch (error) {
    console.error("[workspace-chat-persistence] Failed to persist chat messages", error);
  }
};
