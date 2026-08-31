import { createHash, randomBytes } from "node:crypto";

import { del, get, list, put } from "@vercel/blob";
import { APIError, Sandbox, Snapshot } from "@vercel/sandbox";

import {
  ITEM74H_PUBLIC_DA_CASE_VERSION,
  ITEM74H_PUBLIC_DA_TRACKER_URL,
  parseApprovedItem74hPublicDaCatalog,
  type Item74hPublicDaDocumentRole,
} from "../src/lib/pathway-public-da-download-policy";

const ENABLED =
  process.env.ITEM74H_PUBLIC_DA_ACCEPTANCE_ENABLED === "true";
const EXPECTED_BRANCHES = new Set([
  "integration/item74h-public-da-20260830",
  "agent/item74h-evidence-refinement-20260830",
  "agent/item74h-layout-evidence-20260831",
  "agent/item74h-setback-evidence-20260831",
  "agent/item74h-registered-plan-proof-20260901",
]);
const MAX_TOTAL_BYTES = 40 * 1024 * 1024;
const MAX_SCAN_SIZE_BYTES = 100 * 1024 * 1024;
const MAX_RECURSION_DEPTH = 16;
const MAX_SCAN_TIME_MS = 180_000;

type ManagedSandbox = Awaited<ReturnType<typeof Sandbox.create>>;
type QuarantinedDocument = {
  role: Item74hPublicDaDocumentRole;
  recordNumber: string;
  objectRef: string;
  contentHash: string;
  bytes: Uint8Array;
  pageCount: number | null;
};

class AcceptanceFailure extends Error {
  constructor(readonly code: string) {
    super("Item 74H public DA acceptance failed closed");
  }
}

const hash = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

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

const resourceAbsent = async (
  lookup: () => Promise<unknown>,
  deletedTombstoneIsAbsent = false,
) => {
  try {
    const resource = await lookup();
    return (
      deletedTombstoneIsAbsent &&
      resource !== null &&
      typeof resource === "object" &&
      "status" in resource &&
      resource.status === "deleted"
    );
  } catch (error) {
    if (error instanceof APIError && error.response.status === 404) return true;
    throw error;
  }
};

const waitForResourceAbsence = async (
  lookup: () => Promise<unknown>,
  deletedTombstoneIsAbsent = false,
) => {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (await resourceAbsent(lookup, deletedTombstoneIsAbsent)) return true;
    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }
  return false;
};

const readBoundedResponse = async (response: Response, maxBytes: number) => {
  const declaredLength = Number(response.headers.get("content-length") ?? "0");
  if (
    !response.ok ||
    (declaredLength !== 0 &&
      (!Number.isSafeInteger(declaredLength) || declaredLength > maxBytes))
  ) {
    throw new Error("document response rejected");
  }
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (
    !contentType.includes("application/pdf") &&
    !contentType.includes("application/octet-stream")
  ) {
    throw new Error("document content type rejected");
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (
    bytes.byteLength < 5 ||
    bytes.byteLength > maxBytes ||
    Buffer.from(bytes.subarray(0, 5)).toString("ascii") !== "%PDF-"
  ) {
    throw new Error("document body rejected");
  }
  return bytes;
};

const main = async () => {
  if (!ENABLED) {
    console.log(
      JSON.stringify({
        gate: "item74h-public-da-preview",
        status: "SKIPPED_FEATURE_DISABLED",
        productionCheckoutEnabled: false,
      }),
    );
    return;
  }

  if (
    process.env.VERCEL_ENV !== "preview" ||
    !EXPECTED_BRANCHES.has(process.env.VERCEL_GIT_COMMIT_REF ?? "") ||
    process.env.PLANNING_PACK_CHECKOUT_ENABLED === "true" ||
    process.env.SUBMISSION_SEE_CHECKOUT_ENABLED === "true"
  ) {
    throw new AcceptanceFailure("PREVIEW_SAFETY_BOUNDARY_REJECTED");
  }

  const token = process.env.ITEM74H_PRIVATE_BLOB_READ_WRITE_TOKEN;
  const storeId = process.env.ITEM74H_PRIVATE_BLOB_STORE_ID;
  if (!token || !storeId) {
    throw new AcceptanceFailure("PRIVATE_BLOB_CONFIGURATION_MISSING");
  }

  const runToken = randomBytes(8).toString("hex");
  const blobPrefix = "item74h-public-da/" + runToken + "/";
  const sandboxPrefix = "item74h-public-da-" + runToken;
  const quarantined: QuarantinedDocument[] = [];
  let preparationSandbox: ManagedSandbox | null = null;
  let scannerSandbox: ManagedSandbox | null = null;
  let preparationStopped = false;
  let snapshotId: string | null = null;
  let stage = "FETCH_TRACKER";
  let operationFailureCode: string | null = null;
  let report:
    | {
        documents: Array<{
          role: Item74hPublicDaDocumentRole;
          recordNumber: string;
          pageCount: number;
          securityScanStatus: "CLEAN";
        }>;
        networkDenied: boolean;
      }
    | null = null;
  let cleanupSucceeded = false;

  try {
    const trackerResponse = await fetch(ITEM74H_PUBLIC_DA_TRACKER_URL, {
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "Plannera-Item74H-Preview-Acceptance/1.0",
      },
    });
    if (
      trackerResponse.status !== 200 ||
      !trackerResponse.headers
        .get("content-type")
        ?.toLowerCase()
        .includes("text/html")
    ) {
      throw new Error("tracker response rejected");
    }
    const catalog = parseApprovedItem74hPublicDaCatalog(
      await trackerResponse.text(),
    );

    let totalBytes = 0;
    for (let index = 0; index < catalog.documents.length; index += 1) {
      const document = catalog.documents[index];
      stage = "FETCH_DOCUMENT_" + (index + 1);
      const response = await fetch(document.downloadUrl, {
        redirect: "manual",
        signal: AbortSignal.timeout(90_000),
        headers: {
          accept: "application/pdf",
          "user-agent": "Plannera-Item74H-Preview-Acceptance/1.0",
        },
      });
      if (response.status !== 200) throw new Error("document redirect rejected");
      const bytes = await readBoundedResponse(response, document.maxBytes);
      totalBytes += bytes.byteLength;
      if (totalBytes > MAX_TOTAL_BYTES) {
        throw new Error("document set exceeds total limit");
      }

      const contentHash = hash(bytes);
      const objectRef =
        blobPrefix + randomBytes(16).toString("hex") + ".pdf";
      stage = "QUARANTINE_DOCUMENT_" + (index + 1);
      const existing = await list({ prefix: objectRef, limit: 2, token });
      if (existing.blobs.length !== 0) {
        throw new Error("opaque private object already exists");
      }
      const blob = await put(objectRef, Buffer.from(bytes), {
        access: "private",
        token,
        storeId,
        addRandomSuffix: false,
        allowOverwrite: false,
        contentType: "application/pdf",
        cacheControlMaxAge: 60,
      });
      if (
        !/^[a-z0-9-]+\.private\.blob\.vercel-storage\.com$/.test(
          new URL(blob.url).hostname,
        )
      ) {
        throw new Error("private Blob host rejected");
      }

      const unauthenticated = await fetch(blob.url, {
        redirect: "manual",
        signal: AbortSignal.timeout(10_000),
      });
      if (unauthenticated.ok) {
        throw new Error("private Blob allowed unauthenticated read");
      }

      const authenticated = await get(objectRef, {
        access: "private",
        token,
        storeId,
      });
      if (!authenticated || authenticated.statusCode !== 200) {
        throw new Error("authenticated private Blob read failed");
      }
      const authenticatedBytes = new Uint8Array(
        await new Response(authenticated.stream).arrayBuffer(),
      );
      if (hash(authenticatedBytes) !== contentHash) {
        throw new Error("private Blob hash mismatch");
      }

      quarantined.push({
        role: document.role,
        recordNumber: document.recordNumber,
        objectRef,
        contentHash,
        bytes: authenticatedBytes,
        pageCount: null,
      });
    }

    if (quarantined.length !== catalog.documents.length) {
      throw new Error("document cardinality mismatch");
    }

    stage = "CREATE_PREPARATION_SANDBOX";
    preparationSandbox = await Sandbox.create({
      name: sandboxPrefix + "-prep",
      runtime: "node24",
      timeout: 600_000,
      persistent: false,
      networkPolicy: {
        allow: ["cdn.amazonlinux.com", "*.clamav.net"],
      },
      tags: { purpose: "item74h-public-da-preview", publicEvidence: "true" },
    });
    stage = "INSTALL_SCANNER";
    await commandSucceeded(preparationSandbox, {
      cmd: "dnf",
      args: ["clean", "all"],
      sudo: true,
    });
    await commandSucceeded(preparationSandbox, {
      cmd: "dnf",
      args: [
        "install",
        "-y",
        "clamav1.4",
        "clamav1.4-freshclam",
        "poppler-utils",
      ],
      sudo: true,
    });
    await preparationSandbox.runCommand({
      cmd: "pkill",
      args: ["-f", "freshclam"],
      sudo: true,
    });
    stage = "UPDATE_DEFINITIONS";
    await commandSucceeded(preparationSandbox, {
      cmd: "freshclam",
      args: ["--stdout"],
      sudo: true,
    });
    stage = "CREATE_SCANNER_SNAPSHOT";
    const scannerSnapshot = await preparationSandbox.snapshot();
    preparationStopped = true;
    snapshotId = scannerSnapshot.snapshotId;
    if (!snapshotId) throw new Error("scanner snapshot unavailable");

    stage = "CREATE_DENY_ALL_SCANNER";
    scannerSandbox = await Sandbox.create({
      name: sandboxPrefix + "-scan",
      source: { type: "snapshot", snapshotId },
      timeout: 300_000,
      persistent: false,
      networkPolicy: "deny-all",
      tags: { purpose: "item74h-public-da-preview", publicEvidence: "true" },
    });
    const networkProbe = await scannerSandbox.runCommand("node", [
      "-e",
      "fetch('https://example.com',{signal:AbortSignal.timeout(3000)}).then(()=>process.exit(0)).catch(()=>process.exit(7))",
    ]);
    const networkDenied = networkProbe.exitCode !== 0;
    if (!networkDenied) throw new Error("scanner network isolation failed");

    const paths = quarantined.map(
      (_, index) => "/vercel/sandbox/evidence-" + index + ".pdf",
    );
    stage = "WRITE_QUARANTINED_DOCUMENTS";
    await scannerSandbox.writeFiles(
      quarantined.map((document, index) => ({
        path: paths[index],
        content: Buffer.from(document.bytes),
        mode: 0o600,
      })),
    );

    for (let index = 0; index < quarantined.length; index += 1) {
      stage = "PRE_SCAN_VERIFY_" + (index + 1);
      const before = await commandSucceeded(scannerSandbox, {
        cmd: "sha256sum",
        args: [paths[index]],
      });
      if (
        !(await before.stdout()).trim().startsWith(
          quarantined[index].contentHash,
        )
      ) {
        throw new Error("pre-scan hash mismatch");
      }
      const info = await commandSucceeded(scannerSandbox, {
        cmd: "pdfinfo",
        args: [paths[index]],
      });
      const pageMatch = /^Pages:\s+(\d+)\s*$/m.exec(await info.stdout());
      const pageCount = Number(pageMatch?.[1] ?? "0");
      if (!Number.isSafeInteger(pageCount) || pageCount < 1 || pageCount > 500) {
        throw new Error("PDF page count rejected");
      }
      quarantined[index].pageCount = pageCount;
    }

    stage = "SCAN_EXACT_DOCUMENT_SET";
    const version = await commandSucceeded(scannerSandbox, {
      cmd: "clamscan",
      args: ["--version"],
    });
    if (
      !/^ClamAV\s+[^/\s]+\/[^/\s]+\//.test((await version.stdout()).trim())
    ) {
      throw new Error("scanner version rejected");
    }
    const scan = await scannerSandbox.runCommand("clamscan", [
      "--stdout",
      "--no-summary",
      "--alert-encrypted=yes",
      "--max-filesize=" + 25 * 1024 * 1024,
      "--max-scansize=" + MAX_SCAN_SIZE_BYTES,
      "--max-recursion=" + MAX_RECURSION_DEPTH,
      "--max-scantime=" + MAX_SCAN_TIME_MS,
      ...paths,
    ]);
    const scanOutput = (await scan.stdout()) + "\n" + (await scan.stderr());
    const cleanLines = scanOutput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.endsWith(": OK"));
    if (
      scan.exitCode !== 0 ||
      /FOUND|Heuristics\.Encrypted|Heuristics\.Limits\.Exceeded|limit exceeded/i.test(
        scanOutput,
      ) ||
      paths.some(
        (path) =>
          cleanLines.filter((line) => line === path + ": OK").length !== 1,
      )
    ) {
      throw new Error("malware scan rejected document set");
    }

    for (let index = 0; index < quarantined.length; index += 1) {
      stage = "POST_SCAN_VERIFY_" + (index + 1);
      const after = await commandSucceeded(scannerSandbox, {
        cmd: "sha256sum",
        args: [paths[index]],
      });
      if (
        !(await after.stdout()).trim().startsWith(
          quarantined[index].contentHash,
        )
      ) {
        throw new Error("post-scan hash mismatch");
      }
    }

    report = {
      documents: quarantined.map((document) => {
        if (!document.pageCount) throw new Error("page count unavailable");
        return {
          role: document.role,
          recordNumber: document.recordNumber,
          pageCount: document.pageCount,
          securityScanStatus: "CLEAN" as const,
        };
      }),
      networkDenied,
    };
  } catch {
    operationFailureCode = stage;
  } finally {
    let blobsRemoved = true;
    for (const document of quarantined) {
      try {
        await del(document.objectRef, { token });
      } catch {
        blobsRemoved = false;
      }
    }
    let residualBlobCount = 1;
    try {
      residualBlobCount = (
        await list({ prefix: blobPrefix, limit: 100, token })
      ).blobs.length;
    } catch {
      residualBlobCount = 1;
    }

    const scannerRemoved = await stopAndDelete(scannerSandbox);
    const preparationRemoved = await stopAndDelete(
      preparationSandbox,
      preparationStopped,
    );
    let snapshotRemoved = snapshotId === null;
    if (snapshotId) {
      try {
        const snapshot = await Snapshot.get({ snapshotId });
        await snapshot.delete();
        snapshotRemoved = await waitForResourceAbsence(
          () => Snapshot.get({ snapshotId: snapshotId as string }),
          true,
        );
      } catch (error) {
        snapshotRemoved =
          error instanceof APIError && error.response.status === 404;
      }
    }

    let residualSandboxCount = 0;
    for (const name of [sandboxPrefix + "-prep", sandboxPrefix + "-scan"]) {
      if (!(await waitForResourceAbsence(() => Sandbox.get({ name })))) {
        residualSandboxCount += 1;
      }
    }
    cleanupSucceeded =
      blobsRemoved &&
      residualBlobCount === 0 &&
      scannerRemoved &&
      preparationRemoved &&
      snapshotRemoved &&
      residualSandboxCount === 0;
  }

  if (operationFailureCode) {
    throw new AcceptanceFailure(operationFailureCode);
  }
  if (!cleanupSucceeded || !report) {
    throw new AcceptanceFailure("ZERO_RESIDUE_CLEANUP_FAILED");
  }

  console.log(
    JSON.stringify({
      gate: "item74h-public-da-preview",
      status: "PASS",
      version: ITEM74H_PUBLIC_DA_CASE_VERSION,
      environment: "preview",
      publicCouncilCase: true,
      approvedCaseMetadataConfirmed: true,
      documentCount: report.documents.length,
      documents: report.documents,
      privateBlobAuthenticatedOnly: true,
      exactHashesMatchedBeforeAndAfterScan: true,
      malwareDefinitionsRefreshed: true,
      networkDenied: report.networkDenied,
      quarantineCompleted: true,
      operatorReviewPerformed: false,
      evidencePromotionPerformed: false,
      planningControlsPackEligible: false,
      submissionSeeEligible: false,
      paidArtefactBindingsCreated: 0,
      cleanupSucceeded: true,
      residualResourceCount: 0,
      productionMutationPerformed: false,
      productionCheckoutEnabled: false,
      containsSecret: false,
      containsDownloadCapability: false,
      containsContentHash: false,
      containsRawDocumentContent: false,
      containsRawScannerOutput: false,
    }),
  );
};

void main().catch((error) => {
  console.error(
    JSON.stringify({
      gate: "item74h-public-da-preview",
      status: "FAIL_CLOSED",
      errorCode:
        error instanceof AcceptanceFailure ? error.code : "UNCLASSIFIED",
      productionMutationPerformed: false,
      productionCheckoutEnabled: false,
      containsSecret: false,
      containsDownloadCapability: false,
      containsContentHash: false,
      containsRawDocumentContent: false,
      containsRawScannerOutput: false,
    }),
  );
  process.exitCode = 1;
});
