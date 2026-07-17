/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from "node:assert/strict";
import test from "node:test";

import {
  ArtefactValidationError,
  createDetailedPlanningPackArtefact,
  createExpertReviewRequestArtefact,
  createPreSeePlanningMemoArtefact,
  createQuickSiteCheckArtefact,
  hasExactSeeEvidenceProvenance,
} from "@/lib/artefact-service";
import { auditCommercialFunnel } from "@/lib/commercial-funnel-audit";
import type { QuickSiteCheckReport } from "@/types/quick-site-check";

type GoldenFixture = {
  id: string;
  publicId: string;
  address: string;
  lgaName: string;
  lgaCode: "BYRON" | "KEMPSEY";
  zoneCode: "SP3" | "E2";
  zoneName: string;
  zoneLabel: string;
  instrumentName: string;
  instrumentCode: string;
  proposalBrief: string;
  height: string;
  fsr: string | null;
};

const BYRON: GoldenFixture = {
  id: "golden-byron",
  publicId: "proj-golden-byron",
  address: "45 Broken Head Road, Byron Bay NSW 2481",
  lgaName: "Byron Shire",
  lgaCode: "BYRON",
  zoneCode: "SP3",
  zoneName: "Tourist",
  zoneLabel: "SP3 - Tourist",
  instrumentName: "Byron LEP 2014",
  instrumentCode: "byron-lep-2014",
  proposalBrief:
    "Internal refurbishment and minor alterations to existing tourist accommodation, with no change of use, additional floor area, guest rooms, parking, or access.",
  height: "9m",
  fsr: null,
};

const KEMPSEY: GoldenFixture = {
  id: "golden-kempsey",
  publicId: "proj-golden-kempsey",
  address: "52 Belgrave St, Kempsey NSW 2440",
  lgaName: "Kempsey Shire",
  lgaCode: "KEMPSEY",
  zoneCode: "E2",
  zoneName: "Commercial Centre",
  zoneLabel: "E2 - Commercial Centre",
  instrumentName: "Kempsey LEP 2013",
  instrumentCode: "kempsey-lep-2013",
  proposalBrief:
    "Internal commercial fit-out and minor shopfront improvements, with no change of use, additional floor area, parking, access, or building envelope.",
  height: "11m",
  fsr: "2:1",
};

const USER_ID = "golden-test-user";

class GoldenPrisma {
  readonly artefacts: any[] = [];
  readonly projectRecord: any;

  constructor(readonly fixture: GoldenFixture) {
    const now = new Date("2026-07-16T00:00:00.000Z");
    this.projectRecord = {
      id: fixture.id,
      publicId: fixture.publicId,
      title: `${fixture.lgaName} commercial golden`,
      address: fixture.address,
      createdById: USER_ID,
      userId: USER_ID,
      zoningCode: fixture.zoneCode,
      zoningName: fixture.zoneName,
      zoning: fixture.zoneLabel,
      siteContext: {
        id: `site-${fixture.id}`,
        projectId: fixture.id,
        addressInput: fixture.address,
        formattedAddress: fixture.address,
        lgaName: fixture.lgaName,
        lgaCode: fixture.lgaCode,
        parcelId: null,
        lot: null,
        planNumber: null,
        latitude: null,
        longitude: null,
        zone: fixture.zoneLabel,
        createdAt: now,
        updatedAt: now,
      },
    };
  }

  project = {
    findFirst: async ({ where }: any) => {
      const ownershipLookup = where.OR?.some(
        (clause: any) => clause.createdById || clause.userId || clause.collaborators,
      );

      if (ownershipLookup) {
        const requestedUserIds = where.OR.flatMap((clause: any) => [
          clause.createdById,
          clause.userId,
          clause.collaborators?.some?.userId,
        ]).filter(Boolean);
        return where.id === this.fixture.id && requestedUserIds.includes(USER_ID)
          ? this.projectRecord
          : null;
      }

      const identifiers = [
        where.id,
        where.publicId,
        ...(where.OR ?? []).flatMap((clause: any) => [clause.id, clause.publicId]),
      ].filter(Boolean);
      return identifiers.some((identifier: string) =>
        identifier === this.fixture.id || identifier === this.fixture.publicId
      )
        ? this.projectRecord
        : null;
    },
    findUnique: async ({ where }: any) =>
      where.id === this.fixture.id ? this.projectRecord : null,
  };

  artefact = {
    create: async ({ data }: any) => {
      const now = data.capturedAt instanceof Date ? data.capturedAt : new Date();
      const artefact = {
        id: `${this.fixture.id}-artefact-${this.artefacts.length + 1}`,
        sourceUrl: null,
        imageUrl: null,
        staleAt: null,
        createdAt: now,
        updatedAt: now,
        ...data,
        capturedAt: now,
      };
      this.artefacts.push(artefact);
      return artefact;
    },
    findMany: async ({ where }: any) => {
      const matchesType = (type: string) => {
        if (!where.type) return true;
        if (typeof where.type === "string") return type === where.type;
        if (Array.isArray(where.type.in)) return where.type.in.includes(type);
        return true;
      };
      return this.artefacts
        .filter((artefact) =>
          artefact.projectId === where.projectId && matchesType(artefact.type)
        )
        .sort(
          (left, right) =>
            (right.capturedAt?.getTime?.() ?? right.createdAt.getTime()) -
            (left.capturedAt?.getTime?.() ?? left.createdAt.getTime()),
        );
    },
  };
}

const baseReport = (fixture: GoldenFixture): QuickSiteCheckReport => ({
  projectId: fixture.publicId,
  generatedAt: new Date().toISOString(),
  site: {
    address: fixture.address,
    lga: fixture.lgaName,
    zoneCode: fixture.zoneCode,
    zoneName: fixture.zoneName,
    zoneLabel: fixture.zoneLabel,
  },
  lepInstrument: null,
  permissibility: null,
  controls: {
    heightOfBuilding: {
      label: "Height of building",
      value: null,
      present: false,
      interpretation: "Not found in client payload.",
    },
    floorSpaceRatio: {
      label: "Floor space ratio",
      value: null,
      present: false,
      interpretation: "Not found in client payload.",
    },
    minimumLotSize: {
      label: "Minimum lot size",
      value: null,
      present: false,
      interpretation: "Not found in client payload.",
    },
  },
  notes: [],
  nextSteps: [],
});

const lepDependencies = (prisma: GoldenPrisma, fixture: GoldenFixture) => ({
  prisma: prisma as any,
  getLepContextForProject: async () => ({
    lepContext: {
      lga: fixture.lgaName,
      instrumentName: fixture.instrumentName,
      instrumentCode: fixture.instrumentCode,
      clauses: [
        {
          ref: "4.3",
          title: "Height of buildings",
          text: `The height of a building must not exceed ${fixture.height}.`,
        },
        ...(fixture.fsr
          ? [{
              ref: "4.4",
              title: "Floor space ratio",
              text: `The maximum floor space ratio for a building is ${fixture.fsr}.`,
            }]
          : []),
      ],
    },
    rawLga: fixture.lgaName,
    normalisedLga: fixture.lgaCode,
    instruments: [],
    chosenInstrumentId: fixture.instrumentCode,
    lepClauseCount: fixture.fsr ? 2 : 1,
    usedFallback: false,
  }),
  buildQuickSiteCheckLep: async () => ({
    ok: true,
    projectId: fixture.id,
    lga: fixture.lgaName,
    lepName: fixture.instrumentName,
    zone: fixture.zoneCode,
    objectives: [
      `Support development compatible with the ${fixture.zoneName} zone.`,
      "Ensure development responds to local character and amenity.",
    ],
    controls: {
      heightOfBuilding: {
        value: fixture.height,
        clauseRef: "4.3",
        confidence: "Cited",
      },
      fsr: fixture.fsr
        ? { value: fixture.fsr, clauseRef: "4.4", confidence: "Cited" }
        : null,
      minLotSize: null,
      zoneObjectives: [
        `Support development compatible with the ${fixture.zoneName} zone.`,
        "Ensure development responds to local character and amenity.",
      ],
    },
    permissibility: {
      permittedWithoutConsent: ["Environmental protection works"],
      permittedWithConsent:
        fixture.zoneCode === "SP3"
          ? ["Tourist and visitor accommodation"]
          : ["Commercial premises"],
      prohibited: ["Heavy industrial uses"],
    },
    dataSource: "db_clauses",
    landUse: {
      withoutConsent: ["Environmental protection works"],
      withConsent:
        fixture.zoneCode === "SP3"
          ? ["Tourist and visitor accommodation"]
          : ["Commercial premises"],
      prohibited: ["Heavy industrial uses"],
    },
    part4: [],
    part5: [],
    part6: [],
  }),
});

const dcpTopic = (query: string) => {
  if (/setback/i.test(query)) {
    return {
      id: "setbacks",
      ref: "Setbacks",
      title: "Setbacks and building alignment",
      body: "The front building line must be retained at nil/0m and side and rear setbacks are to respond to adjoining commercial development",
    };
  }
  if (/parking access/i.test(query)) {
    return {
      id: "parking_access",
      ref: "Parking",
      title: "Parking, access and loading",
      body: "Provide 1 parking space per 40m2 of gross floor area and ensure driveway and loading access is maintained",
    };
  }
  if (/built form active/i.test(query)) {
    return {
      id: "built_form",
      ref: "Built form",
      title: "Built form and active frontage",
      body: "Active street frontage must be retained and the shopfront is to provide clear glazing to the street",
    };
  }
  if (/landscaping open space/i.test(query)) {
    return {
      id: "landscaping",
      ref: "Landscaping",
      title: "Landscaping and open space",
      body: "Provide landscaping and maintain existing canopy trees where works affect open space areas",
    };
  }
  return {
    id: "local_controls",
    ref: "Local controls",
    title: "Other local development controls",
    body: "Waste storage and service areas must be screened from the public street",
  };
};

const dcpResolver = (
  fixture: GoldenFixture,
  unresolvedTopicId?: string,
) => async (lgaCode: string, query: string) => {
  const topic = dcpTopic(query);
  if (topic.id === unresolvedTopicId) return [];

  const sourceDocument =
    fixture.lgaCode === "BYRON" ? "Byron DCP 2014" : "Kempsey DCP 2026";
  return [{
    id: `${fixture.id}-${topic.id}`,
    lgaCode,
    sourceDocId: fixture.lgaCode === "BYRON"
      ? "BYRON_DCP_2014"
      : "KEMPSEY_DCP_2026",
    ref: `${sourceDocument} > ${fixture.zoneCode} > ${topic.ref}`,
    title: `${fixture.zoneCode} ${fixture.zoneName} - ${topic.title}`,
    headingPath: [sourceDocument, fixture.zoneLabel, topic.title],
    bodyText:
      `${fixture.zoneCode} ${fixture.zoneName}: ${topic.body} for the tested proposal.`,
    depth: 2,
    topicTags: [topic.id],
    numericMeta: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    score: 50,
  }];
};

const serviceDependencies = (
  prisma: GoldenPrisma,
  fixture: GoldenFixture,
  unresolvedTopicId?: string,
) => ({
  prisma: prisma as any,
  buildQuickSiteCheckReport: async () => {
    throw new Error("The saved Quick Site Check must be used");
  },
  getDCPContext: dcpResolver(fixture, unresolvedTopicId),
  getWorkspaceSourceContext: async () => {
    throw new Error("The persisted Detailed Planning Pack must be used");
  },
});

const saveQuickSiteCheck = async (
  prisma: GoldenPrisma,
  fixture: GoldenFixture,
) => createQuickSiteCheckArtefact({
  body: {
    projectId: fixture.publicId,
    title: `Quick Site Check - ${fixture.address}`,
    type: "quick_site_check",
    report: baseReport(fixture),
  },
  projectId: fixture.publicId,
  userId: USER_ID,
  deps: lepDependencies(prisma, fixture) as any,
});

const runReadyJourney = async (fixture: GoldenFixture) => {
  const prisma = new GoldenPrisma(fixture);
  const quickSiteCheck = await saveQuickSiteCheck(prisma, fixture);
  const qsc = quickSiteCheck.payload as QuickSiteCheckReport;
  assert.equal(qsc.lepEvidenceSummary?.label, "Cited");
  assert.equal(qsc.site.address, fixture.address);
  assert.equal(qsc.site.zoneCode, fixture.zoneCode);

  const detailedPlanningPack = await createDetailedPlanningPackArtefact({
    body: {
      projectId: fixture.publicId,
      proposalBrief: fixture.proposalBrief,
      site: { address: "forged client address" },
      commercialReady: true,
    },
    userId: USER_ID,
    deps: serviceDependencies(prisma, fixture) as any,
  });

  assert.equal(detailedPlanningPack.content.commercialReady, true);
  assert.equal(detailedPlanningPack.content.dcpEvidence.length, 5);
  assert.ok(
    detailedPlanningPack.content.dcpEvidence.every(
      (topic) => topic.status === "Cited" && topic.citations.length > 0,
    ),
  );
  assert.equal(
    detailedPlanningPack.content.sourceQuickSiteCheck.artefactId,
    quickSiteCheck.id,
  );
  assert.equal(detailedPlanningPack.content.site.address, fixture.address);

  const see = await createPreSeePlanningMemoArtefact({
    body: {
      projectId: fixture.publicId,
      proposedWorksSummary: "forged client proposal",
      citations: ["forged citation"],
    },
    userId: USER_ID,
    deps: serviceDependencies(prisma, fixture) as any,
  });

  assert.equal(see.content.proposedWorksSummary, fixture.proposalBrief);
  assert.equal(
    see.content.sourceDetailedPlanningPack?.artefactId,
    detailedPlanningPack.artefact.id,
  );
  assert.equal(
    see.content.sourceDetailedPlanningPack?.sourceQuickSiteCheckArtefactId,
    quickSiteCheck.id,
  );
  assert.equal(see.content.applicableControls.dcpClauses.length, 5);
  const expectedCitations = detailedPlanningPack.content.dcpEvidence.flatMap((topic) =>
    topic.citations.map((citation) => ({ topic, citation })),
  );
  assert.deepEqual(
    see.content.applicableControls.dcpClauses.map((clause) => clause.bodyText),
    expectedCitations.map(({ citation }) => citation.excerpt),
  );
  assert.deepEqual(
    see.content.applicableControls.sourceExcerpts.map((excerpt) => excerpt.content),
    expectedCitations.map(({ citation }) => citation.excerpt),
  );
  assert.equal(
    hasExactSeeEvidenceProvenance(see.content as any, detailedPlanningPack.content, qsc),
    true,
  );
  const tamperedSee = structuredClone(see.content);
  tamperedSee.applicableControls.dcpClauses[0].bodyText = `${tamperedSee.applicableControls.dcpClauses[0].bodyText} tampered`;
  assert.equal(
    hasExactSeeEvidenceProvenance(tamperedSee as any, detailedPlanningPack.content, qsc),
    false,
  );

  const review = await createExpertReviewRequestArtefact(
    { body: { projectId: fixture.publicId }, userId: USER_ID },
    { prisma: prisma as any },
  );
  assert.deepEqual(
    review.content.includedArtefacts.map((artefact) => artefact.type),
    ["quick_site_check", "detailed_planning_pack", "pre_see_planning_memo"],
  );
  assert.equal(
    review.content.detailedPlanningPack?.artefactId,
    detailedPlanningPack.artefact.id,
  );
  assert.equal(review.content.sourceSeeMemo?.artefactId, see.artefact.id);
  assert.deepEqual(
    review.content.detailedPlanningPack?.citedRequirements?.map((requirement) => ({
      topicId: requirement.topicId,
      ref: requirement.ref,
      headingPath: requirement.headingPath,
      excerpt: requirement.excerpt,
    })),
    expectedCitations.map(({ topic, citation }) => ({
      topicId: topic.topicId,
      ref: citation.ref,
      headingPath: citation.headingPath,
      excerpt: citation.excerpt,
    })),
  );

  const audit = await auditCommercialFunnel(fixture.publicId, {
    prisma: prisma as any,
  });
  assert.ok("referralEligibility" in audit);
  assert.equal(audit.quickSiteCheck.state, "ready");
  assert.equal(audit.detailedPlanningPack.state, "ready");
  assert.equal(audit.see.state, "ready");
  assert.equal(audit.referralEligibility, "quality_chain_referral");
  assert.equal(audit.nextAction.code, "ready_for_quality_chain_referral");

  return { prisma, quickSiteCheck, detailedPlanningPack, see, review, audit };
};

test("Byron SP3 golden journey persists an exact quality chain through referral and audit", async () => {
  const result = await runReadyJourney(BYRON);
  assert.equal(result.audit.site.zoneCode, "SP3");
  assert.match(
    result.detailedPlanningPack.content.dcpEvidence
      .flatMap((topic) => topic.citations)
      .map((citation) => citation.ref)
      .join("\n"),
    /Byron DCP 2014/,
  );
});

test("Kempsey E2 golden journey persists an exact quality chain through referral and audit", async () => {
  const result = await runReadyJourney(KEMPSEY);
  assert.equal(result.audit.site.zoneCode, "E2");
  assert.match(
    result.detailedPlanningPack.content.dcpEvidence
      .flatMap((topic) => topic.citations)
      .map((citation) => `${citation.ref} ${citation.excerpt}`)
      .join("\n"),
    /Kempsey DCP 2026/,
  );
});

test("Kempsey evidence gap blocks SEE and produces an unresolved-pack referral", async () => {
  const prisma = new GoldenPrisma(KEMPSEY);
  const quickSiteCheck = await saveQuickSiteCheck(prisma, KEMPSEY);
  const deps = serviceDependencies(prisma, KEMPSEY, "parking_access");

  const detailedPlanningPack = await createDetailedPlanningPackArtefact({
    body: {
      projectId: KEMPSEY.publicId,
      proposalBrief: KEMPSEY.proposalBrief,
    },
    userId: USER_ID,
    deps: deps as any,
  });

  assert.equal(detailedPlanningPack.content.commercialReady, false);
  assert.ok(
    detailedPlanningPack.content.unresolvedTopics.some((topic) =>
      /Parking and access/.test(topic)
    ),
  );

  await assert.rejects(
    () => createPreSeePlanningMemoArtefact({
      body: { projectId: KEMPSEY.publicId },
      userId: USER_ID,
      deps: deps as any,
    }),
    (error) =>
      error instanceof ArtefactValidationError &&
      /unresolved topics/.test(error.message),
  );
  assert.equal(
    prisma.artefacts.some(
      (artefact) => artefact.type === "pre_see_planning_memo",
    ),
    false,
  );

  const review = await createExpertReviewRequestArtefact(
    { body: { projectId: KEMPSEY.publicId }, userId: USER_ID },
    { prisma: prisma as any },
  );
  assert.deepEqual(
    review.content.includedArtefacts.map((artefact) => artefact.type),
    ["quick_site_check", "detailed_planning_pack"],
  );
  assert.equal(review.content.sourceSeeMemo, null);
  assert.match(review.content.packageSummary, /No SEE readiness is claimed/);
  assert.equal(review.content.detailedPlanningPack?.commercialReady, false);
  assert.equal(review.content.detailedPlanningPack?.citedRequirements?.length, 4);
  assert.ok(review.content.detailedPlanningPack?.citedRequirements?.every((requirement) => requirement.excerpt.length > 0));
  assert.equal(
    review.content.detailedPlanningPack?.citedRequirements?.some((requirement) => requirement.topicId === "parking_access"),
    false,
  );
  assert.equal(
    review.content.detailedPlanningPack?.sourceQuickSiteCheckArtefactId,
    quickSiteCheck.id,
  );

  const audit = await auditCommercialFunnel(KEMPSEY.publicId, {
    prisma: prisma as any,
  });
  assert.ok("referralEligibility" in audit);
  assert.equal(audit.quickSiteCheck.state, "ready");
  assert.equal(audit.detailedPlanningPack.state, "needs_expert_review");
  assert.equal(audit.see.state, "missing");
  assert.equal(audit.referralEligibility, "unresolved_pack_referral");
  assert.equal(
    audit.nextAction.code,
    "refer_unresolved_pack_for_expert_review",
  );
});

test("generic current-zone Part B evidence cannot populate unrelated DPP topics", async () => {
  const prisma = new GoldenPrisma(KEMPSEY);
  await saveQuickSiteCheck(prisma, KEMPSEY);
  const deps = {
    ...serviceDependencies(prisma, KEMPSEY),
    getDCPContext: async (lgaCode: string) => [{
      id: "generic-part-b",
      lgaCode,
      sourceDocId: "KEMPSEY_DCP_2026",
      ref: "Part B > Parking and access",
      title: "Part B administration",
      headingPath: ["Kempsey DCP 2026", "Part B"],
      bodyText: "This clause records the current E2 Commercial Centre zone and a source reference for the site.",
      depth: 2,
      topicTags: [],
      numericMeta: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      score: 50,
    }],
  };

  const detailedPlanningPack = await createDetailedPlanningPackArtefact({
    body: {
      projectId: KEMPSEY.publicId,
      proposalBrief: KEMPSEY.proposalBrief,
    },
    userId: USER_ID,
    deps: deps as any,
  });

  assert.equal(detailedPlanningPack.content.commercialReady, false);
  assert.equal(detailedPlanningPack.content.dcpEvidence.length, 5);
  assert.equal(
    detailedPlanningPack.content.dcpEvidence.find((topic) => topic.topicId === "parking_access")?.status,
    "Unavailable",
  );
  assert.ok(
    detailedPlanningPack.content.dcpEvidence.every((topic) =>
      topic.status === "Unavailable" && topic.citations.length === 0
    ),
  );
  assert.equal(detailedPlanningPack.content.unresolvedTopics.length, 5);
});

test("Part B evidence qualifies only when its heading or body matches the requested topic", async () => {
  const prisma = new GoldenPrisma(KEMPSEY);
  await saveQuickSiteCheck(prisma, KEMPSEY);
  const deps = {
    ...serviceDependencies(prisma, KEMPSEY),
    getDCPContext: async (lgaCode: string) => [{
      id: "part-b-parking",
      lgaCode,
      sourceDocId: "KEMPSEY_DCP_2026",
      ref: "Part B > Parking",
      title: "Part B parking, access and loading",
      headingPath: ["Kempsey DCP 2026", "Part B", "Parking and access"],
      bodyText: "Provide 1 parking space per 40m2 of gross floor area and ensure driveway and loading access is maintained.",
      depth: 2,
      topicTags: ["parking_access"],
      numericMeta: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      score: 50,
    }],
  };

  const detailedPlanningPack = await createDetailedPlanningPackArtefact({
    body: {
      projectId: KEMPSEY.publicId,
      proposalBrief: KEMPSEY.proposalBrief,
    },
    userId: USER_ID,
    deps: deps as any,
  });

  assert.equal(detailedPlanningPack.content.commercialReady, false);
  assert.equal(
    detailedPlanningPack.content.dcpEvidence.find((topic) => topic.topicId === "parking_access")?.status,
    "Cited",
  );
  assert.deepEqual(
    detailedPlanningPack.content.dcpEvidence
      .filter((topic) => topic.topicId !== "parking_access")
      .map((topic) => topic.status),
    ["Unavailable", "Unavailable", "Unavailable", "Unavailable"],
  );
});
