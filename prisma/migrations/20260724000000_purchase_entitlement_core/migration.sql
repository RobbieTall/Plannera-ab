-- Provider-neutral purchase and exact-scope entitlement foundation.
CREATE TYPE "PurchaseStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED');
CREATE TYPE "EntitlementStatus" AS ENUM ('ACTIVE', 'REFUNDED', 'REVOKED');

CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "quickSiteCheckArtefactId" TEXT NOT NULL,
    "proposalFingerprint" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "productVersion" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "providerName" TEXT,
    "providerReference" TEXT,
    "providerIntentReference" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Entitlement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "quickSiteCheckArtefactId" TEXT NOT NULL,
    "proposalFingerprint" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "productVersion" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "status" "EntitlementStatus" NOT NULL DEFAULT 'ACTIVE',
    "activeScopeKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refundedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "Entitlement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Purchase_idempotencyKey_key" ON "Purchase"("idempotencyKey");
CREATE INDEX "Purchase_scopeKey_status_idx" ON "Purchase"("scopeKey", "status");
CREATE INDEX "Purchase_userId_projectId_idx" ON "Purchase"("userId", "projectId");
CREATE INDEX "Purchase_providerName_providerReference_idx" ON "Purchase"("providerName", "providerReference");
CREATE UNIQUE INDEX "Entitlement_purchaseId_key" ON "Entitlement"("purchaseId");
CREATE UNIQUE INDEX "Entitlement_activeScopeKey_key" ON "Entitlement"("activeScopeKey");
CREATE INDEX "Entitlement_projectId_quickSiteCheckArtefactId_proposalFingerprint_productCode_productVersion_status_idx" ON "Entitlement"("projectId", "quickSiteCheckArtefactId", "proposalFingerprint", "productCode", "productVersion", "status");
CREATE INDEX "Entitlement_userId_projectId_idx" ON "Entitlement"("userId", "projectId");

ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_quickSiteCheckArtefactId_fkey" FOREIGN KEY ("quickSiteCheckArtefactId") REFERENCES "Artefact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_quickSiteCheckArtefactId_fkey" FOREIGN KEY ("quickSiteCheckArtefactId") REFERENCES "Artefact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
