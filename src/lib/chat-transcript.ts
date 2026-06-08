import type { WorkspaceMessage } from "@/types/workspace";

export function formatTranscript(messages: WorkspaceMessage[]): string {
  return messages
    .map((message) => {
      if (message.role === "user") {
        return `**You:** ${message.content}`;
      }

      const assistantLine = `**Assistant:** ${message.content}`;

      if (message.confidenceScore === null || message.confidenceScore === undefined) {
        return assistantLine;
      }

      return `${assistantLine}\n> Confidence: ${Math.round(message.confidenceScore * 100)}%`;
    })
    .join("\n\n");
}
