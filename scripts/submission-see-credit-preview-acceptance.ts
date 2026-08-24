import { randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";

import { PLANNING_CONTROLS_PACK_TERMS } from "../src/lib/planning-pack-commerce";
import {
  SUBMISSION_SEE_COMMERCIAL_TERMS,
  buildSubmissionSeeScope,
  submissionSeeScopeKey,
  type SubmissionSeeScope,
} from "../src/lib/submission-see-credit";
import { SubmissionSeeCreditPersistenceService } from "../src/lib/submission-see-credit-persistence";

const RUNNER_VERSION = "submission_see_credit_preview_acceptance.v1";
const ENABLE_FLAG = "SUBMISSION_SEE_CREDIT_ACCEPTANCE_ENABLED";
const EXPECTED_GIT_REF = "agent/item74f-see-credit";
const EXPECTED_NEON_ENDPOINT_PREFIX = "ep-winter-fog-a76nvixu";

const assert = (condition: unknown, reason: string): asserts condition => {
  if (!condition) throw new Error(reason);
};

const enabled = process.env[ENABLE_FLAG] === "true";

if (!enabled) {
  process.stdout.write(
    `${JSON.stringify({
      runnerVersion: RUNNER_VERSION,
      phase: "disabled",
      passed: true,
      reason: "acceptance_disabled",
    })}\n`,
  );
} else {
  const runId = randomUUID().replaceAll("-", "").slice(0, 16);
  const prefix = `item74g-${runId}`;
  const userId = `${prefix}-user`;
  const propertyId = `${prefix}-property`;
  const projectId = `${prefix}-project`;
  const qscId = `${prefix}-qsc`;
  const sourcePurchaseIds = [
    `${prefix}-pack-a`,
    `${prefix}-pack-b`,
  ];
  const sourceEntitlementIds = [
    `${prefix}-ent-a`,
    `${prefix}-ent-b`,
  ];
  const targetPurchaseIds = [
    `${prefix}-see-a1`,
    `${prefix}-see-a2`,
    `${prefix}-see-b1`,
    `${prefix}-see-b2`,
  ];
  const allPurchaseIds = [...sourcePurchaseIds, ...targetPurchaseIds];
  const prisma = new PrismaClient();
  let fixturesStarted = false;
  let cleanupComplete = false;
  const checks = {
    environmentGuard: false,
    exactQuote: false,
    concurrentSingleWinner: false,
    reservationReplay: false,
    persistentSingleRow: false,
    changedScopeDenied: false,
    consumptionReplay: false,
    consumedReuseDenied: false,
    releaseReplay: false,
    releasedReuse: false,
    terminalRowsExact: false,
    cleanup: false,
  };

  const createSource = async (
    label: "a" | "b",
    scope: SubmissionSeeScope,
    purchaseId: string,
    entitlementId: string,
  ) => {
    await prisma.purchase.create({
      data: {
        id: purchaseId,
        userId,
        projectId,
        quickSiteCheckArtefactId: qscId,
        proposalFingerprint: scope.proposalFingerprint,
        productCode: PLANNING_CONTROLS_PACK_TERMS.productCode,
        productVersion: PLANNING_CONTROLS_PACK_TERMS.productVersion,
        amountMinor: 4900,
        currency: "AUD",
        status: "PAID",
        idempotencyKey: `${prefix}:source:${label}`,
        scopeKey: `${prefix}:source-scope:${label}`,
        paidAt: new Date(),
      },
    });
    await prisma.entitlement.create({
      data: {
        id: entitlementId,
        userId,
        projectId,
        quickSiteCheckArtefactId: qscId,
        proposalFingerprint: scope.proposalFingerprint,
        productCode: PLANNING_CONTROLS_PACK_TERMS.productCode,
        productVersion: PLANNING_CONTROLS_PACK_TERMS.productVersion,
        purchaseId,
        status: "ACTIVE",
      },
    });
  };

  const createTarget = async (
    label: string,
    scope: SubmissionSeeScope,
    purchaseId: string,
  ) =>
    prisma.purchase.create({
      data: {
        id: purchaseId,
        userId,
        projectId,
        quickSiteCheckArtefactId: qscId,
        proposalFingerprint: scope.proposalFingerprint,
        productCode: SUBMISSION_SEE_COMMERCIAL_TERMS.productCode,
        productVersion: SUBMISSION_SEE_COMMERCIAL_TERMS.productVersion,
        amountMinor: SUBMISSION_SEE_COMMERCIAL_TERMS.creditedPayableMinor,
        currency: SUBMISSION_SEE_COMMERCIAL_TERMS.currency,
        status: "PENDING",
        idempotencyKey: `${prefix}:target:${label}`,
        scopeKey: submissionSeeScopeKey(scope),
      },
    });

  const expectDenied = async (operation: () => Promise<unknown>) => {
    try {
      await operation();
      return false;
    } catch {
      return true;
    }
  };

  try {
    assert(process.env.VERCEL === "1", "hosted_environment_required");
    assert(process.env.VERCEL_ENV === "preview", "preview_environment_required");
    assert(
      process.env.VERCEL_GIT_COMMIT_REF === EXPECTED_GIT_REF,
      "preview_git_ref_mismatch",
    );
    assert(
      process.env.PLANNING_PACK_CHECKOUT_ENABLED !== "true",
      "production_checkout_must_remain_disabled",
    );
    assert(
      process.env.SUBMISSION_SEE_CHECKOUT_ENABLED !== "true",
      "submission_see_checkout_must_remain_disabled",
    );
    const databaseUrl = process.env.DATABASE_URL;
    assert(databaseUrl, "database_url_missing");
    const databaseHost = new URL(databaseUrl).hostname;
    assert(
      databaseHost.startsWith(EXPECTED_NEON_ENDPOINT_PREFIX),
      "preview_database_endpoint_mismatch",
    );
    checks.environmentGuard = true;

    const scopeA = buildSubmissionSeeScope({
      userId,
      projectId,
      quickSiteCheckArtefactId: qscId,
      proposalBrief: "Synthetic Item 74G acceptance proposal A",
    });
    const scopeB = buildSubmissionSeeScope({
      userId,
      projectId,
      quickSiteCheckArtefactId: qscId,
      proposalBrief: "Synthetic Item 74G acceptance proposal B",
    });

    fixturesStarted = true;
    await prisma.user.create({
      data: {
        id: userId,
        name: "Item 74G Acceptance",
        email: `${prefix}@acceptance.invalid`,
      },
    });
    await prisma.property.create({
      data: { id: propertyId, name: "Item 74G synthetic property" },
    });
    await prisma.project.create({
      data: {
        id: projectId,
        name: "Item 74G synthetic project",
        title: "Item 74G synthetic project",
        isDemo: true,
        propertyId,
        createdById: userId,
        userId,
      },
    });
    await prisma.artefact.create({
      data: {
        id: qscId,
        projectId,
        createdById: userId,
        type: "quick_site_check",
        title: "Item 74G synthetic Quick Site Check",
        source: "item74g_preview_acceptance",
        payload: { synthetic: true, acceptanceVersion: RUNNER_VERSION },
      },
    });

    await createSource("a", scopeA, sourcePurchaseIds[0], sourceEntitlementIds[0]);
    await createSource("b", scopeB, sourcePurchaseIds[1], sourceEntitlementIds[1]);
    await createTarget("a1", scopeA, targetPurchaseIds[0]);
    await createTarget("a2", scopeA, targetPurchaseIds[1]);
    await createTarget("b1", scopeB, targetPurchaseIds[2]);
    await createTarget("b2", scopeB, targetPurchaseIds[3]);

    const service = new SubmissionSeeCreditPersistenceService(prisma);
    const quoteA = await service.quote(scopeA);
    assert(
      quoteA.creditEligible &&
        quoteA.listAmountMinor === 74900 &&
        quoteA.creditAmountMinor === 4900 &&
        quoteA.payableAmountMinor === 70000 &&
        quoteA.currency === "AUD",
      "exact_quote_failed",
    );
    checks.exactQuote = true;

    const race = await Promise.allSettled([
      service.reserve({ scope: scopeA, targetPurchaseId: targetPurchaseIds[0] }),
      service.reserve({ scope: scopeA, targetPurchaseId: targetPurchaseIds[1] }),
    ]);
    const winners = race.filter(
      (result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof service.reserve>>> =>
        result.status === "fulfilled",
    );
    assert(winners.length === 1, "concurrent_single_winner_failed");
    checks.concurrentSingleWinner = true;
    const winner = winners[0].value;
    const loserTargetId =
      winner.targetPurchaseId === targetPurchaseIds[0]
        ? targetPurchaseIds[1]
        : targetPurchaseIds[0];

    const reservationReplay = await service.reserve({
      scope: scopeA,
      targetPurchaseId: winner.targetPurchaseId,
    });
    assert(
      reservationReplay.idempotencyKey === winner.idempotencyKey &&
        reservationReplay.targetPurchaseId === winner.targetPurchaseId,
      "reservation_replay_failed",
    );
    checks.reservationReplay = true;

    const sourceARows = await prisma.submissionSeeCredit.count({
      where: { sourceEntitlementId: sourceEntitlementIds[0] },
    });
    assert(sourceARows === 1, "persistent_single_row_failed");
    checks.persistentSingleRow = true;

    const changedQuote = await service.quote(
      buildSubmissionSeeScope({
        userId,
        projectId,
        quickSiteCheckArtefactId: qscId,
        proposalBrief: "Synthetic changed-scope denial",
      }),
    );
    assert(!changedQuote.creditEligible, "changed_scope_denial_failed");
    checks.changedScopeDenied = true;

    await prisma.purchase.update({
      where: { id: winner.targetPurchaseId },
      data: { status: "PAID", paidAt: new Date() },
    });
    const consumed = await service.consume({
      scope: scopeA,
      targetPurchaseId: winner.targetPurchaseId,
    });
    const consumedReplay = await service.consume({
      scope: scopeA,
      targetPurchaseId: winner.targetPurchaseId,
    });
    assert(
      consumed.status === "CONSUMED" &&
        consumedReplay.idempotencyKey === consumed.idempotencyKey,
      "consumption_replay_failed",
    );
    checks.consumptionReplay = true;
    assert(
      await expectDenied(() =>
        service.reserve({ scope: scopeA, targetPurchaseId: loserTargetId }),
      ),
      "consumed_reuse_denial_failed",
    );
    checks.consumedReuseDenied = true;

    const reservedB1 = await service.reserve({
      scope: scopeB,
      targetPurchaseId: targetPurchaseIds[2],
    });
    await prisma.purchase.update({
      where: { id: targetPurchaseIds[2] },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    const releasedB1 = await service.release({
      scope: scopeB,
      targetPurchaseId: targetPurchaseIds[2],
    });
    const releasedReplay = await service.release({
      scope: scopeB,
      targetPurchaseId: targetPurchaseIds[2],
    });
    assert(
      reservedB1.status === "RESERVED" &&
        releasedB1.status === "RELEASED" &&
        releasedReplay.idempotencyKey === releasedB1.idempotencyKey,
      "release_replay_failed",
    );
    checks.releaseReplay = true;

    const reservedB2 = await service.reserve({
      scope: scopeB,
      targetPurchaseId: targetPurchaseIds[3],
    });
    assert(
      reservedB2.status === "RESERVED" &&
        reservedB2.targetPurchaseId === targetPurchaseIds[3],
      "released_reuse_failed",
    );
    checks.releasedReuse = true;
    await prisma.purchase.update({
      where: { id: targetPurchaseIds[3] },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    await service.release({
      scope: scopeB,
      targetPurchaseId: targetPurchaseIds[3],
    });

    const terminalRows = await prisma.submissionSeeCredit.findMany({
      where: { targetPurchaseId: { in: targetPurchaseIds } },
      select: {
        status: true,
        listAmountMinor: true,
        creditAmountMinor: true,
        payableAmountMinor: true,
        currency: true,
      },
    });
    assert(
      terminalRows.length === 3 &&
        terminalRows.filter((row) => row.status === "CONSUMED").length === 1 &&
        terminalRows.filter((row) => row.status === "RELEASED").length === 2 &&
        terminalRows.every(
          (row) =>
            row.listAmountMinor === 74900 &&
            row.creditAmountMinor === 4900 &&
            row.payableAmountMinor === 70000 &&
            row.currency === "AUD",
        ),
      "terminal_rows_failed",
    );
    checks.terminalRowsExact = true;
  } catch {
    process.exitCode = 1;
  } finally {
    try {
      if (fixturesStarted) {
        await prisma.submissionSeeCredit.deleteMany({
          where: { targetPurchaseId: { in: targetPurchaseIds } },
        });
        await prisma.entitlement.deleteMany({
          where: { id: { in: sourceEntitlementIds } },
        });
        await prisma.purchase.deleteMany({
          where: { id: { in: allPurchaseIds } },
        });
        await prisma.artefact.deleteMany({ where: { id: qscId } });
        await prisma.project.deleteMany({ where: { id: projectId } });
        await prisma.property.deleteMany({ where: { id: propertyId } });
        await prisma.user.deleteMany({ where: { id: userId } });
      }
      cleanupComplete = true;
      checks.cleanup = true;
    } catch {
      process.exitCode = 1;
    } finally {
      await prisma.$disconnect();
    }

    const passed =
      process.exitCode !== 1 &&
      cleanupComplete &&
      Object.values(checks).every(Boolean);
    if (!passed) process.exitCode = 1;
    process.stdout.write(
      `${JSON.stringify({
        runnerVersion: RUNNER_VERSION,
        phase: "preview_lifecycle",
        passed,
        checks,
        syntheticFixtureCount: 2,
        creditRowsBeforeCleanup: checks.terminalRowsExact ? 3 : null,
        cleanupComplete,
        reason: passed ? null : "preview_acceptance_failed",
      })}\n`,
    );
  }
}
