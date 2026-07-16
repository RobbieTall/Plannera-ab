import type { Artefact, ArtefactType, PrismaClient } from "@prisma/client";

import {
  artefactRecencyMs,
  currentScopeForProject,
  hasApplicableSeeReadinessEvidence,
  parsePreSeePlanningMemoContent,
  quickSiteCheckReportSchema,
  resolveCurrentDetailedPlanningPackChain,
} from "@/lib/artefact-service";
import { findProjectByExternalId } from "@/lib/project-identifiers";
import { detailedPlanningPackScope, isArtefactCurrentForSite, preSeeScope, quickSiteCheckScope } from "@/lib/site-scoped-artefacts";
import { prisma } from "@/lib/prisma";
import type { QuickSiteCheckReport } from "@/types/quick-site-check";
import type { WorkspacePreSeePlanningMemoContent } from "@/types/workspace";

export type CommercialFunnelAudit = {
  version: "commercial_funnel_audit.v1";
  checkedAt: string;
  project: { id: string; publicId?: string | null; title?: string | null };
  site: { address?: string | null; lgaName?: string | null; lgaCode?: string | null; zoneLabel?: string | null; zoneCode?: string | null };
  quickSiteCheck: { state: "missing" | "stale_mismatched" | "unresolved" | "ready"; artefactId: string | null; evidence: { label: string | null; sourceRef: string | null; citedControlCount: number | null; summary: string | null }; reasons: string[] };
  detailedPlanningPack: { state: "missing" | "stale_mismatched_malformed" | "needs_expert_review" | "ready"; artefactId: string | null; sourceQuickSiteCheckArtefactId: string | null; citedTopicCount: number; unresolvedTopics: string[]; reasons: string[] };
  see: { state: "missing" | "stale_mismatched_legacy" | "ready"; artefactId: string | null; sourceDetailedPlanningPackArtefactId: string | null; sourceQuickSiteCheckArtefactId: string | null; applicableCitedEvidenceCount: number; reasons: string[] };
  referralEligibility: "none" | "unresolved_pack_referral" | "quality_chain_referral";
  nextAction: { code: string; reasonCodes: string[] };
};

type AuditPrisma = Pick<PrismaClient, "artefact" | "project">;
type ProjectWithSite = NonNullable<Awaited<ReturnType<PrismaClient["project"]["findUnique"]>>>;
type QscDiagnostic = { artefact: Artefact; report: QuickSiteCheckReport; current: boolean; cited: boolean; generatedAt?: string | null };
type SeeDiagnostic = { artefact: Artefact; memo: WorkspacePreSeePlanningMemoContent | null; generatedAt?: string | null };

const sortByRecency = <T extends { artefact: Artefact; generatedAt?: string | null }>(entries: T[]) =>
  [...entries].sort((a, b) => {
    const recency = artefactRecencyMs(b.artefact, b.generatedAt) - artefactRecencyMs(a.artefact, a.generatedAt);
    return recency || a.artefact.id.localeCompare(b.artefact.id);
  });

const countApplicableSeeEvidence = (memo: WorkspacePreSeePlanningMemoContent | null) => {
  if (!memo || !hasApplicableSeeReadinessEvidence(memo)) return 0;
  const dcpCount = memo.applicableControls.dcpClauses?.length ?? 0;
  const cited = new Set<string>();
  memo.consistencyAssessment?.forEach((item) => item.citations?.forEach((citation) => cited.add(`${citation.type}:${citation.ref}`)));
  return Math.max(dcpCount, cited.size);
};

const evidenceForQsc = (report: QuickSiteCheckReport | null | undefined) => ({
  label: report?.lepEvidenceSummary?.label ?? null,
  sourceRef: report?.lepEvidenceSummary?.sourceRef ?? null,
  citedControlCount: report?.lepEvidenceSummary?.citedControlCount ?? null,
  summary: report?.lepEvidenceSummary?.detail ?? null,
});

export async function auditCommercialFunnel(projectIdentifier: string, deps: { prisma?: AuditPrisma } = {}): Promise<CommercialFunnelAudit | { version: "commercial_funnel_audit.v1"; checkedAt: string; project: null; error: "project_not_found" }> {
  const prismaClient = deps.prisma ?? prisma;
  const checkedAt = new Date().toISOString();
  const project = await findProjectByExternalId(prismaClient as PrismaClient, projectIdentifier);
  if (!project) return { version: "commercial_funnel_audit.v1", checkedAt, project: null, error: "project_not_found" };
  const projectWithContext = await prismaClient.project.findUnique({ where: { id: project.id }, include: { siteContext: true } }) as ProjectWithSite | null;
  const scopedProject = projectWithContext ?? project;
  const currentScope = currentScopeForProject(scopedProject as Parameters<typeof currentScopeForProject>[0]);

  const projectIdentifiers = [project.id, (project as { publicId?: string | null }).publicId].filter(Boolean);

  const [chainResolution, artefacts] = await Promise.all([
    resolveCurrentDetailedPlanningPackChain({ prismaClient, project: scopedProject as Parameters<typeof resolveCurrentDetailedPlanningPackChain>[0]["project"], requireCommercialReady: false }),
    prismaClient.artefact.findMany({
      where: { projectId: project.id, type: { in: ["quick_site_check", "pre_see_planning_memo"] as ArtefactType[] } },
      orderBy: [{ capturedAt: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  const qscDiagnostics: QscDiagnostic[] = sortByRecency(artefacts.filter((a) => a.type === "quick_site_check").flatMap((artefact) => {
    const parsed = quickSiteCheckReportSchema.safeParse(artefact.payload);
    if (!parsed.success) return [];
    const report = parsed.data as QuickSiteCheckReport;
    return [{ artefact, report, generatedAt: report.generatedAt, current: isArtefactCurrentForSite(currentScope, quickSiteCheckScope(report)), cited: projectIdentifiers.includes(report.projectId) && report.lepEvidenceSummary?.label === "Cited" }];
  }));

  const active = chainResolution.active;
  const selectedQsc = active ? { artefact: active.quickSiteCheckArtefact, report: active.quickSiteCheck, current: true, cited: true } : null;
  const newestQsc = qscDiagnostics[0];
  const quickSiteCheck = selectedQsc ? {
    state: "ready" as const,
    artefactId: selectedQsc.artefact.id,
    evidence: evidenceForQsc(selectedQsc.report),
    reasons: ["selected_dpp_source_qsc_current_cited"],
  } : {
    state: qscDiagnostics.length ? (newestQsc?.current ? "unresolved" as const : "stale_mismatched" as const) : "missing" as const,
    artefactId: newestQsc?.artefact.id ?? null,
    evidence: evidenceForQsc(newestQsc?.report),
    reasons: qscDiagnostics.length ? [newestQsc?.current ? "qsc_not_cited_or_project_mismatch" : "qsc_not_current_site"] : ["qsc_missing"],
  };

  const newestDppDiagnostic = sortByRecency(chainResolution.candidates.map((entry) => ({ ...entry, generatedAt: entry.pack?.generatedAt })))[0];
  const detailedPlanningPack = active ? {
    state: active.pack.commercialReady ? "ready" as const : "needs_expert_review" as const,
    artefactId: active.artefact.id,
    sourceQuickSiteCheckArtefactId: active.quickSiteCheckArtefact.id,
    citedTopicCount: active.pack.dcpEvidence.filter((topic) => topic.status === "Cited" && topic.citations.length > 0).length,
    unresolvedTopics: active.pack.unresolvedTopics,
    reasons: active.pack.commercialReady ? ["active_current_site_dpp_qsc_chain_ready"] : ["active_dpp_unresolved_topics"],
  } : {
    state: chainResolution.candidates.length ? "stale_mismatched_malformed" as const : "missing" as const,
    artefactId: newestDppDiagnostic?.artefact.id ?? null,
    sourceQuickSiteCheckArtefactId: newestDppDiagnostic?.pack?.sourceQuickSiteCheck.artefactId ?? null,
    citedTopicCount: 0,
    unresolvedTopics: [],
    reasons: chainResolution.candidates.length ? ["no_valid_current_site_dpp_qsc_chain"] : ["dpp_missing"],
  };

  const seeDiagnostics: SeeDiagnostic[] = sortByRecency(artefacts.filter((a) => a.type === "pre_see_planning_memo").map((artefact) => {
    const memo = parsePreSeePlanningMemoContent(artefact.payload);
    return { artefact, memo, generatedAt: memo?.generatedAt ?? null };
  }));
  const readySee = active?.pack.commercialReady ? seeDiagnostics.find(({ memo }) => Boolean(
    memo &&
    memo.projectId === project.id &&
    memo.sourceDetailedPlanningPack?.artefactId === active.artefact.id &&
    memo.sourceDetailedPlanningPack?.sourceQuickSiteCheckArtefactId === active.quickSiteCheckArtefact.id &&
    isArtefactCurrentForSite(currentScope, preSeeScope(memo)) &&
    isArtefactCurrentForSite(detailedPlanningPackScope(active.pack), preSeeScope(memo)) &&
    countApplicableSeeEvidence(memo) > 0,
  )) : undefined;
  const newestSee = seeDiagnostics[0];
  const see = readySee ? {
    state: "ready" as const,
    artefactId: readySee.artefact.id,
    sourceDetailedPlanningPackArtefactId: readySee.memo?.sourceDetailedPlanningPack?.artefactId ?? null,
    sourceQuickSiteCheckArtefactId: readySee.memo?.sourceDetailedPlanningPack?.sourceQuickSiteCheckArtefactId ?? null,
    applicableCitedEvidenceCount: countApplicableSeeEvidence(readySee.memo),
    reasons: ["matching_active_current_site_see_ready"],
  } : {
    state: seeDiagnostics.length ? "stale_mismatched_legacy" as const : "missing" as const,
    artefactId: newestSee?.artefact.id ?? null,
    sourceDetailedPlanningPackArtefactId: newestSee?.memo?.sourceDetailedPlanningPack?.artefactId ?? null,
    sourceQuickSiteCheckArtefactId: newestSee?.memo?.sourceDetailedPlanningPack?.sourceQuickSiteCheckArtefactId ?? null,
    applicableCitedEvidenceCount: 0,
    reasons: active?.pack.commercialReady === false ? ["see_not_applicable_for_unresolved_active_pack"] : seeDiagnostics.length ? ["no_matching_active_current_site_see_chain"] : ["see_missing"],
  };

  const referralEligibility = detailedPlanningPack.state === "needs_expert_review"
    ? "unresolved_pack_referral"
    : detailedPlanningPack.state === "ready" && see.state === "ready"
      ? "quality_chain_referral"
      : "none";
  const reasonCodes = [...quickSiteCheck.reasons, ...detailedPlanningPack.reasons, ...see.reasons];
  const code = referralEligibility === "quality_chain_referral" ? "ready_for_quality_chain_referral" : referralEligibility === "unresolved_pack_referral" ? "refer_unresolved_pack_for_expert_review" : "generate_or_refresh_required_chain";

  return {
    version: "commercial_funnel_audit.v1",
    checkedAt,
    project: { id: project.id, publicId: (project as { publicId?: string | null }).publicId ?? null, title: project.title ?? null },
    site: currentScope,
    quickSiteCheck,
    detailedPlanningPack,
    see,
    referralEligibility,
    nextAction: { code, reasonCodes },
  };
}
