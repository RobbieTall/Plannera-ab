import { randomUUID } from "node:crypto";

import { del, get, list, put } from "@vercel/blob";
import { Sandbox } from "@vercel/sandbox";

import {
  runPathwayPrivateBlobAcceptance,
  type PathwayPrivateBlobAcceptanceDependencies,
} from "../src/lib/pathway-private-evidence-blob-acceptance";

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

const token = process.env.ITEM74H_PRIVATE_BLOB_READ_WRITE_TOKEN;
const storeId = process.env.ITEM74H_PRIVATE_BLOB_STORE_ID;
if (!token || !storeId) {
  throw new Error("Dedicated Preview private Blob configuration is unavailable");
}

const objectRef = `ev_${randomUUID().replaceAll("-", "")}`;
const bytes = new TextEncoder().encode(
  JSON.stringify({ schema: "item74h-synthetic.v1", synthetic: true }),
);
const privateUrls = new Map<string, string>();

const findExact = async (ref: string) => {
  const result = await list({ prefix: ref, limit: 2, token });
  return result.blobs.filter((blob) => blob.pathname === ref);
};

const deps: PathwayPrivateBlobAcceptanceDependencies = {
  putOrReuse: async ({ objectRef: ref, bytes: body }) => {
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
      token,
      storeId,
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: "application/json",
      cacheControlMaxAge: 60,
    });
    const hostname = new URL(blob.url).hostname;
    if (!/^[a-z0-9-]+\.private\.blob\.vercel-storage\.com$/.test(hostname)) {
      await del(ref, { token }).catch(() => {});
      throw new Error("Private Blob returned a non-private host");
    }
    privateUrls.set(ref, blob.url);
    return { created: true };
  },
  countObjects: async ({ objectRef: ref }) => (await findExact(ref)).length,
  assertUnauthenticatedReadDenied: async ({ objectRef: ref }) => {
    const url = privateUrls.get(ref);
    if (!url) throw new Error("Private object handle is unavailable");
    const response = await fetch(url, { redirect: "manual" });
    return !response.ok;
  },
  readAuthenticated: async ({ objectRef: ref }) => {
    const result = await get(ref, { access: "private", token, storeId });
    if (!result || result.statusCode !== 200) {
      throw new Error("Authenticated private Blob read failed");
    }
    return new Uint8Array(await new Response(result.stream).arrayBuffer());
  },
  runIsolatedHashCheck: async ({ bytes: body, contentHash }) => {
    const sandbox = await Sandbox.create({
      runtime: "node22",
      persistent: false,
      timeout: 60_000,
      networkPolicy: "deny-all",
    });
    let stopped = false;
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
      stopped = true;
      if (!stopped) throw new Error("Sandbox cleanup failed");
    }
  },
  deleteObject: async ({ objectRef: ref }) => {
    await del(ref, { token });
    privateUrls.delete(ref);
  },
};

const report = await runPathwayPrivateBlobAcceptance(
  { objectRef, bytes },
  deps,
);

console.log(
  JSON.stringify({
    gate: "item74h-private-blob-preview",
    status: "PASS",
    ...report,
  }),
);
};

void main().catch(() => {
  console.error("Item 74H private Blob acceptance failed closed");
  process.exitCode = 1;
});
