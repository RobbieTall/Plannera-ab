import { resolveCanonicalNswLga } from "@/lib/lep/nsw-lga-normaliser";

const LGA_CODE_ALIASES: Record<string, string> = {
  BYRON: "BYRON",
  BYRON_SHIRE: "BYRON",
  BYRONSHIRE: "BYRON",
  BYRON_SHIRE_COUNCIL: "BYRON",
  BYRONSHIRECOUNCIL: "BYRON",
  LGA11200: "BYRON",
};

const normaliseKey = (value: string | null | undefined) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
};

export const resolveCouncilLgaCode = (value: string | null | undefined) => {
  const directKey = normaliseKey(value);
  if (directKey && LGA_CODE_ALIASES[directKey]) {
    return LGA_CODE_ALIASES[directKey];
  }

  const canonical = resolveCanonicalNswLga(value);
  const canonicalKey = normaliseKey(canonical);
  if (canonicalKey && LGA_CODE_ALIASES[canonicalKey]) {
    return LGA_CODE_ALIASES[canonicalKey];
  }

  return canonicalKey ?? directKey;
};

export const COUNCIL_LGA_CODES = {
  BYRON: "BYRON",
} as const;
