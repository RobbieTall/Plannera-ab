import { readPersistedPathwayCommercialBinding } from "./pathway-persisted-commercial-binding";
import {
  buildPathwayEvidenceChecklist,
  type PathwayEvidenceRequest,
} from "./pathway-evidence-checklist";

export const PATHWAY_CUSTOMER_RESULT_VERSION =
  "item74h-customer-result.v1" as const;

export type PathwayCustomerDecision =
  | "STOP"
  | "PROCEED"
  | "MERIT_ASSESSMENT"
  | "MORE_EVIDENCE_REQUIRED";

type DateLike = Date | string | null | undefined;
type DecimalLike = { toString(): string } | string | number | null | undefined;

export type PathwayCustomerResultInput = {
  decision: string;
  trustLevel: string;
  isCurrent: boolean;
  assessedAt: DateLike;
  staleAt: DateLike;
  result: unknown;
  pathwayDefinition: {
    versionKey: string;
    status: string;
  };
  spatialProvenance: {
    authority: string;
    datasetName: string;
    sourceUrl: string;
    sourceVersion: string | null;
    retrievedAt: DateLike;
    effectiveAt: DateLike;
    trustLevel: string;
    staleAt: DateLike;
  };
  evidenceSnapshots: Array<{
    evidenceKind: string;
    authority: string;
    sourceUrl: string;
    sourceVersion: string | null;
    retrievedAt: DateLike;
    effectiveFrom: DateLike;
    staleAt: DateLike;
    isCurrentAtAssessment: boolean;
  }>;
  controlSnapshots: Array<{
    label: string;
    operator: string | null;
    numericValue: DecimalLike;
    lowerBound: DecimalLike;
    upperBound: DecimalLike;
    textValue: string | null;
    unit: string | null;
    sourceReference: string;
    isCurrentAtAssessment: boolean;
    staleAt: DateLike;
  }>;
  gateSnapshots: Array<{
    sequence: number;
    question: string;
    outcome: string;
    reason: string;
  }>;
  proposalAttestation?: {
    input: unknown;
    trust: string;
    decision: string;
    paidArtefactsEligible: boolean;
  } | null;
};

export type PathwayCustomerResult =
  | {
      version: typeof PATHWAY_CUSTOMER_RESULT_VERSION;
      status: "not_available";
      decision: "MORE_EVIDENCE_REQUIRED";
      reason: "PREVIEW_ONLY" | "NO_PERSISTED_ASSESSMENT";
      message: string;
      commercial: {
        freePathwayCheckAvailable: false;
        planningControlsPackEligible: false;
        submissionSeeEligible: false;
        productionCheckoutEnabled: false;
      };
    }
  | {
      version: typeof PATHWAY_CUSTOMER_RESULT_VERSION;
      status: "available";
      decision: PathwayCustomerDecision;
      decisionLabel: string;
      message: string;
      trustLevel: string;
      assessmentVersion: string;
      assessedAt: string;
      current: boolean;
      proposal: {
        trust: "USER_ATTESTED";
        evidenceState: "MORE_EVIDENCE_REQUIRED";
        purpose: "NON_HABITABLE_RURAL_MACHINERY_AND_GOODS_STORAGE";
        landAreaHectares: number;
        proposedBuildingFootprintSquareMetres: number;
        existingFarmBuildingFootprintSquareMetres: number;
        proposedBuildingHeightMetres: number;
        roadSetbackMetres: number;
        sideSetbackMetres: number;
        otherBoundarySetbackMetres: number;
        roadCategory: "UNRESOLVED";
        paidEligibilityUnlocked: false;
      } | null;
      sources: Array<{
        kind: "LEP" | "DCP" | "SPATIAL";
        authority: string;
        sourceUrl: string;
        sourceVersion: string | null;
        retrievedAt: string;
        effectiveFrom: string | null;
        current: boolean;
      }>;
      controls: Array<{
        label: string;
        operator: string | null;
        value: string;
        unit: string | null;
        sourceReference: string;
        current: boolean;
      }>;
      gates: Array<{
        order: number;
        question: string;
        outcome: PathwayCustomerDecision;
        reasoning: string;
      }>;
      evidenceChecklist: PathwayEvidenceRequest[];
      commercial: {
        freePathwayCheckAvailable: true;
        planningControlsPackEligible: boolean;
        submissionSeeEligible: boolean;
        productionCheckoutEnabled: false;
      };
      privacy: {
        rawAddressReturned: false;
        addressFingerprintReturned: false;
        coordinatesReturned: false;
        parcelIdentifiersReturned: false;
        rawSpatialPayloadReturned: false;
        evidenceDigestsReturned: false;
      };
    };

const decisions = new Set<PathwayCustomerDecision>([
  "STOP",
  "PROCEED",
  "MERIT_ASSESSMENT",
  "MORE_EVIDENCE_REQUIRED",
]);

const iso = (value: DateLike): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
};

const currentAt = (current: boolean, staleAt: DateLike, asOf: Date) => {
  const stale = iso(staleAt);
  return current && (!stale || Date.parse(stale) > asOf.getTime());
};

const decimal = (value: DecimalLike): string | null => {
  if (value === null || value === undefined) return null;
  const rendered = value.toString().trim();
  return rendered || null;
};

const controlValue = (
  control: PathwayCustomerResultInput["controlSnapshots"][number],
): string => {
  const numeric = decimal(control.numericValue);
  if (numeric) return numeric;
  const lower = decimal(control.lowerBound);
  const upper = decimal(control.upperBound);
  if (lower && upper) return lower + " to " + upper;
  if (lower) return "at least " + lower;
  if (upper) return "up to " + upper;
  return control.textValue?.trim() || "Not stated";
};

const decisionLabel: Record<PathwayCustomerDecision, string> = {
  STOP: "Stop",
  PROCEED: "Proceed",
  MERIT_ASSESSMENT: "Merit assessment",
  MORE_EVIDENCE_REQUIRED: "More evidence required",
};

const decisionMessage: Record<PathwayCustomerDecision, string> = {
  STOP:
    "A confirmed stop condition applies to the current evidence and proposal scope.",
  PROCEED:
    "Every recorded gate proceeds for the current evidence and exact proposal scope.",
  MERIT_ASSESSMENT:
    "The proposal needs a documented merit assessment rather than an automatic proceed result.",
  MORE_EVIDENCE_REQUIRED:
    "The check can guide the next step, but missing or user-attested evidence prevents a final site-specific conclusion.",
};

export function unavailablePathwayCustomerResult(
  reason: "PREVIEW_ONLY" | "NO_PERSISTED_ASSESSMENT",
): PathwayCustomerResult {
  return {
    version: PATHWAY_CUSTOMER_RESULT_VERSION,
    status: "not_available",
    decision: "MORE_EVIDENCE_REQUIRED",
    reason,
    message:
      reason === "PREVIEW_ONLY"
        ? "The protected Item 74H Pathway Check is available in Preview only."
        : "No versioned pathway assessment is available for this project yet.",
    commercial: {
      freePathwayCheckAvailable: false,
      planningControlsPackEligible: false,
      submissionSeeEligible: false,
      productionCheckoutEnabled: false,
    },
  };
}

const proposalKeys = [
  "proposalPurpose",
  "landAreaHectares",
  "proposedBuildingFootprintSquareMetres",
  "existingFarmBuildingFootprintSquareMetres",
  "proposedBuildingHeightMetres",
  "roadSetbackMetres",
  "sideSetbackMetres",
  "otherBoundarySetbackMetres",
  "roadCategory",
].sort();

const customerProposal = (
  attestation: PathwayCustomerResultInput["proposalAttestation"],
): Extract<PathwayCustomerResult, { status: "available" }>["proposal"] => {
  if (
    !attestation ||
    attestation.trust !== "USER_ATTESTED" ||
    attestation.decision !== "MORE_EVIDENCE_REQUIRED" ||
    attestation.paidArtefactsEligible !== false ||
    !attestation.input ||
    typeof attestation.input !== "object" ||
    Array.isArray(attestation.input)
  ) {
    return null;
  }
  const value = attestation.input as Record<string, unknown>;
  if (
    JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(proposalKeys) ||
    value.proposalPurpose !==
      "NON_HABITABLE_RURAL_MACHINERY_AND_GOODS_STORAGE" ||
    value.roadCategory !== "UNRESOLVED"
  ) {
    return null;
  }
  const numericKeys = proposalKeys.filter(
    (key) => key !== "proposalPurpose" && key !== "roadCategory",
  );
  if (
    numericKeys.some(
      (key) =>
        typeof value[key] !== "number" ||
        !Number.isFinite(value[key]) ||
        (key === "existingFarmBuildingFootprintSquareMetres"
          ? (value[key] as number) < 0
          : (value[key] as number) <= 0),
    )
  ) {
    return null;
  }
  return {
    trust: "USER_ATTESTED",
    evidenceState: "MORE_EVIDENCE_REQUIRED",
    purpose: "NON_HABITABLE_RURAL_MACHINERY_AND_GOODS_STORAGE",
    landAreaHectares: value.landAreaHectares as number,
    proposedBuildingFootprintSquareMetres:
      value.proposedBuildingFootprintSquareMetres as number,
    existingFarmBuildingFootprintSquareMetres:
      value.existingFarmBuildingFootprintSquareMetres as number,
    proposedBuildingHeightMetres:
      value.proposedBuildingHeightMetres as number,
    roadSetbackMetres: value.roadSetbackMetres as number,
    sideSetbackMetres: value.sideSetbackMetres as number,
    otherBoundarySetbackMetres:
      value.otherBoundarySetbackMetres as number,
    roadCategory: "UNRESOLVED",
    paidEligibilityUnlocked: false,
  };
};

export function toPathwayCustomerResult(
  input: PathwayCustomerResultInput,
  asOf = new Date(),
): PathwayCustomerResult {
  if (!decisions.has(input.decision as PathwayCustomerDecision)) {
    throw new Error("Unsupported pathway decision.");
  }
  const decision = input.decision as PathwayCustomerDecision;
  const assessedAt = iso(input.assessedAt);
  if (!assessedAt) throw new Error("A valid assessment time is required.");

  const evidenceCurrent = input.evidenceSnapshots.every((item) =>
    currentAt(item.isCurrentAtAssessment, item.staleAt, asOf),
  );
  const controlsCurrent = input.controlSnapshots.every((item) =>
    currentAt(item.isCurrentAtAssessment, item.staleAt, asOf),
  );
  const spatialCurrent = currentAt(
    true,
    input.spatialProvenance.staleAt,
    asOf,
  );
  const current =
    input.isCurrent &&
    currentAt(true, input.staleAt, asOf) &&
    input.pathwayDefinition.status === "ACTIVE" &&
    evidenceCurrent &&
    controlsCurrent &&
    spatialCurrent;
  const commercialBinding = readPersistedPathwayCommercialBinding(input.result);

  const sources = input.evidenceSnapshots
    .filter(
      (item): item is typeof item & { evidenceKind: "LEP" | "DCP" | "SPATIAL" } =>
        item.evidenceKind === "LEP" ||
        item.evidenceKind === "DCP" ||
        item.evidenceKind === "SPATIAL",
    )
    .filter((item) => /^https:\/\//i.test(item.sourceUrl))
    .map((item) => ({
      kind: item.evidenceKind,
      authority: item.authority,
      sourceUrl: item.sourceUrl,
      sourceVersion: item.sourceVersion,
      retrievedAt: iso(item.retrievedAt) || assessedAt,
      effectiveFrom: iso(item.effectiveFrom),
      current: currentAt(item.isCurrentAtAssessment, item.staleAt, asOf),
    }));

  if (
    /^https:\/\//i.test(input.spatialProvenance.sourceUrl) &&
    !sources.some(
      (source) =>
        source.kind === "SPATIAL" &&
        source.sourceUrl === input.spatialProvenance.sourceUrl,
    )
  ) {
    sources.push({
      kind: "SPATIAL",
      authority: input.spatialProvenance.authority,
      sourceUrl: input.spatialProvenance.sourceUrl,
      sourceVersion: input.spatialProvenance.sourceVersion,
      retrievedAt: iso(input.spatialProvenance.retrievedAt) || assessedAt,
      effectiveFrom: iso(input.spatialProvenance.effectiveAt),
      current: spatialCurrent,
    });
  }

  const proposal = customerProposal(input.proposalAttestation);
  const controls = input.controlSnapshots.map((control) => ({
    label: control.label,
    operator: control.operator,
    value: controlValue(control),
    unit: control.unit,
    sourceReference: control.sourceReference,
    current: currentAt(
      control.isCurrentAtAssessment,
      control.staleAt,
      asOf,
    ),
  }));
  const gates = [...input.gateSnapshots]
    .sort((left, right) => left.sequence - right.sequence)
    .map((gate) => {
      if (!decisions.has(gate.outcome as PathwayCustomerDecision)) {
        throw new Error("Unsupported persisted gate outcome.");
      }
      return {
        order: gate.sequence,
        question: gate.question,
        outcome: gate.outcome as PathwayCustomerDecision,
        reasoning: gate.reason,
      };
    });
  const evidenceChecklist = buildPathwayEvidenceChecklist({
    decision,
    current,
    proposal,
    sources,
    controls,
    gates,
  });

  return {
    version: PATHWAY_CUSTOMER_RESULT_VERSION,
    status: "available",
    decision,
    decisionLabel: decisionLabel[decision],
    message: decisionMessage[decision],
    trustLevel: input.trustLevel,
    assessmentVersion: input.pathwayDefinition.versionKey,
    assessedAt,
    current,
    proposal,
    sources,
    controls,
    gates,
    evidenceChecklist,
    commercial: {
      freePathwayCheckAvailable: true,
      planningControlsPackEligible: Boolean(
        current && commercialBinding?.planningControlsPackEligible,
      ),
      submissionSeeEligible: Boolean(
        current && commercialBinding?.submissionSeeEligible,
      ),
      productionCheckoutEnabled: false,
    },
    privacy: {
      rawAddressReturned: false,
      addressFingerprintReturned: false,
      coordinatesReturned: false,
      parcelIdentifiersReturned: false,
      rawSpatialPayloadReturned: false,
      evidenceDigestsReturned: false,
    },
  };
}
