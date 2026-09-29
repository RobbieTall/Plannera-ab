import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { compileCanonicalSeeFromPreSee } from "./submission-see-application-adapter";
import { assembleSubmissionSeeCandidate } from "./submission-see-candidate";
import { readSavedCouncilIdentity, readSavedSiteProvenance, savedSiteBinding, SAVED_SITE_PROVENANCE_VERSION } from "./site-context-provenance-storage";
import { resolveSavedWorkingSeePlanningSources, resolveWorkingSeeSourceCitations, WorkingSeeSourceError, type SavedPlanningSource, type WorkingSeeCouncil } from "./see-document-generation-sources";
import { readWorkingSeePackSources, WorkingSeePackCaptureError } from "./see-document-pack-source-capture";
import type { WorkingSeeRenderContext } from "./submission-see-renderer";

export type WorkingSeeSourceDatabase = Pick<PrismaClient,
  "project" | "artefact" | "purchase" | "entitlement" | "pathwayArtefactBinding" | "siteSpatialProvenance" | "clause" | "dCPClause">;
export type WorkingSeeGenerationScope = {
  actorId: string; projectId: string;
  sourceDetailedPlanningPackArtefactId: string; sourceMemoArtefactId: string;
};
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const textHash = (value: string) => createHash("sha256").update(value).digest("hex");
const record = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));
function fail(code: WorkingSeeSourceError["code"]): never { throw new WorkingSeeSourceError(code); }
const iso = (date: Date | null) => date?.toISOString() ?? null;
const message = "Start your SEE now and strengthen it as new evidence arrives. This working document identifies unconfirmed matters and is not submission-ready.";

/** Read-only: actual server database joins, not browser-supplied source claims. */
export async function loadSavedWorkingSeeGeneration(
  db: WorkingSeeSourceDatabase, scope: WorkingSeeGenerationScope, now = new Date(),
) {
  const project = await db.project.findFirst({
    where: { id: scope.projectId, OR: [{ userId: scope.actorId }, { createdById: scope.actorId }] },
    include: { siteContext: true },
  });
  const owner = project?.userId ?? project?.createdById;
  if (!project || project.id !== scope.projectId || owner !== scope.actorId ||
    project.isDemo || !project.siteContext) fail("source_scope_mismatch");
  const site = project.siteContext;
  if (site.lgaCode !== "BYRON" && site.lgaCode !== "KEMPSEY") fail("source_scope_mismatch");
  const council: WorkingSeeCouncil = site.lgaCode;

  // Import the established schema/provenance parsers only after owner authorization.
  const {
    resolveCurrentDetailedPlanningPackChain, parsePreSeePlanningMemoContent,
    hasExactSeeEvidenceProvenance,
  } = await import("./artefact-service");
  const chain = await resolveCurrentDetailedPlanningPackChain({ prismaClient: db, project });
  const selected = chain.candidates.find((entry) =>
    entry.artefact.id === scope.sourceDetailedPlanningPackArtefactId);
  if (!selected?.pack || !selected.validProvenance ||
    !selected.quickSiteCheck || !selected.quickSiteCheckArtefact ||
    selected.artefact.staleAt || selected.quickSiteCheckArtefact.staleAt) fail("source_scope_mismatch");
  const pack = selected.pack;
  const qsc = selected.quickSiteCheckArtefact;
  const memoRow = await db.artefact.findUnique({ where: { id: scope.sourceMemoArtefactId } });
  const memo = memoRow ? parsePreSeePlanningMemoContent(memoRow.payload) : null;
  if (!memoRow || memoRow.projectId !== project.id || memoRow.type !== "pre_see_planning_memo" ||
    memoRow.staleAt || !memo || memo.projectId !== project.id ||
    memo.sourceDetailedPlanningPack?.artefactId !== selected.artefact.id ||
    memo.sourceDetailedPlanningPack.sourceQuickSiteCheckArtefactId !== qsc.id ||
    !hasExactSeeEvidenceProvenance(memo, pack, selected.quickSiteCheck)) fail("source_scope_mismatch");

  const proposalFingerprint = textHash(pack.proposalBrief.replace(/\s+/g, " ").trim().toLowerCase());
  const purchaseScopeKey = [owner, project.id, qsc.id, proposalFingerprint, "submission_see", "v1"].join(":");
  const purchase = await db.purchase.findFirst({
    where: { userId: owner, projectId: project.id, quickSiteCheckArtefactId: qsc.id,
      proposalFingerprint, productCode: "submission_see", productVersion: "v1",
      currency: "AUD", status: "PAID", scopeKey: purchaseScopeKey },
    orderBy: [{ paidAt: "desc" }, { id: "desc" }],
  });
  if (!purchase || !purchase.paidAt || purchase.scopeKey !== purchaseScopeKey ||
    purchase.userId !== owner || purchase.projectId !== project.id ||
    purchase.quickSiteCheckArtefactId !== qsc.id || purchase.proposalFingerprint !== proposalFingerprint ||
    purchase.productCode !== "submission_see" || purchase.productVersion !== "v1" ||
    purchase.currency !== "AUD" || purchase.status !== "PAID") fail("source_scope_mismatch");
  const entitlement = await db.entitlement.findFirst({
    where: { purchaseId: purchase.id, userId: owner, projectId: project.id,
      quickSiteCheckArtefactId: qsc.id, proposalFingerprint, productCode: "submission_see",
      productVersion: "v1", activeScopeKey: purchaseScopeKey, status: "ACTIVE" },
  });
  if (!entitlement || entitlement.purchaseId !== purchase.id || entitlement.userId !== owner ||
    entitlement.projectId !== project.id || entitlement.quickSiteCheckArtefactId !== qsc.id ||
    entitlement.proposalFingerprint !== proposalFingerprint || entitlement.status !== "ACTIVE" ||
    entitlement.productCode !== "submission_see" || entitlement.productVersion !== "v1" ||
    entitlement.activeScopeKey !== purchaseScopeKey) fail("source_scope_mismatch");

  const spatialRow = await db.siteSpatialProvenance.findFirst({
    where: { siteContextId: site.id, sourceVersion: SAVED_SITE_PROVENANCE_VERSION,
      payload: { path: ["siteBinding"], equals: savedSiteBinding(site) } },
    orderBy: [{ retrievedAt: "desc" }, { id: "desc" }],
  });
  const spatial = readSavedSiteProvenance(spatialRow, site, now);
  if (!spatial || !spatialRow) fail("source_evidence_missing");

  const requiredCitations = [
      ...memo.consistencyAssessment.flatMap((item) => item.citations ?? []),
      ...pack.dcpEvidence.flatMap((topic) => topic.citations.map((citation) =>
        ({ type: "DCP" as const, ref: citation.ref, excerpt: citation.excerpt }))),
    ];
  let binding: unknown = null;
  let captureEvidence: unknown = null;
  const sources: SavedPlanningSource[] = [];
  let officialSources: ReturnType<typeof resolveWorkingSeeSourceCitations>;
  const rawPack = selected.artefact.payload;
  // A present but invalid capture must never fall back to a different proof path.
  if (record(rawPack) && Object.prototype.hasOwnProperty.call(rawPack, "workingSeeSourceCapture")) {
    // Canonical labels alone are not proof of council identity for a normal pack.
    if (!readSavedCouncilIdentity(spatialRow, site, now)) fail("source_evidence_missing");
    try {
      const capture = await readWorkingSeePackSources(db, {
        site, pack: rawPack as unknown as typeof pack,
        quickSiteCheck: selected.quickSiteCheck,
        capture: rawPack.workingSeeSourceCapture, resolvedZoneCode: spatial.zoneCode ?? "",
      }, now);
      captureEvidence = capture;
      for (const source of capture.sources) {
        sources.push({
          id: source.kind + ":" + source.clauseId, kind: source.kind,
          reference: source.reference, title: source.title,
          sourceUrl: source.sourceUrl, sourceVersion: source.sourceVersion,
          retrievedAt: source.retrievedAt, effectiveFrom: source.effectiveFrom,
          effectiveTo: source.effectiveTo, staleAt: capture.expiresAt,
          isCurrentAtAssessment: true, contentHash: source.bodyTextSha256,
          snapshotBodyText: source.bodyText, currentBodyText: source.bodyText,
          snapshotClauseId: source.clauseId, currentClauseId: source.clauseId,
          currentClauseIsCurrent: true, currentClauseUpdatedAt: source.recordUpdatedAt,
          registrySourceUrl: source.kind === "LEP" ? source.sourceUrl : null, council,
          // readWorkingSeePackSources has just matched these fields to current
          // database rows. Preserve original trust markers, not just URL shape.
          markers: source.originMetadataJson === null ? {} : JSON.parse(source.originMetadataJson),
        });
      }
      officialSources = resolveWorkingSeeSourceCitations({
        council, requiredCitations, sources, now, recordCapturedAt: capture.capturedAt,
        markers: { pack: rawPack, memo: memoRow.payload },
      });
    } catch (error) {
      if (error instanceof WorkingSeePackCaptureError) fail("source_evidence_unverified");
      throw error;
    }
  } else {
  const legacyBinding = await db.pathwayArtefactBinding.findUnique({
    where: { artefactId: selected.artefact.id },
    include: { assessment: { include: {
      spatialProvenance: true,
      evidenceSnapshots: {
        orderBy: { id: "asc" },
        include: { clause: { include: { instrument: true } }, dcpClause: true },
      },
    } } },
  });
  if (!legacyBinding || legacyBinding.assessment.environment !== "PREVIEW") fail("source_evidence_missing");
  binding = legacyBinding;
  const assessment = legacyBinding.assessment;
  for (const row of assessment.evidenceSnapshots) {
    if (row.evidenceKind !== "LEP" && row.evidenceKind !== "DCP") continue;
    const snapshot = record(row.snapshot) ? row.snapshot : {};
    if (typeof snapshot.bodyText !== "string") fail("source_evidence_unverified");
    const clause = row.clause;
    const dcp = row.dcpClause;
    const isLep = row.evidenceKind === "LEP";
    if (isLep ? (!clause || !row.clauseId || row.clauseId !== clause.id ||
      clause.instrument.name !== selected.quickSiteCheck.lepInstrument?.name ||
      !clause.instrument.name.toLowerCase().startsWith(council.toLowerCase() + " "))
      : (!dcp || !row.dcpClauseId || row.dcpClauseId !== dcp.id || dcp.lgaCode !== council)) {
      fail("source_evidence_unverified");
    }
    const reference = isLep ? clause!.instrument.name + " cl. " + clause!.clauseKey : dcp!.ref;
    if (!reference) fail("source_evidence_unverified");
    sources.push({
      id: row.id, kind: isLep ? "LEP" : "DCP", reference,
      title: (isLep ? clause!.title : dcp!.title) || reference,
      sourceUrl: row.sourceUrl, sourceVersion: row.sourceVersion,
      retrievedAt: row.retrievedAt.toISOString(), effectiveFrom: iso(row.effectiveFrom),
      effectiveTo: iso(row.effectiveTo), staleAt: iso(row.staleAt),
      isCurrentAtAssessment: row.isCurrentAtAssessment,
      contentHash: row.contentHash, snapshotBodyText: snapshot.bodyText,
      currentBodyText: isLep ? clause!.bodyText : dcp!.bodyText,
      snapshotClauseId: (isLep ? row.clauseId : row.dcpClauseId)!,
      currentClauseId: isLep ? clause!.id : dcp!.id,
      currentClauseIsCurrent: isLep ? clause!.isCurrent &&
        (!clause!.effectiveFrom || clause!.effectiveFrom.getTime() <= now.getTime()) &&
        (!clause!.effectiveTo || clause!.effectiveTo.getTime() > now.getTime()) : true,
      currentClauseUpdatedAt: (isLep ? clause!.updatedAt : dcp!.updatedAt).toISOString(),
      registrySourceUrl: isLep ? clause!.instrument.sourceUrl : null, council,
      markers: { snapshot: row.snapshot, citation: row.citation },
    });
  }
  officialSources = resolveSavedWorkingSeePlanningSources({
    projectId: project.id, siteId: site.id, siteUpdatedAt: site.updatedAt.toISOString(),
    council, zoneCode: spatial.zoneCode ?? "", sourceDetailedPlanningPackArtefactId: selected.artefact.id,
    sourceQuickSiteCheckArtefactId: qsc.id,
    binding: {
      projectId: selected.artefact.projectId, siteId: site.id,
      sourceDetailedPlanningPackArtefactId: selected.artefact.id,
      sourceQuickSiteCheckArtefactId: pack.sourceQuickSiteCheck.artefactId,
      assessmentId: assessment.id, assessmentProjectId: assessment.projectId,
      assessmentSiteId: assessment.siteContextId,
      assessmentCouncil: assessment.spatialProvenance.lgaCode as WorkingSeeCouncil,
      assessmentZone: assessment.spatialProvenance.zoneCode ?? "",
      assessmentIsCurrent: assessment.isCurrent, assessmentAt: assessment.assessedAt.toISOString(),
      assessmentStaleAt: iso(assessment.staleAt),
      bindingArtefactId: legacyBinding.artefactId, bindingAssessmentId: legacyBinding.assessmentId,
      bindingEvidenceDigest: legacyBinding.evidenceDigest, assessmentEvidenceDigest: assessment.evidenceDigest,
      bindingScopeKey: legacyBinding.scopeKey, assessmentScopeKey: assessment.scopeKey,
      markers: { input: assessment.input, result: assessment.result,
        spatial: assessment.spatialProvenance.payload, pack: selected.artefact.payload, memo: memoRow.payload },
    },
    requiredCitations, sources, now,
  });

  }

  const canonical = compileCanonicalSeeFromPreSee({
    detailedPlanningPackArtefactId: selected.artefact.id, detailedPlanningPack: pack, preSeeMemo: memo,
  });
  if (canonical.issues.some((issue) => issue.code !== "unready_dpp")) fail("source_evidence_unverified");
  const outstandingEvidence: WorkingSeeRenderContext["outstandingEvidence"] = [
    ...(memo.outstandingEvidence ?? []),
    ...pack.unresolvedTopics.filter((topic) =>
      !(memo.outstandingEvidence ?? []).some((item) => item.topic === topic)).map((topic, index) => ({
        id: "saved-source-gap-" + index, topic, status: "MORE_EVIDENCE_REQUIRED" as const,
        recommendedEvidence: "Resolve this saved planning-pack evidence gap with the relevant source or professional report.",
        effect: "This topic remains qualified and must be reviewed before submission.",
      })),
    {
      id: "supporting-document-review", topic: "Plans and supporting report review",
      status: "MORE_EVIDENCE_REQUIRED",
      recommendedEvidence: "Review current plans, survey and specialist reports against this exact proposal.",
      effect: "Uploaded files have not been independently incorporated by this document-generation path. Do not treat their presence as verified assessment evidence.",
    },
  ];
  const workingContext: WorkingSeeRenderContext = {
    documentReadiness: { state: "WORKING_SEE", evidenceStatus: "MORE_EVIDENCE_REQUIRED",
      submissionReady: false, customerMessage: message },
    outstandingEvidence, sourceDetailedPlanningPackArtefactId: selected.artefact.id,
    predecessorDetailedPlanningPackArtefactId: null,
  };
  const assembled = assembleSubmissionSeeCandidate({
    commercialMode: "preview", projectId: project.id, confirmedSiteId: site.id,
    addressFingerprint: savedSiteBinding(site), detailedPlanningPackArtefactId: selected.artefact.id,
    detailedPlanningPack: pack, spatialProvenance: spatial,
    documentDraft: {
      kind: "submission_see_draft", standardVersion: "see-builder-standard.v1",
      generatedAt: now.toISOString(), sourceDetailedPlanningPackArtefactId: selected.artefact.id,
      proposalSummary: pack.proposalBrief,
      sections: canonical.sections.map((section) => section.id === "site_and_surrounds"
        ? { ...section, sourceIds: [...section.sourceIds, "SPATIAL:" + spatialRow.id] } : section),
      limitations: [...memo.limitations, message, "Working assessment only; not submission-ready.",
        outstandingEvidence[outstandingEvidence.length - 1].effect],
    },
    officialSources: [...officialSources, {
      id: "SPATIAL:" + spatialRow.id, type: "SPATIAL", title: "Saved NSW zoning lookup",
      officialUrl: spatial.serviceUrl, retrievedAt: spatial.resolvedAt!, contentHash: spatialRow.contentHash,
    }],
    workspaceSources: [], uploadBindings: [], currentUploadIds: [],
  });
  if (assembled.assemblyIssues.length) fail("source_evidence_unverified");
  return {
    candidate: assembled.candidate, workingContext, purchaseId: purchase.id, purchaseScopeKey,
    // Stable source signature excludes new output time; rechecked in pointer transaction.
    sourceSignature: hash({
      site: savedSiteBinding(site), pack: selected.artefact.payload, qsc: qsc.payload,
      memo: memoRow.payload, binding, captureEvidence, spatial: spatialRow, sources,
    }),
  };
}
