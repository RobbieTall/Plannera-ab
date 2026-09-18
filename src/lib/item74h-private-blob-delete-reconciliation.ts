export type PrivateBlobDeletionReconciliationDependencies = {
  deleteTarget: (target: string) => Promise<void>;
  countExactObjects: () => Promise<number>;
  wait?: (delayMs: number) => Promise<void>;
};

export type PrivateBlobDeletionReconciliationInput = {
  primaryTarget: string;
  fallbackTarget: string;
  verificationDelaysMs?: readonly number[];
  fallbackAfterVerificationCount?: number;
};

export const PRIVATE_BLOB_DELETION_VERIFICATION_DELAYS_MS = [
  0,
  250,
  750,
  2_000,
  4_000,
  8_000,
  15_000,
  30_000,
  30_000,
  30_000,
  30_000,
  30_000,
  30_000,
  30_000,
  30_000,
  30_000,
] as const;

export const PRIVATE_BLOB_FALLBACK_AFTER_VERIFICATION_COUNT = 3;

const wait = (delayMs: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, delayMs));

export const deletePrivateBlobWithReconciliation = async (
  input: PrivateBlobDeletionReconciliationInput,
  deps: PrivateBlobDeletionReconciliationDependencies,
): Promise<void> => {
  const targets = [...new Set([input.primaryTarget, input.fallbackTarget])];
  const verificationDelaysMs =
    input.verificationDelaysMs ??
    PRIVATE_BLOB_DELETION_VERIFICATION_DELAYS_MS;
  const fallbackAfterVerificationCount =
    input.fallbackAfterVerificationCount ??
    PRIVATE_BLOB_FALLBACK_AFTER_VERIFICATION_COUNT;

  if (
    verificationDelaysMs.length < 2 ||
    fallbackAfterVerificationCount < 1 ||
    fallbackAfterVerificationCount >= verificationDelaysMs.length
  ) {
    throw new Error("Private Blob deletion verification policy is invalid");
  }

  const waitFor = deps.wait ?? wait;
  let lastDeletionError: unknown;
  let lastInspectionError: unknown;
  let fallbackAttempted = targets.length === 1;

  const attemptDelete = async (target: string) => {
    try {
      await deps.deleteTarget(target);
    } catch (error) {
      lastDeletionError = error;
    }
  };

  await attemptDelete(targets[0]);

  for (const [index, delayMs] of verificationDelaysMs.entries()) {
    if (delayMs > 0) await waitFor(delayMs);

    try {
      if ((await deps.countExactObjects()) === 0) return;
    } catch (error) {
      lastInspectionError = error;
    }

    if (
      !fallbackAttempted &&
      index + 1 === fallbackAfterVerificationCount
    ) {
      fallbackAttempted = true;
      await attemptDelete(targets[1]);
    }
  }

  throw (
    lastDeletionError ??
    lastInspectionError ??
    new Error("Private Blob deletion left a residual object")
  );
};
