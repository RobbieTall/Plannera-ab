const STREET_TYPES = [
  "rd",
  "road",
  "st",
  "street",
  "ave",
  "avenue",
  "pde",
  "parade",
  "dr",
  "drive",
  "blvd",
  "boulevard",
];

const STREET_TYPES_PATTERN = STREET_TYPES.join("|");

const ADDRESS_REGEX = new RegExp(`(\\d+\\s+[A-Za-z\\s]+?(?:${STREET_TYPES_PATTERN})[^,]*?(?:,\\s*[A-Za-z\\s]+)?)`, "i");

export function extractCandidateAddress(text: string): string | null {
  const normalised = text.replace(/\s+/g, " ").trim();
  const match = normalised.match(ADDRESS_REGEX);
  return match ? match[1].trim() : null;
}

export default extractCandidateAddress;
