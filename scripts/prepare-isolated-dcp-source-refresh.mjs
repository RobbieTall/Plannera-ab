import { createHash } from "node:crypto";

// Pure planning only: no network, credentials, database client or CLI execution.
const TARGETS = Object.freeze({
  BYRON: { branchId: "br-blue-dawn-a733pff4", slug: "byron-dcp-2014", count: 826, sources: 39, version: "Byron DCP 2014" },
  KEMPSEY: { branchId: "br-royal-breeze-a75t8c41", slug: "kempsey-dcp-2026", count: 1496, sources: 5, version: "Kempsey DCP 2026" },
});
const digest = value => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const fail = () => { throw new Error("dcp_preview_refresh_precondition_failed"); };
const literal = value => "'" + String(value).replaceAll("'", "''") + "'";
const identity = (row, council, parsed = false) => JSON.stringify([
  row.ref, council === "BYRON" ? row.parentRef : null,
  parsed ? row.body_sha256 : row.bodyTextSha256,
  parsed ? row.source_url : row.sourceUrl,
]);

export function planDcpPreviewRefresh({ council, projectId, branchId, databaseName, rows, parsedRows, receipts, now }) {
  const target = TARGETS[council];
  if (!target || projectId !== "red-term-77984898" || branchId !== target.branchId ||
      databaseName !== "neondb" || !(now instanceof Date) || !Number.isFinite(now.getTime()) ||
      !Array.isArray(rows) || rows.length !== target.count || !Array.isArray(parsedRows) ||
      parsedRows.length !== target.count || !Array.isArray(receipts) || receipts.length !== target.sources) fail();
  const sources = new Map();
  for (const receipt of receipts) {
    let url;
    try { url = new URL(receipt.url); } catch { fail(); }
    const host = council === "BYRON" ? "www.byron.nsw.gov.au" : "www.kempsey.nsw.gov.au";
    const start = Date.parse(receipt.requestStartedAt), end = Date.parse(receipt.retrievedAt);
    if (url.protocol !== "https:" || url.hostname !== host || url.port || url.username || url.password ||
        url.search || url.hash || !url.pathname.endsWith(".pdf") || receipt.url.length > 500 ||
        receipt.httpStatus !== 200 || receipt.acquisition !== "direct-https-official-council" ||
        !digest(receipt.pdfSha256) || !Number.isSafeInteger(receipt.bytes) || receipt.bytes < 5 ||
        !Number.isFinite(start) || !Number.isFinite(end) || start > end || end > now.getTime() ||
        now.getTime() - end >= 7 * 86400000 || sources.has(receipt.url)) fail();
    sources.set(receipt.url, {
      schema: "dcp-source-capture.v1", council, sourceUrl: receipt.url,
      sourceVersion: target.version + "; original PDF SHA-256 " + receipt.pdfSha256,
      retrievedAt: new Date(end).toISOString(), pdfSha256: receipt.pdfSha256,
    });
  }
  const remaining = new Map();
  for (const row of parsedRows) {
    if (!digest(row.body_sha256) || !sources.has(row.source_url) || typeof row.ref !== "string" ||
        (council === "BYRON" && typeof row.parentRef !== "string")) fail();
    const key = identity(row, council, true);
    remaining.set(key, (remaining.get(key) || 0) + 1);
  }
  const ids = new Set(), usedSources = new Set();
  const updates = rows.map(row => {
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(row.id) || ids.has(row.id) ||
        row.instrumentSlug !== target.slug || row.hasCapture !== false ||
        !digest(row.bodyTextSha256) || !digest(row.metadataSha256) ||
        typeof row.ref !== "string" || !(row.parentRef === null || typeof row.parentRef === "string")) fail();
    ids.add(row.id);
    const key = identity(row, council);
    if (!(remaining.get(key) > 0)) fail();
    remaining.set(key, remaining.get(key) - 1);
    usedSources.add(row.sourceUrl);
    return {
      id: row.id, ref: row.ref, parentRef: row.parentRef, instrumentSlug: row.instrumentSlug,
      sourceUrl: row.sourceUrl, bodyTextSha256: row.bodyTextSha256, metadataSha256: row.metadataSha256,
      capture: { ...sources.get(row.sourceUrl), bodyTextSha256: row.bodyTextSha256 },
    };
  });
  if ([...remaining.values()].some(Boolean) || usedSources.size !== sources.size) fail();
  updates.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const payload = JSON.stringify(updates);
  const count = updates.length;
  const statements = [
    "SET LOCAL lock_timeout = '5s'",
    "SET LOCAL statement_timeout = '30s'",
    "SET LOCAL standard_conforming_strings = on",
    'LOCK TABLE public."DCPClause" IN SHARE ROW EXCLUSIVE MODE',
    'CREATE TEMP TABLE dcp_preview_refresh_input ON COMMIT DROP AS SELECT * FROM jsonb_to_recordset(' + literal(payload) +
      '::jsonb) AS x(id text, ref text, "parentRef" text, "instrumentSlug" text, "sourceUrl" text, "bodyTextSha256" text, "metadataSha256" text, capture jsonb)',
    `DO $dcp_refresh_guard$
DECLARE changed integer;
BEGIN
  IF current_database() <> 'neondb'
     OR (SELECT count(*) FROM public."DCPClause" WHERE "lgaCode" = ${literal(council)}) <> ${count}
     OR (SELECT count(DISTINCT id) FROM pg_temp.dcp_preview_refresh_input) <> ${count}
  THEN RAISE EXCEPTION 'dcp_preview_refresh_inventory_changed'; END IF;
  IF EXISTS (
    SELECT 1 FROM pg_temp.dcp_preview_refresh_input x
    LEFT JOIN public."DCPClause" d ON d.id = x.id
    WHERE d.id IS NULL OR d."lgaCode" IS DISTINCT FROM ${literal(council)}
      OR d.ref IS DISTINCT FROM x.ref OR d."parentRef" IS DISTINCT FROM x."parentRef"
      OR d."instrumentSlug" IS DISTINCT FROM x."instrumentSlug"
      OR jsonb_typeof(d."numericMeta") IS DISTINCT FROM 'object'
      OR d."numericMeta"->>'sourceUrl' IS DISTINCT FROM x."sourceUrl"
      OR d."numericMeta" ? 'sourceCapture'
      OR d."numericMeta"->>'synthetic' = 'true' OR d."numericMeta"->>'fixture' = 'true'
      OR d."numericMeta"->>'authoritative' = 'false'
      OR encode(sha256(convert_to(d."bodyText", 'UTF8')), 'hex') IS DISTINCT FROM x."bodyTextSha256"
      OR encode(sha256(convert_to(COALESCE(d."numericMeta"::text, 'null'), 'UTF8')), 'hex') IS DISTINCT FROM x."metadataSha256"
      OR octet_length(d."bodyText") > 2097152 OR btrim(d."bodyText") = ''
      OR (x.capture->>'retrievedAt')::timestamptz > clock_timestamp()
      OR (x.capture->>'retrievedAt')::timestamptz <= clock_timestamp() - interval '7 days'
  ) THEN RAISE EXCEPTION 'dcp_preview_refresh_evidence_changed'; END IF;
  UPDATE public."DCPClause" d
    SET "numericMeta" = d."numericMeta" || jsonb_build_object('sourceCapture', x.capture),
        "updatedAt" = CURRENT_TIMESTAMP
    FROM pg_temp.dcp_preview_refresh_input x
    WHERE d.id = x.id AND d."lgaCode" = ${literal(council)};
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> ${count} THEN RAISE EXCEPTION 'dcp_preview_refresh_count_changed'; END IF;
END $dcp_refresh_guard$`,
    `SELECT ${literal(council)} AS council, count(*)::integer AS captured_records,
      bool_and(d."numericMeta"->'sourceCapture' = x.capture) AS captures_match,
      bool_and(encode(sha256(convert_to(d."bodyText",'UTF8')),'hex') = x."bodyTextSha256") AS bodies_unchanged
      FROM public."DCPClause" d JOIN pg_temp.dcp_preview_refresh_input x ON d.id = x.id
      WHERE d."lgaCode" = ${literal(council)}`,
  ];
  return { schema: "isolated-dcp-refresh-plan.v1", council, projectId, branchId, databaseName,
    expectedRecords: count, originalSources: sources.size,
    payloadSha256: createHash("sha256").update(payload).digest("hex"), statements };
}
