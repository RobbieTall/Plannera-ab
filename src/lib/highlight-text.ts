export type HighlightTextSegment = {
  text: string;
  match: boolean;
};

export function highlightText(content: string, query: string): HighlightTextSegment[] {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return [{ text: content, match: false }];
  }

  const lowerContent = content.toLowerCase();
  const lowerQuery = normalizedQuery.toLowerCase();
  const segments: HighlightTextSegment[] = [];
  let cursor = 0;

  while (cursor < content.length) {
    const matchIndex = lowerContent.indexOf(lowerQuery, cursor);

    if (matchIndex === -1) {
      segments.push({ text: content.slice(cursor), match: false });
      break;
    }

    if (matchIndex > cursor) {
      segments.push({ text: content.slice(cursor, matchIndex), match: false });
    }

    const matchEnd = matchIndex + normalizedQuery.length;
    segments.push({ text: content.slice(matchIndex, matchEnd), match: true });
    cursor = matchEnd;
  }

  return segments.length ? segments : [{ text: content, match: false }];
}
