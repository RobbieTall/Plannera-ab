import { createHash } from "crypto";
import type { Prisma, PrismaClient, SubmissionSeeCredit } from "@prisma/client";
import {
  quoteSubmissionSeeCredit, reserveSubmissionSeeCredit, SUBMISSION_SEE_COMMERCIAL_TERMS as terms,
  type SubmissionSeeCreditLedgerEntry,
} from "./submission-see-credit";
import { resolveSeeCheckoutScope, type SeeCheckoutSelection, type ResolvedSeeCheckoutScope } from "./submission-see-checkout-scope";
import { SeeCheckoutError } from "./submission-see-preview-checkout-config";

export type SeeCheckoutQuote = {
  state: "available" | "paid"; quoteId: string; currency: "AUD";
  listAmountMinor: number; creditAmountMinor: number; payableAmountMinor: number;
};
export interface SeeCheckoutProvider {
  create(input: { purchaseId: string; projectId: string; amountMinor: number;
    currency: "AUD"; idempotencyKey: string }): Promise<{ id: string; url: string }>;
}
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const toEntry = (row: SubmissionSeeCredit): SubmissionSeeCreditLedgerEntry => ({
  idempotencyKey: row.idempotencyKey, sourceEntitlementId: row.sourceEntitlementId,
  targetPurchaseId: row.targetPurchaseId, scopeKey: row.scopeKey, amountMinor: row.creditAmountMinor,
  currency: row.currency as "AUD", status: row.status, reservedAt: row.reservedAt.toISOString(),
  consumedAt: row.consumedAt?.toISOString() ?? null, releasedAt: row.releasedAt?.toISOString() ?? null,
});
const exact = (row: { userId: string; projectId: string; quickSiteCheckArtefactId: string; proposalFingerprint: string },
  scope: ResolvedSeeCheckoutScope) => row.userId === scope.userId && row.projectId === scope.projectId &&
  row.quickSiteCheckArtefactId === scope.quickSiteCheckArtefactId && row.proposalFingerprint === scope.proposalFingerprint;
const error = (code: ConstructorParameters<typeof SeeCheckoutError>[0]): never => { throw new SeeCheckoutError(code); };

export class SubmissionSeeCheckout {
  constructor(
    private readonly db: Pick<PrismaClient, "$transaction">,
    private readonly provider: SeeCheckoutProvider,
    private readonly council: "BYRON" | "KEMPSEY",
    private readonly resolve = resolveSeeCheckoutScope,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private async transaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try { return await this.db.$transaction(work, { isolationLevel: "Serializable" }); }
      catch (cause) {
        const code = typeof cause === "object" && cause !== null && "code" in cause ? cause.code : null;
        if (!["P2034", "P2002"].includes(String(code)) || attempt === 2) throw cause;
      }
    }
    return error("checkout_conflict");
  }

  private async inspect(tx: Prisma.TransactionClient, selection: SeeCheckoutSelection) {
    const scope = await this.resolve(tx, selection, this.council);
    const entitlement = await tx.entitlement.findFirst({ where: {
      activeScopeKey: scope.scopeKey, status: "ACTIVE",
    }, include: { purchase: true } });
    if (entitlement) {
      const purchase = entitlement.purchase;
      if (!exact(entitlement, scope) || entitlement.productCode !== terms.productCode ||
        entitlement.productVersion !== terms.productVersion || !purchase || !exact(purchase, scope) ||
        purchase.status !== "PAID" || purchase.productCode !== terms.productCode ||
        purchase.productVersion !== terms.productVersion || purchase.scopeKey !== scope.scopeKey ||
        purchase.currency !== terms.currency ||
        ![terms.listAmountMinor, terms.creditedPayableMinor].includes(purchase.amountMinor)) {
        return error("pending_reconciliation_required");
      }
      return { scope, paid: true as const };
    }
    // A previous paid/revoked/refunded scope is never silently sold a second time.
    const priorPaid = await tx.purchase.findFirst({ where: {
      scopeKey: scope.scopeKey, status: { in: ["PAID", "REFUNDED"] },
    } });
    if (priorPaid) return error("pending_reconciliation_required");
    const pending = await tx.purchase.findFirst({ where: { scopeKey: scope.scopeKey, status: "PENDING" } });
    if (pending && (!exact(pending, scope) || pending.productCode !== terms.productCode ||
      pending.productVersion !== terms.productVersion || pending.currency !== terms.currency ||
      this.now().getTime() - pending.createdAt.getTime() > 23 * 60 * 60 * 1000)) {
      return error("pending_reconciliation_required");
    }
    const source = await tx.entitlement.findFirst({ where: {
      userId: scope.userId, projectId: scope.projectId, quickSiteCheckArtefactId: scope.quickSiteCheckArtefactId,
      proposalFingerprint: scope.proposalFingerprint, productCode: "planning_controls_pack",
      productVersion: "v1", status: "ACTIVE",
    }, include: { purchase: true }, orderBy: { createdAt: "desc" } });
    if (source && (!source.purchase || !exact(source.purchase, scope) || source.purchase.status !== "PAID" ||
      source.purchase.productCode !== "planning_controls_pack" || source.purchase.productVersion !== "v1" ||
      source.purchase.amountMinor !== terms.planningPackCreditMinor || source.purchase.currency !== terms.currency ||
      source.purchase.providerName !== "stripe" || !source.purchase.providerReference?.startsWith("cs_test_"))) {
      return error("credit_unavailable");
    }
    const ledger = source ? await tx.submissionSeeCredit.findMany({
      where: { sourceEntitlementId: source.id },
    }) : [];
    const ownCredit = pending ? await tx.submissionSeeCredit.findUnique({ where: { targetPurchaseId: pending.id } }) : null;
    if (ownCredit && (!source || ownCredit.sourceEntitlementId !== source.id || ownCredit.status !== "RESERVED" ||
      ownCredit.scopeKey !== scope.scopeKey || ownCredit.listAmountMinor !== terms.listAmountMinor ||
      ownCredit.creditAmountMinor !== terms.planningPackCreditMinor ||
      ownCredit.payableAmountMinor !== terms.creditedPayableMinor || ownCredit.currency !== terms.currency)) {
      return error("credit_unavailable");
    }
    const quote = quoteSubmissionSeeCredit({
      scope, planningPackEntitlement: source ? { ...source, entitlementId: source.id } : null,
      ledgerEntries: ledger.filter((entry) => entry.targetPurchaseId !== pending?.id).map(toEntry),
    });
    if (quote.ineligibilityReason === "credit_reserved") return error("credit_unavailable");
    if (pending && (pending.amountMinor !== quote.payableAmountMinor ||
      (quote.creditEligible !== Boolean(ownCredit)))) return error("pending_reconciliation_required");
    return { scope, paid: false as const, pending, quote };
  }

  private publicQuote(details: Awaited<ReturnType<SubmissionSeeCheckout["inspect"]>>): SeeCheckoutQuote {
    if (details.paid) return { state: "paid", quoteId: "", currency: "AUD",
      listAmountMinor: terms.listAmountMinor, creditAmountMinor: 0, payableAmountMinor: 0 };
    return { state: "available", currency: "AUD", listAmountMinor: terms.listAmountMinor,
      creditAmountMinor: details.quote.creditAmountMinor, payableAmountMinor: details.quote.payableAmountMinor,
      quoteId: hash({ source: details.scope.sourceSignature, scope: details.scope.scopeKey,
        amount: details.quote.payableAmountMinor, creditSource: details.quote.creditSourceEntitlementId }),
    };
  }

  quote(selection: SeeCheckoutSelection): Promise<SeeCheckoutQuote> {
    return this.transaction(async (tx) => this.publicQuote(await this.inspect(tx, selection)));
  }

  async checkout(selection: SeeCheckoutSelection, expectedQuoteId: string) {
    const prepared = await this.transaction(async (tx) => {
      const details = await this.inspect(tx, selection);
      if (details.paid) return error("already_paid");
      if (!/^[a-f0-9]{64}$/.test(expectedQuoteId) || this.publicQuote(details).quoteId !== expectedQuoteId) return error("quote_changed");
      if (details.pending) return { purchase: details.pending, sourceSignature: details.scope.sourceSignature };
      const count = await tx.purchase.count({ where: { scopeKey: details.scope.scopeKey } });
      const purchase = await tx.purchase.create({ data: {
        userId: details.scope.userId, projectId: details.scope.projectId,
        quickSiteCheckArtefactId: details.scope.quickSiteCheckArtefactId,
        proposalFingerprint: details.scope.proposalFingerprint,
        productCode: terms.productCode, productVersion: terms.productVersion,
        amountMinor: details.quote.payableAmountMinor, currency: terms.currency, status: "PENDING",
        scopeKey: details.scope.scopeKey, idempotencyKey: hash(["see-checkout.v1", details.scope.scopeKey, count + 1]),
      } });
      if (details.quote.creditEligible) {
        const entry = reserveSubmissionSeeCredit({ quote: details.quote, targetPurchaseId: purchase.id,
          ledgerEntries: [], now: this.now().toISOString() });
        await tx.submissionSeeCredit.create({ data: {
          sourceEntitlementId: entry.sourceEntitlementId, targetPurchaseId: purchase.id,
          scopeKey: entry.scopeKey, idempotencyKey: entry.idempotencyKey,
          listAmountMinor: terms.listAmountMinor, creditAmountMinor: entry.amountMinor,
          payableAmountMinor: details.quote.payableAmountMinor, currency: terms.currency,
          status: "RESERVED", reservedAt: new Date(entry.reservedAt),
        } });
      }
      return { purchase, sourceSignature: details.scope.sourceSignature };
    });
    // Never hold a database transaction open over a provider network call.
    // A network failure keeps the SAME pending intent and reserved credit for safe retry.
    const session = await this.provider.create({
      purchaseId: prepared.purchase.id, projectId: prepared.purchase.projectId,
      amountMinor: prepared.purchase.amountMinor, currency: "AUD", idempotencyKey: prepared.purchase.idempotencyKey,
    });
    try {
      const url = new URL(session.url);
      if (!/^cs_test_[A-Za-z0-9]+$/.test(session.id) || url.origin !== "https://checkout.stripe.com" ||
        url.username || url.password || url.pathname !== "/c/pay/" + session.id) return error("provider_checkout_invalid");
    } catch { return error("provider_checkout_invalid"); }
    await this.transaction(async (tx) => {
      const details = await this.inspect(tx, selection);
      if (details.paid || details.scope.sourceSignature !== prepared.sourceSignature ||
        details.pending?.id !== prepared.purchase.id) return error("quote_changed");
      const attached = await tx.purchase.updateMany({ where: {
        id: prepared.purchase.id, status: "PENDING", providerReference: null,
      }, data: { providerName: "stripe", providerReference: session.id } });
      if (attached.count === 0) {
        const current = await tx.purchase.findUnique({ where: { id: prepared.purchase.id } });
        if (current?.status !== "PENDING" || current.providerName !== "stripe" ||
          current.providerReference !== session.id) return error("checkout_conflict");
      }
    });
    return { checkoutUrl: session.url };
  }
}
