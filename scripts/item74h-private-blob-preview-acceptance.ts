import { randomUUID } from "node:crypto";

import { del, get, list, put } from "@vercel/blob";
import { Sandbox } from "@vercel/sandbox";

import {
  createItem74hPrivateBlobFailureDiagnostic,
  type Item74hPrivateBlobAcceptanceStage,
} from "../src/lib/item74h-private-blob-acceptance-diagnostics";
import { resolveItem74hPrivateBlobAuth } from "../src/lib/item74h-private-blob-auth";
import { resolveItem74hSandboxAuth } from "../src/lib/item74h-sandbox-auth";

import {
  runPathwayPrivateBlobAcceptance,
  type PathwayPrivateBlobAcceptanceDependencies,
} from "../src/lib/pathway-private-evidence-blob-acceptance";

// Never emit raw provider failures: only allowlisted diagnostics leave this process.
let currentStage: Item74hPrivateBlobAcceptanceStage = "INITIALIZE";

const main = async () => {
  const enabled =
    process.env.ITEM74H_PRIVATE_EVIDENCE_ACCEPTANCE_ENABLED === "true";

  if (!enabled) {
    console.log(
      JSON.stringify({
        gate: "item74h-private-blob-preview",
        status: "SKIPPED_FEATURE_DISABLED",
        productionCheckoutEnabled: false,
      }),
    );
    process.exit(0);
  }

  if (process.env.VERCEL_ENV !== "preview") {
    throw new Error("Item 74H private Blob acceptance is Preview-only");
  }
  if (
    process.env.PLANNING_PACK_CHECKOUT_ENABLED === "true" ||
    process.env.SUBMISSION_SEE_CHECKOUT_ENABLED === "true"
  ) {
    throw new Error("Paid checkout must remain disabled during Item 74H acceptance");
  }

  currentStage = "RESOLVE_AUTH";
  const blobAuth = resolveItem74hPrivateBlobAuth();
  const sandboxAuth = resolveItem74hSandboxAuth();

  const objectRef = `ev_${randomUUID().replaceAll("-", "")}`;
  const bytes = new TextEncoder().encode(
    JSON.stringify({ schema: "item74h-synthetic.v1", synthetic: true }),
  );
  const privateUrls = new Map<string, string>();

  const findExact = async (ref: string) => {
    const result = await list({ prefix: ref, limit: 2, ...blobAuth });
    return result.blobs.filter((blob) => blob.pathname === ref);
  };

  const deps: PathwayPrivateBlobAcceptanceDependencies = {
    putOrReuse: async ({ objectRef: ref, bytes: body }) => {
      currentStage = "BLOB_PUT_OR_REUSE";
      const existing = await findExact(ref);
      if (existing.length > 1) {
        throw new Error("Private Blob replay found duplicate opaque objects");
      }
      if (existing.length === 1) {
        privateUrls.set(ref, existing[0].url);
        return { created: false };
      }

      const blob = await put(ref, Buffer.from(body), {
        access: "private",
        ...blobAuth,
        addRandomSuffix: false,
        allowOverwrite: false,
        contentType: "application/json",
        cacheControlMaxAge: 60,
      });
      const hostname = new URL(blob.url).hostname;
      if (!/^[a-z0-9-]+\.private\.blob\.vercel-storage\.com$/.test(hostname)) {
        await del(blob.url, { ...blobAuth }).catch(() => {});
        throw new Error("Private Blob returned a non-private host");
      }
      privateUrls.set(ref, blob.url);
      return { created: true };
    },
    countObjects: async ({ objectRef: ref }) => {
      currentStage = "BLOB_COUNT";
      return (await findExact(ref)).length;
    },
    assertUnauthenticatedReadDenied: async ({ objectRef: ref }) => {
      currentStage = "UNAUTHENTICATED_READ";
      const url = privateUrls.get(ref);
      if (!url) throw new Error("Private object handle is unavailable");
      const response = await fetch(url, { redirect: "manual" });
      return !response.ok;
    },
    readAuthenticated: async ({ objectRef: ref }) => {
      currentStage = "AUTHENTICATED_READ";
      const result = await get(ref, { access: "private", ...blobAuth });
      if (!result || result.statusCode !== 200) {
        throw new Error("Authenticated private Blob read failed");
      }
      return new Uint8Array(await new Response(result.stream).arrayBuffer());
    },
    runIsolatedHashCheck: async ({ bytes: body, contentHash }) => {
      currentStage = "SANDBOX_HASH_CHECK";
      const sandbox = await Sandbox.create({
        ...sandboxAuth,
        runtime: "node22",
        persistent: false,
        timeout: 60_000,
        networkPolicy: "deny-all",
      });
      try {
        await sandbox.writeFiles([
          {
            path: "/vercel/sandbox/evidence.synthetic",
            content: Buffer.from(body),
            mode: 0o600,
          },
        ]);
        const hash = await sandbox.runCommand("sha256sum", [
          "/vercel/sandbox/evidence.synthetic",
        ]);
        const hashMatch =
          hash.exitCode === 0 && (await hash.stdout()).trim().startsWith(contentHash);
        const network = await sandbox.runCommand("curl", [
          "--fail",
          "--silent",
          "--show-error",
          "--max-time",
          "5",
          "https://example.com",
        ]);
        return {
          hashMatch,
          networkDenied: network.exitCode !== 0,
          stopped: true,
        };
      } finally {
        await sandbox.stop();
      }
    },
    deleteObject: async ({ objectRef: ref }) => {
      currentStage = "BLOB_CLEANUP";
      const privateUrl = privateUrls.get(ref);
      await del(privateUrl ?? ref, { ...blobAuth });
      privateUrls.delete(ref);
    },
  };

  currentStage = "ACCEPTANCE_SEQUENCE";
  const report = await runPathwayPrivateBlobAcceptance(
    { objectRef, bytes },
    deps,
  );

  currentStage = "COMPLETE";
  console.log(
    JSON.stringify({
      gate: "item74h-private-blob-preview",
      status: "PASS",
      ...report,
    }),
  );
};

void main().catch((error: unknown) => {
  console.error(
    JSON.stringify(
      createItem74hPrivateBlobFailureDiagnostic(currentStage, error),
    ),
  );
  process.exitCode = 1;
});
