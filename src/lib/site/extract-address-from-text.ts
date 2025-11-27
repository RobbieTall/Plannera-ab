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

export function extractCandidateAddress(text: string): string | null {
  const normalised = text.replace(/\s+/g, " ").trim();

  const regex = new RegExp(
    `(\\d+\\s+[A-Za-z\\s]+?(?:${STREET_TYPES.join("|")})[^,]*?(?:,\\s*[A-Za-z\\s]+)?(?:\\s+NSW\\s+\\d{4})?)`,
    "i",
  );

  const match = normalised.match(regex);
  return match ? match[1].trim() : null;
}

export default extractCandidateAddress;
