import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getLastPersistableUserMessage, persistWorkspaceChatExchange } from "@/lib/chat-persistence";

describe("chat persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips system messages and persists only the last user message plus assistant reply", async () => {
    const createMany = vi.fn().mockResolvedValue({ count: 2 });
    const incomingMessages: ChatCompletionMessageParam[] = [
      { role: "system", content: "Hidden instruction" },
      { role: "user", content: "Earlier question" },
      { role: "assistant", content: "Earlier answer" },
      { role: "user", content: "Latest question" },
    ];

    await persistWorkspaceChatExchange({
      prisma: { chatMessage: { createMany } },
      projectId: "project-1",
      incomingMessages,
      assistantReply: "Latest answer",
    });

    expect(getLastPersistableUserMessage(incomingMessages)).toBe("Latest question");
    expect(createMany).toHaveBeenCalledWith({
      data: [
        { projectId: "project-1", role: "user", content: "Latest question" },
        { projectId: "project-1", role: "assistant", content: "Latest answer" },
      ],
    });
  });

  it("handles empty content gracefully by skipping empty messages", async () => {
    const createMany = vi.fn().mockResolvedValue({ count: 0 });

    await persistWorkspaceChatExchange({
      prisma: { chatMessage: { createMany } },
      projectId: "project-1",
      incomingMessages: [
        { role: "system", content: "Hidden instruction" },
        { role: "user", content: "   " },
      ],
      assistantReply: "",
    });

    expect(createMany).not.toHaveBeenCalled();
  });

  it("logs DB errors without rethrowing", async () => {
    const createMany = vi.fn().mockRejectedValue(new Error("database offline"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      persistWorkspaceChatExchange({
        prisma: { chatMessage: { createMany } },
        projectId: "project-1",
        incomingMessages: [{ role: "user", content: "Question" }],
        assistantReply: "Answer",
      }),
    ).resolves.toBeUndefined();

    expect(consoleError).toHaveBeenCalledWith(
      "[workspace-chat-persistence] Failed to persist chat messages",
      expect.any(Error),
    );
    consoleError.mockRestore();
  });
});
