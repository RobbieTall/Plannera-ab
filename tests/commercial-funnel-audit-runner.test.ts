import assert from "node:assert/strict";
import test from "node:test";

import { runCommercialFunnelAudit } from "../src/lib/commercial-funnel-audit-runner";

const env = {
  PLANNERA_AUDIT_BASE_URL: "https://example.com/some/path",
  PLANNERA_AUDIT_ADMIN_TOKEN: "secret-token",
  PLANNERA_BYRON_PROJECT_ID: "byron-public",
  PLANNERA_KEMPSEY_PROJECT_ID: "kempsey-public",
  PLANNERA_AUDIT_EXPECTED_COMMIT: "4e8dc9c80af957635519c964286950869e766e99",
};
const payload = (key: "byron" | "kempsey", patch: Record<string, unknown> = {}) => {
  const byron = key === "byron";
  const base = {
    version: "commercial_funnel_audit.v1",
    checkedAt: "2026-07-16T00:00:00.000Z",
    project: { id: `${key}-internal`, publicId: `${key}-public`, title: `${key} private title` },
    site: { address: byron ? "45 Broken Head Road, Byron Bay NSW 2481" : "52 Belgrave St, Kempsey NSW 2440", lgaName: byron ? "Byron Shire" : "Kempsey Shire", lgaCode: byron ? "BYRON" : "KEMPSEY", zoneLabel: byron ? "SP3 Tourist" : "E2 Commercial Centre", zoneCode: byron ? "SP3" : "E2" },
    quickSiteCheck: { state: "ready", artefactId: `${key}-qsc`, evidence: { label: "Cited", sourceRef: "LEP", citedControlCount: 1, summary: "private source summary" }, reasons: ["selected_dpp_source_qsc_current_cited"] },
    detailedPlanningPack: { state: "ready", artefactId: `${key}-dpp`, sourceQuickSiteCheckArtefactId: `${key}-qsc`, citedTopicCount: 2, unresolvedTopics: [], reasons: ["active_current_site_dpp_qsc_chain_ready"] },
    see: { state: "ready", artefactId: `${key}-see`, sourceDetailedPlanningPackArtefactId: `${key}-dpp`, sourceQuickSiteCheckArtefactId: `${key}-qsc`, applicableCitedEvidenceCount: 3, reasons: ["matching_active_current_site_see_ready"] },
    referralEligibility: "quality_chain_referral",
    nextAction: { code: "ready_for_quality_chain_referral", reasonCodes: ["z_reason", "a_reason"] },
  };
  return { ...base, ...patch };
};
const fetchFor = (responses: unknown[]) => {
  const calls: any[] = [];
  const fn = async (url: string, init: any) => {
    calls.push({ url, init });
    const next = responses.shift();
    if (next instanceof Error) throw next;
    if (next === "invalid-json") return { ok: true, status: 200, json: async () => { throw new SyntaxError("raw body secret-token"); } };
    if (typeof next === "number") return { ok: false, status: next, json: async () => { throw new Error("raw body must not be read"); } };
    return { ok: true, status: 200, json: async () => next };
  };
  return { calls, fn };
};
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const badByron = (mutate: (p: any) => void) => { const p = clone(payload("byron")); mutate(p); return p; };
const expectExit1ForByron = async (first: unknown, reasonPart?: string) => {
  const { fn } = fetchFor([first, payload("kempsey")]);
  const result = await runCommercialFunnelAudit(env, fn);
  assert.equal(result.exitCode, 1);
  if (reasonPart) assert(result.summary.projects.byron.runnerValidationReasons.some((r) => r.includes(reasonPart)), JSON.stringify(result.summary.projects.byron.runnerValidationReasons));
  assertSafeSummaryShape(result.summary);
};
function assertSafeSummaryShape(summary: unknown) {
  assert.deepEqual(Object.keys(summary as any), ["runnerVersion", "schemaVersion", "expectedCommit", "baseOrigin", "ready", "projects"]);
  for (const key of ["byron", "kempsey"] as const) {
    const project = (summary as any).projects[key];
    assert.deepEqual(Object.keys(project), ["checkedAt", "project", "site", "quickSiteCheck", "detailedPlanningPack", "see", "referralEligibility", "nextAction", "ready", "runnerValidationReasons"]);
    assert.deepEqual(Object.keys(project.project), ["id", "publicId"]);
    assert.deepEqual(Object.keys(project.site), ["address", "lgaCode", "zoneCode"]);
    assert.deepEqual(Object.keys(project.quickSiteCheck), ["state", "artefactId", "sourceRef", "citedControlCount"]);
    assert.deepEqual(Object.keys(project.detailedPlanningPack), ["state", "artefactId", "sourceQuickSiteCheckArtefactId", "citedTopicCount", "unresolvedTopicCount"]);
    assert.deepEqual(Object.keys(project.see), ["state", "artefactId", "sourceDetailedPlanningPackArtefactId", "sourceQuickSiteCheckArtefactId", "applicableCitedEvidenceCount"]);
    assert.deepEqual(Object.keys(project.nextAction), ["code", "reasonCodes"]);
  }
  const out = JSON.stringify(summary);
  for (const forbidden of ["secret-token", "private title", "private source summary", "contact", "excerpt", "raw body"]) assert(!out.includes(forbidden), forbidden);
}

test("both golden chains ready exits 0 with deterministic safe output and two header-authenticated GETs", async () => {
  const { calls, fn } = fetchFor([payload("byron"), payload("kempsey")]);
  const result = await runCommercialFunnelAudit(env, fn);
  assert.equal(result.exitCode, 0);
  assert.equal(result.summary.ready, true);
  assert.deepEqual(calls.map((c) => new URL(c.url).searchParams.get("projectId")), ["byron-public", "kempsey-public"]);
  assert(calls.every((c) => c.init.method === "GET" && c.init.headers["x-admin-token"] === "secret-token" && c.init.headers.Accept === "application/json" && !("body" in c.init)));
  assert(!calls.some((c) => c.url.includes("secret-token")));
  assert.deepEqual(result.summary.projects.byron.nextAction.reasonCodes, ["a_reason", "z_reason"]);
  assertSafeSummaryShape(result.summary);
});

test("canonical production address variants and LGA names satisfy golden identity", async () => {
  const byron = payload("byron", {
    site: { address: "45 Broken Head Rd, Byron Bay NSW 2481, Australia", lgaName: "Byron Shire Council", lgaCode: null, zoneLabel: "SP3 Tourist", zoneCode: "SP3" },
  });
  const kempsey = payload("kempsey", {
    site: { address: "52 Belgrave Street, Kempsey NSW 2440, Australia", lgaName: "Kempsey Shire", lgaCode: null, zoneLabel: "E2 Commercial Centre", zoneCode: "E2" },
  });
  const { fn } = fetchFor([byron, kempsey]);
  const result = await runCommercialFunnelAudit(env, fn);
  assert.equal(result.exitCode, 0);
  assert.equal(result.summary.ready, true);
  assert(!result.summary.projects.byron.runnerValidationReasons.includes("site_address_mismatch"));
  assert(!result.summary.projects.byron.runnerValidationReasons.includes("site_lga_mismatch"));
  assert(!result.summary.projects.kempsey.runnerValidationReasons.includes("site_address_mismatch"));
  assert(!result.summary.projects.kempsey.runnerValidationReasons.includes("site_lga_mismatch"));
});

test("structurally valid non-ready response remains exit 2", async () => {
  const nonReady = payload("kempsey", { detailedPlanningPack: { state: "needs_expert_review", artefactId: "kempsey-dpp", sourceQuickSiteCheckArtefactId: "kempsey-qsc", citedTopicCount: 1, unresolvedTopics: ["topic"], reasons: ["active_dpp_unresolved_topics"] }, see: { state: "missing", artefactId: null, sourceDetailedPlanningPackArtefactId: null, sourceQuickSiteCheckArtefactId: null, applicableCitedEvidenceCount: 0, reasons: ["see_not_applicable_for_unresolved_active_pack"] }, referralEligibility: "unresolved_pack_referral", nextAction: { code: "refer_unresolved_pack_for_expert_review", reasonCodes: ["active_dpp_unresolved_topics"] } });
  const { fn } = fetchFor([payload("byron"), nonReady]);
  const result = await runCommercialFunnelAudit(env, fn);
  assert.equal(result.exitCode, 2);
  assert.equal(result.summary.ready, false);
  assert(result.summary.projects.kempsey.runnerValidationReasons.includes("dpp_not_ready"));
  assert(result.summary.projects.kempsey.runnerValidationReasons.includes("see_not_ready"));
});

test("golden invariant failures with a valid contract exit 2", async () => {
  const broken = payload("byron", { checkedAt: "2026-07-16T01:02:03.004Z", site: { address: "wrong", lgaName: "Nope", lgaCode: "NOPE", zoneLabel: "R1 General Residential", zoneCode: "R1" }, quickSiteCheck: { state: "ready", artefactId: "q", evidence: { label: "Uncited", sourceRef: "", citedControlCount: 0, summary: null }, reasons: [] }, detailedPlanningPack: { state: "ready", artefactId: "d", sourceQuickSiteCheckArtefactId: "other", citedTopicCount: 0, unresolvedTopics: [], reasons: [] }, see: { state: "ready", artefactId: "s", sourceDetailedPlanningPackArtefactId: "other", sourceQuickSiteCheckArtefactId: "other", applicableCitedEvidenceCount: 0, reasons: [] } });
  const { fn } = fetchFor([broken, payload("kempsey", { project: { id: "wrong", publicId: "also-wrong", title: null } })]);
  const result = await runCommercialFunnelAudit(env, fn);
  assert.equal(result.exitCode, 2);
  for (const reason of ["site_address_mismatch", "site_lga_mismatch", "site_zone_mismatch", "qsc_uncited_evidence", "dpp_no_cited_topics", "dpp_qsc_provenance_mismatch", "see_dpp_provenance_mismatch", "see_qsc_provenance_mismatch", "see_no_applicable_cited_evidence"]) assert(result.summary.projects.byron.runnerValidationReasons.includes(reason));
  assert(result.summary.projects.kempsey.runnerValidationReasons.includes("response_project_id_mismatch"));
});

test("missing env and unsafe base URLs fail before fetch", async () => {
  let count = 0;
  assert.equal((await runCommercialFunnelAudit({ ...env, PLANNERA_AUDIT_ADMIN_TOKEN: " " }, async () => { count++; throw new Error(); })).exitCode, 1);
  assert.equal(count, 0);
  for (const bad of ["https://user:pass@example.com", "https://example.com?x=1", "https://example.com#x", "ftp://example.com"]) {
    const result = await runCommercialFunnelAudit({ ...env, PLANNERA_AUDIT_BASE_URL: bad }, async () => { throw new Error("no fetch"); });
    assert.equal(result.exitCode, 1);
  }
});

test("contract failures exit 1 for missing fields, wrong types/enums/arrays/counts, extras, bad ISO, and unsupported version", async () => {
  await expectExit1ForByron(badByron((p) => { delete p.project.title; }), "project_shape");
  await expectExit1ForByron(badByron((p) => { p.project.publicId = 42; }), "project_publicId_type");
  await expectExit1ForByron(badByron((p) => { p.site.extra = "nope"; }), "site_shape");
  await expectExit1ForByron(badByron((p) => { p.quickSiteCheck.state = "READY"; }), "qsc_state_enum");
  await expectExit1ForByron(badByron((p) => { delete p.quickSiteCheck.evidence.summary; }), "qsc_evidence_shape");
  await expectExit1ForByron(badByron((p) => { p.quickSiteCheck.evidence.citedControlCount = Number.NaN; }), "qsc_evidence_citedControlCount_type");
  await expectExit1ForByron(badByron((p) => { p.quickSiteCheck.reasons = ["ok", 1]; }), "qsc_reasons_type");
  await expectExit1ForByron(badByron((p) => { p.detailedPlanningPack.citedTopicCount = -1; }), "dpp_citedTopicCount_type");
  await expectExit1ForByron(badByron((p) => { p.detailedPlanningPack.unresolvedTopics = ["ok", null]; }), "dpp_unresolvedTopics_type");
  await expectExit1ForByron(badByron((p) => { p.see.applicableCitedEvidenceCount = Infinity; }), "see_applicableCitedEvidenceCount_type");
  await expectExit1ForByron(badByron((p) => { p.nextAction.reasonCodes = ["ok", false]; }), "nextAction_reasonCodes_type");
  await expectExit1ForByron(badByron((p) => { p.referralEligibility = "paid"; }), "referralEligibility_enum");
  await expectExit1ForByron(badByron((p) => { p.checkedAt = "July 16 2026"; }), "checkedAt_iso");
  await expectExit1ForByron(badByron((p) => { p.version = "commercial_funnel_audit.v0"; }), "unsupported_version");
  await expectExit1ForByron({ ...payload("byron"), extra: true }, "root_shape");
});

test("HTTP, network, and response.json rejection exit 1 without raw leakage", async () => {
  for (const first of [401, 404, 500, new Error("secret-token raw body"), "invalid-json"]) {
    const { fn } = fetchFor([first, payload("kempsey")]);
    const result = await runCommercialFunnelAudit(env, fn);
    assert.equal(result.exitCode, 1);
    assertSafeSummaryShape(result.summary);
  }
});
