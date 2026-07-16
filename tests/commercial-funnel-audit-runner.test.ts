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
    project: { id: `${key}-internal`, publicId: `${key}-public` },
    site: { address: byron ? "45 Broken Head Road, Byron Bay NSW 2481" : "52 Belgrave St, Kempsey NSW 2440", lgaCode: byron ? "BYRON" : "KEMPSEY", zoneCode: byron ? "SP3" : "E2" },
    quickSiteCheck: { state: "ready", artefactId: `${key}-qsc`, evidence: { label: "Cited", sourceRef: "LEP", citedControlCount: 1 }, reasons: [] },
    detailedPlanningPack: { state: "ready", artefactId: `${key}-dpp`, sourceQuickSiteCheckArtefactId: `${key}-qsc`, citedTopicCount: 2, unresolvedTopics: [], reasons: [] },
    see: { state: "ready", artefactId: `${key}-see`, sourceDetailedPlanningPackArtefactId: `${key}-dpp`, sourceQuickSiteCheckArtefactId: `${key}-qsc`, applicableCitedEvidenceCount: 3, reasons: [] },
    referralEligibility: "quality_chain_referral",
    nextAction: { code: "ready_for_quality_chain_referral", reasonCodes: [] },
  };
  return { ...base, ...patch };
};
const fetchFor = (responses: unknown[]) => {
  const calls: any[] = [];
  const fn = async (url: string, init: any) => {
    calls.push({ url, init });
    const next = responses.shift();
    if (next instanceof Error) throw next;
    if (typeof next === "number") return { ok: false, status: next, json: async () => { throw new Error("raw body must not be read"); } };
    return { ok: true, status: 200, json: async () => next };
  };
  return { calls, fn };
};

test("both golden chains ready exits 0 with deterministic safe output and two header-authenticated GETs", async () => {
  const { calls, fn } = fetchFor([payload("byron"), payload("kempsey")]);
  const result = await runCommercialFunnelAudit(env, fn);
  assert.equal(result.exitCode, 0);
  assert.equal(result.summary.ready, true);
  assert.deepEqual(calls.map((c) => new URL(c.url).searchParams.get("projectId")), ["byron-public", "kempsey-public"]);
  assert(calls.every((c) => c.init.method === "GET" && c.init.headers["x-admin-token"] === "secret-token" && c.init.headers.Accept === "application/json" && !("body" in c.init)));
  const out = JSON.stringify(result.summary);
  assert(!out.includes("secret-token"));
  assert(!calls.some((c) => c.url.includes("secret-token")));
  assert(!out.includes("title"));
  assert(!out.includes("contact"));
  assert(!out.includes("excerpt"));
});

test("one unresolved/non-ready valid response exits 2", async () => {
  const { fn } = fetchFor([payload("byron"), payload("kempsey", { detailedPlanningPack: { state: "needs_expert_review", artefactId: "kempsey-dpp", sourceQuickSiteCheckArtefactId: "kempsey-qsc", citedTopicCount: 1, unresolvedTopics: ["x"], reasons: [] }, referralEligibility: "unresolved_pack_referral" })]);
  const result = await runCommercialFunnelAudit(env, fn);
  assert.equal(result.exitCode, 2);
  assert.equal(result.summary.ready, false);
  assert(result.summary.projects.kempsey.runnerValidationReasons.includes("dpp_not_ready"));
});

test("fail-closed invariant reasons cover provenance, evidence, identity and checkedAt", async () => {
  const broken = payload("byron", { checkedAt: "not-date", site: { address: "wrong", lgaCode: "NOPE", zoneCode: "R1" }, quickSiteCheck: { state: "ready", artefactId: "q", evidence: { label: "Uncited", sourceRef: "", citedControlCount: 0 }, reasons: [] }, detailedPlanningPack: { state: "ready", artefactId: "d", sourceQuickSiteCheckArtefactId: "other", citedTopicCount: 0, unresolvedTopics: [], reasons: [] }, see: { state: "ready", artefactId: "s", sourceDetailedPlanningPackArtefactId: "other", sourceQuickSiteCheckArtefactId: "other", applicableCitedEvidenceCount: 0, reasons: [] } });
  const { fn } = fetchFor([broken, payload("kempsey", { project: { id: "wrong", publicId: "also-wrong" } })]);
  const result = await runCommercialFunnelAudit(env, fn);
  assert.equal(result.exitCode, 2);
  for (const reason of ["invalid_checked_at", "site_address_mismatch", "site_lga_mismatch", "site_zone_mismatch", "qsc_uncited_evidence", "dpp_no_cited_topics", "dpp_qsc_provenance_mismatch", "see_dpp_provenance_mismatch", "see_qsc_provenance_mismatch", "see_no_applicable_cited_evidence"]) assert(result.summary.projects.byron.runnerValidationReasons.includes(reason));
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

test("HTTP, network, invalid JSON, and malformed/extra-field contracts exit 1 without raw leakage", async () => {
  for (const first of [401, 404, 500, new Error("secret-token raw response"), { ...payload("byron"), project: { id: "byron-internal", publicId: "byron-public", contactEmail: "leak@example.com" } }, { nope: true }]) {
    const { fn } = fetchFor([first, payload("kempsey")]);
    const result = await runCommercialFunnelAudit(env, fn);
    assert.equal(result.exitCode, 1);
    assert(!JSON.stringify(result.summary).includes("secret-token"));
    assert(!JSON.stringify(result.summary).includes("raw response"));
  }
});
