import assert from "node:assert/strict";
import test from "node:test";

import {
  assessSpatialEvidenceReadiness,
  buildSpatialEvidenceExpiry,
  buildSpatialSiteFingerprint,
  reviewSpatialEvidence,
  SpatialEvidenceError,
  type SpatialEvidenceRecord,
} from "@/lib/spatial-evidence";

const NOW = new Date("2026-08-03T01:00:00.000Z");
const site = {
  address: "45 Broken Head Road, Byron Bay NSW 2481",
  lgaCode: "BYRON",
  lgaName: "Byron Shire",
  parcelId: "lot-1-dp-123",
  lot: "1",
  planNumber: "DP123",
  latitude: -28.65,
  longitude: 153.62,
  zone: "SP3 Tourist",
};
const siteFingerprint = buildSpatialSiteFingerprint(site);

const makeEvidence = (overrides: Partial<SpatialEvidenceRecord> = {}): SpatialEvidenceRecord => ({
  id: "spatial-1",
  artefactId: "artefact-1",
  projectId: "project-1",
  sourceAuthority: "NSW_GOVERNMENT",
  contentHash: "a".repeat(64),
  siteFingerprint,
  siteAddress: site.address,
  layers: ["Bushfire"],
  legendStatus: "CAPTURED",
  legendNotes: "Legend visible in capture.",
  observation: "The mapped bushfire layer intersects the eastern portion of the site.",
  limitation: "Viewer scale does not establish a surveyed boundary or replace a bushfire report.",
  sourceCheckedAt: NOW,
  expiresAt: buildSpatialEvidenceExpiry(NOW),
  status: "PENDING_REVIEW",
  version: 1,
  ...overrides,
});

class ReviewPrisma {
  events: any[] = [];
  constructor(public projectRecord: any, public record: any) {}

  project = {
    findFirst: async () => this.projectRecord,
  };

  spatialEvidence = {
    findFirst: async ({ where }: any) =>
      where.artefactId === this.record.artefactId && where.projectId === this.record.projectId ? this.record : null,
    update: async ({ where, data }: any) => {
      assert.equal(where.id_version.id, this.record.id);
      assert.equal(where.id_version.version, this.record.version);
      const event = {
        id: `event-${this.events.length + 1}`,
        ...data.reviewEvents.create,
        createdAt: NOW,
      };
      this.events.push(event);
      this.record = {
        ...this.record,
        status: data.status,
        version: this.record.version + 1,
        reviewedAt: data.reviewedAt,
        reviewNote: data.reviewNote,
        reviewEvents: [...this.events],
      };
      return this.record;
    },
  };
}

const projectRecord = {
  id: "project-1",
  publicId: "proj-public",
  address: site.address,
  zoning: site.zone,
  siteContext: {
    formattedAddress: site.address,
    lgaCode: site.lgaCode,
    lgaName: site.lgaName,
    parcelId: site.parcelId,
    lot: site.lot,
    planNumber: site.planNumber,
    latitude: site.latitude,
    longitude: site.longitude,
    zone: site.zone,
  },
};

test("spatial site fingerprints are deterministic and change with the confirmed site", () => {
  assert.equal(buildSpatialSiteFingerprint({ ...site, address: `${site.address}, Australia` }), siteFingerprint);
  assert.notEqual(buildSpatialSiteFingerprint({ ...site, lot: "2" }), siteFingerprint);
});

test("readiness consumes only accepted, current, non-expired evidence with a usable legend", () => {
  const result = assessSpatialEvidenceReadiness({
    evidence: [makeEvidence({ status: "ACCEPTED" })],
    currentSiteFingerprint: siteFingerprint,
    now: NOW,
  });
  assert.equal(result.ready, true);
  assert.equal(result.accepted.length, 1);
  assert.deepEqual(result.blockers, []);
});

test("readiness exposes pending, conflicting, stale and changed-site evidence", () => {
  const result = assessSpatialEvidenceReadiness({
    evidence: [
      makeEvidence(),
      makeEvidence({ id: "spatial-2", artefactId: "artefact-2", status: "CONFLICT", reviewNote: "Council and NSW layers disagree." }),
      makeEvidence({ id: "spatial-3", artefactId: "artefact-3", status: "ACCEPTED", expiresAt: new Date("2026-08-02T00:00:00.000Z") }),
      makeEvidence({ id: "spatial-4", artefactId: "artefact-4", status: "ACCEPTED", siteFingerprint: "different-site" }),
    ],
    currentSiteFingerprint: siteFingerprint,
    now: NOW,
  });
  assert.equal(result.ready, false);
  assert.deepEqual(new Set(result.blockers.map((blocker) => blocker.code)), new Set(["PENDING_REVIEW", "CONFLICT", "STALE", "SITE_MISMATCH", "NO_ACCEPTED_EVIDENCE"]));
});

test("accepts exact-site current evidence and appends a review event", async () => {
  const prisma = new ReviewPrisma(projectRecord, makeEvidence());
  const result: any = await reviewSpatialEvidence({
    artefactId: "artefact-1",
    body: { decision: "ACCEPT" },
    projectId: "proj-public",
    userId: "user-1",
    now: NOW,
    prismaClient: prisma as any,
  });
  assert.equal(result.status, "ACCEPTED");
  assert.equal(result.reviewEvents.length, 1);
  assert.equal(result.reviewEvents[0].previousStatus, "PENDING_REVIEW");
  assert.equal(result.reviewEvents[0].resultingStatus, "ACCEPTED");
});

test("refuses acceptance after the project site changes", async () => {
  const prisma = new ReviewPrisma({
    ...projectRecord,
    siteContext: { ...projectRecord.siteContext, lot: "2" },
  }, makeEvidence());
  await assert.rejects(
    () => reviewSpatialEvidence({ artefactId: "artefact-1", body: { decision: "ACCEPT" }, projectId: "project-1", userId: "user-1", now: NOW, prismaClient: prisma as any }),
    (error) => error instanceof SpatialEvidenceError && error.status === 409 && error.message.includes("earlier or different"),
  );
});

test("refuses stale or legend-less evidence acceptance", async () => {
  const stale = new ReviewPrisma(projectRecord, makeEvidence({ expiresAt: new Date("2026-08-02T00:00:00.000Z") }));
  await assert.rejects(
    () => reviewSpatialEvidence({ artefactId: "artefact-1", body: { decision: "ACCEPT" }, projectId: "project-1", userId: "user-1", now: NOW, prismaClient: stale as any }),
    (error) => error instanceof SpatialEvidenceError && error.status === 409 && error.message.includes("90-day"),
  );

  const noLegend = new ReviewPrisma(projectRecord, makeEvidence({ legendStatus: "NOT_AVAILABLE" }));
  await assert.rejects(
    () => reviewSpatialEvidence({ artefactId: "artefact-1", body: { decision: "ACCEPT" }, projectId: "project-1", userId: "user-1", now: NOW, prismaClient: noLegend as any }),
    (error) => error instanceof SpatialEvidenceError && error.status === 409 && error.message.includes("legend"),
  );
});

test("conflict decisions require a note and remain visible in the review ledger", async () => {
  const prisma = new ReviewPrisma(projectRecord, makeEvidence());
  await assert.rejects(
    () => reviewSpatialEvidence({ artefactId: "artefact-1", body: { decision: "MARK_CONFLICT" }, projectId: "project-1", userId: "user-1", now: NOW, prismaClient: prisma as any }),
    (error) => error instanceof SpatialEvidenceError && error.message.includes("review note"),
  );
  const result: any = await reviewSpatialEvidence({
    artefactId: "artefact-1",
    body: { decision: "MARK_CONFLICT", note: "Council flood layer conflicts with the supplied survey." },
    projectId: "project-1",
    userId: "user-1",
    now: NOW,
    prismaClient: prisma as any,
  });
  assert.equal(result.status, "CONFLICT");
  assert.equal(result.reviewEvents[0].decision, "MARK_CONFLICT");
});
