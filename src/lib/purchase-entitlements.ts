import { createHash } from "crypto";

import type { Artefact, PrismaClient } from "@prisma/client";

import { normalizeCouncilLgaCode } from "@/lib/council/lga-normaliser";
import {
  quickSiteCheckReportSchema,
  ArtefactAccessError,
  ArtefactValidationError,
} from "@/lib/artefact-service";
import { normalizeProposalBriefForComparison } from "@/lib/detailed-planning-pack-selector";
import {
  isArtefactCurrentForSite,
  quickSiteCheckScope,
  type CurrentSiteScope,
} from "@/lib/site-scoped-artefacts";
import type { QuickSiteCheckReport } from "@/types/quick-site-check";

export type ServerProductTerms = {
  productCode: string;
  productVersion: string;
  amountMinor: number;
  currency: string;
};

type PurchasePrisma = Pick<
  PrismaClient,
  "project" | "artefact" | "purchase" | "entitlement" | "$transaction"
>;

type ExactScope = {
  userId: string;
  projectId: string;
  quickSiteCheckArtefactId: string;
  proposalFingerprint: string;
  productCode: string;
  productVersion: string;
};

const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");

export const normalizePurchaseProposal = (proposalBrief?: string | null) =>
  normalizeProposalBriefForComparison(proposalBrief);

export const fingerprintPurchaseProposal = (proposalBrief?: string | null) => {
  const normalized = normalizePurchaseProposal(proposalBrief);
  if (!normalized) {
    throw new ArtefactValidationError(
      "A proposed-works brief is required before purchase",
    );
  }
  return sha256(normalized);
};

const exactScopeKey = (scope: ExactScope) =>
  [
    scope.userId,
    scope.projectId,
    scope.quickSiteCheckArtefactId,
    scope.proposalFingerprint,
    scope.productCode,
    scope.productVersion,
  ].join(":");

const isLaunchLga = (lgaCode?: string | null, lgaName?: string | null) =>
  /\b(byron|kempsey)\b/i.test(`${lgaCode ?? ""} ${lgaName ?? ""}`);

const parseQsc = (artefact: Artefact): QuickSiteCheckReport | null => {
  const parsed = quickSiteCheckReportSchema.safeParse(artefact.payload);
  return parsed.success ? (parsed.data as QuickSiteCheckReport) : null;
};

const isUniqueConstraintError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  (error as { code?: string }).code === "P2002";

export class PurchaseEntitlementService {
  constructor(
    private readonly prisma: PurchasePrisma,
    private readonly terms: ServerProductTerms,
  ) {}

  async resolveScope(params: {
    userId: string;
    projectId: string;
    proposalBrief: string;
  }) {
    const project = await this.prisma.project.findFirst({
      where: {
        AND: [
          { OR: [{ id: params.projectId }, { publicId: params.projectId }] },
          { userId: params.userId },
        ],
      },
      include: { siteContext: true },
    });
    if (!project) throw new ArtefactAccessError("Project not found", 404);
    if (!project.siteContext) {
      throw new ArtefactValidationError(
        "Set a confirmed site before purchase",
      );
    }

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
      .find(
        ({ report }) =>
          report?.lepEvidenceSummary?.label === "Cited" &&
          isArtefactCurrentForSite(
            currentSiteScope,
            quickSiteCheckScope(report),
          ),
      );
    if (!current?.report) {
      throw new ArtefactValidationError(
        "Save a current-site Quick Site Check with cited LEP evidence before purchase",
      );
    }

    const lgaCode = normalizeCouncilLgaCode(
      current.report.site.lga ?? project.siteContext.lgaCode,
    );
    if (
      !isLaunchLga(
        lgaCode,
        current.report.site.lga ?? project.siteContext.lgaName,
      )
    ) {
      throw new ArtefactValidationError(
        "Purchase pilot is currently available for Byron and Kempsey only",
      );
    }

    const proposalFingerprint = fingerprintPurchaseProposal(
      params.proposalBrief,
    );
    const scope = {
      userId: params.userId,
      projectId: project.id,
      quickSiteCheckArtefactId: current.artefact.id,
      proposalFingerprint,
      productCode: this.terms.productCode,
      productVersion: this.terms.productVersion,
    };

    return {
      ...scope,
      scopeKey: exactScopeKey(scope),
      amountMinor: this.terms.amountMinor,
      currency: this.terms.currency,
    };
  }

  async createOrReusePendingIntent(params: {
    userId: string;
    projectId: string;
    proposalBrief: string;
  }) {
    const scope = await this.resolveScope(params);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const existing = await this.prisma.purchase.findFirst({
        where: { scopeKey: scope.scopeKey, status: "PENDING" },
      } as Parameters<PrismaClient["purchase"]["findFirst"]>[0]);
      if (existing) return existing;

      const activeEntitlement = await this.prisma.entitlement.findFirst({
        where: { activeScopeKey: scope.scopeKey, status: "ACTIVE" },
      } as Parameters<PrismaClient["entitlement"]["findFirst"]>[0]);
      if (activeEntitlement) {
        throw new ArtefactAccessError(
          "This exact Planning Controls Pack scope is already paid",
          409,
        );
      }

      const priorCount = await this.prisma.purchase.count({
        where: { scopeKey: scope.scopeKey },
      } as Parameters<PrismaClient["purchase"]["count"]>[0]);
      try {
        return await this.prisma.purchase.create({
          data: {
            ...scope,
            idempotencyKey: sha256(
              `pending:${scope.scopeKey}:${priorCount + 1}`,
            ),
          },
        } as Parameters<PrismaClient["purchase"]["create"]>[0]);
      } catch (error) {
        if (!isUniqueConstraintError(error)) throw error;
        const winner = await this.prisma.purchase.findFirst({
          where: { scopeKey: scope.scopeKey, status: "PENDING" },
        } as Parameters<PrismaClient["purchase"]["findFirst"]>[0]);
        if (winner) return winner;
      }
    }

    throw new ArtefactValidationError(
      "Could not create a purchase intent safely; try again",
    );
  }

  async attachProviderCheckout(purchaseId: string, checkoutSessionId: string) {
    await this.prisma.purchase.updateMany({
      where: { id: purchaseId, status: "PENDING", providerReference: null },
      data: { providerName: "stripe", providerReference: checkoutSessionId },
    } as Parameters<PrismaClient["purchase"]["updateMany"]>[0]);
    const latest = await this.prisma.purchase.findUnique({ where: { id: purchaseId } });
    if (latest?.status === "PENDING" && latest.providerName === "stripe" && latest.providerReference === checkoutSessionId) return latest;
    throw new ArtefactValidationError("Purchase checkout reference could not be attached safely");
  }

  async bindProviderPaymentReference(purchaseId: string, paymentIntentId?: string | null) {
    if (!paymentIntentId) return;
    await this.prisma.purchase.updateMany({
      where: { id: purchaseId, status: { in: ["PENDING", "PAID"] }, providerIntentReference: null },
      data: { providerIntentReference: paymentIntentId },
    } as Parameters<PrismaClient["purchase"]["updateMany"]>[0]);
    const latest = await this.prisma.purchase.findUnique({ where: { id: purchaseId } });
    if (latest && ["PENDING", "PAID"].includes(latest.status) && latest.providerIntentReference === paymentIntentId) return latest;
    throw new ArtefactValidationError("Provider payment reference could not be bound safely");
  }

  async findCurrentScopePurchaseStatus(params: { userId: string; projectId: string; proposalBrief: string }) {
    const scope = await this.resolveScope(params);
    const entitlement = await this.prisma.entitlement.findFirst({
      where: {
        userId: scope.userId,
        projectId: scope.projectId,
        quickSiteCheckArtefactId: scope.quickSiteCheckArtefactId,
        proposalFingerprint: scope.proposalFingerprint,
        productCode: scope.productCode,
        productVersion: scope.productVersion,
      },
      orderBy: { createdAt: "desc" },
    } as Parameters<PrismaClient["entitlement"]["findFirst"]>[0]);
    if (entitlement?.status === "ACTIVE") return { state: "paid" as const };
    if (entitlement?.status === "REVOKED") return { state: "revoked" as const };
    if (entitlement?.status === "REFUNDED") return { state: "refunded" as const };
    const purchase = await this.prisma.purchase.findFirst({
      where: { scopeKey: scope.scopeKey },
      orderBy: { createdAt: "desc" },
    } as Parameters<PrismaClient["purchase"]["findFirst"]>[0]);
    const states = { PENDING: "waiting", PAID: "paid", FAILED: "failed", CANCELLED: "cancelled", REFUNDED: "refunded" } as const;
    return { state: purchase ? states[purchase.status] : "available" as const };
  }

  async resolveWebhookPurchase(purchaseId: string, checkoutSessionId?: string | null) {
    const purchase = await this.prisma.purchase.findUnique({ where: { id: purchaseId } });
    if (!purchase || purchase.providerName !== "stripe" || !checkoutSessionId || purchase.providerReference !== checkoutSessionId) {
      throw new ArtefactValidationError("Webhook purchase reference mismatch");
    }
    return purchase;
  }

  async settlePaidPurchase(purchaseId: string) {
    return this.prisma.$transaction(async (tx: unknown) => {
      const transaction = tx as Pick<
        PrismaClient,
        "purchase" | "entitlement"
      >;
      const existing = await transaction.purchase.findUnique({
        where: { id: purchaseId },
      });
      if (!existing) {
        throw new ArtefactValidationError("Purchase not found");
      }
      if (!["PENDING", "PAID"].includes(existing.status)) {
        throw new ArtefactValidationError("Purchase is not payable");
      }

      const transition = await transaction.purchase.updateMany({
        where: { id: purchaseId, status: existing.status },
        data:
          existing.status === "PENDING"
            ? { status: "PAID", paidAt: new Date() }
            : { status: "PAID" },
      });
      const purchase = await transaction.purchase.findUnique({
        where: { id: purchaseId },
      });
      if (
        transition.count === 0 ||
        !purchase ||
        purchase.status !== "PAID"
      ) {
        throw new ArtefactValidationError("Purchase is not payable");
      }

      const existingEntitlement =
        await transaction.entitlement.findUnique({
          where: { purchaseId: purchase.id },
        });
      if (existingEntitlement?.status === "ACTIVE") {
        return existingEntitlement;
      }
      if (existingEntitlement) {
        throw new ArtefactValidationError(
          "Entitlement was revoked or refunded and cannot be reactivated by a replayed settlement",
        );
      }

      const entitlement = await transaction.entitlement.upsert({
        where: { purchaseId: purchase.id },
        create: {
          userId: purchase.userId,
          projectId: purchase.projectId,
          quickSiteCheckArtefactId:
            purchase.quickSiteCheckArtefactId,
          proposalFingerprint: purchase.proposalFingerprint,
          productCode: purchase.productCode,
          productVersion: purchase.productVersion,
          purchaseId: purchase.id,
          status: "ACTIVE",
          activeScopeKey: exactScopeKey(purchase),
        },
        update: {},
      });
      if (entitlement.status !== "ACTIVE") {
        throw new ArtefactValidationError(
          "Entitlement was revoked or refunded and cannot be reactivated by a replayed settlement",
        );
      }
      return entitlement;
    });
  }

  async findActiveEntitlementForCurrentScope(params: {
    userId: string;
    projectId: string;
    proposalBrief: string;
  }) {
    const scope = await this.resolveScope(params);
    return this.findActiveEntitlement({
      userId: scope.userId,
      projectId: scope.projectId,
      quickSiteCheckArtefactId: scope.quickSiteCheckArtefactId,
      proposalBrief: params.proposalBrief,
    });
  }

  async findActiveEntitlement(params: {
    userId: string;
    projectId: string;
    quickSiteCheckArtefactId: string;
    proposalBrief: string;
    productCode?: string;
    productVersion?: string;
  }) {
    const proposalFingerprint = fingerprintPurchaseProposal(
      params.proposalBrief,
    );
    const scope = {
      userId: params.userId,
      projectId: params.projectId,
      quickSiteCheckArtefactId: params.quickSiteCheckArtefactId,
      proposalFingerprint,
      productCode: params.productCode ?? this.terms.productCode,
      productVersion: params.productVersion ?? this.terms.productVersion,
    };

    return this.prisma.entitlement.findFirst({
      where: {
        activeScopeKey: exactScopeKey(scope),
        status: "ACTIVE",
      },
    } as Parameters<PrismaClient["entitlement"]["findFirst"]>[0]);
  }

  async markPurchaseFailed(purchaseId: string) {
    const existing = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
    });
    if (!existing) {
      throw new ArtefactValidationError("Purchase not found");
    }
    if (existing.status === "FAILED") return existing;
    if (existing.status !== "PENDING") {
      throw new ArtefactValidationError(
        "Purchase cannot be marked failed from its current state",
      );
    }

    const result = await this.prisma.purchase.updateMany({
      where: { id: purchaseId, status: "PENDING" },
      data: { status: "FAILED", failedAt: new Date() },
    } as Parameters<PrismaClient["purchase"]["updateMany"]>[0]);
    const latest = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
    });
    if (result.count === 0 && latest?.status !== "FAILED") {
      throw new ArtefactValidationError(
        "Purchase cannot be marked failed from its current state",
      );
    }
    if (!latest) throw new ArtefactValidationError("Purchase not found");
    return latest;
  }

  async cancelPurchase(purchaseId: string) {
    const existing = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
    });
    if (!existing) {
      throw new ArtefactValidationError("Purchase not found");
    }
    if (existing.status === "CANCELLED") return existing;
    if (existing.status !== "PENDING") {
      throw new ArtefactValidationError(
        "Purchase cannot be cancelled from its current state",
      );
    }

    const result = await this.prisma.purchase.updateMany({
      where: { id: purchaseId, status: "PENDING" },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    } as Parameters<PrismaClient["purchase"]["updateMany"]>[0]);
    const latest = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
    });
    if (result.count === 0 && latest?.status !== "CANCELLED") {
      throw new ArtefactValidationError(
        "Purchase cannot be cancelled from its current state",
      );
    }
    if (!latest) throw new ArtefactValidationError("Purchase not found");
    return latest;
  }

  async refundPurchase(purchaseId: string) {
    return this.prisma.$transaction(async (tx: unknown) => {
      const transaction = tx as Pick<
        PrismaClient,
        "purchase" | "entitlement"
      >;
      const existing = await transaction.purchase.findUnique({
        where: { id: purchaseId },
      });
      if (!existing) {
        throw new ArtefactValidationError("Purchase not found");
      }
      if (existing.status === "REFUNDED") return existing;
      if (existing.status !== "PAID") {
        throw new ArtefactValidationError(
          "Purchase cannot be refunded from its current state",
        );
      }

      const refundedAt = new Date();
      const result = await transaction.purchase.updateMany({
        where: { id: purchaseId, status: "PAID" },
        data: { status: "REFUNDED", refundedAt },
      });
      const latest = await transaction.purchase.findUnique({
        where: { id: purchaseId },
      });
      if (result.count === 0 && latest?.status !== "REFUNDED") {
        throw new ArtefactValidationError(
          "Purchase cannot be refunded from its current state",
        );
      }
      if (!latest) {
        throw new ArtefactValidationError("Purchase not found");
      }

      await transaction.entitlement.updateMany({
        where: { purchaseId, status: "ACTIVE" },
        data: {
          status: "REFUNDED",
          activeScopeKey: null,
          refundedAt,
        },
      });
      return latest;
    });
  }

  async providerConfirmedFullRefund(purchaseId: string, paymentIntentId: string) {
    return this.prisma.$transaction(async (tx: unknown) => {
      const transaction = tx as Pick<PrismaClient, "purchase" | "entitlement">;
      const existing = await transaction.purchase.findUnique({ where: { id: purchaseId } });
      if (!existing || existing.providerName !== "stripe") throw new ArtefactValidationError("Refund purchase reference mismatch");
      if (existing.providerIntentReference && existing.providerIntentReference !== paymentIntentId) throw new ArtefactValidationError("Refund payment reference mismatch");
      if (existing.status === "REFUNDED") {
        if (existing.providerIntentReference !== paymentIntentId) throw new ArtefactValidationError("Refund payment reference mismatch");
        return existing;
      }
      if (!["PENDING", "PAID"].includes(existing.status)) throw new ArtefactValidationError("Provider-confirmed refund requires reconciliation");
      const refundedAt = new Date();
      const result = await transaction.purchase.updateMany({
        where: { id: purchaseId, status: existing.status, providerIntentReference: existing.providerIntentReference },
        data: { status: "REFUNDED", providerIntentReference: paymentIntentId, refundedAt },
      });
      const latest = await transaction.purchase.findUnique({ where: { id: purchaseId } });
      if (result.count !== 1 || latest?.status !== "REFUNDED" || latest.providerIntentReference !== paymentIntentId) {
        throw new ArtefactValidationError("Provider-confirmed refund requires reconciliation");
      }
      await transaction.entitlement.updateMany({
        where: { purchaseId, status: "ACTIVE" },
        data: { status: "REFUNDED", activeScopeKey: null, refundedAt },
      });
      return latest;
    });
  }

  async revokeEntitlement(entitlementId: string) {
    const existing = await this.prisma.entitlement.findUnique({
      where: { id: entitlementId },
    });
    if (!existing) {
      throw new ArtefactValidationError("Entitlement not found");
    }
    if (existing.status === "REVOKED") return existing;
    if (existing.status !== "ACTIVE") {
      throw new ArtefactValidationError(
        "Entitlement cannot be revoked from its current state",
      );
    }

    const result = await this.prisma.entitlement.updateMany({
      where: { id: entitlementId, status: "ACTIVE" },
      data: {
        status: "REVOKED",
        activeScopeKey: null,
        revokedAt: new Date(),
      },
    } as Parameters<PrismaClient["entitlement"]["updateMany"]>[0]);
    const latest = await this.prisma.entitlement.findUnique({
      where: { id: entitlementId },
    });
    if (result.count === 0 && latest?.status !== "REVOKED") {
      throw new ArtefactValidationError(
        "Entitlement cannot be revoked from its current state",
      );
    }
    if (!latest) {
      throw new ArtefactValidationError("Entitlement not found");
    }
    return latest;
  }
}
