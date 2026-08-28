import { describe, expect, it } from "vitest";

import {
  evaluatePathwayPrivateEvidenceScan,
  PATHWAY_PRIVATE_EVIDENCE_SCAN_VERSION,
  type PathwayPrivateEvidenceScanInput,
} from "./pathway-private-evidence-scan";

const EVIDENCE_REF = "evidence_opaque_74h";
const CONTENT_HASH = "a".repeat(64);

const validInput = (): PathwayPrivateEvidenceScanInput => ({
  version: PATHWAY_PRIVATE_EVIDENCE_SCAN_VERSION,
  environment: "preview",
  featureEnabled: true,
  evaluatedAt: "2026-08-28T04:00:00.000Z",
  evidenceRef: EVIDENCE_REF,
  expectedContentHash: CONTENT_HASH,
  observation: {
    recordSource: "SERVER_SECURITY_SCAN",
    contentHashBefore: CONTENT_HASH,
    contentHashAfter: CONTENT_HASH,
    detected: false,
    exitCode: 0,
    targetFileCount: 1,
    scannerEngine: "ClamAV",
    engineVersion: "1.4.3",
    definitionVersion: "27650",
    scannerSnapshotRef: "snapshot_opaque_74h",
    snapshotCreatedAt: "2026-08-28T02:15:00.000Z",
    definitionsRetrievedAt: "2026-08-28T02:00:00.000Z",
    scannedAt: "2026-08-28T03:00:00.000Z",
    maxFileSizeBytes: 25 * 1024 * 1024,
    maxScanSizeBytes: 50 * 1024 * 1024,
    maxRecursionDepth: 16,
    maxScanTimeMs: 120_000,
    fileSizeLimitHit: false,
    scanSizeLimitHit: false,
    recursionLimitHit: false,
    timeLimitHit: false,
    encryptedContent: false,
    timedOut: false,
    crashed: false,
    malformedOutput: false,
    networkDenied: true,
    sandboxStopped: true,
  },
});

describe("Item 74H private evidence scan record", () => {
  it("records a fully inspected harmless synthetic target as clean but still quarantined", () => {
    const result = evaluatePathwayPrivateEvidenceScan(validInput());

    expect(result).toMatchObject({
      status: "CLEAN",
      errorCode: "NONE",
      deletionRequired: false,
      remainsQuarantined: true,
      serverRecord: {
        status: "CLEAN",
        targetFileCount: 1,
        networkDenied: true,
        sandboxStopped: true,
      },
      redactedSummary: {
        exactHashMatched: true,
        definitionsCurrent: true,
        exactlyOneTargetScanned: true,
        noLimitHit: true,
        paidEligibilityUnlocked: false,
        productionCheckoutEnabled: false,
      },
    });
    expect(JSON.stringify(result.redactedSummary)).not.toContain(EVIDENCE_REF);
    expect(JSON.stringify(result.redactedSummary)).not.toContain(CONTENT_HASH);
  });

  it.each([
    ["timeout", (input: PathwayPrivateEvidenceScanInput) => (input.observation.timedOut = true), "TIMEOUT"],
    ["malformed output", (input: PathwayPrivateEvidenceScanInput) => (input.observation.malformedOutput = true), "MALFORMED_OUTPUT"],
    ["encrypted content", (input: PathwayPrivateEvidenceScanInput) => (input.observation.encryptedContent = true), "ENCRYPTED_CONTENT"],
    ["limit hit", (input: PathwayPrivateEvidenceScanInput) => (input.observation.scanSizeLimitHit = true), "LIMIT_HIT"],
    ["hash mismatch", (input: PathwayPrivateEvidenceScanInput) => (input.observation.contentHashAfter = "b".repeat(64)), "HASH_MISMATCH"],
  ])("fails closed on %s", (_label, mutate, errorCode) => {
    const input = validInput();
    mutate(input);

    const result = evaluatePathwayPrivateEvidenceScan(input);

    expect(result.status).toBe("ERROR");
    expect(result.errorCode).toBe(errorCode);
    expect(result.deletionRequired).toBe(false);
    expect(result.remainsQuarantined).toBe(true);
  });

  it("rejects stale definitions even when the scanner reports no detection", () => {
    const input = validInput();
    input.observation.definitionsRetrievedAt = "2026-08-26T02:00:00.000Z";

    const result = evaluatePathwayPrivateEvidenceScan(input);

    expect(result.status).toBe("ERROR");
    expect(result.errorCode).toBe("DEFINITIONS_STALE");
  });

  it("maps a trusted synthetic detection observation without malware bytes", () => {
    const input = validInput();
    input.observation.detected = true;
    input.observation.exitCode = 1;

    const result = evaluatePathwayPrivateEvidenceScan(input);

    expect(result.status).toBe("INFECTED");
    expect(result.deletionRequired).toBe(true);
    expect(result.remainsQuarantined).toBe(true);
  });

  it("rejects raw scanner output fields instead of persisting or returning them", () => {
    const input = validInput() as PathwayPrivateEvidenceScanInput & {
      observation: PathwayPrivateEvidenceScanInput["observation"] & {
        stdout?: string;
      };
    };
    input.observation.stdout = "private scanner output";

    const result = evaluatePathwayPrivateEvidenceScan(input);

    expect(result.status).toBe("ERROR");
    expect(result.errorCode).toBe("UNSUPPORTED_FIELD");
    expect(JSON.stringify(result.redactedSummary)).not.toContain("private scanner output");
  });

  it("requires deny-all networking, sandbox destruction and exactly one target", () => {
    const input = validInput();
    input.observation.networkDenied = false;

    expect(evaluatePathwayPrivateEvidenceScan(input).errorCode).toBe(
      "NETWORK_BOUNDARY_REQUIRED",
    );

    input.observation.networkDenied = true;
    input.observation.sandboxStopped = false;
    expect(evaluatePathwayPrivateEvidenceScan(input).errorCode).toBe(
      "SANDBOX_STOP_REQUIRED",
    );

    input.observation.sandboxStopped = true;
    input.observation.targetFileCount = 0;
    expect(evaluatePathwayPrivateEvidenceScan(input).errorCode).toBe(
      "TARGET_COUNT_INVALID",
    );
  });

  it("never accepts Production or unlocks either paid product", () => {
    const input = validInput();
    input.environment = "production";

    const result = evaluatePathwayPrivateEvidenceScan(input);

    expect(result.status).toBe("ERROR");
    expect(result.errorCode).toBe("PREVIEW_ONLY");
    expect(result.redactedSummary.paidEligibilityUnlocked).toBe(false);
    expect(result.redactedSummary.productionCheckoutEnabled).toBe(false);
  });
});
