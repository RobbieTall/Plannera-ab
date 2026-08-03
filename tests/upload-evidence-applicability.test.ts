import assert from "node:assert/strict";
import test from "node:test";

import { fingerprintPurchaseProposal } from "@/lib/purchase-entitlements";
import { buildSpatialSiteFingerprint } from "@/lib/spatial-evidence";
import {
  assessUploadEvidenceReadiness,
  reviewUploadEvidenceApplicability,
  UploadEvidenceApplicabilityError,
  type ApplicableUploadRecord,
} from "@/lib/upload-evidence-applicability";

const NOW = new Date("2026-08-03T02:00:00.000Z");
const proposalBrief = "Alterations and additions to tourist accommodation.";
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
const proposalFingerprint = fingerprintPurchaseProposal(proposalBrief);
const reviewTopics = ["flooding_stormwater"];

const unavailableControl = (label: string) => ({
  label,
  value: null,
  present: false,
  source: null,
  interpretation: "Not available in this fixture.",
  confidence: "Unavailable" as const,
});

const quickSiteCheck = {
  id: "qsc-1",
  projectId: "project-1",
  payload: {
    projectId: "project-1",
    generatedAt: "2026-08-03T00:30:00.000Z",
    site: {
      address: site.address,
      lga: site.lgaName,
      zoneCode: "SP3",
      zoneName: "Tourist",
      zoneLabel: site.zone,
    },
    controls: {
      heightOfBuilding: unavailableControl("Height of building"),
      floorSpaceRatio: unavailableControl("Floor space ratio"),
      minimumLotSize: unavailableControl("Minimum lot size"),
    },
    notes: [],
    nextSteps: [],
    lepEvidenceSummary: null,
  },
};

const dpp = {
  id: "dpp-1",
  projectId: "project-1",
  payload: {
    packType: "detailed_planning_pack",
    generatedAt: "2026-08-03T01:00:00.000Z",
    projectId: "project-1",
    site: {
      address: site.address,
      lga: site.lgaName,
      lgaCode: site.lgaCode,
      zoneCode: "SP3",
      zoneName: "Tourist",
      zoneLabel: site.zone,
    },
    proposalBrief,
    sourceQuickSiteCheck: {
      artefactId: "qsc-1",
      title: "Quick Site Check",
      generatedAt: "2026-08-03T00:30:00.000Z",
      lepEvidenceSummary: null,
    },
    carriedLepEvidenceSummary: null,
    dcpEvidence: [],
    topicMatrix: [],
    unresolvedTopics: ["Flood"],
    consultantReviewQuestions: ["Confirm flood constraints."],
    nextAction: "Obtain flood advice.",
    commercialReady: false,
  },
};

const project = {
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

const makeUpload = (overrides: Partial<ApplicableUploadRecord> = {}): ApplicableUploadRecord => ({
  id: "upload-1",
  projectId: "project-1",
  evidenceStatus: "READY",
  indexingStatus: "READY",
  applicabilityStatus: "PENDING_REVIEW",
  applicabilityArtefactId: null,
  acceptedSiteFingerprint: null,
  acceptedProposalFingerprint: null,
  applicabilityTopics: [],
  sourceDocumentDate: null,
  validUntil: null,
  applicabilityReviewNote: null,
  applicabilityVersion: 1,
  ...overrides,
});

class ApplicabilityPrisma {
  events: any[] = [];
  constructor(public projectRecord: any, public upload: any, public dppArtefact: any = dpp, public sourceQuickSiteCheck: any = quickSiteCheck) {}

  project = { findFirst: async () => this.projectRecord };
  artefact = { findFirst: async ({ where }: any) => {
    if (where.id === this.dppArtefact.id) return this.dppArtefact;
    if (where.id === this.sourceQuickSiteCheck?.id) return this.sourceQuickSiteCheck;
    return null;
  } };
  workspaceUpload = {
    findFirst: async ({ where }: any) => where.id === this.upload.id && where.projectId === this.upload.projectId ? this.upload : null,
    update: async ({ where, data }: any) => {
      assert.equal(where.id, this.upload.id);
      assert.equal(where.applicabilityVersion, this.upload.applicabilityVersion);
      const event = { id: `event-${this.events.length + 1}`, ...data.applicabilityReviewEvents.create, createdAt: NOW };
      this.events.push(event);
      this.upload = {
        ...this.upload,
        applicabilityStatus: data.applicabilityStatus,
        applicabilityArtefactId: data.applicabilityArtefact?.connect?.id ?? null,
        acceptedSiteFingerprint: data.acceptedSiteFingerprint,
        acceptedProposalFingerprint: data.acceptedProposalFingerprint,
        applicabilityTopics: data.applicabilityTopics,
        sourceDocumentDate: data.sourceDocumentDate,
        validUntil: data.validUntil,
        applicabilityReviewNote: data.applicabilityReviewNote,
        applicabilityVersion: this.upload.applicabilityVersion + 1,
        applicabilityReviewEvents: [...this.events],
      };
      return this.upload;
    },
  };
}

test("readiness consumes only readable, indexed and exact-scope accepted uploads", () => {
  const result = assessUploadEvidenceReadiness({
    currentDetailedPlanningPackId: dpp.id,
    currentProposalFingerprint: proposalFingerprint,
    currentSiteFingerprint: siteFingerprint,
    now: NOW,
    uploads: [makeUpload({
      applicabilityStatus: "ACCEPTED",
      applicabilityArtefactId: dpp.id,
      acceptedSiteFingerprint: siteFingerprint,
      acceptedProposalFingerprint: proposalFingerprint,
      applicabilityTopics: reviewTopics,
      sourceDocumentDate: new Date("2026-07-20T00:00:00.000Z"),
    })],
  });
  assert.equal(result.ready, true);
  assert.equal(result.accepted.length, 1);
  assert.deepEqual(result.blockers, []);
});

test("readiness exposes unreadable, unindexed, pending, conflicting, expired and cross-scope uploads", () => {
  const result = assessUploadEvidenceReadiness({
    currentDetailedPlanningPackId: dpp.id,
    currentProposalFingerprint: proposalFingerprint,
    currentSiteFingerprint: siteFingerprint,
    now: NOW,
    uploads: [
      makeUpload({ id: "partial", evidenceStatus: "PARTIALLY_READABLE" }),
      makeUpload({ id: "failed-index", indexingStatus: "FAILED" }),
      makeUpload({ id: "pending" }),
      makeUpload({ id: "conflict", applicabilityStatus: "CONFLICT", applicabilityArtefactId: dpp.id, acceptedSiteFingerprint: siteFingerprint, acceptedProposalFingerprint: proposalFingerprint, applicabilityTopics: reviewTopics, applicabilityReviewNote: "Flood reports disagree." }),
      makeUpload({ id: "expired", applicabilityStatus: "ACCEPTED", applicabilityArtefactId: dpp.id, acceptedSiteFingerprint: siteFingerprint, acceptedProposalFingerprint: proposalFingerprint, applicabilityTopics: reviewTopics, sourceDocumentDate: new Date("2026-07-20T00:00:00.000Z"), validUntil: new Date("2026-08-02T00:00:00.000Z") }),
      makeUpload({ id: "different-proposal", applicabilityStatus: "ACCEPTED", applicabilityArtefactId: dpp.id, acceptedSiteFingerprint: siteFingerprint, acceptedProposalFingerprint: "other", applicabilityTopics: reviewTopics }),
    ],
  });
  assert.deepEqual(new Set(result.blockers.map((blocker) => blocker.code)), new Set(["UNREADABLE", "NOT_INDEXED", "PENDING_REVIEW", "CONFLICT", "EXPIRED", "SCOPE_MISMATCH"]));
});

test("rejected and superseded uploads do not block final SEE evidence readiness", () => {
  const result = assessUploadEvidenceReadiness({
    currentDetailedPlanningPackId: dpp.id,
    currentProposalFingerprint: proposalFingerprint,
    currentSiteFingerprint: siteFingerprint,
    now: NOW,
    uploads: [
      makeUpload({ id: "rejected", evidenceStatus: "IMAGE_ONLY", applicabilityStatus: "REJECTED" }),
      makeUpload({ id: "superseded", indexingStatus: "FAILED", applicabilityStatus: "SUPERSEDED" }),
    ],
  });
  assert.equal(result.ready, true);
  assert.deepEqual(result.blockers, []);
});

test("accepted evidence without an assigned SEE topic fails closed", () => {
  const result = assessUploadEvidenceReadiness({
    currentDetailedPlanningPackId: dpp.id,
    currentProposalFingerprint: proposalFingerprint,
    currentSiteFingerprint: siteFingerprint,
    now: NOW,
    uploads: [makeUpload({
      applicabilityStatus: "ACCEPTED",
      applicabilityArtefactId: dpp.id,
      acceptedSiteFingerprint: siteFingerprint,
      acceptedProposalFingerprint: proposalFingerprint,
    })],
  });
  assert.equal(result.ready, false);
  assert.equal(result.blockers[0]?.code, "NO_TOPICS");
});

test("accepted evidence without a valid document date fails closed", () => {
  const result = assessUploadEvidenceReadiness({
    currentDetailedPlanningPackId: dpp.id,
    currentProposalFingerprint: proposalFingerprint,
    currentSiteFingerprint: siteFingerprint,
    now: NOW,
    uploads: [makeUpload({
      applicabilityStatus: "ACCEPTED",
      applicabilityArtefactId: dpp.id,
      acceptedSiteFingerprint: siteFingerprint,
      acceptedProposalFingerprint: proposalFingerprint,
      applicabilityTopics: reviewTopics,
    })],
  });
  assert.equal(result.ready, false);
  assert.equal(result.blockers[0]?.code, "INVALID_DOCUMENT_DATE");
});

test("acceptance binds a fully readable upload to the exact current DPP, site and proposal", async () => {
  const prisma = new ApplicabilityPrisma(project, makeUpload());
  const result: any = await reviewUploadEvidenceApplicability({
    body: { decision: "ACCEPT", sourceDetailedPlanningPackArtefactId: dpp.id, sourceDocumentDate: "2026-07-20", topics: reviewTopics },
    now: NOW,
    prismaClient: prisma as any,
    projectId: "proj-public",
    uploadId: "upload-1",
    userId: "user-1",
  });
  assert.equal(result.applicabilityStatus, "ACCEPTED");
  assert.equal(result.applicabilityArtefactId, dpp.id);
  assert.equal(result.acceptedSiteFingerprint, siteFingerprint);
  assert.equal(result.acceptedProposalFingerprint, proposalFingerprint);
  assert.deepEqual(result.applicabilityTopics, reviewTopics);
  assert.equal(result.applicabilityReviewEvents[0].previousStatus, "PENDING_REVIEW");
  assert.equal(result.applicabilityReviewEvents[0].resultingStatus, "ACCEPTED");
});

test("acceptance requires at least one explicit SEE topic", async () => {
  const prisma = new ApplicabilityPrisma(project, makeUpload());
  await assert.rejects(
    () => reviewUploadEvidenceApplicability({
      body: { decision: "ACCEPT", sourceDetailedPlanningPackArtefactId: dpp.id, sourceDocumentDate: "2026-07-20" },
      now: NOW,
      prismaClient: prisma as any,
      projectId: "project-1",
      uploadId: "upload-1",
      userId: "user-1",
    }),
    (error) => error instanceof UploadEvidenceApplicabilityError && error.message.includes("SEE topic"),
  );
});

test("acceptance refuses unreadable, unindexed, future-dated or wrong-site evidence", async () => {
  const partial = new ApplicabilityPrisma(project, makeUpload({ evidenceStatus: "PARTIALLY_READABLE" }));
  await assert.rejects(
    () => reviewUploadEvidenceApplicability({ body: { decision: "ACCEPT", sourceDetailedPlanningPackArtefactId: dpp.id, sourceDocumentDate: "2026-07-20", topics: reviewTopics }, now: NOW, prismaClient: partial as any, projectId: "project-1", uploadId: "upload-1", userId: "user-1" }),
    (error) => error instanceof UploadEvidenceApplicabilityError && error.status === 409 && error.message.includes("fully readable"),
  );

  const unindexed = new ApplicabilityPrisma(project, makeUpload({ indexingStatus: "FAILED" }));
  await assert.rejects(
    () => reviewUploadEvidenceApplicability({ body: { decision: "ACCEPT", sourceDetailedPlanningPackArtefactId: dpp.id, sourceDocumentDate: "2026-07-20", topics: reviewTopics }, now: NOW, prismaClient: unindexed as any, projectId: "project-1", uploadId: "upload-1", userId: "user-1" }),
    (error) => error instanceof UploadEvidenceApplicabilityError && error.status === 409 && error.message.includes("indexed"),
  );

  const futureDated = new ApplicabilityPrisma(project, makeUpload());
  await assert.rejects(
    () => reviewUploadEvidenceApplicability({ body: { decision: "ACCEPT", sourceDetailedPlanningPackArtefactId: dpp.id, sourceDocumentDate: "2026-08-04", topics: reviewTopics }, now: NOW, prismaClient: futureDated as any, projectId: "project-1", uploadId: "upload-1", userId: "user-1" }),
    (error) => error instanceof UploadEvidenceApplicabilityError && error.status === 409 && error.message.includes("future"),
  );

  const wrongSiteDpp = new ApplicabilityPrisma(project, makeUpload(), { ...dpp, payload: { ...dpp.payload, site: { ...dpp.payload.site, address: "1 Belgrave Street, Kempsey NSW" } } });
  await assert.rejects(
    () => reviewUploadEvidenceApplicability({ body: { decision: "ACCEPT", sourceDetailedPlanningPackArtefactId: dpp.id, sourceDocumentDate: "2026-07-20", topics: reviewTopics }, now: NOW, prismaClient: wrongSiteDpp as any, projectId: "project-1", uploadId: "upload-1", userId: "user-1" }),
    (error) => error instanceof UploadEvidenceApplicabilityError && error.status === 409 && error.message.includes("different or earlier"),
  );

  const missingQuickSiteCheck = new ApplicabilityPrisma(project, makeUpload(), dpp, null);
  await assert.rejects(
    () => reviewUploadEvidenceApplicability({ body: { decision: "ACCEPT", sourceDetailedPlanningPackArtefactId: dpp.id, sourceDocumentDate: "2026-07-20", topics: reviewTopics }, now: NOW, prismaClient: missingQuickSiteCheck as any, projectId: "project-1", uploadId: "upload-1", userId: "user-1" }),
    (error) => error instanceof UploadEvidenceApplicabilityError && error.status === 409 && error.message.includes("Quick Site Check"),
  );
});

test("conflict decisions require a note and append a scoped review event", async () => {
  const prisma = new ApplicabilityPrisma(project, makeUpload());
  await assert.rejects(
    () => reviewUploadEvidenceApplicability({ body: { decision: "MARK_CONFLICT", sourceDetailedPlanningPackArtefactId: dpp.id, topics: reviewTopics }, now: NOW, prismaClient: prisma as any, projectId: "project-1", uploadId: "upload-1", userId: "user-1" }),
    (error) => error instanceof UploadEvidenceApplicabilityError && error.message.includes("review note"),
  );
  const result: any = await reviewUploadEvidenceApplicability({
    body: { decision: "MARK_CONFLICT", sourceDetailedPlanningPackArtefactId: dpp.id, topics: reviewTopics, note: "The consultant flood report conflicts with the current council layer." },
    now: NOW,
    prismaClient: prisma as any,
    projectId: "project-1",
    uploadId: "upload-1",
    userId: "user-1",
  });
  assert.equal(result.applicabilityStatus, "CONFLICT");
  assert.equal(result.applicabilityReviewEvents[0].decision, "MARK_CONFLICT");
  assert.equal(result.applicabilityArtefactId, dpp.id);
  assert.equal(result.acceptedSiteFingerprint, siteFingerprint);
  assert.equal(result.acceptedProposalFingerprint, proposalFingerprint);
  assert.deepEqual(result.applicabilityTopics, reviewTopics);
});
