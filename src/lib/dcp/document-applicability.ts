export type DcpDocumentScopeInput = {
  lgaCode?: string | null;
  headingPath: readonly string[];
  siteZone?: string | null;
};
export type DcpDocumentScopeIssue =
  | "location_scope_unverified"
  | "residential_proposal_scope_unverified";

/**
 * Conservative exclusion of known scope conflicts, NOT positive applicability
 * verification. A matching address, body keyword or zone is not precinct proof.
 * Until a reviewed spatial binding exists, Byron Part E candidates are withheld
 * from document evidence. Their original source rows remain untouched.
 */
export function dcpDocumentScopeIssue(input: DcpDocumentScopeInput): DcpDocumentScopeIssue | null {
  const hierarchy = input.headingPath.join(" ");
  const byron = input.lgaCode?.toUpperCase() === "BYRON" ||
    (/\bByron\b/i.test(hierarchy) && /\b(?:DCP|Development Control Plan)\b/i.test(hierarchy));
  if (!byron) return null;
  const chapters = [...hierarchy.matchAll(/\bChapter\s+([A-E]\d+)\b/gi)]
    .map(match => match[1].toUpperCase());
  if (chapters.some(chapter => /^E\d+$/.test(chapter))) return "location_scope_unverified";
  const zone = input.siteZone?.match(/\b(?:RU|R|E|B|SP|MU)\d[A-Z]?\b/i)?.[0].toUpperCase();
  if (/^R[1-5]$/.test(zone ?? "") && chapters.includes("D4"))
    return "residential_proposal_scope_unverified";
  if (/^R[1-4]$/.test(zone ?? "") && chapters.includes("D2"))
    return "residential_proposal_scope_unverified";
  return null;
}
