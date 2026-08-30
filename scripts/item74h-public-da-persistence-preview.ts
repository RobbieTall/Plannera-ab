import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

import { PrismaClient } from '@prisma/client';

import { toPathwayCustomerResult } from '../src/lib/pathway-customer-result';

import {
  bindPathwayArtefact,
  PathwayPersistenceError,
  persistPathwayAssessment,
  reloadPathwayAssessment,
  type PathwayControlInput,
  type PersistPathwayAssessmentInput,
} from '../src/lib/pathway-check-persistence';

const EXPECTED_REFS = new Set([
  'agent/item74h-pathway-check',
  'integration/item74h-resolution-20260830',
  'integration/item74h-public-da-20260830',
  'agent/item74h-evidence-refinement-20260830',
]);
const EXPECTED_NEON_ENDPOINTS = new Set([
  'ep-misty-dream-a7l6wcp8',
  'ep-bold-shadow-a7y8j17d',
  'ep-frosty-star-a7gsaexu',
  'ep-damp-recipe-a7wm9fuq',
]);
const ENABLE_FLAG = 'ITEM74H_PUBLIC_DA_ACCEPTANCE_ENABLED';
const PUBLIC_DA_TRACKER_URL =
  'https://datracker.byron.nsw.gov.au/MasterViewUI-External/Application/ApplicationDetails/010.2025.00000535.001/';
const PUBLIC_DA_ADDRESS = '870 Wilsons Creek Road, Wilsons Creek NSW';
const PUBLIC_DA_REVIEW_VERSION =
  'item74h-public-da-reviewed-outcome.v2' as const;
const MAX_PREFLIGHT_OUTPUT_BYTES = 512_000;
const SPATIAL_SOURCE_URL =
  'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer/2';

type ControlledPreflight = {
  acceptance: 'item74h-controlled-address-preflight';
  phase: 'read_only_preflight';
  passed: true;
  result: 'MORE_EVIDENCE_REQUIRED';
  addressFingerprint: string;
  providerIdentifierHash: string;
  spatialFeatureHash: string;
  siteEvidenceDigest: string;
  lga: 'BYRON';
  instrument: 'Byron Local Environmental Plan 2014';
  zone: 'RU2';
  zoneName: 'Rural Landscape';
  proposalType: 'SHED_OUTBUILDING';
  repositoryEvidence: {
    lep: {
      title: string;
      sourceUrl: string;
      syncedAt: string;
      clauseCount: number;
      ru2ObjectiveCount: number;
      ru2LandUseCount: number;
    };
    dcp: {
      title: string;
      sourceUrl: string;
      checkedAt: string;
      candidateCount: number;
      candidateReferenceHashes: string[];
    };
  };
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function enabled(value: string | undefined): boolean {
  return ['1', 'true', 'on', 'yes'].includes((value || '').toLowerCase());
}

function assertProtectedPreview(): void {
  assert(process.env.VERCEL === '1', 'Controlled persistence requires hosted Vercel execution');
  assert(
    process.env.VERCEL_ENV === 'preview',
    'Controlled persistence is restricted to Vercel Preview',
  );
  assert(
    EXPECTED_REFS.has(process.env.VERCEL_GIT_COMMIT_REF ?? ''),
    'Controlled persistence requires the exact protected branch',
  );
  assert(
    !enabled(process.env.PLANNING_PACK_CHECKOUT_ENABLED),
    'Planning Controls Pack checkout must remain disabled',
  );
  assert(
    !enabled(process.env.SUBMISSION_SEE_CHECKOUT_ENABLED),
    'Submission SEE checkout must remain disabled',
  );
  const value = process.env.DATABASE_URL;
  assert(value, 'DATABASE_URL is required in protected Preview');
  const host = new URL(value).hostname;
  assert(
    [...EXPECTED_NEON_ENDPOINTS].some((endpoint) => host.startsWith(endpoint)) && host.endsWith('.neon.tech'),
    'DATABASE_URL does not target the isolated Item 74H Neon endpoint',
  );
}

function canonicalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = canonicalize((value as Record<string, unknown>)[key]);
        return result;
      }, {});
  }
  return value;
}

function digest(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(value)))
    .digest('hex');
}

function isSha256(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}

function isAddressFingerprint(value: unknown): value is string {
  return typeof value === 'string' && /^sha256:[a-f0-9]{12}$/.test(value);
}

function addDays(value: Date, days: number): Date {
  return new Date(value.getTime() + days * 24 * 60 * 60 * 1000);
}

function sourceUrlFromMeta(value: unknown, fallback: string): string {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const sourceUrl = (value as Record<string, unknown>).sourceUrl;
    if (typeof sourceUrl === 'string' && sourceUrl.startsWith('https://')) {
      return sourceUrl;
    }
  }
  return fallback;
}

function expectedBlock(error: unknown, code: string): boolean {
  return error instanceof PathwayPersistenceError && error.code === code;
}

const SAFE_PREFLIGHT_FAILURES = [
  ['GOOGLE_MAPS_API_KEY is required', 'GEOCODING_CREDENTIAL_MISSING'],
  ['Protected geocoding did not return OK', 'GEOCODING_REQUEST_FAILED'],
  ['Controlled address must resolve to exactly one result', 'ADDRESS_CARDINALITY_FAILED'],
  ['Controlled address did not resolve to Byron LEP 2014', 'INSTRUMENT_MISMATCH'],
  ['Controlled address did not resolve to RU2', 'ZONE_MISMATCH'],
  [
    'DATABASE_URL does not target the isolated Item 74H Neon endpoint',
    'DATABASE_SCOPE_MISMATCH',
  ],
  ['fetch failed', 'NETWORK_REQUEST_FAILED'],
  ['ERR_MODULE_NOT_FOUND', 'RUNNER_MISSING'],
] as const;

function classifyPreflightFailure(rawStderr: string): string {
  for (const [needle, code] of SAFE_PREFLIGHT_FAILURES) {
    if (rawStderr.includes(needle)) return code;
  }
  return 'UNCLASSIFIED_FAILURE';
}

async function runRedactedPreflight(): Promise<ControlledPreflight> {
  const executable = resolve(process.cwd(), 'node_modules/.bin/tsx');
  const scriptPath = resolve(
    process.cwd(),
    'scripts/item74h-controlled-address-preflight.ts',
  );

  const output = await new Promise<string>((resolveOutput, rejectOutput) => {
    const child = spawn(executable, [scriptPath], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ITEM74H_CONTROLLED_ADDRESS_ACCEPTANCE: 'true',
        ITEM74H_CONTROLLED_ADDRESS: PUBLIC_DA_ADDRESS,
      },
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let settled = false;

    const rejectOnce = (message: string) => {
      if (settled) return;
      settled = true;
      rejectOutput(new Error(message));
    };

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
      if (Buffer.byteLength(stdout, 'utf8') > MAX_PREFLIGHT_OUTPUT_BYTES) {
        child.kill('SIGTERM');
        rejectOnce('Controlled preflight output exceeded the redacted size limit');
      }
    });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
      if (Buffer.byteLength(stderr, 'utf8') > MAX_PREFLIGHT_OUTPUT_BYTES) {
        child.kill('SIGTERM');
        rejectOnce('Controlled preflight error output exceeded the size limit');
      }
    });
    child.on('error', () => rejectOnce('Controlled preflight could not start'));
    child.on('close', (code) => {
      if (settled) return;
      if (code !== 0) {
        rejectOnce(
          'Controlled preflight failed closed: ' + classifyPreflightFailure(stderr),
        );
        return;
      }
      settled = true;
      resolveOutput(stdout);
    });
  });

  const lines = output.trim().split(/\r?\n/).reverse();
  let parsed: unknown;
  for (const line of lines) {
    try {
      const candidate = JSON.parse(line);
      if (candidate?.acceptance === 'item74h-controlled-address-preflight') {
        parsed = candidate;
        break;
      }
    } catch {
      // Ignore non-JSON command output without echoing it.
    }
  }

  assert(parsed && typeof parsed === 'object', 'Controlled preflight result was missing');
  const result = parsed as Partial<ControlledPreflight>;
  assert(result.passed === true, 'Controlled preflight did not pass');
  assert(result.phase === 'read_only_preflight', 'Controlled preflight phase was invalid');
  assert(
    result.result === 'MORE_EVIDENCE_REQUIRED',
    'Controlled preflight must remain evidence-blocked',
  );
  assert(result.lga === 'BYRON', 'Controlled preflight LGA was not Byron');
  assert(result.zone === 'RU2', 'Controlled preflight zone was not RU2');
  assert(
    result.instrument === 'Byron Local Environmental Plan 2014',
    'Controlled preflight instrument was not Byron LEP 2014',
  );
  assert(
    result.proposalType === 'SHED_OUTBUILDING',
    'Controlled preflight proposal type was invalid',
  );
  assert(
    isAddressFingerprint(result.addressFingerprint),
    'Controlled preflight address fingerprint was invalid',
  );
  assert(
    isSha256(result.providerIdentifierHash),
    'Controlled preflight provider hash was invalid',
  );
  assert(
    isSha256(result.spatialFeatureHash),
    'Controlled preflight spatial hash was invalid',
  );
  assert(
    isSha256(result.siteEvidenceDigest),
    'Controlled preflight evidence digest was invalid',
  );
  assert(result.repositoryEvidence?.lep, 'Controlled LEP evidence was missing');
  assert(result.repositoryEvidence?.dcp, 'Controlled DCP evidence was missing');
  assert(
    Array.isArray(result.repositoryEvidence.dcp.candidateReferenceHashes) &&
      result.repositoryEvidence.dcp.candidateReferenceHashes.length > 0,
    'Controlled DCP retrieval evidence was missing',
  );
  return result as ControlledPreflight;
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
  return (
    assessments +
    definitions +
    spatial +
    bindings +
    artefacts +
    sites +
    projects +
    properties +
    users
  );
}

function makeControl(
  seed: Omit<PathwayControlInput, 'applicabilityHash' | 'contentHash'>,
): PathwayControlInput {
  const applicabilityHash = digest(seed.applicability);
  return {
    ...seed,
    applicabilityHash,
    contentHash: digest({
      controlKey: seed.controlKey,
      label: seed.label,
      operator: seed.operator,
      numericValue: seed.numericValue,
      lowerBound: seed.lowerBound,
      upperBound: seed.upperBound,
      textValue: seed.textValue,
      unit: seed.unit,
      landAreaMinSqm: seed.landAreaMinSqm,
      landAreaMaxSqm: seed.landAreaMaxSqm,
      applicability: seed.applicability,
      sourceReference: seed.sourceReference,
    }),
  };
}

async function runControlledPersistence(
  prisma: PrismaClient,
  preflight: ControlledPreflight,
) {
  const commit = (process.env.VERCEL_GIT_COMMIT_SHA || 'unknown').slice(0, 12);
  const prefix = 'item74h-public-da-persisted-' + commit + '-' + Date.now().toString(36) + '-';
  const ids = {
    user: prefix + 'user',
    property: prefix + 'property',
    project: prefix + 'project',
    site: prefix + 'site',
    free: prefix + 'free',
    pack: prefix + 'pack',
    see: prefix + 'see',
  };
  const redactedAddress = 'REDACTED PUBLIC DA ADDRESS ' + preflight.addressFingerprint;
  const now = new Date();
  const publicDaObservedAt = new Date('2026-08-30T00:00:00.000Z');
  const publicDaStaleAt = new Date('2026-09-30T00:00:00.000Z');
  const publicDaCatalog = {
    authority: 'BYRON_SHIRE_COUNCIL',
    applicationNumber: '10.2025.535.1',
  } as const;
  const reviewedPublicDa = {
    version: PUBLIC_DA_REVIEW_VERSION,
    applicationNumber: publicDaCatalog.applicationNumber,
    addressFingerprint: preflight.addressFingerprint,
    lotReference: 'Lot 11 DP 1225487',
    determination: {
      status: 'APPROVED',
      determinedAt: '2026-06-01T00:00:00.000Z',
      proposal: 'NEW_FARM_MACHINERY_SHED',
    },
    officialRecords: [
      { recordNumber: 'E2025/131541', role: 'ROAD_AUTHORITY_EVIDENCE' },
      { recordNumber: 'E2025/131546', role: 'DETAIL_SURVEY' },
      { recordNumber: 'E2026/59935', role: 'STAMPED_APPROVED_PLANS' },
      { recordNumber: 'E2026/60560', role: 'DETERMINATION' },
    ],
    confirmedFacts: [
      { key: 'SHED_FOOTPRINT_SQM', value: 200, pageRef: 'E2026/59935 page-9' },
      { key: 'SHED_HEIGHT_M', value: 5.996, pageRef: 'E2026/59935 page-9' },
      { key: 'LOT_AREA_HA', value: 39.47, pageRef: 'E2025/131546 page-1' },
      {
        key: 'ROAD_AUTHORITY',
        value: 'BYRON_SHIRE_COUNCIL_SECTION_138',
        pageRef: 'E2025/131541 page-2',
      },
      {
        key: 'ROAD_CLASSIFICATION',
        value: 'OTHER_ROAD',
        pageRef: 'TfNSW complete schedule and current categorisation dataset checked 2026-08-30',
        sourceUrl:
          'https://www.transport.nsw.gov.au/system/files/media/documents/2023/classified-roads-schedule-1.pdf',
      },
    ],
    missingEvidence: [
      'REGISTERED_CADASTRAL_SURVEY',
      'ROAD_SETBACK_M',
      'SIDE_SETBACK_M',
      'REAR_SETBACK_M',
    ],
    decision: 'MORE_EVIDENCE_REQUIRED',
    freePathwayCheckAvailable: true,
    planningControlsPackEligible: false,
    submissionSeeEligible: false,
    rawAddressRetained: false,
    directDownloadTokensRetained: false,
  } as const;
  const publicDaAssessment = {
    status: 'REVIEWED_MORE_EVIDENCE_REQUIRED',
    catalogDigest: digest(reviewedPublicDa),
    redactedSummary: {
      documentCount: reviewedPublicDa.officialRecords.length,
      proposalKind: 'FARM_SHED',
      acceptedRoles: reviewedPublicDa.officialRecords.map((item) => item.role),
    },
  } as const;
  assert(
    publicDaAssessment.catalogDigest.length === 64 &&
      reviewedPublicDa.decision === 'MORE_EVIDENCE_REQUIRED' &&
      reviewedPublicDa.planningControlsPackEligible === false &&
      reviewedPublicDa.submissionSeeEligible === false,
    'Reviewed public DA outcome was not safely evidence-blocked',
  );

  await cleanupFixture(prisma, prefix);

  try {
    const [lep, codes] = await Promise.all([
      prisma.instrument.findUnique({ where: { slug: 'byron-lep-2014' } }),
      prisma.instrument.findUnique({
        where: { slug: 'sepp-exempt-complying-2008' },
      }),
    ]);
    assert(lep?.sourceUrl && lep.lastSyncedAt, 'Current Byron LEP source was missing');
    assert(codes?.sourceUrl && codes.lastSyncedAt, 'Current Codes SEPP source was missing');
    assert(
      lep.sourceUrl === preflight.repositoryEvidence.lep.sourceUrl,
      'Controlled LEP source conflicted with repository evidence',
    );

    const dcpRefs = ['D2.2.2', 'D2.2.3', 'D2.7', 'D2.7.2'];
    const codeKeys = [
      'SEPP_EXEMPT_COMPLYING_2008_2_31',
      'SEPP_EXEMPT_COMPLYING_2008_2_32',
      'SEPP_EXEMPT_COMPLYING_2008_3D_54',
      'SEPP_EXEMPT_COMPLYING_2008_3D_56',
      'SEPP_EXEMPT_COMPLYING_2008_3D_57',
      'SEPP_EXEMPT_COMPLYING_2008_3D_58',
      'SEPP_EXEMPT_COMPLYING_2008_3D_59',
    ];

    const [dcpClauses, codeClauses, landUses, objectives] = await Promise.all([
      prisma.dCPClause.findMany({
        where: {
          lgaCode: 'BYRON',
          instrumentSlug: 'byron-dcp-2014',
          ref: { in: dcpRefs },
        },
      }),
      prisma.clause.findMany({
        where: {
          instrumentId: codes.id,
          clauseKey: { in: codeKeys },
          isCurrent: true,
        },
      }),
      prisma.lepZoneLandUse.findMany({
        where: { instrumentId: lep.id, zoneCode: 'RU2' },
        orderBy: [{ permission: 'asc' }, { description: 'asc' }],
      }),
      prisma.lepZoneObjective.findMany({
        where: { instrumentId: lep.id, zoneCode: 'RU2' },
        orderBy: { objective: 'asc' },
      }),
    ]);

    assert(dcpClauses.length === dcpRefs.length, 'Required Byron DCP clauses were incomplete');
    assert(codeClauses.length === codeKeys.length, 'Required Codes SEPP clauses were incomplete');
    assert(landUses.length === 61, 'Byron RU2 land-use projection was incomplete');
    assert(objectives.length === 5, 'Byron RU2 objectives were incomplete');
    assert(
      landUses.some(
        (item) =>
          item.description === 'Farm buildings' &&
          String(item.permission) === 'WITH_CONSENT',
      ),
      'Byron RU2 farm-building permission was not WITH_CONSENT',
    );

    const dcpByRef = new Map(dcpClauses.map((item) => [item.ref, item]));
    const codeByKey = new Map(codeClauses.map((item) => [item.clauseKey, item]));
    const primaryDcp = dcpByRef.get('D2.7.2');
    const primaryCode = codeByKey.get('SEPP_EXEMPT_COMPLYING_2008_2_32');
    assert(primaryDcp, 'Primary Byron shed clause was missing');
    assert(primaryCode, 'Primary Codes SEPP farm-building clause was missing');

    const dcpSourceUrl = sourceUrlFromMeta(
      primaryDcp.numericMeta,
      preflight.repositoryEvidence.dcp.sourceUrl,
    );
    const dcpRetrievedAt = new Date(
      Math.max(...dcpClauses.map((item) => item.updatedAt.getTime())),
    );
    const codesRetrievedTimes = codeClauses.map((item) => {
      if (!item.retrievedAt) {
        throw new Error('Codes SEPP clause is missing retrievedAt provenance.');
      }
      return item.retrievedAt.getTime();
    });
    const codesRetrievedAt = new Date(Math.max(...codesRetrievedTimes));
    const lepStaleAt = addDays(lep.lastSyncedAt, 90);
    const dcpStaleAt = addDays(dcpRetrievedAt, 90);
    const codesStaleAt = addDays(codes.lastSyncedAt, 90);
    const spatialStaleAt = addDays(now, 30);
    const assessmentStaleAt = new Date(
      Math.min(
        lepStaleAt.getTime(),
        dcpStaleAt.getTime(),
        codesStaleAt.getTime(),
        spatialStaleAt.getTime(),
      ),
    );

    const lepHash = digest({
      slug: lep.slug,
      sourceUrl: lep.sourceUrl,
      lastSyncedAt: lep.lastSyncedAt,
      landUses: landUses.map((item) => ({
        permission: String(item.permission),
        description: item.description,
      })),
      objectives: objectives.map((item) => item.objective),
    });
    const dcpHash = digest(
      dcpClauses
        .map((item) => {
          if (!item.ref) {
            throw new Error('Byron DCP clause is missing its source reference.');
          }
          return {
            ref: item.ref,
            title: item.title,
            bodyText: item.bodyText,
            sourceUrl: sourceUrlFromMeta(item.numericMeta, dcpSourceUrl),
          };
        })
        .sort((a, b) => a.ref.localeCompare(b.ref)),
    );
    const codesHash = digest(
      codeClauses
        .map((item) => ({
          clauseKey: item.clauseKey,
          title: item.title,
          contentHash: item.contentHash,
          bodyText: item.bodyText,
        }))
        .sort((a, b) => a.clauseKey.localeCompare(b.clauseKey)),
    );
    const evidenceDigest = digest({
      controlledSiteEvidence: preflight.siteEvidenceDigest,
      spatialFeature: preflight.spatialFeatureHash,
      lep: lepHash,
      dcp: dcpHash,
      codes: codesHash,
      publicDaCatalog: publicDaAssessment.catalogDigest,
    });

    const controls: PathwayControlInput[] = [
      makeControl({
        controlKey: 'lep-farm-building-permission',
        evidenceKey: 'lep',
        label: 'RU2 farm buildings require consent unless another lawful pathway applies',
        operator: 'EQUALS',
        textValue: 'WITH_CONSENT',
        applicability: {
          lgaCode: 'BYRON',
          zoneCode: 'RU2',
          landUse: 'Farm buildings',
        },
        sourceReference: 'Byron LEP 2014 RU2 Land Use Table',
        isCurrentAtAssessment: true,
        staleAt: lepStaleAt,
      }),
      makeControl({
        controlKey: 'dcp-classified-road-setback',
        evidenceKey: 'dcp',
        label: 'Minimum classified-road boundary setback',
        operator: 'MIN',
        numericValue: 55,
        unit: 'm',
        applicability: {
          roadClass: 'CLASSIFIED',
          unresolvedForControlledSite: true,
        },
        sourceReference: 'Byron DCP 2014 D2.2.2',
        isCurrentAtAssessment: true,
        staleAt: dcpStaleAt,
      }),
      makeControl({
        controlKey: 'dcp-other-road-setback',
        evidenceKey: 'dcp',
        label: 'Minimum other-road boundary setback',
        operator: 'MIN',
        numericValue: 15,
        unit: 'm',
        applicability: {
          roadClass: 'OTHER',
          unresolvedForControlledSite: true,
        },
        sourceReference: 'Byron DCP 2014 D2.2.2',
        isCurrentAtAssessment: true,
        staleAt: dcpStaleAt,
      }),
      makeControl({
        controlKey: 'dcp-farm-shed-use',
        evidenceKey: 'dcp',
        label: 'Farm sheds must serve rural activity and must not be separately habitable',
        operator: 'EQUALS',
        textValue: 'RURAL_ACTIVITY_NON_HABITABLE',
        applicability: {
          proposalType: 'SHED_OUTBUILDING',
          useUnconfirmed: true,
        },
        sourceReference: 'Byron DCP 2014 D2.7 and D2.7.2',
        isCurrentAtAssessment: true,
        staleAt: dcpStaleAt,
      }),
      makeControl({
        controlKey: 'exempt-individual-footprint',
        evidenceKey: 'codes',
        label: 'Exempt farm-building maximum individual footprint',
        operator: 'MAX',
        numericValue: 200,
        unit: 'sqm',
        applicability: {
          pathway: 'EXEMPT',
          proposalUse: 'FARM_BUILDING',
          useUnconfirmed: true,
        },
        sourceReference: 'Codes SEPP 2008 clause 2.32(1)(d)',
        isCurrentAtAssessment: true,
        staleAt: codesStaleAt,
      }),
      makeControl({
        controlKey: 'exempt-height-under-10ha',
        evidenceKey: 'codes',
        label: 'Exempt farm-building maximum height below 10 ha',
        operator: 'MAX',
        numericValue: 7,
        unit: 'm',
        landAreaMaxSqm: 100000,
        applicability: {
          pathway: 'EXEMPT',
          landholdingAreaKnown: false,
        },
        sourceReference: 'Codes SEPP 2008 clause 2.32(1)(a)(i)',
        isCurrentAtAssessment: true,
        staleAt: codesStaleAt,
      }),
      makeControl({
        controlKey: 'exempt-height-10ha-plus',
        evidenceKey: 'codes',
        label: 'Exempt farm-building maximum height from 10 ha',
        operator: 'MAX',
        numericValue: 10,
        unit: 'm',
        landAreaMinSqm: 100000,
        applicability: {
          pathway: 'EXEMPT',
          landholdingAreaKnown: false,
        },
        sourceReference: 'Codes SEPP 2008 clause 2.32(1)(a)(ii)',
        isCurrentAtAssessment: true,
        staleAt: codesStaleAt,
      }),
      makeControl({
        controlKey: 'exempt-road-setback',
        evidenceKey: 'codes',
        label: 'Exempt farm-building minimum road-boundary setback',
        operator: 'MIN',
        numericValue: 20,
        unit: 'm',
        applicability: {
          pathway: 'EXEMPT',
          measuredSetbackKnown: false,
        },
        sourceReference: 'Codes SEPP 2008 clause 2.32(1)(f)',
        isCurrentAtAssessment: true,
        staleAt: codesStaleAt,
      }),
      makeControl({
        controlKey: 'exempt-side-rear-setback-0-100',
        evidenceKey: 'codes',
        label: 'Exempt side/rear setback for footprint up to 100 sqm',
        operator: 'MIN',
        numericValue: 10,
        unit: 'm',
        lowerBound: 0,
        upperBound: 100,
        applicability: {
          pathway: 'EXEMPT',
          footprintKnown: false,
        },
        sourceReference: 'Codes SEPP 2008 clause 2.32(1)(f)',
        isCurrentAtAssessment: true,
        staleAt: codesStaleAt,
      }),
      makeControl({
        controlKey: 'exempt-side-rear-setback-100-200',
        evidenceKey: 'codes',
        label: 'Exempt side/rear setback for footprint over 100 sqm',
        operator: 'MIN',
        numericValue: 50,
        unit: 'm',
        lowerBound: 100,
        upperBound: 200,
        applicability: {
          pathway: 'EXEMPT',
          footprintKnown: false,
        },
        sourceReference: 'Codes SEPP 2008 clause 2.32(1)(f)',
        isCurrentAtAssessment: true,
        staleAt: codesStaleAt,
      }),
      makeControl({
        controlKey: 'exempt-waterbody-setback',
        evidenceKey: 'codes',
        label: 'Exempt minimum natural-waterbody setback',
        operator: 'MIN',
        numericValue: 50,
        unit: 'm',
        applicability: {
          pathway: 'EXEMPT',
          waterbodyDistanceKnown: false,
        },
        sourceReference: 'Codes SEPP 2008 clause 2.32(1)(h)',
        isCurrentAtAssessment: true,
        staleAt: codesStaleAt,
      }),
      makeControl({
        controlKey: 'cdc-minimum-lot-area',
        evidenceKey: 'codes',
        label: 'Rural Housing Code minimum lot area for a farm building',
        operator: 'MIN',
        numericValue: 4000,
        unit: 'sqm',
        applicability: {
          pathway: 'COMPLYING',
          landholdingAreaKnown: false,
        },
        sourceReference: 'Codes SEPP 2008 clause 3D.54',
        isCurrentAtAssessment: true,
        staleAt: codesStaleAt,
      }),
      makeControl({
        controlKey: 'cdc-footprint-4000-400000',
        evidenceKey: 'codes',
        label: 'Complying farm-building maximum footprint from 4,000 sqm to 40 ha',
        operator: 'MAX',
        numericValue: 200,
        unit: 'sqm',
        landAreaMinSqm: 4000,
        landAreaMaxSqm: 400000,
        applicability: {
          pathway: 'COMPLYING',
          landholdingAreaKnown: false,
        },
        sourceReference: 'Codes SEPP 2008 clause 3D.57',
        isCurrentAtAssessment: true,
        staleAt: codesStaleAt,
      }),
      makeControl({
        controlKey: 'cdc-footprint-400000-1000000',
        evidenceKey: 'codes',
        label: 'Complying farm-building maximum footprint over 40 ha to 100 ha',
        operator: 'MAX',
        numericValue: 500,
        unit: 'sqm',
        landAreaMinSqm: 400000,
        landAreaMaxSqm: 1000000,
        applicability: {
          pathway: 'COMPLYING',
          landholdingAreaKnown: false,
        },
        sourceReference: 'Codes SEPP 2008 clause 3D.57',
        isCurrentAtAssessment: true,
        staleAt: codesStaleAt,
      }),
      makeControl({
        controlKey: 'cdc-footprint-over-100ha',
        evidenceKey: 'codes',
        label: 'Complying farm-building maximum footprint over 100 ha',
        operator: 'MAX',
        numericValue: 1200,
        unit: 'sqm',
        landAreaMinSqm: 1000000,
        applicability: {
          pathway: 'COMPLYING',
          landholdingAreaKnown: false,
        },
        sourceReference: 'Codes SEPP 2008 clause 3D.57',
        isCurrentAtAssessment: true,
        staleAt: codesStaleAt,
      }),
      makeControl({
        controlKey: 'cdc-ru2-road-setback',
        evidenceKey: 'codes',
        label: 'Complying RU2 minimum primary, secondary or parallel road setback',
        operator: 'MIN',
        numericValue: 50,
        unit: 'm',
        applicability: {
          pathway: 'COMPLYING',
          zoneCode: 'RU2',
          measuredSetbackKnown: false,
        },
        sourceReference: 'Codes SEPP 2008 clause 3D.59(1)',
        isCurrentAtAssessment: true,
        staleAt: codesStaleAt,
      }),
      makeControl({
        controlKey: 'cdc-waterbody-setback',
        evidenceKey: 'codes',
        label: 'Complying minimum natural-waterbody setback',
        operator: 'MIN',
        numericValue: 50,
        unit: 'm',
        applicability: {
          pathway: 'COMPLYING',
          waterbodyDistanceKnown: false,
        },
        sourceReference: 'Codes SEPP 2008 clause 3D.59(5)',
        isCurrentAtAssessment: true,
        staleAt: codesStaleAt,
      }),
    ];

    const graph = {
      version: 'item74h-public-da-persisted-byron-ru2-shed-v1',
      lgaCode: 'BYRON',
      zoneCode: 'RU2',
      proposalType: 'SHED_OUTBUILDING',
      decisions: ['STOP', 'PROCEED', 'MERIT_ASSESSMENT', 'MORE_EVIDENCE_REQUIRED'],
      gates: [
        'site-confirmed',
        'agricultural-ancillary-use',
        'mapped-site-constraints',
        'exempt-pathway',
        'complying-pathway',
        'da-merit-pathway',
      ],
      unresolvedFacts: [
        'proposal use',
        'proposal dimensions',
        'landholding area and title',
        'existing farm-building aggregate footprint',
        'road class and measured setbacks',
        'waterbody and ridgeline distances',
        'heritage and environmental sensitivity',
        'mapped hazard and constraint layers',
      ],
    };
    const graphHash = digest(graph);
    const scopeKey = prefix + 'scope-' + preflight.addressFingerprint;
    const inputHash = digest({
      addressFingerprint: preflight.addressFingerprint,
      lgaCode: 'BYRON',
      zoneCode: 'RU2',
      proposalType: 'SHED_OUTBUILDING',
    });

    await prisma.user.create({
      data: {
        id: ids.user,
        email: prefix + 'preview@example.invalid',
        name: 'Item 74H controlled redacted Preview fixture',
      },
    });
    await prisma.property.create({
      data: {
        id: ids.property,
        name: 'Redacted controlled Byron RU2 property',
        address: redactedAddress,
        state: 'NSW',
        country: 'AU',
      },
    });
    await prisma.project.create({
      data: {
        id: ids.project,
        name: 'Item 74H controlled redacted pathway proof',
        title: 'Controlled Byron RU2 shed pathway',
        description: 'Temporary protected Preview acceptance fixture',
        propertyId: ids.property,
        userId: ids.user,
        createdById: ids.user,
        zoningCode: 'RU2',
        zoning: 'RU2',
        address: redactedAddress,
        isDemo: true,
      },
    });
    await prisma.siteContext.create({
      data: {
        id: ids.site,
        projectId: ids.project,
        addressInput: redactedAddress,
        formattedAddress: redactedAddress,
        lgaName: 'Byron Shire',
        lgaCode: 'BYRON',
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
          title: 'Controlled redacted free Pathway Check',
          source: 'item74h-public-da-persistence-preview',
          payload: {
            addressFingerprint: preflight.addressFingerprint,
            decision: 'MORE_EVIDENCE_REQUIRED',
            evidenceDigest,
          },
        },
        {
          id: ids.pack,
          projectId: ids.project,
          createdById: ids.user,
          type: 'detailed_planning_pack',
          title: 'Blocked controlled Planning Controls Pack candidate',
          source: 'item74h-public-da-persistence-preview',
          payload: { blocked: true, decision: 'MORE_EVIDENCE_REQUIRED' },
        },
        {
          id: ids.see,
          projectId: ids.project,
          createdById: ids.user,
          type: 'pre_see_planning_memo',
          title: 'Blocked controlled submission SEE candidate',
          source: 'item74h-public-da-persistence-preview',
          payload: { blocked: true, decision: 'MORE_EVIDENCE_REQUIRED' },
        },
      ],
    });

    const persistenceInput: PersistPathwayAssessmentInput = {
      environment: 'PREVIEW',
      projectId: ids.project,
      siteContextId: ids.site,
      assessmentVersion: 'item74h-public-da-persisted-preview-v2',
      idempotencyKey: prefix + 'assessment-idempotency',
      scopeKey,
      inputHash,
      evidenceDigest,
      decision: 'MORE_EVIDENCE_REQUIRED',
      trustLevel: 'SITE_CONFIRMED',
      input: {
        addressFingerprint: preflight.addressFingerprint,
        lgaCode: 'BYRON',
        zoneCode: 'RU2',
        proposalType: 'SHED_OUTBUILDING',
        rawAddressRetained: false,
      },
      result: {
        decision: 'MORE_EVIDENCE_REQUIRED',
        reason:
          'The address, Byron RU2 zone, approved farm-shed use, 200 square metre footprint, 5.996 metre height, 39.47 hectare lot and OTHER_ROAD classification are confirmed; registered cadastral authority and road, side and rear setbacks remain unresolved.',
        paidOutputEligible: false,
      },
      assessedAt: now,
      staleAt: assessmentStaleAt,
      spatial: {
        authority: 'NSW Department of Planning',
        datasetName: 'EPI Primary Planning Layers - Land Zoning',
        sourceUrl: SPATIAL_SOURCE_URL,
        sourceVersion: 'Byron Local Environmental Plan 2014',
        retrievedAt: now,
        contentHash: prefix + preflight.spatialFeatureHash,
        matchMethod: 'PRECISE_ADDRESS_TO_OFFICIAL_EPI_POLYGON',
        lgaCode: 'BYRON',
        zoneCode: 'RU2',
        payload: {
          addressFingerprint: preflight.addressFingerprint,
          providerIdentifierHash: preflight.providerIdentifierHash,
          spatialFeatureHash: preflight.spatialFeatureHash,
          siteEvidenceDigest: preflight.siteEvidenceDigest,
          rawAddressRetained: false,
          coordinatesRetained: false,
          parcelIdentifierRetained: false,
        },
        trustLevel: 'SITE_CONFIRMED',
        staleAt: spatialStaleAt,
      },
      definition: {
        versionKey: prefix + 'byron-ru2-shed-v2',
        lgaCode: 'BYRON',
        zoneCode: 'RU2',
        proposalType: 'SHED_OUTBUILDING',
        status: 'ACTIVE',
        effectiveFrom: now,
        graphHash,
        graph,
      },
      evidence: [
        {
          evidenceKey: 'spatial',
          evidenceKind: 'SPATIAL',
          authority: 'NSW Department of Planning',
          sourceUrl: SPATIAL_SOURCE_URL,
          sourceVersion: 'Byron Local Environmental Plan 2014',
          sourceReference: 'Official EPI land-zoning polygon',
          retrievedAt: now,
          contentHash: preflight.spatialFeatureHash,
          citation: {
            authority: 'NSW Department of Planning',
            dataset: 'EPI Primary Planning Layers - Land Zoning',
          },
          snapshot: {
            addressFingerprint: preflight.addressFingerprint,
            lgaCode: 'BYRON',
            zoneCode: 'RU2',
            instrument: 'Byron Local Environmental Plan 2014',
            siteEvidenceDigest: preflight.siteEvidenceDigest,
          },
          isCurrentAtAssessment: true,
          staleAt: spatialStaleAt,
        },
        {
          evidenceKey: 'lep',
          evidenceKind: 'LEP',
          authority: 'NSW legislation',
          sourceUrl: lep.sourceUrl,
          sourceVersion: 'Byron Local Environmental Plan 2014',
          sourceReference: 'RU2 Land Use Table and zone objectives',
          retrievedAt: lep.lastSyncedAt,
          contentHash: lepHash,
          citation: {
            instrument: lep.name,
            zoneCode: 'RU2',
          },
          snapshot: {
            objectiveCount: objectives.length,
            landUseCount: landUses.length,
            farmBuildingsPermission: 'WITH_CONSENT',
          },
          isCurrentAtAssessment: true,
          staleAt: lepStaleAt,
        },
        {
          evidenceKey: 'dcp',
          evidenceKind: 'DCP',
          authority: 'Byron Shire Council',
          sourceUrl: dcpSourceUrl,
          sourceVersion: 'Chapter D2 effective 28 February 2023',
          sourceReference: 'D2.2.2, D2.2.3, D2.7 and D2.7.2',
          effectiveFrom: new Date('2023-02-28T00:00:00.000Z'),
          retrievedAt: dcpRetrievedAt,
          contentHash: dcpHash,
          citation: {
            instrument: 'Byron Shire Development Control Plan 2014',
            references: dcpRefs,
          },
          snapshot: {
            roadSetbacks: {
              classifiedRoadMetres: 55,
              otherRoadMetres: 15,
            },
            sideRearSetbacks: 'MERIT_AND_CONFLICT_DEPENDENT',
            farmShedUse: 'RURAL_ACTIVITY_NON_HABITABLE',
            standalonePrescriptiveMeasures: false,
          },
          isCurrentAtAssessment: true,
          staleAt: dcpStaleAt,
          dcpClauseId: primaryDcp.id,
        },
        {
          evidenceKey: 'codes',
          evidenceKind: 'LEP',
          authority: 'NSW legislation',
          sourceUrl: codes.sourceUrl,
          sourceVersion: 'State Environmental Planning Policy (Exempt and Complying Development Codes) 2008',
          sourceReference: 'Clauses 2.31, 2.32 and 3D.54-3D.59',
          retrievedAt: codesRetrievedAt,
          contentHash: codesHash,
          citation: {
            instrument: codes.name,
            clauseKeys: codeKeys,
          },
          snapshot: {
            exemptPathway: 'POSSIBLE_IF_ALL_SITE_AND_PROPOSAL_TESTS_PASS',
            complyingPathway: 'POSSIBLE_IF_ALL_SITE_AND_PROPOSAL_TESTS_PASS',
            unresolved: true,
          },
          isCurrentAtAssessment: true,
          staleAt: codesStaleAt,
          clauseId: primaryCode.id,
        },
        {
          evidenceKey: 'public-da-catalog',
          evidenceKind: 'OPERATOR_NOTE',
          authority: 'Byron Shire Council',
          sourceUrl: PUBLIC_DA_TRACKER_URL,
          sourceVersion: PUBLIC_DA_REVIEW_VERSION,
          sourceReference: 'Development application 10.2025.535.1 reviewed evidence',
          retrievedAt: publicDaObservedAt,
          contentHash: publicDaAssessment.catalogDigest,
          citation: {
            applicationNumber: publicDaCatalog.applicationNumber,
            authority: publicDaCatalog.authority,
            documentCount: publicDaAssessment.redactedSummary.documentCount,
          },
          snapshot: {
            catalogDigest: publicDaAssessment.catalogDigest,
            proposalKind: publicDaAssessment.redactedSummary.proposalKind,
            acceptedRoles: publicDaAssessment.redactedSummary.acceptedRoles,
            confirmedFacts: reviewedPublicDa.confirmedFacts,
            missingEvidence: reviewedPublicDa.missingEvidence,
            decision: reviewedPublicDa.decision,
            proposalDimensionsVerified: true,
            roadClassificationVerified: true,
            siteSetbacksVerified: false,
            freePathwayCheckAvailable: true,
            paidPlanningControlsPackEligible: false,
            paidSubmissionSeeEligible: false,
            rawAddressRetained: false,
            directDownloadTokensRetained: false,
          },
          isCurrentAtAssessment: true,
          staleAt: publicDaStaleAt,
        },
      ],
      controls,
      gates: [
        {
          gateKey: 'site-confirmed',
          sequence: 0,
          question: 'Did a precise address resolve to one official Byron RU2 zoning polygon?',
          outcome: 'PROCEED',
          reason: 'The protected redacted preflight confirmed one precise Byron RU2 polygon.',
          condition: { resolved: true, rawAddressRetained: false },
          evidenceRefs: ['spatial'],
          controlRefs: [],
        },
        {
          gateKey: 'agricultural-ancillary-use',
          sequence: 1,
          question: 'Is the proposed structure genuinely ancillary to agricultural use?',
          outcome: 'PROCEED',
          reason: 'The approved determination and stamped plans identify a farm machinery shed.',
          condition: { agriculturalUseConfirmed: true, machineryShedConfirmed: true },
          evidenceRefs: ['lep', 'dcp', 'codes'],
          controlRefs: ['lep-farm-building-permission', 'dcp-farm-shed-use'],
        },
        {
          gateKey: 'mapped-site-constraints',
          sequence: 2,
          question: 'Are all heritage, environmental, hazard and distance constraints resolved?',
          outcome: 'MORE_EVIDENCE_REQUIRED',
          reason: 'Zoning and OTHER_ROAD classification are confirmed; the required mapped overlays and measured distances remain absent.',
          condition: {
            heritageResolved: false,
            environmentallySensitiveResolved: false,
            roadClassResolved: true,
            waterbodyDistanceResolved: false,
            ridgelineResolved: false,
          },
          evidenceRefs: ['spatial', 'dcp', 'codes'],
          controlRefs: [
            'dcp-classified-road-setback',
            'dcp-other-road-setback',
            'exempt-waterbody-setback',
            'cdc-waterbody-setback',
          ],
        },
        {
          gateKey: 'exempt-pathway',
          sequence: 3,
          question: 'Does the proposal satisfy every exempt farm-building standard?',
          outcome: 'MORE_EVIDENCE_REQUIRED',
          reason: 'The 200 square metre footprint, 5.996 metre height, 39.47 hectare lot and OTHER_ROAD classification are confirmed, but aggregate footprint and measured setbacks remain unresolved.',
          condition: { allStandardsConfirmed: false },
          evidenceRefs: ['codes', 'dcp'],
          controlRefs: [
            'exempt-individual-footprint',
            'exempt-height-under-10ha',
            'exempt-height-10ha-plus',
            'exempt-road-setback',
            'exempt-side-rear-setback-0-100',
            'exempt-side-rear-setback-100-200',
          ],
        },
        {
          gateKey: 'complying-pathway',
          sequence: 4,
          question: 'Does the proposal satisfy every Rural Housing Code farm-building standard?',
          outcome: 'MORE_EVIDENCE_REQUIRED',
          reason: 'The lot area, 200 square metre footprint, 5.996 metre height and OTHER_ROAD classification are confirmed, but aggregate footprint and measured setbacks remain unresolved.',
          condition: { allStandardsConfirmed: false },
          evidenceRefs: ['codes', 'dcp'],
          controlRefs: [
            'cdc-minimum-lot-area',
            'cdc-footprint-4000-400000',
            'cdc-footprint-400000-1000000',
            'cdc-footprint-over-100ha',
            'cdc-ru2-road-setback',
          ],
        },
        {
          gateKey: 'da-merit-pathway',
          sequence: 5,
          question: 'If exempt and complying paths fail, is DA merit evidence complete?',
          outcome: 'MORE_EVIDENCE_REQUIRED',
          reason: 'The historic DA approval and OTHER_ROAD classification are confirmed, but reusable DCP siting, cadastral and exact setback evidence remains incomplete.',
          condition: { meritEvidenceComplete: false },
          evidenceRefs: ['lep', 'dcp', 'spatial', 'public-da-catalog'],
          controlRefs: [
            'lep-farm-building-permission',
            'dcp-classified-road-setback',
            'dcp-other-road-setback',
            'dcp-farm-shed-use',
          ],
        },
      ],
    };

    const first = await persistPathwayAssessment(prisma, persistenceInput);
    const replay = await persistPathwayAssessment(prisma, persistenceInput);
    const loaded = await reloadPathwayAssessment(prisma, first.assessment.id);
    const customerResult = toPathwayCustomerResult(loaded, now);
    assert(customerResult.status === 'available', 'Free customer result was unavailable');
    assert(
      customerResult.decision === 'MORE_EVIDENCE_REQUIRED',
      'Free customer result did not preserve the reviewed decision',
    );
    assert(customerResult.current, 'Free customer result was not current');
    assert(
      customerResult.commercial.freePathwayCheckAvailable &&
        !customerResult.commercial.planningControlsPackEligible &&
        !customerResult.commercial.submissionSeeEligible &&
        !customerResult.commercial.productionCheckoutEnabled,
      'Customer commercial boundary did not preserve free-only access',
    );
    assert(
      customerResult.sources.some((item) => item.kind === 'LEP') &&
        customerResult.sources.some((item) => item.kind === 'DCP') &&
        customerResult.sources.some((item) => item.kind === 'SPATIAL'),
      'Customer result did not expose the authoritative source classes',
    );
    assert(
      customerResult.evidenceChecklist.length > 0,
      'Customer result did not render the missing-evidence checklist',
    );
    assert(
      Object.values(customerResult.privacy).every((value) => value === false),
      'Customer result exposed protected site identifiers',
    );

    assert(!first.replayed, 'First controlled persistence must create an assessment');
    assert(replay.replayed, 'Controlled replay must be idempotent');
    assert(
      first.assessment.id === replay.assessment.id,
      'Controlled replay returned a different assessment',
    );
    assert(
      (await prisma.pathwayAssessment.count({
        where: { idempotencyKey: persistenceInput.idempotencyKey },
      })) === 1,
      'Controlled replay left more than one assessment',
    );
    assert(loaded.evidenceSnapshots.length === 5, 'Controlled evidence reload was incomplete');
    const reloadedPublicDaCatalog = loaded.evidenceSnapshots.find(
      (snapshot) =>
        snapshot.evidenceKind === 'OPERATOR_NOTE' &&
        snapshot.sourceVersion === PUBLIC_DA_REVIEW_VERSION,
    );
    assert(reloadedPublicDaCatalog, 'Reviewed public DA evidence was not reloaded');
    assert(
      reloadedPublicDaCatalog.contentHash === publicDaAssessment.catalogDigest &&
        reloadedPublicDaCatalog.sourceUrl === PUBLIC_DA_TRACKER_URL,
      'Reviewed public DA digest or token-free source changed during persistence',
    );
    assert(
      !reloadedPublicDaCatalog.sourceUrl.includes('?'),
      'Reviewed public DA source retained a direct-download token',
    );
    assert(
      loaded.controlSnapshots.length === controls.length,
      'Controlled control reload was incomplete',
    );
    assert(loaded.gateSnapshots.length === 6, 'Controlled gate reload was incomplete');
    assert(
      loaded.spatialProvenance.contentHash === prefix + preflight.spatialFeatureHash,
      'Controlled spatial provenance reload was incomplete',
    );

    let unsafeProceedBlocked = false;
    try {
      await persistPathwayAssessment(prisma, {
        ...persistenceInput,
        idempotencyKey: prefix + 'unsafe-proceed',
        decision: 'PROCEED',
        trustLevel: 'EVIDENCE_VERIFIED',
        gates: persistenceInput.gates.map((gate) => ({
          ...gate,
          outcome: 'PROCEED',
          reason: 'Deliberately invalid controlled PROCEED attempt',
        })),
      });
    } catch (error) {
      unsafeProceedBlocked = expectedBlock(error, 'UNVERIFIED_SPATIAL');
    }
    assert(unsafeProceedBlocked, 'Unverified controlled spatial evidence must block PROCEED');
    assert(
      (await prisma.pathwayAssessment.count({
        where: { idempotencyKey: prefix + 'unsafe-proceed' },
      })) === 0,
      'Rejected controlled PROCEED wrote an assessment',
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
    assert(!free.replayed && freeReplay.replayed, 'Controlled free binding was not replay-safe');
    assert(free.binding.id === freeReplay.binding.id, 'Controlled free replay changed binding');

    const paidBlocks: string[] = [];
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
        if (expectedBlock(error, 'PAID_OUTPUT_BLOCKED')) {
          paidBlocks.push(commercialStage);
        }
      }
    }
    assert(paidBlocks.length === 2, 'Both controlled paid outputs must remain blocked');

    return {
      decision: first.assessment.decision,
      trustLevel: first.assessment.trustLevel,
      evidenceSnapshots: loaded.evidenceSnapshots.length,
      publicDaCatalogStatus: publicDaAssessment.status,
      publicDaCatalogDigestBound: true,
      directDownloadTokensRetained: false,
      controlSnapshots: loaded.controlSnapshots.length,
      gateSnapshots: loaded.gateSnapshots.length,
      assessmentCreatedOnce: true,
      replayReturnedSameAssessment: true,
      reloadPreservedEvidenceControlsGatesAndSpatialProvenance: true,
      unsafeProceedBlockedWithoutWrite: true,
      freePathwayBindingReplaySafe: true,
      freeCustomerResultRenderedFromReload: true,
      freeCustomerEvidenceChecklistRendered: true,
      customerPrivacyRedacted: true,
      planningControlsPackBlocked: paidBlocks.includes('PLANNING_CONTROLS_PACK'),
      submissionSeeBlocked: paidBlocks.includes('SUBMISSION_SEE'),
      rawAddressRetained: false,
      coordinatesRetained: false,
      parcelIdentifierRetained: false,
    };
  } finally {
    await cleanupFixture(prisma, prefix);
    assert(
      (await residualCount(prisma, prefix)) === 0,
      'Controlled cleanup left residual Item 74H records',
    );
  }
}

async function main(): Promise<void> {
  if (!enabled(process.env[ENABLE_FLAG])) {
    console.log(
      JSON.stringify({
        acceptance: 'item74h-public-da-persistence-preview',
        phase: 'disabled',
        passed: true,
        reason: 'approval_gated',
        productionCheckoutEnabled: false,
        productionMutationPerformed: false,
      }),
    );
    return;
  }

  assertProtectedPreview();
  const preflight = await runRedactedPreflight();
  const prisma = new PrismaClient();
  try {
    const result = await runControlledPersistence(prisma, preflight);
    console.log(
      JSON.stringify({
        acceptance: 'item74h-public-da-persistence-preview',
        phase: 'controlled_persistence',
        passed: true,
        lga: 'BYRON',
        zone: 'RU2',
        proposalType: 'SHED_OUTBUILDING',
        ...result,
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
      acceptance: 'item74h-public-da-persistence-preview',
      passed: false,
      error:
        error instanceof PathwayPersistenceError
          ? { code: error.code, message: error.message }
          : error instanceof Error
            ? { message: error.message }
            : { message: 'Unknown controlled persistence error' },
      productionCheckoutEnabled: false,
      productionMutationPerformed: false,
    }),
  );
  process.exitCode = 1;
});
