import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test, vi } from "vitest";
import type { DCPClause, PrismaClient, SiteContext } from "@prisma/client";
import type { DetailedPlanningPackContent } from "@/types/workspace";
import type { QuickSiteCheckReport } from "@/types/quick-site-check";
import { captureDcpSource } from "./dcp/dcp-source-capture";
import { captureWorkingSeePackSources, readWorkingSeePackSources,
  type WorkingSeePackCaptureInput } from "./see-document-pack-source-capture";

vi.mock("@/lib/prisma", () => ({
  prisma: new Proxy({}, { get() { throw new Error("Global database forbidden"); } }),
}));
vi.mock("@/lib/auth", () => ({ NEXT_AUTH_SESSION_COOKIE: { name: "test-session" }, authOptions: {} }));
const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const now = new Date();
const earlier = new Date(now.getTime() - 60 * 60 * 1000);
const bodyText = "Setbacks, parking, access, built form, active frontage, landscaping, open space and local design controls must be reviewed against this in-memory example.";
function fixture(council: "BYRON" | "KEMPSEY" = "BYRON") {
  const name = council === "BYRON" ? "Byron" : "Kempsey";
  const site = {
    id: "site-" + council, projectId: "project-" + council, addressInput: "memory-site",
    formattedAddress: "memory-site", lgaName: name, lgaCode: council, zone: "R2",
    parcelId: null, lot: null, planNumber: null, latitude: -30, longitude: 153,
    createdAt: earlier, updatedAt: earlier,
  } satisfies SiteContext;
  const instrument = { id: "instrument-" + council, name: name + " Local Environmental Plan 2014",
    instrumentType: "LEP", sourceUrl: "https://legislation.nsw.gov.au/view/html/inforce/current/epi-memory-" + council };
  const leps = ["2.3", "4.3"].map(clauseKey => ({
    id: council + "-lep-" + clauseKey, clauseKey, instrument, bodyText, title: "In-memory control",
    version: 1, isCurrent: true, retrievedAt: earlier, updatedAt: earlier,
    contentHash: sha("original-record-" + clauseKey), effectiveFrom: null, effectiveTo: null,
  }));
  const sourceUrl = "https://www." + council.toLowerCase() + ".nsw.gov.au/plans/memory.pdf";
  const dcp: DCPClause = {
    id: council + "-dcp", lgaCode: council, instrumentSlug: council.toLowerCase() + "-dcp",
    ref: "B4.1", title: "Planning controls", headingPath: ["Planning controls"], parentRef: "B4",
    depth: 2, bodyText, bodyHtml: "<p>" + bodyText + "</p>", topicTags: [],
    numericMeta: { sourceUrl, sourceCapture: captureDcpSource({
      council, sourceUrl, sourceVersion: "edition-1", retrievedAt: earlier.toISOString(),
      pdfSha256: sha("in-memory-pdf"), bodyText,
    }, now) }, createdAt: earlier, updatedAt: earlier,
  };
  const summary = { label: "Cited", detail: "In-memory test", citedControlCount: 1,
    totalControlCount: 3, landUseEntryCount: 1, objectiveCount: 1, sourceRef: "cl. 4.3" };
  const unavailable = { label: "Unconfirmed", value: null, present: false, interpretation: "Unconfirmed control." };
  const qsc = {
    projectId: site.projectId, generatedAt: earlier.toISOString(),
    site: { address: site.formattedAddress, lga: name, zoneCode: "R2", zoneLabel: "R2" },
    lepInstrument: { name: instrument.name, code: instrument.id, lga: name, source: "ingestion" },
    controls: {
      heightOfBuilding: { label: "Height", value: "Example", present: true, lepSource: true,
        clauseRef: "4.3", interpretation: bodyText, confidence: "Cited" },
      floorSpaceRatio: unavailable, minimumLotSize: unavailable,
    }, permissibility: null, notes: [], nextSteps: [], lepEvidenceSummary: summary,
  } as unknown as QuickSiteCheckReport;
  const pack = {
    packType: "detailed_planning_pack", generatedAt: now.toISOString(), projectId: site.projectId,
    site: { address: site.formattedAddress, lga: name, lgaCode: council,
      zoneCode: "R2", zoneLabel: "R2", zoneName: null },
    proposalBrief: "Alterations with access, landscape and external works for this in-memory assessment.",
    sourceQuickSiteCheck: { artefactId: "qsc-" + council, title: "Saved check",
      generatedAt: earlier.toISOString(), lepEvidenceSummary: summary },
    carriedLepEvidenceSummary: summary,
    dcpEvidence: [{ topicId: "local_controls", topicLabel: "Local controls", status: "Cited",
      reason: bodyText, citations: [{ ref: dcp.ref, title: dcp.title, headingPath: dcp.headingPath, excerpt: bodyText, score: 1 }] }],
    topicMatrix: [], unresolvedTopics: [], consultantReviewQuestions: [], nextAction: "Review",
    commercialReady: false,
  } as unknown as DetailedPlanningPackContent;
  const db = {
    clause: { findMany: async () => leps },
    dCPClause: { findMany: async () => [dcp] },
  } as unknown as Pick<PrismaClient, "clause" | "dCPClause">;
  const input = { site, pack, quickSiteCheck: qsc, dcpClauses: [dcp] };
  return { db, input, leps, dcp };
}
async function saved(council: "BYRON" | "KEMPSEY" = "BYRON") {
  const f = fixture(council);
  const capture = await captureWorkingSeePackSources(f.db, f.input, now);
  assert.equal(capture.status, "CAPTURED");
  return { ...f, capture, read: () => readWorkingSeePackSources(f.db,
    { ...f.input, capture, resolvedZoneCode: "R2" }, now) };
}
for (const council of ["BYRON", "KEMPSEY"] as const) {
  test(council + " captures server source rows and rechecks exact current records", async () => {
    const f = await saved(council);
    const capture = await f.read();
    assert.equal(capture.council, council);
    assert.equal(capture.sources.length, 3);
    assert.ok(capture.sources.every(source => source.retrievedAt === earlier.toISOString()));
    assert.ok(capture.sources.every(source => source.bodyTextSha256 === sha(bodyText)));
  });
}
test("legacy DCP metadata remains unavailable, not automatically upgraded", async () => {
  const f = fixture(); f.dcp.numericMeta = { sourceUrl: "https://www.byron.nsw.gov.au/a.pdf" };
  assert.equal((await captureWorkingSeePackSources(f.db, f.input, now)).status, "UNAVAILABLE");
});
test("missing canonical council or absent current LEP clauses stays unavailable", async () => {
  const f = fixture(); f.input.site.lgaCode = null as unknown as "BYRON";
  assert.equal((await captureWorkingSeePackSources(f.db, f.input, now)).status, "UNAVAILABLE");
  const missing = fixture(); missing.leps.splice(0, 1);
  assert.equal((await captureWorkingSeePackSources(missing.db, missing.input, now)).status, "UNAVAILABLE");
});
test("changed source text, version, origin URL and metadata each invalidate capture", async () => {
  for (const change of ["body", "version", "url", "metadata"]) {
    const f = await saved();
    if (change === "body") f.leps[0].bodyText += " changed";
    if (change === "version") f.leps[0].version++;
    if (change === "url") f.leps[0].instrument.sourceUrl = "https://example.com/a";
    if (change === "metadata") f.dcp.numericMeta = {};
    await assert.rejects(f.read(), /source_capture_incomplete/);
  }
});
test("pack, project, QSC and actual zone cannot borrow another capture", async () => {
  for (const change of ["pack", "project", "qsc", "zone"]) {
    const f = await saved();
    if (change === "pack") f.input.pack.proposalBrief += " changed";
    if (change === "project") f.input.site.projectId = "other";
    if (change === "qsc") f.input.quickSiteCheck.generatedAt = now.toISOString();
    await assert.rejects(readWorkingSeePackSources(f.db, {
      ...f.input, capture: f.capture, resolvedZoneCode: change === "zone" ? "R3" : "R2",
    }, now), /source_capture_incomplete/);
  }
});
test("envelope alterations and expiration fail closed without refreshing dates", async () => {
  const f = await saved();
  await assert.rejects(readWorkingSeePackSources(f.db, { ...f.input,
    capture: { ...f.capture, projectId: "other" }, resolvedZoneCode: "R2" }, now), /source_capture_incomplete/);
  await assert.rejects(readWorkingSeePackSources(f.db, { ...f.input,
    capture: f.capture, resolvedZoneCode: "R2" }, new Date(now.getTime() + 8 * 86400000)), /source_capture_incomplete/);
});
test("saving the envelope inside its pack does not recursively change its pack digest", async () => {
  const f = await saved();
  Object.assign(f.input.pack, { workingSeeSourceCapture: f.capture });
  assert.equal((await f.read()).digest, f.capture.status === "CAPTURED" ? f.capture.digest : "");
});
test("unexpected database failures are not disguised as verified or unavailable evidence", async () => {
  const f = fixture();
  const failureDb = { clause: { findMany: async () => { throw new Error("synthetic database failure"); } } } as unknown as Pick<PrismaClient, "clause">;
  await assert.rejects(captureWorkingSeePackSources(failureDb, f.input, now), /synthetic database failure/);
});
for (const council of ["BYRON", "KEMPSEY"] as const) {
  test(council + " normal DPP creation saves real capture output in the same new artefact payload", async () => {
    const f = fixture(council);
    const { createDetailedPlanningPackArtefact } = await import("./artefact-service");
    const project = { id: f.input.site.projectId, publicId: "public-" + council,
      userId: "owner", createdById: "owner", isDemo: false, siteContext: f.input.site, zoningCode: "R2" };
    const qscRow = { id: f.input.pack.sourceQuickSiteCheck.artefactId, projectId: project.id,
      type: "quick_site_check", title: "Saved check", payload: f.input.quickSiteCheck,
      staleAt: null, capturedAt: earlier, createdAt: earlier };
    let captures = 0;
    let writes = 0;
    let captureInput: WorkingSeePackCaptureInput | undefined;
    const memory = {
      project: { findFirst: async () => project, findUnique: async () => project },
      artefact: { findMany: async () => [qscRow],
        create: async ({ data }: { data: Record<string, unknown> }) => {
          writes++; return { ...data, id: "new-pack-" + council };
        } },
    };
    const unexpected = () => { throw new Error("External service forbidden"); };
    const result = await createDetailedPlanningPackArtefact({
      body: { projectId: project.id, proposalBrief: f.input.pack.proposalBrief }, userId: "owner",
      deps: { prisma: memory, buildQuickSiteCheckReport: unexpected,
        getWorkspaceSourceContext: unexpected, getDCPContext: async () => [{ ...f.dcp, score: 1 }],
        captureWorkingSeeSources: async (input: WorkingSeePackCaptureInput) => {
          captures++; captureInput = input;
          return captureWorkingSeePackSources(f.db, input);
        },
      } as unknown as NonNullable<Parameters<typeof createDetailedPlanningPackArtefact>[0]["deps"]>,
    });
    assert.equal(writes, 1); assert.equal(captures, 1);
    const payload = result.artefact.payload as unknown as DetailedPlanningPackContent & { workingSeeSourceCapture: unknown };
    assert.ok(captureInput);
    const read = await readWorkingSeePackSources(f.db, {
      ...captureInput, pack: payload, capture: payload.workingSeeSourceCapture, resolvedZoneCode: "R2",
    });
    assert.equal(read.status, "CAPTURED");
    assert.equal(read.projectId, project.id);
    assert.ok(read.sources.some(source => source.kind === "DCP"));
  });
}
