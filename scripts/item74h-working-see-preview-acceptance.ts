import {
  REQUIRED_SUBMISSION_SEE_SECTIONS,
  assessSubmissionSee,
  type SubmissionSeeCandidate,
} from "../src/lib/submission-see-acceptance";
import {
  renderSubmissionSeeOutputs,
  renderWorkingSeeOutputs,
  type WorkingSeeRenderContext,
} from "../src/lib/submission-see-renderer";

const hash = (character: string) => character.repeat(64);

const candidate: SubmissionSeeCandidate = {
  documentType: "statement_of_environmental_effects",
  productCode: "submission_see",
  priceAud: 749,
  commercialMode: "preview",
  projectId: "synthetic-render-review",
  generatedAt: "2026-08-21T03:00:00.000Z",
  site: {
    label: "Synthetic Byron acceptance site",
    confirmedSiteId: "synthetic-byron-site",
    addressFingerprint: hash("d"),
    lgaCode: "BYRON",
    zoneCode: "SP3",
    spatialProvenance: {
      status: "verified",
      authoritative: true,
      serviceUrl:
        "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer/2",
      featureIdentifier: "OBJECTID:824345",
      resolvedAt: "2026-08-21T03:00:00.000Z",
      limitations: [],
    },
  },
  proposalSummary:
    "The synthetic proposal comprises a commercial development with documented built form, access, servicing, operating parameters and site works for controlled output review.",
  sourceDetailedPlanningPack: {
    projectId: "synthetic-render-review",
    artefactId: "synthetic-dpp",
    commercialReady: true,
    unresolvedTopics: [],
    lgaCode: "BYRON",
    zoneCode: "SP3",
    sourceQuickSiteCheckArtefactId: "synthetic-qsc",
  },
  sources: [
    {
      id: "lep",
      type: "LEP",
      title: "Byron Local Environmental Plan 2014",
      officialUrl:
        "https://legislation.nsw.gov.au/view/html/inforce/current/epi-2014-0297",
      retrievedAt: "2026-08-21T03:00:00.000Z",
    },
    {
      id: "dcp",
      type: "DCP",
      title: "Byron Development Control Plan 2014",
      officialUrl:
        "https://www.byron.nsw.gov.au/Council/Plans-Strategies/Planning-Development-Strategies/Byron-Shire-Development-Control-Plan-2014",
      retrievedAt: "2026-08-21T03:00:00.000Z",
    },
    {
      id: "spatial",
      type: "SPATIAL",
      title: "Official NSW zoning feature",
      officialUrl:
        "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer/2",
      retrievedAt: "2026-08-21T03:00:00.000Z",
    },
    {
      id: "proposal-plan",
      type: "UPLOAD",
      title: "Synthetic current proposal plan",
      contentHash: hash("a"),
      retrievedAt: "2026-08-21T03:00:00.000Z",
    },
  ],
  sections: REQUIRED_SUBMISSION_SEE_SECTIONS.map((id, index) => ({
    id,
    title: id.replaceAll("_", " "),
    narrative:
      `Section ${index + 1} records a substantive synthetic evidence-based assessment of the proposal, current planning controls, environmental impacts and mitigation measures for controlled rendering review.`,
    sourceIds: ["lep", "dcp", "spatial", "proposal-plan"],
  })),
  uploadEvidence: {
    reviewed: true,
    uploads: [
      {
        id: "proposal-plan",
        name: "synthetic-proposal-plan.pdf",
        kind: "proposal_plan",
        evidenceStatus: "READY",
        indexingStatus: "READY",
        contentHash: hash("a"),
        currentForSite: true,
        usedInSections: ["proposed_development", "environmental_impacts"],
      },
    ],
  },
  outputs: [],
  limitations: [
    "Synthetic review artefact only; it contains no customer, address, parcel or credential data.",
  ],
  operatorReview: {
    status: "approved",
    reviewedAt: "2026-08-21T03:01:00.000Z",
    checklistVersion: "submission-see.synthetic.v1",
    unresolvedIssues: [],
  },
};

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const expectFinalRejection = (candidateToCheck: SubmissionSeeCandidate) => {
  try {
    renderSubmissionSeeOutputs(candidateToCheck);
  } catch {
    return;
  }
  throw new Error("Qualified working SEE unexpectedly passed final rendering.");
};

const unresolvedMessage =
  "Start your SEE now. Strengthen it as new evidence arrives. This working SEE identifies unconfirmed matters and is not submission-ready.";

const initialContext: WorkingSeeRenderContext = {
  documentReadiness: {
    state: "WORKING_SEE",
    evidenceStatus: "MORE_EVIDENCE_REQUIRED",
    submissionReady: false,
    customerMessage: unresolvedMessage,
  },
  outstandingEvidence: [
    {
      id: "synthetic-survey-gap",
      topic: "Legal side boundary setback remains unconfirmed",
      status: "MORE_EVIDENCE_REQUIRED",
      recommendedEvidence:
        "Provide a current detail survey reconciled to the registered plan.",
      effect:
        "The setback assessment remains qualified and cannot be represented as submission-ready.",
    },
  ],
  sourceDetailedPlanningPackArtefactId: "synthetic-dpp-v1",
  predecessorDetailedPlanningPackArtefactId: null,
};

const main = () => {
  const initial = structuredClone(candidate);
  initial.sourceDetailedPlanningPack.artefactId =
    initialContext.sourceDetailedPlanningPackArtefactId;
  initial.sourceDetailedPlanningPack.commercialReady = false;
  initial.sourceDetailedPlanningPack.unresolvedTopics = [
    initialContext.outstandingEvidence[0]!.topic,
  ];
  initial.limitations = [
    initialContext.documentReadiness.customerMessage,
    "This working SEE is not submission-ready and must not be lodged.",
  ];
  initial.operatorReview = {
    status: "not_reviewed",
    reviewedAt: null,
    checklistVersion: null,
    unresolvedIssues: ["Evidence and final operator review remain outstanding."],
  };

  expectFinalRejection(initial);
  const first = renderWorkingSeeOutputs(initial, initialContext);
  assert(
    first.outputs.every((output) =>
      output.fileName.startsWith(
        "working-statement-of-environmental-effects-",
      ),
    ),
    "Initial working outputs were not safely named.",
  );
  assert(
    first.docx
      .toString("utf8")
      .includes("WORKING SEE - NOT SUBMISSION READY"),
    "DOCX working label is missing.",
  );
  assert(
    first.pdf
      .toString("latin1")
      .includes("WORKING SEE - NOT SUBMISSION READY"),
    "PDF working label is missing.",
  );

  const initialAcceptance = assessSubmissionSee({
    ...initial,
    outputs: first.outputs,
  });
  assert(!initialAcceptance.ready, "Initial working SEE became final-ready.");

  const strengthened = structuredClone(initial);
  strengthened.generatedAt = "2026-08-21T04:00:00.000Z";
  strengthened.sourceDetailedPlanningPack.artefactId = "synthetic-dpp-v2";
  strengthened.sourceDetailedPlanningPack.commercialReady = true;
  strengthened.sourceDetailedPlanningPack.unresolvedTopics = [];
  strengthened.sources.push({
    id: "detail-survey",
    type: "UPLOAD",
    title: "Synthetic current detail survey",
    contentHash: hash("b"),
    retrievedAt: strengthened.generatedAt,
  });
  strengthened.uploadEvidence.uploads.push({
    id: "detail-survey",
    name: "synthetic-detail-survey.pdf",
    kind: "detail_survey",
    evidenceStatus: "READY",
    indexingStatus: "READY",
    contentHash: hash("b"),
    currentForSite: true,
    usedInSections: ["site_description", "environmental_impacts"],
  });
  strengthened.sections = strengthened.sections.map((section) => ({
    ...section,
    narrative:
      section.narrative +
      " The later synthetic evidence update is recorded against the same purchased project and confirmed site.",
    sourceIds: [...section.sourceIds, "detail-survey"],
  }));
  const strengthenedMessage =
    "The planning evidence is confirmed for this working SEE. Final operator review is still required before submission-ready output.";
  strengthened.limitations = [
    strengthenedMessage,
    "This working SEE is not submission-ready until final operator review is approved.",
  ];

  const strengthenedContext: WorkingSeeRenderContext = {
    documentReadiness: {
      state: "WORKING_SEE",
      evidenceStatus: "CONFIRMED",
      submissionReady: false,
      customerMessage: strengthenedMessage,
    },
    outstandingEvidence: [],
    sourceDetailedPlanningPackArtefactId: "synthetic-dpp-v2",
    predecessorDetailedPlanningPackArtefactId: "synthetic-dpp-v1",
  };

  assert(
    strengthened.projectId === initial.projectId &&
      strengthened.site.confirmedSiteId === initial.site.confirmedSiteId &&
      strengthened.sourceDetailedPlanningPack
        .sourceQuickSiteCheckArtefactId ===
        initial.sourceDetailedPlanningPack.sourceQuickSiteCheckArtefactId,
    "Evidence strengthening did not preserve the project, site and QSC chain.",
  );
  expectFinalRejection(strengthened);
  const second = renderWorkingSeeOutputs(strengthened, strengthenedContext);
  assert(
    second.outputs[0].contentHash !== first.outputs[0].contentHash &&
      second.outputs[1].contentHash !== first.outputs[1].contentHash,
    "Evidence strengthening did not regenerate changed outputs.",
  );
  assert(
    second.docx.toString("utf8").includes("Strengthens DPP: synthetic-dpp-v1") &&
      second.pdf
        .toString("latin1")
        .includes("Strengthens DPP: synthetic-dpp-v1"),
    "Regenerated outputs do not expose DPP lineage.",
  );

  const strengthenedAcceptance = assessSubmissionSee({
    ...strengthened,
    outputs: second.outputs,
  });
  assert(
    !strengthenedAcceptance.ready &&
      strengthenedAcceptance.issues.some(
        (issue) => issue.code === "operator_review_incomplete",
      ),
    "Strengthened working SEE bypassed final operator acceptance.",
  );

  console.log(
    "[item74h-working-see-preview]",
    JSON.stringify({
      synthetic: true,
      productionMutation: false,
      checkoutActivated: false,
      sameProject: true,
      sameConfirmedSite: true,
      dppLineagePreserved: true,
      initialEvidenceStatus: "MORE_EVIDENCE_REQUIRED",
      strengthenedEvidenceStatus: "CONFIRMED",
      initialSubmissionReady: false,
      strengthenedSubmissionReady: false,
      regeneratedOutputs: second.outputs.map((output) => output.format),
    }),
  );
};

try {
  main();
} catch (error: unknown) {
  const failure =
    error instanceof Error
      ? { name: error.name, message: error.message }
      : { name: "UnknownError", message: "Unknown acceptance failure" };
  console.error("[item74h-working-see-preview] failed", failure);
  process.exitCode = 1;
}
