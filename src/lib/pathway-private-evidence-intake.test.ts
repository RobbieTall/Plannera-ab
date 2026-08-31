import { describe, expect, it, vi } from "vitest";

import {
  intakePathwayPrivateEvidence,
  PATHWAY_PRIVATE_EVIDENCE_INTAKE_VERSION,
  type PathwayPrivateEvidenceIntakeDependencies,
  type PathwayPrivateEvidenceIntakeInput,
} from "./pathway-private-evidence-intake";

const OBJECT_REF = "ev_1234567890abcdef";

const validInput = (): PathwayPrivateEvidenceIntakeInput => ({
  version: PATHWAY_PRIVATE_EVIDENCE_INTAKE_VERSION,
  environment: "preview",
  featureEnabled: true,
  auth: {
    authEnabled: true,
    sessionUserRef: "user_opaque_74h",
    projectOwnerRef: "user_opaque_74h",
  },
  storage: {
    access: "private",
    sdkVersion: "2.3.0",
    host: "store-74h.private.blob.vercel-storage.com",
    signedAccessTtlSeconds: 300,
  },
  document: {
    role: "REGISTERED_CADASTRAL_PLAN",
    mimeType: "application/pdf",
    bytes: new Uint8Array([1, 2, 3, 4]),
  },
});

const dependencies = (): PathwayPrivateEvidenceIntakeDependencies => ({
  createObjectRef: () => OBJECT_REF,
  putQuarantined: vi.fn(async () => ({
    access: "private",
    sdkVersion: "2.3.0",
    host: "store-74h.private.blob.vercel-storage.com",
    objectRef: OBJECT_REF,
  })),
  enqueueSecurityScan: vi.fn(async () => undefined),
  deleteQuarantined: vi.fn(async () => undefined),
});

describe("Item 74H private evidence intake", () => {
  it("stores an authorized file only in quarantine and queues scanning", async () => {
    const deps = dependencies();

    const result = await intakePathwayPrivateEvidence(validInput(), deps);

    expect(result).toMatchObject({
      status: "QUARANTINED",
      quarantineRequired: true,
      blockers: expect.arrayContaining([
        "SECURITY_SCAN_REQUIRED",
        "EVIDENCE_REVIEW_REQUIRED",
      ]),
      redactedSummary: {
        role: "REGISTERED_CADASTRAL_PLAN",
        authenticatedProjectScopeConfirmed: true,
        privateStorageConfirmed: true,
        contentIntegrityConfirmed: true,
        securityScanStatus: "PENDING",
        evidenceReviewStatus: "NOT_STARTED",
        containsRawSiteIdentifiers: false,
        returnsDirectObjectUrl: false,
        paidEligibilityUnlocked: false,
        productionCheckoutEnabled: false,
      },
    });
    expect(deps.putQuarantined).toHaveBeenCalledOnce();
    expect(deps.enqueueSecurityScan).toHaveBeenCalledOnce();
    expect(deps.deleteQuarantined).not.toHaveBeenCalled();

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(OBJECT_REF);
    expect(serialized).not.toContain("user_opaque");
    expect(serialized).not.toContain("blob.vercel-storage.com");
    expect(serialized).not.toContain("https://");
  });

  it("denies Production before any storage action", async () => {
    const input = validInput();
    input.environment = "production";
    const deps = dependencies();

    const result = await intakePathwayPrivateEvidence(input, deps);

    expect(result.status).toBe("DENIED");
    expect(result.blockers).toContain("PREVIEW_ONLY");
    expect(deps.putQuarantined).not.toHaveBeenCalled();
    expect(deps.enqueueSecurityScan).not.toHaveBeenCalled();
  });

  it("denies a project-owner mismatch before any storage action", async () => {
    const input = validInput();
    input.auth.sessionUserRef = "user_opaque_other";
    const deps = dependencies();

    const result = await intakePathwayPrivateEvidence(input, deps);

    expect(result.status).toBe("DENIED");
    expect(result.blockers).toContain("PROJECT_SCOPE_MISMATCH");
    expect(deps.putQuarantined).not.toHaveBeenCalled();
  });

  it("rejects unsupported raw metadata instead of silently accepting it", async () => {
    const input = validInput() as PathwayPrivateEvidenceIntakeInput & {
      fileName?: string;
    };
    input.fileName = "survey-with-private-address.pdf";
    const deps = dependencies();

    const result = await intakePathwayPrivateEvidence(input, deps);

    expect(result.status).toBe("DENIED");
    expect(result.blockers).toContain("UNSUPPORTED_FIELD");
    expect(deps.putQuarantined).not.toHaveBeenCalled();
  });

  it("deletes an object when the storage adapter returns an unsafe result", async () => {
    const deps = dependencies();
    deps.putQuarantined = vi.fn(async () => ({
      access: "public",
      sdkVersion: "2.0.0",
      host: "store-74h.public.blob.vercel-storage.com",
      objectRef: OBJECT_REF,
    }));

    const result = await intakePathwayPrivateEvidence(validInput(), deps);

    expect(result.status).toBe("DENIED");
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "PRIVATE_STORAGE_REQUIRED",
        "PRIVATE_BLOB_SDK_TOO_OLD",
        "PRIVATE_BLOB_HOST_REQUIRED",
      ]),
    );
    expect(deps.deleteQuarantined).toHaveBeenCalledWith({
      objectRef: OBJECT_REF,
    });
    expect(deps.enqueueSecurityScan).not.toHaveBeenCalled();
  });

  it("deletes the quarantined object if scan enqueueing fails", async () => {
    const deps = dependencies();
    deps.enqueueSecurityScan = vi.fn(async () => {
      throw new Error("scanner unavailable");
    });

    const result = await intakePathwayPrivateEvidence(validInput(), deps);

    expect(result.status).toBe("DENIED");
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "QUARANTINE_SETUP_FAILED",
        "SECURITY_SCAN_REQUIRED",
      ]),
    );
    expect(deps.deleteQuarantined).toHaveBeenCalledWith({
      objectRef: OBJECT_REF,
    });
    expect(JSON.stringify(result)).not.toContain("scanner unavailable");
  });

  it("keeps the intake disabled until protected Preview activation", async () => {
    const input = validInput();
    input.featureEnabled = false;
    const deps = dependencies();

    const result = await intakePathwayPrivateEvidence(input, deps);

    expect(result.status).toBe("DENIED");
    expect(result.blockers).toContain("FEATURE_DISABLED");
    expect(result.redactedSummary.paidEligibilityUnlocked).toBe(false);
    expect(deps.putQuarantined).not.toHaveBeenCalled();
  });
});
