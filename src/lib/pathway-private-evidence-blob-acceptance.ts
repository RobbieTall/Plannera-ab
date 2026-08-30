import { createHash } from "node:crypto";

export const PATHWAY_PRIVATE_BLOB_ACCEPTANCE_VERSION =
  "item74h-private-blob-acceptance.v1" as const;

export type PathwayPrivateBlobAcceptanceDependencies = {
  putOrReuse: (input: {
    objectRef: string;
    bytes: Uint8Array;
    contentHash: string;
  }) => Promise<{ created: boolean }>;
  countObjects: (input: { objectRef: string }) => Promise<number>;
  assertUnauthenticatedReadDenied: (input: {
    objectRef: string;
  }) => Promise<boolean>;
  readAuthenticated: (input: {
    objectRef: string;
  }) => Promise<Uint8Array>;
  runIsolatedHashCheck: (input: {
    bytes: Uint8Array;
    contentHash: string;
  }) => Promise<{
    hashMatch: boolean;
    networkDenied: boolean;
    stopped: boolean;
  }>;
  deleteObject: (input: { objectRef: string }) => Promise<void>;
};

export type PathwayPrivateBlobAcceptanceReport = {
  version: typeof PATHWAY_PRIVATE_BLOB_ACCEPTANCE_VERSION;
  environment: "preview";
  syntheticOnly: true;
  privateWriteCount: 1;
  replayReusedObject: true;
  authenticatedHashMatch: true;
  unauthenticatedReadDenied: true;
  sandboxHashMatch: true;
  sandboxNetworkDenied: true;
  sandboxStopped: true;
  quarantineStatus: "QUARANTINED";
  securityScanStatus: "NOT_EXECUTED";
  evidenceReviewStatus: "PENDING";
  paidEligibilityUnlocked: false;
  productionCheckoutEnabled: false;
  residualObjectCount: 0;
  containsSecret: false;
  containsObjectReference: false;
  containsDirectObjectUrl: false;
};

const fail = (message: string): never => {
  throw new Error(`Item 74H private Blob acceptance failed: ${message}`);
};

export const runPathwayPrivateBlobAcceptance = async (
  input: { objectRef: string; bytes: Uint8Array },
  deps: PathwayPrivateBlobAcceptanceDependencies,
): Promise<PathwayPrivateBlobAcceptanceReport> => {
  const contentHash = createHash("sha256").update(input.bytes).digest("hex");
  let cleanupAttempted = false;

  try {
    const first = await deps.putOrReuse({
      objectRef: input.objectRef,
      bytes: input.bytes,
      contentHash,
    });
    if (!first.created) fail("first write did not create exactly one object");
    if ((await deps.countObjects({ objectRef: input.objectRef })) !== 1) {
      fail("first write did not reconcile to exactly one object");
    }

    const replay = await deps.putOrReuse({
      objectRef: input.objectRef,
      bytes: input.bytes,
      contentHash,
    });
    if (replay.created) fail("replay created a second object");
    if ((await deps.countObjects({ objectRef: input.objectRef })) !== 1) {
      fail("replay did not reconcile to the original object");
    }

    if (
      !(await deps.assertUnauthenticatedReadDenied({
        objectRef: input.objectRef,
      }))
    ) {
      fail("unauthenticated direct read was not denied");
    }

    const authenticatedBytes = await deps.readAuthenticated({
      objectRef: input.objectRef,
    });
    const authenticatedHash = createHash("sha256")
      .update(authenticatedBytes)
      .digest("hex");
    if (authenticatedHash !== contentHash) {
      fail("authenticated read hash differed from the synthetic input");
    }

    const sandbox = await deps.runIsolatedHashCheck({
      bytes: authenticatedBytes,
      contentHash,
    });
    if (!sandbox.hashMatch) fail("Sandbox hash check failed");
    if (!sandbox.networkDenied) fail("Sandbox egress was not denied");
    if (!sandbox.stopped) fail("Sandbox was not stopped");

    await deps.deleteObject({ objectRef: input.objectRef });
    cleanupAttempted = true;
    const residualObjectCount = await deps.countObjects({
      objectRef: input.objectRef,
    });
    if (residualObjectCount !== 0) fail("cleanup left a residual object");

    return {
      version: PATHWAY_PRIVATE_BLOB_ACCEPTANCE_VERSION,
      environment: "preview",
      syntheticOnly: true,
      privateWriteCount: 1,
      replayReusedObject: true,
      authenticatedHashMatch: true,
      unauthenticatedReadDenied: true,
      sandboxHashMatch: true,
      sandboxNetworkDenied: true,
      sandboxStopped: true,
      quarantineStatus: "QUARANTINED",
      securityScanStatus: "NOT_EXECUTED",
      evidenceReviewStatus: "PENDING",
      paidEligibilityUnlocked: false,
      productionCheckoutEnabled: false,
      residualObjectCount: 0,
      containsSecret: false,
      containsObjectReference: false,
      containsDirectObjectUrl: false,
    };
  } finally {
    if (!cleanupAttempted) {
      await deps.deleteObject({ objectRef: input.objectRef }).catch(() => {});
    }
  }
};
