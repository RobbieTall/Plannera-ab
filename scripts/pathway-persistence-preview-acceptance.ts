import { createHash } from 'node:crypto';

import { PrismaClient } from '@prisma/client';

import {
  bindPathwayArtefact,
  PathwayPersistenceError,
  persistPathwayAssessment,
  reloadPathwayAssessment,
  type PersistPathwayAssessmentInput,
} from '../src/lib/pathway-check-persistence';
import { toPathwayCustomerResult } from '../src/lib/pathway-customer-result';
import { evaluateProposalAttestation } from '../src/lib/pathway-proposal-attestation';
import { bindProposalAttestationToPathwayAssessment } from '../src/lib/pathway-proposal-assessment-binding';
import { runItem74hRealSiteBindingPreviewAcceptance } from './item74h-real-site-binding-preview';

const EXPECTED_REFS = new Set([
  'agent/item74h-pathway-check',
  'integration/item74h-resolution-20260830',
  'integration/item74h-public-da-20260830',
  'agent/item74h-evidence-refinement-20260830',
  'agent/item74h-layout-evidence-20260831',
  'agent/item74h-setback-evidence-20260831',
  'agent/item74h-customer-evidence-taxonomy-20260901',
]);
const EXPECTED_NEON_ENDPOINTS = new Set([
  'ep-misty-dream-a7l6wcp8',
  'ep-bold-shadow-a7y8j17d',
  'ep-frosty-star-a7gsaexu',
  'ep-damp-recipe-a7wm9fuq',
  'ep-rapid-shape-a72cicyh',
  'ep-late-sun-a7r48wn4',
  'ep-old-flower-a7swrkp3',
  'ep-autumn-grass-a7py7j7i',
]);

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertProtectedPreview(): void {
  assert(process.env.VERCEL === '1', 'Item 74H acceptance requires hosted Vercel execution');
  assert(
    process.env.VERCEL_ENV === 'preview',
    'Item 74H acceptance is restricted to Vercel Preview',
  );
  assert(
    EXPECTED_REFS.has(process.env.VERCEL_GIT_COMMIT_REF || ''),
    'Item 74H acceptance requires the exact protected branch',
  );
  assert(
    !['1', 'true', 'on', 'yes'].includes(
      (process.env.PLANNING_PACK_CHECKOUT_ENABLED || '').toLowerCase(),
    ),
    'Planning Controls Pack checkout must remain disabled',
  );
  assert(
    !['1', 'true', 'on', 'yes'].includes(
      (process.env.SUBMISSION_SEE_CHECKOUT_ENABLED || '').toLowerCase(),
    ),
    'Submission SEE checkout must remain disabled',
  );

  const value = process.env.DATABASE_URL;
  assert(value, 'DATABASE_URL is required in protected Preview');
  const host = new URL(value).hostname;
  assert(
    [...EXPECTED_NEON_ENDPOINTS].some((endpoint) => host.startsWith(endpoint)) &&
      host.endsWith('.neon.tech'),
    'DATABASE_URL does not target the isolated Item 74H Neon endpoint',
  );
}

function expectedBlock(error: unknown, code: string): boolean {
  return error instanceof PathwayPersistenceError && error.code === code;
}

async function cleanupFixture(prisma: PrismaClient, prefix: string): Promise<void> {
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
  await prisma.artefact.deleteMany({ where: { id: { startsWith: prefix } } });
  await prisma.siteContext.deleteMany({ where: { id: { startsWith: prefix } } });
  await prisma.project.deleteMany({ where: { id: { startsWith: prefix } } });
  await prisma.property.deleteMany({ where: { id: { startsWith: prefix } } });
  await prisma.user.deleteMany({ where: { id: { startsWith: prefix } } });
}

async function residualCount(prisma: PrismaClient, prefix: string): Promise<number> {
  const [assessments, definitions, spatial, bindings, artefacts, sites, projects, properties, users] =
    await Promise.all([
      prisma.pathwayAssessment.count({ where: { scopeKey: { startsWith: prefix } } }),
      prisma.pathwayDefinition.count({ where: { versionKey: { startsWith: prefix } } }),
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
  const [proposalAttestations, proposalBindings] = await Promise.all([
    prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS "count"
      FROM "PathwayProposalAttestation"
      WHERE "projectId" LIKE ${prefix + '%'}
    `,
    prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS "count"
      FROM "PathwayAssessmentProposalAttestation"
      WHERE "assessmentId" LIKE ${prefix + '%'}
    `,
  ]);
  return (
    assessments +
    definitions +
    spatial +
    bindings +
    artefacts +
    sites +
    projects +
    properties +
    users +
    Number(proposalAttestations[0]?.count || 0) +
    Number(proposalBindings[0]?.count || 0)
  );
}

async function runScenario(prisma: PrismaClient, runNumber: number) {
  const commit = (process.env.VERCEL_GIT_COMMIT_SHA || 'unknown').slice(0, 12);
  const prefix =
    'item74h-' + commit + '-run' + runNumber + '-' + Date.now().toString(36) + '-';
  const ids = {
    user: prefix + 'user',
    property: prefix + 'property',
    project: prefix + 'project',
    site: prefix + 'site',
    free: prefix + 'free',
    pack: prefix + 'pack',
    see: prefix + 'see',
    proposalAttestation: prefix + 'proposal-attestation',
  };
  const scopeKey = prefix + 'scope';
  const evidenceDigest = prefix + 'evidence-digest';
  const now = new Date();
  const proposalAttestation = {
    proposalPurpose:
      'NON_HABITABLE_RURAL_MACHINERY_AND_GOODS_STORAGE',
    landAreaHectares: 3.2,
    proposedBuildingFootprintSquareMetres: 96,
    existingFarmBuildingFootprintSquareMetres: 0,
    proposedBuildingHeightMetres: 4.2,
    roadSetbackMetres: 72,
    sideSetbackMetres: 24,
    otherBoundarySetbackMetres: 35,
    roadCategory: 'UNRESOLVED',
  } as const;
  const proposalEvaluation =
    evaluateProposalAttestation(proposalAttestation);
  const proposalJson = JSON.stringify(
    Object.fromEntries(
      Object.entries(proposalAttestation).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
  );
  const proposalDigest = createHash('sha256')
    .update(proposalJson)
    .digest('hex');

  await cleanupFixture(prisma, prefix);

  try {
    await prisma.user.create({
      data: {
        id: ids.user,
        email: prefix + 'preview@example.invalid',
        name: 'Item 74H synthetic Preview fixture',
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
        name: 'Item 74H synthetic pathway proof',
        title: 'Synthetic shed pathway',
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
    const proposalEvaluationJson = JSON.stringify(proposalEvaluation);
    await prisma.$executeRaw`
      INSERT INTO "PathwayProposalAttestation" (
        "id",
        "projectId",
        "environment",
        "version",
        "inputHash",
        "input",
        "evaluation",
        "trust",
        "decision",
        "paidArtefactsEligible",
        "createdAt",
        "updatedAt"
      ) VALUES (
        ${ids.proposalAttestation},
        ${ids.project},
        'PREVIEW',
        'pathway-proposal-attestation.v1',
        ${proposalDigest},
        ${proposalJson}::jsonb,
        ${proposalEvaluationJson}::jsonb,
        'USER_ATTESTED',
        'MORE_EVIDENCE_REQUIRED',
        false,
        ${now},
        ${now}
      )
    `;

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
          id: ids.free,
          projectId: ids.project,
          createdById: ids.user,
          type: 'quick_site_check',
          title: 'Synthetic free pathway',
          source: 'item74h-preview-acceptance',
          payload: { fixture: true, authoritative: false },
        },
        {
          id: ids.pack,
          projectId: ids.project,
          createdById: ids.user,
          type: 'detailed_planning_pack',
          title: 'Synthetic controls pack candidate',
          source: 'item74h-preview-acceptance',
          payload: { fixture: true, authoritative: false },
        },
        {
          id: ids.see,
          projectId: ids.project,
          createdById: ids.user,
          type: 'pre_see_planning_memo',
          title: 'Synthetic SEE candidate',
          source: 'item74h-preview-acceptance',
          payload: { fixture: true, authoritative: false },
        },
      ],
    });

    const persistenceInput: PersistPathwayAssessmentInput = {
      environment: 'PREVIEW',
      projectId: ids.project,
      siteContextId: ids.site,
      assessmentVersion: 'item74h-preview-v1',
      idempotencyKey: prefix + 'assessment-idempotency',
      scopeKey,
      inputHash: prefix + 'input-hash',
      evidenceDigest,
      decision: 'MORE_EVIDENCE_REQUIRED',
      trustLevel: 'GENERAL_GUIDANCE',
      input: {
        fixture: true,
        authoritative: false,
        lgaCode: 'BYRON',
        zoneCode: 'RU2',
        proposalType: 'SHED_OUTBUILDING',
      },
      result: {
        fixture: true,
        decision: 'MORE_EVIDENCE_REQUIRED',
        reason: 'Synthetic evidence must never unlock a paid output',
      },
      assessedAt: now,
      spatial: {
        authority: 'NSW Spatial Services',
        datasetName: 'Synthetic acceptance stand-in',
        sourceUrl:
          'https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Cadastre/MapServer',
        sourceVersion: 'synthetic-preview-v1',
        retrievedAt: now,
        contentHash: prefix + 'spatial-hash',
        matchMethod: 'SYNTHETIC',
        parcelId: 'SYNTHETIC',
        lot: 'SYNTHETIC',
        planNumber: 'SYNTHETIC',
        lgaCode: 'BYRON',
        zoneCode: 'RU2',
        payload: { fixture: true, authoritative: false },
        trustLevel: 'SITE_CONFIRMED',
      },
      definition: {
        versionKey: prefix + 'byron-ru2-shed-v1',
        lgaCode: 'BYRON',
        zoneCode: 'RU2',
        proposalType: 'SHED_OUTBUILDING',
        status: 'ACTIVE',
        effectiveFrom: now,
        graphHash: prefix + 'graph-hash',
        graph: {
          fixture: true,
          authoritative: false,
          gates: ['site', 'pathway', 'controls'],
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
          sourceReference: 'Synthetic LEP reference only',
          retrievedAt: now,
          contentHash: prefix + 'lep-hash',
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
          sourceReference: 'Synthetic DCP reference only',
          retrievedAt: now,
          contentHash: prefix + 'dcp-hash',
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
          sourceReference: 'Synthetic spatial reference only',
          retrievedAt: now,
          contentHash: prefix + 'spatial-evidence-hash',
          citation: { fixture: true },
          snapshot: { fixture: true, authoritative: false },
          isCurrentAtAssessment: true,
        },
      ],
      controls: [
        {
          controlKey: 'shed-control-unverified',
          evidenceKey: 'dcp',
          label: 'Synthetic control requiring authoritative confirmation',
          applicabilityHash: prefix + 'control-applicability',
          textValue: 'UNVERIFIED_SYNTHETIC',
          applicability: {
            fixture: true,
            lgaCode: 'BYRON',
            zoneCode: 'RU2',
            proposalType: 'SHED_OUTBUILDING',
          },
          sourceReference: 'Synthetic DCP reference only',
          contentHash: prefix + 'control-hash',
          isCurrentAtAssessment: true,
        },
      ],
      gates: [
        {
          gateKey: 'authoritative-site-evidence',
          sequence: 0,
          question: 'Is authoritative site evidence available?',
          outcome: 'MORE_EVIDENCE_REQUIRED',
          reason: 'The fixture is deliberately synthetic and cannot establish a site fact.',
          condition: { fixture: true, resolved: false },
          evidenceRefs: ['spatial'],
          controlRefs: [],
        },
      ],
    };

    const first = await persistPathwayAssessment(prisma, persistenceInput);
    const replay = await persistPathwayAssessment(prisma, persistenceInput);
    const loaded = await reloadPathwayAssessment(prisma, first.assessment.id);
    const firstProposalBinding =
      await bindProposalAttestationToPathwayAssessment(prisma, {
        assessmentId: first.assessment.id,
        projectId: ids.project,
      });
    const replayedProposalBinding =
      await bindProposalAttestationToPathwayAssessment(prisma, {
        assessmentId: first.assessment.id,
        projectId: ids.project,
      });
    assert(
      !firstProposalBinding.replayed && replayedProposalBinding.replayed,
      'Proposal-to-assessment binding must replay idempotently',
    );
    assert(
      firstProposalBinding.binding.bindingHash ===
        replayedProposalBinding.binding.bindingHash,
      'Proposal-to-assessment replay changed the binding',
    );
    const proposalRows = await prisma.$queryRaw<
      Array<{
        input: unknown;
        trust: string;
        decision: string;
        paidArtefactsEligible: boolean;
      }>
    >`
      SELECT
        proposal."input",
        binding."trust",
        binding."decision",
        binding."paidArtefactsEligible"
      FROM "PathwayAssessmentProposalAttestation" binding
      INNER JOIN "PathwayProposalAttestation" proposal
        ON proposal."id" = binding."proposalAttestationId"
      WHERE binding."assessmentId" = ${first.assessment.id}
      LIMIT 1
    `;
    const customerResult = toPathwayCustomerResult(
      {
        ...loaded,
        proposalAttestation: proposalRows[0] ?? null,
      },
      now,
    );

    assert(
      customerResult.status === 'available',
      'Reloaded assessment did not produce a customer pathway result',
    );
    assert(
      customerResult.proposal?.trust === 'USER_ATTESTED' &&
        customerResult.proposal.landAreaHectares === 3.2 &&
        customerResult.proposal.proposedBuildingFootprintSquareMetres === 96 &&
        customerResult.proposal.proposedBuildingHeightMetres === 4.2 &&
        customerResult.proposal.roadSetbackMetres === 72 &&
        customerResult.proposal.sideSetbackMetres === 24 &&
        customerResult.proposal.otherBoundarySetbackMetres === 35 &&
        customerResult.proposal.paidEligibilityUnlocked === false,
      'Bound user proposal was not rendered with its evidence boundary',
    );
    assert(
      customerResult.decision === 'MORE_EVIDENCE_REQUIRED',
      'Customer pathway decision must remain evidence-blocked',
    );
    assert(
      customerResult.gates.length === 1 &&
        customerResult.gates[0].outcome === 'MORE_EVIDENCE_REQUIRED',
      'Customer pathway lost the persisted unresolved gate',
    );
    assert(
      customerResult.evidenceChecklist.map((item) => item.id).join('|') ===
        'authoritative-road-classification|reviewed-site-measurements|gate-0',
      'Reloaded customer pathway lost its deterministic evidence checklist',
    );
    assert(
      customerResult.commercial.planningControlsPackEligible === false &&
        customerResult.commercial.submissionSeeEligible === false &&
        customerResult.commercial.productionCheckoutEnabled === false,
      'Customer pathway must keep all paid products and Production checkout blocked',
    );
    assert(
      customerResult.privacy.rawAddressReturned === false &&
        customerResult.privacy.coordinatesReturned === false &&
        customerResult.privacy.parcelIdentifiersReturned === false &&
        customerResult.privacy.rawSpatialPayloadReturned === false &&
        customerResult.privacy.evidenceDigestsReturned === false,
      'Customer pathway privacy projection is incomplete',
    );

    assert(!first.replayed, 'First persistence must create one assessment');
    assert(replay.replayed, 'Second persistence must be an idempotent replay');
    assert(
      replay.assessment.id === first.assessment.id,
      'Replay must return the original assessment ID',
    );
    assert(
      (await prisma.pathwayAssessment.count({
        where: { idempotencyKey: persistenceInput.idempotencyKey },
      })) === 1,
      'Replay must leave exactly one assessment',
    );
    assert(loaded.spatialProvenance.contentHash === persistenceInput.spatial.contentHash,
      'Reload lost spatial provenance');
    assert(loaded.pathwayDefinition.graphHash === persistenceInput.definition.graphHash,
      'Reload lost graph provenance');
    assert(loaded.evidenceSnapshots.length === 3, 'Reload lost evidence snapshots');
    assert(loaded.controlSnapshots.length === 1, 'Reload lost control snapshots');
    assert(loaded.gateSnapshots.length === 1, 'Reload lost gate snapshots');

    let unsafeProceedBlocked = false;
    try {
      await persistPathwayAssessment(prisma, {
        ...persistenceInput,
        idempotencyKey: prefix + 'unsafe-proceed',
        decision: 'PROCEED',
        trustLevel: 'EVIDENCE_VERIFIED',
        gates: [
          {
            ...persistenceInput.gates[0],
            outcome: 'PROCEED',
            reason: 'Deliberately invalid synthetic proceed attempt',
          },
        ],
      });
    } catch (error) {
      unsafeProceedBlocked = expectedBlock(error, 'UNVERIFIED_SPATIAL');
    }
    assert(unsafeProceedBlocked, 'Synthetic spatial evidence must not persist PROCEED');
    assert(
      (await prisma.pathwayAssessment.count({
        where: { idempotencyKey: prefix + 'unsafe-proceed' },
      })) === 0,
      'Rejected PROCEED must not write a row',
    );

    const free = await bindPathwayArtefact(prisma, {
      assessmentId: first.assessment.id,
      artefactId: ids.free,
      commercialStage: 'FREE_PATHWAY_CHECK',
      scopeKey,
      evidenceDigest,
    });
    const freeReplay = await bindPathwayArtefact(prisma, {
      assessmentId: first.assessment.id,
      artefactId: ids.free,
      commercialStage: 'FREE_PATHWAY_CHECK',
      scopeKey,
      evidenceDigest,
    });
    assert(!free.replayed && freeReplay.replayed, 'Free binding replay must be idempotent');
    assert(
      free.binding.id === freeReplay.binding.id,
      'Free binding replay must return the original binding',
    );

    const deniedStages: string[] = [];
    for (const [artefactId, commercialStage] of [
      [ids.pack, 'PLANNING_CONTROLS_PACK'],
      [ids.see, 'SUBMISSION_SEE'],
    ] as const) {
      try {
        await bindPathwayArtefact(prisma, {
          assessmentId: first.assessment.id,
          artefactId,
          commercialStage,
          scopeKey,
          evidenceDigest,
        });
      } catch (error) {
        if (expectedBlock(error, 'PAID_OUTPUT_BLOCKED')) deniedStages.push(commercialStage);
      }
    }
    assert(deniedStages.length === 2, 'Both paid output stages must remain blocked');

    return {
      runNumber,
      decision: first.assessment.decision,
      assessmentCreatedOnce: true,
      replayReturnedSameAssessment: true,
      reloadPreservedSpatialDefinitionEvidenceControlsAndGates: true,
      customerResultRenderedFromReload: true,
      customerChecklistRenderedFromReload: true,
      proposalAttestationBoundAndRendered: true,
      proposalBindingReplaySafe: true,
      customerResultPaidProductsBlocked: true,
      customerResultPrivacyRedacted: true,
      unsafeProceedBlockedWithoutWrite: true,
      freeBindingReplaySafe: true,
      paidPackBlocked: deniedStages.includes('PLANNING_CONTROLS_PACK'),
      paidSeeBlocked: deniedStages.includes('SUBMISSION_SEE'),
    };
  } finally {
    await cleanupFixture(prisma, prefix);
    assert(
      (await residualCount(prisma, prefix)) === 0,
      'Synthetic cleanup left residual Item 74H records',
    );
  }
}

async function main(): Promise<void> {
  if (process.env.VERCEL === '1' && process.env.VERCEL_ENV === 'production') {
    console.log(
      JSON.stringify({
        acceptance: 'item74h-preview-persistence',
        phase: 'disabled',
        passed: true,
        reason: 'preview_only_acceptance',
        productionCheckoutEnabled: false,
        productionMutationPerformed: false,
      }),
    );
    return;
  }

  assertProtectedPreview();
  const prisma = new PrismaClient();
  try {
    const runs = [
      await runScenario(prisma, 1),
      await runScenario(prisma, 2),
    ];
    const realSiteCommercialBinding =
      await runItem74hRealSiteBindingPreviewAcceptance(prisma);
    console.log(
      JSON.stringify({
        acceptance: 'item74h-preview-persistence',
        passed: true,
        executions: runs.length,
        runs,
        realSiteCommercialBinding,
        cleanupResidualRows: 0,
        productionCheckoutEnabled: false,
        productionMutationPerformed: false,
      }),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      acceptance: 'item74h-preview-persistence',
      passed: false,
      error:
        error instanceof PathwayPersistenceError
          ? { code: error.code, message: error.message }
          : error instanceof Error
            ? { message: error.message }
            : { message: 'Unknown acceptance error' },
      productionCheckoutEnabled: false,
      productionMutationPerformed: false,
    }),
  );
  process.exitCode = 1;
});