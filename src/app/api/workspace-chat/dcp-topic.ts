import { detectTopicTags } from "@/lib/dcp/topic-tags";

const TOPIC_PRIORITY = [
  "setbacks",
  "height",
  "parking",
  "landscaping",
  "site_coverage",
  "private_open_space",
  "flooding",
] as const;

export const detectMessageTopic = (message: string): string | null => {
  const detectedTopics = new Set(detectTopicTags(message));
  return TOPIC_PRIORITY.find((topic) => detectedTopics.has(topic)) ?? null;
};
