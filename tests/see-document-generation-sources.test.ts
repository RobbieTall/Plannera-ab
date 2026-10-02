import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import {
  resolveSavedWorkingSeePlanningSources,
  type SavedPlanningSource, type WorkingSeeCouncil, type WorkingSeeSourceBinding,
} from "../src/lib/see-document-generation-sources";

const now = new Date("2026-09-29T02:00:00Z");
const earlier = "2026-09-28T02:00:00Z";
const later = "2026-10-01T02:00:00Z";
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

// In-memory test doubles only. No database writes or actual statutory conclusions.
function fixture(council: WorkingSeeCouncil = "BYRON") {
  const projectId = "test-project-" + council;
  const siteId = "test-site-" + council;
  const dpp = "test-dpp-" + council;
  const qsc = "test-qsc-" + council;
  const binding: WorkingSeeSourceBinding = {
    projectId, siteId, sourceDetailedPlanningPackArtefactId: dpp,
    sourceQuickSiteCheckArtefactId: qsc, assessmentId: "assessment-" + council,
    assessmentProjectId: projectId, assessmentSiteId: siteId,
    assessmentCouncil: council, assessmentZone: "R2", assessmentIsCurrent: true,
    assessmentAt: earlier, assessmentStaleAt: later,
    bindingArtefactId: dpp, bindingAssessmentId: "assessment-" + council,
    bindingEvidenceDigest: hash(council), assessmentEvidenceDigest: hash(council),
    bindingScopeKey: "scope-" + council, assessmentScopeKey: "scope-" + council,
    markers: {},
  };
  const body = "Full body text for the in-memory source-validator test, not a planning control.";
  const source = (kind: "LEP" | "DCP"): SavedPlanningSource => ({
    id: kind + "-" + council, kind, reference: kind === "LEP" ? "LEP cl. 4.3" : "DCP A.1",
    title: kind + " source", sourceVersion: "version-1",
    sourceUrl: kind === "LEP"
      ? "https://legislation.nsw.gov.au/view/html/inforce/current/epi-test"
      : "https://www." + council.toLowerCase() + ".nsw.gov.au/documents/test-dcp.pdf",
    registrySourceUrl: kind === "LEP"
      ? "https://legislation.nsw.gov.au/view/html/inforce/current/epi-test" : null,
    retrievedAt: earlier, effectiveFrom: null, effectiveTo: null, staleAt: later,
    isCurrentAtAssessment: true, contentHash: hash(body), snapshotBodyText: body,
    currentBodyText: body, snapshotClauseId: kind + "-clause", currentClauseId: kind + "-clause",
    currentClauseIsCurrent: true, currentClauseUpdatedAt: earlier, council, markers: {},
  });
  return {
    projectId, siteId, siteUpdatedAt: "2026-09-27T02:00:00Z",
    council, zoneCode: "R2",
    sourceDetailedPlanningPackArtefactId: dpp, sourceQuickSiteCheckArtefactId: qsc,
    binding, sources: [source("LEP"), source("DCP")],
    requiredCitations: [
      { type: "LEP" as const, ref: "LEP cl. 4.3" },
      { type: "DCP" as const, ref: "DCP A.1", excerpt: "in-memory source-validator test" },
    ], now,
  };
}

for (const council of ["BYRON", "KEMPSEY"] as const) {
  test(council + " resolves exact source IDs while preserving original URL, time and hash", () => {
    const input = fixture(council);
    const result = resolveSavedWorkingSeePlanningSources(input);
    assert.deepEqual(result.map((item) => item.id), ["LEP:LEP cl. 4.3", "DCP:DCP A.1"]);
    assert.equal(result[1].officialUrl, input.sources[1].sourceUrl);
    assert.equal(result[0].retrievedAt, new Date(earlier).toISOString());
    assert.equal(result[0].contentHash, input.sources[0].contentHash);
  });
}

test("missing assessment and missing source records stop generation", () => {
  const input = fixture();
  assert.throws(() => resolveSavedWorkingSeePlanningSources({ ...input, binding: null }), /source_scope_mismatch/);
  assert.throws(() => resolveSavedWorkingSeePlanningSources({ ...input, sources: [] }), /source_evidence_missing/);
});

test("another council's source or binding cannot be substituted", () => {
  const byron = fixture(), kempsey = fixture("KEMPSEY");
  assert.throws(() => resolveSavedWorkingSeePlanningSources({ ...byron, sources: kempsey.sources }), /source_evidence_unverified/);
  assert.throws(() => resolveSavedWorkingSeePlanningSources({ ...byron, binding: kempsey.binding }), /source_scope_mismatch/);
});

test("every project/site/DPP/QSC/assessment/digest/scope binding must match", () => {
  for (const key of [
    "projectId", "siteId", "sourceDetailedPlanningPackArtefactId", "sourceQuickSiteCheckArtefactId",
    "assessmentProjectId", "assessmentSiteId", "assessmentZone", "bindingArtefactId",
    "bindingAssessmentId", "bindingEvidenceDigest", "bindingScopeKey",
  ] as const) {
    const input = fixture();
    input.binding[key] = "substituted";
    assert.throws(() => resolveSavedWorkingSeePlanningSources(input), /source_scope_mismatch/, key);
  }
});

test("site changes after assessment, stale assessment and future assessment are rejected", () => {
  for (const patch of [
    { assessmentAt: "2026-09-26T02:00:00Z" }, { assessmentAt: later },
    { assessmentStaleAt: earlier }, { assessmentStaleAt: null }, { assessmentIsCurrent: false },
  ]) {
    const input = fixture();
    Object.assign(input.binding, patch);
    assert.throws(() => resolveSavedWorkingSeePlanningSources(input), /source_scope_mismatch/);
  }
});

test("homepage, non-council, insecure, credential-bearing and query URLs are not source documents", () => {
  for (const url of [
    "https://www.byron.nsw.gov.au/", "https://example.invalid/dcp.pdf",
    "http://www.byron.nsw.gov.au/dcp.pdf", "https://user:password@www.byron.nsw.gov.au/dcp.pdf",
    "https://www.byron.nsw.gov.au/dcp.pdf?token=do-not-log", "https://www.byron.nsw.gov.au/dcp",
  ]) {
    const input = fixture();
    input.sources[1].sourceUrl = url;
    assert.throws(() => resolveSavedWorkingSeePlanningSources(input), /source_evidence_unverified/);
  }
});

test("LEP URL must match its persisted instrument registry, not another official instrument", () => {
  const input = fixture();
  input.sources[0].registrySourceUrl = "https://legislation.nsw.gov.au/view/html/inforce/current/different";
  assert.throws(() => resolveSavedWorkingSeePlanningSources(input), /source_evidence_unverified/);
});

test("ambiguous duplicate citations stop rather than selecting an arbitrary source", () => {
  const input = fixture();
  input.sources.push({ ...input.sources[1], id: "duplicate" });
  assert.throws(() => resolveSavedWorkingSeePlanningSources(input), /source_evidence_missing/);
});

test("stale, future, superseded and not-yet-effective source versions are rejected", () => {
  for (const patch of [
    { retrievedAt: later }, { retrievedAt: "not-a-date" }, { staleAt: earlier },
    { staleAt: null }, { effectiveFrom: later }, { effectiveTo: earlier },
    { isCurrentAtAssessment: false }, { currentClauseIsCurrent: false },
    { currentClauseUpdatedAt: later },
  ]) {
    const input = fixture();
    Object.assign(input.sources[0], patch);
    assert.throws(() => resolveSavedWorkingSeePlanningSources(input), /source_evidence_unverified/);
  }
});

test("changed body, unrelated current clause and fabricated hash are rejected", () => {
  for (const patch of [
    { currentBodyText: "changed" }, { snapshotBodyText: "changed" },
    { contentHash: "a".repeat(64) }, { currentClauseId: "different" },
  ]) {
    const input = fixture();
    Object.assign(input.sources[1], patch);
    assert.throws(() => resolveSavedWorkingSeePlanningSources(input), /source_evidence_unverified/);
  }
});

test("a cited excerpt must actually appear in the exact full snapshot", () => {
  const input = fixture();
  input.requiredCitations[1].excerpt = "This quote is not in the source.";
  assert.throws(() => resolveSavedWorkingSeePlanningSources(input), /source_evidence_unverified/);
});

test("nested fixture markers and synthetic labels cannot authorize real source generation", () => {
  for (const patch of [
    { markers: { nested: [{ fixture: true }] } }, { markers: { authoritative: false } },
    { markers: { synthetic: true } }, { sourceVersion: "synthetic-v1" }, { title: "Fixture DCP" },
  ]) {
    const input = fixture();
    Object.assign(input.sources[0], patch);
    assert.throws(() => resolveSavedWorkingSeePlanningSources(input), /source_evidence_unverified/);
  }
  const input = fixture();
  input.binding.markers = { nested: { synthetic: true } };
  assert.throws(() => resolveSavedWorkingSeePlanningSources(input), /source_scope_mismatch/);
});

test("both LEP and DCP citations are required; unrelated extra rows cannot fill a missing citation", () => {
  const input = fixture();
  assert.throws(() => resolveSavedWorkingSeePlanningSources({ ...input, requiredCitations: [] }), /source_evidence_missing/);
  assert.throws(() => resolveSavedWorkingSeePlanningSources({
    ...input, requiredCitations: input.requiredCitations.slice(0, 1),
  }), /source_evidence_missing/);
  input.sources[1].reference = "different clause";
  assert.throws(() => resolveSavedWorkingSeePlanningSources(input), /source_evidence_missing/);
});

test("repeated genuine citations deduplicate without changing source identity", () => {
  const input = fixture();
  input.requiredCitations.push(input.requiredCitations[0]);
  assert.equal(resolveSavedWorkingSeePlanningSources(input).length, 2);
});

test("source errors are codes only and do not expose source text or credentials", () => {
  const input = fixture();
  input.sources[1].sourceUrl = "https://secret:secret@www.byron.nsw.gov.au/private.pdf";
  try {
    resolveSavedWorkingSeePlanningSources(input);
    assert.fail("Expected rejection");
  } catch (error) {
    assert.equal((error as Error).message, "source_evidence_unverified");
    assert.equal((error as Error).message.includes("secret"), false);
  }
});
