import { createHash } from 'node:crypto';

import { PrismaClient } from '@prisma/client';

const EXPECTED_REFS = new Set([
  'agent/item74h-pathway-check',
  'integration/item74h-resolution-20260830',
]);
const EXPECTED_NEON_ENDPOINTS = new Set([
  'ep-misty-dream-a7l6wcp8',
  'ep-bold-shadow-a7y8j17d',
]);
const NSW_ZONING_LAYER_URL =
  'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer/2';
const GOOGLE_GEOCODING_URL =
  'https://maps.googleapis.com/maps/api/geocode/json';

type GoogleComponent = {
  long_name?: string;
  short_name?: string;
  types?: string[];
};

type GoogleResult = {
  place_id?: string;
  formatted_address?: string;
  types?: string[];
  geometry?: {
    location?: {
      lat?: number;
      lng?: number;
    };
    location_type?: string;
  };
  address_components?: GoogleComponent[];
};

type GooglePayload = {
  status?: string;
  results?: GoogleResult[];
};

type ArcGisPayload = {
  features?: Array<{
    attributes?: Record<string, unknown>;
  }>;
  error?: unknown;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function checkoutEnabled(value: string | undefined): boolean {
  return ['1', 'true', 'on', 'yes'].includes((value || '').toLowerCase());
}

function assertProtectedPreview(): void {
  assert(process.env.VERCEL === '1', 'Controlled flight requires hosted Vercel execution');
  assert(
    process.env.VERCEL_ENV === 'preview',
    'Controlled flight is restricted to Vercel Preview',
  );
  assert(
    EXPECTED_REFS.has(process.env.VERCEL_GIT_COMMIT_REF ?? ''),
    'Controlled flight requires the exact Item 74H branch',
  );
  assert(
    !checkoutEnabled(process.env.PLANNING_PACK_CHECKOUT_ENABLED),
    'Planning Controls Pack checkout must remain disabled',
  );
  assert(
    !checkoutEnabled(process.env.SUBMISSION_SEE_CHECKOUT_ENABLED),
    'Submission SEE checkout must remain disabled',
  );

  const databaseUrl = process.env.DATABASE_URL;
  assert(databaseUrl, 'DATABASE_URL is required');
  const host = new URL(databaseUrl).hostname;
  assert(
    [...EXPECTED_NEON_ENDPOINTS].some((endpoint) => host.startsWith(endpoint)) && host.endsWith('.neon.tech'),
    'DATABASE_URL is not the isolated Item 74H Neon endpoint',
  );
}

function component(
  components: GoogleComponent[],
  type: string,
): string | null {
  const match = components.find((item) => item.types?.includes(type));
  return match?.long_name?.trim() || match?.short_name?.trim() || null;
}

async function resolveAddress(address: string, apiKey: string) {
  const url = new URL(GOOGLE_GEOCODING_URL);
  url.searchParams.set('address', address);
  url.searchParams.set('region', 'au');
  url.searchParams.set('components', 'administrative_area:NSW|country:AU');
  url.searchParams.set('key', apiKey);

  let response: Response;
  try {
    response = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new Error('Protected geocoding request was unavailable');
  }
  assert(response.ok, 'Protected geocoding request returned a non-success status');

  const payload = (await response.json()) as GooglePayload;
  assert(payload.status === 'OK', 'Protected geocoding did not return OK');
  assert(
    Array.isArray(payload.results) && payload.results.length === 1,
    'Controlled address must resolve to exactly one result',
  );

  const result = payload.results[0];
  assert(result, 'Controlled address result is missing');
  const lat = result.geometry?.location?.lat;
  const lng = result.geometry?.location?.lng;
  assert(
    typeof lat === 'number' &&
      Number.isFinite(lat) &&
      typeof lng === 'number' &&
      Number.isFinite(lng),
    'Controlled address result has no valid point',
  );
  assert(result.place_id, 'Controlled address has no provider identifier');
  assert(result.formatted_address, 'Controlled address has no formatted value');
  assert(
    ['ROOFTOP', 'RANGE_INTERPOLATED', 'GEOMETRIC_CENTER'].includes(
      result.geometry?.location_type || '',
    ),
    'Controlled address resolution is not sufficiently precise',
  );

  const components = result.address_components || [];
  const state = component(components, 'administrative_area_level_1');
  const lga = component(components, 'administrative_area_level_2');
  assert(
    state === 'New South Wales' || state === 'NSW',
    'Controlled address is not in NSW',
  );
  assert(lga && /byron/i.test(lga), 'Controlled address is not in Byron Shire');

  return {
    lat,
    lng,
    placeId: result.place_id,
    formattedAddress: result.formatted_address,
    lga,
  };
}

async function resolveOfficialZone(point: { lat: number; lng: number }) {
  const url = new URL(NSW_ZONING_LAYER_URL + '/query');
  url.searchParams.set('f', 'json');
  url.searchParams.set('geometry', point.lng + ',' + point.lat);
  url.searchParams.set('geometryType', 'esriGeometryPoint');
  url.searchParams.set('inSR', '4326');
  url.searchParams.set('spatialRel', 'esriSpatialRelIntersects');
  url.searchParams.set(
    'outFields',
    'OBJECTID,EPI_NAME,SYM_CODE,LAY_CLASS',
  );
  url.searchParams.set('returnGeometry', 'false');
  url.searchParams.set('where', '1=1');

  let response: Response;
  try {
    response = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new Error('Official NSW zoning request was unavailable');
  }
  assert(response.ok, 'Official NSW zoning returned a non-success status');

  const payload = (await response.json()) as ArcGisPayload;
  assert(!payload.error, 'Official NSW zoning returned an ArcGIS error');
  assert(
    Array.isArray(payload.features) && payload.features.length === 1,
    'Controlled address must intersect exactly one official zoning feature',
  );

  const attributes = payload.features[0]?.attributes;
  assert(attributes, 'Official NSW zoning attributes are missing');
  assert(
    attributes.EPI_NAME === 'Byron Local Environmental Plan 2014',
    'Controlled address did not resolve to Byron LEP 2014',
  );
  assert(
    attributes.SYM_CODE === 'RU2',
    'Controlled address did not resolve to RU2',
  );
  assert(
    typeof attributes.OBJECTID === 'number' ||
      (typeof attributes.OBJECTID === 'string' &&
        attributes.OBJECTID.trim().length > 0),
    'Official NSW zoning feature identifier is missing',
  );

  return {
    instrument: String(attributes.EPI_NAME),
    zone: String(attributes.SYM_CODE),
    zoneName:
      typeof attributes.LAY_CLASS === 'string'
        ? attributes.LAY_CLASS
        : 'RU2 Rural Landscape',
    featureIdentifier: 'OBJECTID:' + String(attributes.OBJECTID),
  };
}

async function inspectRepositoryEvidence(prisma: PrismaClient) {
  const instrument = await prisma.instrument.findUnique({
    where: { slug: 'byron-lep-2014' },
    select: {
      id: true,
      name: true,
      sourceUrl: true,
      lastSyncedAt: true,
      _count: { select: { clauses: true } },
    },
  });
  assert(instrument, 'Current Byron LEP instrument is missing');
  assert(
    instrument.name === 'Byron Local Environmental Plan 2014',
    'Byron LEP instrument identity is inconsistent',
  );
  assert(
    instrument.sourceUrl.startsWith('https://'),
    'Byron LEP source is not HTTPS',
  );
  assert(instrument.lastSyncedAt, 'Byron LEP has no sync timestamp');

  const zoneUses = await prisma.lepZoneLandUse.count({
    where: { instrumentId: instrument.id, zoneCode: 'RU2' },
  });
  const zoneObjectives = await prisma.lepZoneObjective.count({
    where: { instrumentId: instrument.id, zoneCode: 'RU2' },
  });
  assert(zoneUses > 0 && zoneObjectives > 0, 'Byron RU2 LEP coverage is incomplete');

  const dcpDocument = await prisma.councilDocument.findUnique({
    where: { lgaCode: 'BYRON' },
    select: {
      id: true,
      title: true,
      sourceUrl: true,
      updatedAt: true,
    },
  });
  assert(dcpDocument, 'Current Byron DCP document is missing');
  assert(
    dcpDocument.sourceUrl.startsWith('https://'),
    'Byron DCP source is not HTTPS',
  );

  const candidates = await prisma.dCPClause.findMany({
    where: {
      lgaCode: 'BYRON',
      OR: [
        { bodyText: { contains: 'outbuilding', mode: 'insensitive' } },
        { bodyText: { contains: 'shed', mode: 'insensitive' } },
        { title: { contains: 'outbuilding', mode: 'insensitive' } },
        { title: { contains: 'shed', mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      ref: true,
      title: true,
      updatedAt: true,
    },
    orderBy: [{ ref: 'asc' }, { id: 'asc' }],
    take: 100,
  });
  assert(candidates.length > 0, 'No Byron shed/outbuilding DCP candidates were found');

  return {
    lep: {
      title: instrument.name,
      sourceUrl: instrument.sourceUrl,
      syncedAt: instrument.lastSyncedAt.toISOString(),
      clauseCount: instrument._count.clauses,
      ru2ObjectiveCount: zoneObjectives,
      ru2LandUseCount: zoneUses,
    },
    dcp: {
      title: dcpDocument.title,
      sourceUrl: dcpDocument.sourceUrl,
      checkedAt: dcpDocument.updatedAt.toISOString(),
      candidateCount: candidates.length,
      candidateReferenceHashes: candidates.map((item) =>
        hash([item.ref || '', item.title || '', item.id].join('|')),
      ),
    },
  };
}

async function main(): Promise<void> {
  if (process.env.ITEM74H_CONTROLLED_ADDRESS_ACCEPTANCE !== 'true') {
    console.log(
      JSON.stringify({
        acceptance: 'item74h-controlled-address-preflight',
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

  const address = process.env.ITEM74H_CONTROLLED_ADDRESS;
  const googleKey = process.env.GOOGLE_MAPS_API_KEY;
  assert(address && address.trim(), 'Controlled address secret is missing');
  assert(googleKey, 'Protected geocoding credential is missing');

  const prisma = new PrismaClient();
  try {
    const resolved = await resolveAddress(address, googleKey);
    const officialZone = await resolveOfficialZone(resolved);
    const repositoryEvidence = await inspectRepositoryEvidence(prisma);

    const addressFingerprint = hash(resolved.formattedAddress);
    const siteEvidenceDigest = hash(
      [
        addressFingerprint,
        resolved.placeId,
        officialZone.featureIdentifier,
        officialZone.instrument,
        officialZone.zone,
      ].join('|'),
    );

    console.log(
      JSON.stringify({
        acceptance: 'item74h-controlled-address-preflight',
        phase: 'read_only_preflight',
        passed: true,
        result: 'MORE_EVIDENCE_REQUIRED',
        addressFingerprint: 'sha256:' + addressFingerprint.slice(0, 12),
        providerIdentifierHash: hash(resolved.placeId),
        spatialFeatureHash: hash(officialZone.featureIdentifier),
        siteEvidenceDigest,
        lga: 'BYRON',
        instrument: officialZone.instrument,
        zone: officialZone.zone,
        zoneName: officialZone.zoneName,
        proposalType: 'SHED_OUTBUILDING',
        repositoryEvidence,
        reason:
          'Address, zoning and source candidates are confirmed; numeric controls and branch predicates still require evidence validation before persistence or paid binding.',
        databaseWrites: 0,
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
      acceptance: 'item74h-controlled-address-preflight',
      passed: false,
      error: {
        message:
          error instanceof Error
            ? error.message
            : 'Unknown controlled preflight error',
      },
      addressPrinted: false,
      coordinatesPrinted: false,
      parcelPrinted: false,
      databaseWrites: 0,
      productionCheckoutEnabled: false,
      productionMutationPerformed: false,
    }),
  );
  process.exitCode = 1;
});
