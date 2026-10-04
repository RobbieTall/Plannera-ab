import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient, SiteContext, SiteSpatialProvenance } from "@prisma/client";
import { assessSpatialProvenance, NSW_EPI_ZONING_LAYER_URL } from "../src/lib/spatial-provenance";
import {
  createResolvedSiteProvenanceStorage, readSavedSiteProvenance, readSavedCouncilIdentity,
  savedSiteBinding, SAVED_SITE_PROVENANCE_MAX_AGE_MS,
} from "../src/lib/site-context-provenance-storage";

import { lookupWorkingSeeCouncilIdentity } from "../src/lib/see-document-council-identity";

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

test("formatted labels retain the actual lookup code separately and reload unchanged", async () => {
  for (const zone of ["RU2 Rural Landscape", "RU2 - Rural Landscape", "RU2 \u2013 Rural Landscape"]) {
    const f = fixture();
    const labelledSite = { ...site, zone };
    f.setSite(labelledSite);
    assert.equal(await f.storage.retain(labelledSite, spatial), true);
    assert.equal(f.row()?.zoneCode, "RU2");
    assert.deepEqual((await f.storage.reload(labelledSite))?.spatialProvenance, spatial);
    assert.equal(readSavedSiteProvenance(f.row(), site, clock), null);
  }
});

test("ambiguous or conflicting labels cannot supply an authoritative code", async () => {
  const f = fixture();
  for (const zone of ["R2 Rural Landscape", "RU20 Rural Landscape", "Rural Landscape",
    "RU2 / R2", "RU2 - R2 Low Density Residential", "RU2 -"]) {
    assert.equal(await f.storage.retain({ ...site, zone }, spatial), false);
  }
  assert.equal(f.calls(), 0);
});

test("a formatted label cannot replace the separate mirrored lookup code", async () => {
  const f = fixture();
  const labelledSite = { ...site, zone: "RU2 - Rural Landscape" };
  f.setSite(labelledSite);
  await f.storage.retain(labelledSite, spatial);
  assert.equal(readSavedSiteProvenance({ ...f.row()!, zoneCode: labelledSite.zone }, labelledSite, clock), null);
});

async function councilProof(council = "Byron", capturedAt = clock, enddate: number | null = null) {
  const proof = await lookupWorkingSeeCouncilIdentity({ lat: site.latitude!, lng: site.longitude! }, {
    fetcher: async () => new Response(JSON.stringify({ features: [{ attributes: {
      rid: 1, lganame: council, councilname: council + " Shire Council", abscode: 99999, enddate,
    } }] }), { headers: { "content-type": "application/json" } }),
    now: () => capturedAt,
  });
  assert.ok(proof);
  return proof;
}
test("retained council response is bound to the exact saved site and zoning envelope", async () => {
  const f = fixture();
  const proof = await councilProof();
  assert.equal(await f.storage.retain(site, spatial, proof), true);
  assert.deepEqual(readSavedCouncilIdentity(f.row(), site, clock), proof);
  assert.deepEqual(readSavedSiteProvenance(f.row(), site, clock), spatial);
  assert.equal(readSavedCouncilIdentity(f.row(), { ...site, longitude: 152 }, clock), null);
  assert.equal(readSavedCouncilIdentity(f.row(), { ...site, lgaCode: "KEMPSEY" }, clock), null);
});
test("legacy zoning records remain readable but cannot invent council evidence", async () => {
  const f = fixture();
  await f.storage.retain(site, spatial);
  assert.deepEqual(readSavedSiteProvenance(f.row(), site, clock), spatial);
  assert.equal(readSavedCouncilIdentity(f.row(), site, clock), null);
});
test("invalid, conflicting and expired council proof causes no persistence", async () => {
  const proof = await councilProof();
  const other = await councilProof("Kempsey");
  const expired = await councilProof("Byron", new Date(clock.getTime() - SAVED_SITE_PROVENANCE_MAX_AGE_MS));
  for (const invalid of [null, {}, other, expired, { ...proof, responseSha256: "wrong" }]) {
    const f = fixture();
    assert.equal(await f.storage.retain(site, spatial, invalid), false);
    assert.equal(f.calls(), 0);
  }
  const f = fixture();
  assert.equal(await f.storage.retain({ ...site, lgaName: "Kempsey" }, spatial, proof), false);
  assert.equal(f.calls(), 0);
});
test("a retained council proof expires independently of the newer zoning lookup", async () => {
  const f = fixture();
  const proof = await councilProof("Byron", new Date(clock.getTime() - 60 * 60 * 1000));
  await f.storage.retain(site, spatial, proof);
  const later = new Date(clock.getTime() + 23 * 60 * 60 * 1000);
  assert.ok(f.row()!.staleAt!.getTime() > later.getTime());
  assert.equal(readSavedCouncilIdentity(f.row(), site, later), null);
  assert.equal(readSavedSiteProvenance(f.row(), site, later), null);
});
test("adding or substituting council evidence cannot reuse an old envelope hash", async () => {
  const f = fixture();
  await f.storage.retain(site, spatial);
  const row = f.row()!;
  const payload = row.payload as Record<string, import("@prisma/client").Prisma.JsonValue>;
  const forged = { ...row, payload: { ...payload, councilIdentity: await councilProof() } };
  assert.equal(readSavedCouncilIdentity(forged, site, clock), null);
  assert.equal(readSavedSiteProvenance(forged, site, clock), null);
});

test("future-dated council proof survives normal retention and reread for each council", async () => {
  for (const council of ["Byron", "Kempsey"]) {
    const f = fixture();
    const currentSite = { ...site, lgaName: council, lgaCode: council.toUpperCase() };
    f.setSite(currentSite);
    const proof = await councilProof(council, clock, 32503680000000);
    assert.equal(await f.storage.retain(currentSite, spatial, proof), true);
    const originalRow = structuredClone(f.row());
    assert.deepEqual(readSavedCouncilIdentity(f.row(), currentSite, clock), proof);
    assert.deepEqual((await f.storage.reload(currentSite))?.spatialProvenance, spatial);
    assert.equal(await f.storage.retain(currentSite, spatial, proof), true);
    assert.deepEqual(f.row(), originalRow);
  }
});
test("provider expiry invalidates retained council and zoning evidence before the 24-hour limit", async () => {
  const f = fixture();
  const enddate = clock.getTime() + 60_000;
  const proof = await councilProof("Byron", clock, enddate);
  assert.equal(await f.storage.retain(site, spatial, proof), true);
  const originalRow = structuredClone(f.row());
  assert.ok(f.row()!.staleAt!.getTime() > enddate);
  assert.ok(readSavedCouncilIdentity(f.row(), site, new Date(enddate - 1)));
  for (const time of [enddate, enddate + 1]) {
    const now = new Date(time);
    f.setNow(now);
    assert.equal(readSavedCouncilIdentity(f.row(), site, now), null);
    assert.equal(readSavedSiteProvenance(f.row(), site, now), null);
    assert.equal((await f.storage.reload(site))?.spatialProvenance, undefined);
  }
  assert.deepEqual(f.row(), originalRow);
});
test("proof that expires between lookup and retention is rejected before database I/O", async () => {
  const f = fixture();
  const enddate = clock.getTime() + 1;
  const proof = await councilProof("Byron", clock, enddate);
  f.setNow(new Date(enddate));
  assert.equal(await f.storage.retain(site, spatial, proof), false);
  assert.equal(f.calls(), 0);
});
test("future provider dates cannot bypass saved-site revision, hash, council or age checks", async () => {
  const f = fixture();
  const proof = await councilProof("Byron", clock, 32503680000000);
  assert.equal(await f.storage.retain(site, spatial, proof), true);
  for (const changed of [{ ...site, lgaCode: "KEMPSEY" }, { ...site, updatedAt: new Date(clock.getTime() + 1) }]) {
    assert.equal(readSavedCouncilIdentity(f.row(), changed, clock), null);
  }
  assert.equal(readSavedCouncilIdentity({ ...f.row()!, contentHash: "0".repeat(64) }, site, clock), null);
  assert.equal(readSavedCouncilIdentity(f.row(), site, new Date(clock.getTime() + SAVED_SITE_PROVENANCE_MAX_AGE_MS)), null);
});
