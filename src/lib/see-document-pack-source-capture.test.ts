import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test, vi } from "vitest";
import type { DCPClause, PrismaClient, SiteContext } from "@prisma/client";
import type { DetailedPlanningPackContent } from "@/types/workspace";
import type { QuickSiteCheckReport } from "@/types/quick-site-check";
import { captureDcpSource } from "./dcp/dcp-source-capture";
import { captureWorkingSeePackSources, readWorkingSeePackSources, workingSeeDcpCitationBinding,
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
  const instrument = { id: "instrument-" + council,
    name: name + " Local Environmental Plan " + (council === "BYRON" ? "2014" : "2013"),
    instrumentType: "LEP", sourceUrl: "https://legislation.nsw.gov.au/view/html/inforce/current/" +
      (council === "BYRON" ? "epi-2014-0297" : "epi-2013-0712") };
  const leps = ["2.3", "4.3"].map(clauseKey => ({
    id: council + "-lep-" + clauseKey,
    clauseKey: (council === "BYRON" ? "BYRON_2014_" : "KEMP_2013_") + clauseKey.replace(".", "_"),
    instrument, bodyText, title: "In-memory control",
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
      reason: bodyText, citations: [{ ref: dcp.ref, title: dcp.title, headingPath: dcp.headingPath, excerpt: bodyText, score: 1,
        sourceBinding: workingSeeDcpCitationBinding(dcp) }] }],
    topicMatrix: [], unresolvedTopics: [], consultantReviewQuestions: [], nextAction: "Review",
    commercialReady: false,
  } as unknown as DetailedPlanningPackContent;
  const dcpRows = [dcp];
  const queries: string[][] = [];
  const db = {
    clause: { findMany: async ({ where }: { where: { clauseKey?: { in: string[] }; id?: { in: string[] } } }) => {
      if (where.clauseKey) queries.push(where.clauseKey.in);
      return leps.filter(row => (!where.clauseKey || where.clauseKey.in.includes(row.clauseKey)) &&
        (!where.id || where.id.in.includes(row.id)));
    } },
    dCPClause: { findMany: async () => dcpRows },
  } as unknown as Pick<PrismaClient, "clause" | "dCPClause">;
  const input = { site, pack, quickSiteCheck: qsc, dcpClauses: dcpRows };
  return { db, input, leps, dcp, queries };
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
    const { createDetailedPlanningPackArtefact, detailedPlanningPackContentSchema } = await import("./artefact-service");
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
    const parsed = detailedPlanningPackContentSchema.parse(payload);
    assert.ok(parsed.dcpEvidence.flatMap(topic => topic.citations).every(citation =>
      citation.sourceBinding?.clauseId === f.dcp.id));
    assert.deepEqual(parsed.dcpEvidence, payload.dcpEvidence);
    const read = await readWorkingSeePackSources(f.db, {
      ...captureInput, pack: payload, capture: payload.workingSeeSourceCapture, resolvedZoneCode: "R2",
    });
    assert.equal(read.status, "CAPTURED");
    assert.equal(read.projectId, project.id);
    assert.ok(read.sources.some(source => source.kind === "DCP"));
  });
}

function bindCitation(f: ReturnType<typeof fixture>, row: DCPClause) {
  assert.ok(row.ref, "In-memory selected clause must have a reference");
  return { ref: row.ref, title: row.title, headingPath: row.headingPath, excerpt: row.bodyText,
    score: 1, sourceBinding: workingSeeDcpCitationBinding(row) };
}
function duplicateReference(f: ReturnType<typeof fixture>) {
  const row = { ...f.dcp, id: f.dcp.id + "-other", bodyText: f.dcp.bodyText + " Separate chapter requirement.",
    headingPath: ["Other chapter"], numericMeta: { ...f.dcp.numericMeta as object } };
  const sourceUrl = "https://www.byron.nsw.gov.au/plans/other.pdf";
  row.numericMeta = { sourceUrl, sourceCapture: captureDcpSource({
    council: "BYRON", sourceUrl, sourceVersion: "edition-1",
    retrievedAt: earlier.toISOString(), pdfSha256: sha("other-in-memory-pdf"), bodyText: row.bodyText,
  }, now) };
  f.input.dcpClauses.push(row);
  return row;
}
for (const council of ["BYRON", "KEMPSEY"] as const) {
  for (const format of ["numeric", "configured-prefix"] as const) {
    test(council + " accepts only the explicit " + format + " main-clause alias", async () => {
      const f = fixture(council);
      for (const [index, row] of f.leps.entries()) {
        const ref = index === 0 ? "2.3" : "4.3";
        row.clauseKey = format === "numeric" ? ref :
          (council === "BYRON" ? "BYRON_LEP_2014_" : "KEMPSEY_LEP_2013_") + ref.replace(".", "_");
      }
      const capture = await captureWorkingSeePackSources(f.db, f.input, now);
      assert.equal(capture.status, "CAPTURED");
      assert.ok(f.queries[0].includes(f.leps[0].clauseKey));
      assert.equal((await readWorkingSeePackSources(f.db, {
        ...f.input, capture, resolvedZoneCode: "R2",
      }, now)).council, council);
    });
  }
  test(council + " rejects simultaneous numeric and prefixed aliases instead of picking one", async () => {
    const f = fixture(council);
    f.leps.push({ ...f.leps[0], id: "conflicting-alias", clauseKey: "2.3" });
    assert.equal((await captureWorkingSeePackSources(f.db, f.input, now)).status, "UNAVAILABLE");
  });
}
for (const key of ["KEMP_2013_2_3", "BYRON_2013_2_3", "BYRON_2014_SCH_1_SEC_2_3", "unknown_2_3"]) {
  test("Byron cannot resolve wrong-scope key " + key, async () => {
    const f = fixture(); f.leps[0].clauseKey = key;
    assert.equal((await captureWorkingSeePackSources(f.db, f.input, now)).status, "UNAVAILABLE");
  });
}
test("an official host with the wrong instrument, year or instrument type is not enough", async () => {
  for (const change of ["url", "name", "type"]) {
    const f = fixture();
    if (change === "url") f.leps[0].instrument.sourceUrl =
      "https://legislation.nsw.gov.au/view/html/inforce/current/epi-2014-355";
    if (change === "name") {
      f.leps[0].instrument.name = "Byron Local Environmental Plan 2013";
      f.input.quickSiteCheck.lepInstrument!.name = f.leps[0].instrument.name;
    }
    if (change === "type") f.leps[0].instrument.instrumentType = "SEPP";
    assert.equal((await captureWorkingSeePackSources(f.db, f.input, now)).status, "UNAVAILABLE");
  }
});
test("unsupported or schedule-style quick-check references fail closed", async () => {
  for (const ref of ["SCH_1_SEC_2_3", "KEMP_2013_4_3", "4.3 OR 1=1", "cl. 4.3"]) {
    const f = fixture(); f.input.quickSiteCheck.controls.heightOfBuilding.clauseRef = ref;
    assert.equal((await captureWorkingSeePackSources(f.db, f.input, now)).status, "UNAVAILABLE");
  }
});
test("duplicate DCP human references preserve both exact selected records and their sources", async () => {
  const f = fixture(); const other = duplicateReference(f);
  f.input.pack.dcpEvidence[0].citations.push(bindCitation(f, other));
  const capture = await captureWorkingSeePackSources(f.db, f.input, now);
  assert.equal(capture.status, "CAPTURED");
  const read = await readWorkingSeePackSources(f.db, { ...f.input, capture, resolvedZoneCode: "R2" }, now);
  assert.deepEqual(read.sources.filter(source => source.kind === "DCP").map(source => source.clauseId).sort(),
    [f.dcp.id, other.id].sort());
  assert.equal(new Set(read.sources.filter(source => source.kind === "DCP").map(source => source.sourceUrl)).size, 2);
});
test("an unselected row with the same label is not captured", async () => {
  const f = fixture(); const other = duplicateReference(f);
  f.input.pack.dcpEvidence[0].citations = [bindCitation(f, other)];
  const capture = await captureWorkingSeePackSources(f.db, f.input, now);
  assert.equal(capture.status, "CAPTURED");
  if (capture.status === "CAPTURED") assert.deepEqual(
    capture.sources.filter(source => source.kind === "DCP").map(source => source.clauseId), [other.id]);
});
test("a repeated identical row across topics is captured once without merging distinct records", async () => {
  const f = fixture();
  f.input.dcpClauses.push({ ...f.dcp });
  f.input.pack.dcpEvidence.push({ ...f.input.pack.dcpEvidence[0], topicId: "other" });
  const capture = await captureWorkingSeePackSources(f.db, f.input, now);
  assert.equal(capture.status, "CAPTURED");
  if (capture.status === "CAPTURED") assert.equal(capture.sources.filter(source => source.kind === "DCP").length, 1);
});
test("legacy unbound citations are not silently assigned or upgraded even when their label is unique", async () => {
  const f = fixture(); delete f.input.pack.dcpEvidence[0].citations[0].sourceBinding;
  assert.equal((await captureWorkingSeePackSources(f.db, f.input, now)).status, "UNAVAILABLE");
});
test("DCP binding rejects wrong row, council, body, metadata, title, heading and inconsistent repeated IDs", async () => {
  for (const change of ["id", "council", "body", "metadata", "title", "heading", "duplicate"]) {
    const f = fixture();
    if (change === "id") f.input.pack.dcpEvidence[0].citations[0].sourceBinding!.clauseId = "missing";
    if (change === "council") f.dcp.lgaCode = "KEMPSEY";
    if (change === "body") f.dcp.bodyText += " changed";
    if (change === "metadata") f.dcp.numericMeta = {};
    if (change === "title") f.dcp.title = "Other title";
    if (change === "heading") f.dcp.headingPath = ["Other heading"];
    if (change === "duplicate") f.input.dcpClauses.push({ ...f.dcp, bodyText: "different" });
    assert.equal((await captureWorkingSeePackSources(f.db, f.input, now)).status, "UNAVAILABLE", change);
  }
});
test("read requires exact source coverage even if an altered envelope digest is recomputed", async () => {
  for (const change of ["missing-dcp", "extra-dcp", "missing-lep", "duplicate-id"]) {
    const f = await saved();
    assert.equal(f.capture.status, "CAPTURED");
    if (f.capture.status !== "CAPTURED") return;
    const sources = [...f.capture.sources];
    if (change === "missing-dcp") sources.splice(sources.findIndex(s => s.kind === "DCP"), 1);
    if (change === "missing-lep") sources.splice(sources.findIndex(s => s.kind === "LEP"), 1);
    if (change === "extra-dcp") sources.push({ ...sources.find(s => s.kind === "DCP")!, clauseId: "uncited" });
    if (change === "duplicate-id") sources.push({ ...sources[0] });
    const { digest: unused, ...base } = { ...f.capture, sources };
    const capture = { ...base, digest: sha(JSON.stringify(base)) };
    await assert.rejects(readWorkingSeePackSources(f.db, { ...f.input, capture, resolvedZoneCode: "R2" }, now),
      /source_capture_incomplete/);
  }
});
test("historical v1 envelopes remain read-only and are not rewritten to v2", async () => {
  const f = await saved();
  if (f.capture.status !== "CAPTURED") throw new Error("Missing in-memory capture");
  delete f.input.pack.dcpEvidence[0].citations[0].sourceBinding;
  const { digest: unused, ...base } = {
    ...f.capture, schema: "working-see-pack-source-capture.v1" as const,
    packDigest: sha(JSON.stringify(f.input.pack)),
  };
  const capture = { ...base, digest: sha(JSON.stringify(base)) };
  const before = JSON.stringify(capture);
  const read = await readWorkingSeePackSources(f.db, { ...f.input, capture, resolvedZoneCode: "R2" }, now);
  assert.equal(read.schema, "working-see-pack-source-capture.v1");
  assert.equal(JSON.stringify(capture), before);
});

test("a null DCP reference cannot become a captured citation", async () => {
  const f = fixture(); f.dcp.ref = null;
  assert.equal((await captureWorkingSeePackSources(f.db, f.input, now)).status, "UNAVAILABLE");
});
