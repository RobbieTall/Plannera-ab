export const LGA_PREPARATION_SERVICE_BUSINESS_DAYS = 2 as const;

export type LgaPreparationCommercialResolution =
  | "IN_PROGRESS"
  | "OVERDUE_REVIEW_REQUIRED"
  | "DELIVERED"
  | "DELIVERED_WITH_UNRESOLVED_CONTROLS"
  | "REFUND_REVIEW_REQUIRED"
  | "REFUND_PENDING_PROVIDER_CONFIRMATION"
  | "REFUNDED";

export type LgaPreparationResolutionInput = {
  preparationStatus: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  requestedAt: Date;
  evaluatedAt: Date;
  promisedPackPersisted: boolean;
  promisedPackHasUnresolvedControls: boolean;
  refundRequested: boolean;
  providerRefundConfirmed: boolean;
};

export type LgaPreparationResolutionResult = {
  serviceTargetAt: Date;
  targetOverdue: boolean;
  resolution: LgaPreparationCommercialResolution;
  customerMessage:
    | "Local controls preparation is in progress."
    | "Local controls preparation needs operator review."
    | "Your Planning Controls Pack has been prepared."
    | "Your Planning Controls Pack is available with unresolved controls identified for expert review."
    | "The promised Planning Controls Pack was not delivered. Refund review is required."
    | "A refund has been requested and is awaiting payment-provider confirmation."
    | "The refund has been confirmed by the payment provider.";
  refundComplete: boolean;
};

const isValidDate = (date: Date) =>
  date instanceof Date && Number.isFinite(date.getTime());

export function addWeekdayBusinessDays(
  start: Date,
  businessDays: number,
): Date {
  if (!isValidDate(start)) {
    throw new Error("A valid service-start date is required");
  }
  if (!Number.isInteger(businessDays) || businessDays < 0) {
    throw new Error("Business days must be a non-negative integer");
  }

  const result = new Date(start.getTime());
  let remaining = businessDays;

  while (remaining > 0) {
    result.setUTCDate(result.getUTCDate() + 1);
    const day = result.getUTCDay();
    if (day !== 0 && day !== 6) {
      remaining -= 1;
    }
  }

  return result;
}

export const getLgaPreparationServiceTarget = (requestedAt: Date) =>
  addWeekdayBusinessDays(
    requestedAt,
    LGA_PREPARATION_SERVICE_BUSINESS_DAYS,
  );

export function resolveLgaPreparationCommercialOutcome(
  input: LgaPreparationResolutionInput,
): LgaPreparationResolutionResult {
  if (!isValidDate(input.requestedAt) || !isValidDate(input.evaluatedAt)) {
    throw new Error("Valid preparation timestamps are required");
  }
  if (input.evaluatedAt.getTime() < input.requestedAt.getTime()) {
    throw new Error("Evaluation cannot precede the preparation request");
  }
  if (
    input.providerRefundConfirmed &&
    !input.refundRequested
  ) {
    throw new Error(
      "Provider refund confirmation cannot exist without a refund request",
    );
  }

  const serviceTargetAt = getLgaPreparationServiceTarget(input.requestedAt);
  const targetOverdue =
    input.evaluatedAt.getTime() > serviceTargetAt.getTime() &&
    input.preparationStatus !== "COMPLETED";

  if (input.promisedPackPersisted) {
    if (input.promisedPackHasUnresolvedControls) {
      return {
        serviceTargetAt,
        targetOverdue: false,
        resolution: "DELIVERED_WITH_UNRESOLVED_CONTROLS",
        customerMessage:
          "Your Planning Controls Pack is available with unresolved controls identified for expert review.",
        refundComplete: false,
      };
    }
    return {
      serviceTargetAt,
      targetOverdue: false,
      resolution: "DELIVERED",
      customerMessage: "Your Planning Controls Pack has been prepared.",
      refundComplete: false,
    };
  }

  if (input.providerRefundConfirmed) {
    return {
      serviceTargetAt,
      targetOverdue,
      resolution: "REFUNDED",
      customerMessage:
        "The refund has been confirmed by the payment provider.",
      refundComplete: true,
    };
  }

  if (input.refundRequested) {
    return {
      serviceTargetAt,
      targetOverdue,
      resolution: "REFUND_PENDING_PROVIDER_CONFIRMATION",
      customerMessage:
        "A refund has been requested and is awaiting payment-provider confirmation.",
      refundComplete: false,
    };
  }

  if (input.preparationStatus === "FAILED") {
    return {
      serviceTargetAt,
      targetOverdue,
      resolution: "REFUND_REVIEW_REQUIRED",
      customerMessage:
        "The promised Planning Controls Pack was not delivered. Refund review is required.",
      refundComplete: false,
    };
  }

  if (targetOverdue) {
    return {
      serviceTargetAt,
      targetOverdue: true,
      resolution: "OVERDUE_REVIEW_REQUIRED",
      customerMessage: "Local controls preparation needs operator review.",
      refundComplete: false,
    };
  }

  return {
    serviceTargetAt,
    targetOverdue: false,
    resolution: "IN_PROGRESS",
    customerMessage: "Local controls preparation is in progress.",
    refundComplete: false,
  };
}
