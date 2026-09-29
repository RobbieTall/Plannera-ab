import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient, SiteContext, SiteSpatialProvenance } from "@prisma/client";
import { assessSpatialProvenance, NSW_EPI_ZONING_LAYER_URL } from "../src/lib/spatial-provenance";
import {
  createResolvedSiteProvenanceStorage, readSavedSiteProvenance,
  savedSiteBinding, SAVED_SITE_PROVENANCE_MAX_AGE_MS,
} from "../src/lib/site-context-provenance-storage";

const clock = new Date("2026-09-29T01:00:00Z");
const site: SiteContext = {
  id: "synthetic-site", projectId: "synthetic-project",
  addressInput: "Synthetic test site", formattedAddress: "Synthetic test site",
  lgaName: "Byron", lgaCode: "BYRON", parcelId: "1/DP1",
  lot: "1", planNumber: "DP1", latitude: -28.6, longitude: 153.5, zone: "RU2",
  createdAt: clock, updatedAt: clock,
};
const spatial = assessSpatialProvenance({
  zoneCode: "RU2", zoningSource: "NSW_EPI_LZN",
  resolutionMethod: "coordinate_intersection", serviceUrl: NSW_EPI_ZONING_LAYER_URL,
  featureIdentifier: "synthetic-feature", resolvedAt: clock,
  coordinates: { lat: -28.6, lng: 153.5 }, parcelId: "1/DP1",
});
function fixture(environment = "preview", enabled = true) {
  let row: SiteSpatialProvenance | null = null;
  let current: SiteContext | null = { ...site };
  let calls = 0;
  let now = clock;
  const table = {
    async upsert(args: { create: Omit<SiteSpatialProvenance, "id" | "createdAt" | "effectiveAt"> }) {
      calls++;
      row ??= { id: "synthetic-provenance", createdAt: clock, effectiveAt: null, ...args.create };
      return row;
    },
    async findFirst() { calls++; return row; },
  };
  const db = {
    siteSpatialProvenance: table,
    async $transaction<T>(fn: (tx: {
      siteContext: { findUnique: () => Promise<SiteContext | null> };
      siteSpatialProvenance: typeof table;
    }) => Promise<T>, options: { isolationLevel: string }) {
      calls++;
      assert.equal(options.isolationLevel, "Serializable");
      return fn({ siteContext: { findUnique: async () => current }, siteSpatialProvenance: table });
    },
  };
  const storage = createResolvedSiteProvenanceStorage({
    prisma: db as unknown as Pick<PrismaClient, "$transaction" | "siteSpatialProvenance">,
    deploymentEnvironment: environment, enabled, now: () => now,
  });
  return {
    storage, calls: () => calls, row: () => row,
    setSite: (next: SiteContext | null) => { current = next; },
    setRow: (next: SiteSpatialProvenance) => { row = next; },
    setNow: (next: Date) => { now = next; },
  };
}

test("Preview retains and reloads the exact lookup without inventing provenance", async () => {
  const f = fixture();
  assert.equal(await f.storage.retain(site, spatial), true);
  assert.deepEqual((await f.storage.reload(site))?.spatialProvenance, spatial);
  assert.equal(f.row()?.retrievedAt.toISOString(), spatial.resolvedAt);
});

test("Production and disabled Preview do no database I/O", async () => {
  for (const f of [fixture("production"), fixture("preview", false), fixture("development")]) {
    assert.equal(await f.storage.retain(site, spatial), false);
    assert.equal(await f.storage.reload(site), site);
    assert.equal(f.calls(), 0);
  }
});

test("candidate fallback cannot be promoted to retained authoritative evidence", async () => {
  const f = fixture();
  assert.equal(await f.storage.retain(site, assessSpatialProvenance({
    zoneCode: "RU2", zoningSource: "LAUNCH_FIXTURE", resolutionMethod: "candidate_fallback",
  })), false);
  assert.equal(f.calls(), 0);
});

test("forged verification flags and malformed payloads fail closed", async () => {
  const f = fixture();
  for (const value of [null, {}, { ...spatial, serviceUrl: "https://example.invalid" },
    { ...spatial, limitations: ["zone_conflict"] }, { ...spatial, query: null }]) {
    assert.equal(await f.storage.retain(site, value), false);
  }
  assert.equal(f.calls(), 0);
});

test("future and expired lookup timestamps cannot be retained", async () => {
  const f = fixture();
  f.setNow(new Date(clock.getTime() - 1));
  assert.equal(await f.storage.retain(site, spatial), false);
  f.setNow(new Date(clock.getTime() + SAVED_SITE_PROVENANCE_MAX_AGE_MS));
  assert.equal(await f.storage.retain(site, spatial), false);
  assert.equal(f.calls(), 0);
});

test("zone, coordinates, parcel and missing council must match the saved site", async () => {
  const f = fixture();
  for (const patch of [{ zone: "R2" }, { latitude: -31 }, { parcelId: "2/DP2" }, { lgaCode: null }]) {
    assert.equal(await f.storage.retain({ ...site, ...patch }, spatial), false);
  }
  assert.equal(f.calls(), 0);
});

test("a concurrent site edit or removal stops the provenance append", async () => {
  for (const changed of [null, { ...site, formattedAddress: "Another site" }]) {
    const f = fixture();
    f.setSite(changed);
    await assert.rejects(f.storage.retain(site, spatial), /site_provenance_unavailable/);
    assert.equal(f.row(), null);
  }
});

test("same lookup retries preserve the existing immutable record", async () => {
  const f = fixture();
  await f.storage.retain(site, spatial);
  const original = f.row();
  await f.storage.retain(site, spatial);
  assert.equal(f.row(), original);
});

test("every site identity or revision change invalidates earlier proof", async () => {
  const f = fixture();
  await f.storage.retain(site, spatial);
  const changes = [
    { id: "another" }, { projectId: "another" }, { addressInput: "other" },
    { formattedAddress: "other" }, { lgaName: "Kempsey" }, { lgaCode: "KEMPSEY" },
    { parcelId: "other" }, { lot: "2" }, { planNumber: "DP2" },
    { latitude: -31 }, { longitude: 152 }, { zone: "R2" },
    { updatedAt: new Date(clock.getTime() + 1) },
  ];
  for (const change of changes) {
    const edited = { ...site, ...change };
    assert.notEqual(savedSiteBinding(edited), savedSiteBinding(site));
    assert.equal(readSavedSiteProvenance(f.row(), edited, clock), null);
  }
});

test("tampered envelope, hash or mirrored metadata cannot become verified", async () => {
  const f = fixture();
  await f.storage.retain(site, spatial);
  const row = f.row()!;
  for (const patch of [
    { contentHash: "wrong" }, { sourceUrl: "https://example.invalid" },
    { trustLevel: "OPERATOR_APPROVED" }, { siteContextId: "other" },
    { sourceVersion: "older" }, { lgaCode: "KEMPSEY" },
    { payload: {} }, { retrievedAt: new Date(clock.getTime() - 1) },
    { staleAt: null }, { staleAt: new Date(clock.getTime() + 999999999) },
  ]) {
    assert.equal(readSavedSiteProvenance({ ...row, ...patch }, site, clock), null);
  }
});

test("read expiry does not silently refresh the retrieval date", async () => {
  const f = fixture();
  await f.storage.retain(site, spatial);
  f.setNow(new Date(clock.getTime() + SAVED_SITE_PROVENANCE_MAX_AGE_MS));
  assert.equal((await f.storage.reload(site))?.spatialProvenance, undefined);
  assert.equal(f.row()?.retrievedAt.toISOString(), spatial.resolvedAt);
});

test("a conflicting existing immutable row is rejected rather than overwritten", async () => {
  const f = fixture();
  await f.storage.retain(site, spatial);
  f.setRow({ ...f.row()!, sourceUrl: "https://example.invalid" });
  await assert.rejects(f.storage.retain(site, spatial), /site_provenance_unavailable/);
  assert.equal(f.row()?.sourceUrl, "https://example.invalid");
});

test("parcel lookup evidence is retained without fabricating coordinates", async () => {
  const f = fixture();
  const parcelSite = { ...site, latitude: null, longitude: null };
  f.setSite(parcelSite);
  const parcelSpatial = assessSpatialProvenance({
    zoneCode: "RU2", zoningSource: "NSW_LZN", resolutionMethod: "parcel_lookup",
    serviceUrl: NSW_EPI_ZONING_LAYER_URL, featureIdentifier: "synthetic-parcel-feature",
    resolvedAt: clock, parcelId: "1/DP1",
  });
  assert.equal(await f.storage.retain(parcelSite, parcelSpatial), true);
  assert.deepEqual((await f.storage.reload(parcelSite))?.spatialProvenance, parcelSpatial);
});

test("missing records and missing site remain unverified", async () => {
  const f = fixture();
  assert.equal(await f.storage.reload(null), null);
  assert.equal(await f.storage.reload(site), site);
});
