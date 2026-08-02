import assert from "node:assert/strict";
import test from "node:test";

import { buildConsultantNeedsMatrix, buildDisciplineReferralPackages } from "../src/lib/consultant-needs";
import {
  CONSULTANT_REFERRAL_CONSENT_VERSION,
  CONSULTANT_REFERRAL_SNAPSHOT_VERSION,
  isConsultantReferralTransitionAllowed,
  submitConsultantReferral,
  transitionConsultantReferral,
} from "../src/lib/consultant-referrals";
import type { QuickSiteCheckReport } from "../src/types/quick-site-check";
import type { DetailedPlanningPackContent, ReviewRequestContent } from "../src/types/workspace";

const now = new Date("2026-08-02T01:00:00.000Z");
const proposal = "Shopfront alterations and change of use";

const quickSiteCheck: QuickSiteCheckReport = {
  projectId: "project-db-id",
  generatedAt: "2026-08-02T00:00:00.000Z",
  site: {
    address: "52 Belgrave Street, Kempsey NSW 2440",
    lga: "Kempsey Shire",
    zoneCode: "E2",
    zoneName: "Commercial Centre",
    zoneLabel: "E2 Commercial Centre",
  },
  controls: {
    heightOfBuilding: { label: "Height", value: "11m", present: true, source: "Kempsey LEP 2013", lepSource: true, clauseRef: "4.3", interpretation: "Maximum height is 11m.", confidence: "Cited" },
    floorSpaceRatio: { label: "FSR", value: "2:1", present: true, source: "Kempsey LEP 2013", lepSource: true, clauseRef: "4.4", interpretation: "Maximum FSR is 2:1.", confidence: "Cited" },
    minimumLotSize: { label: "Minimum lot size", value: null, present: false, interpretation: "No mapped value was retrieved.", confidence: "Unavailable" },
  },
  notes: [],
  nextSteps: [],
  lepEvidenceSummary: {
    label: "Cited",
    detail: "DB-backed E2 zone evidence.",
    citedControlCount: 2,
    totalControlCount: 3,
    landUseEntryCount: 30,
    objectiveCount: 3,
    sourceRef: "Kempsey LEP 2013 Zone E2",
  },
  developmentIntent: {
    description: proposal,
    status: "Cited",
    pathway: "permitted_with_consent",
    statutoryLandUse: "commercial premises",
    sourceRef: "Kempsey LEP 2013 Zone E2 cl. 2.3",
    detail: "Commercial premises are permitted with consent.",
  },
};

const pack: DetailedPlanningPackContent = {
  packType: "detailed_planning_pack",
  generatedAt: "2026-08-02T00:10:00.000Z",
  projectId: "project-db-id",
  site: {
    address: "52 Belgrave Street, Kempsey NSW 2440",
    lga: "Kempsey Shire",
    lgaCode: "KEMPSEY",
    zoneCode: "E2",
    zoneName: "Commercial Centre",
    zoneLabel: "E2 Commercial Centre",
  },
  proposalBrief: proposal,
  sourceQuickSiteCheck: {
    artefactId: "qsc-id",
    title: "Quick Site Check",
    generatedAt: quickSiteCheck.generatedAt,
    lepEvidenceSummary: quickSiteCheck.lepEvidenceSummary,
  },
  carriedLepEvidenceSummary: quickSiteCheck.lepEvidenceSummary ?? null,
  dcpEvidence: [
    {
      topicId: "setbacks",
      topicLabel: "Setbacks",
      status: "Cited",
      reason: "Cited",
      citations: [{ ref: "Kempsey DCP 2026 D4.2", title: "Setbacks", headingPath: ["Part D", "Commercial centres"], excerpt: "Buildings may have a nil street setback.", score: 10 }],
    },
    {
      topicId: "parking_access",
      topicLabel: "Parking and access",
      status: "Unavailable",
      reason: "No qualifying numeric or qualitative control was retrieved.",
      citations: [],
    },
    {
      topicId: "built_form_active_frontage",
      topicLabel: "Built form and active frontage",
      status: "Cited",
      reason: "Cited",
      citations: [{ ref: "Kempsey DCP 2026 D4.3", title: "Active frontage", headingPath: ["Part D", "Commercial centres"], excerpt: "Active street frontage must be retained.", score: 10 }],
    },
    {
      topicId: "landscaping_open_space",
      topicLabel: "Landscaping and open space",
      status: "Cited",
      reason: "Cited",
      citations: [{ ref: "Kempsey DCP 2026 D4.4", title: "Landscaping", headingPath: ["Part D"], excerpt: "Retain established canopy trees.", score: 10 }],
    },
    {
      topicId: "local_controls",
      topicLabel: "Other proposal-relevant local controls",
      status: "Cited",
      reason: "Cited",
      citations: [{ ref: "Kempsey DCP 2026 D4.5", title: "Waste", headingPath: ["Part D"], excerpt: "Waste storage must be screened.", score: 10 }],
    },
  ],
  topicMatrix: [
    { topicId: "setbacks", topicLabel: "Setbacks", status: "Cited", summary: "Cited", sourceRefs: ["Kempsey DCP 2026 D4.2"] },
    { topicId: "parking_access", topicLabel: "Parking and access", status: "Unavailable", summary: "No qualifying control was retrieved.", sourceRefs: [] },
    { topicId: "built_form_active_frontage", topicLabel: "Built form and active frontage", status: "Cited", summary: "Cited", sourceRefs: ["Kempsey DCP 2026 D4.3"] },
    { topicId: "landscaping_open_space", topicLabel: "Landscaping and open space", status: "Cited", summary: "Cited", sourceRefs: ["Kempsey DCP 2026 D4.4"] },
    { topicId: "local_controls", topicLabel: "Other proposal-relevant local controls", status: "Cited", summary: "Cited", sourceRefs: ["Kempsey DCP 2026 D4.5"] },
  ],
  unresolvedTopics: ["Parking and access: no qualifying control was retrieved."],
  consultantReviewQuestions: ["Confirm the applicable parking rate."],
  nextAction: "Refer unresolved controls for expert review.",
  commercialReady: false,
};

const consultantNeeds = buildConsultantNeedsMatrix({ quickSiteCheck, detailedPlanningPack: pack });
const disciplinePackages = buildDisciplineReferralPackages({ proposalBrief: proposal, consultantNeeds });

const review: ReviewRequestContent = {
  requestType: "expert_review_request",
  generatedAt: "2026-08-02T00:20:00.000Z",
  projectId: "project-db-id",
  site: { address: pack.site.address, lga: pack.site.lga, zoneLabel: pack.site.zoneLabel },
  packageSummary: "Exact unresolved pack referral.",
  includedArtefacts: [
    { type: "quick_site_check", id: "qsc-id", title: "Quick Site Check", generatedAt: quickSiteCheck.generatedAt },
    { type: "detailed_planning_pack", id: "dpp-id", title: "Planning Controls Pack", generatedAt: pack.generatedAt },
  ],
  citedSources: [
    { type: "LEP", ref: "Kempsey LEP 2013 Zone E2 cl. 2.3" },
    { type: "DCP", ref: "Kempsey DCP 2026 D4.2" },
  ],
  confidenceGaps: ["Parking evidence unresolved."],
  missingInputs: ["Verified parking rate."],
  assumptions: [`Proposed works: ${proposal}`],
  recommendedReviewScope: ["Confirm the parking rate."],
  detailedPlanningPack: {
    artefactId: "dpp-id",
    title: "Planning Controls Pack",
    generatedAt: pack.generatedAt,
    proposalBrief: proposal,
    commercialReady: false,
    topicMatrix: pack.topicMatrix,
    unresolvedTopics: pack.unresolvedTopics,
    sourceQuickSiteCheckArtefactId: "qsc-id",
  },
  sourceSeeMemo: null,
  consultantNeedsVersion: "consultant-needs.v1",
  consultantNeeds,
  disciplinePackages,
};

const artefact = (id: string, type: string, payload: unknown, capturedAt: string) => ({
  id,
  projectId: "project-db-id",
  type,
  title: id,
  payload,
  capturedAt: new Date(capturedAt),
  createdAt: new Date(capturedAt),
  updatedAt: new Date(capturedAt),
  staleAt: null,
});

const makeDeps = () => {
  const referrals: Array<Record<string, any>> = [];
  const events: Array<Record<string, any>> = [];
  const rows = [
    artefact("qsc-id", "quick_site_check", structuredClone(quickSiteCheck), quickSiteCheck.generatedAt),
    artefact("dpp-id", "detailed_planning_pack", structuredClone(pack), pack.generatedAt),
    artefact("review-id", "review_request", structuredClone(review), review.generatedAt),
  ];
  const client: Record<string, any> = {
    project: {
      findFirst: async ({ where }: any) => {
        const access = JSON.stringify(where);
        if (access.includes("different-user")) return null;
        return {
          id: "project-db-id",
          publicId: "proj-public",
          title: "Kempsey project",
          address: pack.site.address,
          zoning: pack.site.zoneLabel,
          zoningCode: pack.site.zoneCode,
          zoningName: pack.site.zoneName,
          createdById: "user-1",
          userId: "user-1",
          siteContext: {
            formattedAddress: pack.site.address,
            lgaName: pack.site.lga,
            lgaCode: pack.site.lgaCode,
            zone: pack.site.zoneLabel,
          },
        };
      },
    },
    artefact: {
      findFirst: async ({ where }: any) => rows.find((row) => row.id === where.id && row.projectId === where.projectId && row.type === where.type) ?? null,
      findMany: async () => rows.filter((row) => row.type === "quick_site_check" || row.type === "detailed_planning_pack"),
    },
    consultantReferral: {
      findFirst: async ({ where }: any) => {
        const row = referrals.find((item) => item.scopeKey === where.scopeKey || item.id === where.id);
        return row ? { ...row, events: events.filter((event) => event.referralId === row.id) } : null;
      },
      findMany: async () => referrals,
      create: async ({ data }: any) => {
        const row = { id: "referral-1", ...data, updatedAt: data.submittedAt, closedAt: null, deleteAfter: null };
        referrals.push(row);
        return row;
      },
      updateMany: async ({ where, data }: any) => {
        const row = referrals.find((item) => item.id === where.id && item.status === where.status);
        if (!row) return { count: 0 };
        Object.assign(row, data, { updatedAt: now });
        return { count: 1 };
      },
      delete: async () => ({}),
      deleteMany: async () => ({ count: 0 }),
    },
    consultantReferralEvent: {
      create: async ({ data }: any) => {
        const row = { id: `event-${events.length + 1}`, ...data };
        events.push(row);
        return row;
      },
    },
  };
  client.$transaction = async (callback: (tx: unknown) => Promise<unknown>) => callback(client);
  return { deps: { prisma: client, now: () => now } as any, referrals, events, rows };
};

test("submits an exact consented referral as an immutable PII-free package snapshot", async () => {
  const { deps, referrals, events } = makeDeps();
  const result = await submitConsultantReferral({
    projectId: "proj-public",
    userId: "user-1",
    body: {
      reviewRequestArtefactId: "review-id",
      contactName: "Alex Owner",
      contactEmail: "alex@example.com",
      consent: true,
    },
  }, deps);

  assert.equal(result.created, true);
  assert.equal(result.projectId, "project-db-id");
  assert.equal(result.referral.status, "SUBMITTED");
  assert.equal(result.referral.events[0]?.reasonCode, "explicit_consent_submission");
  assert.equal(referrals[0]?.consentVersion, CONSULTANT_REFERRAL_CONSENT_VERSION);
  assert.equal((referrals[0]?.packageSnapshot as any).snapshotVersion, CONSULTANT_REFERRAL_SNAPSHOT_VERSION);
  assert.match(referrals[0]?.packageDigest as string, /^[a-f0-9]{64}$/);
  assert.doesNotMatch(JSON.stringify(referrals[0]?.packageSnapshot), /alex@example\.com|Alex Owner/);
  assert.equal(events.length, 1);
  assert.equal("contactEmail" in result.referral, false);
});

test("requires explicit consent and exact current proposal provenance before persistence", async () => {
  const noConsent = makeDeps();
  await assert.rejects(
    submitConsultantReferral({
      projectId: "proj-public",
      userId: "user-1",
      body: { reviewRequestArtefactId: "review-id", contactName: "Alex Owner", contactEmail: "alex@example.com", consent: false },
    }, noConsent.deps),
    /Explicit consent is required/,
  );
  assert.equal(noConsent.referrals.length, 0);

  const stale = makeDeps();
  (stale.rows.find((row) => row.id === "dpp-id")!.payload as DetailedPlanningPackContent).proposalBrief = "A different proposal";
  await assert.rejects(
    submitConsultantReferral({
      projectId: "proj-public",
      userId: "user-1",
      body: { reviewRequestArtefactId: "review-id", contactName: "Alex Owner", contactEmail: "alex@example.com", consent: true },
    }, stale.deps),
    /no longer matches the current site, proposal or Planning Controls Pack/,
  );
  assert.equal(stale.referrals.length, 0);
});

test("rejects a requester without project ownership before reading or persisting the package", async () => {
  const denied = makeDeps();
  await assert.rejects(
    submitConsultantReferral({
      projectId: "proj-public",
      userId: "different-user",
      body: { reviewRequestArtefactId: "review-id", contactName: "Alex Owner", contactEmail: "alex@example.com", consent: true },
    }, denied.deps),
    /Project not found or access denied/,
  );
  assert.equal(denied.referrals.length, 0);
  assert.equal(denied.events.length, 0);
});

test("is idempotent for one exact scope and rejects silent contact replacement", async () => {
  const { deps, referrals, events } = makeDeps();
  const body = { reviewRequestArtefactId: "review-id", contactName: "Alex Owner", contactEmail: "alex@example.com", consent: true };
  const first = await submitConsultantReferral({ projectId: "proj-public", userId: "user-1", body }, deps);
  const replay = await submitConsultantReferral({ projectId: "proj-public", userId: "user-1", body }, deps);

  assert.equal(first.referral.id, replay.referral.id);
  assert.equal(replay.created, false);
  assert.equal(referrals.length, 1);
  assert.equal(events.length, 1);

  await assert.rejects(
    submitConsultantReferral({
      projectId: "proj-public",
      userId: "user-1",
      body: { ...body, contactEmail: "replacement@example.com" },
    }, deps),
    /already submitted with different contact details/,
  );
});

test("enforces auditable delivery transitions and keeps copy or replay from advancing status", async () => {
  const { deps, events } = makeDeps();
  const submitted = await submitConsultantReferral({
    projectId: "proj-public",
    userId: "user-1",
    body: { reviewRequestArtefactId: "review-id", contactName: "Alex Owner", contactEmail: "alex@example.com", consent: true },
  }, deps);

  assert.equal(isConsultantReferralTransitionAllowed("SUBMITTED", "ASSIGNED"), false);
  await assert.rejects(
    transitionConsultantReferral({ referralId: submitted.referral.id, toStatus: "ASSIGNED" }, deps),
    /cannot move from SUBMITTED to ASSIGNED/,
  );
  const acknowledged = await transitionConsultantReferral({ referralId: submitted.referral.id, toStatus: "ACKNOWLEDGED", reasonCode: "queue_reviewed" }, deps);
  const replay = await transitionConsultantReferral({ referralId: submitted.referral.id, toStatus: "ACKNOWLEDGED", reasonCode: "queue_reviewed" }, deps);
  const assigned = await transitionConsultantReferral({ referralId: submitted.referral.id, toStatus: "ASSIGNED", reasonCode: "sent_to_consultant" }, deps);
  const consultantAcknowledged = await transitionConsultantReferral({ referralId: submitted.referral.id, toStatus: "CONSULTANT_ACKNOWLEDGED" }, deps);

  assert.equal(acknowledged.status, "ACKNOWLEDGED");
  assert.equal(replay.status, "ACKNOWLEDGED");
  assert.equal(assigned.status, "ASSIGNED");
  assert.equal(consultantAcknowledged.status, "CONSULTANT_ACKNOWLEDGED");
  assert.deepEqual(events.map((event) => event.toStatus), ["SUBMITTED", "ACKNOWLEDGED", "ASSIGNED", "CONSULTANT_ACKNOWLEDGED"]);
});

test("does not claim submission when durable queue persistence fails", async () => {
  const failed = makeDeps();
  failed.deps.prisma.consultantReferral.create = async () => {
    throw new Error("queue write unavailable");
  };

  await assert.rejects(
    submitConsultantReferral({
      projectId: "proj-public",
      userId: "user-1",
      body: { reviewRequestArtefactId: "review-id", contactName: "Alex Owner", contactEmail: "alex@example.com", consent: true },
    }, failed.deps),
    /queue write unavailable/,
  );
  assert.equal(failed.referrals.length, 0);
  assert.equal(failed.events.length, 0);
});
