export type AuditRunnerEnv = Record<string, string | undefined>;
export type AuditRunnerFetch = (url: string, init: { method: "GET"; headers: Record<string, string>; body?: never }) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export type AuditRunnerResult = { exitCode: 0 | 1 | 2; summary: AuditRunSummary };
export type AuditRunSummary = {
  runnerVersion: "commercial_funnel_live_audit_runner.v1";
  schemaVersion: "commercial_funnel_audit.v1";
  expectedCommit: string;
  baseOrigin: string;
  ready: boolean;
  projects: { byron: ProjectSummary; kempsey: ProjectSummary };
};

type GoldenKey = "byron" | "kempsey";
type GoldenConfig = { key: GoldenKey; env: "PLANNERA_BYRON_PROJECT_ID" | "PLANNERA_KEMPSEY_PROJECT_ID"; address: string; lgaCode: string; zoneCode: string };
const GOLDENS: readonly GoldenConfig[] = [
  { key: "byron", env: "PLANNERA_BYRON_PROJECT_ID", address: "45 Broken Head Road, Byron Bay NSW 2481", lgaCode: "BYRON", zoneCode: "SP3" },
  { key: "kempsey", env: "PLANNERA_KEMPSEY_PROJECT_ID", address: "52 Belgrave St, Kempsey NSW 2440", lgaCode: "KEMPSEY", zoneCode: "E2" },
];
const ENV_KEYS = ["PLANNERA_AUDIT_BASE_URL", "PLANNERA_AUDIT_ADMIN_TOKEN", "PLANNERA_BYRON_PROJECT_ID", "PLANNERA_KEMPSEY_PROJECT_ID", "PLANNERA_AUDIT_EXPECTED_COMMIT"] as const;

export type ProjectSummary = {
  checkedAt: string | null;
  project: { id: string | null; publicId: string | null };
  site: { address: string | null; lgaCode: string | null; zoneCode: string | null };
  quickSiteCheck: { state: string | null; artefactId: string | null; sourceRef: string | null; citedControlCount: number | null };
  detailedPlanningPack: { state: string | null; artefactId: string | null; sourceQuickSiteCheckArtefactId: string | null; citedTopicCount: number | null; unresolvedTopicCount: number | null };
  see: { state: string | null; artefactId: string | null; sourceDetailedPlanningPackArtefactId: string | null; sourceQuickSiteCheckArtefactId: string | null; applicableCitedEvidenceCount: number | null };
  referralEligibility: string | null;
  nextAction: { code: string | null; reasonCodes: string[] };
  ready: boolean;
  runnerValidationReasons: string[];
};

const blankSummary = (reasons: string[]): ProjectSummary => ({ checkedAt: null, project: { id: null, publicId: null }, site: { address: null, lgaCode: null, zoneCode: null }, quickSiteCheck: { state: null, artefactId: null, sourceRef: null, citedControlCount: null }, detailedPlanningPack: { state: null, artefactId: null, sourceQuickSiteCheckArtefactId: null, citedTopicCount: null, unresolvedTopicCount: null }, see: { state: null, artefactId: null, sourceDetailedPlanningPackArtefactId: null, sourceQuickSiteCheckArtefactId: null, applicableCitedEvidenceCount: null }, referralEligibility: null, nextAction: { code: null, reasonCodes: [] }, ready: false, runnerValidationReasons: reasons });
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const stringOrNull = (v: unknown) => typeof v === "string" || v === null;
const nonEmpty = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const keysOnly = (o: Record<string, unknown>, keys: string[]) => Object.keys(o).every((k) => keys.includes(k));

export function parseAuditEnv(env: AuditRunnerEnv) {
  const missing = ENV_KEYS.filter((k) => !env[k]?.trim());
  if (missing.length) return { ok: false as const, reasons: missing.map((k) => `missing_env:${k}`) };
  let url: URL;
  try { url = new URL(env.PLANNERA_AUDIT_BASE_URL!.trim()); } catch { return { ok: false as const, reasons: ["invalid_base_url"] }; }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) return { ok: false as const, reasons: ["invalid_base_url"] };
  return { ok: true as const, baseUrl: url, token: env.PLANNERA_AUDIT_ADMIN_TOKEN!.trim(), expectedCommit: env.PLANNERA_AUDIT_EXPECTED_COMMIT!.trim(), projectIds: { byron: env.PLANNERA_BYRON_PROJECT_ID!.trim(), kempsey: env.PLANNERA_KEMPSEY_PROJECT_ID!.trim() } };
}

function auditUrl(baseUrl: URL, projectId: string) {
  const url = new URL("/api/admin/commercial-funnel-audit", baseUrl.origin);
  url.searchParams.set("projectId", projectId);
  return url.toString();
}

function validatePayload(payload: unknown, requestedId: string, golden: GoldenConfig): ProjectSummary {
  const reasons: string[] = [];
  if (!isRecord(payload) || !keysOnly(payload, ["version", "checkedAt", "project", "site", "quickSiteCheck", "detailedPlanningPack", "see", "referralEligibility", "nextAction"])) return blankSummary(["malformed_contract"]);
  const p = payload as Record<string, unknown>;
  const project = isRecord(p.project) ? p.project : null, site = isRecord(p.site) ? p.site : null, q = isRecord(p.quickSiteCheck) ? p.quickSiteCheck : null, d = isRecord(p.detailedPlanningPack) ? p.detailedPlanningPack : null, s = isRecord(p.see) ? p.see : null, n = isRecord(p.nextAction) ? p.nextAction : null;
  if (p.version !== "commercial_funnel_audit.v1") reasons.push("unsupported_version");
  if (!nonEmpty(p.checkedAt) || Number.isNaN(Date.parse(p.checkedAt))) reasons.push("invalid_checked_at");
  if (!project || !keysOnly(project, ["id", "publicId", "title"])) reasons.push("malformed_project");
  if (!site || !keysOnly(site, ["address", "lgaName", "lgaCode", "zoneLabel", "zoneCode"])) reasons.push("malformed_site");
  if (!q || !keysOnly(q, ["state", "artefactId", "evidence", "reasons"])) reasons.push("malformed_qsc");
  if (!d || !keysOnly(d, ["state", "artefactId", "sourceQuickSiteCheckArtefactId", "citedTopicCount", "unresolvedTopics", "reasons"])) reasons.push("malformed_dpp");
  if (!s || !keysOnly(s, ["state", "artefactId", "sourceDetailedPlanningPackArtefactId", "sourceQuickSiteCheckArtefactId", "applicableCitedEvidenceCount", "reasons"])) reasons.push("malformed_see");
  if (!n || !keysOnly(n, ["code", "reasonCodes"])) reasons.push("malformed_next_action");
  const ev = q && isRecord(q.evidence) ? q.evidence : null;
  if (!ev || !keysOnly(ev, ["label", "sourceRef", "citedControlCount", "summary"])) reasons.push("malformed_qsc_evidence");
  const projectId = project && typeof project.id === "string" ? project.id : null;
  const publicId = project && stringOrNull(project.publicId) ? project.publicId : null;
  if (requestedId !== projectId && requestedId !== publicId) reasons.push("response_project_id_mismatch");
  if (site?.address !== golden.address) reasons.push("site_address_mismatch");
  if (site?.lgaCode !== golden.lgaCode) reasons.push("site_lga_mismatch");
  if (site?.zoneCode !== golden.zoneCode) reasons.push("site_zone_mismatch");
  if (q?.state !== "ready") reasons.push("qsc_not_ready");
  if (!nonEmpty(q?.artefactId)) reasons.push("qsc_artefact_missing");
  if (ev?.label !== "Cited" || !nonEmpty(ev?.sourceRef)) reasons.push("qsc_uncited_evidence");
  if (d?.state !== "ready") reasons.push("dpp_not_ready");
  if (!nonEmpty(d?.artefactId)) reasons.push("dpp_artefact_missing");
  if (typeof d?.citedTopicCount !== "number" || d.citedTopicCount <= 0) reasons.push("dpp_no_cited_topics");
  if (!Array.isArray(d?.unresolvedTopics) || d.unresolvedTopics.length) reasons.push("dpp_unresolved_topics");
  if (d?.sourceQuickSiteCheckArtefactId !== q?.artefactId) reasons.push("dpp_qsc_provenance_mismatch");
  if (s?.state !== "ready") reasons.push("see_not_ready");
  if (!nonEmpty(s?.artefactId)) reasons.push("see_artefact_missing");
  if (typeof s?.applicableCitedEvidenceCount !== "number" || s.applicableCitedEvidenceCount <= 0) reasons.push("see_no_applicable_cited_evidence");
  if (s?.sourceDetailedPlanningPackArtefactId !== d?.artefactId) reasons.push("see_dpp_provenance_mismatch");
  if (s?.sourceQuickSiteCheckArtefactId !== q?.artefactId) reasons.push("see_qsc_provenance_mismatch");
  if (p.referralEligibility !== "quality_chain_referral") reasons.push("referral_not_quality_chain");
  if (n?.code !== "ready_for_quality_chain_referral") reasons.push("next_action_not_ready");
  const summary: ProjectSummary = { checkedAt: nonEmpty(p.checkedAt) ? p.checkedAt : null, project: { id: projectId, publicId }, site: { address: typeof site?.address === "string" ? site.address : null, lgaCode: typeof site?.lgaCode === "string" ? site.lgaCode : null, zoneCode: typeof site?.zoneCode === "string" ? site.zoneCode : null }, quickSiteCheck: { state: typeof q?.state === "string" ? q.state : null, artefactId: stringOrNull(q?.artefactId) ? q.artefactId : null, sourceRef: ev && stringOrNull(ev.sourceRef) ? ev.sourceRef : null, citedControlCount: ev && typeof ev.citedControlCount === "number" ? ev.citedControlCount : null }, detailedPlanningPack: { state: typeof d?.state === "string" ? d.state : null, artefactId: stringOrNull(d?.artefactId) ? d.artefactId : null, sourceQuickSiteCheckArtefactId: stringOrNull(d?.sourceQuickSiteCheckArtefactId) ? d.sourceQuickSiteCheckArtefactId : null, citedTopicCount: typeof d?.citedTopicCount === "number" ? d.citedTopicCount : null, unresolvedTopicCount: Array.isArray(d?.unresolvedTopics) ? d.unresolvedTopics.length : null }, see: { state: typeof s?.state === "string" ? s.state : null, artefactId: stringOrNull(s?.artefactId) ? s.artefactId : null, sourceDetailedPlanningPackArtefactId: stringOrNull(s?.sourceDetailedPlanningPackArtefactId) ? s.sourceDetailedPlanningPackArtefactId : null, sourceQuickSiteCheckArtefactId: stringOrNull(s?.sourceQuickSiteCheckArtefactId) ? s.sourceQuickSiteCheckArtefactId : null, applicableCitedEvidenceCount: typeof s?.applicableCitedEvidenceCount === "number" ? s.applicableCitedEvidenceCount : null }, referralEligibility: typeof p.referralEligibility === "string" ? p.referralEligibility : null, nextAction: { code: typeof n?.code === "string" ? n.code : null, reasonCodes: Array.isArray(n?.reasonCodes) && n.reasonCodes.every((r) => typeof r === "string") ? [...n.reasonCodes].sort() : [] }, ready: reasons.length === 0, runnerValidationReasons: reasons.sort() };
  return summary;
}

export async function runCommercialFunnelAudit(env: AuditRunnerEnv, fetchImpl: AuditRunnerFetch): Promise<AuditRunnerResult> {
  const parsed = parseAuditEnv(env);
  if (!parsed.ok) return { exitCode: 1, summary: { runnerVersion: "commercial_funnel_live_audit_runner.v1", schemaVersion: "commercial_funnel_audit.v1", expectedCommit: env.PLANNERA_AUDIT_EXPECTED_COMMIT?.trim() ?? "", baseOrigin: "", ready: false, projects: { byron: blankSummary(parsed.reasons), kempsey: blankSummary(parsed.reasons) } } };
  const projects = {} as Record<GoldenKey, ProjectSummary>;
  let hardFailure = false;
  for (const golden of GOLDENS) {
    const requested = parsed.projectIds[golden.key];
    try {
      const response = await fetchImpl(auditUrl(parsed.baseUrl, requested), { method: "GET", headers: { "x-admin-token": parsed.token, Accept: "application/json" } });
      if (!response.ok) { hardFailure = true; projects[golden.key] = blankSummary([`http_status:${response.status}`]); continue; }
      projects[golden.key] = validatePayload(await response.json(), requested, golden);
    } catch { hardFailure = true; projects[golden.key] = blankSummary(["fetch_or_json_failure"]); }
  }
  const ready = projects.byron.ready && projects.kempsey.ready;
  const contractFailure = ([projects.byron, projects.kempsey] as ProjectSummary[]).some((project) => project.runnerValidationReasons.some((reason) => reason.startsWith("malformed_") || reason === "unsupported_version"));
  return { exitCode: hardFailure || contractFailure ? 1 : ready ? 0 : 2, summary: { runnerVersion: "commercial_funnel_live_audit_runner.v1", schemaVersion: "commercial_funnel_audit.v1", expectedCommit: parsed.expectedCommit, baseOrigin: parsed.baseUrl.origin, ready, projects: { byron: projects.byron, kempsey: projects.kempsey } } };
}
