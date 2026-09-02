import { createHash } from "node:crypto";

import {
  buildItem74hCandidateReviewedPathwayProof,
  ITEM74H_CANDIDATE_SCOPE_KEY,
  type CandidateDecisionGate,
} from "./item74h-candidate-reviewed-pathway";
import { buildPathwayCommercialPresentation } from "./pathway-commercial-presentation";
import {
  createPathwayProgressiveCommercialBinding,
  evaluateWorkingPathwayArtefactPolicy,
  verifyPathwayProgressiveCommercialBinding,
} from "./pathway-progressive-commercial-binding";

export const ITEM74H_PROGRESSIVE_EVIDENCE_REGENERATION_VERSION =
  "item74h-progressive-evidence-regeneration.v1" as const;

export const ITEM74H_BOUNDARY_EVIDENCE_GAP =
  "REGISTERED_BOUNDARY_OR_SET_OUT_CONFIRMATION" as const;
export const ITEM74H_CONTROL_REPLAY_GAP =
  "FINAL_GENERATION_CONTROL_CURRENCY_REPLAY" as const;

export type Item74hEvidenceAuthority =
  | "AUTHORITATIVE_CONTROL"
  | "OFFICIAL_CASE_RECORD"
  | "PROFESSIONAL_REPORT"
  | "SECONDARY_PUBLIC_RECORD";
export type Item74hEvidenceCurrency =
  | "CURRENT"
  | "DATED_CASE_EVIDENCE"
  | "REQUIRES_REVALIDATION"
  | "EXPIRED";
export type Item74hEvidenceStatus =
  | "PENDING_REVIEW"
  | "ACCEPTED"
  | "CONFLICT"
  | "REJECTED";
export type Item74hEvidenceRole =
  | "CADASTRAL_SURVEY"
  | "CONSULTANT_REPORT"
  | "PUBLIC_DA_DETERMINATION"
  | "PUBLIC_DA_STAMPED_PLAN"
  | "PUBLIC_DA_SUBMITTED_SEE"
  | "CURRENT_CONTROL_REPLAY";

export type Item74hProjectEvidenceEvent = {
  eventId: string;
  projectScopeKey: string;
  evidenceRef: string;
  sourceKind:
    | "PRIVATE_CUSTOMER_UPLOAD"
    | "PUBLIC_DA_CUSTOMER_SELECTED"
    | "AUTHORITATIVE_CONTROL_REPLAY";
  role: Item74hEvidenceRole;
  authority: Item74hEvidenceAuthority;
  currency: Item74hEvidenceCurrency;
  status: Item74hEvidenceStatus;
  documentDate: string;
  reviewedAt: string | null;
  sourceRef: string;
  customerSelected: boolean;
  automatedCopyPerformed: false;
  storage: {
    mode: "PRIVATE_PROJECT_STORAGE" | "DURABLE_REFERENCE_ONLY";
    privateStorageConfirmed: boolean;
    securityScanClean: boolean;
    operatorReviewComplete: boolean;
    directObjectUrl: null;
  };
  affectedGates: string[];
  confirmsControlKeys: string[];
  resolvesOutstandingEvidence: string[];
  rejectedClaims: Array<{
    field: string;
    suppliedValue: string;
    authoritativeValue: string;
    reason: string;
  }>;
};

export type ByronDaDiscoveryDocumentKind =
  | "DETERMINATION"
  | "STAMPED_PLAN"
  | "SITE_PLAN"
  | "DETAIL_SURVEY"
  | "SUBMITTED_SEE"
  | "OTHER";

export type ByronDaDiscoveryInput = {
  projectScopeKey: string;
  trackerUrl: string;
  applicationNumber: string;
  discoveredAt: string;
  documents: Array<{
    record: string;
    title: string;
    kind: ByronDaDiscoveryDocumentKind;
    documentDate: string;
  }>;
};

const SHA256 = /^[a-f0-9]{64}$/;
const OPAQUE_REF = /^[A-Za-z0-9_-]{8,160}$/;
const EVENT_ID = /^evt_[A-Za-z0-9_-]{8,156}$/;
const SOURCE_REF = /^[A-Za-z0-9 ._:/()-]{3,240}$/;
const BYRON_TRACKER_HOST = "datracker.byron.nsw.gov.au";
const BYRON_APPLICATION_PATH =
  /^\/MasterViewUI-External\/Application\/ApplicationDetails\/(\d{3})\.(\d{4})\.(\d{8})\.(\d{3})\/?$/i;

function sha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function normalizeApplicationFromPath(pathname: string): string | null {
  const match = BYRON_APPLICATION_PATH.exec(pathname);
  if (!match) return null;
  return [match[1], match[2], match[3], match[4]]
    .map((value) => String(Number(value)))
    .join(".");
}

function classifyDocument(kind: ByronDaDiscoveryDocumentKind) {
  if (kind === "DETERMINATION" || kind === "STAMPED_PLAN") {
    return {
      authority: "OFFICIAL_CASE_RECORD" as const,
      currency: "DATED_CASE_EVIDENCE" as const,
      maySupportCurrentLawWithoutReplay: false,
    };
  }
  if (kind === "DETAIL_SURVEY") {
    return {
      authority: "PROFESSIONAL_REPORT" as const,
      currency: "REQUIRES_REVALIDATION" as const,
      maySupportCurrentLawWithoutReplay: false,
    };
  }
  return {
    authority: "SECONDARY_PUBLIC_RECORD" as const,
    currency: "REQUIRES_REVALIDATION" as const,
    maySupportCurrentLawWithoutReplay: false,
  };
}

export function discoverByronDaHistory(input: ByronDaDiscoveryInput) {
  const url = new URL(input.trackerUrl);
  const applicationFromPath = normalizeApplicationFromPath(url.pathname);
  if (
    url.protocol !== "https:" ||
    url.hostname !== BYRON_TRACKER_HOST ||
    applicationFromPath !== input.applicationNumber
  ) {
    throw new Error("Byron DA discovery requires a matching allow-listed tracker URL");
  }
  if (input.projectScopeKey !== ITEM74H_CANDIDATE_SCOPE_KEY) {
    throw new Error("DA discovery must remain bound to the purchased project scope");
  }
  if (!Number.isFinite(Date.parse(input.discoveredAt)) || input.documents.length === 0) {
    throw new Error("DA discovery requires a valid discovery time and document list");
  }

  const documents = input.documents.map((document) => {
    if (
      !/^E\d{4}\/\d{3,10}$/.test(document.record) ||
      !document.title.trim() ||
      !Number.isFinite(Date.parse(document.documentDate))
    ) {
      throw new Error("DA discovery document metadata is invalid");
    }
    return {
      ...document,
      ...classifyDocument(document.kind),
      importState: "NOT_IMPORTED" as const,
      customerSelectionRequired: true as const,
      automatedCopyPerformed: false as const,
      importMode:
        "LINK_ONLY_OR_CUSTOMER_UPLOAD_UNTIL_PERMISSION_CONFIRMED" as const,
    };
  });

  return {
    version: "item74h-byron-da-history-discovery.v1" as const,
    projectScopeKey: input.projectScopeKey,
    council: "Byron Shire Council" as const,
    applicationNumber: input.applicationNumber,
    trackerUrl: url.toString(),
    discoveredAt: input.discoveredAt,
    documents,
    customerSelectionRequired: true as const,
    automatedServerCopyAllowed: false as const,
    completePropertyHistoryClaimed: false as const,
    currentControlAuthorityClaimed: false as const,
    privateProjectImportRequired: true as const,
    permissionBoundary:
      "Discovery may list public metadata and deep-link to Council. Copying a document into Plannera requires a permitted integration or an explicit customer-supplied upload.",
  };
}

export const ITEM74H_BYRON_DA_DISCOVERY_INPUT: ByronDaDiscoveryInput = {
  projectScopeKey: ITEM74H_CANDIDATE_SCOPE_KEY,
  trackerUrl:
    "https://datracker.byron.nsw.gov.au/MasterViewUI-External/Application/ApplicationDetails/010.2026.00000223.001/",
  applicationNumber: "10.2026.223.1",
  discoveredAt: "2026-09-02T02:00:00.000Z",
  documents: [
    { record: "E2026/80895", title: "Notice of determination", kind: "DETERMINATION", documentDate: "2026-07-14" },
    { record: "E2026/47502", title: "Council-stamped plans", kind: "STAMPED_PLAN", documentDate: "2026-05-01" },
    { record: "E2026/47506", title: "Site plan", kind: "SITE_PLAN", documentDate: "2026-05-01" },
    { record: "E2026/47509", title: "Detail survey", kind: "DETAIL_SURVEY", documentDate: "2026-05-01" },
    { record: "E2026/47507", title: "Submitted SEE", kind: "SUBMITTED_SEE", documentDate: "2026-05-01" },
  ],
};

export const ITEM74H_PROGRESSIVE_EVIDENCE_EVENTS: readonly Item74hProjectEvidenceEvent[] = [
  {
    eventId: "evt_survey_candidate_20260902",
    projectScopeKey: ITEM74H_CANDIDATE_SCOPE_KEY,
    evidenceRef: "ev_survey_candidate_20260902",
    sourceKind: "PRIVATE_CUSTOMER_UPLOAD",
    role: "CADASTRAL_SURVEY",
    authority: "PROFESSIONAL_REPORT",
    currency: "REQUIRES_REVALIDATION",
    status: "PENDING_REVIEW",
    documentDate: "2026-09-02",
    reviewedAt: null,
    sourceRef: "private-survey-candidate-v1",
    customerSelected: true,
    automatedCopyPerformed: false,
    storage: {
      mode: "PRIVATE_PROJECT_STORAGE",
      privateStorageConfirmed: true,
      securityScanClean: true,
      operatorReviewComplete: false,
      directObjectUrl: null,
    },
    affectedGates: ["04"],
    confirmsControlKeys: [],
    resolvesOutstandingEvidence: [],
    rejectedClaims: [],
  },
  {
    eventId: "evt_consultant_candidate_20260902",
    projectScopeKey: ITEM74H_CANDIDATE_SCOPE_KEY,
    evidenceRef: "ev_consultant_candidate_20260902",
    sourceKind: "PRIVATE_CUSTOMER_UPLOAD",
    role: "CONSULTANT_REPORT",
    authority: "PROFESSIONAL_REPORT",
    currency: "REQUIRES_REVALIDATION",
    status: "PENDING_REVIEW",
    documentDate: "2026-09-02",
    reviewedAt: null,
    sourceRef: "private-consultant-candidate-v1",
    customerSelected: true,
    automatedCopyPerformed: false,
    storage: {
      mode: "PRIVATE_PROJECT_STORAGE",
      privateStorageConfirmed: true,
      securityScanClean: true,
      operatorReviewComplete: false,
      directObjectUrl: null,
    },
    affectedGates: ["04", "05"],
    confirmsControlKeys: [],
    resolvesOutstandingEvidence: [],
    rejectedClaims: [],
  },
  {
    eventId: "evt_public_determination_20260902",
    projectScopeKey: ITEM74H_CANDIDATE_SCOPE_KEY,
    evidenceRef: "ev_public_determination_20260902",
    sourceKind: "PUBLIC_DA_CUSTOMER_SELECTED",
    role: "PUBLIC_DA_DETERMINATION",
    authority: "OFFICIAL_CASE_RECORD",
    currency: "DATED_CASE_EVIDENCE",
    status: "ACCEPTED",
    documentDate: "2026-07-14",
    reviewedAt: "2026-09-02T02:10:00.000Z",
    sourceRef: "Byron DA 10.2026.223.1 record E2026/80895",
    customerSelected: true,
    automatedCopyPerformed: false,
    storage: {
      mode: "DURABLE_REFERENCE_ONLY",
      privateStorageConfirmed: false,
      securityScanClean: true,
      operatorReviewComplete: true,
      directObjectUrl: null,
    },
    affectedGates: ["02", "05"],
    confirmsControlKeys: [
      "PUBLIC_DA_DETERMINATION_SELECTED_WITHOUT_AUTOMATED_COPY",
    ],
    resolvesOutstandingEvidence: [],
    rejectedClaims: [],
  },
  {
    eventId: "evt_public_see_conflict_20260902",
    projectScopeKey: ITEM74H_CANDIDATE_SCOPE_KEY,
    evidenceRef: "ev_public_see_conflict_20260902",
    sourceKind: "PUBLIC_DA_CUSTOMER_SELECTED",
    role: "PUBLIC_DA_SUBMITTED_SEE",
    authority: "SECONDARY_PUBLIC_RECORD",
    currency: "REQUIRES_REVALIDATION",
    status: "CONFLICT",
    documentDate: "2026-05-01",
    reviewedAt: "2026-09-02T02:12:00.000Z",
    sourceRef: "Byron DA 10.2026.223.1 record E2026/47507",
    customerSelected: true,
    automatedCopyPerformed: false,
    storage: {
      mode: "DURABLE_REFERENCE_ONLY",
      privateStorageConfirmed: false,
      securityScanClean: true,
      operatorReviewComplete: true,
      directObjectUrl: null,
    },
    affectedGates: ["04"],
    confirmsControlKeys: [],
    resolvesOutstandingEvidence: [],
    rejectedClaims: [
      {
        field: "maximumFloorSpaceRatio",
        suppliedValue: "0.5:1",
        authoritativeValue: "0.4:1",
        reason: "Secondary submitted material conflicts with current authoritative NSW mapping.",
      },
    ],
  },
  {
    eventId: "evt_control_replay_candidate_20260902",
    projectScopeKey: ITEM74H_CANDIDATE_SCOPE_KEY,
    evidenceRef: "ev_control_replay_candidate_20260902",
    sourceKind: "AUTHORITATIVE_CONTROL_REPLAY",
    role: "CURRENT_CONTROL_REPLAY",
    authority: "AUTHORITATIVE_CONTROL",
    currency: "CURRENT",
    status: "PENDING_REVIEW",
    documentDate: "2026-09-02",
    reviewedAt: null,
    sourceRef: "NSW EPI and Byron DCP final-generation replay candidate",
    customerSelected: false,
    automatedCopyPerformed: false,
    storage: {
      mode: "DURABLE_REFERENCE_ONLY",
      privateStorageConfirmed: false,
      securityScanClean: true,
      operatorReviewComplete: false,
      directObjectUrl: null,
    },
    affectedGates: ["04"],
    confirmsControlKeys: [],
    resolvesOutstandingEvidence: [],
    rejectedClaims: [],
  },
] as const;

function validateEvidenceEvent(event: Item74hProjectEvidenceEvent) {
  if (
    event.projectScopeKey !== ITEM74H_CANDIDATE_SCOPE_KEY ||
    !EVENT_ID.test(event.eventId) ||
    !OPAQUE_REF.test(event.evidenceRef) ||
    !SOURCE_REF.test(event.sourceRef) ||
    !Number.isFinite(Date.parse(event.documentDate)) ||
    event.automatedCopyPerformed !== false ||
    event.storage.directObjectUrl !== null
  ) {
    throw new Error("Evidence event fails project, provenance or privacy validation");
  }
  if (
    event.sourceKind === "PRIVATE_CUSTOMER_UPLOAD" &&
    (event.storage.mode !== "PRIVATE_PROJECT_STORAGE" ||
      !event.storage.privateStorageConfirmed ||
      !event.storage.securityScanClean)
  ) {
    throw new Error("Private evidence must remain scanned in private project storage");
  }
  if (
    event.sourceKind === "PUBLIC_DA_CUSTOMER_SELECTED" &&
    !event.customerSelected
  ) {
    throw new Error("Public DA evidence requires explicit customer selection");
  }
  if (
    event.status === "ACCEPTED" &&
    (!event.reviewedAt ||
      !Number.isFinite(Date.parse(event.reviewedAt)) ||
      !event.storage.operatorReviewComplete)
  ) {
    throw new Error("Accepted evidence requires a dated operator review");
  }
}

function eventCanResolve(event: Item74hProjectEvidenceEvent, gap: string) {
  if (event.status !== "ACCEPTED" || event.currency !== "CURRENT") return false;
  if (gap === ITEM74H_BOUNDARY_EVIDENCE_GAP) {
    return (
      event.role === "CADASTRAL_SURVEY" &&
      event.authority === "PROFESSIONAL_REPORT" &&
      event.storage.mode === "PRIVATE_PROJECT_STORAGE" &&
      event.storage.privateStorageConfirmed &&
      event.storage.securityScanClean &&
      event.storage.operatorReviewComplete
    );
  }
  if (gap === ITEM74H_CONTROL_REPLAY_GAP) {
    return (
      event.role === "CURRENT_CONTROL_REPLAY" &&
      event.authority === "AUTHORITATIVE_CONTROL" &&
      event.storage.operatorReviewComplete
    );
  }
  return false;
}

function workingPayload(
  product: "PLANNING_CONTROLS_PACK" | "SUBMISSION_SEE",
  scopeDigest: string,
  outstandingEvidence: string[],
  evidenceGraphDigest: string,
  sourceRegister: Array<{
    evidenceRef: string;
    role: Item74hEvidenceRole;
    authority: Item74hEvidenceAuthority;
    currency: Item74hEvidenceCurrency;
    status: Item74hEvidenceStatus;
  }>,
) {
  const planningPack = product === "PLANNING_CONTROLS_PACK";
  return {
    productCode: product,
    priceAudCents: planningPack ? 4900 : 74900,
    readiness: planningPack ? "WORKING_CONTROLS_PACK" : "WORKING_SEE",
    submissionReady: false,
    finalSubmissionEligible: false,
    scopeDigest,
    outstandingEvidence,
    generation: 2,
    evidenceGraphDigest,
    sourceRegister,
  };
}

export function regenerateItem74hPurchasedProject(
  events: readonly Item74hProjectEvidenceEvent[],
) {
  const baseline = buildItem74hCandidateReviewedPathwayProof();
  const discovery = discoverByronDaHistory(ITEM74H_BYRON_DA_DISCOVERY_INPUT);
  events.forEach(validateEvidenceEvent);

  const eventIds = events.map((event) => event.eventId);
  if (new Set(eventIds).size !== eventIds.length) {
    throw new Error("Evidence event IDs must be unique");
  }

  const outstandingEvidence = baseline.binding.outstandingEvidence.filter(
    (gap) =>
      !events.some(
        (event) =>
          event.resolvesOutstandingEvidence.includes(gap) &&
          eventCanResolve(event, gap),
      ),
  );
  const confirmedControlKeys = [
    ...baseline.binding.confirmedControlKeys,
    ...events
      .filter((event) => event.status === "ACCEPTED")
      .flatMap((event) => event.confirmsControlKeys),
  ];
  const evidenceGraphDigest = sha256({
    baselineEvidenceDigest: baseline.evidenceDigest,
    events,
  });
  if (!SHA256.test(evidenceGraphDigest)) {
    throw new Error("Evidence graph digest failed");
  }

  const binding = createPathwayProgressiveCommercialBinding({
    scopeKey: baseline.binding.scopeKey,
    siteEvidenceDigest: evidenceGraphDigest,
    pathwayDecision: baseline.binding.pathwayDecision,
    evidenceStatus:
      outstandingEvidence.length === 0 ? "CONFIRMED" : "MORE_EVIDENCE_REQUIRED",
    confirmedControlKeys,
    outstandingEvidence,
  });
  const gate04Resolved =
    !outstandingEvidence.includes(ITEM74H_BOUNDARY_EVIDENCE_GAP) &&
    !outstandingEvidence.includes(ITEM74H_CONTROL_REPLAY_GAP);
  const gates: CandidateDecisionGate[] = baseline.gates.map((gate) => {
    if (gate.gate !== "04") return { ...gate, evidence: [...gate.evidence], branches: [...gate.branches] };
    if (gate04Resolved) {
      return {
        ...gate,
        evidence: [...gate.evidence, "Accepted current survey and authoritative control replay"],
        outcome: "PROCEED",
        reason:
          "The accepted current professional survey resolves legal set-out and the authoritative final-generation replay confirms control currency.",
        branches: [...gate.branches],
      };
    }
    return {
      ...gate,
      evidence: [...gate.evidence],
      outcome: "MORE_EVIDENCE",
      reason:
        "Working outputs were regenerated, but pending or conflicting evidence cannot resolve legal set-out or final control-currency gates.",
      branches: [...gate.branches],
    };
  });

  const presentation = buildPathwayCommercialPresentation({
    planningControlsPackReadiness: "WORKING",
    submissionSeeReadiness: "WORKING",
    submissionReady: false,
    productionCheckoutEnabled: false,
  });
  const sourceRegister = events.map((event) => ({
    evidenceRef: event.evidenceRef,
    role: event.role,
    authority: event.authority,
    currency: event.currency,
    status: event.status,
  }));
  const assessment = {
    trustLevel: "SITE_CONFIRMED",
    isCurrent: true,
    evidenceCurrent: true,
    controlsCurrent: true,
    fixtureEvidence: false,
  };
  const planningControlsPackPayload = workingPayload(
    "PLANNING_CONTROLS_PACK",
    binding.scopeDigest,
    binding.outstandingEvidence,
    evidenceGraphDigest,
    sourceRegister,
  );
  const submissionSeePayload = workingPayload(
    "SUBMISSION_SEE",
    binding.scopeDigest,
    binding.outstandingEvidence,
    evidenceGraphDigest,
    sourceRegister,
  );

  return {
    version: ITEM74H_PROGRESSIVE_EVIDENCE_REGENERATION_VERSION,
    projectScopeKey: ITEM74H_CANDIDATE_SCOPE_KEY,
    priorEvidenceDigest: baseline.evidenceDigest,
    evidenceDigest: evidenceGraphDigest,
    evidenceEvents: events,
    publicDaDiscovery: discovery,
    gates,
    customerDecision:
      outstandingEvidence.length === 0
        ? ("PROCEED" as const)
        : ("MORE_EVIDENCE_REQUIRED" as const),
    binding,
    presentation,
    workingProducts: {
      planningControlsPack: {
        payload: planningControlsPackPayload,
        policy: evaluateWorkingPathwayArtefactPolicy({
          commercialStage: "PLANNING_CONTROLS_PACK_WORKING",
          scopeKey: binding.scopeKey,
          evidenceDigest: binding.siteEvidenceDigest,
          progressiveBinding: binding,
          artefactPayload: planningControlsPackPayload,
          assessment,
        }),
      },
      submissionSee: {
        payload: submissionSeePayload,
        policy: evaluateWorkingPathwayArtefactPolicy({
          commercialStage: "SUBMISSION_SEE_WORKING",
          scopeKey: binding.scopeKey,
          evidenceDigest: binding.siteEvidenceDigest,
          progressiveBinding: binding,
          artefactPayload: submissionSeePayload,
          assessment,
        }),
      },
    },
    intakeSummary: {
      pendingPrivateEvidence: events.filter(
        (event) =>
          event.sourceKind === "PRIVATE_CUSTOMER_UPLOAD" &&
          event.status === "PENDING_REVIEW",
      ).length,
      acceptedPublicCaseEvidence: events.filter(
        (event) =>
          event.sourceKind === "PUBLIC_DA_CUSTOMER_SELECTED" &&
          event.status === "ACCEPTED",
      ).length,
      conflictsPreserved: events.filter((event) => event.status === "CONFLICT").length,
      automatedPublicDocumentCopies: 0 as const,
      sameProjectRegenerated: true as const,
    },
    finalSubmissionEligible: false as const,
    productionCheckoutEnabled: false as const,
  };
}

export function buildItem74hProgressiveEvidenceRegenerationProof() {
  return regenerateItem74hPurchasedProject(ITEM74H_PROGRESSIVE_EVIDENCE_EVENTS);
}

export type Item74hProgressiveEvidenceRegenerationProof = ReturnType<
  typeof buildItem74hProgressiveEvidenceRegenerationProof
>;

export function verifyItem74hProgressiveEvidenceRegenerationProof(
  proof: Item74hProgressiveEvidenceRegenerationProof,
): boolean {
  return (
    proof.version === ITEM74H_PROGRESSIVE_EVIDENCE_REGENERATION_VERSION &&
    proof.projectScopeKey === ITEM74H_CANDIDATE_SCOPE_KEY &&
    proof.evidenceDigest !== proof.priorEvidenceDigest &&
    SHA256.test(proof.evidenceDigest) &&
    proof.publicDaDiscovery.automatedServerCopyAllowed === false &&
    proof.publicDaDiscovery.customerSelectionRequired === true &&
    proof.intakeSummary.pendingPrivateEvidence === 2 &&
    proof.intakeSummary.acceptedPublicCaseEvidence === 1 &&
    proof.intakeSummary.conflictsPreserved === 1 &&
    proof.intakeSummary.automatedPublicDocumentCopies === 0 &&
    proof.intakeSummary.sameProjectRegenerated === true &&
    proof.binding.scopeKey === ITEM74H_CANDIDATE_SCOPE_KEY &&
    proof.binding.evidenceStatus === "MORE_EVIDENCE_REQUIRED" &&
    proof.binding.outstandingEvidence.includes(ITEM74H_BOUNDARY_EVIDENCE_GAP) &&
    proof.binding.outstandingEvidence.includes(ITEM74H_CONTROL_REPLAY_GAP) &&
    verifyPathwayProgressiveCommercialBinding(proof.binding) &&
    proof.gates.find((gate) => gate.gate === "04")?.outcome === "MORE_EVIDENCE" &&
    proof.workingProducts.planningControlsPack.payload.generation === 2 &&
    proof.workingProducts.submissionSee.payload.generation === 2 &&
    proof.workingProducts.planningControlsPack.policy.allowed === true &&
    proof.workingProducts.submissionSee.policy.allowed === true &&
    proof.presentation.planningControlsPack.checkoutEnabled === false &&
    proof.presentation.submissionSee.checkoutEnabled === false &&
    proof.finalSubmissionEligible === false &&
    proof.productionCheckoutEnabled === false
  );
}
