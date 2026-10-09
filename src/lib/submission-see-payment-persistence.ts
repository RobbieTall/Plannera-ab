import type { Entitlement, PrismaClient, Purchase } from "@prisma/client";
import {
  planSubmissionSeePaymentTransition,
  SubmissionSeePaymentPolicyError,
  verifySubmissionSeePreviewEvent,
  type SeePaymentTransition,
} from "./submission-see-payment-policy";

const fail = (): never => { throw new SubmissionSeePaymentPolicyError("invalid_transition"); };

function exactEntitlement(entitlement: Entitlement, purchase: Purchase) {
  return entitlement.purchaseId === purchase.id &&
    entitlement.userId === purchase.userId &&
    entitlement.projectId === purchase.projectId &&
    entitlement.quickSiteCheckArtefactId === purchase.quickSiteCheckArtefactId &&
    entitlement.proposalFingerprint === purchase.proposalFingerprint &&
    entitlement.productCode === purchase.productCode &&
    entitlement.productVersion === purchase.productVersion &&
    (entitlement.status === "ACTIVE"
      ? entitlement.activeScopeKey === purchase.scopeKey
      : entitlement.activeScopeKey === null);
}

/**
 * Only accepts raw, signed Preview test events through receive().
 * All local effects occur in one serializable database transaction.
 * Does not create Checkout sessions, call refund APIs or enable a route.
 */
export class SubmissionSeePaymentPersistence {
  constructor(
    private readonly prisma: Pick<PrismaClient, "$transaction">,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async receive(input: Parameters<typeof verifySubmissionSeePreviewEvent>[0]):
    Promise<SeePaymentTransition | { action: "ignored"; credit: "none" }> {
    // This must precede every database operation, including replay handling.
    const verifiedEvent = verifySubmissionSeePreviewEvent(input);
    if (!verifiedEvent) return { action: "ignored", credit: "none" };

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const purchase = await tx.purchase.findUnique({
            where: { id: verifiedEvent.event.purchaseId },
          });
          if (!purchase) throw new SubmissionSeePaymentPolicyError("purchase_mismatch");
          const credit = await tx.submissionSeeCredit.findUnique({
            where: { targetPurchaseId: purchase.id },
          });
          const creditSource = credit ? await tx.entitlement.findUnique({
            where: { id: credit.sourceEntitlementId },
          }) : null;
          const transition = planSubmissionSeePaymentTransition({
            verifiedEvent, purchase, credit, creditSource,
          });
          const entitlement = await tx.entitlement.findUnique({
            where: { purchaseId: purchase.id },
          });
          if (entitlement && !exactEntitlement(entitlement, purchase)) return fail();

          if (transition.action === "replay") {
            if (purchase.status === "PAID") {
              if (entitlement?.status !== "ACTIVE") return fail();
            } else if (purchase.status === "REFUNDED") {
              if (!entitlement || entitlement.status === "ACTIVE") return fail();
            } else if (entitlement) return fail();
            return transition;
          }

          if (transition.action === "refund") {
            if (!entitlement || !["ACTIVE", "REVOKED"].includes(entitlement.status)) return fail();
          } else if (entitlement) return fail();

          if (transition.action === "settle") {
            const alreadyActive = await tx.entitlement.findFirst({
              where: { activeScopeKey: purchase.scopeKey, status: "ACTIVE" },
            });
            if (alreadyActive) return fail();
          }

          const now = this.now();
          if (!Number.isFinite(now.getTime())) return fail();
          const data = transition.action === "settle"
            ? { status: "PAID" as const, paidAt: now, providerIntentReference: transition.paymentIntentId }
            : transition.action === "refund"
              ? { status: "REFUNDED" as const, refundedAt: now }
              : transition.action === "fail"
                ? { status: "FAILED" as const, failedAt: now }
                : { status: "CANCELLED" as const, cancelledAt: now };
          const changed = await tx.purchase.updateMany({
            where: {
              id: purchase.id, status: purchase.status, scopeKey: purchase.scopeKey,
              productCode: purchase.productCode, productVersion: purchase.productVersion,
              amountMinor: purchase.amountMinor, currency: purchase.currency,
              providerName: purchase.providerName, providerReference: purchase.providerReference,
              providerIntentReference: purchase.providerIntentReference,
            },
            data,
          });
          if (changed.count !== 1) return fail();

          if (transition.credit === "consume" || transition.credit === "release") {
            if (!credit) return fail();
            const updatedCredit = await tx.submissionSeeCredit.updateMany({
              where: { id: credit.id, targetPurchaseId: purchase.id, status: "RESERVED" },
              data: transition.credit === "consume"
                ? { status: "CONSUMED", consumedAt: now }
                : { status: "RELEASED", releasedAt: now },
            });
            if (updatedCredit.count !== 1) return fail();
          }

          if (transition.action === "settle") {
            await tx.entitlement.create({
              data: {
                userId: purchase.userId, projectId: purchase.projectId,
                quickSiteCheckArtefactId: purchase.quickSiteCheckArtefactId,
                proposalFingerprint: purchase.proposalFingerprint,
                productCode: purchase.productCode, productVersion: purchase.productVersion,
                purchaseId: purchase.id, status: "ACTIVE", activeScopeKey: purchase.scopeKey,
                activatedAt: now,
              },
            });
          } else if (transition.action === "refund") {
            const revoked = await tx.entitlement.updateMany({
              where: { id: entitlement!.id, purchaseId: purchase.id, status: entitlement!.status },
              data: { status: "REFUNDED", activeScopeKey: null, refundedAt: now },
            });
            if (revoked.count !== 1) return fail();
          }
          return transition;
        }, { isolationLevel: "Serializable" });
      } catch (error) {
        const code = typeof error === "object" && error !== null && "code" in error
          ? error.code : null;
        // Retry only a transaction that Prisma says was rolled back for contention.
        // Never retry an external provider request here.
        if (code !== "P2034" || attempt === 2) throw error;
      }
    }
    return fail();
  }
}
