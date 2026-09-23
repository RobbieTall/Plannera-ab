import { describe, expect, it } from "vitest";

import {
  addWeekdayBusinessDays,
  getLgaPreparationServiceTarget,
  resolveLgaPreparationCommercialOutcome,
} from "./lga-preparation-service";

describe("LGA preparation service contract", () => {
  it("calculates the 2-business-day target across a weekend", () => {
    const requestedAt = new Date("2026-09-25T03:00:00.000Z"); // Friday
    expect(getLgaPreparationServiceTarget(requestedAt).toISOString()).toBe(
      "2026-09-29T03:00:00.000Z",
    );
  });

  it("uses Australia/Sydney weekdays when UTC is still on the prior day", () => {
    const saturdaySydney = new Date("2026-09-25T15:30:00.000Z");

    expect(addWeekdayBusinessDays(saturdaySydney, 2).toISOString()).toBe(
      "2026-09-28T15:30:00.000Z",
    );
  });

  it("keeps weekday arithmetic deterministic", () => {
    const monday = new Date("2026-09-21T03:00:00.000Z");
    expect(addWeekdayBusinessDays(monday, 0).toISOString()).toBe(monday.toISOString());
    expect(addWeekdayBusinessDays(monday, 2).toISOString()).toBe("2026-09-23T03:00:00.000Z");
  });

  it("flags an overdue preparation for operator review without inventing a refund", () => {
    const result = resolveLgaPreparationCommercialOutcome({
      preparationStatus: "PROCESSING",
      requestedAt: new Date("2026-09-21T00:00:00.000Z"),
      evaluatedAt: new Date("2026-09-24T00:00:01.000Z"),
      promisedPackPersisted: false,
      promisedPackHasUnresolvedControls: false,
      refundRequested: false,
      providerRefundConfirmed: false,
    });

    expect(result.resolution).toBe("OVERDUE_REVIEW_REQUIRED");
    expect(result.targetOverdue).toBe(true);
    expect(result.refundComplete).toBe(false);
  });

  it("requires refund review when preparation failed and no promised pack exists", () => {
    const result = resolveLgaPreparationCommercialOutcome({
      preparationStatus: "FAILED",
      requestedAt: new Date("2026-09-21T00:00:00.000Z"),
      evaluatedAt: new Date("2026-09-22T00:00:00.000Z"),
      promisedPackPersisted: false,
      promisedPackHasUnresolvedControls: false,
      refundRequested: false,
      providerRefundConfirmed: false,
    });

    expect(result.resolution).toBe("REFUND_REVIEW_REQUIRED");
    expect(result.refundComplete).toBe(false);
  });

  it("treats a persisted pack with unresolved topics as delivered value, not an automatic refund", () => {
    const result = resolveLgaPreparationCommercialOutcome({
      preparationStatus: "COMPLETED",
      requestedAt: new Date("2026-09-21T00:00:00.000Z"),
      evaluatedAt: new Date("2026-09-22T00:00:00.000Z"),
      promisedPackPersisted: true,
      promisedPackHasUnresolvedControls: true,
      refundRequested: false,
      providerRefundConfirmed: false,
    });

    expect(result.resolution).toBe("DELIVERED_WITH_UNRESOLVED_CONTROLS");
    expect(result.refundComplete).toBe(false);
  });

  it("never labels a refund complete until provider confirmation exists", () => {
    const pending = resolveLgaPreparationCommercialOutcome({
      preparationStatus: "FAILED",
      requestedAt: new Date("2026-09-21T00:00:00.000Z"),
      evaluatedAt: new Date("2026-09-24T00:00:00.000Z"),
      promisedPackPersisted: false,
      promisedPackHasUnresolvedControls: false,
      refundRequested: true,
      providerRefundConfirmed: false,
    });
    expect(pending.resolution).toBe("REFUND_PENDING_PROVIDER_CONFIRMATION");
    expect(pending.refundComplete).toBe(false);

    const confirmed = resolveLgaPreparationCommercialOutcome({
      preparationStatus: "FAILED",
      requestedAt: new Date("2026-09-21T00:00:00.000Z"),
      evaluatedAt: new Date("2026-09-24T00:00:00.000Z"),
      promisedPackPersisted: false,
      promisedPackHasUnresolvedControls: false,
      refundRequested: true,
      providerRefundConfirmed: true,
    });
    expect(confirmed.resolution).toBe("REFUNDED");
    expect(confirmed.refundComplete).toBe(true);
  });
});
