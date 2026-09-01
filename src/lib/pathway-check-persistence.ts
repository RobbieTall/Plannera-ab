import { randomUUID } from 'node:crypto';

import { Prisma, PrismaClient } from '@prisma/client';

import type { PathwayCommercialBindingEvaluation } from './pathway-commercial-binding';
import { evaluatePaidArtefactBindingPolicy } from './pathway-paid-artefact-policy';
import {
  attachPersistedPathwayProgressiveCommercialBinding,
  evaluatePathwayProgressiveBindingPersistence,
  evaluateWorkingPathwayArtefactPolicy,
  progressiveBindingReplayMatches,
  readPersistedPathwayProgressiveCommercialBinding,
  type PathwayProgressiveCommercialBinding,
} from './pathway-progressive-commercial-binding';
import {
  attachPersistedPathwayCommercialBinding,
  commercialBindingReplayMatches,
  evaluatePathwayCommercialBindingPersistence,
  readPersistedPathwayCommercialBinding,
} from './pathway-persisted-commercial-binding';

export const PATHWAY_DECISIONS = [
  'STOP',
  'PROCEED',
  'MERIT_ASSESSMENT',
  'MORE_EVIDENCE_REQUIRED',
] as const;

export type PathwayDecision = (typeof PATHWAY_DECISIONS)[number];
export type PathwayTrustLevel =
  | 'GENERAL_GUIDANCE'
  | 'SITE_CONFIRMED'
  | 'EVIDENCE_VERIFIED'
  | 'OPERATOR_APPROVED'
  | 'SUBMISSION_READY';
export type PathwayCommercialStage =
  | 'FREE_PATHWAY_CHECK'
  | 'PLANNING_CONTROLS_PACK_WORKING'
  | 'SUBMISSION_SEE_WORKING'
  | 'PLANNING_CONTROLS_PACK'
  | 'SUBMISSION_SEE';

export class PathwayPersistenceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'PathwayPersistenceError';
  }
}

type JsonValue = Prisma.InputJsonValue;

export type SpatialProvenanceInput = {
  authority: string;
  datasetName: string;
  sourceUrl: string;
  sourceVersion?: string;
  retrievedAt: Date;
  effectiveAt?: Date;
  contentHash: string;
  matchMethod: string;
  parcelId?: string;
  lot?: string;
  planNumber?: string;
  lgaCode: string;
  zoneCode?: string;
  latitude?: number;
  longitude?: number;
  payload: JsonValue;
  trustLevel: string;
  staleAt?: Date;
};

export type PathwayDefinitionInput = {
  versionKey: string;
  lgaCode: string;
  zoneCode: string;
  proposalType: string;
  status: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
  graphHash: string;
  graph: JsonValue;
};

export type PathwayEvidenceInput = {
  evidenceKey: string;
  evidenceKind: 'LEP' | 'DCP' | 'SPATIAL' | 'UPLOAD' | string;
  authority: string;
  sourceUrl: string;
  sourceVersion?: string;
  sourceReference: string;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  retrievedAt: Date;
  contentHash: string;
  citation: JsonValue;
  snapshot: JsonValue;
  isCurrentAtAssessment: boolean;
  staleAt?: Date;
  clauseId?: string;
  dcpClauseId?: string;
  workspaceUploadId?: string;
};

export type PathwayControlInput = {
  controlKey: string;
  evidenceKey: string;
  label: string;
  applicabilityHash: string;
  operator?: string;
  numericValue?: Prisma.Decimal.Value;
  lowerBound?: Prisma.Decimal.Value;
  upperBound?: Prisma.Decimal.Value;
  textValue?: string;
  unit?: string;
  landAreaMinSqm?: Prisma.Decimal.Value;
  landAreaMaxSqm?: Prisma.Decimal.Value;
  applicability: JsonValue;
  sourceReference: string;
  contentHash: string;
  isCurrentAtAssessment: boolean;
  staleAt?: Date;
};

export type PathwayGateInput = {
  gateKey: string;
  sequence: number;
  question: string;
  outcome: PathwayDecision;
  reason: string;
  condition: JsonValue;
  evidenceRefs: string[];
  controlRefs: string[];
};

export type PersistPathwayAssessmentInput = {
  environment: 'PREVIEW';
  projectId: string;
  siteContextId: string;
  assessmentVersion: string;
  idempotencyKey: string;
  scopeKey: string;
  inputHash: string;
  evidenceDigest: string;
  commercialBinding?: PathwayCommercialBindingEvaluation;
  progressiveBinding?: PathwayProgressiveCommercialBinding;
  decision: PathwayDecision;
  trustLevel: PathwayTrustLevel;
  input: JsonValue;
  result: JsonValue;
  assessedAt: Date;
  staleAt?: Date;
  spatial: SpatialProvenanceInput;
  definition: PathwayDefinitionInput;
  evidence: PathwayEvidenceInput[];
  controls: PathwayControlInput[];
  gates: PathwayGateInput[];
};

const assessmentInclude = Prisma.validator<Prisma.PathwayAssessmentInclude>()({
  spatialProvenance: true,
  pathwayDefinition: true,
  evidenceSnapshots: true,
  controlSnapshots: true,
  gateSnapshots: true,
  artefactBindings: true,
});

export type PersistedPathwayAssessment =
  Prisma.PathwayAssessmentGetPayload<{ include: typeof assessmentInclude }>;

function fail(code: string, message: string): never {
  throw new PathwayPersistenceError(code, message);
}

function hasFixtureMarker(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasFixtureMarker);
  if (!value || typeof value !== 'object') return false;

  const record = value as Record<string, unknown>;
  if (
    record.fixture === true ||
    record.synthetic === true ||
    record.authoritative === false
  ) {
    return true;
  }

  return Object.values(record).some(hasFixtureMarker);
}

function hasSyntheticSourceLabel(value: unknown): boolean {
  return typeof value === 'string' && /(?:synthetic|fixture)/i.test(value);
}

function assertNonEmpty(value: string, field: string): void {
  if (!value.trim()) fail('INVALID_INPUT', field + ' must not be empty');
}

function assertHttps(value: string, field: string): void {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    fail('INVALID_SOURCE_URL', field + ' must be a valid URL');
  }
  if (url.protocol !== 'https:') {
    fail('INVALID_SOURCE_URL', field + ' must use HTTPS');
  }
}

function assertUnique(values: string[], field: string): void {
  if (new Set(values).size !== values.length) {
    fail('DUPLICATE_SNAPSHOT_KEY', field + ' values must be unique');
  }
}

function canonicalReplayMatches(
  existing: PersistedPathwayAssessment,
  input: PersistPathwayAssessmentInput,
): boolean {
  return (
    existing.projectId === input.projectId &&
    existing.siteContextId === input.siteContextId &&
    existing.scopeKey === input.scopeKey &&
    existing.inputHash === input.inputHash &&
    existing.evidenceDigest === input.evidenceDigest &&
    commercialBindingReplayMatches(
      existing.result,
      input.commercialBinding || null,
    ) &&
    progressiveBindingReplayMatches(
      existing.result,
      input.progressiveBinding || null,
    ) &&
    existing.decision === input.decision &&
    existing.trustLevel === input.trustLevel &&
    existing.assessmentVersion === input.assessmentVersion &&
    existing.pathwayDefinition.versionKey === input.definition.versionKey &&
    existing.pathwayDefinition.graphHash === input.definition.graphHash &&
    existing.spatialProvenance.contentHash === input.spatial.contentHash
  );
}

export function validatePathwayPersistenceInput(
  input: PersistPathwayAssessmentInput,
): void {
  if (input.environment !== 'PREVIEW') {
    fail('PREVIEW_ONLY', 'Item 74H persistence is restricted to Preview');
  }

  [
    ['projectId', input.projectId],
    ['siteContextId', input.siteContextId],
    ['assessmentVersion', input.assessmentVersion],
    ['idempotencyKey', input.idempotencyKey],
    ['scopeKey', input.scopeKey],
    ['inputHash', input.inputHash],
    ['evidenceDigest', input.evidenceDigest],
    ['definition.versionKey', input.definition.versionKey],
    ['definition.graphHash', input.definition.graphHash],
    ['spatial.contentHash', input.spatial.contentHash],
  ].forEach(([field, value]) => assertNonEmpty(value, field));

  const commercialBindingPersistence =
    evaluatePathwayCommercialBindingPersistence({
      result: input.result,
      binding: input.commercialBinding || null,
      scopeKey: input.scopeKey,
      evidenceDigest: input.evidenceDigest,
      decision: input.decision,
    });
  if (!commercialBindingPersistence.allowed) {
    fail(
      'INVALID_COMMERCIAL_BINDING',
      'Commercial binding is invalid: ' +
        commercialBindingPersistence.blockers.join(', '),
    );
  }
  if (input.commercialBinding && input.progressiveBinding) {
    fail(
      'CONFLICTING_COMMERCIAL_BINDINGS',
      'Final and progressive commercial bindings cannot be persisted together',
    );
  }
  const progressiveBindingPersistence =
    evaluatePathwayProgressiveBindingPersistence({
      result: input.result,
      binding: input.progressiveBinding || null,
      scopeKey: input.scopeKey,
      evidenceDigest: input.evidenceDigest,
      decision: input.decision,
    });
  if (!progressiveBindingPersistence.allowed) {
    fail(
      'INVALID_PROGRESSIVE_BINDING',
      'Progressive binding is invalid: ' +
        progressiveBindingPersistence.blockers.join(', '),
    );
  }

  if (input.definition.lgaCode !== input.spatial.lgaCode) {
    fail('LGA_MISMATCH', 'Definition and spatial LGA must match');
  }
  if (input.definition.zoneCode !== input.spatial.zoneCode) {
    fail('ZONE_MISMATCH', 'Definition and spatial zone must match');
  }

  assertHttps(input.spatial.sourceUrl, 'spatial.sourceUrl');
  input.evidence.forEach((item) =>
    assertHttps(item.sourceUrl, 'evidence.' + item.evidenceKey + '.sourceUrl'),
  );

  assertUnique(
    input.evidence.map((item) => item.evidenceKey),
    'evidenceKey',
  );
  assertUnique(
    input.controls.map(
      (item) => item.controlKey + ':' + item.applicabilityHash,
    ),
    'controlKey/applicabilityHash',
  );
  assertUnique(
    input.gates.map((item) => item.gateKey),
    'gateKey',
  );
  assertUnique(
    input.gates.map((item) => String(item.sequence)),
    'gate sequence',
  );

  const evidenceKeys = new Set(input.evidence.map((item) => item.evidenceKey));
  const controlKeys = new Set(input.controls.map((item) => item.controlKey));
  input.controls.forEach((control) => {
    if (!evidenceKeys.has(control.evidenceKey)) {
      fail(
        'MISSING_CONTROL_EVIDENCE',
        'Control ' + control.controlKey + ' references missing evidence',
      );
    }
  });
  input.gates.forEach((gate) => {
    if (!PATHWAY_DECISIONS.includes(gate.outcome)) {
      fail('INVALID_GATE_OUTCOME', 'Gate outcome is not supported');
    }
    if (gate.sequence < 0 || !Number.isInteger(gate.sequence)) {
      fail('INVALID_GATE_SEQUENCE', 'Gate sequence must be a non-negative integer');
    }
    gate.evidenceRefs.forEach((ref) => {
      if (!evidenceKeys.has(ref)) {
        fail('MISSING_GATE_EVIDENCE', 'Gate ' + gate.gateKey + ' has missing evidence');
      }
    });
    gate.controlRefs.forEach((ref) => {
      if (!controlKeys.has(ref)) {
        fail('MISSING_GATE_CONTROL', 'Gate ' + gate.gateKey + ' has missing control');
      }
    });
  });

  const outcomes = new Set(input.gates.map((gate) => gate.outcome));
  if (input.decision === 'STOP' && !outcomes.has('STOP')) {
    fail('DECISION_GATE_MISMATCH', 'STOP requires a STOP gate');
  }
  if (
    input.decision === 'MORE_EVIDENCE_REQUIRED' &&
    !outcomes.has('MORE_EVIDENCE_REQUIRED')
  ) {
    fail(
      'DECISION_GATE_MISMATCH',
      'MORE_EVIDENCE_REQUIRED requires an unresolved gate',
    );
  }
  if (
    input.decision === 'MERIT_ASSESSMENT' &&
    !outcomes.has('MERIT_ASSESSMENT')
  ) {
    fail('DECISION_GATE_MISMATCH', 'MERIT_ASSESSMENT requires a merit gate');
  }

  const deterministicPaidDecision =
    input.decision === 'PROCEED' ||
    input.decision === 'MERIT_ASSESSMENT';
  if (deterministicPaidDecision) {
    const requiredKinds = ['LEP', 'DCP', 'SPATIAL'];
    const kinds = new Set(input.evidence.map((item) => item.evidenceKind));
    const paidTrust = [
      'EVIDENCE_VERIFIED',
      'OPERATOR_APPROVED',
      'SUBMISSION_READY',
    ].includes(input.trustLevel);

    if (input.definition.status !== 'ACTIVE') {
      fail(
        'INACTIVE_DEFINITION',
        'A deterministic paid decision requires an active definition',
      );
    }
    if (!paidTrust) {
      fail(
        'INSUFFICIENT_TRUST',
        'A deterministic paid decision requires evidence-confirmed trust',
      );
    }
    if (
      input.spatial.trustLevel !== 'EVIDENCE_VERIFIED' &&
      input.spatial.trustLevel !== 'OPERATOR_APPROVED'
    ) {
      fail(
        'UNVERIFIED_SPATIAL',
        'A deterministic paid decision requires verified spatial evidence',
      );
    }
    if (input.staleAt || input.spatial.staleAt) {
      fail(
        'STALE_EVIDENCE',
        'A deterministic paid decision cannot use stale assessment or spatial evidence',
      );
    }
    if (!requiredKinds.every((kind) => kinds.has(kind))) {
      fail(
        'INCOMPLETE_EVIDENCE',
        'A deterministic paid decision requires LEP, DCP and SPATIAL evidence',
      );
    }
    if (
      input.evidence.some(
        (item) => !item.isCurrentAtAssessment || Boolean(item.staleAt),
      )
    ) {
      fail(
        'STALE_EVIDENCE',
        'A deterministic paid decision requires current evidence snapshots',
      );
    }
    if (
      input.controls.length === 0 ||
      input.controls.some(
        (item) => !item.isCurrentAtAssessment || Boolean(item.staleAt),
      )
    ) {
      fail(
        'STALE_CONTROL',
        'A deterministic paid decision requires at least one current control',
      );
    }
    if (input.gates.length === 0) {
      fail('UNRESOLVED_GATE', 'A deterministic decision requires gates');
    }
    if (
      input.decision === 'PROCEED' &&
      input.gates.some((gate) => gate.outcome !== 'PROCEED')
    ) {
      fail(
        'UNRESOLVED_GATE',
        'Every gate must PROCEED for an overall PROCEED',
      );
    }
    if (
      input.decision === 'MERIT_ASSESSMENT' &&
      input.gates.some(
        (gate) =>
          gate.outcome !== 'PROCEED' &&
          gate.outcome !== 'MERIT_ASSESSMENT',
      )
    ) {
      fail(
        'UNRESOLVED_GATE',
        'A merit assessment cannot contain STOP or unresolved gates',
      );
    }
  }}

async function loadAssessment(
  prisma: PrismaClient,
  id: string,
): Promise<PersistedPathwayAssessment> {
  const assessment = await prisma.pathwayAssessment.findUnique({
    where: { id },
    include: assessmentInclude,
  });
  if (!assessment) fail('ASSESSMENT_NOT_FOUND', 'Assessment was not found');
  return assessment;
}

export async function persistPathwayAssessment(
  prisma: PrismaClient,
  input: PersistPathwayAssessmentInput,
): Promise<{ assessment: PersistedPathwayAssessment; replayed: boolean }> {
  validatePathwayPersistenceInput(input);

  const existing = await prisma.pathwayAssessment.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
    include: assessmentInclude,
  });
  if (existing) {
    if (!canonicalReplayMatches(existing, input)) {
      fail('IDEMPOTENCY_CONFLICT', 'Idempotency key was reused for a different scope');
    }
    return { assessment: existing, replayed: true };
  }

  try {
    const id = await prisma.$transaction(
      async (tx) => {
        const site = await tx.siteContext.findUnique({
          where: { id: input.siteContextId },
        });
        if (!site || site.projectId !== input.projectId) {
          fail('SITE_SCOPE_MISMATCH', 'Site context does not belong to the project');
        }
        if (
          site.lgaCode &&
          site.lgaCode !== input.definition.lgaCode
        ) {
          fail('SITE_LGA_MISMATCH', 'Persisted site LGA conflicts with the definition');
        }
        if (site.zone && site.zone !== input.definition.zoneCode) {
          fail('SITE_ZONE_MISMATCH', 'Persisted site zone conflicts with the definition');
        }

        let spatial = await tx.siteSpatialProvenance.findUnique({
          where: {
            siteContextId_contentHash: {
              siteContextId: input.siteContextId,
              contentHash: input.spatial.contentHash,
            },
          },
        });
        if (!spatial) {
          spatial = await tx.siteSpatialProvenance.create({
            data: {
              siteContextId: input.siteContextId,
              ...input.spatial,
            },
          });
        } else if (
          spatial.lgaCode !== input.spatial.lgaCode ||
          spatial.zoneCode !== input.spatial.zoneCode ||
          spatial.sourceUrl !== input.spatial.sourceUrl
        ) {
          fail('SPATIAL_HASH_CONFLICT', 'Spatial hash resolved to conflicting provenance');
        }

        let definition = await tx.pathwayDefinition.findUnique({
          where: { versionKey: input.definition.versionKey },
        });
        if (!definition) {
          definition = await tx.pathwayDefinition.create({
            data: input.definition,
          });
        } else if (
          definition.graphHash !== input.definition.graphHash ||
          definition.lgaCode !== input.definition.lgaCode ||
          definition.zoneCode !== input.definition.zoneCode ||
          definition.proposalType !== input.definition.proposalType
        ) {
          fail('DEFINITION_VERSION_CONFLICT', 'Definition version resolved to a different graph');
        }

        const assessment = await tx.pathwayAssessment.create({
          data: {
            projectId: input.projectId,
            siteContextId: input.siteContextId,
            spatialProvenanceId: spatial.id,
            pathwayDefinitionId: definition.id,
            environment: input.environment,
            assessmentVersion: input.assessmentVersion,
            idempotencyKey: input.idempotencyKey,
            scopeKey: input.scopeKey,
            inputHash: input.inputHash,
            evidenceDigest: input.evidenceDigest,
            decision: input.decision,
            trustLevel: input.trustLevel,
            input: input.input,
            result: attachPersistedPathwayProgressiveCommercialBinding(
              attachPersistedPathwayCommercialBinding(
                input.result,
                input.commercialBinding || null,
              ),
              input.progressiveBinding || null,
            ) as Prisma.InputJsonValue,
            assessedAt: input.assessedAt,
            staleAt: input.staleAt,
          },
        });

        const evidenceIds = new Map<string, string>();
        const evidenceRows = input.evidence.map((item) => {
          const id = randomUUID();
          evidenceIds.set(item.evidenceKey, id);
          return {
            id,
            assessmentId: assessment.id,
            evidenceKind: item.evidenceKind,
            authority: item.authority,
            sourceUrl: item.sourceUrl,
            sourceVersion: item.sourceVersion,
            sourceReference: item.sourceReference,
            effectiveFrom: item.effectiveFrom,
            effectiveTo: item.effectiveTo,
            retrievedAt: item.retrievedAt,
            contentHash: item.contentHash,
            citation: item.citation,
            snapshot: item.snapshot,
            isCurrentAtAssessment: item.isCurrentAtAssessment,
            staleAt: item.staleAt,
            clauseId: item.clauseId,
            dcpClauseId: item.dcpClauseId,
            workspaceUploadId: item.workspaceUploadId,
          };
        });
        await tx.pathwayEvidenceSnapshot.createMany({ data: evidenceRows });

        const controlRows = input.controls.map((item) => {
          const evidenceSnapshotId = evidenceIds.get(item.evidenceKey);
          if (!evidenceSnapshotId) {
            fail('MISSING_CONTROL_EVIDENCE', 'Control evidence disappeared');
          }
          return {
            assessmentId: assessment.id,
            evidenceSnapshotId,
            controlKey: item.controlKey,
            label: item.label,
            applicabilityHash: item.applicabilityHash,
            operator: item.operator,
            numericValue: item.numericValue,
            lowerBound: item.lowerBound,
            upperBound: item.upperBound,
            textValue: item.textValue,
            unit: item.unit,
            landAreaMinSqm: item.landAreaMinSqm,
            landAreaMaxSqm: item.landAreaMaxSqm,
            applicability: item.applicability,
            sourceReference: item.sourceReference,
            contentHash: item.contentHash,
            isCurrentAtAssessment: item.isCurrentAtAssessment,
            staleAt: item.staleAt,
          };
        });
        await tx.pathwayControlSnapshot.createMany({ data: controlRows });

        await tx.pathwayGateSnapshot.createMany({
          data: input.gates.map((gate) => ({
            assessmentId: assessment.id,
            gateKey: gate.gateKey,
            sequence: gate.sequence,
            question: gate.question,
            outcome: gate.outcome,
            reason: gate.reason,
            condition: gate.condition,
            evidenceRefs: gate.evidenceRefs,
            controlRefs: gate.controlRefs,
          })),
        });

        return assessment.id;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return { assessment: await loadAssessment(prisma, id), replayed: false };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const replay = await prisma.pathwayAssessment.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: assessmentInclude,
      });
      if (replay && canonicalReplayMatches(replay, input)) {
        return { assessment: replay, replayed: true };
      }
    }
    throw error;
  }
}

export async function reloadPathwayAssessment(
  prisma: PrismaClient,
  id: string,
): Promise<PersistedPathwayAssessment> {
  return loadAssessment(prisma, id);
}

export async function bindPathwayArtefact(
  prisma: PrismaClient,
  input: {
    assessmentId: string;
    artefactId: string;
    commercialStage: PathwayCommercialStage;
    scopeKey: string;
    evidenceDigest: string;
  },
) {
  const existing = await prisma.pathwayArtefactBinding.findUnique({
    where: { artefactId: input.artefactId },
  });
  const paid = input.commercialStage !== 'FREE_PATHWAY_CHECK';
  const working =
    input.commercialStage === 'PLANNING_CONTROLS_PACK_WORKING' ||
    input.commercialStage === 'SUBMISSION_SEE_WORKING';
  if (existing) {
    if (
      existing.assessmentId !== input.assessmentId ||
      existing.commercialStage !== input.commercialStage ||
      existing.scopeKey !== input.scopeKey ||
      existing.evidenceDigest !== input.evidenceDigest
    ) {
      fail('ARTEFACT_BINDING_CONFLICT', 'Artefact is already bound to a different assessment');
    }
    if (!paid) return { binding: existing, replayed: true };
  }

  const assessment = await prisma.pathwayAssessment.findUnique({
    where: { id: input.assessmentId },
    include: assessmentInclude,
  });
  if (!assessment) fail('ASSESSMENT_NOT_FOUND', 'Assessment was not found');

  const artefact = await prisma.artefact.findUnique({
    where: { id: input.artefactId },
  });
  if (!artefact || artefact.projectId !== assessment.projectId) {
    fail('ARTEFACT_SCOPE_MISMATCH', 'Artefact does not belong to the assessment project');
  }
  if (
    assessment.scopeKey !== input.scopeKey ||
    assessment.evidenceDigest !== input.evidenceDigest
  ) {
    fail('ARTEFACT_EVIDENCE_MISMATCH', 'Artefact scope and evidence must match exactly');
  }

  if (working) {
    const now = new Date();
    const currentAt = (staleAt: Date | null) =>
      !staleAt || staleAt.getTime() > now.getTime();
    const policy = evaluateWorkingPathwayArtefactPolicy({
      commercialStage:
        input.commercialStage === 'PLANNING_CONTROLS_PACK_WORKING'
          ? 'PLANNING_CONTROLS_PACK_WORKING'
          : 'SUBMISSION_SEE_WORKING',
      scopeKey: input.scopeKey,
      evidenceDigest: input.evidenceDigest,
      progressiveBinding:
        readPersistedPathwayProgressiveCommercialBinding(assessment.result),
      artefactPayload: artefact.payload,
      assessment: {
        trustLevel: assessment.trustLevel,
        isCurrent:
          assessment.isCurrent &&
          currentAt(assessment.staleAt) &&
          assessment.pathwayDefinition.status === 'ACTIVE',
        evidenceCurrent: assessment.evidenceSnapshots.every(
          (item) => item.isCurrentAtAssessment && currentAt(item.staleAt),
        ),
        controlsCurrent: assessment.controlSnapshots.every(
          (item) => item.isCurrentAtAssessment && currentAt(item.staleAt),
        ),
        fixtureEvidence:
          hasFixtureMarker(assessment.input) ||
          hasFixtureMarker(assessment.result) ||
          hasFixtureMarker(assessment.spatialProvenance.payload) ||
          hasSyntheticSourceLabel(assessment.spatialProvenance.sourceVersion) ||
          hasSyntheticSourceLabel(assessment.spatialProvenance.matchMethod) ||
          hasFixtureMarker(assessment.pathwayDefinition.graph) ||
          assessment.evidenceSnapshots.some(
            (item) =>
              hasFixtureMarker(item.citation) ||
              hasFixtureMarker(item.snapshot) ||
              hasSyntheticSourceLabel(item.sourceVersion),
          ) ||
          assessment.controlSnapshots.some(
            (item) =>
              hasFixtureMarker(item.applicability) ||
              hasSyntheticSourceLabel(item.sourceReference),
          ) ||
          hasFixtureMarker(artefact.payload),
      },
    });
    if (!policy.allowed) {
      fail(
        'WORKING_OUTPUT_BLOCKED',
        'Working output is blocked: ' + policy.blockers.join(', '),
      );
    }
  } else if (paid) {
    const policy = evaluatePaidArtefactBindingPolicy({
      commercialStage:
        input.commercialStage === 'PLANNING_CONTROLS_PACK'
          ? 'PLANNING_CONTROLS_PACK'
          : 'SUBMISSION_SEE',
      scopeKey: input.scopeKey,
      evidenceDigest: input.evidenceDigest,
      commercialBinding: readPersistedPathwayCommercialBinding(
        assessment.result,
      ),
      assessment: {
        decision: assessment.decision,
        trustLevel: assessment.trustLevel,
        isCurrent:
          assessment.isCurrent &&
          !assessment.staleAt &&
          assessment.pathwayDefinition.status === 'ACTIVE',
        evidenceCurrent: assessment.evidenceSnapshots.every(
          (item) => item.isCurrentAtAssessment && !item.staleAt,
        ),
        controlsCurrent: assessment.controlSnapshots.every(
          (item) => item.isCurrentAtAssessment && !item.staleAt,
        ),
        fixtureEvidence:
          hasFixtureMarker(assessment.input) ||
          hasFixtureMarker(assessment.result) ||
          hasFixtureMarker(assessment.spatialProvenance.payload) ||
          hasSyntheticSourceLabel(assessment.spatialProvenance.sourceVersion) ||
          hasSyntheticSourceLabel(assessment.spatialProvenance.matchMethod) ||
          hasFixtureMarker(assessment.pathwayDefinition.graph) ||
          assessment.evidenceSnapshots.some(
            (item) =>
              hasFixtureMarker(item.citation) ||
              hasFixtureMarker(item.snapshot) ||
              hasSyntheticSourceLabel(item.sourceVersion),
          ) ||
          assessment.controlSnapshots.some(
            (item) =>
              hasFixtureMarker(item.applicability) ||
              hasSyntheticSourceLabel(item.sourceReference),
          ) ||
          hasFixtureMarker(artefact.payload),
      },
    });
    if (!policy.allowed) {
      fail(
        'PAID_OUTPUT_BLOCKED',
        'Paid output is blocked: ' + policy.blockers.join(', '),
      );
    }
  }

  if (existing) return { binding: existing, replayed: true };

  const stageConflict = assessment.artefactBindings.find(
    (binding) => binding.commercialStage === input.commercialStage,
  );
  if (stageConflict) {
    fail('COMMERCIAL_STAGE_CONFLICT', 'Assessment already has an artefact for this stage');
  }

  try {
    const binding = await prisma.pathwayArtefactBinding.create({ data: input });
    return { binding, replayed: false };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const replay = await prisma.pathwayArtefactBinding.findUnique({
        where: { artefactId: input.artefactId },
      });
      if (
        replay &&
        replay.assessmentId === input.assessmentId &&
        replay.commercialStage === input.commercialStage &&
        replay.scopeKey === input.scopeKey &&
        replay.evidenceDigest === input.evidenceDigest
      ) {
        return { binding: replay, replayed: true };
      }
    }
    throw error;
  }
}
