import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BYRON_RU2_SHED_SITE_EVIDENCE_REQUIREMENTS,
  createPathwaySiteEvidenceManifest,
  evaluatePathwaySiteEvidence,
  hashPathwaySiteEvidenceValue,
  type PathwayCommercialStage,
  type PathwaySiteEvidenceManifest,
  type PathwaySiteEvidenceObservation,
  type PathwaySiteEvidenceSourceKind,
  type PathwaySiteFactKey,
} from './pathway-site-evidence';

const ASSESSED_AT = '2026-08-25T00:00:00.000Z';
const RETRIEVED_AT = '2026-08-24T00:00:00.000Z';

const STAGE_RANK: Record<PathwayCommercialStage, number> = {
  FREE_PATHWAY_CHECK: 0,
  PLANNING_CONTROLS_PACK: 1,
  SUBMISSION_SEE: 2,
};

function trustForSource(
  sourceKind: PathwaySiteEvidenceSourceKind,
): PathwaySiteEvidenceObservation['trustLevel'] {
  if (
    sourceKind === 'ADDRESS_RESOLVER' ||
    sourceKind === 'USER_ATTESTATION'
  ) {
    return 'SITE_CONFIRMED';
  }
  if (sourceKind === 'OPERATOR_REVIEW') {
    return 'OPERATOR_APPROVED';
  }
  return 'EVIDENCE_VERIFIED';
}

function valueForFact(
  factKey: PathwaySiteFactKey,
): PathwaySiteEvidenceObservation['value'] {
  switch (factKey) {
    case 'ADDRESS_CONFIRMED':
      return 'CONFIRMED_HASH_ONLY';
    case 'ZONE_CONFIRMED':
      return 'RU2';
    case 'INSTRUMENT_CURRENT':
      return 'CURRENT';
    case 'PROPOSAL_FOOTPRINT_SQM':
      return 120;
    case 'PROPOSAL_HEIGHT_M':
      return 6;
    case 'LANDHOLDING_AREA_SQM':
      return 120000;
    case 'EXISTING_FARM_BUILDING_AREA_SQM':
      return 80;
    case 'ROAD_CLASSIFICATION':
      return 'OTHER_ROAD';
    case 'ROAD_BOUNDARY_SETBACK_M':
      return 30;
    case 'SIDE_REAR_SETBACK_M':
      return 20;
    case 'WATERBODY_SETBACK_M':
      return 75;
    case 'HERITAGE_STATUS':
    case 'ENVIRONMENTAL_SENSITIVITY':
    case 'MAPPED_CONSTRAINTS':
    case 'RIDGELINE_VISUAL_IMPACT':
      return 'CLEAR';
    case 'EVIDENCE_UPLOAD_SET':
      return ['sha256:' + 'a'.repeat(64)];
    case 'OPERATOR_REVIEW':
      return 'APPROVED';
    default:
      return true;
  }
}

function observation(
  factKey: PathwaySiteFactKey,
  sourceKind: PathwaySiteEvidenceSourceKind,
  sourceReferenceSuffix: string,
  value = valueForFact(factKey),
  overrides: Partial<PathwaySiteEvidenceObservation> = {},
): PathwaySiteEvidenceObservation {
  const needsUrl = [
    'ADDRESS_RESOLVER',
    'AUTHORITATIVE_SPATIAL',
    'AUTHORITATIVE_INSTRUMENT',
  ].includes(sourceKind);

  return {
    factKey,
    value,
    valueHash: hashPathwaySiteEvidenceValue(value),
    sourceKind,
    trustLevel: trustForSource(sourceKind),
    sourceUrl: needsUrl
      ? 'https://evidence.example.test/' +
        factKey.toLowerCase().replaceAll('_', '-')
      : undefined,
    sourceReference:
      'synthetic-' +
      factKey.toLowerCase() +
      '-' +
      sourceKind.toLowerCase() +
      '-' +
      sourceReferenceSuffix,
    retrievedAt: RETRIEVED_AT,
    effectiveFrom: '2026-01-01T00:00:00.000Z',
    staleAt: '2027-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function observationsThrough(
  stage: PathwayCommercialStage,
): PathwaySiteEvidenceObservation[] {
  return BYRON_RU2_SHED_SITE_EVIDENCE_REQUIREMENTS.flatMap((requirement) => {
    if (
      STAGE_RANK[requirement.introducedAtStage] > STAGE_RANK[stage]
    ) {
      return [];
    }

    const value = valueForFact(requirement.factKey);
    return requirement.sourceGroups.map((sourceGroup, index) =>
      observation(
        requirement.factKey,
        sourceGroup.anyOf[0],
        String(index + 1),
        value,
      ),
    );
  });
}

function manifest(
  observations: PathwaySiteEvidenceObservation[],
): PathwaySiteEvidenceManifest {
  return createPathwaySiteEvidenceManifest({
    manifestVersion: 'byron-ru2-shed-site-evidence.v1',
    lgaCode: 'BYRON',
    zoneCode: 'RU2',
    proposalType: 'SHED_OUTBUILDING',
    assessedAt: ASSESSED_AT,
    observations,
  });
}

test('keeps the free Pathway Check eligible while paid stages remain blocked', () => {
  const result = evaluatePathwaySiteEvidence(
    manifest(observationsThrough('FREE_PATHWAY_CHECK')),
  );

  assert.equal(result.stages.FREE_PATHWAY_CHECK.eligible, true);
  assert.equal(result.stages.PLANNING_CONTROLS_PACK.eligible, false);
  assert.equal(result.stages.SUBMISSION_SEE.eligible, false);
  assert.equal(result.highestEligibleStage, 'FREE_PATHWAY_CHECK');
  assert.equal(result.evidenceBoundary, 'MORE_EVIDENCE_REQUIRED');
  assert.equal(result.readyForDeterministicControlEvaluation, false);
});

test('makes the A$49 pack eligible only after every evidence group is satisfied', () => {
  const result = evaluatePathwaySiteEvidence(
    manifest(observationsThrough('PLANNING_CONTROLS_PACK')),
  );

  assert.equal(result.stages.FREE_PATHWAY_CHECK.eligible, true);
  assert.equal(result.stages.PLANNING_CONTROLS_PACK.eligible, true);
  assert.equal(result.stages.SUBMISSION_SEE.eligible, false);
  assert.equal(result.highestEligibleStage, 'PLANNING_CONTROLS_PACK');
  assert.equal(result.evidenceBoundary, 'EVIDENCE_VERIFIED');
  assert.equal(result.readyForDeterministicControlEvaluation, true);
  assert.deepEqual(
    result.stages.SUBMISSION_SEE.blockers.map((item) => item.factKey),
    ['EVIDENCE_UPLOAD_SET', 'OPERATOR_REVIEW'],
  );
});

test('requires evidence-aware uploads and operator approval for the A$749 SEE', () => {
  const result = evaluatePathwaySiteEvidence(
    manifest(observationsThrough('SUBMISSION_SEE')),
  );

  assert.equal(result.stages.FREE_PATHWAY_CHECK.eligible, true);
  assert.equal(result.stages.PLANNING_CONTROLS_PACK.eligible, true);
  assert.equal(result.stages.SUBMISSION_SEE.eligible, true);
  assert.equal(result.highestEligibleStage, 'SUBMISSION_SEE');
  assert.equal(result.evidenceBoundary, 'OPERATOR_APPROVED');
  assert.equal(
    result.requirements.every((item) => item.status === 'SATISFIED'),
    true,
  );
});

test('does not accept a user assertion in place of title or cadastral area evidence', () => {
  const observations = observationsThrough('PLANNING_CONTROLS_PACK').filter(
    (item) => item.factKey !== 'LANDHOLDING_AREA_SQM',
  );
  observations.push(
    observation(
      'LANDHOLDING_AREA_SQM',
      'USER_ATTESTATION',
      'unsupported',
      120000,
    ),
  );

  const result = evaluatePathwaySiteEvidence(manifest(observations));
  const area = result.requirements.find(
    (item) => item.factKey === 'LANDHOLDING_AREA_SQM',
  );

  assert.equal(area?.status, 'WRONG_SOURCE');
  assert.equal(result.stages.PLANNING_CONTROLS_PACK.eligible, false);
});

test('fails closed when the only authoritative observation is stale', () => {
  const observations = observationsThrough('FREE_PATHWAY_CHECK').map((item) =>
    item.factKey === 'ZONE_CONFIRMED'
      ? { ...item, staleAt: '2026-08-24T12:00:00.000Z' }
      : item,
  );

  const result = evaluatePathwaySiteEvidence(manifest(observations));
  const zone = result.requirements.find(
    (item) => item.factKey === 'ZONE_CONFIRMED',
  );

  assert.equal(zone?.status, 'STALE');
  assert.equal(result.stages.FREE_PATHWAY_CHECK.eligible, false);
  assert.equal(result.evidenceBoundary, 'BASE_SITE_UNCONFIRMED');
});

test('surfaces conflicting current observations instead of choosing one', () => {
  const observations = observationsThrough('FREE_PATHWAY_CHECK');
  observations.push(
    observation(
      'ZONE_CONFIRMED',
      'AUTHORITATIVE_SPATIAL',
      'conflict',
      'RU5',
    ),
  );

  const result = evaluatePathwaySiteEvidence(manifest(observations));
  const zone = result.requirements.find(
    (item) => item.factKey === 'ZONE_CONFIRMED',
  );

  assert.equal(zone?.status, 'CONFLICT');
  assert.equal(result.stages.FREE_PATHWAY_CHECK.eligible, false);
});

test('rejects trust laundering by a user attestation', () => {
  const observations = observationsThrough('FREE_PATHWAY_CHECK');
  const forged = observation(
    'AGRICULTURAL_ANCILLARY_USE',
    'USER_ATTESTATION',
    'forged',
    true,
    { trustLevel: 'EVIDENCE_VERIFIED' },
  );

  assert.throws(
    () => evaluatePathwaySiteEvidence(manifest([...observations, forged])),
    /USER_ATTESTATION cannot assert EVIDENCE_VERIFIED/,
  );
});

test('rejects manifest digest tampering', () => {
  const created = manifest(observationsThrough('FREE_PATHWAY_CHECK'));
  const tampered = {
    ...created,
    observations: created.observations.map((item, index) =>
      index === 0
        ? { ...item, sourceReference: item.sourceReference + '-tampered' }
        : item,
    ),
  };

  assert.throws(
    () => evaluatePathwaySiteEvidence(tampered),
    /digest does not match/,
  );
});

test('rejects duplicate evidence observations', () => {
  const observations = observationsThrough('FREE_PATHWAY_CHECK');
  observations.push({ ...observations[0] });

  assert.throws(
    () => evaluatePathwaySiteEvidence(manifest(observations)),
    /Duplicate site evidence observation/,
  );
});

test('rejects accidental raw site identifiers anywhere in the manifest', () => {
  const created = manifest(observationsThrough('FREE_PATHWAY_CHECK'));
  const unsafe = {
    ...created,
    rawAddress: 'not permitted',
  } as PathwaySiteEvidenceManifest;

  assert.throws(
    () => evaluatePathwaySiteEvidence(unsafe),
    /forbidden raw site field rawAddress/,
  );
});
