const QUESTION_STARTERS = /^(if|would|could|should|what|how|when|where|why|consider|note)\b/i;
const MAX_SUGGESTIONS = 3;
const MAX_CHIP_LENGTH = 80;
const MIN_CONTENT_LENGTH = 100;

const KEYWORD_FALLBACKS: Array<{ pattern: RegExp; suggestion: string }> = [
  { pattern: /\bsetbacks?\b/i, suggestion: "What are the setback requirements?" },
  { pattern: /\bheight\b/i, suggestion: "What height controls apply?" },
  { pattern: /\bparking\b/i, suggestion: "What parking provisions apply?" },
  { pattern: /\bheritage\b/i, suggestion: "Are there any heritage constraints?" },
  { pattern: /\bDCP\b/i, suggestion: "Which DCP controls should I check next?" },
  { pattern: /\bLEP\b/i, suggestion: "Which LEP clauses apply to this site?" },
  { pattern: /\bzone\b/i, suggestion: "What zoning constraints affect the proposal?" },
];

function splitSentences(content: string) {
  return content
    .replace(/\s+/g, " ")
    .match(/[^.!?]+[.!?]?/g)
    ?.map((sentence) => sentence.trim()) ?? [];
}

function trimSuggestion(sentence: string) {
  if (sentence.length <= MAX_CHIP_LENGTH) {
    return sentence;
  }

  const truncated = sentence.slice(0, MAX_CHIP_LENGTH - 3);
  const lastSpace = truncated.lastIndexOf(" ");
  const trimmed = lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated;

  return `${trimmed.trim()}...`;
}

function uniqueSuggestions(suggestions: string[]) {
  const seen = new Set<string>();

  return suggestions.filter((suggestion) => {
    const normalized = suggestion.toLowerCase();

    if (seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

export function generateSuggestions(content: string): string[] {
  const normalizedContent = content.trim();

  if (normalizedContent.length < MIN_CONTENT_LENGTH) {
    return [];
  }

  const candidates = splitSentences(normalizedContent)
    .filter((sentence) => sentence.includes("?") || QUESTION_STARTERS.test(sentence))
    .map(trimSuggestion);

  const suggestions = uniqueSuggestions(candidates).slice(0, MAX_SUGGESTIONS);

  if (suggestions.length >= 2) {
    return suggestions;
  }

  const fallbackSuggestions = KEYWORD_FALLBACKS.filter(({ pattern }) => pattern.test(normalizedContent)).map(
    ({ suggestion }) => suggestion,
  );

  return uniqueSuggestions([...suggestions, ...fallbackSuggestions]).slice(0, MAX_SUGGESTIONS);
}
