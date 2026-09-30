import { createHash } from "node:crypto";
import { z } from "zod";
import type { DCPClause, PrismaClient, SiteContext } from "@prisma/client";
import type { DetailedPlanningPackContent } from "@/types/workspace";
import type { QuickSiteCheckReport } from "@/types/quick-site-check";
import { savedSiteBinding } from "./site-context-provenance-storage";
import { readDcpSourceCapture, DCP_SOURCE_CAPTURE_MAX_AGE_MS } from "./dcp/dcp-source-capture";

export const WORKING_SEE_PACK_CAPTURE_VERSION = "working-see-pack-source-capture.v2";
const LEGACY_CAPTURE_VERSION = "working-see-pack-source-capture.v1";
const MAX_CAPTURE_BYTES = 512 * 1024;
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const bodyHash = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");
const date = (value: Date | null) => value?.toISOString() ?? null;
const sha = z.string().regex(/^[a-f0-9]{64}$/);
const sourceSchema = z.object({
  kind: z.enum(["LEP", "DCP"]), clauseId: z.string().min(1),
  reference: z.string().min(1), title: z.string().min(1),
  bodyText: z.string().min(1), bodyTextSha256: sha,
  sourceUrl: z.string().url(), sourceVersion: z.string().min(1),
  retrievedAt: z.string().datetime(), recordUpdatedAt: z.string().datetime(),
  originalRecordHash: z.string().nullable(),
  effectiveFrom: z.string().datetime().nullable(), effectiveTo: z.string().datetime().nullable(),
  originMetadataJson: z.string().nullable(),
}).strict();
const captureSchema = z.object({
  schema: z.enum([LEGACY_CAPTURE_VERSION, WORKING_SEE_PACK_CAPTURE_VERSION]), status: z.literal("CAPTURED"),
  projectId: z.string().min(1), siteId: z.string().min(1), siteBinding: sha,
  council: z.enum(["BYRON", "KEMPSEY"]), zoneCode: z.string().min(1),
  sourceQuickSiteCheckArtefactId: z.string().min(1), quickSiteCheckDigest: sha,
  packDigest: sha, capturedAt: z.string().datetime(), expiresAt: z.string().datetime(),
  sources: z.array(sourceSchema).min(2).max(32), digest: sha,
}).strict();
export type WorkingSeePackSourceCapture = z.infer<typeof captureSchema>;
type Source = z.infer<typeof sourceSchema>;
export type WorkingSeePackCaptureResult = WorkingSeePackSourceCapture | {
  schema: typeof WORKING_SEE_PACK_CAPTURE_VERSION; status: "UNAVAILABLE";
  reason: "source_capture_incomplete";
};
export type WorkingSeePackCaptureInput = {
  site: SiteContext;
  pack: DetailedPlanningPackContent;
  quickSiteCheck: QuickSiteCheckReport;
  dcpClauses: readonly DCPClause[];
};
export class WorkingSeePackCaptureError extends Error {
  constructor() { super("source_capture_incomplete"); }
}
function fail(): never { throw new WorkingSeePackCaptureError(); }
function packDigest(pack: DetailedPlanningPackContent) {
  const data = { ...pack } as Record<string, unknown>;
  delete data.workingSeeSourceCapture;
  return hash(data);
}
function officialLepUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && u.hostname === "legislation.nsw.gov.au" &&
      !u.username && !u.password && !u.port && !u.search && !u.hash &&
      /^\/view\/(?:html|whole|pdf)\//.test(u.pathname);
  } catch { return false; }
}

const LEP_IDENTITIES = {
  BYRON: { name: "Byron Local Environmental Plan 2014", instrument: "epi-2014-0297",
    prefixes: ["BYRON_2014_", "BYRON_LEP_2014_"] },
  KEMPSEY: { name: "Kempsey Local Environmental Plan 2013", instrument: "epi-2013-0712",
    prefixes: ["KEMP_2013_", "KEMPSEY_LEP_2013_"] },
} as const;
type Council = keyof typeof LEP_IDENTITIES;
function lepClauseAliases(council: Council, reference: string): string[] {
  // Main provisions only: never suffix-match schedules, another council or year.
  if (!/^[1-9]\d*\.[1-9]\d*[A-Z]?$/.test(reference)) fail();
  return [reference, ...LEP_IDENTITIES[council].prefixes.map(prefix =>
    prefix + reference.replace(".", "_"))];
}
function requestedLepReferences(report: QuickSiteCheckReport): string[] {
  return [...new Set(["2.3", ...Object.values(report.controls ?? {})
    .flatMap(control => control?.clauseRef ? [control.clauseRef.trim()] : [])])];
}
function scopedLepUrl(value: string, council: Council) {
  if (!officialLepUrl(value)) return false;
  const path = new URL(value).pathname;
  return new RegExp("^/view/(?:html|whole/html|pdf)/inforce/(?:current|\\d{4}-\\d{2}-\\d{2})/" +
    LEP_IDENTITIES[council].instrument + "$").test(path);
}

/** Identity of the exact server-selected row; not a statutory-validity certificate. */
export function workingSeeDcpCitationBinding(row: DCPClause) {
  if (!row.id || !row.instrumentSlug || !row.bodyText ||
    !(row.updatedAt instanceof Date) || !Number.isFinite(row.updatedAt.getTime())) return undefined;
  return { clauseId: row.id, recordSha256: hash({
    id: row.id, council: row.lgaCode, instrumentSlug: row.instrumentSlug,
    ref: row.ref, title: row.title, headingPath: row.headingPath, parentRef: row.parentRef,
    bodyText: row.bodyText, numericMeta: row.numericMeta, updatedAt: row.updatedAt.toISOString(),
  }) };
}
function boundDcpRows(pack: DetailedPlanningPackContent, rows: readonly DCPClause[], council: Council) {
  const selected = new Map<string, DCPClause>();
  const citations = pack.dcpEvidence.flatMap(topic => topic.citations);
  if (!citations.length) fail();
  for (const citation of citations) {
    const binding = citation.sourceBinding;
    if (!binding || !binding.clauseId || !/^[a-f0-9]{64}$/.test(binding.recordSha256)) fail();
    const matches = rows.filter(row => row.id === binding.clauseId);
    if (!matches.length || matches.some(row => row.lgaCode !== council ||
      row.ref !== citation.ref || row.title !== citation.title ||
      hash(row.headingPath) !== hash(citation.headingPath) ||
      workingSeeDcpCitationBinding(row)?.recordSha256 !== binding.recordSha256)) fail();
    // Repeated selections of one unchanged row across topics are legitimate.
    // Different records sharing a human label remain distinct.
    selected.set(binding.clauseId, matches[0]);
  }
  return [...selected.values()];
}

function usableTime(source: Source, now: Date) {
  const fetched = Date.parse(source.retrievedAt);
  return Number.isFinite(fetched) && fetched <= now.getTime() &&
    fetched + DCP_SOURCE_CAPTURE_MAX_AGE_MS > now.getTime() &&
    Date.parse(source.recordUpdatedAt) <= now.getTime() &&
    (source.effectiveFrom === null || Date.parse(source.effectiveFrom) <= now.getTime()) &&
    (source.effectiveTo === null || Date.parse(source.effectiveTo) > now.getTime());
}

/**
 * Authenticated normal DPP creation calls this with server-loaded rows only.
 * The returned envelope is saved in the SAME new Artefact payload as the pack,
 * never by updating an older pack or creating a pretend PathwayAssessment.
 * It captures identity, not a statutory approval or a document-readiness decision.
 */
export async function captureWorkingSeePackSources(
  db: Pick<PrismaClient, "clause">, input: WorkingSeePackCaptureInput, now = new Date(),
): Promise<WorkingSeePackCaptureResult> {
  try {
    const { site, pack, quickSiteCheck } = input;
    const council = site.lgaCode;
    if ((council !== "BYRON" && council !== "KEMPSEY") ||
      site.projectId !== pack.projectId || pack.site.lgaCode !== council ||
      !pack.site.zoneCode || !pack.sourceQuickSiteCheck.artefactId ||
      !quickSiteCheck.lepInstrument?.name ||
      quickSiteCheck.lepInstrument.name !== LEP_IDENTITIES[council].name) fail();
    const references = requestedLepReferences(quickSiteCheck);
    const keys = references.flatMap(ref => lepClauseAliases(council, ref));
    const lepRows = await db.clause.findMany({
      where: { isCurrent: true, clauseKey: { in: keys },
        instrument: { name: quickSiteCheck.lepInstrument.name, instrumentType: "LEP" } },
      include: { instrument: true }, orderBy: [{ clauseKey: "asc" }, { id: "asc" }],
    });
    const sources: Source[] = [];
    for (const reference of references) {
      const aliases = lepClauseAliases(council, reference);
      const matches = lepRows.filter(row => aliases.includes(row.clauseKey) && row.isCurrent &&
        row.instrument.name === quickSiteCheck.lepInstrument!.name && row.instrument.instrumentType === "LEP");
      if (matches.length !== 1) fail();
      const row = matches[0];
      if (!row.retrievedAt || !scopedLepUrl(row.instrument.sourceUrl, council)) fail();
      sources.push({
        kind: "LEP", clauseId: row.id, reference: row.instrument.name + " cl. " + row.clauseKey,
        title: row.title || row.clauseKey, bodyText: row.bodyText, bodyTextSha256: bodyHash(row.bodyText),
        sourceUrl: row.instrument.sourceUrl, sourceVersion: "clause-version-" + row.version,
        retrievedAt: row.retrievedAt.toISOString(), recordUpdatedAt: row.updatedAt.toISOString(),
        originalRecordHash: row.contentHash, effectiveFrom: date(row.effectiveFrom),
        effectiveTo: date(row.effectiveTo), originMetadataJson: null,
      });
    }
    for (const row of boundDcpRows(pack, input.dcpClauses, council)) {
      const ref = row.ref;
      if (!ref) fail();
      const proof = readDcpSourceCapture(row.numericMeta, { council, bodyText: row.bodyText, now });
      if (!proof) fail();
      sources.push({
        kind: "DCP", clauseId: row.id, reference: ref, title: row.title || ref,
        bodyText: row.bodyText, bodyTextSha256: proof.bodyTextSha256, sourceUrl: proof.sourceUrl,
        sourceVersion: proof.sourceVersion, retrievedAt: proof.retrievedAt,
        recordUpdatedAt: row.updatedAt.toISOString(), originalRecordHash: null,
        effectiveFrom: null, effectiveTo: null, originMetadataJson: JSON.stringify(row.numericMeta),
      });
    }
    if (sources.some(source => !usableTime(source, now))) fail();
    sources.sort((a, b) => (a.kind + ":" + a.clauseId).localeCompare(b.kind + ":" + b.clauseId));
    const base = {
      schema: WORKING_SEE_PACK_CAPTURE_VERSION, status: "CAPTURED" as const,
      projectId: pack.projectId, siteId: site.id, siteBinding: savedSiteBinding(site),
      council, zoneCode: pack.site.zoneCode,
      sourceQuickSiteCheckArtefactId: pack.sourceQuickSiteCheck.artefactId,
      quickSiteCheckDigest: hash(quickSiteCheck), packDigest: packDigest(pack),
      capturedAt: now.toISOString(), expiresAt: new Date(Math.min(...sources.map(source =>
        Date.parse(source.retrievedAt) + DCP_SOURCE_CAPTURE_MAX_AGE_MS))).toISOString(), sources,
    };
    const result = captureSchema.safeParse({ ...base, digest: hash(base) });
    if (!result.success || Buffer.byteLength(JSON.stringify(result.data), "utf8") > MAX_CAPTURE_BYTES) fail();
    return result.data;
  } catch (error) {
    if (!(error instanceof WorkingSeePackCaptureError)) throw error;
    // The user may still save a qualified DPP. Missing proof is explicit and never fabricated.
    return { schema: WORKING_SEE_PACK_CAPTURE_VERSION, status: "UNAVAILABLE", reason: "source_capture_incomplete" };
  }
}

/** Read only, after owner/paid-scope authorization. No new lookup or backfill. */
export async function readWorkingSeePackSources(
  db: Pick<PrismaClient, "clause" | "dCPClause">,
  input: Omit<WorkingSeePackCaptureInput, "dcpClauses"> & { capture: unknown; resolvedZoneCode: string },
  now = new Date(),
): Promise<WorkingSeePackSourceCapture> {
  if (Buffer.byteLength(JSON.stringify(input.capture) ?? "", "utf8") > MAX_CAPTURE_BYTES) fail();
  const result = captureSchema.safeParse(input.capture);
  if (!result.success) fail();
  const capture = result.data;
  const { digest, ...base } = capture;
  if (digest !== hash(base) || capture.projectId !== input.pack.projectId ||
    capture.projectId !== input.site.projectId || capture.siteId !== input.site.id ||
    capture.siteBinding !== savedSiteBinding(input.site) || capture.council !== input.site.lgaCode ||
    capture.council !== input.pack.site.lgaCode || capture.zoneCode !== input.resolvedZoneCode ||
    capture.zoneCode !== input.pack.site.zoneCode || capture.packDigest !== packDigest(input.pack) ||
    capture.quickSiteCheckDigest !== hash(input.quickSiteCheck) ||
    capture.sourceQuickSiteCheckArtefactId !== input.pack.sourceQuickSiteCheck.artefactId ||
    Date.parse(capture.capturedAt) > now.getTime() || Date.parse(capture.capturedAt) < input.site.updatedAt.getTime() ||
    Date.parse(capture.expiresAt) <= now.getTime()) fail();
  const leps = await db.clause.findMany({
    where: { id: { in: capture.sources.filter(s => s.kind === "LEP").map(s => s.clauseId) } },
    include: { instrument: true },
  });
  const dcps = await db.dCPClause.findMany({
    where: { id: { in: capture.sources.filter(s => s.kind === "DCP").map(s => s.clauseId) } },
  });
  if (capture.schema === WORKING_SEE_PACK_CAPTURE_VERSION) {
    if (input.quickSiteCheck.lepInstrument?.name !== LEP_IDENTITIES[capture.council].name) fail();
    const references = requestedLepReferences(input.quickSiteCheck);
    const lepSources = capture.sources.filter(source => source.kind === "LEP");
    if (lepSources.length !== references.length) fail();
    for (const reference of references) {
      const aliases = lepClauseAliases(capture.council, reference);
      const matches = lepSources.filter(source => leps.some(row =>
        row.id === source.clauseId && aliases.includes(row.clauseKey)));
      if (matches.length !== 1) fail();
    }
    const expectedDcp = boundDcpRows(input.pack, dcps, capture.council);
    const dcpSources = capture.sources.filter(source => source.kind === "DCP");
    if (expectedDcp.length !== dcpSources.length || expectedDcp.some(row =>
      !dcpSources.some(source => source.clauseId === row.id))) fail();
  }
  const seen = new Set<string>();
  for (const source of capture.sources) {
    const key = source.kind + ":" + (capture.schema === LEGACY_CAPTURE_VERSION ? source.reference : source.clauseId);
    if (seen.has(key) || !usableTime(source, now) ||
      Date.parse(source.retrievedAt) > Date.parse(capture.capturedAt) ||
      Date.parse(source.recordUpdatedAt) > Date.parse(capture.capturedAt) ||
      source.bodyTextSha256 !== bodyHash(source.bodyText)) fail();
    seen.add(key);
    if (source.kind === "LEP") {
      const matches = leps.filter(row => row.id === source.clauseId);
      if (matches.length !== 1) fail();
      const row = matches[0];
      if (!row.isCurrent || row.instrument.instrumentType !== "LEP" ||
        row.instrument.name !== input.quickSiteCheck.lepInstrument?.name ||
        !row.instrument.name.toLowerCase().startsWith(capture.council.toLowerCase() + " ") ||
        !officialLepUrl(row.instrument.sourceUrl) ||
        (capture.schema === WORKING_SEE_PACK_CAPTURE_VERSION && !scopedLepUrl(row.instrument.sourceUrl, capture.council)) ||
        source.sourceUrl !== row.instrument.sourceUrl ||
        source.reference !== row.instrument.name + " cl. " + row.clauseKey ||
        source.sourceVersion !== "clause-version-" + row.version ||
        source.originalRecordHash !== row.contentHash || source.bodyText !== row.bodyText ||
        source.recordUpdatedAt !== row.updatedAt.toISOString() ||
        source.retrievedAt !== date(row.retrievedAt) ||
        source.effectiveFrom !== date(row.effectiveFrom) || source.effectiveTo !== date(row.effectiveTo)) fail();
    } else {
      const matches = dcps.filter(row => row.id === source.clauseId);
      if (matches.length !== 1) fail();
      const row = matches[0];
      const proof = readDcpSourceCapture(row.numericMeta, { council: capture.council, bodyText: row.bodyText, now });
      if (!proof || row.lgaCode !== capture.council || row.ref !== source.reference ||
        source.bodyText !== row.bodyText || source.recordUpdatedAt !== row.updatedAt.toISOString() ||
        source.originMetadataJson !== JSON.stringify(row.numericMeta) ||
        source.sourceUrl !== proof.sourceUrl || source.sourceVersion !== proof.sourceVersion ||
        source.retrievedAt !== proof.retrievedAt || source.bodyTextSha256 !== proof.bodyTextSha256) fail();
    }
  }
  if (!capture.sources.some(s => s.kind === "LEP") || !capture.sources.some(s => s.kind === "DCP")) fail();
  return capture;
}
