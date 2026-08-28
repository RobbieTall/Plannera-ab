import { createHash, randomBytes } from "node:crypto";

import { APIError, Sandbox, Snapshot } from "@vercel/sandbox";

import {
  evaluatePathwayPrivateEvidenceScan,
  PATHWAY_PRIVATE_EVIDENCE_SCAN_VERSION,
  type PathwayPrivateEvidenceScannerObservation,
} from "../src/lib/pathway-private-evidence-scan";

const ACCEPTANCE_ENABLED =
  process.env.ITEM74H_CLAMAV_ACCEPTANCE_ENABLED === "true";
const PRODUCTION_CHECKOUT_ENABLED =
  process.env.PLANNING_PACK_CHECKOUT_ENABLED === "true";
const PREVIEW_ENVIRONMENT = process.env.VERCEL_ENV === "preview";

const SAFE_SYNTHETIC_BYTES = Buffer.from(
  "Plannera Item 74H harmless synthetic scanner acceptance fixture.\n",
  "utf8",
);
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const MAX_SCAN_SIZE_BYTES = 50 * 1024 * 1024;
const MAX_RECURSION_DEPTH = 16;
const MAX_SCAN_TIME_MS = 120_000;

type ManagedSandbox = Awaited<ReturnType<typeof Sandbox.create>>;

class AcceptanceFailure extends Error {
  constructor(readonly code: string) {
    super("Item 74H scanner acceptance failed closed");
  }
}

const commandSucceeded = async (
  sandbox: ManagedSandbox,
  command: { cmd: string; args: string[]; sudo?: boolean },
) => {
  const result = await sandbox.runCommand(command);
  if (result.exitCode !== 0) throw new Error("sandbox command failed");
  return result;
};

const stopAndDelete = async (
  sandbox: ManagedSandbox | null,
  alreadyStopped = false,
) => {
  if (!sandbox) return true;
  let stopped = alreadyStopped;
  let deleted = false;
  if (!alreadyStopped) {
    try {
      await sandbox.stop();
      stopped = true;
    } catch {
      stopped = false;
    }
  }
  try {
    await sandbox.delete();
    deleted = true;
  } catch {
    deleted = false;
  }
  return stopped && deleted;
};

const runAcceptance = async () => {
  if (!ACCEPTANCE_ENABLED) {
    return {
      gate: "item74h-clamav-preview",
      status: "SKIPPED_FEATURE_DISABLED",
      productionCheckoutEnabled: false,
    } as const;
  }
  if (!PREVIEW_ENVIRONMENT || PRODUCTION_CHECKOUT_ENABLED) {
    throw new Error("preview safety boundary rejected");
  }

  const runToken = randomBytes(8).toString("hex");
  const sandboxNamePrefix = `item74h-clamav-${runToken}`;
  const evidenceRef = `evidence_${randomBytes(12).toString("hex")}`;
  const expectedContentHash = createHash("sha256")
    .update(SAFE_SYNTHETIC_BYTES)
    .digest("hex");
  let preparationSandbox: ManagedSandbox | null = null;
  let scannerSandbox: ManagedSandbox | null = null;
  let createdSnapshotId: string | null = null;
  let observationWithoutStop:
    | Omit<PathwayPrivateEvidenceScannerObservation, "sandboxStopped">
    | null = null;
  let scannerStopped = false;
  let preparationStopped = false;
  let snapshotRemoved = true;
  let cleanupSucceeded = false;
  let stage = "CREATE_PREPARATION_SANDBOX";
  let operationFailureCode: string | null = null;

  try {
    preparationSandbox = await Sandbox.create({
      name: `${sandboxNamePrefix}-prep`,
      runtime: "node24",
      timeout: 600_000,
      persistent: true,
      networkPolicy: {
        allow: ["cdn.amazonlinux.com", "*.clamav.net"],
      },
      tags: { purpose: "item74h-clamav-preview", synthetic: "true" },
    });

    stage = "DNF_CLEAN";
    await commandSucceeded(preparationSandbox, {
      cmd: "dnf",
      args: ["clean", "all"],
      sudo: true,
    });
    stage = "DNF_INSTALL";
    await commandSucceeded(preparationSandbox, {
      cmd: "dnf",
      args: ["install", "-y", "clamav1.4", "clamav1.4-freshclam"],
      sudo: true,
    });
    stage = "STOP_BACKGROUND_UPDATER";
    await preparationSandbox.runCommand({
      cmd: "pkill",
      args: ["-f", "freshclam"],
      sudo: true,
    });
    stage = "DEFINITIONS_UPDATE";
    await commandSucceeded(preparationSandbox, {
      cmd: "freshclam",
      args: ["--stdout"],
      sudo: true,
    });
    const definitionsRetrievedAt = new Date().toISOString();
    stage = "SNAPSHOT_CREATE";
    const preparationStopResult = await preparationSandbox.stop();
    preparationStopped = true;
    const snapshotId = preparationStopResult.snapshot?.id;
    if (!snapshotId) throw new Error("snapshot unavailable");
    createdSnapshotId = snapshotId;
    snapshotRemoved = false;
    const snapshotCreatedAt = new Date().toISOString();

    stage = "CREATE_SCANNER_SANDBOX";
    scannerSandbox = await Sandbox.create({
      name: `${sandboxNamePrefix}-scan`,
      source: { type: "snapshot", snapshotId },
      timeout: 300_000,
      persistent: false,
      networkPolicy: "deny-all",
      tags: { purpose: "item74h-clamav-preview", synthetic: "true" },
    });

    stage = "NETWORK_DENIAL_PROBE";
    const networkProbe = await scannerSandbox.runCommand("node", [
      "-e",
      "fetch('https://example.com',{signal:AbortSignal.timeout(3000)}).then(()=>process.exit(0)).catch(()=>process.exit(7))",
    ]);
    const networkDenied = networkProbe.exitCode !== 0;

    const opaquePath = "/tmp/item74h-synthetic.bin";
    stage = "WRITE_SYNTHETIC_FIXTURE";
    await scannerSandbox.writeFiles([
      { path: opaquePath, content: SAFE_SYNTHETIC_BYTES },
    ]);

    stage = "PRE_SCAN_HASH";
    const hashResult = await commandSucceeded(scannerSandbox, {
      cmd: "sha256sum",
      args: [opaquePath],
    });
    const contentHashBefore = (await hashResult.stdout()).trim().split(/\s+/)[0];

    stage = "SCANNER_VERSION";
    const versionResult = await commandSucceeded(scannerSandbox, {
      cmd: "clamscan",
      args: ["--version"],
    });
    const versionOutput = (await versionResult.stdout()).trim();
    const versionMatch = /^ClamAV\s+([^/\s]+)\/([^/\s]+)\//.exec(versionOutput);

    stage = "SYNTHETIC_SCAN";
    const scanResult = await scannerSandbox.runCommand("clamscan", [
      "--stdout",
      "--no-summary",
      "--alert-encrypted=yes",
      `--max-filesize=${MAX_FILE_SIZE_BYTES}`,
      `--max-scansize=${MAX_SCAN_SIZE_BYTES}`,
      `--max-recursion=${MAX_RECURSION_DEPTH}`,
      `--max-scantime=${MAX_SCAN_TIME_MS}`,
      opaquePath,
    ]);
    const scanOutput = `${await scanResult.stdout()}\n${await scanResult.stderr()}`;
    const scannedAt = new Date().toISOString();

    stage = "POST_SCAN_HASH";
    const postHashResult = await commandSucceeded(scannerSandbox, {
      cmd: "sha256sum",
      args: [opaquePath],
    });
    const contentHashAfter = (await postHashResult.stdout())
      .trim()
      .split(/\s+/)[0];
    const limitHit = /Heuristics\.Limits\.Exceeded|size limit|recursion limit/i.test(
      scanOutput,
    );
    const encryptedContent = /Heuristics\.Encrypted|encrypted/i.test(scanOutput);
    const outputShapeValid =
      Boolean(versionMatch) &&
      (scanResult.exitCode === 0 || scanResult.exitCode === 1) &&
      /:\s+(OK|.+\sFOUND)\s*$/m.test(scanOutput);

    observationWithoutStop = {
      recordSource: "SERVER_SECURITY_SCAN",
      contentHashBefore,
      contentHashAfter,
      detected: scanResult.exitCode === 1,
      exitCode: scanResult.exitCode,
      targetFileCount: 1,
      scannerEngine: "ClamAV",
      engineVersion: versionMatch?.[1] ?? "invalid",
      definitionVersion: versionMatch?.[2] ?? "invalid",
      scannerSnapshotRef: snapshotId,
      snapshotCreatedAt,
      definitionsRetrievedAt,
      scannedAt,
      maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
      maxScanSizeBytes: MAX_SCAN_SIZE_BYTES,
      maxRecursionDepth: MAX_RECURSION_DEPTH,
      maxScanTimeMs: MAX_SCAN_TIME_MS,
      fileSizeLimitHit: limitHit,
      scanSizeLimitHit: limitHit,
      recursionLimitHit: limitHit,
      timeLimitHit: false,
      encryptedContent,
      timedOut: false,
      crashed: false,
      malformedOutput: !outputShapeValid,
      networkDenied,
    };
  } catch {
    operationFailureCode = stage;
  } finally {
    stage = "CLEANUP";
    scannerStopped = await stopAndDelete(scannerSandbox);
    const preparationRemoved = await stopAndDelete(
      preparationSandbox,
      preparationStopped,
    );
    if (createdSnapshotId) {
      try {
        const createdSnapshot = await Snapshot.get({
          snapshotId: createdSnapshotId,
        });
        await createdSnapshot.delete();
        snapshotRemoved = true;
      } catch {
        snapshotRemoved = false;
      }
    }
    cleanupSucceeded =
      scannerStopped && preparationRemoved && snapshotRemoved;
    if (!cleanupSucceeded && !operationFailureCode) {
      operationFailureCode = "CLEANUP_FAILED";
    }
  }

  if (operationFailureCode) throw new AcceptanceFailure(operationFailureCode);
  if (!observationWithoutStop) throw new Error("scan observation unavailable");
  stage = "CONTRACT_EVALUATION";
  const evaluation = evaluatePathwayPrivateEvidenceScan({
    version: PATHWAY_PRIVATE_EVIDENCE_SCAN_VERSION,
    environment: "preview",
    featureEnabled: true,
    evaluatedAt: new Date().toISOString(),
    evidenceRef,
    expectedContentHash,
    observation: {
      ...observationWithoutStop,
      sandboxStopped: scannerStopped,
    },
  });
  stage = "RESIDUE_RECONCILIATION";
  const resourceAbsent = async (
    lookup: () => Promise<unknown>,
    deletedTombstoneIsAbsent = false,
  ) => {
    try {
      const resource = await lookup();
      return (
        deletedTombstoneIsAbsent &&
        Boolean(resource) &&
        typeof resource === "object" &&
        "status" in resource &&
        resource.status === "deleted"
      );
    } catch (error) {
      if (error instanceof APIError && error.response.status === 404) {
        return true;
      }
      throw error;
    }
  };
  const waitForResourceAbsence = async (
    lookup: () => Promise<unknown>,
    deletedTombstoneIsAbsent = false,
  ) => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      if (await resourceAbsent(lookup, deletedTombstoneIsAbsent)) return true;
      await new Promise((resolve) =>
        setTimeout(resolve, 500 * (attempt + 1)),
      );
    }
    return false;
  };
  let residualSandboxCount = 0;
  for (const name of [
    `${sandboxNamePrefix}-prep`,
    `${sandboxNamePrefix}-scan`,
  ]) {
    try {
      if (!(await waitForResourceAbsence(() => Sandbox.get({ name })))) {
        residualSandboxCount += 1;
      }
    } catch {
      throw new AcceptanceFailure("SANDBOX_RESIDUE_QUERY_FAILED");
    }
  }
  let residualSnapshotCount = 0;
  if (createdSnapshotId) {
    try {
      if (
        !(await waitForResourceAbsence(
          () => Snapshot.get({ snapshotId: createdSnapshotId! }),
          true,
        ))
      ) {
        residualSnapshotCount = 1;
      }
    } catch {
      throw new AcceptanceFailure("SNAPSHOT_RESIDUE_QUERY_FAILED");
    }
  }
  const residualResourceCount =
    residualSandboxCount + residualSnapshotCount;

  if (residualSandboxCount !== 0)
    throw new AcceptanceFailure("SANDBOX_RESIDUE_DETECTED");
  if (residualSnapshotCount !== 0)
    throw new AcceptanceFailure("SNAPSHOT_RESIDUE_DETECTED");
  if (evaluation.status !== "CLEAN" || !evaluation.remainsQuarantined)
    throw new AcceptanceFailure(
      `CONTRACT_REJECTED_${evaluation.errorCode}`,
    );

  return {
    gate: "item74h-clamav-preview",
    status: "PASS",
    version: PATHWAY_PRIVATE_EVIDENCE_SCAN_VERSION,
    environment: "preview",
    syntheticOnly: true,
    securityScanStatus: evaluation.status,
    quarantineStatus: "QUARANTINED",
    exactHashMatched: evaluation.redactedSummary.exactHashMatched,
    definitionsCurrent: evaluation.redactedSummary.definitionsCurrent,
    exactlyOneTargetScanned:
      evaluation.redactedSummary.exactlyOneTargetScanned,
    noLimitHit: evaluation.redactedSummary.noLimitHit,
    networkDenied: evaluation.redactedSummary.networkDenied,
    sandboxStopped: evaluation.redactedSummary.sandboxStopped,
    cleanupSucceeded,
    residualResourceCount,
    paidEligibilityUnlocked: false,
    productionCheckoutEnabled: false,
    containsSecret: false,
    containsEvidenceReference: false,
    containsContentHash: false,
    containsSnapshotReference: false,
    containsRawScannerOutput: false,
  } as const;
};

const main = async () => {
  try {
    console.log(JSON.stringify(await runAcceptance()));
  } catch (error) {
    console.error(
      JSON.stringify({
        gate: "item74h-clamav-preview",
        status: "FAIL_CLOSED",
        errorCode:
          error instanceof AcceptanceFailure ? error.code : "UNCLASSIFIED",
        productionCheckoutEnabled: false,
        containsSecret: false,
        containsEvidenceReference: false,
        containsContentHash: false,
        containsSnapshotReference: false,
        containsRawScannerOutput: false,
      }),
    );
    process.exitCode = 1;
  }
};

void main();
