import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import type { Prisma, PrismaClient, SiteContext, SiteSpatialProvenance } from "@prisma/client";
import { assessSpatialProvenance, type SpatialProvenance } from "./spatial-provenance";

export const SAVED_SITE_PROVENANCE_VERSION = "resolved-site-provenance.v1";
// Operational cache lifetime, not a guarantee that a planning instrument is current.
export const SAVED_SITE_PROVENANCE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
type Database = Pick<PrismaClient, "$transaction" | "siteSpatialProvenance">;
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const unavailable = () => new Error("site_provenance_unavailable");

export function savedSiteBinding(site: SiteContext): string {
  return hash({
    id: site.id, projectId: site.projectId,
    addressInput: site.addressInput, formattedAddress: site.formattedAddress,
    lgaName: site.lgaName, lgaCode: site.lgaCode,
    parcelId: site.parcelId, lot: site.lot, planNumber: site.planNumber,
    latitude: site.latitude, longitude: site.longitude, zone: site.zone,
    revision: site.updatedAt.toISOString(),
  });
}

// The authoritative code comes from the saved lookup, never from parsing a
// display label. The label is checked for consistency but remains in siteBinding.
export function matchesResolvedZoneLabel(label: string | null, code: string | null): boolean {
  if (!label || !code || !/^[A-Z]{1,3}[0-9]{0,2}[A-Z]?$/.test(code)) return false;
  const normalized = label.trim().replace(/\s+/g, " ").toUpperCase();
  if (normalized === code) return true;
  if (!normalized.startsWith(code + " ")) return false;
  const description = normalized.slice(code.length).trim().replace(/^[-\u2013\u2014]\s*/, "");
  return Boolean(description && /^[A-Z]/.test(description) &&
    !/\b(?:RU|R|E|MU|B|IN|SP|RE|C|W)[0-9][A-Z]?\b/.test(description));
}

function validatedSpatial(
  value: unknown, site: SiteContext, now: Date,
): SpatialProvenance | null {
  try {
    if (!value || typeof value !== "object" || !site.lgaCode || !site.zone) return null;
    const spatial = value as SpatialProvenance;
    const validated = assessSpatialProvenance({
      zoneCode: spatial.zoneCode, zoningSource: spatial.zoningSource,
      resolutionMethod: spatial.resolutionMethod, serviceUrl: spatial.serviceUrl,
      featureIdentifier: spatial.featureIdentifier, resolvedAt: spatial.resolvedAt,
      coordinates: spatial.query.coordinates, parcelId: spatial.query.parcelId,
    });
    if (!isDeepStrictEqual(validated, spatial) || validated.status !== "verified" ||
      !validated.authoritative || !matchesResolvedZoneLabel(site.zone, validated.zoneCode) ||
      !validated.resolvedAt || !validated.serviceUrl) return null;
    const age = now.getTime() - new Date(validated.resolvedAt).getTime();
    if (!Number.isFinite(age) || age < 0 || age >= SAVED_SITE_PROVENANCE_MAX_AGE_MS) return null;
    const coordinates = site.latitude !== null && site.longitude !== null
      ? { lat: site.latitude, lng: site.longitude } : null;
    if (!isDeepStrictEqual(validated.query.coordinates, coordinates) ||
      validated.query.parcelId !== (site.parcelId?.trim() || null)) return null;
    return validated;
  } catch {
    return null;
  }
}

function envelopeFor(site: SiteContext, spatial: SpatialProvenance) {
  return {
    schema: SAVED_SITE_PROVENANCE_VERSION,
    siteBinding: savedSiteBinding(site),
    spatial,
  };
}

export function readSavedSiteProvenance(
  row: SiteSpatialProvenance | null, site: SiteContext, now: Date,
): SpatialProvenance | null {
  try {
    if (!row || row.siteContextId !== site.id ||
      row.sourceVersion !== SAVED_SITE_PROVENANCE_VERSION ||
      !row.staleAt || row.staleAt.getTime() <= now.getTime()) return null;
    const payload = row.payload as { spatial?: unknown } | null;
    const spatial = validatedSpatial(payload?.spatial, site, now);
    if (!spatial) return null;
    const envelope = envelopeFor(site, spatial);
    if (!isDeepStrictEqual(row.payload, envelope) || row.contentHash !== hash(envelope) ||
      row.authority !== "NSW Planning" || row.datasetName !== "EPI Primary Planning Layers - zoning" ||
      row.sourceUrl !== spatial.serviceUrl || row.trustLevel !== "EVIDENCE_VERIFIED" ||
      row.matchMethod !== spatial.resolutionMethod || row.lgaCode !== site.lgaCode ||
      row.zoneCode !== spatial.zoneCode || row.parcelId !== site.parcelId ||
      row.lot !== site.lot || row.planNumber !== site.planNumber ||
      row.latitude !== site.latitude || row.longitude !== site.longitude ||
      row.retrievedAt.toISOString() !== spatial.resolvedAt ||
      row.staleAt.getTime() !== row.retrievedAt.getTime() + SAVED_SITE_PROVENANCE_MAX_AGE_MS) return null;
    return spatial;
  } catch {
    return null;
  }
}

/**
 * Internal resolver persistence only, never a browser-supplied provenance object.
 * Caller must already authorize the site mutation. The flag is default-off and
 * Preview-only; operators must separately verify that Preview targets an isolated
 * database before enabling it. No migration, deletion, or remote lookup occurs here.
 * contentHash protects this captured lookup envelope, NOT a full provider response.
 */
export function createResolvedSiteProvenanceStorage(deps: {
  prisma: Database;
  deploymentEnvironment: string | undefined;
  enabled: boolean;
  now?: () => Date;
}) {
  const enabled = deps.deploymentEnvironment === "preview" && deps.enabled === true;
  const now = deps.now ?? (() => new Date());
  return {
    async retain(site: SiteContext, value: unknown): Promise<boolean> {
      if (!enabled) return false;
      const capturedAt = now();
      const spatial = validatedSpatial(value, site, capturedAt);
      if (!spatial) return false;
      const envelope = envelopeFor(site, spatial);
      const contentHash = hash(envelope);
      // The resolver already saved SiteContext. Serialize the append against the
      // current row and bind its revision, so edits/races cannot reuse old evidence.
      await deps.prisma.$transaction(async (tx) => {
        const current = await tx.siteContext.findUnique({ where: { id: site.id } });
        if (!current || savedSiteBinding(current) !== envelope.siteBinding) throw unavailable();
        const retrievedAt = new Date(spatial.resolvedAt!);
        const row = await tx.siteSpatialProvenance.upsert({
          where: { siteContextId_contentHash: { siteContextId: site.id, contentHash } },
          create: {
            siteContextId: site.id,
            authority: "NSW Planning",
            datasetName: "EPI Primary Planning Layers - zoning",
            sourceVersion: SAVED_SITE_PROVENANCE_VERSION,
            sourceUrl: spatial.serviceUrl!,
            retrievedAt,
            contentHash,
            matchMethod: spatial.resolutionMethod,
            parcelId: site.parcelId, lot: site.lot, planNumber: site.planNumber,
            lgaCode: site.lgaCode!, zoneCode: spatial.zoneCode,
            latitude: site.latitude, longitude: site.longitude,
            payload: envelope as unknown as Prisma.InputJsonValue,
            trustLevel: "EVIDENCE_VERIFIED",
            staleAt: new Date(retrievedAt.getTime() + SAVED_SITE_PROVENANCE_MAX_AGE_MS),
          },
          update: {},
        });
        if (!readSavedSiteProvenance(row, current, capturedAt)) throw unavailable();
      }, { isolationLevel: "Serializable" });
      return true;
    },

    async reload<T extends SiteContext>(site: T | null):
      Promise<(T & { spatialProvenance?: SpatialProvenance }) | null> {
      if (!site || !enabled) return site;
      // A saved timestamp, not latest unrelated evidence, selects the exact revision.
      const row = await deps.prisma.siteSpatialProvenance.findFirst({
        where: {
          siteContextId: site.id,
          sourceVersion: SAVED_SITE_PROVENANCE_VERSION,
          payload: { path: ["siteBinding"], equals: savedSiteBinding(site) },
        },
        orderBy: [{ retrievedAt: "desc" }, { id: "desc" }],
      });
      const spatialProvenance = readSavedSiteProvenance(row, site, now());
      return spatialProvenance ? { ...site, spatialProvenance } : site;
    },
  };
}
