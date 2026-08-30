import { createHash, randomBytes } from "node:crypto";

import { del, get, list, put } from "@vercel/blob";
import { APIError, Sandbox, Snapshot } from "@vercel/sandbox";

import {
  ITEM74H_PUBLIC_DA_TRACKER_URL,
  parseApprovedItem74hPublicDaCatalog,
  type Item74hPublicDaDocumentRole,
} from "../src/lib/pathway-public-da-download-policy";

const ENABLED =
  process.env.ITEM74H_PUBLIC_DA_ACCEPTANCE_ENABLED === "true";
const EXPECTED_BRANCH = "integration/item74h-public-da-20260830";
const MAX_TOTAL_BYTES = 40 * 1024 * 1024;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

type ManagedSandbox = Awaited<ReturnType<typeof Sandbox.create>>;
type Evidence = {
  role: Item74hPublicDaDocumentRole;
  recordNumber: string;
  objectRef: string;
  contentHash: string;
  bytes: Uint8Array;
};

const patterns: Record<Item74hPublicDaDocumentRole, RegExp> = {
  ROAD_CLASSIFICATION:
    /\b(?:s\s*138|section\s+138|road|access|driveway|classified|classification|local|regional|state)\b/i,
  CADASTRAL_SURVEY:
    /\b(?:survey|surveyor|registered|lot\s*11|dp\s*1225487|boundary|area|datum|contour|wilsons creek)\b/i,
  PROPOSED_SHED_LAYOUT:
    /\b(?:farm\s+shed|shed|floor\s+area|m2|sqm|height|setback|boundary|elevation|rl|ffl)\b/i,
  DETERMINATION:
    /\b(?:farm\s+shed|approved|consent|condition|stamped\s+plans|s\s*138|road)\b/i,
};

class DiscoveryFailure extends Error {
  constructor(readonly code: string) {
    super("Item 74H public DA review discovery failed closed");
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
  if (!alreadyStopped) {
    try {
      await sandbox.stop();
      stopped = true;
    } catch {
      stopped = false;
    }
  }
  let deleted = false;
  try {
    await sandbox.delete();
    deleted = true;
  } catch {
    deleted = false;
  }
  return stopped && deleted;
};

const absent = async (
  lookup: () => Promise<unknown>,
  tombstone = false,
) => {
  try {
    const value = await lookup();
    return (
      tombstone &&
      value !== null &&
      typeof value === "object" &&
      "status" in value &&
      value.status === "deleted"
    );
  } catch (error) {
    return error instanceof APIError && error.response.status === 404;
  }
};

const waitAbsent = async (
  lookup: () => Promise<unknown>,
  tombstone = false,
) => {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (await absent(lookup, tombstone)) return true;
    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }
  return false;
};

const readPdf = async (response: Response, maxBytes: number) => {
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (
    response.status !== 200 ||
    (declared !== 0 &&
      (!Number.isSafeInteger(declared) || declared > maxBytes))
  ) {
    throw new Error("PDF response rejected");
  }
  const type = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (
    !type.includes("application/pdf") &&
    !type.includes("application/octet-stream")
  ) {
    throw new Error("PDF content type rejected");
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (
    bytes.byteLength < 5 ||
    bytes.byteLength > maxBytes ||
    Buffer.from(bytes.subarray(0, 5)).toString("ascii") !== "%PDF-"
  ) {
    throw new Error("PDF body rejected");
  }
  return bytes;
};

const sanitizeLine = (line: string) =>
  line
    .replace(
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
      "[email redacted]",
    )
    .replace(/\b(?:\+?61|0)[2-478](?:[\s-]?\d){8}\b/g, "[phone redacted]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);

const main = async () => {
  if (!ENABLED) {
    console.log(
      JSON.stringify({
        gate: "item74h-public-da-review-discovery",
        status: "SKIPPED_FEATURE_DISABLED",
        productionCheckoutEnabled: false,
      }),
    );
    return;
  }
  if (
    process.env.VERCEL_ENV !== "preview" ||
    process.env.VERCEL_GIT_COMMIT_REF !== EXPECTED_BRANCH ||
    process.env.PLANNING_PACK_CHECKOUT_ENABLED === "true" ||
    process.env.SUBMISSION_SEE_CHECKOUT_ENABLED === "true"
  ) {
    throw new DiscoveryFailure("PREVIEW_SAFETY_BOUNDARY_REJECTED");
  }

  const token = process.env.ITEM74H_PRIVATE_BLOB_READ_WRITE_TOKEN;
  const storeId = process.env.ITEM74H_PRIVATE_BLOB_STORE_ID;
  if (!token || !storeId) {
    throw new DiscoveryFailure("PRIVATE_BLOB_CONFIGURATION_MISSING");
  }

  const runToken = randomBytes(8).toString("hex");
  const blobPrefix = "item74h-public-review/" + runToken + "/";
  const sandboxPrefix = "item74h-public-review-" + runToken;
  const evidence: Evidence[] = [];
  let prep: ManagedSandbox | null = null;
  let scanner: ManagedSandbox | null = null;
  let prepStopped = false;
  let snapshotId: string | null = null;
  let stage = "FETCH_TRACKER";
  let operationFailure: string | null = null;
  let cleanupPassed = false;
  let findings:
    | Array<{
        role: Item74hPublicDaDocumentRole;
        recordNumber: string;
        textExtractable: boolean;
        candidateCount: number;
        candidates: Array<{ pageRef: string; text: string }>;
      }>
    | null = null;
  const retainedReviewPages: Array<{
    role: "CADASTRAL_SURVEY" | "PROPOSED_SHED_LAYOUT";
    pageRef: "page-1" | "page-2" | "page-9";
    objectRef: string;
  }> = [];

  try {
    const tracker = await fetch(ITEM74H_PUBLIC_DA_TRACKER_URL, {
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "Plannera-Item74H-Preview-Review/1.0",
      },
    });
    if (
      tracker.status !== 200 ||
      !tracker.headers.get("content-type")?.toLowerCase().includes("text/html")
    ) {
      throw new Error("tracker response rejected");
    }
    const catalog = parseApprovedItem74hPublicDaCatalog(await tracker.text());

    let totalBytes = 0;
    for (let index = 0; index < catalog.documents.length; index += 1) {
      const document = catalog.documents[index];
      stage = "FETCH_DOCUMENT_" + (index + 1);
      const response = await fetch(document.downloadUrl, {
        redirect: "manual",
        signal: AbortSignal.timeout(90_000),
        headers: {
          accept: "application/pdf",
          "user-agent": "Plannera-Item74H-Preview-Review/1.0",
        },
      });
      const bytes = await readPdf(response, document.maxBytes);
      totalBytes += bytes.byteLength;
      if (totalBytes > MAX_TOTAL_BYTES) {
        throw new Error("document set exceeds total limit");
      }

      const contentHash = hash(bytes);
      const objectRef =
        blobPrefix + randomBytes(16).toString("hex") + ".pdf";
      stage = "PRIVATE_QUARANTINE_" + (index + 1);
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
      const privateBytes = new Uint8Array(
        await new Response(authenticated.stream).arrayBuffer(),
      );
      if (hash(privateBytes) !== contentHash) {
        throw new Error("private Blob hash mismatch");
      }
      evidence.push({
        role: document.role,
        recordNumber: document.recordNumber,
        objectRef,
        contentHash,
        bytes: privateBytes,
      });
    }

    stage = "CREATE_PREPARATION_SANDBOX";
    prep = await Sandbox.create({
      name: sandboxPrefix + "-prep",
      runtime: "node24",
      timeout: 600_000,
      persistent: true,
      networkPolicy: { allow: ["cdn.amazonlinux.com", "*.clamav.net"] },
      tags: { purpose: "item74h-public-review", publicEvidence: "true" },
    });
    stage = "DNF_CLEAN";
    await commandSucceeded(prep, {
      cmd: "dnf",
      args: ["clean", "all"],
      sudo: true,
    });
    stage = "DNF_INSTALL_RENDERER";
    await commandSucceeded(prep, {
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
    stage = "STOP_BACKGROUND_UPDATER";
    await prep.runCommand({
      cmd: "pkill",
      args: ["-f", "freshclam"],
      sudo: true,
    });
    stage = "UPDATE_DEFINITIONS";
    await commandSucceeded(prep, {
      cmd: "freshclam",
      args: ["--stdout"],
      sudo: true,
    });
    const stopped = await prep.stop();
    prepStopped = true;
    snapshotId = stopped.snapshot?.id ?? null;
    if (!snapshotId) throw new Error("scanner snapshot unavailable");

    stage = "CREATE_DENY_ALL_SCANNER";
    scanner = await Sandbox.create({
      name: sandboxPrefix + "-scan",
      source: { type: "snapshot", snapshotId },
      timeout: 300_000,
      persistent: false,
      networkPolicy: "deny-all",
      tags: { purpose: "item74h-public-review", publicEvidence: "true" },
    });
    const probe = await scanner.runCommand("node", [
      "-e",
      "fetch('https://example.com',{signal:AbortSignal.timeout(3000)}).then(()=>process.exit(0)).catch(()=>process.exit(7))",
    ]);
    if (probe.exitCode === 0) throw new Error("scanner network isolation failed");

    const paths = evidence.map(
      (_, index) => "/vercel/sandbox/review-" + index + ".pdf",
    );
    await scanner.writeFiles(
      evidence.map((document, index) => ({
        path: paths[index],
        content: Buffer.from(document.bytes),
        mode: 0o600,
      })),
    );

    stage = "SCAN_EXACT_DOCUMENT_SET";
    const scan = await scanner.runCommand("clamscan", [
      "--stdout",
      "--no-summary",
      "--alert-encrypted=yes",
      "--max-filesize=" + MAX_FILE_BYTES,
      "--max-scansize=" + 100 * 1024 * 1024,
      "--max-recursion=16",
      "--max-scantime=180000",
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

    findings = [];
    for (let index = 0; index < evidence.length; index += 1) {
      stage = "EXTRACT_REVIEW_CANDIDATES_" + (index + 1);
      const before = await commandSucceeded(scanner, {
        cmd: "sha256sum",
        args: [paths[index]],
      });
      if (
        !(await before.stdout()).trim().startsWith(evidence[index].contentHash)
      ) {
        throw new Error("review input hash mismatch");
      }

      const extracted = await commandSucceeded(scanner, {
        cmd: "pdftotext",
        args: ["-layout", paths[index], "-"],
      });
      const pages = (await extracted.stdout()).split("\f");
      const candidates: Array<{ pageRef: string; text: string }> = [];
      for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
        for (const rawLine of pages[pageIndex].split(/\r?\n/)) {
          const line = sanitizeLine(rawLine);
          if (
            line.length >= 5 &&
            patterns[evidence[index].role].test(line) &&
            !candidates.some(
              (candidate) =>
                candidate.pageRef === "page-" + (pageIndex + 1) &&
                candidate.text === line,
            )
          ) {
            candidates.push({
              pageRef: "page-" + (pageIndex + 1),
              text: line,
            });
            if (candidates.length >= 60) break;
          }
        }
        if (candidates.length >= 60) break;
      }

      const reviewPages =
        evidence[index].role === "CADASTRAL_SURVEY"
          ? ([1, 2] as const)
          : evidence[index].role === "PROPOSED_SHED_LAYOUT"
            ? ([1, 9] as const)
            : ([] as const);
      for (const pageNumber of reviewPages) {
        stage =
          "RENDER_PROTECTED_REVIEW_" +
          evidence[index].role +
          "_PAGE_" +
          pageNumber;
        const imagePrefix =
          "/vercel/sandbox/review-" + index + "-" + pageNumber;
        const imagePath = imagePrefix + ".png";
        await commandSucceeded(scanner, {
          cmd: "pdftoppm",
          args: [
            "-f",
            String(pageNumber),
            "-l",
            String(pageNumber),
            "-singlefile",
            "-png",
            "-r",
            "180",
            paths[index],
            imagePrefix,
          ],
        });
        const imageBuffer = await scanner.readFileToBuffer({
          path: imagePath,
        });
        if (!imageBuffer) {
          throw new Error("rendered review page missing");
        }
        const imageBytes = new Uint8Array(imageBuffer);
        if (
          imageBytes.byteLength < 1024 ||
          imageBytes[0] !== 0x89 ||
          imageBytes[1] !== 0x50 ||
          imageBytes[2] !== 0x4e ||
          imageBytes[3] !== 0x47
        ) {
          throw new Error("rendered review page rejected");
        }

        const roleSlug =
          evidence[index].role === "CADASTRAL_SURVEY" ? "survey" : "layout";
        const objectRef =
          "item74h-public-review-pages/v1/" +
          roleSlug +
          "-page-" +
          pageNumber +
          ".png";
        const imageHash = hash(imageBuffer);
        const blob = await put(objectRef, imageBuffer, {
          access: "private",
          addRandomSuffix: false,
          allowOverwrite: true,
          contentType: "image/png",
          token,
        });
        if (
          !blob.url.startsWith("https://") ||
          !new URL(blob.url).hostname.endsWith(".private.blob.vercel-storage.com")
        ) {
          throw new Error("private review page host rejected");
        }
        const unauthenticated = await fetch(blob.url, {
          redirect: "manual",
          signal: AbortSignal.timeout(10_000),
        });
        if (unauthenticated.ok) {
          throw new Error("private review page allowed unauthenticated read");
        }
        const authenticated = await get(objectRef, {
          access: "private",
          token,
          storeId,
        });
        if (!authenticated || authenticated.statusCode !== 200) {
          throw new Error("authenticated private review page read failed");
        }
        const persistedBytes = new Uint8Array(
          await new Response(authenticated.stream).arrayBuffer(),
        );
        if (hash(persistedBytes) !== imageHash) {
          throw new Error("private review page hash mismatch");
        }
        const retainedRole = evidence[index].role;
        if (
          retainedRole !== "CADASTRAL_SURVEY" &&
          retainedRole !== "PROPOSED_SHED_LAYOUT"
        ) {
          throw new Error("protected review role rejected");
        }
        retainedReviewPages.push({
          role: retainedRole,
          pageRef: ("page-" + pageNumber) as "page-1" | "page-2" | "page-9",
          objectRef,
        });
      }

      const after = await commandSucceeded(scanner, {
        cmd: "sha256sum",
        args: [paths[index]],
      });
      if (
        !(await after.stdout()).trim().startsWith(evidence[index].contentHash)
      ) {
        throw new Error("review output hash mismatch");
      }
      findings.push({
        role: evidence[index].role,
        recordNumber: evidence[index].recordNumber,
        textExtractable: pages.some((page) => page.trim().length > 0),
        candidateCount: candidates.length,
        candidates,
      });
    }
  } catch {
    operationFailure = stage;
  } finally {
    if (operationFailure || retainedReviewPages.length !== 4) {
      for (const page of retainedReviewPages) {
        try {
          await del(page.objectRef, { token });
        } catch {
          // The gate remains failed closed; cleanup accounting below still applies.
        }
      }
      retainedReviewPages.length = 0;
    }

    let blobsRemoved = true;
    for (const document of evidence) {
      try {
        await del(document.objectRef, { token });
      } catch {
        blobsRemoved = false;
      }
    }
    let residualBlobs = 1;
    try {
      residualBlobs = (await list({ prefix: blobPrefix, limit: 100, token }))
        .blobs.length;
    } catch {
      residualBlobs = 1;
    }
    const scannerRemoved = await stopAndDelete(scanner);
    const prepRemoved = await stopAndDelete(prep, prepStopped);
    let snapshotRemoved = snapshotId === null;
    if (snapshotId) {
      try {
        const snapshot = await Snapshot.get({ snapshotId });
        await snapshot.delete();
        snapshotRemoved = await waitAbsent(
          () => Snapshot.get({ snapshotId: snapshotId as string }),
          true,
        );
      } catch (error) {
        snapshotRemoved =
          error instanceof APIError && error.response.status === 404;
      }
    }
    let residualSandboxes = 0;
    for (const name of [sandboxPrefix + "-prep", sandboxPrefix + "-scan"]) {
      if (!(await waitAbsent(() => Sandbox.get({ name })))) {
        residualSandboxes += 1;
      }
    }
    cleanupPassed =
      blobsRemoved &&
      residualBlobs === 0 &&
      scannerRemoved &&
      prepRemoved &&
      snapshotRemoved &&
      residualSandboxes === 0;
  }

  if (operationFailure) throw new DiscoveryFailure(operationFailure);
  if (!cleanupPassed || !findings) {
    throw new DiscoveryFailure("ZERO_RESIDUE_CLEANUP_FAILED");
  }
  if (
    retainedReviewPages.length !== 4 ||
    new Set(retainedReviewPages.map((page) => page.objectRef)).size !== 4
  ) {
    throw new DiscoveryFailure("PROTECTED_REVIEW_PAGE_CARDINALITY_REJECTED");
  }

  console.log(
    JSON.stringify({
      gate: "item74h-public-da-review-discovery",
      status: "PASS",
      environment: "preview",
      freshCleanScan: true,
      findingRoleCount: findings.length,
      retainedProtectedReviewPageCount: retainedReviewPages.length,
      retainedProtectedReviewPages: retainedReviewPages.map(
        ({ role, pageRef }) => ({ role, pageRef }),
      ),
      operatorDecisionRecorded: false,
      evidencePromotionPerformed: false,
      paidArtefactBindingsCreated: 0,
      cleanupSucceeded: true,
      residualResourceCount: 0,
      productionMutationPerformed: false,
      productionCheckoutEnabled: false,
      containsSecret: false,
      containsDownloadCapability: false,
      containsContentHash: false,
      containsFullDocument: false,
      containsRawScannerOutput: false,
    }),
  );

  for (const finding of findings) {
    const chunkSize = 6;
    const chunkCount = Math.max(
      1,
      Math.ceil(finding.candidates.length / chunkSize),
    );
    for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex += 1) {
      console.log(
        JSON.stringify({
          gate: "item74h-public-da-review-finding",
          status: "PASS",
          role: finding.role,
          recordNumber: finding.recordNumber,
          textExtractable: finding.textExtractable,
          candidateCount: finding.candidateCount,
          chunkIndex: chunkIndex + 1,
          chunkCount,
          candidates: finding.candidates.slice(
            chunkIndex * chunkSize,
            (chunkIndex + 1) * chunkSize,
          ),
          operatorDecisionRecorded: false,
          evidencePromotionPerformed: false,
          paidArtefactBindingsCreated: 0,
          productionCheckoutEnabled: false,
        }),
      );
    }
  }
};

void main().catch((error) => {
  console.error(
    JSON.stringify({
      gate: "item74h-public-da-review-discovery",
      status: "FAIL_CLOSED",
      errorCode:
        error instanceof DiscoveryFailure ? error.code : "UNCLASSIFIED",
      productionMutationPerformed: false,
      productionCheckoutEnabled: false,
      containsSecret: false,
      containsDownloadCapability: false,
      containsContentHash: false,
      containsFullDocument: false,
      containsRawScannerOutput: false,
    }),
  );
  process.exitCode = 1;
});
