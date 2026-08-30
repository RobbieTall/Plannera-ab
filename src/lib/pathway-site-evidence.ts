import { createHash } from 'node:crypto';

export const PATHWAY_SITE_EVIDENCE_MANIFEST_VERSION =
  'byron-ru2-shed-site-evidence.v1' as const;

export const PATHWAY_SITE_FACT_KEYS = [
  'ADDRESS_CONFIRMED',
  'ZONE_CONFIRMED',
  'INSTRUMENT_CURRENT',
  'AGRICULTURAL_ANCILLARY_USE',
  'NON_HABITABLE_DESIGN',
  'PROPOSAL_FOOTPRINT_SQM',
  'PROPOSAL_HEIGHT_M',
  'LANDHOLDING_AREA_SQM',
  'EXISTING_FARM_BUILDING_AREA_SQM',
  'ROAD_CLASSIFICATION',
  'ROAD_BOUNDARY_SETBACK_M',
  'SIDE_REAR_SETBACK_M',
  'WATERBODY_SETBACK_M',
  'HERITAGE_STATUS',
  'ENVIRONMENTAL_SENSITIVITY',
  'MAPPED_CONSTRAINTS',
  'RIDGELINE_VISUAL_IMPACT',
  'EVIDENCE_UPLOAD_SET',
  'OPERATOR_REVIEW',
] as const;

export const PATHWAY_SITE_EVIDENCE_SOURCE_KINDS = [
  'ADDRESS_RESOLVER',
  'AUTHORITATIVE_SPATIAL',
  'AUTHORITATIVE_INSTRUMENT',
  'TITLE_OR_SURVEY',
  'SITE_PLAN',
  'USER_ATTESTATION',
  'WORKSPACE_UPLOAD',
  'OPERATOR_REVIEW',
] as const;

export const PATHWAY_SITE_EVIDENCE_TRUST_LEVELS = [
  'GENERAL_GUIDANCE',
  'SITE_CONFIRMED',
  'EVIDENCE_VERIFIED',
  'OPERATOR_APPROVED',
] as const;

export const PATHWAY_COMMERCIAL_STAGES = [
  'FREE_PATHWAY_CHECK',
  'PLANNING_CONTROLS_PACK',
  'SUBMISSION_SEE',
] as const;

export type PathwaySiteFactKey = (typeof PATHWAY_SITE_FACT_KEYS)[number];
export type PathwaySiteEvidenceSourceKind =
  (typeof PATHWAY_SITE_EVIDENCE_SOURCE_KINDS)[number];
export type PathwaySiteEvidenceTrustLevel =
  (typeof PATHWAY_SITE_EVIDENCE_TRUST_LEVELS)[number];
export type PathwayCommercialStage = (typeof PATHWAY_COMMERCIAL_STAGES)[number];
export type PathwaySiteEvidenceValue = string | number | boolean | string[];

export interface PathwaySiteEvidenceObservation {
  factKey: PathwaySiteFactKey;
  value: PathwaySiteEvidenceValue;
  valueHash: string;
  sourceKind: PathwaySiteEvidenceSourceKind;
  trustLevel: PathwaySiteEvidenceTrustLevel;
  sourceUrl?: string;
  sourceReference: string;
  retrievedAt: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  staleAt?: string;
}

export interface PathwaySiteEvidenceManifestSeed {
  manifestVersion: typeof PATHWAY_SITE_EVIDENCE_MANIFEST_VERSION;
  lgaCode: 'BYRON';
  zoneCode: 'RU2';
  proposalType: 'SHED_OUTBUILDING';
  assessedAt: string;
  observations: PathwaySiteEvidenceObservation[];
}

export interface PathwaySiteEvidenceManifest extends PathwaySiteEvidenceManifestSeed {
  siteEvidenceDigest: string;
}

interface PathwayRequiredSourceGroup {
  anyOf: readonly PathwaySiteEvidenceSourceKind[];
  minimumTrustLevel: PathwaySiteEvidenceTrustLevel;
}

export interface PathwaySiteEvidenceRequirement {
  factKey: PathwaySiteFactKey;
  label: string;
  introducedAtStage: PathwayCommercialStage;
  sourceGroups: readonly PathwayRequiredSourceGroup[];
}

export type PathwaySiteEvidenceRequirementStatus =
  | 'SATISFIED'
  | 'MISSING'
  | 'WRONG_SOURCE'
  | 'INSUFFICIENT_TRUST'
  | 'STALE'
  | 'CONFLICT';

export interface PathwaySiteEvidenceRequirementResult {
  factKey: PathwaySiteFactKey;
  label: string;
  introducedAtStage: PathwayCommercialStage;
  status: PathwaySiteEvidenceRequirementStatus;
  missingSourceGroups: PathwaySiteEvidenceSourceKind[][];
  observationCount: number;
}

export interface PathwayStageEligibility {
  stage: PathwayCommercialStage;
  eligible: boolean;
  blockers: PathwaySiteEvidenceRequirementResult[];
}

export interface PathwaySiteEvidenceEvaluation {
  manifestVersion: typeof PATHWAY_SITE_EVIDENCE_MANIFEST_VERSION;
  siteEvidenceDigest: string;
  requirements: PathwaySiteEvidenceRequirementResult[];
  stages: Record<PathwayCommercialStage, PathwayStageEligibility>;
  highestEligibleStage: PathwayCommercialStage | null;
  evidenceBoundary:
    | 'BASE_SITE_UNCONFIRMED'
    | 'MORE_EVIDENCE_REQUIRED'
    | 'EVIDENCE_VERIFIED'
    | 'OPERATOR_APPROVED';
  readyForDeterministicControlEvaluation: boolean;
}

const SHA256_HEX = /^[a-f0-9]{64}$/i;
const HTTPS_URL = /^https:\/\//i;

const TRUST_RANK: Record<PathwaySiteEvidenceTrustLevel, number> = {
  GENERAL_GUIDANCE: 0,
  SITE_CONFIRMED: 1,
  EVIDENCE_VERIFIED: 2,
  OPERATOR_APPROVED: 3,
};

const MAXIMUM_SOURCE_TRUST: Record<
  PathwaySiteEvidenceSourceKind,
  PathwaySiteEvidenceTrustLevel
> = {
  ADDRESS_RESOLVER: 'SITE_CONFIRMED',
  AUTHORITATIVE_SPATIAL: 'EVIDENCE_VERIFIED',
  AUTHORITATIVE_INSTRUMENT: 'EVIDENCE_VERIFIED',
  TITLE_OR_SURVEY: 'EVIDENCE_VERIFIED',
  SITE_PLAN: 'EVIDENCE_VERIFIED',
  USER_ATTESTATION: 'SITE_CONFIRMED',
  WORKSPACE_UPLOAD: 'EVIDENCE_VERIFIED',
  OPERATOR_REVIEW: 'OPERATOR_APPROVED',
};

const HTTPS_REQUIRED_SOURCES = new Set<PathwaySiteEvidenceSourceKind>([
  'ADDRESS_RESOLVER',
  'AUTHORITATIVE_SPATIAL',
  'AUTHORITATIVE_INSTRUMENT',
]);

const FORBIDDEN_RAW_SITE_KEYS = new Set([
  'address',
  'rawaddress',
  'streetaddress',
  'latitude',
  'longitude',
  'coordinates',
  'geometry',
  'parcelid',
  'lotdp',
  'lotanddp',
]);

const FREE: PathwayCommercialStage = 'FREE_PATHWAY_CHECK';
const PACK: PathwayCommercialStage = 'PLANNING_CONTROLS_PACK';
const SEE: PathwayCommercialStage = 'SUBMISSION_SEE';

function group(
  anyOf: readonly PathwaySiteEvidenceSourceKind[],
  minimumTrustLevel: PathwaySiteEvidenceTrustLevel,
): PathwayRequiredSourceGroup {
  return { anyOf, minimumTrustLevel };
}

export const BYRON_RU2_SHED_SITE_EVIDENCE_REQUIREMENTS = [
  {
    factKey: 'ADDRESS_CONFIRMED',
    label: 'Address resolution is confirmed without retaining the raw address',
    introducedAtStage: FREE,
    sourceGroups: [group(['ADDRESS_RESOLVER'], 'SITE_CONFIRMED')],
  },
  {
    factKey: 'ZONE_CONFIRMED',
    label: 'Authoritative spatial zoning confirms Byron RU2',
    introducedAtStage: FREE,
    sourceGroups: [group(['AUTHORITATIVE_SPATIAL'], 'SITE_CONFIRMED')],
  },
  {
    factKey: 'INSTRUMENT_CURRENT',
    label: 'The applicable LEP, DCP and State instrument evidence is current',
    introducedAtStage: FREE,
    sourceGroups: [
      group(['AUTHORITATIVE_INSTRUMENT'], 'EVIDENCE_VERIFIED'),
    ],
  },
  {
    factKey: 'AGRICULTURAL_ANCILLARY_USE',
    label: 'The shed is genuinely ancillary to an agricultural use',
    introducedAtStage: PACK,
    sourceGroups: [
      group(['USER_ATTESTATION'], 'SITE_CONFIRMED'),
      group(['SITE_PLAN', 'OPERATOR_REVIEW'], 'EVIDENCE_VERIFIED'),
    ],
  },
  {
    factKey: 'NON_HABITABLE_DESIGN',
    label: 'Plans demonstrate a non-habitable farm building',
    introducedAtStage: PACK,
    sourceGroups: [group(['SITE_PLAN'], 'EVIDENCE_VERIFIED')],
  },
  {
    factKey: 'PROPOSAL_FOOTPRINT_SQM',
    label: 'Proposed building footprint is evidenced',
    introducedAtStage: PACK,
    sourceGroups: [group(['SITE_PLAN'], 'EVIDENCE_VERIFIED')],
  },
  {
    factKey: 'PROPOSAL_HEIGHT_M',
    label: 'Proposed maximum building height is evidenced',
    introducedAtStage: PACK,
    sourceGroups: [group(['SITE_PLAN'], 'EVIDENCE_VERIFIED')],
  },
  {
    factKey: 'LANDHOLDING_AREA_SQM',
    label: 'Legal landholding area is evidenced',
    introducedAtStage: PACK,
    sourceGroups: [
      group(['TITLE_OR_SURVEY', 'AUTHORITATIVE_SPATIAL'], 'EVIDENCE_VERIFIED'),
    ],
  },
  {
    factKey: 'EXISTING_FARM_BUILDING_AREA_SQM',
    label: 'Existing aggregate farm-building footprint is evidenced',
    introducedAtStage: PACK,
    sourceGroups: [
      group(['SITE_PLAN'], 'EVIDENCE_VERIFIED'),
      group(['USER_ATTESTATION'], 'SITE_CONFIRMED'),
    ],
  },
  {
    factKey: 'ROAD_CLASSIFICATION',
    label: 'The relevant road boundary classification is authoritative',
    introducedAtStage: PACK,
    sourceGroups: [
      group(['AUTHORITATIVE_SPATIAL'], 'EVIDENCE_VERIFIED'),
    ],
  },
  {
    factKey: 'ROAD_BOUNDARY_SETBACK_M',
    label: 'Road-boundary setback is measured on a current site plan',
    introducedAtStage: PACK,
    sourceGroups: [group(['SITE_PLAN'], 'EVIDENCE_VERIFIED')],
  },
  {
    factKey: 'SIDE_REAR_SETBACK_M',
    label: 'Side and rear setbacks are measured on a current site plan',
    introducedAtStage: PACK,
    sourceGroups: [group(['SITE_PLAN'], 'EVIDENCE_VERIFIED')],
  },
  {
    factKey: 'WATERBODY_SETBACK_M',
    label: 'Waterbody relationship is spatially checked and plan-measured',
    introducedAtStage: PACK,
    sourceGroups: [
      group(['AUTHORITATIVE_SPATIAL'], 'EVIDENCE_VERIFIED'),
      group(['SITE_PLAN'], 'EVIDENCE_VERIFIED'),
    ],
  },
  {
    factKey: 'HERITAGE_STATUS',
    label: 'Heritage status is checked against an authoritative source',
    introducedAtStage: PACK,
    sourceGroups: [
      group(['AUTHORITATIVE_SPATIAL', 'AUTHORITATIVE_INSTRUMENT'], 'EVIDENCE_VERIFIED'),
    ],
  },
  {
    factKey: 'ENVIRONMENTAL_SENSITIVITY',
    label: 'Environmental sensitivity is checked authoritatively',
    introducedAtStage: PACK,
    sourceGroups: [
      group(['AUTHORITATIVE_SPATIAL', 'AUTHORITATIVE_INSTRUMENT'], 'EVIDENCE_VERIFIED'),
    ],
  },
  {
    factKey: 'MAPPED_CONSTRAINTS',
    label: 'Flood, bushfire, biodiversity and other mapped constraints are checked',
    introducedAtStage: PACK,
    sourceGroups: [
      group(['AUTHORITATIVE_SPATIAL'], 'EVIDENCE_VERIFIED'),
    ],
  },
  {
    factKey: 'RIDGELINE_VISUAL_IMPACT',
    label: 'Ridgeline and visual-impact evidence is checked',
    introducedAtStage: PACK,
    sourceGroups: [
      group(['AUTHORITATIVE_SPATIAL'], 'EVIDENCE_VERIFIED'),
      group(['SITE_PLAN'], 'EVIDENCE_VERIFIED'),
    ],
  },
  {
    factKey: 'EVIDENCE_UPLOAD_SET',
    label: 'The exact evidence-aware upload set is bound to the submission scope',
    introducedAtStage: SEE,
    sourceGroups: [group(['WORKSPACE_UPLOAD'], 'EVIDENCE_VERIFIED')],
  },
  {
    factKey: 'OPERATOR_REVIEW',
    label: 'A qualified operator approved the exact evidence and control scope',
    introducedAtStage: SEE,
    sourceGroups: [group(['OPERATOR_REVIEW'], 'OPERATOR_APPROVED')],
  },
] as const satisfies readonly PathwaySiteEvidenceRequirement[];

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function canonicalValue(value: PathwaySiteEvidenceValue): string {
  return JSON.stringify(value);
}

export function hashPathwaySiteEvidenceValue(
  value: PathwaySiteEvidenceValue,
): string {
  return sha256(canonicalValue(value));
}

function canonicalObservation(observation: PathwaySiteEvidenceObservation) {
  return {
    factKey: observation.factKey,
    value: observation.value,
    valueHash: observation.valueHash.toLowerCase(),
    sourceKind: observation.sourceKind,
    trustLevel: observation.trustLevel,
    sourceUrl: observation.sourceUrl || null,
    sourceReference: observation.sourceReference,
    retrievedAt: observation.retrievedAt,
    effectiveFrom: observation.effectiveFrom || null,
    effectiveTo: observation.effectiveTo || null,
    staleAt: observation.staleAt || null,
  };
}

export function computePathwaySiteEvidenceDigest(
  seed: PathwaySiteEvidenceManifestSeed,
): string {
  const observations = [...seed.observations]
    .map(canonicalObservation)
    .sort((a, b) =>
      [
        a.factKey,
        a.sourceKind,
        a.sourceReference,
        a.valueHash,
      ].join('|').localeCompare(
        [
          b.factKey,
          b.sourceKind,
          b.sourceReference,
          b.valueHash,
        ].join('|'),
      ),
    );

  return sha256(
    JSON.stringify({
      manifestVersion: seed.manifestVersion,
      lgaCode: seed.lgaCode,
      zoneCode: seed.zoneCode,
      proposalType: seed.proposalType,
      assessedAt: seed.assessedAt,
      observations,
    }),
  );
}

export function createPathwaySiteEvidenceManifest(
  seed: PathwaySiteEvidenceManifestSeed,
): PathwaySiteEvidenceManifest {
  return {
    ...seed,
    siteEvidenceDigest: computePathwaySiteEvidenceDigest(seed),
  };
}

function assertNoRawSiteKeys(value: unknown, path = 'manifest'): void {
  if (!value || typeof value !== 'object') return;

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoRawSiteKeys(item, path + '[' + index + ']'),
    );
    return;
  }

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (FORBIDDEN_RAW_SITE_KEYS.has(normalized)) {
      throw new Error(path + ' contains forbidden raw site field ' + key);
    }
    assertNoRawSiteKeys(child, path + '.' + key);
  }
}

function parseDate(value: string, label: string): Date {
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime())) {
    throw new Error(label + ' must be a valid ISO date');
  }
  return parsed;
}

function validateObservation(
  observation: PathwaySiteEvidenceObservation,
  assessedAt: Date,
): void {
  if (!PATHWAY_SITE_FACT_KEYS.includes(observation.factKey)) {
    throw new Error('Unknown site evidence fact key');
  }
  if (!PATHWAY_SITE_EVIDENCE_SOURCE_KINDS.includes(observation.sourceKind)) {
    throw new Error('Unknown site evidence source kind');
  }
  if (!PATHWAY_SITE_EVIDENCE_TRUST_LEVELS.includes(observation.trustLevel)) {
    throw new Error('Unknown site evidence trust level');
  }
  if (!observation.sourceReference.trim()) {
    throw new Error(observation.factKey + ' requires a source reference');
  }
  if (!SHA256_HEX.test(observation.valueHash)) {
    throw new Error(observation.factKey + ' requires a SHA-256 value hash');
  }
  if (
    observation.valueHash.toLowerCase() !==
    hashPathwaySiteEvidenceValue(observation.value)
  ) {
    throw new Error(observation.factKey + ' value hash does not match its value');
  }

  const maximumTrust = MAXIMUM_SOURCE_TRUST[observation.sourceKind];
  if (TRUST_RANK[observation.trustLevel] > TRUST_RANK[maximumTrust]) {
    throw new Error(
      observation.sourceKind + ' cannot assert ' + observation.trustLevel,
    );
  }

  if (HTTPS_REQUIRED_SOURCES.has(observation.sourceKind)) {
    if (!observation.sourceUrl || !HTTPS_URL.test(observation.sourceUrl)) {
      throw new Error(observation.sourceKind + ' requires an HTTPS source URL');
    }
  } else if (observation.sourceUrl && !HTTPS_URL.test(observation.sourceUrl)) {
    throw new Error(observation.sourceKind + ' source URL must use HTTPS');
  }

  const retrievedAt = parseDate(
    observation.retrievedAt,
    observation.factKey + '.retrievedAt',
  );
  if (retrievedAt.getTime() > assessedAt.getTime()) {
    throw new Error(observation.factKey + ' was retrieved after assessment');
  }

  if (observation.effectiveFrom) {
    parseDate(observation.effectiveFrom, observation.factKey + '.effectiveFrom');
  }
  if (observation.effectiveTo) {
    parseDate(observation.effectiveTo, observation.factKey + '.effectiveTo');
  }
  if (
    observation.effectiveFrom &&
    observation.effectiveTo &&
    new Date(observation.effectiveFrom).getTime() >
      new Date(observation.effectiveTo).getTime()
  ) {
    throw new Error(observation.factKey + ' has an invalid effective period');
  }
  if (observation.staleAt) {
    parseDate(observation.staleAt, observation.factKey + '.staleAt');
  }
}

function isCurrent(
  observation: PathwaySiteEvidenceObservation,
  assessedAt: Date,
): boolean {
  const time = assessedAt.getTime();
  if (
    observation.effectiveFrom &&
    new Date(observation.effectiveFrom).getTime() > time
  ) {
    return false;
  }
  if (
    observation.effectiveTo &&
    new Date(observation.effectiveTo).getTime() < time
  ) {
    return false;
  }
  if (
    observation.staleAt &&
    new Date(observation.staleAt).getTime() <= time
  ) {
    return false;
  }
  return true;
}

function requirementResult(
  requirement: PathwaySiteEvidenceRequirement,
  observations: PathwaySiteEvidenceObservation[],
  assessedAt: Date,
): PathwaySiteEvidenceRequirementResult {
  const candidates = observations.filter(
    (item) => item.factKey === requirement.factKey,
  );

  if (!candidates.length) {
    return {
      factKey: requirement.factKey,
      label: requirement.label,
      introducedAtStage: requirement.introducedAtStage,
      status: 'MISSING',
      missingSourceGroups: requirement.sourceGroups.map((item) => [...item.anyOf]),
      observationCount: 0,
    };
  }

  const acceptedSourceKinds = new Set(
    requirement.sourceGroups.flatMap((item) => [...item.anyOf]),
  );
  const accepted = candidates.filter((item) =>
    acceptedSourceKinds.has(item.sourceKind),
  );

  if (!accepted.length) {
    return {
      factKey: requirement.factKey,
      label: requirement.label,
      introducedAtStage: requirement.introducedAtStage,
      status: 'WRONG_SOURCE',
      missingSourceGroups: requirement.sourceGroups.map((item) => [...item.anyOf]),
      observationCount: candidates.length,
    };
  }

  const current = accepted.filter((item) => isCurrent(item, assessedAt));
  if (!current.length) {
    return {
      factKey: requirement.factKey,
      label: requirement.label,
      introducedAtStage: requirement.introducedAtStage,
      status: 'STALE',
      missingSourceGroups: requirement.sourceGroups.map((item) => [...item.anyOf]),
      observationCount: candidates.length,
    };
  }

  const missingSourceGroups: PathwaySiteEvidenceSourceKind[][] = [];
  let trustFailure = false;
  const qualifying: PathwaySiteEvidenceObservation[] = [];

  for (const sourceGroup of requirement.sourceGroups) {
    const groupCurrent = current.filter((item) =>
      sourceGroup.anyOf.includes(item.sourceKind),
    );
    if (!groupCurrent.length) {
      missingSourceGroups.push([...sourceGroup.anyOf]);
      continue;
    }

    const trusted = groupCurrent.filter(
      (item) =>
        TRUST_RANK[item.trustLevel] >=
        TRUST_RANK[sourceGroup.minimumTrustLevel],
    );
    if (!trusted.length) {
      trustFailure = true;
      missingSourceGroups.push([...sourceGroup.anyOf]);
      continue;
    }
    qualifying.push(...trusted);
  }

  if (missingSourceGroups.length) {
    return {
      factKey: requirement.factKey,
      label: requirement.label,
      introducedAtStage: requirement.introducedAtStage,
      status: trustFailure ? 'INSUFFICIENT_TRUST' : 'WRONG_SOURCE',
      missingSourceGroups,
      observationCount: candidates.length,
    };
  }

  const distinctValues = new Set(
    qualifying.map((item) => canonicalValue(item.value)),
  );
  if (distinctValues.size > 1) {
    return {
      factKey: requirement.factKey,
      label: requirement.label,
      introducedAtStage: requirement.introducedAtStage,
      status: 'CONFLICT',
      missingSourceGroups: [],
      observationCount: candidates.length,
    };
  }

  return {
    factKey: requirement.factKey,
    label: requirement.label,
    introducedAtStage: requirement.introducedAtStage,
    status: 'SATISFIED',
    missingSourceGroups: [],
    observationCount: candidates.length,
  };
}

const STAGE_RANK: Record<PathwayCommercialStage, number> = {
  FREE_PATHWAY_CHECK: 0,
  PLANNING_CONTROLS_PACK: 1,
  SUBMISSION_SEE: 2,
};

export function evaluatePathwaySiteEvidence(
  manifest: PathwaySiteEvidenceManifest,
): PathwaySiteEvidenceEvaluation {
  assertNoRawSiteKeys(manifest);

  if (manifest.manifestVersion !== PATHWAY_SITE_EVIDENCE_MANIFEST_VERSION) {
    throw new Error('Unsupported site evidence manifest version');
  }
  if (
    manifest.lgaCode !== 'BYRON' ||
    manifest.zoneCode !== 'RU2' ||
    manifest.proposalType !== 'SHED_OUTBUILDING'
  ) {
    throw new Error('Site evidence manifest is outside the Item 74H v1 scope');
  }
  if (!SHA256_HEX.test(manifest.siteEvidenceDigest)) {
    throw new Error('Site evidence digest must be SHA-256');
  }

  const assessedAt = parseDate(manifest.assessedAt, 'assessedAt');
  const replayKeys = new Set<string>();
  for (const observation of manifest.observations) {
    validateObservation(observation, assessedAt);
    const replayKey = [
      observation.factKey,
      observation.sourceKind,
      observation.sourceReference,
      observation.valueHash.toLowerCase(),
    ].join('|');
    if (replayKeys.has(replayKey)) {
      throw new Error('Duplicate site evidence observation');
    }
    replayKeys.add(replayKey);
  }

  const computedDigest = computePathwaySiteEvidenceDigest(manifest);
  if (computedDigest !== manifest.siteEvidenceDigest.toLowerCase()) {
    throw new Error('Site evidence digest does not match the manifest');
  }

  const requirements = BYRON_RU2_SHED_SITE_EVIDENCE_REQUIREMENTS.map(
    (requirement) =>
      requirementResult(requirement, manifest.observations, assessedAt),
  );

  const stages = Object.fromEntries(
    PATHWAY_COMMERCIAL_STAGES.map((stage) => {
      const blockers = requirements.filter(
        (item) =>
          STAGE_RANK[item.introducedAtStage] <= STAGE_RANK[stage] &&
          item.status !== 'SATISFIED',
      );
      return [
        stage,
        {
          stage,
          eligible: blockers.length === 0,
          blockers,
        },
      ];
    }),
  ) as Record<PathwayCommercialStage, PathwayStageEligibility>;

  const highestEligibleStage = stages.SUBMISSION_SEE.eligible
    ? SEE
    : stages.PLANNING_CONTROLS_PACK.eligible
      ? PACK
      : stages.FREE_PATHWAY_CHECK.eligible
        ? FREE
        : null;

  const evidenceBoundary = !stages.FREE_PATHWAY_CHECK.eligible
    ? 'BASE_SITE_UNCONFIRMED'
    : !stages.PLANNING_CONTROLS_PACK.eligible
      ? 'MORE_EVIDENCE_REQUIRED'
      : !stages.SUBMISSION_SEE.eligible
        ? 'EVIDENCE_VERIFIED'
        : 'OPERATOR_APPROVED';

  return {
    manifestVersion: manifest.manifestVersion,
    siteEvidenceDigest: manifest.siteEvidenceDigest,
    requirements,
    stages,
    highestEligibleStage,
    evidenceBoundary,
    readyForDeterministicControlEvaluation:
      stages.PLANNING_CONTROLS_PACK.eligible,
  };
}
