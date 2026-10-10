import { createHash } from "crypto";
import type { Prisma } from "@prisma/client";
import {
  parsePreSeePlanningMemoContent, resolveCurrentDetailedPlanningPackChain,
} from "./artefact-service";
import { normalizeCouncilLgaCode } from "./council/lga-normaliser";
import { fingerprintPurchaseProposal } from "./purchase-entitlements";
import { submissionSeeScopeKey, type SubmissionSeeScope } from "./submission-see-credit";
import { SeeCheckoutError } from "./submission-see-preview-checkout-config";

export type SeeCheckoutSelection = {
  actorId: string; projectId: string;
  sourceDetailedPlanningPackArtefactId: string; sourceMemoArtefactId: string;
};
export type ResolvedSeeCheckoutScope = SubmissionSeeScope & {
  scopeKey: string; sourceSignature: string; council: "BYRON" | "KEMPSEY";
};
export type SeeCheckoutScopeClient = Pick<Prisma.TransactionClient, "project" | "artefact">;
const fail = (): never => { throw new SeeCheckoutError("source_scope_mismatch"); };
const address = (value?: string | null) => (value ?? "").normalize("NFKC")
  .toLowerCase().replace(/\baustralia\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const zone = (value?: string | null) => (value ?? "").toUpperCase().match(/\b[A-Z]{1,3}[0-9][A-Z]?\b/)?.[0] ?? "";

export async function resolveSeeCheckoutScope(
  db: SeeCheckoutScopeClient, input: SeeCheckoutSelection, council: "BYRON" | "KEMPSEY",
): Promise<ResolvedSeeCheckoutScope> {
  if (!input.actorId || input.actorId === "dev-bypass-user") return fail();
  const project = await db.project.findFirst({
    where: { AND: [
      { OR: [{ id: input.projectId }, { publicId: input.projectId }] },
      { OR: [{ userId: input.actorId }, { createdById: input.actorId }] },
    ] }, include: { siteContext: true },
  });
  if (!project || project.isDemo || (project.userId ?? project.createdById) !== input.actorId ||
    !project.siteContext || normalizeCouncilLgaCode(project.siteContext.lgaCode) !== council) return fail();
  const chain = await resolveCurrentDetailedPlanningPackChain({ prismaClient: db, project });
  const selected = chain.candidates.find((candidate) =>
    candidate.artefact.id === input.sourceDetailedPlanningPackArtefactId);
  if (!selected?.validProvenance || !selected.pack || !selected.quickSiteCheck ||
    !selected.quickSiteCheckArtefact || selected.artefact.staleAt || selected.quickSiteCheckArtefact.staleAt) return fail();
  const { pack, quickSiteCheck: qsc } = selected;
  const memoRow = await db.artefact.findFirst({ where: {
    id: input.sourceMemoArtefactId, projectId: project.id, type: "pre_see_planning_memo",
  } });
  const memo = memoRow ? parsePreSeePlanningMemoContent(memoRow.payload) : null;
  if (!memoRow || memoRow.staleAt || !memo || memo.projectId !== project.id ||
    memo.sourceDetailedPlanningPack?.artefactId !== selected.artefact.id ||
    memo.sourceDetailedPlanningPack.sourceQuickSiteCheckArtefactId !== selected.quickSiteCheckArtefact.id) return fail();

  // Checkout is deliberately stricter than the legacy fuzzy site matcher.
  const currentAddress = address(project.siteContext.formattedAddress);
  const currentZone = zone(project.zoningCode ?? project.siteContext.zone);
  if (!currentAddress || !currentZone) return fail();
  for (const site of [pack.site, qsc.site, memo.siteDescription]) {
    if (address(site.address) !== currentAddress || zone(site.zoneCode ?? site.zoneLabel) !== currentZone ||
      normalizeCouncilLgaCode(site.lga) !== council) return fail();
  }
  const result = {
    userId: input.actorId, projectId: project.id, quickSiteCheckArtefactId: selected.quickSiteCheckArtefact.id,
    proposalFingerprint: fingerprintPurchaseProposal(pack.proposalBrief), council,
  };
  return { ...result, scopeKey: submissionSeeScopeKey(result),
    sourceSignature: createHash("sha256").update(JSON.stringify({
      scope: result, site: project.siteContext, packId: selected.artefact.id, pack: selected.artefact.payload,
      qscId: selected.quickSiteCheckArtefact.id, qsc: selected.quickSiteCheckArtefact.payload,
      memoId: memoRow.id, memo: memoRow.payload,
    })).digest("hex") };
}
