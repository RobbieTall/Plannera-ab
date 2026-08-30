export const PATHWAY_CHECK_CONTRACT_VERSION = "item74h-v1";
export const PATHWAY_CHECK_GRAPH_VERSION = "byron-ru2-shed-v1";

export const PATHWAY_TRUST_LEVELS = [
  "GENERAL_GUIDANCE",
  "SITE_CONFIRMED",
  "EVIDENCE_VERIFIED",
  "OPERATOR_APPROVED",
  "SUBMISSION_READY",
] as const;

export const PATHWAY_OUTCOMES = [
  "STOP",
  "PROCEED",
  "MERIT_ASSESSMENT",
  "MORE_EVIDENCE_REQUIRED",
] as const;

export type PathwayTrustLevel = (typeof PATHWAY_TRUST_LEVELS)[number];
export type PathwayOutcome = (typeof PATHWAY_OUTCOMES)[number];
export type PathwayTarget =
  | "pathway_preview"
  | "planning_controls_pack"
  | "submission_see";

export type PathwayEvidenceSource = {
  id: string;
  type: "LEP" | "DCP" | "SPATIAL" | "UPLOAD";
  title: string;
  officialUrl: string | null;
  clauseRef: string | null;
  contentHash: string;
  retrievedAt: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  staleAt: string | null;
  authoritative: boolean;
  current: boolean;
  verificationStatus: "accepted" | "unverified" | "superseded";
  verifiedAt: string | null;
  fixture: boolean;
};

export type PlanningControl = {
  id: string;
  kind:
    | "MAX_AREA"
    | "MAX_HEIGHT"
    | "FRONT_SETBACK"
    | "SIDE_SETBACK"
    | "REAR_SETBACK"
    | "CONSTRAINT"
    | "OTHER";
  label: string;
  comparator: "LT" | "LTE" | "EQ" | "GTE" | "GT" | "BOOLEAN";
  value: number | boolean;
  unit: "m" | "m2" | "percent" | "boolean" | "other";
  sourceId: string;
  status: "accepted" | "unverified" | "superseded";
  applicability: {
    lgaCode: string;
    zoneCodes: string[];
    proposalTypes: string[];
    minLotAreaSqm: number | null;
    maxLotAreaSqm: number | null;
  };
};

export type PathwayGate = {
  id: string;
  order: number;
  title: string;
  question: string;
  predicateState: "met" | "not_met" | "unknown" | "conflict";
  outcome: PathwayOutcome;
  stopCondition: boolean;
  reasoning: string;
  sourceIds: string[];
  controlIds: string[];
};

export type PathwayCheckCandidate = {
  contractVersion: string;
  commercialMode: "preview" | "test" | "production";
  target: PathwayTarget;
  trustLevel: PathwayTrustLevel;
  generatedAt: string;
  site: {
    label: string;
    confirmedSiteId: string | null;
    addressFingerprint: string | null;
    lgaCode: string;
    zoneCode: string;
    lotAreaSqm: number | null;
    spatialProvenance: {
      status: "verified" | "partial" | "unresolved";
      authoritative: boolean;
      serviceUrl: string | null;
      featureIdentifier: string | null;
      resolvedAt: string | null;
      limitations: string[];
      fixture: boolean;
    };
  };
  proposal: {
    type: "shed_outbuilding" | string;
    ancillaryUse:
      | "dwelling"
      | "agriculture"
      | "vacant_land_equipment_storage"
      | "unknown";
  };
  graph: {
    id: string;
    version: string;
    contentHash: string;
  };
  sources: PathwayEvidenceSource[];
  controls: PlanningControl[];
  gates: PathwayGate[];
};

export type PathwayCheckIssueCode =
  | "wrong_contract_version"
  | "unsafe_commercial_mode"
  | "unsupported_first_slice"
  | "invalid_generation_time"
  | "invalid_graph"
  | "missing_site"
  | "missing_zone"
  | "invalid_lot_area"
  | "unverified_spatial_provenance"
  | "invalid_source"
  | "missing_source_type"
  | "stale_source"
  | "fixture_evidence_for_paid_output"
  | "invalid_control"
  | "inapplicable_control"
  | "overlapping_control_band"
  | "invalid_gate"
  | "unknown_gate_reference"
  | "inconsistent_gate_outcome"
  | "insufficient_trust";

export type PathwayCheckIssue = {
  code: PathwayCheckIssueCode;
  detail: string;
};

export type PathwayCheckAcceptance = {
  status: "ready" | "blocked";
  ready: boolean;
  issues: PathwayCheckIssue[];
  evidence: {
    sourceCount: number;
    controlCount: number;
    gateCount: number;
    outcomes: PathwayOutcome[];
    fixtureSources: number;
  };
};

const SHA256 = /^[a-f0-9]{64}$/;
const HTTPS = /^https:\/\//i;
const clean = (value: string | null | undefined) => (value ?? "").trim();
const normaliseCode = (value: string | null | undefined) =>
  clean(value).toUpperCase().replace(/\s+/g, "_");
const validTime = (value: string | null | undefined) =>
  Boolean(value && Number.isFinite(Date.parse(value)));
const validHash = (value: string | null | undefined) =>
  Boolean(value && SHA256.test(value));

const trustRank = (trust: PathwayTrustLevel) =>
  PATHWAY_TRUST_LEVELS.indexOf(trust);

const requiredTrust = (target: PathwayTarget): PathwayTrustLevel => {
  if (target === "pathway_preview") return "GENERAL_GUIDANCE";
  if (target === "planning_controls_pack") return "EVIDENCE_VERIFIED";
  return "OPERATOR_APPROVED";
};

const pushIssue = (
  issues: PathwayCheckIssue[],
  code: PathwayCheckIssueCode,
  detail: string,
) => {
  if (!issues.some((issue) => issue.code === code && issue.detail === detail)) {
    issues.push({ code, detail });
  }
};

const sourceIsEffective = (
  source: PathwayEvidenceSource,
  generatedAt: string,
) => {
  const generated = Date.parse(generatedAt);
  if (!Number.isFinite(generated)) return false;
  if (source.effectiveFrom && Date.parse(source.effectiveFrom) > generated) {
    return false;
  }
  if (source.effectiveTo && Date.parse(source.effectiveTo) <= generated) {
    return false;
  }
  if (source.staleAt && Date.parse(source.staleAt) <= generated) {
    return false;
  }
  return true;
};

const validSourceShape = (source: PathwayEvidenceSource) => {
  if (
    !clean(source.id) ||
    !clean(source.title) ||
    !source.officialUrl ||
    !HTTPS.test(source.officialUrl) ||
    !validHash(source.contentHash) ||
    !validTime(source.retrievedAt)
  ) {
    return false;
  }
  if (
    (source.type === "LEP" || source.type === "DCP") &&
    !clean(source.clauseRef)
  ) {
    return false;
  }
  return true;
};

const controlApplies = (
  control: PlanningControl,
  candidate: PathwayCheckCandidate,
) => {
  const lotArea = candidate.site.lotAreaSqm;
  const applicability = control.applicability;
  if (
    normaliseCode(applicability.lgaCode) !==
      normaliseCode(candidate.site.lgaCode) ||
    !applicability.zoneCodes
      .map(normaliseCode)
      .includes(normaliseCode(candidate.site.zoneCode)) ||
    !applicability.proposalTypes.includes(candidate.proposal.type)
  ) {
    return false;
  }
  if (lotArea === null) return candidate.target === "pathway_preview";
  if (
    applicability.minLotAreaSqm !== null &&
    lotArea < applicability.minLotAreaSqm
  ) {
    return false;
  }
  if (
    applicability.maxLotAreaSqm !== null &&
    lotArea >= applicability.maxLotAreaSqm
  ) {
    return false;
  }
  return true;
};

const bandsOverlap = (left: PlanningControl, right: PlanningControl) => {
  if (
    left.kind !== right.kind ||
    normaliseCode(left.applicability.lgaCode) !==
      normaliseCode(right.applicability.lgaCode)
  ) {
    return false;
  }
  const leftZones = new Set(left.applicability.zoneCodes.map(normaliseCode));
  if (!right.applicability.zoneCodes.some((zone) => leftZones.has(normaliseCode(zone)))) {
    return false;
  }
  if (
    !right.applicability.proposalTypes.some((proposal) =>
      left.applicability.proposalTypes.includes(proposal),
    )
  ) {
    return false;
  }
  const leftMin = left.applicability.minLotAreaSqm ?? Number.NEGATIVE_INFINITY;
  const leftMax = left.applicability.maxLotAreaSqm ?? Number.POSITIVE_INFINITY;
  const rightMin = right.applicability.minLotAreaSqm ?? Number.NEGATIVE_INFINITY;
  const rightMax = right.applicability.maxLotAreaSqm ?? Number.POSITIVE_INFINITY;
  return Math.max(leftMin, rightMin) < Math.min(leftMax, rightMax);
};

export function assessPathwayCheck(
  candidate: PathwayCheckCandidate,
): PathwayCheckAcceptance {
  const issues: PathwayCheckIssue[] = [];

  if (candidate.contractVersion !== PATHWAY_CHECK_CONTRACT_VERSION) {
    pushIssue(
      issues,
      "wrong_contract_version",
      "The Pathway Check contract version is not accepted.",
    );
  }
  if (candidate.commercialMode === "production") {
    pushIssue(
      issues,
      "unsafe_commercial_mode",
      "Production commercial execution is not permitted by this acceptance gate.",
    );
  }
  if (!validTime(candidate.generatedAt)) {
    pushIssue(
      issues,
      "invalid_generation_time",
      "A valid generation timestamp is required.",
    );
  }

  const lgaCode = normaliseCode(candidate.site.lgaCode);
  const zoneCode = normaliseCode(candidate.site.zoneCode);
  if (
    lgaCode !== "BYRON" ||
    zoneCode !== "RU2" ||
    candidate.proposal.type !== "shed_outbuilding"
  ) {
    pushIssue(
      issues,
      "unsupported_first_slice",
      "Item 74H v1 is limited to the evidence-confirmed Byron RU2 shed/outbuilding slice.",
    );
  }

  if (
    !clean(candidate.graph.id) ||
    candidate.graph.version !== PATHWAY_CHECK_GRAPH_VERSION ||
    !validHash(candidate.graph.contentHash)
  ) {
    pushIssue(
      issues,
      "invalid_graph",
      "A versioned SHA-256-backed pathway graph is required.",
    );
  }

  const siteRequired = candidate.trustLevel !== "GENERAL_GUIDANCE";
  if (
    siteRequired &&
    (!clean(candidate.site.label) ||
      !clean(candidate.site.confirmedSiteId) ||
      !validHash(candidate.site.addressFingerprint))
  ) {
    pushIssue(
      issues,
      "missing_site",
      "A confirmed site ID and SHA-256 address fingerprint are required above general guidance.",
    );
  }
  if (!zoneCode) {
    pushIssue(issues, "missing_zone", "A planning zone is required.");
  }
  if (
    candidate.site.lotAreaSqm !== null &&
    (!Number.isFinite(candidate.site.lotAreaSqm) ||
      candidate.site.lotAreaSqm <= 0)
  ) {
    pushIssue(
      issues,
      "invalid_lot_area",
      "Lot area must be a positive finite number when supplied.",
    );
  }

  const spatial = candidate.site.spatialProvenance;
  if (
    siteRequired &&
    (spatial.status !== "verified" ||
      spatial.authoritative !== true ||
      spatial.fixture ||
      !spatial.serviceUrl ||
      !HTTPS.test(spatial.serviceUrl) ||
      !clean(spatial.featureIdentifier) ||
      !validTime(spatial.resolvedAt) ||
      spatial.limitations.length > 0)
  ) {
    pushIssue(
      issues,
      "unverified_spatial_provenance",
      "Current authoritative non-fixture spatial provenance is required above general guidance.",
    );
  }

  const sourceIds = new Set<string>();
  const acceptedSourceIds = new Set<string>();
  const sourceTypes = new Set<PathwayEvidenceSource["type"]>();
  let fixtureSources = 0;

  for (const source of candidate.sources) {
    if (!validSourceShape(source) || sourceIds.has(source.id)) {
      pushIssue(
        issues,
        "invalid_source",
        "Every source must be unique, hash-backed, attributable and HTTPS.",
      );
      continue;
    }
    sourceIds.add(source.id);
    sourceTypes.add(source.type);
    if (source.fixture) fixtureSources += 1;

    if (
      !source.current ||
      !sourceIsEffective(source, candidate.generatedAt) ||
      source.verificationStatus === "superseded"
    ) {
      pushIssue(
        issues,
        "stale_source",
        `Source ${source.id} is stale, superseded or outside its effective period.`,
      );
      continue;
    }
    if (
      source.verificationStatus === "accepted" &&
      source.authoritative &&
      validTime(source.verifiedAt)
    ) {
      acceptedSourceIds.add(source.id);
    }
    if (candidate.target !== "pathway_preview" && source.fixture) {
      pushIssue(
        issues,
        "fixture_evidence_for_paid_output",
        `Synthetic source ${source.id} cannot support a paid output.`,
      );
    }
  }

  for (const type of ["LEP", "DCP", "SPATIAL"] as const) {
    if (!sourceTypes.has(type)) {
      pushIssue(
        issues,
        "missing_source_type",
        `A ${type} source is required for this Pathway Check.`,
      );
    }
  }

  const controlIds = new Set<string>();
  const acceptedControls: PlanningControl[] = [];
  for (const control of candidate.controls) {
    const numericValue =
      typeof control.value === "number" ? control.value : null;
    const validValue =
      typeof control.value === "boolean" ||
      (numericValue !== null && Number.isFinite(numericValue));
    if (
      !clean(control.id) ||
      controlIds.has(control.id) ||
      !clean(control.label) ||
      !validValue ||
      !sourceIds.has(control.sourceId) ||
      control.status !== "accepted"
    ) {
      pushIssue(
        issues,
        "invalid_control",
        `Control ${control.id || "unknown"} is incomplete, duplicated, unaccepted or has no valid source.`,
      );
      continue;
    }
    controlIds.add(control.id);
    acceptedControls.push(control);

    if (!controlApplies(control, candidate)) {
      pushIssue(
        issues,
        "inapplicable_control",
        `Control ${control.id} does not apply to the candidate site and proposal.`,
      );
    }
    if (
      candidate.target !== "pathway_preview" &&
      !acceptedSourceIds.has(control.sourceId)
    ) {
      pushIssue(
        issues,
        "invalid_control",
        `Control ${control.id} is not bound to accepted authoritative evidence.`,
      );
    }
  }

  for (let left = 0; left < acceptedControls.length; left += 1) {
    for (let right = left + 1; right < acceptedControls.length; right += 1) {
      if (bandsOverlap(acceptedControls[left], acceptedControls[right])) {
        pushIssue(
          issues,
          "overlapping_control_band",
          `Controls ${acceptedControls[left].id} and ${acceptedControls[right].id} have overlapping applicability bands.`,
        );
      }
    }
  }

  const gateIds = new Set<string>();
  const outcomes = new Set<PathwayOutcome>();
  const orderedGates = [...candidate.gates].sort(
    (left, right) => left.order - right.order,
  );

  for (let index = 0; index < orderedGates.length; index += 1) {
    const gate = orderedGates[index];
    if (
      !clean(gate.id) ||
      gateIds.has(gate.id) ||
      gate.order !== index ||
      clean(gate.title).length < 3 ||
      clean(gate.question).length < 10 ||
      clean(gate.reasoning).length < 20 ||
      gate.sourceIds.length === 0
    ) {
      pushIssue(
        issues,
        "invalid_gate",
        `Gate ${gate.id || "unknown"} is incomplete, duplicated or out of sequence.`,
      );
      continue;
    }
    gateIds.add(gate.id);
    outcomes.add(gate.outcome);

    if (
      gate.sourceIds.some((sourceId) => !sourceIds.has(sourceId)) ||
      gate.controlIds.some((controlId) => !controlIds.has(controlId))
    ) {
      pushIssue(
        issues,
        "unknown_gate_reference",
        `Gate ${gate.id} cites an unknown source or control.`,
      );
    }

    if (
      (gate.predicateState === "unknown" ||
        gate.predicateState === "conflict") &&
      gate.outcome !== "MORE_EVIDENCE_REQUIRED"
    ) {
      pushIssue(
        issues,
        "inconsistent_gate_outcome",
        `Gate ${gate.id} must require more evidence when its predicate is unknown or conflicting.`,
      );
    }
    if (
      (gate.outcome === "STOP") !== gate.stopCondition
    ) {
      pushIssue(
        issues,
        "inconsistent_gate_outcome",
        `Gate ${gate.id} has an inconsistent stop condition and outcome.`,
      );
    }
  }

  if (
    trustRank(candidate.trustLevel) < trustRank(requiredTrust(candidate.target))
  ) {
    pushIssue(
      issues,
      "insufficient_trust",
      `${candidate.target} requires at least ${requiredTrust(candidate.target)} trust.`,
    );
  }
  if (
    candidate.trustLevel !== "GENERAL_GUIDANCE" &&
    fixtureSources > 0
  ) {
    pushIssue(
      issues,
      "insufficient_trust",
      "Synthetic evidence cannot support a site-confirmed or higher trust label.",
    );
  }

  return {
    status: issues.length === 0 ? "ready" : "blocked",
    ready: issues.length === 0,
    issues,
    evidence: {
      sourceCount: sourceIds.size,
      controlCount: controlIds.size,
      gateCount: gateIds.size,
      outcomes: [...outcomes].sort(),
      fixtureSources,
    },
  };
}
