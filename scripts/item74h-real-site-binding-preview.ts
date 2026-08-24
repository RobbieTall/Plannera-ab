import { createHash } from 'node:crypto';

import type { PrismaClient } from '@prisma/client';

import {
  bindPathwayArtefact,
  PathwayPersistenceError,
  persistPathwayAssessment,
  reloadPathwayAssessment,
  type PersistPathwayAssessmentInput,
} from '../src/lib/pathway-check-persistence';
import {
  evaluatePathwayRealSiteCommercialBridge,
  formatPathwaySideRearSetbacks,
} from '../src/lib/pathway-real-site-commercial-bridge';
import {
  PATHWAY_REAL_SITE_EVIDENCE_VERSION,
  type PathwayRealSiteEvidencePackage,
} from '../src/lib/pathway-real-site-evidence';
import { readPersistedPathwayCommercialBinding } from '../src/lib/pathway-persisted-commercial-binding';
import {
  createPathwaySiteEvidenceManifest,
  hashPathwaySiteEvidenceValue,
  PATHWAY_SITE_EVIDENCE_MANIFEST_VERSION,
  type PathwaySiteEvidenceObservation,
  type PathwaySiteEvidenceSourceKind,
  type PathwaySiteEvidenceTrustLevel,
  type PathwaySiteEvidenceValue,
  type PathwaySiteFactKey,
} from '../src/lib/pathway-site-evidence';

const ROAD_URL =
  'https://data.nsw.gov.au/data/dataset/2-nsw-roads-network-categorisation';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

const isoOffset = (now: Date, milliseconds: number) =>
  new Date(now.getTime() + milliseconds).toISOString();

function buildRealSiteEvidencePackage(
  now: Date,
  projectRef: string,
): PathwayRealSiteEvidencePackage {
  const surveyHash = sha256(projectRef + ':survey');
  const issuedAt = isoOffset(now, -7 * 24 * 60 * 60 * 1000);
  const retrievedAt = isoOffset(now, -24 * 60 * 60 * 1000);
  const reviewedAt = isoOffset(now, -12 * 60 * 60 * 1000);
  const staleAt = isoOffset(now, 30 * 24 * 60 * 60 * 1000);

  return {
    version: PATHWAY_REAL_SITE_EVIDENCE_VERSION,
    projectRef,
    documents: [
      {
        role: 'ROAD_CLASSIFICATION',
        uploadRef: projectRef + '_road',
        contentHash: sha256(projectRef + ':road-document'),
        evidenceStatus: 'READY',
        indexingStatus: 'READY',
        authority: 'TRANSPORT_FOR_NSW',
        sourceVersion: 'Synthetic current TfNSW snapshot',
        sourceReferenceHash: sha256(ROAD_URL),
        issuedAt,
        retrievedAt,
        staleAt,
        basisContentHash: null,
        verification: {
          status: 'EVIDENCE_VERIFIED',
          reviewerRef: projectRef + '_reviewer',
          reviewedAt,
          reviewNotesHash: sha256(projectRef + ':road-review'),
        },
      },
      {
        role: 'CADASTRAL_SURVEY',
        uploadRef: projectRef + '_survey',
        contentHash: surveyHash,
        evidenceStatus: 'IMAGE_ONLY',
        indexingStatus: 'NOT_APPLICABLE',
        authority: 'REGISTERED_SURVEYOR',
        sourceVersion: 'Synthetic current survey',
        sourceReferenceHash: sha256(projectRef + ':survey-reference'),
        issuedAt,
        retrievedAt,
        staleAt,
        basisContentHash: null,
        verification: {
          status: 'EVIDENCE_VERIFIED',
          reviewerRef: projectRef + '_reviewer',
          reviewedAt,
          reviewNotesHash: sha256(projectRef + ':survey-review'),
        },
      },
      {
        role: 'PROPOSED_SHED_LAYOUT',
        uploadRef: projectRef + '_layout',
        contentHash: sha256(projectRef + ':layout'),
        evidenceStatus: 'IMAGE_ONLY',
        indexingStatus: 'NOT_APPLICABLE',
        authority: 'APPLICANT',
        sourceVersion: 'Synthetic proposal bound to survey',
        sourceReferenceHash: sha256(projectRef + ':layout-reference'),
        issuedAt,
        retrievedAt,
        staleAt,
        basisContentHash: surveyHash,
        verification: {
          status: 'EVIDENCE_VERIFIED',
          reviewerRef: projectRef + '_reviewer',
          reviewedAt,
          reviewNotesHash: sha256(projectRef + ':layout-review'),
        },
      },
    ],
    roadClassification: {
      category: 'CLASSIFIED_ROAD',
      sourceRole: 'ROAD_CLASSIFICATION',
      sourceReferenceHash: sha256(ROAD_URL),
      matchMethod: 'POSITIVE_TFNSW_STATE_OR_REGIONAL_MATCH',
    },
    measurements: [
      {
        key: 'SHED_FOOTPRINT_SQM',
        value: 120,
        unit: 'sqm',
        sourceRole: 'PROPOSED_SHED_LAYOUT',
        pageReference: 'sheet-A1',
        method: 'PLAN_DIMENSION',
      },
      {
        key: 'SHED_HEIGHT_M',
        value: 4.8,
        unit: 'm',
        sourceRole: 'PROPOSED_SHED_LAYOUT',
        pageReference: 'sheet-A2',
        method: 'DOCUMENT_STATED',
      },
      {
        key: 'ROAD_SETBACK_M',
        value: 62,
        unit: 'm',
        sourceRole: 'PROPOSED_SHED_LAYOUT',
        pageReference: 'sheet-A1',
        method: 'SURVEY_MEASUREMENT',
      },
      {
        key: 'SIDE_SETBACK_M',
        value: 18,
        unit: 'm',
        sourceRole: 'PROPOSED_SHED_LAYOUT',
        pageReference: 'sheet-A1',
        method: 'SURVEY_MEASUREMENT',
      },
      {
        key: 'REAR_SETBACK_M',
        value: 24,
        unit: 'm',
        sourceRole: 'PROPOSED_SHED_LAYOUT',
        pageReference: 'sheet-A1',
        method: 'SURVEY_MEASUREMENT',
      },
    ],
  };
}

function observation({
  now,
  factKey,
  value,
  sourceKind,
  trustLevel,
  suffix,
}: {
  now: Date;
  factKey: PathwaySiteFactKey;
  value: PathwaySiteEvidenceValue;
  sourceKind: PathwaySiteEvidenceSourceKind;
  trustLevel: PathwaySiteEvidenceTrustLevel;
  suffix: string;
}): PathwaySiteEvidenceObservation {
  const requiresUrl =
    sourceKind === 'ADDRESS_RESOLVER' ||
    sourceKind === 'AUTHORITATIVE_SPATIAL' ||
    sourceKind === 'AUTHORITATIVE_INSTRUMENT';

  return {
    factKey,
    value,
    valueHash: hashPathwaySiteEvidenceValue(value),
    sourceKind,
    trustLevel,
    sourceUrl: requiresUrl
      ? 'https://evidence.example/' + suffix
      : undefined,
    sourceReference: 'synthetic-' + suffix,
    retrievedAt: isoOffset(now, -24 * 60 * 60 * 1000),
    staleAt: isoOffset(now, 30 * 24 * 60 * 60 * 1000),
  };
}

function buildManifest(
  now: Date,
  uploadSetDigest: string,
) {
  const add = (
    factKey: PathwaySiteFactKey,
    value: PathwaySiteEvidenceValue,
    sourceKind: PathwaySiteEvidenceSourceKind,
    trustLevel: PathwaySiteEvidenceTrustLevel,
    suffix: string,
  ) => observation({ now, factKey, value, sourceKind, trustLevel, suffix });

  const observations: PathwaySiteEvidenceObservation[] = [
    add('ADDRESS_CONFIRMED', true, 'ADDRESS_RESOLVER', 'SITE_CONFIRMED', 'address'),
    add('ZONE_CONFIRMED', 'RU2', 'AUTHORITATIVE_SPATIAL', 'EVIDENCE_VERIFIED', 'zone'),
    add('INSTRUMENT_CURRENT', true, 'AUTHORITATIVE_INSTRUMENT', 'EVIDENCE_VERIFIED', 'instrument'),
    add('AGRICULTURAL_ANCILLARY_USE', true, 'USER_ATTESTATION', 'SITE_CONFIRMED', 'ancillary-user'),
    add('AGRICULTURAL_ANCILLARY_USE', true, 'SITE_PLAN', 'EVIDENCE_VERIFIED', 'ancillary-plan'),
    add('NON_HABITABLE_DESIGN', true, 'SITE_PLAN', 'EVIDENCE_VERIFIED', 'non-habitable'),
    add('PROPOSAL_FOOTPRINT_SQM', 120, 'SITE_PLAN', 'EVIDENCE_VERIFIED', 'footprint'),
    add('PROPOSAL_HEIGHT_M', 4.8, 'SITE_PLAN', 'EVIDENCE_VERIFIED', 'height'),
    add('LANDHOLDING_AREA_SQM', 40000, 'TITLE_OR_SURVEY', 'EVIDENCE_VERIFIED', 'landholding'),
    add('EXISTING_FARM_BUILDING_AREA_SQM', 20, 'SITE_PLAN', 'EVIDENCE_VERIFIED', 'existing-plan'),
    add('EXISTING_FARM_BUILDING_AREA_SQM', 20, 'USER_ATTESTATION', 'SITE_CONFIRMED', 'existing-user'),
    add('ROAD_CLASSIFICATION', 'CLASSIFIED_ROAD', 'AUTHORITATIVE_SPATIAL', 'EVIDENCE_VERIFIED', 'road'),
    add('ROAD_BOUNDARY_SETBACK_M', 62, 'SITE_PLAN', 'EVIDENCE_VERIFIED', 'road-setback'),
    add(
      'SIDE_REAR_SETBACK_M',
      formatPathwaySideRearSetbacks({ sideSetbackM: 18, rearSetbackM: 24 }),
      'SITE_PLAN',
      'EVIDENCE_VERIFIED',
      'side-rear',
    ),
    add('WATERBODY_SETBACK_M', 45, 'AUTHORITATIVE_SPATIAL', 'EVIDENCE_VERIFIED', 'water-spatial'),
    add('WATERBODY_SETBACK_M', 45, 'SITE_PLAN', 'EVIDENCE_VERIFIED', 'water-plan'),
    add('HERITAGE_STATUS', 'NO_PRIMARY_LAYER_INTERSECTION', 'AUTHORITATIVE_SPATIAL', 'EVIDENCE_VERIFIED', 'heritage'),
    add('ENVIRONMENTAL_SENSITIVITY', 'REVIEWED', 'AUTHORITATIVE_SPATIAL', 'EVIDENCE_VERIFIED', 'environment'),
    add('MAPPED_CONSTRAINTS', ['BUSHFIRE_REVIEWED', 'FLOOD_REVIEWED'], 'AUTHORITATIVE_SPATIAL', 'EVIDENCE_VERIFIED', 'constraints'),
    add('RIDGELINE_VISUAL_IMPACT', 'LOW', 'AUTHORITATIVE_SPATIAL', 'EVIDENCE_VERIFIED', 'ridgeline-spatial'),
    add('RIDGELINE_VISUAL_IMPACT', 'LOW', 'SITE_PLAN', 'EVIDENCE_VERIFIED', 'ridgeline-plan'),
    add('EVIDENCE_UPLOAD_SET', uploadSetDigest, 'WORKSPACE_UPLOAD', 'EVIDENCE_VERIFIED', 'uploads'),
    add('OPERATOR_REVIEW', true, 'OPERATOR_REVIEW', 'OPERATOR_APPROVED', 'operator'),
  ];

  return createPathwaySiteEvidenceManifest({
    manifestVersion: PATHWAY_SITE_EVIDENCE_MANIFEST_VERSION,
    lgaCode: 'BYRON',
    zoneCode: 'RU2',
    proposalType: 'SHED_OUTBUILDING',
    assessedAt: now.toISOString(),
    observations,
  });
}

async function cleanup(
  prisma: PrismaClient,
  prefix: string,
): Promise<void> {
  const assessments = await prisma.pathwayAssessment.findMany({
    where: { scopeKey: { startsWith: prefix } },
    select: { id: true },
  });
  const assessmentIds = assessments.map((item) => item.id);

  if (assessmentIds.length) {
    await prisma.pathwayArtefactBinding.deleteMany({
      where: { assessmentId: { in: assessmentIds } },
    });
    await prisma.pathwayAssessment.deleteMany({
      where: { id: { in: assessmentIds } },
    });
  }

  await prisma.pathwayDefinition.deleteMany({
    where: { versionKey: { startsWith: prefix } },
  });
  await prisma.siteSpatialProvenance.deleteMany({
    where: { contentHash: { startsWith: prefix } },
  });
  await prisma.artefact.deleteMany({
    where: { id: { startsWith: prefix } },
  });
  await prisma.siteContext.deleteMany({
    where: { id: { startsWith: prefix } },
  });
  await prisma.project.deleteMany({
    where: { id: { startsWith: prefix } },
  });
  await prisma.property.deleteMany({
    where: { id: { startsWith: prefix } },
  });
  await prisma.user.deleteMany({
    where: { id: { startsWith: prefix } },
  });
}

async function residualCount(
  prisma: PrismaClient,
  prefix: string,
): Promise<number> {
  const counts = await Promise.all([
    prisma.pathwayAssessment.count({
      where: { scopeKey: { startsWith: prefix } },
    }),
    prisma.pathwayDefinition.count({
      where: { versionKey: { startsWith: prefix } },
    }),
    prisma.siteSpatialProvenance.count({
      where: { contentHash: { startsWith: prefix } },
    }),
    prisma.pathwayArtefactBinding.count({
      where: { artefactId: { startsWith: prefix } },
    }),
    prisma.artefact.count({ where: { id: { startsWith: prefix } } }),
    prisma.siteContext.count({ where: { id: { startsWith: prefix } } }),
    prisma.project.count({ where: { id: { startsWith: prefix } } }),
    prisma.property.count({ where: { id: { startsWith: prefix } } }),
    prisma.user.count({ where: { id: { startsWith: prefix } } }),
  ]);
  return counts.reduce((total, count) => total + count, 0);
}

export async function runItem74hRealSiteBindingPreviewAcceptance(
  prisma: PrismaClient,
) {
  const commit = (process.env.VERCEL_GIT_COMMIT_SHA || 'unknown').slice(0, 12);
  const prefix =
    'item74h-paid-' + commit + '-' + Date.now().toString(36) + '-';
  const ids = {
    user: prefix + 'user',
    property: prefix + 'property',
    project: prefix + 'project',
    site: prefix + 'site',
    pack: prefix + 'pack',
    see: prefix + 'see',
  };
  const now = new Date();

  await cleanup(prisma, prefix);

  try {
    const packageInput = buildRealSiteEvidencePackage(
      now,
      prefix + 'opaque-project',
    );
    const packageAssessment = await import(
      '../src/lib/pathway-real-site-evidence'
    ).then(({ assessPathwayRealSiteEvidence }) =>
      assessPathwayRealSiteEvidence(packageInput, now),
    );
    assert(
      packageAssessment.confirmedEvidence,
      'Synthetic real-site evidence package must be confirmed',
    );

    const manifest = buildManifest(
      now,
      packageAssessment.confirmedEvidence.siteEvidenceDigest,
    );
    const bridge = evaluatePathwayRealSiteCommercialBridge({
      manifest,
      evidencePackage: packageInput,
      roadEvidence: {
        category: 'CLASSIFIED_ROAD',
        basis: 'TFNSW_POSITIVE_STATE_OR_REGIONAL_MATCH',
        status: 'CURRENT',
        sourceUrl: ROAD_URL,
        sourcePublishedOn: packageInput.documents[0].issuedAt,
        checkedAt: packageInput.documents[0].retrievedAt,
      },
      asOf: now,
    });
    assert(bridge.planningControlsPackEligible, 'Synthetic pack scope must be eligible');
    assert(bridge.submissionSeeEligible, 'Synthetic SEE scope must be eligible');
    assert(bridge.exactScope, 'Synthetic exact commercial scope is required');
    assert(!bridge.productionCheckoutEnabled, 'Production checkout must stay disabled');

    await prisma.user.create({
      data: {
        id: ids.user,
        email: prefix + 'preview@example.invalid',
        name: 'Item 74H synthetic paid-scope fixture',
      },
    });
    await prisma.property.create({
      data: {
        id: ids.property,
        name: 'Synthetic Byron RU2 property',
        address: 'SYNTHETIC - NOT A REAL ADDRESS',
        state: 'NSW',
        country: 'AU',
      },
    });
    await prisma.project.create({
      data: {
        id: ids.project,
        name: 'Item 74H synthetic paid pathway proof',
        title: 'Synthetic shed paid scope',
        description: 'Non-authoritative acceptance fixture',
        propertyId: ids.property,
        userId: ids.user,
        createdById: ids.user,
        zoningCode: 'RU2',
        zoning: 'RU2',
        address: 'SYNTHETIC - NOT A REAL ADDRESS',
        isDemo: true,
      },
    });
    await prisma.siteContext.create({
      data: {
        id: ids.site,
        projectId: ids.project,
        addressInput: 'SYNTHETIC - NOT A REAL ADDRESS',
        formattedAddress: 'SYNTHETIC - NOT A REAL ADDRESS',
        lgaName: 'Byron Shire',
        lgaCode: 'BYRON',
        parcelId: 'SYNTHETIC',
        lot: 'SYNTHETIC',
        planNumber: 'SYNTHETIC',
        zone: 'RU2',
      },
    });
    await prisma.artefact.createMany({
      data: [
        {
          id: ids.pack,
          projectId: ids.project,
          createdById: ids.user,
          type: 'detailed_planning_pack',
          title: 'Synthetic exact-scope controls pack',
          source: 'item74h-paid-preview-acceptance',
          payload: { fixture: true, authoritative: false },
        },
        {
          id: ids.see,
          projectId: ids.project,
          createdById: ids.user,
          type: 'pre_see_planning_memo',
          title: 'Synthetic exact-scope submission SEE',
          source: 'item74h-paid-preview-acceptance',
          payload: { fixture: true, authoritative: false },
        },
      ],
    });

    const exactScope = bridge.exactScope;
    const persistenceInput: PersistPathwayAssessmentInput = {
      environment: 'PREVIEW',
      projectId: ids.project,
      siteContextId: ids.site,
      assessmentVersion: 'item74h-paid-preview-v1',
      idempotencyKey: prefix + 'assessment-idempotency',
      scopeKey: exactScope.scopeDigest,
      inputHash: sha256(prefix + 'input'),
      evidenceDigest: exactScope.siteEvidenceDigest,
      commercialBinding: bridge.commercialBinding,
      decision: 'PROCEED',
      trustLevel: 'OPERATOR_APPROVED',
      input: {
        fixture: true,
        authoritative: false,
        lgaCode: 'BYRON',
        zoneCode: 'RU2',
        proposalType: 'SHED_OUTBUILDING',
      },
      result: {
        fixture: true,
        authoritative: false,
        decision: 'PROCEED',
      },
      assessedAt: now,
      spatial: {
        authority: 'NSW Spatial Services',
        datasetName: 'Synthetic verified spatial stand-in',
        sourceUrl:
          'https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Cadastre/MapServer',
        sourceVersion: 'synthetic-preview-v1',
        retrievedAt: now,
        contentHash: prefix + 'spatial-hash',
        matchMethod: 'SYNTHETIC_VERIFIED',
        lgaCode: 'BYRON',
        zoneCode: 'RU2',
        payload: { fixture: true, authoritative: false },
        trustLevel: 'EVIDENCE_VERIFIED',
      },
      definition: {
        versionKey: prefix + 'byron-ru2-shed-v1',
        lgaCode: 'BYRON',
        zoneCode: 'RU2',
        proposalType: 'SHED_OUTBUILDING',
        status: 'ACTIVE',
        effectiveFrom: now,
        graphHash: sha256(prefix + 'graph'),
        graph: {
          fixture: true,
          authoritative: false,
          gates: ['site', 'controls', 'commercial-scope'],
        },
      },
      evidence: [
        {
          evidenceKey: 'lep',
          evidenceKind: 'LEP',
          authority: 'NSW legislation',
          sourceUrl:
            'https://legislation.nsw.gov.au/view/html/inforce/current/epi-2014-0297',
          sourceVersion: 'synthetic-preview-v1',
          sourceReference: 'Synthetic current LEP snapshot',
          retrievedAt: now,
          contentHash: sha256(prefix + 'lep'),
          citation: { fixture: true },
          snapshot: { fixture: true, authoritative: false },
          isCurrentAtAssessment: true,
        },
        {
          evidenceKey: 'dcp',
          evidenceKind: 'DCP',
          authority: 'Byron Shire Council',
          sourceUrl:
            'https://www.byron.nsw.gov.au/Services/Building-development/Development-control-plans',
          sourceVersion: 'synthetic-preview-v1',
          sourceReference: 'Synthetic current DCP snapshot',
          retrievedAt: now,
          contentHash: sha256(prefix + 'dcp'),
          citation: { fixture: true },
          snapshot: { fixture: true, authoritative: false },
          isCurrentAtAssessment: true,
        },
        {
          evidenceKey: 'spatial',
          evidenceKind: 'SPATIAL',
          authority: 'NSW Spatial Services',
          sourceUrl:
            'https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Cadastre/MapServer',
          sourceVersion: 'synthetic-preview-v1',
          sourceReference: 'Synthetic verified spatial snapshot',
          retrievedAt: now,
          contentHash: sha256(prefix + 'spatial-evidence'),
          citation: { fixture: true },
          snapshot: { fixture: true, authoritative: false },
          isCurrentAtAssessment: true,
        },
        {
          evidenceKey: 'upload-set',
          evidenceKind: 'UPLOAD',
          authority: 'Item 74H evidence verifier',
          sourceUrl: 'https://plannera.com.au/privacy',
          sourceVersion: 'synthetic-preview-v1',
          sourceReference: 'Synthetic reviewed upload-set digest',
          retrievedAt: now,
          contentHash: packageAssessment.confirmedEvidence.siteEvidenceDigest,
          citation: { fixture: true },
          snapshot: { fixture: true, authoritative: false },
          isCurrentAtAssessment: true,
        },
      ],
      controls: [
        {
          controlKey: exactScope.controlId,
          evidenceKey: 'dcp',
          label: 'Byron rural classified-road setback',
          applicabilityHash: sha256(prefix + 'control-applicability'),
          numericValue: exactScope.minimumRoadSetbackMetres,
          operator: '>=',
          unit: 'm',
          applicability: {
            fixture: true,
            lgaCode: 'BYRON',
            zoneCode: 'RU2',
            proposalType: 'SHED_OUTBUILDING',
            roadCategory: exactScope.roadCategory,
          },
          sourceReference: 'Byron DCP 2014 Chapter D2 section D2.2.1',
          contentHash: sha256(prefix + 'control'),
          isCurrentAtAssessment: true,
        },
      ],
      gates: [
        {
          gateKey: 'exact-commercial-scope',
          sequence: 0,
          question: 'Does the verified proposal meet the classified-road setback?',
          outcome: 'PROCEED',
          reason: 'Synthetic measured setback meets the synthetic current control.',
          condition: {
            fixture: true,
            minimumMetres: exactScope.minimumRoadSetbackMetres,
            proposedMetres: exactScope.proposedRoadSetbackMetres,
          },
          evidenceRefs: ['dcp', 'spatial', 'upload-set'],
          controlRefs: [exactScope.controlId],
        },
      ],
    };

    const first = await persistPathwayAssessment(prisma, persistenceInput);
    const replay = await persistPathwayAssessment(prisma, persistenceInput);
    const loaded = await reloadPathwayAssessment(prisma, first.assessment.id);
    assert(!first.replayed, 'First paid-scope persistence must create one assessment');
    assert(replay.replayed, 'Paid-scope persistence must replay idempotently');
    assert(first.assessment.id === replay.assessment.id, 'Paid-scope replay changed assessment');
    assert(
      readPersistedPathwayCommercialBinding(loaded.result)?.exactScope
        ?.scopeDigest === exactScope.scopeDigest,
      'Reload lost the exact commercial scope',
    );

    const pack = await bindPathwayArtefact(prisma, {
      assessmentId: first.assessment.id,
      artefactId: ids.pack,
      commercialStage: 'PLANNING_CONTROLS_PACK',
      scopeKey: exactScope.scopeDigest,
      evidenceDigest: exactScope.siteEvidenceDigest,
    });
    const packReplay = await bindPathwayArtefact(prisma, {
      assessmentId: first.assessment.id,
      artefactId: ids.pack,
      commercialStage: 'PLANNING_CONTROLS_PACK',
      scopeKey: exactScope.scopeDigest,
      evidenceDigest: exactScope.siteEvidenceDigest,
    });
    const see = await bindPathwayArtefact(prisma, {
      assessmentId: first.assessment.id,
      artefactId: ids.see,
      commercialStage: 'SUBMISSION_SEE',
      scopeKey: exactScope.scopeDigest,
      evidenceDigest: exactScope.siteEvidenceDigest,
    });
    const seeReplay = await bindPathwayArtefact(prisma, {
      assessmentId: first.assessment.id,
      artefactId: ids.see,
      commercialStage: 'SUBMISSION_SEE',
      scopeKey: exactScope.scopeDigest,
      evidenceDigest: exactScope.siteEvidenceDigest,
    });

    assert(!pack.replayed && packReplay.replayed, 'Pack binding replay failed');
    assert(pack.binding.id === packReplay.binding.id, 'Pack replay changed binding');
    assert(!see.replayed && seeReplay.replayed, 'SEE binding replay failed');
    assert(see.binding.id === seeReplay.binding.id, 'SEE replay changed binding');
    assert(
      (await prisma.pathwayAssessment.count({
        where: { idempotencyKey: persistenceInput.idempotencyKey },
      })) === 1,
      'Paid-scope replay must leave exactly one assessment',
    );
    assert(
      (await prisma.pathwayArtefactBinding.count({
        where: { assessmentId: first.assessment.id },
      })) === 2,
      'Paid-scope replay must leave exactly one binding per paid stage',
    );

    return {
      decision: first.assessment.decision,
      assessmentCreatedOnce: true,
      assessmentReplaySafe: true,
      compositeScopePersistedAndReloaded: true,
      planningControlsPackCreatedOnce: true,
      planningControlsPackReplaySafe: true,
      submissionSeeCreatedOnce: true,
      submissionSeeReplaySafe: true,
      syntheticEvidenceOnly: true,
      productionCheckoutEnabled: false,
      productionMutationPerformed: false,
    };
  } catch (error) {
    if (error instanceof PathwayPersistenceError) throw error;
    throw error;
  } finally {
    await cleanup(prisma, prefix);
    assert(
      (await residualCount(prisma, prefix)) === 0,
      'Synthetic paid-scope cleanup left residual Item 74H records',
    );
  }
}
