import { createHash, randomBytes } from "node:crypto";

import { Sandbox } from "@vercel/sandbox";

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

const commandSucceeded = async (
  sandbox: ManagedSandbox,
  command: { cmd: string; args: string[]; sudo?: boolean },
) => {
  const result = await sandbox.runCommand(command);
  if (result.exitCode !== 0) throw new Error("sandbox command failed");
  return result;
};

const stopAndDelete = async (sandbox: ManagedSandbox | null) => {
  if (!sandbox) return true;
  let stopped = false;
  let deleted = false;
  try {
    await sandbox.stop();
    stopped = true;
  } catch {
    stopped = false;
  }
  try {
    await sandbox.delete({ deleteOrphanSnapshots: true });
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
  let observationWithoutStop:
    | Omit<PathwayPrivateEvidenceScannerObservation, "sandboxStopped">
    | null = null;
  let scannerStopped = false;
  let cleanupSucceeded = false;

  try {
    preparationSandbox = await Sandbox.create({
      name: `${sandboxNamePrefix}-prep`,
      runtime: "node24",
      timeout: 600_000,
      persistent: false,
      networkPolicy: {
        allow: ["*.ubuntu.com", "*.clamav.net"],
      },
      tags: { purpose: "item74h-clamav-preview", synthetic: "true" },
    });

    await commandSucceeded(preparationSandbox, {
      cmd: "apt-get",
      args: ["update"],
      sudo: true,
    });
    await commandSucceeded(preparationSandbox, {
      cmd: "apt-get",
      args: [
        "install",
        "-y",
        "--no-install-recommends",
        "clamav",
        "clamav-freshclam",
      ],
      sudo: true,
    });
    await preparationSandbox.runCommand({
      cmd: "pkill",
      args: ["-f", "freshclam"],
      sudo: true,
    });
    await commandSucceeded(preparationSandbox, {
      cmd: "freshclam",
      args: ["--stdout"],
      sudo: true,
    });
    const definitionsRetrievedAt = new Date().toISOString();
    const snapshot = await preparationSandbox.snapshot({
      expiration: 10 * 60 * 1000,
    });
    const snapshotCreatedAt = new Date().toISOString();

    scannerSandbox = await Sandbox.create({
      name: `${sandboxNamePrefix}-scan`,
      source: { type: "snapshot", snapshotId: snapshot.snapshotId },
      timeout: 300_000,
      persistent: false,
      networkPolicy: "deny-all",
      tags: { purpose: "item74h-clamav-preview", synthetic: "true" },
    });

    const networkProbe = await scannerSandbox.runCommand("node", [
      "-e",
      "fetch('https://example.com',{signal:AbortSignal.timeout(3000)}).then(()=>process.exit(0)).catch(()=>process.exit(7))",
    ]);
    const networkDenied = networkProbe.exitCode !== 0;

    const opaquePath = "/tmp/item74h-synthetic.bin";
    await scannerSandbox.writeFiles([
      { path: opaquePath, content: SAFE_SYNTHETIC_BYTES },
    ]);

    const hashResult = await commandSucceeded(scannerSandbox, {
      cmd: "sha256sum",
      args: [opaquePath],
    });
    const contentHashBefore = (await hashResult.stdout()).trim().split(/\s+/)[0];

    const versionResult = await commandSucceeded(scannerSandbox, {
      cmd: "clamscan",
      args: ["--version"],
    });
    const versionOutput = (await versionResult.stdout()).trim();
    const versionMatch = /^ClamAV\s+([^/\s]+)\/([^/\s]+)\//.exec(versionOutput);

    const scanResult = await scannerSandbox.runCommand("clamscan", [
      "--stdout",
      "--infected",
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
      scannerSnapshotRef: snapshot.snapshotId,
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
  } finally {
    scannerStopped = await stopAndDelete(scannerSandbox);
    const preparationRemoved = await stopAndDelete(preparationSandbox);
    cleanupSucceeded = scannerStopped && preparationRemoved;
  }

  if (!observationWithoutStop) throw new Error("scan observation unavailable");
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
  const residualResourceCount = (
    await Sandbox.list({ namePrefix: sandboxNamePrefix }).toArray()
  ).length;

  if (
    evaluation.status !== "CLEAN" ||
    !evaluation.remainsQuarantined ||
    !cleanupSucceeded ||
    residualResourceCount !== 0
  ) {
    throw new Error("synthetic scanner acceptance failed closed");
  }

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
  } catch {
    console.error(
      JSON.stringify({
        gate: "item74h-clamav-preview",
        status: "FAIL_CLOSED",
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
