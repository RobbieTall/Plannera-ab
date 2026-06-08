export type ConfidenceBreakdown = {
  citedClauses: number;
  hedgingPhrases: number;
  unresolvedGaps: number;
};

const CITED_CLAUSE_PATTERN = /\b(?:cl\.|clause|s\.|section)\s*\d+(?:\.\d+)*\b/gi;
const HEDGING_PHRASE_PATTERN = /\b(?:may|might|generally|typically|unclear|seek advice)\b|subject to council discretion/gi;
const UNRESOLVED_GAP_PATTERN = /\b(?:not available|no DCP clause|unable to confirm|no data|could not find|not found)\b/gi;

const countMatches = (content: string, pattern: RegExp) => content.match(pattern)?.length ?? 0;
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function parseConfidenceFromMessage(content: string): { score: number; breakdown: ConfidenceBreakdown } {
  const breakdown = {
    citedClauses: countMatches(content, CITED_CLAUSE_PATTERN),
    hedgingPhrases: countMatches(content, HEDGING_PHRASE_PATTERN),
    unresolvedGaps: countMatches(content, UNRESOLVED_GAP_PATTERN),
  };

  const citedBonus = Math.min(breakdown.citedClauses * 0.05, 0.3);
  const hedgingPenalty = Math.min(breakdown.hedgingPhrases * 0.05, 0.2);
  const gapPenalty = Math.min(breakdown.unresolvedGaps * 0.1, 0.3);
  const rawScore = clamp(0.5 + citedBonus - hedgingPenalty - gapPenalty, 0, 1);

  return {
    score: Math.round(rawScore * 100) / 100,
    breakdown,
  };
}
