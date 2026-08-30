import type {
  Entitlement,
  PrismaClient,
  Purchase,
  SubmissionSeeCredit,
} from "@prisma/client";

import { PLANNING_CONTROLS_PACK_TERMS } from "./planning-pack-commerce";
import {
  SUBMISSION_SEE_COMMERCIAL_TERMS,
  SubmissionSeeCreditError,
  consumeSubmissionSeeCredit,
  quoteSubmissionSeeCredit,
  releaseSubmissionSeeCredit,
  reserveSubmissionSeeCredit,
  submissionSeeScopeKey,
  type PlanningPackCreditSource,
  type SubmissionSeeCreditLedgerEntry,
  type SubmissionSeeCreditQuote,
  type SubmissionSeeScope,
} from "./submission-see-credit";

type LedgerClient = Pick<
  PrismaClient,
  "entitlement" | "purchase" | "submissionSeeCredit"
>;

type LedgerPrisma = LedgerClient & Pick<PrismaClient, "$transaction">;

const isUniqueConstraintError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  (error as { code?: string }).code === "P2002";

const timestamp = (value?: Date) => {
  const resolved = value ?? new Date();
  if (Number.isNaN(resolved.getTime())) {
    throw new SubmissionSeeCreditError("invalid_credit_transition");
  }
  return resolved.toISOString();
};

const toLedgerEntry = (
  row: SubmissionSeeCredit,
): SubmissionSeeCreditLedgerEntry => ({
  idempotencyKey: row.idempotencyKey,
  sourceEntitlementId: row.sourceEntitlementId,
  targetPurchaseId: row.targetPurchaseId,
  scopeKey: row.scopeKey,
  amountMinor: row.creditAmountMinor,
  currency: row.currency as "AUD",
  status: row.status,
  reservedAt: row.reservedAt.toISOString(),
  consumedAt: row.consumedAt?.toISOString() ?? null,
  releasedAt: row.releasedAt?.toISOString() ?? null,
});

const sourceForQuote = (
  source: Entitlement | null,
): PlanningPackCreditSource | null =>
  source
    ? {
        entitlementId: source.id,
        userId: source.userId,
        projectId: source.projectId,
        quickSiteCheckArtefactId: source.quickSiteCheckArtefactId,
        proposalFingerprint: source.proposalFingerprint,
        productCode: source.productCode,
        productVersion: source.productVersion,
        status: source.status,
      }
    : null;

const exactSourceWhere = (scope: SubmissionSeeScope) => ({
  userId: scope.userId,
  projectId: scope.projectId,
  quickSiteCheckArtefactId: scope.quickSiteCheckArtefactId,
  proposalFingerprint: scope.proposalFingerprint,
  productCode: PLANNING_CONTROLS_PACK_TERMS.productCode,
  productVersion: PLANNING_CONTROLS_PACK_TERMS.productVersion,
});

const findExactSource = (
  client: LedgerClient,
  scope: SubmissionSeeScope,
): Promise<Entitlement | null> =>
  client.entitlement.findFirst({
    where: exactSourceWhere(scope),
    orderBy: { createdAt: "desc" },
  });

const quoteWithClient = async (
  client: LedgerClient,
  scope: SubmissionSeeScope,
): Promise<SubmissionSeeCreditQuote> => {
  const source = await findExactSource(client, scope);
  const rows = source
    ? await client.submissionSeeCredit.findMany({
        where: { sourceEntitlementId: source.id },
        orderBy: { reservedAt: "desc" },
      })
    : [];
  return quoteSubmissionSeeCredit({
    scope,
    planningPackEntitlement: sourceForQuote(source),
    ledgerEntries: rows.map(toLedgerEntry),
  });
};

const assertCreditRecord = (
  row: SubmissionSeeCredit,
  scope: SubmissionSeeScope,
) => {
  if (
    row.scopeKey !== submissionSeeScopeKey(scope) ||
    row.listAmountMinor !== SUBMISSION_SEE_COMMERCIAL_TERMS.listAmountMinor ||
    row.creditAmountMinor !==
      SUBMISSION_SEE_COMMERCIAL_TERMS.planningPackCreditMinor ||
    row.payableAmountMinor !==
      SUBMISSION_SEE_COMMERCIAL_TERMS.creditedPayableMinor ||
    row.currency !== SUBMISSION_SEE_COMMERCIAL_TERMS.currency
  ) {
    throw new SubmissionSeeCreditError("credit_scope_mismatch");
  }
};

const assertTargetPurchase = (
  purchase: Purchase | null,
  scope: SubmissionSeeScope,
  statuses: Purchase["status"][],
) => {
  if (
    !purchase ||
    purchase.userId !== scope.userId ||
    purchase.projectId !== scope.projectId ||
    purchase.quickSiteCheckArtefactId !== scope.quickSiteCheckArtefactId ||
    purchase.proposalFingerprint !== scope.proposalFingerprint ||
    purchase.productCode !== SUBMISSION_SEE_COMMERCIAL_TERMS.productCode ||
    purchase.productVersion !==
      SUBMISSION_SEE_COMMERCIAL_TERMS.productVersion ||
    purchase.scopeKey !== submissionSeeScopeKey(scope) ||
    purchase.amountMinor !==
      SUBMISSION_SEE_COMMERCIAL_TERMS.creditedPayableMinor ||
    purchase.currency !== SUBMISSION_SEE_COMMERCIAL_TERMS.currency
  ) {
    throw new SubmissionSeeCreditError("credit_scope_mismatch");
  }
  if (!statuses.includes(purchase.status)) {
    throw new SubmissionSeeCreditError("invalid_credit_transition");
  }
  return purchase;
};

const assertExactSource = (
  source: Entitlement | null,
  scope: SubmissionSeeScope,
) => {
  if (
    !source ||
    source.userId !== scope.userId ||
    source.projectId !== scope.projectId ||
    source.quickSiteCheckArtefactId !== scope.quickSiteCheckArtefactId ||
    source.proposalFingerprint !== scope.proposalFingerprint ||
    source.productCode !== PLANNING_CONTROLS_PACK_TERMS.productCode ||
    source.productVersion !== PLANNING_CONTROLS_PACK_TERMS.productVersion
  ) {
    throw new SubmissionSeeCreditError("credit_scope_mismatch");
  }
  return source;
};

export class SubmissionSeeCreditPersistenceService {
  constructor(private readonly prisma: LedgerPrisma) {}

  quote(scope: SubmissionSeeScope) {
    return quoteWithClient(this.prisma, scope);
  }

  private async replayReservation(
    client: LedgerClient,
    row: SubmissionSeeCredit,
    scope: SubmissionSeeScope,
  ) {
    assertCreditRecord(row, scope);
    if (row.status === "CONSUMED") return toLedgerEntry(row);
    if (row.status !== "RESERVED") {
      throw new SubmissionSeeCreditError("credit_scope_mismatch");
    }
    const source = assertExactSource(
      await client.entitlement.findUnique({
        where: { id: row.sourceEntitlementId },
      }),
      scope,
    );
    if (source.status !== "ACTIVE") {
      throw new SubmissionSeeCreditError("credit_source_inactive");
    }
    return toLedgerEntry(row);
  }

  async reserve(input: {
    scope: SubmissionSeeScope;
    targetPurchaseId: string;
    now?: Date;
  }): Promise<SubmissionSeeCreditLedgerEntry> {
    const targetPurchaseId = input.targetPurchaseId.trim();
    if (!targetPurchaseId) {
      throw new SubmissionSeeCreditError("credit_scope_mismatch");
    }
    const now = timestamp(input.now);

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const target = assertTargetPurchase(
            await tx.purchase.findUnique({
              where: { id: targetPurchaseId },
            }),
            input.scope,
            ["PENDING"],
          );
          const existing = await tx.submissionSeeCredit.findUnique({
            where: { targetPurchaseId },
          });
          if (existing) {
            return this.replayReservation(tx, existing, input.scope);
          }

          const quote = await quoteWithClient(tx, input.scope);
          if (quote.ineligibilityReason === "credit_reserved") {
            throw new SubmissionSeeCreditError("credit_already_reserved");
          }
          if (quote.ineligibilityReason === "credit_consumed") {
            throw new SubmissionSeeCreditError("credit_already_consumed");
          }
          const draft = reserveSubmissionSeeCredit({
            quote,
            targetPurchaseId: target.id,
            ledgerEntries: [],
            now,
          });
          const created = await tx.submissionSeeCredit.create({
            data: {
              sourceEntitlementId: draft.sourceEntitlementId,
              targetPurchaseId: draft.targetPurchaseId,
              scopeKey: draft.scopeKey,
              idempotencyKey: draft.idempotencyKey,
              listAmountMinor:
                SUBMISSION_SEE_COMMERCIAL_TERMS.listAmountMinor,
              creditAmountMinor: draft.amountMinor,
              payableAmountMinor:
                SUBMISSION_SEE_COMMERCIAL_TERMS.creditedPayableMinor,
              currency: draft.currency,
              status: "RESERVED",
              reservedAt: new Date(draft.reservedAt),
            },
          });
          return toLedgerEntry(created);
        },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;

      const targetReplay = await this.prisma.submissionSeeCredit.findUnique({
        where: { targetPurchaseId },
      });
      if (targetReplay) {
        return this.replayReservation(
          this.prisma,
          targetReplay,
          input.scope,
        );
      }

      const source = await findExactSource(this.prisma, input.scope);
      if (source) {
        const winner = await this.prisma.submissionSeeCredit.findFirst({
          where: {
            sourceEntitlementId: source.id,
            status: { in: ["RESERVED", "CONSUMED"] },
          },
        });
        if (winner?.status === "CONSUMED") {
          throw new SubmissionSeeCreditError("credit_already_consumed");
        }
        if (winner) {
          throw new SubmissionSeeCreditError("credit_already_reserved");
        }
      }
      throw new SubmissionSeeCreditError("invalid_credit_transition");
    }
  }

  async consume(input: {
    scope: SubmissionSeeScope;
    targetPurchaseId: string;
    now?: Date;
  }): Promise<SubmissionSeeCreditLedgerEntry> {
    const now = timestamp(input.now);
    return this.prisma.$transaction(
      async (tx) => {
        const row = await tx.submissionSeeCredit.findUnique({
          where: { targetPurchaseId: input.targetPurchaseId },
        });
        if (!row) {
          throw new SubmissionSeeCreditError("credit_not_eligible");
        }
        assertCreditRecord(row, input.scope);
        if (row.status === "CONSUMED") return toLedgerEntry(row);

        assertTargetPurchase(
          await tx.purchase.findUnique({
            where: { id: input.targetPurchaseId },
          }),
          input.scope,
          ["PAID"],
        );
        const source = assertExactSource(
          await tx.entitlement.findUnique({
            where: { id: row.sourceEntitlementId },
          }),
          input.scope,
        );
        const consumed = consumeSubmissionSeeCredit({
          entry: toLedgerEntry(row),
          targetPurchaseId: input.targetPurchaseId,
          sourceEntitlementStatus: source.status,
          now,
        });
        const transition = await tx.submissionSeeCredit.updateMany({
          where: { id: row.id, status: "RESERVED" },
          data: {
            status: "CONSUMED",
            consumedAt: new Date(consumed.consumedAt!),
          },
        });
        const latest = await tx.submissionSeeCredit.findUnique({
          where: { id: row.id },
        });
        if (
          transition.count === 0 ||
          !latest ||
          latest.status !== "CONSUMED"
        ) {
          throw new SubmissionSeeCreditError("invalid_credit_transition");
        }
        return toLedgerEntry(latest);
      },
      { isolationLevel: "Serializable" },
    );
  }

  async release(input: {
    scope: SubmissionSeeScope;
    targetPurchaseId: string;
    now?: Date;
  }): Promise<SubmissionSeeCreditLedgerEntry> {
    const now = timestamp(input.now);
    return this.prisma.$transaction(
      async (tx) => {
        const row = await tx.submissionSeeCredit.findUnique({
          where: { targetPurchaseId: input.targetPurchaseId },
        });
        if (!row) {
          throw new SubmissionSeeCreditError("credit_not_eligible");
        }
        assertCreditRecord(row, input.scope);
        if (row.status === "RELEASED") return toLedgerEntry(row);

        assertTargetPurchase(
          await tx.purchase.findUnique({
            where: { id: input.targetPurchaseId },
          }),
          input.scope,
          ["FAILED", "CANCELLED"],
        );
        const released = releaseSubmissionSeeCredit({
          entry: toLedgerEntry(row),
          targetPurchaseId: input.targetPurchaseId,
          now,
        });
        const transition = await tx.submissionSeeCredit.updateMany({
          where: { id: row.id, status: "RESERVED" },
          data: {
            status: "RELEASED",
            releasedAt: new Date(released.releasedAt!),
          },
        });
        const latest = await tx.submissionSeeCredit.findUnique({
          where: { id: row.id },
        });
        if (
          transition.count === 0 ||
          !latest ||
          latest.status !== "RELEASED"
        ) {
          throw new SubmissionSeeCreditError("invalid_credit_transition");
        }
        return toLedgerEntry(latest);
      },
      { isolationLevel: "Serializable" },
    );
  }
}
