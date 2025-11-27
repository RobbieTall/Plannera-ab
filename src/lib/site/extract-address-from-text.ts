const STREET_TYPES = [
  "street",
  "st",
  "road",
  "rd",
  "avenue",
  "ave",
  "boulevard",
  "blvd",
  "drive",
  "dr",
  "lane",
  "ln",
  "way",
  "place",
  "pl",
  "terrace",
  "terr",
  "parade",
  "pde",
  "circuit",
  "cct",
  "close",
  "court",
  "ct",
  "crescent",
  "cres",
  "highway",
  "hwy",
];

const ADDRESS_REGEX = new RegExp(
  `\\b\\d{1,4}[A-Za-z]?\\s+[A-Za-z0-9\\'\\-\\.\\s]{2,50}\\s+(?:${STREET_TYPES.join("|")})`,
  "i",
);
const POSTCODE_REGEX = /\b\d{4}\b/;
const NSW_REGEX = /\bnsw\b/i;

const splitFragments = (text: string) =>
  text
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+|,\s+(?=\d)/))
    .map((entry) => entry.trim())
    .filter(Boolean);

const scoreFragment = (fragment: string) => {
  let score = 0;
  if (ADDRESS_REGEX.test(fragment)) score += 2;
  if (POSTCODE_REGEX.test(fragment)) score += 2;
  if (NSW_REGEX.test(fragment)) score += 2;
  // prefer longer, more descriptive fragments
  score += Math.min(fragment.length / 50, 2);
  return score;
};

export const extractAddressFromText = (text: string): string | null => {
  if (!text?.trim()) return null;

  const cleaned = text.replace(/\s+/g, " ").trim();
  const fragments = splitFragments(text);
  const rankedFragments = fragments
    .filter((fragment) => ADDRESS_REGEX.test(fragment) && POSTCODE_REGEX.test(fragment) && NSW_REGEX.test(fragment))
    .map((fragment) => ({ fragment, score: scoreFragment(fragment) }))
    .sort((a, b) => b.score - a.score);

  if (rankedFragments[0]) {
    return rankedFragments[0].fragment;
  }

  const inlineMatch = cleaned.match(new RegExp(`${ADDRESS_REGEX.source}[^\n]*?NSW\s+\d{4}`, "i"));
  if (inlineMatch?.[0]) {
    return inlineMatch[0].trim();
  }

  return null;
};

export default extractAddressFromText;
