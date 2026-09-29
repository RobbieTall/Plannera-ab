import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { captureDcpSource, readDcpSourceCapture, DCP_SOURCE_CAPTURE_MAX_AGE_MS } from "../src/lib/dcp/dcp-source-capture";

const now = new Date("2026-09-29T06:00:00Z");
const body = "In-memory ingestion text, not an actual planning rule.";
const pdfSha256 = createHash("sha256").update("%PDF-1.4 in-memory test").digest("hex");
function fixture(council: "BYRON" | "KEMPSEY" = "BYRON") {
  const input = { council, sourceUrl: "https://www." + council.toLowerCase() + ".nsw.gov.au/plans/test.pdf",
    sourceVersion: council.toLowerCase() + "-dcp-edition", retrievedAt: "2026-09-29T05:00:00Z",
    pdfSha256, bodyText: body };
  return { input, metadata: { sourceUrl: input.sourceUrl, sourceCapture: captureDcpSource(input, now) },
    expected: { council, bodyText: body, now } };
}
for (const council of ["BYRON", "KEMPSEY"] as const) {
  test(council + " preserves PDF and exact stored-text hashes without relabelling retrieval time", () => {
    const f = fixture(council);
    const read = readDcpSourceCapture(f.metadata, f.expected)!;
    assert.equal(read.retrievedAt, new Date(f.input.retrievedAt).toISOString());
    assert.equal(read.pdfSha256, pdfSha256);
    assert.equal(read.bodyTextSha256, createHash("sha256").update(body).digest("hex"));
    assert.notEqual(read.bodyTextSha256, read.pdfSha256);
  });
}
test("legacy metadata and composite hashes cannot become source capture", () => {
  const f = fixture();
  for (const metadata of [null, {}, { sourceUrl: f.input.sourceUrl, contentHash: pdfSha256,
    createdAt: now.toISOString(), updatedAt: now.toISOString() }]) {
    assert.equal(readDcpSourceCapture(metadata, f.expected), null);
  }
});
test("other-council source cannot be substituted", () => {
  const f = fixture();
  assert.equal(readDcpSourceCapture(f.metadata, { ...f.expected, council: "KEMPSEY" }), null);
});
test("changed stored text or either invalid fingerprint is rejected", () => {
  const f = fixture();
  assert.equal(readDcpSourceCapture(f.metadata, { ...f.expected, bodyText: body + " changed" }), null);
  for (const field of ["pdfSha256", "bodyTextSha256"]) {
    assert.equal(readDcpSourceCapture({ ...f.metadata, sourceCapture: {
      ...f.metadata.sourceCapture, [field]: "invalid" } }, f.expected), null);
  }
});
test("future, expired and invalid fetch times fail closed", () => {
  const f = fixture();
  for (const time of ["invalid", new Date(now.getTime() + 1).toISOString(),
    new Date(now.getTime() - DCP_SOURCE_CAPTURE_MAX_AGE_MS).toISOString()]) {
    assert.throws(() => captureDcpSource({ ...f.input, retrievedAt: time }, now), /dcp_source_capture_invalid/);
  }
});
test("untrusted, cross-council, credential-bearing and non-PDF URLs are rejected", () => {
  const f = fixture();
  for (const url of ["https://example.com/a.pdf", "https://www.kempsey.nsw.gov.au/a.pdf",
    "http://www.byron.nsw.gov.au/a.pdf", "https://user:pass@www.byron.nsw.gov.au/a.pdf",
    "https://www.byron.nsw.gov.au/a.pdf?token=example", "https://www.byron.nsw.gov.au/index.html"]) {
    assert.throws(() => captureDcpSource({ ...f.input, sourceUrl: url }, now), /dcp_source_capture_invalid/);
  }
});
test("metadata URL must equal its captured source URL", () => {
  const f = fixture();
  assert.equal(readDcpSourceCapture({ ...f.metadata, sourceUrl: "https://www.byron.nsw.gov.au/other.pdf" }, f.expected), null);
});
test("empty or excessive text is not retained", () => {
  const f = fixture();
  for (const bodyText of ["", " ", "x".repeat(2 * 1024 * 1024 + 1)]) {
    assert.throws(() => captureDcpSource({ ...f.input, bodyText }, now), /dcp_source_capture_invalid/);
  }
});
test("explicit synthetic and untrusted markers are not promoted", () => {
  const f = fixture();
  for (const marker of [{ synthetic: true }, { fixture: true }, { authoritative: false }]) {
    assert.equal(readDcpSourceCapture({ ...f.metadata, ...marker }, f.expected), null);
    assert.equal(readDcpSourceCapture({ ...f.metadata, sourceCapture: { ...f.metadata.sourceCapture, ...marker } }, f.expected), null);
  }
});
