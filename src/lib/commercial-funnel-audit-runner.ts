export type AuditRunnerEnv = Record<string, string | undefined>;
export type AuditRunnerFetch = (url: string, init: { method: "GET"; headers: Record<string, string>; body?: never }) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export type AuditRunnerResult = { exitCode: 0 | 1 | 2; summary: AuditRunSummary };
export type AuditRunSummary = {
  runnerVersion: "commercial_funnel_live_audit_runner.v2";
  schemaVersion: "commercial_funnel_audit.v1";
  expectedCommit: string;
  baseOrigin: string;
  acceptedJourney: boolean;
  commercialReady: boolean;
  ready: boolean;
  projects: { byron: ProjectSummary; kempsey: ProjectSummary };
};

type GoldenKey = "byron" | "kempsey";
type GoldenConfig = { key: GoldenKey; env: "PLANNERA_BYRON_PROJECT_ID" | "PLANNERA_KEMPSEY_PROJECT_ID"; address: string; lgaCode: string; zoneCode: string };
type ContractResult = { ok: true; value: AuditContract } | { ok: false; reasons: string[] };
type AuditContract = {
  version: "commercial_funnel_audit.v1";
  checkedAt: string;
  project: { id: string; publicId: string | null; title: string | null };
  site: { address: string | null; lgaName: string | null; lgaCode: string | null; zoneLabel: string | null; zoneCode: string | null };
  quickSiteCheck: { state: "missing" | "stale_mismatched" | "unresolved" | "ready"; artefactId: string | null; evidence: { label: string | null; sourceRef: string | null; citedControlCount: number | null; summary: string | null }; reasons: string[] };
  detailedPlanningPack: { state: "missing" | "stale_mismatched_malformed" | "needs_expert_review" | "ready"; artefactId: string | null; sourceQuickSiteCheckArtefactId: string | null; citedTopicCount: number; unresolvedTopics: string[]; reasons: string[] };
  see: { state: "missing" | "stale_mismatched_legacy" | "ready"; artefactId: string | null; sourceDetailedPlanningPackArtefactId: string | null; sourceQuickSiteCheckArtefactId: string | null; applicableCitedEvidenceCount: number; reasons: string[] };
  referralEligibility: "none" | "unresolved_pack_referral" | "quality_chain_referral";
  nextAction: { code: string; reasonCodes: string[] };
};
const GOLDENS: readonly GoldenConfig[] = [
  { key: "byron", env: "PLANNERA_BYRON_PROJECT_ID", address: "45 Broken Head Road, Byron Bay NSW 2481", lgaCode: "BYRON", zoneCode: "SP3" },
  { key: "kempsey", env: "PLANNERA_KEMPSEY_PROJECT_ID", address: "52 Belgrave St, Kempsey NSW 2440", lgaCode: "KEMPSEY", zoneCode: "E2" },
];
const ENV_KEYS = ["PLANNERA_AUDIT_BASE_URL", "PLANNERA_AUDIT_ADMIN_TOKEN", "PLANNERA_BYRON_PROJECT_ID", "PLANNERA_KEMPSEY_PROJECT_ID", "PLANNERA_AUDIT_EXPECTED_COMMIT"] as const;
const qscStates = ["missing", "stale_mismatched", "unresolved", "ready"] as const;
const dppStates = ["missing", "stale_mismatched_malformed", "needs_expert_review", "ready"] as const;
const seeStates = ["missing", "stale_mismatched_legacy", "ready"] as const;
const referralStates = ["none", "unresolved_pack_referral", "quality_chain_referral"] as const;

export type ProjectSummary = {
  checkedAt: string | null;
  project: { id: string | null; publicId: string | null };
  site: { address: string | null; lgaCode: string | null; zoneCode: string | null };
  quickSiteCheck: { state: string | null; artefactId: string | null; sourceRef: string | null; citedControlCount: number | null };
  detailedPlanningPack: { state: string | null; artefactId: string | null; sourceQuickSiteCheckArtefactId: string | null; citedTopicCount: number | null; unresolvedTopicCount: number | null };
  see: { state: string | null; artefactId: string | null; sourceDetailedPlanningPackArtefactId: string | null; sourceQuickSiteCheckArtefactId: string | null; applicableCitedEvidenceCount: number | null };
  referralEligibility: string | null;
  nextAction: { code: string | null; reasonCodes: string[] };
  acceptedJourney: boolean;
  terminalPath: "quality_chain_referral" | "unresolved_pack_referral" | "invalid";
  commercialReady: boolean;
  ready: boolean;
  runnerValidationReasons: string[];
};

const blankSummary = (reasons: string[]): ProjectSummary => ({ checkedAt: null, project: { id: null, publicId: null }, site: { address: null, lgaCode: null, zoneCode: null }, quickSiteCheck: { state: null, artefactId: null, sourceRef: null, citedControlCount: null }, detailedPlanningPack: { state: null, artefactId: null, sourceQuickSiteCheckArtefactId: null, citedTopicCount: null, unresolvedTopicCount: null }, see: { state: null, artefactId: null, sourceDetailedPlanningPackArtefactId: null, sourceQuickSiteCheckArtefactId: null, applicableCitedEvidenceCount: null }, referralEligibility: null, nextAction: { code: null, reasonCodes: [] }, acceptedJourney: false, terminalPath: "invalid", commercialReady: false, ready: false, runnerValidationReasons: [...reasons].sort() });
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isStringOrNull = (v: unknown): v is string | null => typeof v === "string" || v === null;
const nonEmpty = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const exactKeys = (o: Record<string, unknown>, keys: readonly string[]) => Object.keys(o).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(o, key));
const validCount = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
const stringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((item) => typeof item === "string");
const enumValue = <T extends readonly string[]>(v: unknown, values: T): v is T[number] => typeof v === "string" && values.includes(v);
const canonicalIso = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v) && new Date(v).toISOString() === v;
const canonicalAddress = (value: string | null) => value
  ?.toLowerCase()
  .replace(/\baustralia\b/g, "")
  .replace(/\broad\b/g, "rd")
  .replace(/\bstreet\b/g, "st")
  .replace(/[^a-z0-9]+/g, " ")
  .trim() ?? "";
const canonicalLga = (value: string | null) => value
  ?.toUpperCase()
  .replace(/\b(SHIRE|CITY|REGIONAL|COUNCIL)\b/g, " ")
  .replace(/[^A-Z0-9]+/g, " ")
  .trim() ?? "";
const contractFailure = (reasons: string[]) => reasons.map((reason) => `contract_${reason}`).sort();
const hasReason = (reasons: readonly string[], required: string) => reasons.includes(required);

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

function validateContract(payload: unknown): ContractResult {
  const reasons: string[] = [];
  if (!isRecord(payload)) return { ok: false, reasons: ["root_not_object"] };
  if (!exactKeys(payload, ["version", "checkedAt", "project", "site", "quickSiteCheck", "detailedPlanningPack", "see", "referralEligibility", "nextAction"])) reasons.push("root_shape");
  if (payload.version !== "commercial_funnel_audit.v1") reasons.push("unsupported_version");
  if (!canonicalIso(payload.checkedAt)) reasons.push("checkedAt_iso");

  const project = isRecord(payload.project) ? payload.project : null;
  if (!project || !exactKeys(project, ["id", "publicId", "title"])) reasons.push("project_shape");
  else {
    if (typeof project.id !== "string") reasons.push("project_id_type");
    if (!isStringOrNull(project.publicId)) reasons.push("project_publicId_type");
    if (!isStringOrNull(project.title)) reasons.push("project_title_type");
  }

  const site = isRecord(payload.site) ? payload.site : null;
  if (!site || !exactKeys(site, ["address", "lgaName", "lgaCode", "zoneLabel", "zoneCode"])) reasons.push("site_shape");
  else ["address", "lgaName", "lgaCode", "zoneLabel", "zoneCode"].forEach((key) => { if (!isStringOrNull(site[key])) reasons.push(`site_${key}_type`); });

  const q = isRecord(payload.quickSiteCheck) ? payload.quickSiteCheck : null;
  const ev = q && isRecord(q.evidence) ? q.evidence : null;
  if (!q || !exactKeys(q, ["state", "artefactId", "evidence", "reasons"])) reasons.push("qsc_shape");
  else {
    if (!enumValue(q.state, qscStates)) reasons.push("qsc_state_enum");
    if (!isStringOrNull(q.artefactId)) reasons.push("qsc_artefactId_type");
    if (!stringArray(q.reasons)) reasons.push("qsc_reasons_type");
  }
  if (!ev || !exactKeys(ev, ["label", "sourceRef", "citedControlCount", "summary"])) reasons.push("qsc_evidence_shape");
  else {
    if (!isStringOrNull(ev.label)) reasons.push("qsc_evidence_label_type");
    if (!isStringOrNull(ev.sourceRef)) reasons.push("qsc_evidence_sourceRef_type");
    if (!(validCount(ev.citedControlCount) || ev.citedControlCount === null)) reasons.push("qsc_evidence_citedControlCount_type");
    if (!isStringOrNull(ev.summary)) reasons.push("qsc_evidence_summary_type");
  }

  const d = isRecord(payload.detailedPlanningPack) ? payload.detailedPlanningPack : null;
  if (!d || !exactKeys(d, ["state", "artefactId", "sourceQuickSiteCheckArtefactId", "citedTopicCount", "unresolvedTopics", "reasons"])) reasons.push("dpp_shape");
  else {
    if (!enumValue(d.state, dppStates)) reasons.push("dpp_state_enum");
    if (!isStringOrNull(d.artefactId)) reasons.push("dpp_artefactId_type");
    if (!isStringOrNull(d.sourceQuickSiteCheckArtefactId)) reasons.push("dpp_sourceQuickSiteCheckArtefactId_type");
    if (!validCount(d.citedTopicCount)) reasons.push("dpp_citedTopicCount_type");
    if (!stringArray(d.unresolvedTopics)) reasons.push("dpp_unresolvedTopics_type");
    if (!stringArray(d.reasons)) reasons.push("dpp_reasons_type");
  }

  const s = isRecord(payload.see) ? payload.see : null;
  if (!s || !exactKeys(s, ["state", "artefactId", "sourceDetailedPlanningPackArtefactId", "sourceQuickSiteCheckArtefactId", "applicableCitedEvidenceCount", "reasons"])) reasons.push("see_shape");
  else {
    if (!enumValue(s.state, seeStates)) reasons.push("see_state_enum");
    if (!isStringOrNull(s.artefactId)) reasons.push("see_artefactId_type");
    if (!isStringOrNull(s.sourceDetailedPlanningPackArtefactId)) reasons.push("see_sourceDetailedPlanningPackArtefactId_type");
    if (!isStringOrNull(s.sourceQuickSiteCheckArtefactId)) reasons.push("see_sourceQuickSiteCheckArtefactId_type");
    if (!validCount(s.applicableCitedEvidenceCount)) reasons.push("see_applicableCitedEvidenceCount_type");
    if (!stringArray(s.reasons)) reasons.push("see_reasons_type");
  }

  const n = isRecord(payload.nextAction) ? payload.nextAction : null;
  if (!enumValue(payload.referralEligibility, referralStates)) reasons.push("referralEligibility_enum");
  if (!n || !exactKeys(n, ["code", "reasonCodes"])) reasons.push("nextAction_shape");
  else {
    if (typeof n.code !== "string") reasons.push("nextAction_code_type");
    if (!stringArray(n.reasonCodes)) reasons.push("nextAction_reasonCodes_type");
  }
  if (reasons.length) return { ok: false, reasons: contractFailure(reasons) };
  return { ok: true, value: payload as AuditContract };
}

function evaluateGolden(audit: AuditContract, requestedId: string, golden: GoldenConfig): ProjectSummary {
  const reasons: string[] = [];
  if (requestedId !== audit.project.id && requestedId !== audit.project.publicId) reasons.push("response_project_id_mismatch");
  if (canonicalAddress(audit.site.address) !== canonicalAddress(golden.address)) reasons.push("site_address_mismatch");
  const lgaCandidates = [audit.site.lgaCode, audit.site.lgaName].map(canonicalLga).filter(Boolean);
  if (!lgaCandidates.includes(canonicalLga(golden.lgaCode))) reasons.push("site_lga_mismatch");
  if (audit.site.zoneCode !== golden.zoneCode) reasons.push("site_zone_mismatch");

  const qualityReasons: string[] = [];
  if (audit.quickSiteCheck.state !== "ready") qualityReasons.push("qsc_not_ready");
  if (!nonEmpty(audit.quickSiteCheck.artefactId)) qualityReasons.push("qsc_artefact_missing");
  if (audit.quickSiteCheck.evidence.label !== "Cited" || !nonEmpty(audit.quickSiteCheck.evidence.sourceRef) || (audit.quickSiteCheck.evidence.citedControlCount ?? 0) <= 0) qualityReasons.push("qsc_uncited_evidence");
  if (audit.detailedPlanningPack.state !== "ready") qualityReasons.push("dpp_not_ready");
  if (!nonEmpty(audit.detailedPlanningPack.artefactId)) qualityReasons.push("dpp_artefact_missing");
  if (audit.detailedPlanningPack.citedTopicCount <= 0) qualityReasons.push("dpp_no_cited_topics");
  if (audit.detailedPlanningPack.unresolvedTopics.length) qualityReasons.push("dpp_unresolved_topics");
  if (audit.detailedPlanningPack.sourceQuickSiteCheckArtefactId !== audit.quickSiteCheck.artefactId) qualityReasons.push("dpp_qsc_provenance_mismatch");
  if (audit.see.state !== "ready") qualityReasons.push("see_not_ready");
  if (!nonEmpty(audit.see.artefactId)) qualityReasons.push("see_artefact_missing");
  if (audit.see.applicableCitedEvidenceCount <= 0) qualityReasons.push("see_no_applicable_cited_evidence");
  if (audit.see.sourceDetailedPlanningPackArtefactId !== audit.detailedPlanningPack.artefactId) qualityReasons.push("see_dpp_provenance_mismatch");
  if (audit.see.sourceQuickSiteCheckArtefactId !== audit.quickSiteCheck.artefactId) qualityReasons.push("see_qsc_provenance_mismatch");
  if (audit.referralEligibility !== "quality_chain_referral") qualityReasons.push("referral_not_quality_chain");
  if (audit.nextAction.code !== "ready_for_quality_chain_referral") qualityReasons.push("next_action_not_ready");

  const unresolvedReasons: string[] = [];
  if (audit.quickSiteCheck.state !== "ready") unresolvedReasons.push("qsc_not_ready");
  if (!nonEmpty(audit.quickSiteCheck.artefactId)) unresolvedReasons.push("qsc_artefact_missing");
  if (audit.quickSiteCheck.evidence.label !== "Cited" || !nonEmpty(audit.quickSiteCheck.evidence.sourceRef) || (audit.quickSiteCheck.evidence.citedControlCount ?? 0) <= 0) unresolvedReasons.push("qsc_uncited_evidence");
  if (audit.detailedPlanningPack.state !== "needs_expert_review") unresolvedReasons.push("dpp_not_needs_expert_review");
  if (!nonEmpty(audit.detailedPlanningPack.artefactId)) unresolvedReasons.push("dpp_artefact_missing");
  if (audit.detailedPlanningPack.sourceQuickSiteCheckArtefactId !== audit.quickSiteCheck.artefactId) unresolvedReasons.push("dpp_qsc_provenance_mismatch");
  if (audit.detailedPlanningPack.citedTopicCount <= 0) unresolvedReasons.push("dpp_no_cited_topics");
  if (audit.detailedPlanningPack.unresolvedTopics.length <= 0) unresolvedReasons.push("dpp_no_unresolved_topics");
  if (!hasReason(audit.detailedPlanningPack.reasons, "active_dpp_unresolved_topics")) unresolvedReasons.push("dpp_missing_unresolved_reason");
  if (audit.see.state !== "missing") unresolvedReasons.push("see_not_missing");
  if (audit.see.artefactId !== null || audit.see.sourceDetailedPlanningPackArtefactId !== null || audit.see.sourceQuickSiteCheckArtefactId !== null) unresolvedReasons.push("see_unresolved_provenance_present");
  if (audit.see.applicableCitedEvidenceCount !== 0) unresolvedReasons.push("see_unresolved_applicable_evidence_present");
  if (!hasReason(audit.see.reasons, "see_not_applicable_for_unresolved_active_pack")) unresolvedReasons.push("see_missing_unresolved_not_applicable_reason");
  if (!hasReason(audit.quickSiteCheck.reasons, "selected_dpp_source_qsc_current_cited") && !hasReason(audit.nextAction.reasonCodes, "selected_dpp_source_qsc_current_cited")) unresolvedReasons.push("qsc_missing_selected_current_cited_reason");
  if (audit.referralEligibility !== "unresolved_pack_referral") unresolvedReasons.push("referral_not_unresolved_pack");
  if (audit.nextAction.code !== "refer_unresolved_pack_for_expert_review") unresolvedReasons.push("next_action_not_expert_review");
  for (const reason of ["active_dpp_unresolved_topics", "see_not_applicable_for_unresolved_active_pack", "selected_dpp_source_qsc_current_cited"]) {
    if (!hasReason(audit.nextAction.reasonCodes, reason)) unresolvedReasons.push(`next_action_missing_reason:${reason}`);
  }

  const identityValid = reasons.length === 0;
  const commercialReady = identityValid && qualityReasons.length === 0;
  const unresolvedAccepted = identityValid && unresolvedReasons.length === 0;
  const terminalPath = commercialReady ? "quality_chain_referral" : unresolvedAccepted ? "unresolved_pack_referral" : "invalid";
  const acceptedJourney = commercialReady || unresolvedAccepted;
  const validationReasons = [...reasons, ...(acceptedJourney ? [] : (audit.detailedPlanningPack.state === "needs_expert_review" || audit.nextAction.code === "refer_unresolved_pack_for_expert_review" || audit.see.reasons.includes("see_not_applicable_for_unresolved_active_pack")) ? unresolvedReasons : qualityReasons)].sort();
  return { checkedAt: audit.checkedAt, project: { id: audit.project.id, publicId: audit.project.publicId }, site: { address: audit.site.address, lgaCode: audit.site.lgaCode, zoneCode: audit.site.zoneCode }, quickSiteCheck: { state: audit.quickSiteCheck.state, artefactId: audit.quickSiteCheck.artefactId, sourceRef: audit.quickSiteCheck.evidence.sourceRef, citedControlCount: audit.quickSiteCheck.evidence.citedControlCount }, detailedPlanningPack: { state: audit.detailedPlanningPack.state, artefactId: audit.detailedPlanningPack.artefactId, sourceQuickSiteCheckArtefactId: audit.detailedPlanningPack.sourceQuickSiteCheckArtefactId, citedTopicCount: audit.detailedPlanningPack.citedTopicCount, unresolvedTopicCount: audit.detailedPlanningPack.unresolvedTopics.length }, see: { state: audit.see.state, artefactId: audit.see.artefactId, sourceDetailedPlanningPackArtefactId: audit.see.sourceDetailedPlanningPackArtefactId, sourceQuickSiteCheckArtefactId: audit.see.sourceQuickSiteCheckArtefactId, applicableCitedEvidenceCount: audit.see.applicableCitedEvidenceCount }, referralEligibility: audit.referralEligibility, nextAction: { code: audit.nextAction.code, reasonCodes: [...audit.nextAction.reasonCodes].sort() }, acceptedJourney, terminalPath, commercialReady, ready: commercialReady, runnerValidationReasons: validationReasons };
}

export async function runCommercialFunnelAudit(env: AuditRunnerEnv, fetchImpl: AuditRunnerFetch): Promise<AuditRunnerResult> {
  const parsed = parseAuditEnv(env);
  if (!parsed.ok) return { exitCode: 1, summary: { runnerVersion: "commercial_funnel_live_audit_runner.v2", schemaVersion: "commercial_funnel_audit.v1", expectedCommit: env.PLANNERA_AUDIT_EXPECTED_COMMIT?.trim() ?? "", baseOrigin: "", acceptedJourney: false, commercialReady: false, ready: false, projects: { byron: blankSummary(parsed.reasons), kempsey: blankSummary(parsed.reasons) } } };
  const projects = {} as Record<GoldenKey, ProjectSummary>;
  let hardFailure = false;
  for (const golden of GOLDENS) {
    const requested = parsed.projectIds[golden.key];
    try {
      const response = await fetchImpl(auditUrl(parsed.baseUrl, requested), { method: "GET", headers: { "x-admin-token": parsed.token, Accept: "application/json" } });
      if (!response.ok) { hardFailure = true; projects[golden.key] = blankSummary([`http_status:${response.status}`]); continue; }
      const contract = validateContract(await response.json());
      if (!contract.ok) { hardFailure = true; projects[golden.key] = blankSummary(contract.reasons); continue; }
      projects[golden.key] = evaluateGolden(contract.value, requested, golden);
    } catch { hardFailure = true; projects[golden.key] = blankSummary(["fetch_or_json_failure"]); }
  }
  const acceptedJourney = projects.byron.acceptedJourney && projects.kempsey.acceptedJourney;
  const commercialReady = projects.byron.commercialReady && projects.kempsey.commercialReady;
  const ready = commercialReady;
  return { exitCode: hardFailure ? 1 : acceptedJourney ? 0 : 2, summary: { runnerVersion: "commercial_funnel_live_audit_runner.v2", schemaVersion: "commercial_funnel_audit.v1", expectedCommit: parsed.expectedCommit, baseOrigin: parsed.baseUrl.origin, acceptedJourney, commercialReady, ready, projects: { byron: projects.byron, kempsey: projects.kempsey } } };
}
