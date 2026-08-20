import { createHash } from "node:crypto";

import {
  InstrumentType,
  LgaCoverageMaturity,
  Prisma,
  WorkspaceSourceType,
} from "@prisma/client";
import pdfParse from "pdf-parse";

import { prisma } from "@/lib/prisma";

export const BYRON_DCP_SOURCE_URL =
  "https://www.byron.nsw.gov.au/Council/Plans-Strategies/Planning-Development-Strategies/Byron-Shire-Development-Control-Plan-2014";

type ByronDcpSource = {
  key: string;
  title: string;
  url: string;
};

export const BYRON_DCP_2014_SOURCES: readonly ByronDcpSource[] = [
  { key: "Part A", title: "Part A Preliminary", url: "https://www.byron.nsw.gov.au/files/assets/public/v/1/hptrim/land-use-and-planning-planning-development-control-plans-key-records-2014-development-control-plan/byron-shire-dcp-2014-part-a-preliminary-adopted-16-april-2026-effective-30-april-2026.pdf" },
  { key: "Chapter B1", title: "Chapter B1 Biodiversity", url: "https://www.byron.nsw.gov.au/files/assets/public/v/1/hptrim/land-use-and-planning-planning-development-control-plans-key-records-2014-development-control-plan/byron-shire-dcp-2014-chapter-b1-biodiversity-adopted-27-january-2026-effective-23-february-2026.pdf" },
  { key: "Chapter B3", title: "Chapter B3 Services", url: "https://www.byron.nsw.gov.au/files/assets/public/v/1/hptrim/land-use-and-planning-planning-development-control-plans-key-records-2014-development-control-plan/byron-shire-dcp-2014-chapter-b3-services-adopted-27-january-effective-23-february-2026.pdf" },
  { key: "Chapter B4", title: "Chapter B4 Traffic Planning, Vehicle Parking, Circulation and Access", url: "https://www.byron.nsw.gov.au/files/assets/public/v/1/hptrim/land-use-and-planning-planning-development-control-plans-key-records-2014-development-control-plan/byron-shire-dcp-2014-chapter-b4-traffic-planning-vehicle-parking-circulation-adopted-19-february-2026-effective-26-february-2026.pdf" },
  { key: "Chapter B5", title: "Chapter B5 Providing for Cycling", url: "https://www.byron.nsw.gov.au/files/assets/public/v/1/hptrim/land-use-and-planning-planning-development-control-plans-key-records-2014-development-control-plan/byron-shire-dcp-2014-chapter-b5-providing-for-cycling-adopted-27-january-2026-effective-23-february-2026.pdf" },
  { key: "Chapter B6", title: "Chapter B6 Buffers and Minimising Land Use Conflict", url: "https://www.byron.nsw.gov.au/files/assets/public/v/1/hptrim/land-use-and-planning-planning-local-environmental-plans-working-documents-lep-2014-amendments/24.2017.82.1-[adopted-version]-byron-shire-dcp-2014-chapter-b6-buffers-and-minimising-land-use-conflict-adopted-22-march-2018-effective-12-april-2018.pdf" },
  { key: "Chapter B7", title: "Chapter B7 Mosquitoes and Biting Midges", url: "https://www.byron.nsw.gov.au/files/assets/public/v/1/hptrim/land-use-and-planning-planning-development-control-plans-key-records-2014-development-control-plan/byron-shire-dcp-2014-chapter-b7-mosquitoes-and-biting-midges-adopted-26-june-2014-effective-21-july-2014.pdf" },
  { key: "Chapter B8", title: "Chapter B8 Waste Minimisation and Management", url: "https://www.byron.nsw.gov.au/files/assets/public/v/1/hptrim/land-use-and-planning-planning-development-control-plans-key-records-2014-development-control-plan/byron-dcp-2014-chapter-b8-waste-minimisation-and-management-adopted-5-december-2022-effective-25-january-2023-amendments-2022-also-public-exhibition-version.pdf" },
  { key: "Chapter B9", title: "Chapter B9 Landscaping", url: "https://www.byron.nsw.gov.au/files/assets/public/v/1/hptrim/land-use-and-planning-planning-development-control-plans-key-records-2014-development-control-plan/byron-shire-dcp-2014-chapter-b9-landscaping-adopted-27-january-effective-23-february-2026.pdf" },
  { key: "Chapter B10", title: "Chapter B10 Signage", url: "https://www.byron.nsw.gov.au/files/assets/public/v/3/hptrim/land-use-and-planning-planning-development-control-plans-key-records-2014-development-control-plan/byron-dcp-2014-chapter-b10-signage-adopted-5-december-2022-effective-25-january-2023-amendments-2022-adopted-and-public-exhibition-version.pdf" },
  { key: "Chapter B11", title: "Chapter B11 Planning for Crime Prevention", url: "https://www.byron.nsw.gov.au/files/assets/public/v/1/hptrim/land-use-and-planning-planning-development-control-plans-key-records-2014-development-control-plan/byron-shire-dcp-2014-chapter-b11-planning-for-crime-prevention-adopted-22-march-2018-effective-12-april-2018-24.2017.82.1.pdf" },
  { key: "Chapter B12", title: "Chapter B12 Social Impact Assessment", url: "https://www.byron.nsw.gov.au/files/assets/public/v/1/hptrim/land-use-and-planning-planning-development-control-plans-key-records-2014-development-control-plan/byron-shire-dcp-2014-chapter-b12-social-impact-assessment-adopted-26-june-2014-effective-21-july-2014.pdf" },
  { key: "Chapter B13", title: "Chapter B13 Access and Mobility", url: "https://www.byron.nsw.gov.au/files/assets/public/v/1/hptrim/land-use-and-planning-planning-development-control-plans-key-records-2014-development-control-plan/byron-shire-dcp-2014-chapter-b13-access-and-mobility-adopted-27-january-2026-effective-23-february-2026.pdf" },
  { key: "Chapter B14", title: "Chapter B14 Excavation and Fill", url: "https://www.byron.nsw.gov.au/files/assets/public/v/1/hptrim/land-use-and-planning-planning-development-control-plans-key-records-2014-development-control-plan/byron-shire-dcp-2014-chapter-b14-excavation-and-fill-adopted-15-august-2019-effective-11-september-2019-24.2018.65.1.pdf" },
  { key: "Chapter B15", title: "Chapter B15 Public Art", url: "https://www.byron.nsw.gov.au/files/assets/public/v/1/hptrim/land-use-and-planning-planning-development-control-plans-key-records-2014-development-control-plan/byron-shire-dcp-2014-chapter-b15-public-art-adopted-9-february-2023-effective-28-february-2023-amendments-2022.pdf" },
  { key: "Chapter C1", title: "Chapter C1 Non-Indigenous Heritage", url: "https://www.byron.nsw.gov.au/files/assets/public/v/2/hptrim/land-use-and-planning-planning-development-control-plans-key-records-2014-development-control-plan/byron-shire-dcp-2014-chapter-c1-non-indigenous-heritage-adopted-27-january-2026-effective-23-february-2026.pdf" },
  { key: "Chapter C2", title: "Chapter C2 Areas Affected by Flood", url: "https://www.byron.nsw.gov.au/files/assets/public/v/2/hptrim/land-use-and-planning-planning-development-control-plans-key-records-2014-development-control-plan/byron-shire-dcp-2014-chapter-c2-areas-affected-by-flood-adopted-22-may-2025-effective-6-june-2025.pdf" },
  { key: "Chapter C3", title: "Chapter C3 Visually Prominent Sites, Development and View Sharing", url: "https://www.byron.nsw.gov.au/files/assets/public/v/1/hptrim/land-use-and-planning-planning-development-control-plans-key-records-2014-development-control-plan/byron-shire-dcp-2014-chapter-c3-visually-prominent-sites-visually-prominent-development-and-view-sharing-adopted-26-june-2014-effective-21-july-2014.pdf" },
  { key: "Chapter C4", title: "Chapter C4 Development in a Drinking Water Catchment", url: "https://www.byron.nsw.gov.au/files/assets/public/v/1/hptrim/land-use-and-planning-planning-development-control-plans-key-records-2014-development-control-plan/byron-shire-dcp-2014-chapter-c4-development-in-the-drinking-water-catchment-adopted-26-june-2014-effective-21-july-2014.pdf" },
  { key: "Chapter D1", title: "Chapter D1 Residential Accommodation in Urban, Village and Special Purpose Zones", url: "https://www.byron.nsw.gov.au/files/assets/public/v/2/hptrim/land-use-and-planning-planning-development-control-plans-key-records-2014-development-control-plan/byron-shire-dcp-2014-chapter-d1-residential-accommodation-in-urban-village-and-special-purpose-zones-adopted-27-january-2026-effective-23-february-2026.pdf" },
  { key: "Chapter D2", title: "Chapter D2 Residential Accommodation and Ancillary Development in Rural Zones", url: "https://www.byron.nsw.gov.au/files/assets/public/v/2/hptrim/land-use-and-planning-planning-development-control-plans-key-records-2014-development-control-plan/byron-shire-dcp-2014-chapter-d2-residential-accommodation-and-ancillary-development-in-rural-zones-adopted-9-february-2023-effective-28-february-2023-amendments-and-ct-2022-combined-adopted-version.pdf" },
  { key: "Chapter D3", title: "Chapter D3 Tourist Accommodation", url: "https://www.byron.nsw.gov.au/files/assets/public/v/2/hptrim/land-use-and-planning-planning-development-control-plans-key-records-2014-development-control-plan/byron-shire-dcp-2014-chapter-d3-tourist-accommodation-adopted-14-september-2023-effective-27-september-2023.pdf" },
  { key: "Chapter D4", title: "Chapter D4 Commercial and Retail Development", url: "https://www.byron.nsw.gov.au/files/assets/public/v/1/hptrim/land-use-and-planning-planning-development-control-plans-key-records-2014-development-control-plan/byron-shire-dcp-2014-chapter-d4-commercial-and-retail-development-adopted-26-june-2014-effective-21-july-2014.pdf" },
  { key: "Chapter D5", title: "Chapter D5 Industrial Development", url: "https://www.byron.nsw.gov.au/files/assets/public/v/1/hptrim/land-use-and-planning-planning-development-control-plans-key-records-2014-development-control-plan/byron-shire-dcp-2014-chapter-d5-industrial-development-adopted-27-january-2026-effective-23-february-2026.pdf" },
  { key: "Chapter D6", title: "Chapter D6 Subdivision", url: "https://www.byron.nsw.gov.au/files/assets/public/v/1/hptrim/land-use-and-planning-planning-development-control-plans-key-records-2014-development-control-plan/byron-shire-dcp-2014-chapter-d6-subdivision-adopted-27-january-effective-23-february-2026.pdf" },
  { key: "Chapter D7", title: "Chapter D7 Sex Services Premises", url: "https://www.byron.nsw.gov.au/files/assets/public/v/1/hptrim/land-use-and-planning-planning-development-control-plans-key-records-2014-development-control-plan/byron-shire-dcp-2014-chapter-d7-sex-services-adopted-26-june-2014-effective-21-july-2014.pdf" },
  { key: "Chapter D9", title: "Chapter D9 Rural Function Centres", url: "https://www.byron.nsw.gov.au/files/assets/public/v/1/hptrim/land-use-and-planning-planning-local-environmental-plans-working-documents-lep-2014-amendments/byron-shire-development-control-plan-dcp-2014-chapter-d9-rural-function-centre-final-version-26.2016.4.1.pdf" },
  { key: "Chapter E1", title: "Chapter E1 Suffolk Park", url: "https://www.byron.nsw.gov.au/files/assets/public/v/1/hptrim/land-use-and-planning-planning-development-control-plans-key-records-2014-development-control-plan/byron-shire-dcp-2014-chapter-e1-suffolk-park-adopted-27-january-2026-effective-23-february-2026.pdf" },
  { key: "Chapter E2", title: "Chapter E2 Bangalow", url: "https://www.byron.nsw.gov.au/files/assets/public/v/1/hptrim/land-use-and-planning-planning-development-control-plans-key-records-2014-development-control-plan/byron-shire-dcp-2014-chapter-e2-bangalow-adopted-28-march-2024-effective-8-may-2024.pdf" },
  { key: "Chapter E3", title: "Chapter E3 Mullumbimby", url: "https://www.byron.nsw.gov.au/files/assets/public/v/1/hptrim/land-use-and-planning-planning-development-control-plans-key-records-2014-development-control-plan/24.2020.26.1-byron-shire-dcp-2014-chapter-e3-mullumbimby-post-exhibition-and-adopted-version-adopted-17-september-2020-effective-28-september-2020-res-20-473.pdf" },
  { key: "Chapter E4", title: "Chapter E4 Brunswick Heads", url: "https://www.byron.nsw.gov.au/files/assets/public/v/3/hptrim/land-use-and-planning-planning-development-control-plans-key-records-2014-development-control-plan/byron-dcp-2014-draft-chapter-e4-brunswick-heads-adopted-5-december-2022-effective-25-january-2023-amendments-2022-adopted-and-public-exhibition-version.pdf" },
  { key: "Chapter E5", title: "Chapter E5 Certain Locations in Byron Bay and Ewingsdale", url: "https://www.byron.nsw.gov.au/files/assets/public/v/1/hptrim/land-use-and-planning-planning-development-control-plans-working-documents-2014-development-control-plan/byron-shire-dcp-2014-chapter-e5-certain-locations-in-byron-bay-and-ewingsdale-adopted-18-april-2024-effective-8-may-2024-26.2023.3.1.pdf" },
  { key: "Chapter E6", title: "Chapter E6 Federal Village", url: "https://www.byron.nsw.gov.au/files/assets/public/v/1/hptrim/land-use-and-planning-planning-development-control-plans-key-records-2014-development-control-plan/byron-shire-dcp-2014-chapter-e6-federal-adopted-26-june-2014-effective-21-july-2014.pdf" },
  { key: "Chapter E7", title: "Chapter E7 Main Arm", url: "https://www.byron.nsw.gov.au/files/assets/public/v/1/hptrim/land-use-and-planning-planning-development-control-plans-key-records-2014-development-control-plan/byron-shire-dcp-2014-chapter-e7-main-arm-adopted-26-june-2014-effective-21-july-2014.pdf" },
  { key: "Chapter E8", title: "Chapter E8 West Byron Urban Release Area", url: "https://www.byron.nsw.gov.au/files/assets/public/v/1/hptrim/land-use-and-planning-planning-development-control-plans-key-records-2014-development-control-plan/byron-shire-dcp-2014-chapter-e8-west-byron-urban-release-area-adopted-27-january-2026-effective-23-february-2026.pdf" },
  { key: "Chapter E9", title: "Chapter E9 Ocean Shores, New Brighton and South Golden Beach", url: "https://www.byron.nsw.gov.au/files/assets/public/v/1/hptrim/land-use-and-planning-planning-development-control-plans-key-records-2014-development-control-plan/24.2020.26.1-byron-shire-dcp-2014-chapter-e9-ocean-shores-new-brighton-south-golden-beach-post-exhibition-and-adopted-version-adopted-17-september-2020-effective-28-september-2020-res-20-473.pdf" },
  { key: "Chapter E10", title: "Chapter E10 Byron Bay Town Centre", url: "https://www.byron.nsw.gov.au/files/assets/public/v/1/hptrim/land-use-and-planning-planning-development-control-plans-key-records-2014-development-control-plan/byron-shire-dcp-2014-chapter-e10-byron-bay-town-centre-august-2025-adopted-21-aug-2025-effective-02-sep-2025.pdf" },
  { key: "Chapter E11", title: "Chapter E11 Gulgan BILS Area 5", url: "https://www.byron.nsw.gov.au/files/assets/public/v/3/hptrim/land-use-and-planning-planning-development-control-plans-key-records-2014-development-control-plan/byron-shire-dcp-2014-chapter-e11-gulgan-bils-area-5-adopted-16-april-2026-effective-30-april-2026.pdf" },
  { key: "Chapter F1", title: "Chapter F1 Tree and Vegetation Management", url: "https://www.byron.nsw.gov.au/files/assets/public/v/2/hptrim/land-use-and-planning-planning-development-control-plans-key-records-2014-development-control-plan/byron-shire-dcp-2014-chapter-f1-tree-and-vegetation-management-adopted-27-january-effective-23-february-2026.pdf" },
];

const DCP_SLUG = "byron-dcp-2014";
const DCP_NAME = "Byron Shire Development Control Plan 2014";
const DCP_SHORT_NAME = "Byron DCP 2014";
const DCP_LGA = "BYRON";
const MIN_SOURCE_TEXT_CHARS = 500;
const MAX_CHUNK_CHARS = 4_000;
const EXPECTED_SOURCE_COUNT = 39;
const SECTION_HEADING =
  /^((?:[A-F]\d+)(?:\.\d+){0,4}|\d+(?:\.\d+){1,4})\s+(.{2,})$/;

type ParsedSource = ByronDcpSource & {
  byteLength: number;
  text: string;
};

type ByronClause = {
  ref: string;
  title: string;
  headingPath: string[];
  parentRef: string;
  depth: number;
  bodyText: string;
  bodyHtml: string;
  sourceUrl: string;
};

const normalizeText = (value: string) => value.replace(/\s+/g, " ").trim();

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const assertSourceManifest = () => {
  const keys = new Set(BYRON_DCP_2014_SOURCES.map((source) => source.key));
  const urls = new Set(BYRON_DCP_2014_SOURCES.map((source) => source.url));
  if (
    BYRON_DCP_2014_SOURCES.length !== EXPECTED_SOURCE_COUNT ||
    keys.size !== EXPECTED_SOURCE_COUNT ||
    urls.size !== EXPECTED_SOURCE_COUNT ||
    BYRON_DCP_2014_SOURCES.some(
      (source) =>
        !source.key ||
        !source.title ||
        !source.url.startsWith("https://www.byron.nsw.gov.au/"),
    )
  ) {
    throw new Error("Byron DCP official source manifest is incomplete or invalid");
  }
};

const fetchOfficialPdf = async (
  source: ByronDcpSource,
  fetcher: typeof fetch,
): Promise<ParsedSource> => {
  const response = await fetcher(source.url, {
    headers: {
      Accept: "application/pdf",
      "User-Agent": "Plannera-Item74C-Preview-Acceptance/1.0",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(
      "Unable to fetch required Byron DCP source " +
        source.key +
        " (status " +
        response.status +
        ")",
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error("Byron DCP source " + source.key + " is not a valid PDF");
  }

  const parsed = await pdfParse(buffer);
  const text = parsed.text?.trim() ?? "";
  if (text.length < MIN_SOURCE_TEXT_CHARS) {
    throw new Error(
      "Byron DCP source " + source.key + " did not yield substantial text",
    );
  }

  return { ...source, byteLength: buffer.byteLength, text };
};

const loadOfficialSources = async (fetcher: typeof fetch) => {
  assertSourceManifest();
  const parsedSources: ParsedSource[] = [];
  const batchSize = 4;

  for (let offset = 0; offset < BYRON_DCP_2014_SOURCES.length; offset += batchSize) {
    const batch = BYRON_DCP_2014_SOURCES.slice(offset, offset + batchSize);
    parsedSources.push(
      ...(await Promise.all(
        batch.map((source) => fetchOfficialPdf(source, fetcher)),
      )),
    );
  }

  if (parsedSources.length !== EXPECTED_SOURCE_COUNT) {
    throw new Error("Byron DCP did not load every official source before write");
  }
  return parsedSources;
};

const splitLongBody = (body: string) => {
  if (body.length <= MAX_CHUNK_CHARS) return [body];
  const words = body.split(" ");
  const chunks: string[] = [];
  let current = "";

  for (const word of words) {
    if (current && current.length + word.length + 1 > MAX_CHUNK_CHARS) {
      chunks.push(current);
      current = word;
    } else {
      current = current ? current + " " + word : word;
    }
  }
  if (current) chunks.push(current);
  return chunks;
};

export const parseByronDcpSource = (source: ParsedSource): ByronClause[] => {
  const lines = source.text
    .split(/\r?\n/)
    .map(normalizeText)
    .filter(Boolean);

  const rawSections: Array<{ ref: string; title: string; body: string[] }> = [];
  let current = {
    ref: source.key.replace(/^Chapter\s+/, ""),
    title: source.title,
    body: [] as string[],
  };

  const flush = () => {
    const bodyText = normalizeText(current.body.join(" "));
    if (bodyText) rawSections.push({ ...current, body: [bodyText] });
  };

  for (const line of lines) {
    const match = line.match(SECTION_HEADING);
    if (match && line.length <= 220) {
      flush();
      current = {
        ref: match[1],
        title: normalizeText(match[2]),
        body: [] as string[],
      };
    } else {
      current.body.push(line);
    }
  }
  flush();

  if (!rawSections.length) {
    throw new Error("Byron DCP source " + source.key + " produced no sections");
  }

  const clauses: ByronClause[] = [];
  for (const section of rawSections) {
    const body = normalizeText(section.body.join(" "));
    for (const [index, chunk] of splitLongBody(body).entries()) {
      const continued = index === 0 ? "" : " (continued " + (index + 1) + ")";
      clauses.push({
        ref: section.ref + continued,
        title: section.title + continued,
        headingPath: [DCP_NAME, source.title, section.title],
        parentRef: source.key,
        depth: section.ref.split(".").length,
        bodyText: chunk,
        bodyHtml: "<p>" + escapeHtml(chunk) + "</p>",
        sourceUrl: source.url,
      });
    }
  }
  return clauses;
};

const buildClauses = (sources: ParsedSource[]) => {
  const clauses = sources.flatMap(parseByronDcpSource);
  const representedSources = new Set(clauses.map((clause) => clause.parentRef));
  const expectedSources = new Set(
    BYRON_DCP_2014_SOURCES.map((source) => source.key),
  );

  if (
    clauses.length < EXPECTED_SOURCE_COUNT ||
    representedSources.size !== expectedSources.size ||
    [...expectedSources].some((key) => !representedSources.has(key)) ||
    clauses.some(
      (clause) =>
        !clause.ref.trim() ||
        !clause.bodyText.trim() ||
        !clause.sourceUrl.startsWith("https://"),
    )
  ) {
    throw new Error("Byron DCP parsed corpus failed whole-source validation");
  }
  return clauses;
};

type ByronPrismaClient = Pick<typeof prisma, "$transaction">;

export const ingestByronDcp = async (
  client: ByronPrismaClient = prisma,
  fetcher: typeof fetch = fetch,
) => {
  const sources = await loadOfficialSources(fetcher);
  const clauses = buildClauses(sources);
  const totalBytes = sources.reduce(
    (total, source) => total + source.byteLength,
    0,
  );

  const result = await client.$transaction(
    async (tx) => {
      const instrument = await tx.instrument.upsert({
        where: { slug: DCP_SLUG },
        create: {
          slug: DCP_SLUG,
          name: DCP_NAME,
          shortName: DCP_SHORT_NAME,
          instrumentType: InstrumentType.DCP,
          jurisdiction: "NSW",
          sourceUrl: BYRON_DCP_SOURCE_URL,
          lastSyncedAt: new Date(),
        },
        update: {
          name: DCP_NAME,
          shortName: DCP_SHORT_NAME,
          instrumentType: InstrumentType.DCP,
          jurisdiction: "NSW",
          sourceUrl: BYRON_DCP_SOURCE_URL,
          lastSyncedAt: new Date(),
        },
      });

      const councilDocument = await tx.councilDocument.upsert({
        where: { lgaCode: DCP_LGA },
        create: {
          lgaCode: DCP_LGA,
          title: DCP_NAME,
          sourceUrl: BYRON_DCP_SOURCE_URL,
          fileName: "byron-dcp-2014-current-official-set.pdf",
          fileExtension: "pdf",
          mimeType: "application/pdf",
          fileSize: totalBytes,
          storagePath: "council-managed",
          publicUrl: BYRON_DCP_SOURCE_URL,
        },
        update: {
          title: DCP_NAME,
          sourceUrl: BYRON_DCP_SOURCE_URL,
          fileName: "byron-dcp-2014-current-official-set.pdf",
          fileExtension: "pdf",
          mimeType: "application/pdf",
          fileSize: totalBytes,
          storagePath: "council-managed",
          publicUrl: BYRON_DCP_SOURCE_URL,
        },
      });

      await tx.clause.deleteMany({ where: { instrumentId: instrument.id } });
      await tx.dCPClause.deleteMany({ where: { lgaCode: DCP_LGA } });
      await tx.workspaceSourceChunk.deleteMany({
        where: {
          lgaCode: DCP_LGA,
          sourceType: {
            in: [WorkspaceSourceType.council_dcp, WorkspaceSourceType.dcp],
          },
        },
      });

      const clauseInsert = await tx.clause.createMany({
        data: clauses.map((clause, index) => ({
          clauseKey:
            clause.ref.toLowerCase().replace(/[^a-z0-9]+/g, "-") +
            "-" +
            index,
          title: clause.title,
          bodyHtml: clause.bodyHtml,
          bodyText: clause.bodyText,
          hierarchyPath: clause.headingPath,
          contentHash: createHash("sha256")
            .update(clause.sourceUrl + "|" + clause.ref + "|" + clause.bodyText)
            .digest("hex"),
          instrumentId: instrument.id,
          retrievedAt: new Date(),
        })),
      });

      const dcpInsert = await tx.dCPClause.createMany({
        data: clauses.map((clause) => ({
          lgaCode: DCP_LGA,
          instrumentSlug: DCP_SLUG,
          ref: clause.ref,
          title: clause.title,
          headingPath: clause.headingPath,
          parentRef: clause.parentRef,
          depth: clause.depth,
          bodyHtml: clause.bodyHtml,
          bodyText: clause.bodyText,
          topicTags: [clause.parentRef],
          numericMeta: {
            sourceKey: clause.parentRef,
            sourceUrl: clause.sourceUrl,
          } as Prisma.InputJsonValue,
        })),
      });

      const chunkInsert = await tx.workspaceSourceChunk.createMany({
        data: clauses.map((clause) => ({
          councilDocumentId: councilDocument.id,
          lgaCode: DCP_LGA,
          heading: clause.ref + " " + clause.title,
          content: clause.bodyText,
          sourceType: WorkspaceSourceType.council_dcp,
          metadata: {
            instrumentId: instrument.id,
            instrumentSlug: DCP_SLUG,
            sourceKey: clause.parentRef,
            sourceUrl: clause.sourceUrl,
            ref: clause.ref,
          } as Prisma.InputJsonValue,
        })),
      });

      if (
        clauseInsert.count !== clauses.length ||
        dcpInsert.count !== clauses.length ||
        chunkInsert.count !== clauses.length
      ) {
        throw new Error("Byron DCP atomic replacement was incomplete");
      }

      await tx.lgaCoverageState.upsert({
        where: { lgaCode: DCP_LGA },
        update: {
          state: LgaCoverageMaturity.SEARCHABLE_READY,
          lastPreparedAt: new Date(),
          errorMessage: null,
        },
        create: {
          lgaCode: DCP_LGA,
          state: LgaCoverageMaturity.SEARCHABLE_READY,
          lastPreparedAt: new Date(),
        },
      });

      return {
        instrumentId: instrument.id,
        clauseCount: clauses.length,
        dcpClauseCount: clauses.length,
        chunkCount: clauses.length,
      };
    },
    { maxWait: 10_000, timeout: 120_000 },
  );

  return {
    ...result,
    lga: DCP_LGA,
    slug: DCP_SLUG,
    source: BYRON_DCP_SOURCE_URL,
    sourcesIngested: sources.length,
    totalBytes,
  };
};

export const getByronDcpCoverage = async () => {
  const instrument = await prisma.instrument.findUnique({
    where: { slug: DCP_SLUG },
  });
  if (!instrument) {
    return {
      lga: DCP_LGA,
      instrumentId: null,
      clauseCount: 0,
      dcpClauseCount: 0,
      chunkCount: 0,
    } as const;
  }

  const [clauseCount, chunkCount, dcpClauseCount] = await Promise.all([
    prisma.clause.count({
      where: { instrumentId: instrument.id, isCurrent: true },
    }),
    prisma.workspaceSourceChunk.count({
      where: {
        lgaCode: DCP_LGA,
        sourceType: WorkspaceSourceType.council_dcp,
      },
    }),
    prisma.dCPClause.count({ where: { lgaCode: DCP_LGA } }),
  ]);
  return {
    lga: DCP_LGA,
    instrumentId: instrument.id,
    clauseCount,
    dcpClauseCount,
    chunkCount,
  } as const;
};

export const BYRON_DCP_CONSTANTS = {
  slug: DCP_SLUG,
  lga: DCP_LGA,
  sourcePaths: BYRON_DCP_2014_SOURCES.map((source) => source.url),
  primarySourcePath: BYRON_DCP_SOURCE_URL,
  name: DCP_NAME,
  shortName: DCP_SHORT_NAME,
};
