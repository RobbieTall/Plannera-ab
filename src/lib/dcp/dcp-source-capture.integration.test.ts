import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test, vi } from "vitest";
import { readDcpSourceCapture } from "./dcp-source-capture";

vi.mock("@/lib/prisma", () => ({
  prisma: new Proxy({}, { get() { throw new Error("Global database access forbidden"); } }),
}));
vi.mock("pdf-parse", () => ({ __esModule: true, default: async () => ({
  text: "Source paragraph for in-memory ingestion exercise only. ".repeat(30),
}) }));

// Real importer execution with fake HTTP/PDF parsing and an in-memory transaction.
// No council downloads, cloud storage, database writes or real planning evidence.
for (const council of ["BYRON", "KEMPSEY"] as const) {
  for (const rejectFetch of [false, true]) {
    test(council + (rejectFetch ? " never opens a transaction after failed fetch" :
      " retains exact clause and fetched PDF fingerprints in its normal importer"), async () => {
      const originalFetch = globalThis.fetch;
      const bytes = Buffer.from("%PDF-1.4 in-memory source transport");
      const expectedPdfHash = createHash("sha256").update(bytes).digest("hex");
      let transactions = 0;
      const saved: Record<string, Array<Record<string, unknown>>> = {};
      const tx = Object.fromEntries(["instrument", "councilDocument", "clause", "dCPClause",
        "workspaceSourceChunk", "lgaCoverageState"].map(name => [name, {
          upsert: async () => ({ id: name + "-memory-id" }),
          deleteMany: async () => ({ count: 0 }),
          createMany: async ({ data }: { data: Array<Record<string, unknown>> }) => {
            saved[name] = data; return { count: data.length };
          },
        }]));
      const db = { $transaction: async (fn: (arg: unknown) => Promise<unknown>) => {
        transactions++; return fn(tx);
      } };
      const fakeFetch: typeof fetch = async (_input, options) => {
        assert.equal(options?.redirect, "error");
        if (rejectFetch) throw new Error("Synthetic fetch failure");
        return { ok: true, status: 200, arrayBuffer: async () => Uint8Array.from(bytes).buffer } as Response;
      };
      try {
        globalThis.fetch = fakeFetch;
        const execute = council === "BYRON"
          ? async () => (await import("./byron-ingestion")).ingestByronDcp(db as never, fakeFetch)
          : async () => (await import("./kempsey-ingestion")).ingestKempseyDcp(db as never);
        if (rejectFetch) {
          await assert.rejects(execute());
          assert.equal(transactions, 0);
        } else {
          await execute();
          assert.equal(transactions, 1);
          assert.ok(saved.dCPClause.length >= (council === "BYRON" ? 39 : 5));
          for (const row of saved.dCPClause) {
            const proof = readDcpSourceCapture(row.numericMeta,
              { council, bodyText: row.bodyText as string, now: new Date() });
            assert.ok(proof);
            assert.equal(proof.pdfSha256, expectedPdfHash);
            assert.equal(proof.bodyTextSha256, createHash("sha256").update(row.bodyText as string).digest("hex"));
            assert.equal(proof.sourceVersion, council === "BYRON" ? "byron-dcp-2014" : "kempsey-dcp-2026");
          }
        }
      } finally { globalThis.fetch = originalFetch; }
    });
  }
}
