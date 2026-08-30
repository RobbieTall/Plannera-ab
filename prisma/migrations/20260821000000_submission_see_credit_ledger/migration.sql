-- Item 74F persistent, exact-scope, single-use submission SEE credit ledger.
-- Repository artifact only until a protected Preview migration is separately approved.
CREATE TYPE "SubmissionSeeCreditStatus" AS ENUM ('RESERVED', 'CONSUMED', 'RELEASED');

CREATE TABLE "SubmissionSeeCredit" (
    "id" TEXT NOT NULL,
    "sourceEntitlementId" TEXT NOT NULL,
    "targetPurchaseId" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "listAmountMinor" INTEGER NOT NULL,
    "creditAmountMinor" INTEGER NOT NULL,
    "payableAmountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "SubmissionSeeCreditStatus" NOT NULL DEFAULT 'RESERVED',
    "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SubmissionSeeCredit_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SubmissionSeeCredit_amounts_check"
      CHECK (
        "listAmountMinor" = 74900
        AND "creditAmountMinor" = 4900
        AND "payableAmountMinor" = 70000
        AND "currency" = 'AUD'
      ),
    CONSTRAINT "SubmissionSeeCredit_terminal_timestamps_check"
      CHECK (
        ("status" = 'RESERVED' AND "consumedAt" IS NULL AND "releasedAt" IS NULL)
        OR ("status" = 'CONSUMED' AND "consumedAt" IS NOT NULL AND "releasedAt" IS NULL)
        OR ("status" = 'RELEASED' AND "consumedAt" IS NULL AND "releasedAt" IS NOT NULL)
      )
);

CREATE UNIQUE INDEX "SubmissionSeeCredit_targetPurchaseId_key"
  ON "SubmissionSeeCredit"("targetPurchaseId");
CREATE UNIQUE INDEX "SubmissionSeeCredit_idempotencyKey_key"
  ON "SubmissionSeeCredit"("idempotencyKey");
CREATE UNIQUE INDEX "SubmissionSeeCredit_sourceEntitlement_active_key"
  ON "SubmissionSeeCredit"("sourceEntitlementId")
  WHERE "status" IN ('RESERVED', 'CONSUMED');
CREATE INDEX "SubmissionSeeCredit_sourceEntitlementId_status_idx"
  ON "SubmissionSeeCredit"("sourceEntitlementId", "status");
CREATE INDEX "SubmissionSeeCredit_scopeKey_status_idx"
  ON "SubmissionSeeCredit"("scopeKey", "status");

ALTER TABLE "SubmissionSeeCredit"
  ADD CONSTRAINT "SubmissionSeeCredit_sourceEntitlementId_fkey"
  FOREIGN KEY ("sourceEntitlementId") REFERENCES "Entitlement"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SubmissionSeeCredit"
  ADD CONSTRAINT "SubmissionSeeCredit_targetPurchaseId_fkey"
  FOREIGN KEY ("targetPurchaseId") REFERENCES "Purchase"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
