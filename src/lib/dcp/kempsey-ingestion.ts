import { createHash } from "node:crypto";

import { LgaCoverageMaturity, type PrismaClient } from "@prisma/client";
import { parse, type HTMLElement } from "node-html-parser";

import { prisma as defaultPrisma } from "@/lib/prisma";
import { parseDcpDocument } from "./parser";

export const KEMPSEY_DCP_CHAPTERS = [
  {
    slug: "kdcp-c01-residential-development-urban-areas",
    title: "C1 Residential Development - Urban Areas",
    url: "https://www.kempsey.nsw.gov.au/Plan-Build/Local-planning-zoning/Kempsey-Development-Control-Plan-2013/kdcp-c01-residential-development-urban-areas",
  },
  {
    slug: "kdcp-b02-parking-access-and-traffic-management",
    title: "B2 Parking, Access and Traffic Management",
    url: "https://www.kempsey.nsw.gov.au/Plan-Build/Local-planning-zoning/Kempsey-Development-Control-Plan-2013/kdcp-b02-parking-access-and-traffic-management",
  },
  {
    slug: "kdcp-b09-landscaping",
    title: "B9 Landscaping",
    url: "https://www.kempsey.nsw.gov.au/Plan-Build/Local-planning-zoning/Kempsey-Development-Control-Plan-2013/kdcp-b09-landscaping",
  },
  {
    slug: "kdcp-b01-subdivision",
    title: "B1 Subdivision",
    url: "https://www.kempsey.nsw.gov.au/Plan-Build/Local-planning-zoning/Kempsey-Development-Control-Plan-2013/kdcp-b01-subdivision",
  },
  {
    slug: "kdcp-b07-flood-hazard-area-management",
    title: "B7 Flood Hazard Area Management",
    url: "https://www.kempsey.nsw.gov.au/Plan-Build/Local-planning-zoning/Kempsey-Development-Control-Plan-2013/kdcp-b07-flood-hazard-area-management",
  },
  {
    slug: "kdcp-e02-dual-occupancy-in-rural-areas",
    title: "E2 Dual Occupancy in Rural Areas",
    url: "https://www.kempsey.nsw.gov.au/Plan-Build/Local-planning-zoning/Kempsey-Development-Control-Plan-2013/kdcp-e02-dual-occupancy-in-rural-areas",
  },
] as const;

const LGA_CODE = "KEMPSEY";
const SOURCE = "KEMPSEY_DCP_2013";
const FETCH_TIMEOUT_MS = 10_000;

type KempseyChapter = (typeof KEMPSEY_DCP_CHAPTERS)[number];
type DbClient = PrismaClient;

const hashContent = (content: string) =>
  createHash("sha256").update(content).digest("hex");

const chapterRefFor = (chapter: KempseyChapter) => {
  const match = chapter.title.match(/^([A-Z])(\d+)/);
  if (!match) return chapter.title.split(" ")[0] ?? chapter.slug;
  return `${match[1]}${Number(match[2])}`;
};

const extractMainContentHtml = (html: string) => {
  const root = parse(html);
  root
    .querySelectorAll(
      "script, style, nav, header, footer, noscript, svg, form, aside",
    )
    .forEach((element) => element.remove());
  const main =
    root.querySelector("main") ||
    root.querySelector("[role='main']") ||
    root.querySelector("article") ||
    root.querySelector("#content") ||
    root.querySelector(".content") ||
    root.querySelector(".main-content") ||
    root.querySelector("body") ||
    root;
  return (main as HTMLElement).innerHTML;
};

const fetchChapterHtml = async (chapter: KempseyChapter) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(chapter.url, {
      signal: controller.signal,
      headers: {
        "user-agent": "Plannera DCP ingestion (+https://plannera.com.au)",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
};

export const ingestKempseyDcp = async (db: DbClient = defaultPrisma) => {
  const parsedChapters = [] as Array<{
    chapter: KempseyChapter;
    chapterRef: string;
    clauses: ReturnType<typeof parseDcpDocument>["clauses"];
    tableCount: number;
  }>;

  for (const chapter of KEMPSEY_DCP_CHAPTERS) {
    try {
      const html = await fetchChapterHtml(chapter);
      const chapterRef = chapterRefFor(chapter);
      const contentHtml = extractMainContentHtml(html);
      const parsed = parseDcpDocument(contentHtml, {
        documentTitle: `Kempsey DCP 2013 ${chapter.title}`,
        maxClauseLength: 4_000,
      });
      if (!parsed.clauses.length) {
        console.warn("[kempsey-dcp] No chunks parsed for chapter", {
          chapter: chapter.title,
          url: chapter.url,
        });
        continue;
      }
      parsedChapters.push({
        chapter,
        chapterRef,
        clauses: parsed.clauses,
        tableCount: parsed.tableCount,
      });
    } catch (error) {
      console.warn("[kempsey-dcp] Skipping chapter after fetch/parse failure", {
        chapter: chapter.title,
        url: chapter.url,
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  const clauses = parsedChapters.flatMap(
    ({ chapter, chapterRef, clauses: chapterClauses }) =>
      chapterClauses.map((clause, index) => ({
        ...clause,
        chapter,
        chapterRef,
        ref: clause.ref
          ? `${chapterRef}.${clause.ref}`
          : `${chapterRef}-${index + 1}`,
        headingPath: [
          chapter.title,
          ...clause.headingPath.filter((heading) => heading !== chapter.title),
        ],
      })),
  );

  if (!clauses.length) {
    throw new Error("No Kempsey DCP chapters could be fetched and parsed");
  }

  await db.$transaction(async (tx) => {
    await tx.dCPClause.deleteMany({
      where: { lgaCode: LGA_CODE, instrumentSlug: SOURCE },
    });
    await tx.dCPClause.createMany({
      data: clauses.map((clause) => ({
        lgaCode: LGA_CODE,
        instrumentSlug: SOURCE,
        ref: clause.ref,
        title:
          clause.title ?? clause.headingPath.at(-1) ?? clause.chapter.title,
        headingPath: clause.headingPath,
        parentRef: clause.parentRef
          ? `${clause.chapterRef}.${clause.parentRef}`
          : clause.chapterRef,
        depth: clause.depth,
        bodyHtml: clause.bodyHtml,
        bodyText:
          `Kempsey DCP 2013 ${clause.chapterRef} ${clause.title ?? ""}\n\n${clause.bodyText}`.trim(),
        topicTags: clause.topicTags,
        numericMeta: {
          ...(clause.numericMeta ?? {}),
          sourceUrl: clause.chapter.url,
          source: SOURCE,
          chapterRef: clause.chapterRef,
          contentHash: hashContent(`${clause.chapter.url}:${clause.bodyText}`),
        },
      })),
    });
    await tx.lgaCoverageState.upsert({
      where: { lgaCode: LGA_CODE },
      update: {
        state: LgaCoverageMaturity.SEARCHABLE_READY,
        lastPreparedAt: new Date(),
        errorMessage: null,
      },
      create: {
        lgaCode: LGA_CODE,
        state: LgaCoverageMaturity.SEARCHABLE_READY,
        lastPreparedAt: new Date(),
      },
    });
  });

  return {
    status: "ok" as const,
    lga: LGA_CODE,
    source: SOURCE,
    chaptersIngested: parsedChapters.length,
    totalChunks: clauses.length,
    tableCount: parsedChapters.reduce(
      (sum, chapter) => sum + chapter.tableCount,
      0,
    ),
  };
};
