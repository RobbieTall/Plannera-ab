import { resolveCanonicalNswLga } from "@/lib/lep/nsw-lga-normaliser";

export const normalizeCouncilLgaCode = (value: string | null | undefined): string | null => {
  const canonical = resolveCanonicalNswLga(value);
  if (!canonical) return null;
  return canonical.replace(/\s+/g, "_").toUpperCase();
};
