import { describe, expect, it } from "vitest";

import {
  runPathwayPrivateBlobAcceptance,
  type PathwayPrivateBlobAcceptanceDependencies,
} from "./pathway-private-evidence-blob-acceptance";

describe("Item 74H private Blob acceptance coordinator", () => {
  it("creates once, reuses on replay, stays quarantined and leaves zero residue", async () => {
    const objects = new Map<string, Uint8Array>();
    let writes = 0;
    let sandboxStops = 0;
    const deps: PathwayPrivateBlobAcceptanceDependencies = {
      putOrReuse: async ({ objectRef, bytes }) => {
        if (objects.has(objectRef)) return { created: false };
        objects.set(objectRef, bytes);
        writes += 1;
        return { created: true };
      },
      countObjects: async ({ objectRef }) =>
        objects.has(objectRef) ? 1 : 0,
      assertUnauthenticatedReadDenied: async () => true,
      readAuthenticated: async ({ objectRef }) => objects.get(objectRef)!,
      runIsolatedHashCheck: async () => {
        sandboxStops += 1;
        return { hashMatch: true, networkDenied: true, stopped: true };
      },
      deleteObject: async ({ objectRef }) => {
        objects.delete(objectRef);
      },
    };

    const report = await runPathwayPrivateBlobAcceptance(
      {
        objectRef: "ev_1234567890abcdef1234567890abcdef",
        bytes: new TextEncoder().encode('{"synthetic":true}'),
      },
      deps,
    );

    expect(writes).toBe(1);
    expect(sandboxStops).toBe(1);
    expect(report).toMatchObject({
      syntheticOnly: true,
      privateWriteCount: 1,
      replayReusedObject: true,
      quarantineStatus: "QUARANTINED",
      securityScanStatus: "NOT_EXECUTED",
      evidenceReviewStatus: "PENDING",
      paidEligibilityUnlocked: false,
      productionCheckoutEnabled: false,
      residualObjectCount: 0,
      containsSecret: false,
      containsObjectReference: false,
      containsDirectObjectUrl: false,
    });
  });

  it("attempts cleanup when a protected assertion fails", async () => {
    const objects = new Map<string, Uint8Array>();
    let deletes = 0;
    const deps: PathwayPrivateBlobAcceptanceDependencies = {
      putOrReuse: async ({ objectRef, bytes }) => {
        objects.set(objectRef, bytes);
        return { created: true };
      },
      countObjects: async ({ objectRef }) =>
        objects.has(objectRef) ? 1 : 0,
      assertUnauthenticatedReadDenied: async () => false,
      readAuthenticated: async () => new Uint8Array(),
      runIsolatedHashCheck: async () => ({
        hashMatch: false,
        networkDenied: false,
        stopped: false,
      }),
      deleteObject: async ({ objectRef }) => {
        deletes += 1;
        objects.delete(objectRef);
      },
    };

    await expect(
      runPathwayPrivateBlobAcceptance(
        {
          objectRef: "ev_abcdef1234567890abcdef1234567890",
          bytes: new TextEncoder().encode('{"synthetic":true}'),
        },
        deps,
      ),
    ).rejects.toThrow("unauthenticated direct read was not denied");
    expect(deletes).toBe(1);
    expect(objects.size).toBe(0);
  });
});
