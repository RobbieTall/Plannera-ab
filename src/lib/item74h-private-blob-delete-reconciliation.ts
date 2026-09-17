export type PrivateBlobDeletionReconciliationDependencies = {
  deleteTarget: (target: string) => Promise<void>;
  countExactObjects: () => Promise<number>;
};

export type PrivateBlobDeletionReconciliationInput = {
  primaryTarget: string;
  fallbackTarget: string;
};

export const deletePrivateBlobWithReconciliation = async (
  input: PrivateBlobDeletionReconciliationInput,
  deps: PrivateBlobDeletionReconciliationDependencies,
): Promise<void> => {
  const targets = [...new Set([input.primaryTarget, input.fallbackTarget])];
  let lastDeletionError: unknown;

  for (const target of targets) {
    try {
      await deps.deleteTarget(target);
      return;
    } catch (error) {
      lastDeletionError = error;
    }

    try {
      if ((await deps.countExactObjects()) === 0) return;
    } catch {
      // Continue to the fallback target. The caller's final residue check
      // remains authoritative if deletion later succeeds.
    }
  }

  try {
    if ((await deps.countExactObjects()) === 0) return;
  } catch {
    // Preserve the provider deletion failure without exposing provider details.
  }

  throw lastDeletionError ?? new Error("Private Blob deletion failed closed");
};
