import { describe, expect, it } from "vitest";

import {
  SUBMISSION_SEE_COMMERCIAL_TERMS,
  SubmissionSeeCreditError,
  buildSubmissionSeeScope,
  consumeSubmissionSeeCredit,
  quoteSubmissionSeeCredit,
  releaseSubmissionSeeCredit,
  reserveSubmissionSeeCredit,
  type PlanningPackCreditSource,
  type SubmissionSeeCreditLedgerEntry,
} from "./submission-see-credit";

const NOW = "2026-08-21T01:00:00.000Z";
const LATER = "2026-08-21T01:01:00.000Z";

const scope = () =>
  buildSubmissionSeeScope({
    userId: "user-1",
    projectId: "project-1",
    quickSiteCheckArtefactId: "qsc-1",
    proposalBrief:
      "Two storey dwelling with attached garage and landscape works",
  });

const source = (
  changes: Partial<PlanningPackCreditSource> = {},
): PlanningPackCreditSource => ({
  ...scope(),
  entitlementId: "pack-entitlement-1",
  productCode: "planning_controls_pack",
  productVersion: "v1",
  status: "ACTIVE",
  ...changes,
});

const quote = (
  changes: {
    source?: PlanningPackCreditSource | null;
    ledgerEntries?: SubmissionSeeCreditLedgerEntry[];
  } = {},
) =>
  quoteSubmissionSeeCredit({
    scope: scope(),
    planningPackEntitlement:
      changes.source === undefined ? source() : changes.source,
    ledgerEntries: changes.ledgerEntries ?? [],
  });

describe("submission SEE exact-scope credit", () => {
  it("derives only the approved A$749, A$49 and A$700 terms", () => {
    expect(SUBMISSION_SEE_COMMERCIAL_TERMS).toEqual({
      productCode: "submission_see",
      productVersion: "v1",
      listAmountMinor: 74_900,
      planningPackCreditMinor: 4_900,
      creditedPayableMinor: 70_000,
      currency: "AUD",
    });
    expect(quote()).toMatchObject({
      listAmountMinor: 74_900,
      creditAmountMinor: 4_900,
      payableAmountMinor: 70_000,
      creditEligible: true,
      creditSourceEntitlementId: "pack-entitlement-1",
      ineligibilityReason: null,
    });
  });

  it("normalises the proposal into a fingerprint and retains no raw proposal", () => {
    const first = buildSubmissionSeeScope({
      userId: "user-1",
      projectId: "project-1",
      quickSiteCheckArtefactId: "qsc-1",
      proposalBrief: "  TWO storey dwelling\nwith garage  ",
    });
    const second = buildSubmissionSeeScope({
      userId: "user-1",
      projectId: "project-1",
      quickSiteCheckArtefactId: "qsc-1",
      proposalBrief: "two storey dwelling with garage",
    });
    expect(first).toEqual(second);
    expect(first.proposalFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(first)).not.toContain("dwelling");
  });

  it.each([
    ["no source", null, "no_active_planning_pack"],
    [
      "other requester",
      source({ userId: "user-2" }),
      "planning_pack_scope_mismatch",
    ],
    [
      "other project",
      source({ projectId: "project-2" }),
      "planning_pack_scope_mismatch",
    ],
    [
      "other site check",
      source({ quickSiteCheckArtefactId: "qsc-2" }),
      "planning_pack_scope_mismatch",
    ],
    [
      "other proposal",
      source({
        proposalFingerprint: buildSubmissionSeeScope({
          userId: "user-1",
          projectId: "project-1",
          quickSiteCheckArtefactId: "qsc-1",
          proposalBrief: "Materially changed proposal",
        }).proposalFingerprint,
      }),
      "planning_pack_scope_mismatch",
    ],
    [
      "wrong product",
      source({ productCode: "other_product" }),
      "planning_pack_product_mismatch",
    ],
    [
      "wrong version",
      source({ productVersion: "v2" }),
      "planning_pack_product_mismatch",
    ],
    [
      "refunded",
      source({ status: "REFUNDED" }),
      "planning_pack_inactive",
    ],
    [
      "revoked",
      source({ status: "REVOKED" }),
      "planning_pack_inactive",
    ],
  ])(
    "fails closed at full price for %s",
    (_label, pack, reason) => {
      expect(
        quoteSubmissionSeeCredit({
          scope: scope(),
          planningPackEntitlement:
            pack as PlanningPackCreditSource | null,
          ledgerEntries: [],
        }),
      ).toMatchObject({
        creditEligible: false,
        creditAmountMinor: 0,
        payableAmountMinor: 74_900,
        creditSourceEntitlementId: null,
        ineligibilityReason: reason,
      });
    },
  );

  it("reserves once and replays the same target purchase idempotently", () => {
    const first = reserveSubmissionSeeCredit({
      quote: quote(),
      targetPurchaseId: "see-purchase-1",
      ledgerEntries: [],
      now: NOW,
    });
    const replay = reserveSubmissionSeeCredit({
      quote: quote(),
      targetPurchaseId: "see-purchase-1",
      ledgerEntries: [first],
      now: LATER,
    });
    expect(replay).toEqual(first);
    expect(first).toMatchObject({
      sourceEntitlementId: "pack-entitlement-1",
      targetPurchaseId: "see-purchase-1",
      amountMinor: 4_900,
      currency: "AUD",
      status: "RESERVED",
      reservedAt: NOW,
      consumedAt: null,
      releasedAt: null,
    });
    expect(first.idempotencyKey).toMatch(/^[a-f0-9]{64}$/);
  });

  it("blocks a second target while the same credit is reserved", () => {
    const first = reserveSubmissionSeeCredit({
      quote: quote(),
      targetPurchaseId: "see-purchase-1",
      ledgerEntries: [],
      now: NOW,
    });
    const secondQuote = quote({ ledgerEntries: [first] });
    expect(secondQuote).toMatchObject({
      creditEligible: false,
      ineligibilityReason: "credit_reserved",
    });
    expect(() =>
      reserveSubmissionSeeCredit({
        quote: quote(),
        targetPurchaseId: "see-purchase-2",
        ledgerEntries: [first],
        now: LATER,
      }),
    ).toThrowError(
      expect.objectContaining<Partial<SubmissionSeeCreditError>>({
        code: "credit_already_reserved",
      }),
    );
  });

  it("consumes only against the same purchase and an active source", () => {
    const reserved = reserveSubmissionSeeCredit({
      quote: quote(),
      targetPurchaseId: "see-purchase-1",
      ledgerEntries: [],
      now: NOW,
    });
    expect(() =>
      consumeSubmissionSeeCredit({
        entry: reserved,
        targetPurchaseId: "see-purchase-2",
        sourceEntitlementStatus: "ACTIVE",
        now: LATER,
      }),
    ).toThrowError(
      expect.objectContaining<Partial<SubmissionSeeCreditError>>({
        code: "credit_scope_mismatch",
      }),
    );
    for (const status of ["REFUNDED", "REVOKED"] as const) {
      expect(() =>
        consumeSubmissionSeeCredit({
          entry: reserved,
          targetPurchaseId: "see-purchase-1",
          sourceEntitlementStatus: status,
          now: LATER,
        }),
      ).toThrowError(
        expect.objectContaining<Partial<SubmissionSeeCreditError>>({
          code: "credit_source_inactive",
        }),
      );
    }
    const consumed = consumeSubmissionSeeCredit({
      entry: reserved,
      targetPurchaseId: "see-purchase-1",
      sourceEntitlementStatus: "ACTIVE",
      now: LATER,
    });
    expect(consumed).toMatchObject({
      status: "CONSUMED",
      consumedAt: LATER,
      releasedAt: null,
    });
    expect(
      consumeSubmissionSeeCredit({
        entry: consumed,
        targetPurchaseId: "see-purchase-1",
        sourceEntitlementStatus: "ACTIVE",
        now: "2026-08-21T01:02:00.000Z",
      }),
    ).toEqual(consumed);
    expect(quote({ ledgerEntries: [consumed] })).toMatchObject({
      creditEligible: false,
      ineligibilityReason: "credit_consumed",
    });
  });

  it("releases an unpaid reservation for later reuse but never releases a consumed credit", () => {
    const reserved = reserveSubmissionSeeCredit({
      quote: quote(),
      targetPurchaseId: "see-purchase-1",
      ledgerEntries: [],
      now: NOW,
    });
    const released = releaseSubmissionSeeCredit({
      entry: reserved,
      targetPurchaseId: "see-purchase-1",
      now: LATER,
    });
    expect(released).toMatchObject({
      status: "RELEASED",
      releasedAt: LATER,
      consumedAt: null,
    });
    expect(quote({ ledgerEntries: [released] }).creditEligible).toBe(true);

    const reused = reserveSubmissionSeeCredit({
      quote: quote({ ledgerEntries: [released] }),
      targetPurchaseId: "see-purchase-2",
      ledgerEntries: [released],
      now: "2026-08-21T01:02:00.000Z",
    });
    const consumed = consumeSubmissionSeeCredit({
      entry: reused,
      targetPurchaseId: "see-purchase-2",
      sourceEntitlementStatus: "ACTIVE",
      now: "2026-08-21T01:03:00.000Z",
    });
    expect(() =>
      releaseSubmissionSeeCredit({
        entry: consumed,
        targetPurchaseId: "see-purchase-2",
        now: "2026-08-21T01:04:00.000Z",
      }),
    ).toThrowError(
      expect.objectContaining<Partial<SubmissionSeeCreditError>>({
        code: "credit_release_denied",
      }),
    );
  });
});
