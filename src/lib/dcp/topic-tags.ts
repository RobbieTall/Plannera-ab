const TOPIC_KEYWORDS: Record<string, string[]> = {
  setbacks: ["setback", "street setback", "rear setback", "side setback", "boundary", "building line", "frontage"],
  parking: ["parking", "car park", "car space", "driveway", "garage", "visitor", "bicycle", "bike"],
  height: ["height", "tall", "storey", "storeys", "plane", "levels", "roof terrace"],
  envelope: ["envelope", "building envelope", "height plane", "building plane"],
  character: ["character", "streetscape", "context", "appearance"],
  landscaping: ["landscap", "tree", "deep soil", "vegetation", "planting", "garden", "soft landscaping"],
  private_open_space: ["private open space", "pos", "courtyard", "balcony", "open space", "ppos", "principal private"],
  site_coverage: ["site coverage", "coverage", "site area", "floor area", "plot ratio", "site density"],
  parking_related: ["driveway gradient", "access", "aisle width"],
  flooding: ["flood", "flooding", "floodplain"],
};

const normalize = (text: string) => text.toLowerCase();

export const detectTopicTags = (text: string): string[] => {
  const normalized = normalize(text);
  const tags = new Set<string>();

  Object.entries(TOPIC_KEYWORDS).forEach(([tag, keywords]) => {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      tags.add(tag);
    }
  });

  return Array.from(tags);
};

export const mergeTopicTags = (...pieces: (string | undefined | null)[]) =>
  detectTopicTags(
    pieces
      .filter(Boolean)
      .map((piece) => piece?.toString?.() ?? "")
      .join(" "),
  );
