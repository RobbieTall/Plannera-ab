import assert from "node:assert/strict";
import test from "node:test";

import {
  PurchaseEntitlementService,
  fingerprintPurchaseProposal,
  normalizePurchaseProposal,
} from "../src/lib/purchase-entitlements";
import { createPlanningPackCheckout } from "../src/lib/planning-pack-checkout";

const terms = {
  productCode: "dcp_deep_dive_fixture",
  productVersion: "test-v1",
  amountMinor: 2900,
  currency: "AUD",
};

const qscPayload = (overrides: any = {}) => ({
  projectId: "project-1",
  generatedAt: "2026-07-24T00:00:00.000Z",
  site: {
    address: "45 Broken Head Road, Byron Bay NSW",
    lga: "Byron Shire",
    zoneCode: "SP3",
    zoneName: "Tourist",
    zoneLabel: "SP3 - Tourist",
  },
  controls: {
    heightOfBuilding: {
      label: "Height",
      value: "9m",
      present: true,
      interpretation: "Cited",
    },
    floorSpaceRatio: {
      label: "FSR",
      value: null,
      present: false,
      interpretation: "Unavailable",
    },
    minimumLotSize: {
      label: "MLS",
      value: null,
      present: false,
      interpretation: "Unavailable",
    },
  },
  notes: [],
  nextSteps: [],
  lepEvidenceSummary: {
    label: "Cited",
    detail: "DB-backed",
    citedControlCount: 1,
    totalControlCount: 3,
    landUseEntryCount: 1,
    objectiveCount: 1,
    sourceRef: "Byron LEP",
  },
  ...overrides,
});

const matchesWhere = (row: any, where: any) =>
  Object.entries(where).every(([key, value]: any) =>
    value && typeof value === "object" && "in" in value
      ? value.in.includes(row[key])
      : (value === null ? row[key] == null : row[key] === value),
  );

const createDb = (opts: any = {}) => {
  const state: any = { purchases: [], entitlements: [] };
  const project = opts.project ?? {
    id: "project-1",
    publicId: "proj-public-1",
    userId: "user-1",
    zoning: "SP3 - Tourist",
    zoningCode: "SP3",
    siteContext: {
      formattedAddress: "45 Broken Head Road, Byron Bay NSW",
      lgaName: "Byron Shire",
      lgaCode: "BYRON",
      zone: "SP3 - Tourist",
    },
  };
  const artefacts = opts.artefacts ?? [
    {
      id: "qsc-1",
      projectId: "project-1",
      type: "quick_site_check",
      title: "QSC",
      payload: qscPayload(),
      capturedAt: new Date(),
      createdAt: new Date(),
    },
  ];

  const purchaseApi = {
    findFirst: async ({ where }: any) =>
      state.purchases.find((purchase: any) =>
        matchesWhere(purchase, where),
      ) ?? null,
    findUnique: async ({ where }: any) =>
      state.purchases.find((purchase: any) =>
        matchesWhere(purchase, where),
      ) ?? null,
    count: async ({ where }: any) =>
      state.purchases.filter((purchase: any) =>
        matchesWhere(purchase, where),
      ).length,
    create: async ({ data }: any) => {
      const row = {
        id: `purchase-${state.purchases.length + 1}`,
        status: "PENDING",
        createdAt: new Date(),
        updatedAt: new Date(),
        providerPayload: undefined,
        metadata: undefined,
        providerName: null,
        providerReference: null,
        providerIntentReference: null,
        ...data,
      };
      state.purchases.push(row);
      return row;
    },
    update: async ({ where, data }: any) => {
      const row = state.purchases.find((purchase: any) =>
        matchesWhere(purchase, where),
      );
      Object.assign(row, data, { updatedAt: new Date() });
      return row;
    },
    updateMany: async ({ where, data }: any) => {
      let count = 0;
      for (const purchase of state.purchases) {
        if (!matchesWhere(purchase, where)) continue;
        Object.assign(purchase, data, { updatedAt: new Date() });
        count += 1;
      }
      return { count };
    },
  };

  const entitlementApi = {
    findFirst: async ({ where }: any) =>
      state.entitlements.find((entitlement: any) =>
        matchesWhere(entitlement, where),
      ) ?? null,
    findUnique: async ({ where }: any) =>
      state.entitlements.find((entitlement: any) =>
        matchesWhere(entitlement, where),
      ) ?? null,
    upsert: async ({ where, create, update }: any) => {
      let row = state.entitlements.find(
        (entitlement: any) =>
          entitlement.purchaseId === where.purchaseId,
      );
      if (row) {
        Object.assign(row, update, { updatedAt: new Date() });
      } else {
        row = {
          id: `entitlement-${state.entitlements.length + 1}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...create,
        };
        state.entitlements.push(row);
      }
      return row;
    },
    updateMany: async ({ where, data }: any) => {
      let count = 0;
      for (const entitlement of state.entitlements) {
        if (!matchesWhere(entitlement, where)) continue;
        Object.assign(entitlement, data, { updatedAt: new Date() });
        count += 1;
      }
      return { count };
    },
    update: async ({ where, data }: any) => {
      const row = state.entitlements.find((entitlement: any) =>
        matchesWhere(entitlement, where),
      );
      Object.assign(row, data, { updatedAt: new Date() });
      return row;
    },
  };

  return {
    state,
    db: {
      project: {
        findFirst: async ({ where }: any) => {
          const identityFilters =
            where.AND?.find((condition: any) => Array.isArray(condition.OR))
              ?.OR ?? [{ id: where.id }];
          const ownerId =
            where.AND?.find((condition: any) => "userId" in condition)
              ?.userId ?? where.userId;
          return project &&
            identityFilters.some(
              (identity: any) =>
                identity.id === project.id ||
                identity.publicId === project.publicId,
            ) &&
            project.userId === ownerId
            ? project
            : null;
        },
      },
      artefact: { findMany: async () => artefacts },
      purchase: purchaseApi,
      entitlement: entitlementApi,
      $transaction: async (fn: any) =>
        fn({ purchase: purchaseApi, entitlement: entitlementApi }),
    } as any,
  };
};

test("proposal normalization and fingerprint are stable while changed proposals mismatch", () => {
  assert.equal(
    normalizePurchaseProposal(
      "  Tourist   Accommodation\nAlterations ",
    ),
    "tourist accommodation alterations",
  );
  assert.equal(
    fingerprintPurchaseProposal(
      "Tourist accommodation alterations",
    ),
    fingerprintPurchaseProposal(
      " tourist   accommodation alterations ",
    ),
  );
  assert.notEqual(
    fingerprintPurchaseProposal(
      "Tourist accommodation alterations",
    ),
    fingerprintPurchaseProposal("Neighbourhood shop fitout"),
  );
});

test("commercial fields are server-owned and forged client fields are ignored", async () => {
  const { db, state } = createDb();
  const service = new PurchaseEntitlementService(db, terms);
  const purchase = await service.createOrReusePendingIntent({
    userId: "user-1",
    projectId: "project-1",
    proposalBrief: "Tourist accommodation",
    amountMinor: 1,
    currency: "USD",
    productCode: "forged",
    providerPayload: { secret: true },
  } as any);
  assert.equal(purchase.amountMinor, 2900);
  assert.equal(purchase.currency, "AUD");
  assert.equal(purchase.productCode, terms.productCode);
  assert.equal(state.purchases[0].providerPayload, undefined);
});

test("public project IDs resolve to the canonical paid scope", async () => {
  const { db } = createDb();
  const purchase = await new PurchaseEntitlementService(
    db,
    terms,
  ).createOrReusePendingIntent({
    userId: "user-1",
    projectId: "proj-public-1",
    proposalBrief: "Tourist accommodation",
  });

  assert.equal(purchase.projectId, "project-1");
  assert.equal(purchase.quickSiteCheckArtefactId, "qsc-1");
});

test("ownership, current-site, cited QSC, non-empty proposal and launch LGA are required", async () => {
  await assert.rejects(
    () =>
      new PurchaseEntitlementService(
        createDb().db,
        terms,
      ).createOrReusePendingIntent({
        userId: "other",
        projectId: "project-1",
        proposalBrief: "x",
      }),
    /Project not found/,
  );
  await assert.rejects(
    () =>
      new PurchaseEntitlementService(
        createDb({
          project: {
            id: "project-1",
            userId: "user-1",
            siteContext: null,
          },
        }).db,
        terms,
      ).createOrReusePendingIntent({
        userId: "user-1",
        projectId: "project-1",
        proposalBrief: "x",
      }),
    /confirmed site/,
  );
  await assert.rejects(
    () =>
      new PurchaseEntitlementService(
        createDb({
          artefacts: [
            {
              id: "qsc-1",
              payload: qscPayload({
                lepEvidenceSummary: {
                  label: "Unavailable",
                  detail: "x",
                  citedControlCount: 0,
                  totalControlCount: 3,
                  landUseEntryCount: 0,
                  objectiveCount: 0,
                  sourceRef: "",
                },
              }),
            },
          ],
        }).db,
        terms,
      ).createOrReusePendingIntent({
        userId: "user-1",
        projectId: "project-1",
        proposalBrief: "x",
      }),
    /cited LEP/,
  );
  await assert.rejects(
    () =>
      new PurchaseEntitlementService(
        createDb().db,
        terms,
      ).createOrReusePendingIntent({
        userId: "user-1",
        projectId: "project-1",
        proposalBrief: "  ",
      }),
    /proposed-works/,
  );
  await assert.rejects(
    () =>
      new PurchaseEntitlementService(
        createDb({
          project: {
            id: "project-1",
            userId: "user-1",
            zoningCode: "R2",
            siteContext: {
              formattedAddress: "1 George St",
              lgaName: "Sydney",
              lgaCode: "SYDNEY",
              zone: "R2",
            },
          },
          artefacts: [
            {
              id: "qsc-1",
              payload: qscPayload({
                site: {
                  address: "1 George St",
                  lga: "Sydney",
                  zoneCode: "R2",
                  zoneLabel: "R2",
                },
              }),
            },
          ],
        }).db,
        terms,
      ).createOrReusePendingIntent({
        userId: "user-1",
        projectId: "project-1",
        proposalBrief: "x",
      }),
    /Byron and Kempsey/,
  );
});

test("pending intent and paid settlement are idempotent with exact active entitlement", async () => {
  const { db, state } = createDb();
  const service = new PurchaseEntitlementService(db, terms);
  const first = await service.createOrReusePendingIntent({
    userId: "user-1",
    projectId: "project-1",
    proposalBrief: "Tourist accommodation",
  });
  const replay = await service.createOrReusePendingIntent({
    userId: "user-1",
    projectId: "project-1",
    proposalBrief: " tourist accommodation ",
  });
  assert.equal(first.id, replay.id);
  await service.settlePaidPurchase(first.id);
  await service.settlePaidPurchase(first.id);
  assert.equal(state.entitlements.length, 1);
  assert.ok(
    await service.findActiveEntitlement({
      userId: "user-1",
      projectId: "project-1",
      quickSiteCheckArtefactId: "qsc-1",
      proposalBrief: "Tourist accommodation",
    }),
  );
});

test("cross-scope and inactive entitlement lookups fail closed", async () => {
  const { db } = createDb();
  const service = new PurchaseEntitlementService(db, terms);
  const purchase = await service.createOrReusePendingIntent({
    userId: "user-1",
    projectId: "project-1",
    proposalBrief: "Tourist accommodation",
  });
  await service.settlePaidPurchase(purchase.id);

  for (const params of [
    {
      userId: "user-2",
      projectId: "project-1",
      quickSiteCheckArtefactId: "qsc-1",
      proposalBrief: "Tourist accommodation",
    },
    {
      userId: "user-1",
      projectId: "project-2",
      quickSiteCheckArtefactId: "qsc-1",
      proposalBrief: "Tourist accommodation",
    },
    {
      userId: "user-1",
      projectId: "project-1",
      quickSiteCheckArtefactId: "qsc-2",
      proposalBrief: "Tourist accommodation",
    },
    {
      userId: "user-1",
      projectId: "project-1",
      quickSiteCheckArtefactId: "qsc-1",
      proposalBrief: "Changed proposal",
    },
    {
      userId: "user-1",
      projectId: "project-1",
      quickSiteCheckArtefactId: "qsc-1",
      proposalBrief: "Tourist accommodation",
      productCode: "other",
    },
    {
      userId: "user-1",
      projectId: "project-1",
      quickSiteCheckArtefactId: "qsc-1",
      proposalBrief: "Tourist accommodation",
      productVersion: "v2",
    },
  ]) {
    assert.equal(
      await service.findActiveEntitlement(params),
      null,
    );
  }

  await service.refundPurchase(purchase.id);
  assert.equal(
    await service.findActiveEntitlement({
      userId: "user-1",
      projectId: "project-1",
      quickSiteCheckArtefactId: "qsc-1",
      proposalBrief: "Tourist accommodation",
    }),
    null,
  );
  const repurchase = await service.createOrReusePendingIntent({
    userId: "user-1",
    projectId: "project-1",
    proposalBrief: "Tourist accommodation",
  });
  assert.notEqual(repurchase.id, purchase.id);
});

test("no raw proposal, private site fields or provider payload metadata are persisted", async () => {
  const { db, state } = createDb();
  await new PurchaseEntitlementService(
    db,
    terms,
  ).createOrReusePendingIntent({
    userId: "user-1",
    projectId: "project-1",
    proposalBrief: "Private address clause contact text",
  });
  const persisted = JSON.stringify(state.purchases);
  assert.doesNotMatch(
    persisted,
    /Private address clause contact text|providerPayload|metadata|secret/,
  );
});

test("a replayed settlement cannot reactivate a revoked entitlement", async () => {
  const { db, state } = createDb();
  const service = new PurchaseEntitlementService(db, terms);
  const purchase = await service.createOrReusePendingIntent({
    userId: "user-1",
    projectId: "project-1",
    proposalBrief: "Tourist accommodation",
  });
  const entitlement = await service.settlePaidPurchase(
    purchase.id,
  );
  const revoked = await service.revokeEntitlement(entitlement.id);
  const revokedAt = revoked.revokedAt;

  const replayedRevoke = await service.revokeEntitlement(
    entitlement.id,
  );
  assert.equal(replayedRevoke.revokedAt, revokedAt);
  await assert.rejects(
    () => service.settlePaidPurchase(purchase.id),
    /revoked or refunded/,
  );
  assert.equal(state.entitlements[0].status, "REVOKED");
  assert.equal(state.entitlements[0].activeScopeKey, null);
});

test("a replayed refund is idempotent and settlement remains blocked", async () => {
  const { db, state } = createDb();
  const service = new PurchaseEntitlementService(db, terms);
  const purchase = await service.createOrReusePendingIntent({
    userId: "user-1",
    projectId: "project-1",
    proposalBrief: "Tourist accommodation",
  });
  await service.settlePaidPurchase(purchase.id);
  const refunded = await service.refundPurchase(purchase.id);
  const refundedAt = refunded.refundedAt;

  const replayedRefund = await service.refundPurchase(purchase.id);
  assert.equal(replayedRefund.refundedAt, refundedAt);
  await assert.rejects(
    () => service.settlePaidPurchase(purchase.id),
    /not payable/,
  );
  assert.equal(state.entitlements[0].status, "REFUNDED");
  assert.equal(state.entitlements[0].activeScopeKey, null);
});

test("terminal transitions are idempotent while contradictory transitions fail closed", async () => {
  const { db } = createDb();
  const service = new PurchaseEntitlementService(db, terms);

  const pendingForRefund =
    await service.createOrReusePendingIntent({
      userId: "user-1",
      projectId: "project-1",
      proposalBrief: "First proposal",
    });
  await assert.rejects(
    () => service.refundPurchase(pendingForRefund.id),
    /cannot be refunded/,
  );

  const paid = await service.createOrReusePendingIntent({
    userId: "user-1",
    projectId: "project-1",
    proposalBrief: "Second proposal",
  });
  await service.settlePaidPurchase(paid.id);
  await assert.rejects(
    () => service.markPurchaseFailed(paid.id),
    /cannot be marked failed/,
  );
  await assert.rejects(
    () => service.cancelPurchase(paid.id),
    /cannot be cancelled/,
  );

  const failed = await service.createOrReusePendingIntent({
    userId: "user-1",
    projectId: "project-1",
    proposalBrief: "Third proposal",
  });
  const failedResult = await service.markPurchaseFailed(failed.id);
  const failedAt = failedResult.failedAt;
  const failedReplay = await service.markPurchaseFailed(failed.id);
  assert.equal(failedReplay.failedAt, failedAt);
  await assert.rejects(
    () => service.cancelPurchase(failed.id),
    /cannot be cancelled/,
  );

  const cancelled = await service.createOrReusePendingIntent({
    userId: "user-1",
    projectId: "project-1",
    proposalBrief: "Fourth proposal",
  });
  const cancelledResult = await service.cancelPurchase(
    cancelled.id,
  );
  const cancelledAt = cancelledResult.cancelledAt;
  const cancelledReplay = await service.cancelPurchase(
    cancelled.id,
  );
  assert.equal(cancelledReplay.cancelledAt, cancelledAt);
  await assert.rejects(
    () => service.markPurchaseFailed(cancelled.id),
    /cannot be marked failed/,
  );
});

test("settlement cannot overwrite a concurrent terminal transition", async () => {
  const { db, state } = createDb();
  const service = new PurchaseEntitlementService(db, terms);
  const purchase = await service.createOrReusePendingIntent({
    userId: "user-1",
    projectId: "project-1",
    proposalBrief: "Tourist accommodation",
  });
  const originalUpdateMany = db.purchase.updateMany;
  let terminalTransitionWon = false;

  db.purchase.updateMany = async (args: any) => {
    if (
      !terminalTransitionWon &&
      args.where.id === purchase.id &&
      args.data.status === "PAID"
    ) {
      terminalTransitionWon = true;
      state.purchases[0].status = "CANCELLED";
      state.purchases[0].cancelledAt = new Date();
    }
    return originalUpdateMany(args);
  };

  await assert.rejects(
    () => service.settlePaidPurchase(purchase.id),
    /not payable/,
  );
  assert.equal(state.purchases[0].status, "CANCELLED");
  assert.equal(state.entitlements.length, 0);
});

test("concurrent intent creation returns the winning pending purchase", async () => {
  const { db, state } = createDb();
  const service = new PurchaseEntitlementService(db, terms);
  const originalCreate = db.purchase.create;
  let firstAttempt = true;

  db.purchase.create = async (args: any) => {
    if (firstAttempt) {
      firstAttempt = false;
      await originalCreate({
        data: { ...args.data, id: "purchase-winner" },
      });
      const conflict: any = new Error(
        "Unique constraint failed on idempotencyKey",
      );
      conflict.code = "P2002";
      throw conflict;
    }
    return originalCreate(args);
  };

  const purchase = await service.createOrReusePendingIntent({
    userId: "user-1",
    projectId: "project-1",
    proposalBrief: "Tourist accommodation",
  });
  assert.equal(purchase.id, "purchase-winner");
  assert.equal(state.purchases.length, 1);
});

test("settlement becoming active after pending lookup prevents a second purchase and provider call", async () => {
  const { db, state } = createDb();
  const service = new PurchaseEntitlementService(db, terms);
  const proposalBrief = "Race settlement proposal";
  const scopeKey = [
    "user-1",
    "project-1",
    "qsc-1",
    fingerprintPurchaseProposal(proposalBrief),
    terms.productCode,
    terms.productVersion,
  ].join(":");
  const originalFindFirst = db.purchase.findFirst;
  const originalCreate = db.purchase.create;
  let purchaseCreates = 0;
  let providerCalls = 0;

  db.purchase.findFirst = async (args: any) => {
    const result = await originalFindFirst(args);
    if (args.where.status === "PENDING" && !result) {
      state.entitlements.push({
        id: "entitlement-race-winner",
        activeScopeKey: scopeKey,
        status: "ACTIVE",
      });
    }
    return result;
  };
  db.purchase.create = async (args: any) => {
    purchaseCreates += 1;
    return originalCreate(args);
  };

  await assert.rejects(
    () => createPlanningPackCheckout(service, {
      createHostedCheckout: async () => {
        providerCalls += 1;
        return { id: "cs_duplicate", url: "https://checkout.stripe.test" };
      },
      verifyWebhook: () => { throw new Error("unused"); },
    }, { userId: "user-1", projectId: "project-1", proposalBrief }),
    /already paid/,
  );
  assert.equal(purchaseCreates, 0);
  assert.equal(providerCalls, 0);
});

test("provider references attach atomically, replay identically, and lose to terminal races", async () => {
  const { db, state } = createDb();
  const service = new PurchaseEntitlementService(db, terms);
  const purchase = await service.createOrReusePendingIntent({ userId: "user-1", projectId: "project-1", proposalBrief: "Atomic references" });
  await service.attachProviderCheckout(purchase.id, "cs_1");
  await service.attachProviderCheckout(purchase.id, "cs_1");
  await assert.rejects(() => service.attachProviderCheckout(purchase.id, "cs_other"), /safely/);
  await service.bindProviderPaymentReference(purchase.id, "pi_1");
  await service.bindProviderPaymentReference(purchase.id, "pi_1");
  await assert.rejects(() => service.bindProviderPaymentReference(purchase.id, "pi_other"), /safely/);

  state.purchases[0].status = "CANCELLED";
  await assert.rejects(() => service.attachProviderCheckout(purchase.id, "cs_1"), /safely/);
  await assert.rejects(() => service.bindProviderPaymentReference(purchase.id, "pi_1"), /safely/);

  const raced = await service.createOrReusePendingIntent({ userId: "user-1", projectId: "project-1", proposalBrief: "Checkout race" });
  const originalUpdateMany = db.purchase.updateMany;
  db.purchase.updateMany = async (args: any) => {
    if (args.where.id === raced.id && args.data.providerReference) {
      state.purchases.find((row: any) => row.id === raced.id).status = "FAILED";
    }
    return originalUpdateMany(args);
  };
  await assert.rejects(() => service.attachProviderCheckout(raced.id, "cs_race"), /safely/);
  assert.equal(state.purchases.find((row: any) => row.id === raced.id).providerReference, null);

  db.purchase.updateMany = originalUpdateMany;
  const bindRace = await service.createOrReusePendingIntent({ userId: "user-1", projectId: "project-1", proposalBrief: "Payment reference race" });
  await service.attachProviderCheckout(bindRace.id, "cs_bind_race");
  db.purchase.updateMany = async (args: any) => {
    if (args.where.id === bindRace.id && args.data.providerIntentReference) {
      state.purchases.find((row: any) => row.id === bindRace.id).status = "CANCELLED";
    }
    return originalUpdateMany(args);
  };
  await assert.rejects(() => service.bindProviderPaymentReference(bindRace.id, "pi_race"), /safely/);
  assert.equal(state.purchases.find((row: any) => row.id === bindRace.id).providerIntentReference, null);
});

test("provider-confirmed full refund atomically terminates pending scope and blocks later settlement", async () => {
  const { db, state } = createDb();
  const service = new PurchaseEntitlementService(db, terms);
  const purchase = await service.createOrReusePendingIntent({ userId: "user-1", projectId: "project-1", proposalBrief: "Refund first" });
  await service.attachProviderCheckout(purchase.id, "cs_1");
  await service.providerConfirmedFullRefund(purchase.id, "pi_1");
  await service.providerConfirmedFullRefund(purchase.id, "pi_1");
  assert.equal(state.purchases[0].status, "REFUNDED");
  assert.equal(state.entitlements.length, 0);
  await assert.rejects(() => service.settlePaidPurchase(purchase.id), /not payable/);
  await assert.rejects(() => service.providerConfirmedFullRefund(purchase.id, "pi_other"), /mismatch/);
});
