import { createHash } from "crypto";

import type { Artefact, PrismaClient } from "@prisma/client";

import { normalizeCouncilLgaCode } from "@/lib/council/lga-normaliser";
import { quickSiteCheckReportSchema, ArtefactAccessError, ArtefactValidationError } from "@/lib/artefact-service";
import { normalizeProposalBriefForComparison } from "@/lib/detailed-planning-pack-selector";
import { isArtefactCurrentForSite, quickSiteCheckScope, type CurrentSiteScope } from "@/lib/site-scoped-artefacts";
import type { QuickSiteCheckReport } from "@/types/quick-site-check";

export type ServerProductTerms = {
  productCode: string;
  productVersion: string;
  amountMinor: number;
  currency: string;
};

type PurchasePrisma = Pick<PrismaClient, "project" | "artefact" | "purchase" | "entitlement" | "$transaction">;

type ExactScope = {
  userId: string;
  projectId: string;
  quickSiteCheckArtefactId: string;
  proposalFingerprint: string;
  productCode: string;
  productVersion: string;
};

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export const normalizePurchaseProposal = (proposalBrief?: string | null) => normalizeProposalBriefForComparison(proposalBrief);

export const fingerprintPurchaseProposal = (proposalBrief?: string | null) => {
  const normalized = normalizePurchaseProposal(proposalBrief);
  if (!normalized) throw new ArtefactValidationError("A proposed-works brief is required before purchase");
  return sha256(normalized);
};

const exactScopeKey = (scope: ExactScope) => [
  scope.userId,
  scope.projectId,
  scope.quickSiteCheckArtefactId,
  scope.proposalFingerprint,
  scope.productCode,
  scope.productVersion,
].join(":");

const isLaunchLga = (lgaCode?: string | null, lgaName?: string | null) => /\b(byron|kempsey)\b/i.test(`${lgaCode ?? ""} ${lgaName ?? ""}`);

const parseQsc = (artefact: Artefact): QuickSiteCheckReport | null => {
  const parsed = quickSiteCheckReportSchema.safeParse(artefact.payload);
  return parsed.success ? parsed.data as QuickSiteCheckReport : null;
};

export class PurchaseEntitlementService {
  constructor(private readonly prisma: PurchasePrisma, private readonly terms: ServerProductTerms) {}

  async resolveScope(params: { userId: string; projectId: string; proposalBrief: string }) {
    const project = await this.prisma.project.findFirst({
      where: { id: params.projectId, userId: params.userId },
      include: { siteContext: true },
    });
    if (!project) throw new ArtefactAccessError("Project not found", 404);
    if (!project.siteContext) throw new ArtefactValidationError("Set a confirmed site before purchase");

    const currentSiteScope: CurrentSiteScope = {
      address: project.siteContext.formattedAddress,
      lgaName: project.siteContext.lgaName,
      lgaCode: project.siteContext.lgaCode,
      zoneLabel: project.siteContext.zone ?? project.zoning,
      zoneCode: project.zoningCode,
    };

    const artefacts = await this.prisma.artefact.findMany({
      where: { projectId: project.id, type: "quick_site_check" },
      orderBy: [{ capturedAt: "desc" }, { createdAt: "desc" }],
    } as Parameters<PrismaClient["artefact"]["findMany"]>[0]);
    const current = (artefacts as Artefact[])
      .map((artefact) => ({ artefact, report: parseQsc(artefact) }))
      .find(({ report }) => report?.lepEvidenceSummary?.label === "Cited" && isArtefactCurrentForSite(currentSiteScope, quickSiteCheckScope(report)));
    if (!current?.report) throw new ArtefactValidationError("Save a current-site Quick Site Check with cited LEP evidence before purchase");

    const lgaCode = normalizeCouncilLgaCode(current.report.site.lga ?? project.siteContext.lgaCode);
    if (!isLaunchLga(lgaCode, current.report.site.lga ?? project.siteContext.lgaName)) throw new ArtefactValidationError("Purchase pilot is currently available for Byron and Kempsey only");

    const proposalFingerprint = fingerprintPurchaseProposal(params.proposalBrief);
    const scope = {
      userId: params.userId,
      projectId: project.id,
      quickSiteCheckArtefactId: current.artefact.id,
      proposalFingerprint,
      productCode: this.terms.productCode,
      productVersion: this.terms.productVersion,
    };
    return { ...scope, scopeKey: exactScopeKey(scope), amountMinor: this.terms.amountMinor, currency: this.terms.currency };
  }

  async createOrReusePendingIntent(params: { userId: string; projectId: string; proposalBrief: string }) {
    const scope = await this.resolveScope(params);
    const existing = await this.prisma.purchase.findFirst({ where: { scopeKey: scope.scopeKey, status: "PENDING" } } as Parameters<PrismaClient["purchase"]["findFirst"]>[0]);
    if (existing) return existing;
    const priorCount = await this.prisma.purchase.count({ where: { scopeKey: scope.scopeKey } } as Parameters<PrismaClient["purchase"]["count"]>[0]);
    return this.prisma.purchase.create({ data: { ...scope, idempotencyKey: sha256(`pending:${scope.scopeKey}:${priorCount + 1}`) } } as Parameters<PrismaClient["purchase"]["create"]>[0]);
  }

  async settlePaidPurchase(purchaseId: string) {
    return this.prisma.$transaction(async (tx: unknown) => {
      const transaction = tx as Pick<PrismaClient, "purchase" | "entitlement">;
      const existing = await transaction.purchase.findUnique({ where: { id: purchaseId } });
      if (!existing) throw new ArtefactValidationError("Purchase not found");
      if (!["PENDING", "PAID"].includes(existing.status)) throw new ArtefactValidationError("Purchase is not payable");
      const purchase = existing.status === "PAID"
        ? existing
        : await transaction.purchase.update({ where: { id: purchaseId }, data: { status: "PAID", paidAt: new Date() } });
      const scopeKey = exactScopeKey(purchase);
      return transaction.entitlement.upsert({
        where: { purchaseId: purchase.id },
        create: {
          userId: purchase.userId, projectId: purchase.projectId, quickSiteCheckArtefactId: purchase.quickSiteCheckArtefactId,
          proposalFingerprint: purchase.proposalFingerprint, productCode: purchase.productCode, productVersion: purchase.productVersion,
          purchaseId: purchase.id, status: "ACTIVE", activeScopeKey: scopeKey,
        },
        update: { status: "ACTIVE", activeScopeKey: scopeKey, refundedAt: null, revokedAt: null },
      });
    });
  }

  async findActiveEntitlementForCurrentScope(params: { userId: string; projectId: string; proposalBrief: string }) {
    const scope = await this.resolveScope(params);
    return this.findActiveEntitlement({ userId: scope.userId, projectId: scope.projectId, quickSiteCheckArtefactId: scope.quickSiteCheckArtefactId, proposalBrief: params.proposalBrief });
  }

  async findActiveEntitlement(params: { userId: string; projectId: string; quickSiteCheckArtefactId: string; proposalBrief: string; productCode?: string; productVersion?: string }) {
    const proposalFingerprint = fingerprintPurchaseProposal(params.proposalBrief);
    const scope = { userId: params.userId, projectId: params.projectId, quickSiteCheckArtefactId: params.quickSiteCheckArtefactId, proposalFingerprint, productCode: params.productCode ?? this.terms.productCode, productVersion: params.productVersion ?? this.terms.productVersion };
    return this.prisma.entitlement.findFirst({ where: { activeScopeKey: exactScopeKey(scope), status: "ACTIVE" } } as Parameters<PrismaClient["entitlement"]["findFirst"]>[0]);
  }

  async markPurchaseFailed(purchaseId: string) { return this.prisma.purchase.update({ where: { id: purchaseId }, data: { status: "FAILED", failedAt: new Date() } } as Parameters<PrismaClient["purchase"]["update"]>[0]); }
  async cancelPurchase(purchaseId: string) { return this.prisma.purchase.update({ where: { id: purchaseId }, data: { status: "CANCELLED", cancelledAt: new Date() } } as Parameters<PrismaClient["purchase"]["update"]>[0]); }

  async refundPurchase(purchaseId: string) {
    return this.prisma.$transaction(async (tx: unknown) => {
      const transaction = tx as Pick<PrismaClient, "purchase" | "entitlement">;
      await transaction.purchase.update({ where: { id: purchaseId }, data: { status: "REFUNDED", refundedAt: new Date() } });
      return transaction.entitlement.updateMany({ where: { purchaseId, status: "ACTIVE" }, data: { status: "REFUNDED", activeScopeKey: null, refundedAt: new Date() } });
    });
  }

  async revokeEntitlement(entitlementId: string) {
    return this.prisma.entitlement.update({ where: { id: entitlementId }, data: { status: "REVOKED", activeScopeKey: null, revokedAt: new Date() } } as Parameters<PrismaClient["entitlement"]["update"]>[0]);
  }
}
