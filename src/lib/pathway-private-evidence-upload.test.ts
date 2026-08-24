import { describe, expect, it } from "vitest";

import {
  evaluatePathwayPrivateEvidenceUpload,
  PATHWAY_PRIVATE_EVIDENCE_UPLOAD_VERSION,
  type PathwayPrivateEvidenceUploadInput,
} from "./pathway-private-evidence-upload";

const validInput = (): PathwayPrivateEvidenceUploadInput => ({
  version: PATHWAY_PRIVATE_EVIDENCE_UPLOAD_VERSION,
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
    objectRef: "ev_opaque_object_74h",
    signedAccessTtlSeconds: 300,
  },
  document: {
    role: "CADASTRAL_SURVEY",
    contentHash: "a".repeat(64),
    mimeType: "application/pdf",
    fileSizeBytes: 2 * 1024 * 1024,
    securityScanStatus: "CLEAN",
    evidenceReviewStatus: "EVIDENCE_VERIFIED",
  },
});

describe("Item 74H private evidence upload policy", () => {
  it("accepts only a reviewed clean document in an authenticated private Preview scope", () => {
    const result = evaluatePathwayPrivateEvidenceUpload(validInput());

    expect(result).toMatchObject({
      privateUploadAuthorized: true,
      quarantineRequired: false,
      evidenceAccepted: true,
      blockers: [],
      redactedSummary: {
        privateStorageConfirmed: true,
        authenticatedProjectScopeConfirmed: true,
        contentIntegrityConfirmed: true,
        securityScanClean: true,
        evidenceReviewComplete: true,
        containsRawSiteIdentifiers: false,
        returnsDirectObjectUrl: false,
        paidEligibilityUnlocked: false,
        productionCheckoutEnabled: false,
      },
    });
    expect(JSON.stringify(result.redactedSummary)).not.toContain("user_opaque");
    expect(JSON.stringify(result.redactedSummary)).not.toContain("ev_opaque");
  });

  it("authorizes private quarantine while scan or evidence review is pending", () => {
    const input = validInput();
    input.document.securityScanStatus = "PENDING";
    input.document.evidenceReviewStatus = "PENDING";

    const result = evaluatePathwayPrivateEvidenceUpload(input);

    expect(result.privateUploadAuthorized).toBe(true);
    expect(result.quarantineRequired).toBe(true);
    expect(result.evidenceAccepted).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "SECURITY_SCAN_REQUIRED",
        "EVIDENCE_REVIEW_REQUIRED",
      ]),
    );
  });

  it("rejects the repository's current Blob 2.0.0 public-storage configuration", () => {
    const input = validInput();
    input.storage.sdkVersion = "2.0.0";
    input.storage.access = "public";
    input.storage.host = "store-74h.public.blob.vercel-storage.com";

    const result = evaluatePathwayPrivateEvidenceUpload(input);

    expect(result.privateUploadAuthorized).toBe(false);
    expect(result.evidenceAccepted).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "PRIVATE_STORAGE_REQUIRED",
        "PRIVATE_BLOB_SDK_TOO_OLD",
        "PRIVATE_BLOB_HOST_REQUIRED",
      ]),
    );
  });

  it("requires a signed-in user to own the project scope", () => {
    const input = validInput();
    input.auth.sessionUserRef = "user_opaque_other";

    const result = evaluatePathwayPrivateEvidenceUpload(input);

    expect(result.privateUploadAuthorized).toBe(false);
    expect(result.blockers).toContain("PROJECT_SCOPE_MISMATCH");
  });

  it("never authorizes this proof in Production even with otherwise valid inputs", () => {
    const input = validInput();
    input.environment = "production";

    const result = evaluatePathwayPrivateEvidenceUpload(input);

    expect(result.privateUploadAuthorized).toBe(false);
    expect(result.blockers).toContain("PREVIEW_ONLY");
    expect(result.redactedSummary.productionCheckoutEnabled).toBe(false);
  });

  it("rejects oversized, un-hashed or unsupported content", () => {
    const input = validInput();
    input.document.fileSizeBytes = 25 * 1024 * 1024 + 1;
    input.document.contentHash = "not-a-hash";
    (input.document as unknown as { mimeType: string }).mimeType =
      "application/x-msdownload";

    const result = evaluatePathwayPrivateEvidenceUpload(input);

    expect(result.privateUploadAuthorized).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "INVALID_FILE_SIZE",
        "CONTENT_HASH_REQUIRED",
        "UNSUPPORTED_FILE_TYPE",
      ]),
    );
  });

  it("rejects long-lived or malformed delegated access", () => {
    const input = validInput();
    input.storage.signedAccessTtlSeconds = 3600;
    input.storage.objectRef = "private/file-name-and-address.pdf";

    const result = evaluatePathwayPrivateEvidenceUpload(input);

    expect(result.privateUploadAuthorized).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "INVALID_SIGNED_ACCESS_TTL",
        "OPAQUE_OBJECT_REFERENCE_REQUIRED",
      ]),
    );
  });

  it("rejects raw URL, filename or address fields instead of silently ignoring them", () => {
    const input = validInput() as PathwayPrivateEvidenceUploadInput & {
      address?: string;
    };
    input.address = "private site address";
    (input.storage as PathwayPrivateEvidenceUploadInput["storage"] & {
      url?: string;
    }).url = "https://store.private.blob.vercel-storage.com/private.pdf";
    (input.document as PathwayPrivateEvidenceUploadInput["document"] & {
      fileName?: string;
    }).fileName = "survey-with-address.pdf";

    const result = evaluatePathwayPrivateEvidenceUpload(input);

    expect(result.privateUploadAuthorized).toBe(false);
    expect(result.blockers).toContain("UNSUPPORTED_FIELD");
    expect(result.redactedSummary.containsRawSiteIdentifiers).toBe(false);
    expect(result.redactedSummary.returnsDirectObjectUrl).toBe(false);
  });

  it("keeps the feature disabled until the private store is deliberately activated", () => {
    const input = validInput();
    input.featureEnabled = false;

    const result = evaluatePathwayPrivateEvidenceUpload(input);

    expect(result.privateUploadAuthorized).toBe(false);
    expect(result.blockers).toContain("FEATURE_DISABLED");
  });
});
