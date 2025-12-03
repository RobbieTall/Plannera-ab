const NORMALIZATION_RE = /\b(city of|city|shire|regional|municipal|council|local government area|lga)\b/gi;

/**
 * Normalises NSW LGA labels into a comparable key by removing punctuation,
 * council-specific suffixes and collapsing whitespace.
 */
export const normalizeNswLgaName = (value: string | null | undefined): string | null => {
  if (!value) return null;

  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(NORMALIZATION_RE, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^the\s+/, "");
};

const LGA_EQUIVALENTS: Record<string, string[]> = {
  "northern beaches": ["warringah", "manly", "pittwater"],
  warringah: ["northern beaches", "manly", "pittwater"],
  pittwater: ["northern beaches", "warringah", "manly"],
  manly: ["northern beaches", "warringah", "pittwater"],
};

/**
 * Resolves an input LGA label to a canonical key by normalising whitespace and
 * removing common suffixes.
 */
export const resolveCanonicalNswLga = (value: string | null | undefined): string | null =>
  normalizeNswLgaName(value);

/**
 * Expands an LGA label to include known aliases (e.g. Northern Beaches ↔
 * Warringah/Pittwater/Manly).
 */
export const expandNswLgaAliases = (value: string | null | undefined): string[] => {
  const canonical = resolveCanonicalNswLga(value);
  if (!canonical) return [];
  const equivalents = LGA_EQUIVALENTS[canonical] ?? [];
  return Array.from(new Set([canonical, ...equivalents]));
};
