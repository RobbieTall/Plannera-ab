import test from "node:test";
import assert from "node:assert/strict";
import { planDcpPreviewRefresh } from "./prepare-isolated-dcp-source-refresh.mjs";
const hash = "a".repeat(64);
function fixture(council = "BYRON") {
  const byron = council === "BYRON", count = byron ? 826 : 1496, sourceCount = byron ? 39 : 5;
  const receipts = Array.from({ length: sourceCount }, (_, i) => ({
    url: "https://www." + (byron ? "byron" : "kempsey") + ".nsw.gov.au/" + i + ".pdf",
    requestStartedAt: "2026-09-30T07:00:00Z", retrievedAt: "2026-09-30T07:00:01Z",
    httpStatus: 200, acquisition: "direct-https-official-council", pdfSha256: hash, bytes: 100,
  }));
  const rows = Array.from({ length: count }, (_, i) => ({
    id: "row_" + i, ref: "1", parentRef: "Chapter " + i, instrumentSlug: byron ? "byron-dcp-2014" : "kempsey-dcp-2026",
    sourceUrl: receipts[i % sourceCount].url, bodyTextSha256: hash, metadataSha256: hash, hasCapture: false,
  }));
  return { council, projectId: "red-term-77984898", branchId: byron ? "br-blue-dawn-a733pff4" : "br-royal-breeze-a75t8c41",
    databaseName: "neondb", rows, receipts,
    parsedRows: rows.map(r => ({ ref: r.ref, parentRef: r.parentRef, body_sha256: r.bodyTextSha256, source_url: r.sourceUrl })),
    now: new Date("2026-09-30T08:00:00Z") };
}
for (const council of ["BYRON", "KEMPSEY"]) test(council + " produces only a scoped metadata plan", () => {
  const result = planDcpPreviewRefresh(fixture(council));
  assert.equal(result.expectedRecords, council === "BYRON" ? 826 : 1496);
  const sql = result.statements.join("\n");
  assert.match(sql, /LOCK TABLE public\."DCPClause"/);
  assert.match(sql, /metadataSha256/);
  assert.match(sql, /GET DIAGNOSTICS changed = ROW_COUNT/);
  assert.doesNotMatch(sql, /DELETE FROM|TRUNCATE|ALTER TABLE|SET "bodyText"|INSERT INTO public/);
});
for (const [name, mutate] of [
  ["Production branch", x => x.branchId = "br-odd-pine-a7nph47f"],
  ["other council branch", x => x.branchId = "br-royal-breeze-a75t8c41"],
  ["wrong project", x => x.projectId = "other"],
  ["wrong database", x => x.databaseName = "other"],
  ["unparsed row", x => x.parsedRows[0].body_sha256 = "b".repeat(64)],
  ["duplicate row identity", x => x.rows[1].id = x.rows[0].id],
  ["existing capture", x => x.rows[0].hasCapture = true],
  ["wrong instrument", x => x.rows[0].instrumentSlug = "other"],
  ["missing inventory row", x => x.rows.pop()],
  ["missing original", x => x.receipts.pop()],
  ["duplicate original", x => x.receipts[1] = x.receipts[0]],
  ["unofficial source", x => x.receipts[0].url = "https://example.com/0.pdf"],
  ["failed download", x => x.receipts[0].httpStatus = 302],
  ["invented acquisition", x => x.receipts[0].acquisition = "database-timestamp"],
  ["missing actual retrieval time", x => delete x.receipts[0].retrievedAt],
  ["future retrieval", x => x.receipts[0].retrievedAt = "2026-10-01T07:00:00Z"],
  ["stale original", x => x.now = new Date("2026-10-08T08:00:00Z")],
  ["invalid digest", x => x.rows[0].metadataSha256 = "not-a-sha"],
  ["malicious row id", x => x.rows[0].id = "'; DROP TABLE x; --"],
]) test("rejects " + name, () => {
  const input = fixture(); mutate(input);
  assert.throws(() => planDcpPreviewRefresh(input), /precondition_failed/);
});
test("reference text remains SQL data", () => {
  const input = fixture(); input.rows[0].ref = "O'Brien"; input.parsedRows[0].ref = "O'Brien";
  const result = planDcpPreviewRefresh(input);
  assert.ok(result.statements[4].includes("O''Brien"));
});
test("metadata guard preserves duplicate human references and exact source evidence", () => {
  const result = planDcpPreviewRefresh(fixture());
  assert.equal(result.expectedRecords, 826);
  assert.match(result.statements[5], /IS DISTINCT FROM x\."parentRef"/);
  assert.match(result.statements[5], /sourceCapture/);
  assert.match(result.statements[5], /synthetic/);
});
