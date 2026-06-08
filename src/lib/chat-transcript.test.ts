import { describe, expect, it } from "vitest";

import { formatTranscript } from "@/lib/chat-transcript";
import type { WorkspaceMessage } from "@/types/workspace";

function message(overrides: Partial<WorkspaceMessage>): WorkspaceMessage {
  return {
    id: "message-1",
    role: "user",
    content: "Hello",
    timestamp: "2026-06-08T00:00:00.000Z",
    ...overrides,
  };
}

describe("formatTranscript", () => {
  it("returns an empty string for an empty array", () => {
    expect(formatTranscript([])).toBe("");
  });

  it("formats a single user message", () => {
    expect(formatTranscript([message({ content: "Can I build a deck?" })])).toBe("**You:** Can I build a deck?");
  });

  it("omits the confidence footnote for an assistant message with no confidenceScore", () => {
    expect(formatTranscript([message({ role: "assistant", content: "Check the DCP controls first." })])).toBe(
      "**Assistant:** Check the DCP controls first."
    );
  });

  it("includes an 85% confidence footnote for an assistant message with confidenceScore 0.85", () => {
    expect(
      formatTranscript([message({ role: "assistant", content: "The control is likely satisfied.", confidenceScore: 0.85 })])
    ).toBe("**Assistant:** The control is likely satisfied.\n> Confidence: 85%");
  });

  it("formats a mixed thread with blank lines between messages", () => {
    expect(
      formatTranscript([
        message({ id: "message-1", role: "user", content: "Summarise the risks." }),
        message({
          id: "message-2",
          role: "assistant",
          content: "Height and setbacks need review.",
          confidenceScore: 0.72,
        }),
        message({ id: "message-3", role: "user", content: "What should I do next?" }),
      ])
    ).toBe(
      "**You:** Summarise the risks.\n\n**Assistant:** Height and setbacks need review.\n> Confidence: 72%\n\n**You:** What should I do next?"
    );
  });

  it("omits the confidence footnote when score is null", () => {
    expect(
      formatTranscript([message({ role: "assistant", content: "Confidence was not persisted.", confidenceScore: null })])
    ).toBe("**Assistant:** Confidence was not persisted.");
  });

  it("includes a 0% confidence footnote when score is 0", () => {
    expect(formatTranscript([message({ role: "assistant", content: "No matching control was found.", confidenceScore: 0 })])).toBe(
      "**Assistant:** No matching control was found.\n> Confidence: 0%"
    );
  });
});
