import { createHash } from "node:crypto";

const SHA = value => createHash("sha256").update(value, "utf8").digest("hex");
const digest = value => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const literal = value => "'" + String(value).replaceAll("'", "''") + "'";
const fail = () => { throw new Error("isolated_lep_refresh_precondition_failed"); };

// Date-pinned operator-reviewed rehearsal inputs, NOT an automatic freshness feed.
// completedAt is observed manual-download file completion, never an HTTP receipt.
export const MANUAL_LEP_SNAPSHOTS = Object.freeze({
  BYRON: Object.freeze({
    branchId: "br-blue-dawn-a733pff4", prefix: "BYRON_2014", mainCount: 93,
    name: "Byron Local Environmental Plan 2014", instrument: "epi-2014-0297",
    originalSha256: "42196389383aa5a424fd8d9b619b473d4df28a1061b672f1e5c2aceff869f821",
    completedAt: "2026-09-30T06:40:24.108Z", versionId: "3b18cafa-cf70-402d-83d9-8ef1f17d0c4e",
  }),
  KEMPSEY: Object.freeze({
    branchId: "br-royal-breeze-a75t8c41", prefix: "KEMP_2013", mainCount: 80,
    name: "Kempsey Local Environmental Plan 2013", instrument: "epi-2013-0712",
    originalSha256: "ee5269d8709cad6615a59ccd02d99bdbff485d9d699130c8c4c5d4417e438720",
    completedAt: "2026-09-30T06:43:25.975Z", versionId: "77285005-6e77-4d8a-ae77-da49d3ccbb54",
  }),
});

export function planIsolatedLepRefresh({ council, projectId, branchId, databaseName,
  receipt, history, parsed, statuses, now }) {
  const spec = MANUAL_LEP_SNAPSHOTS[council];
  if (!spec || projectId !== "red-term-77984898" || branchId !== spec.branchId ||
      databaseName !== "neondb" || receipt?.acquisition !== "user-manual-official-browser-download" ||
      receipt.originalSha256 !== spec.originalSha256 || receipt.versionId !== spec.versionId ||
      receipt.localFileModifiedAt !== spec.completedAt || receipt.httpRetrievedAt !== null ||
      !(now instanceof Date) || !Number.isFinite(now.getTime()) ||
      now.getTime() < Date.parse(spec.completedAt) || now.getTime() - Date.parse(spec.completedAt) >= 7 * 86400000 ||
      !Array.isArray(history) || !history.length || !Array.isArray(parsed) ||
      !Array.isArray(statuses) || statuses.length !== spec.mainCount) fail();
  const instrument = history[0];
  if (!/^[A-Za-z0-9_-]+$/.test(instrument.instrumentId) || instrument.name !== spec.name) fail();
  const rowIds = new Set(), versions = new Set();
  for (const row of history) {
    const versionKey = row.clauseKey + ":" + row.version;
    if (!/^[A-Za-z0-9_-]+$/.test(row.id) || rowIds.has(row.id) || versions.has(versionKey) ||
        row.instrumentId !== instrument.instrumentId || row.name !== spec.name ||
        row.sourceUrl !== instrument.sourceUrl || row.instrumentUpdatedAt !== instrument.instrumentUpdatedAt ||
        !Number.isInteger(row.version) || row.version < 1 || typeof row.isCurrent !== "boolean" ||
        !digest(row.contentHash) || !digest(row.bodyTextSha256) || !digest(row.bodyHtmlSha256) ||
        !Array.isArray(row.hierarchyPath) || !Number.isFinite(Date.parse(row.updatedAt))) fail();
    rowIds.add(row.id); versions.add(versionKey);
  }
  const parsedByKey = new Map();
  for (const row of parsed) {
    if (parsedByKey.has(row.clauseKey) || typeof row.bodyText !== "string" ||
        typeof row.bodyHtml !== "string" || row.contentHash !== SHA(row.bodyText)) fail();
    parsedByKey.set(row.clauseKey, row);
  }
  const seenKeys = new Set(), seenXmlIds = new Set(), operations = [];
  for (const status of statuses) {
    if (!/^sec\.[1-9]\d*\.[1-9]\d*[A-Z]?$/.test(status.xmlId) ||
        typeof status.number !== "string" || !/^[1-9]\d*\.[1-9]\d*[A-Z]?(?:,\s*[1-9]\d*\.[1-9]\d*[A-Z]?)*$/.test(status.number) ||
        status.xmlId !== "sec." + status.number.split(",")[0].trim() ||
        !["operative", "repealed"].includes(status.status) || seenXmlIds.has(status.xmlId)) fail();
    const key = spec.prefix + "_" + status.number.replace(/[^A-Za-z0-9]+/g, "_").toUpperCase();
    if (seenKeys.has(key)) fail();
    seenKeys.add(key); seenXmlIds.add(status.xmlId);
    const priorVersions = history.filter(row => row.clauseKey === key);
    const current = priorVersions.filter(row => row.isCurrent);
    if (current.length > 1) fail();
    const prior = current[0];
    if (status.status === "repealed") {
      if (prior) operations.push({ action: "retire", id: prior.id, clauseKey: key });
      continue;
    }
    const next = parsedByKey.get(key);
    if (!next || !next.bodyText.trim() || Buffer.byteLength(next.bodyText) > 2097152 ||
        !next.title || !Array.isArray(next.hierarchyPath)) fail();
    const unchanged = prior && prior.contentHash === next.contentHash &&
      prior.bodyTextSha256 === SHA(next.bodyText) && prior.bodyHtmlSha256 === SHA(next.bodyHtml) &&
      prior.title === next.title && JSON.stringify(prior.hierarchyPath) === JSON.stringify(next.hierarchyPath);
    if (unchanged) operations.push({ action: "revalidate", id: prior.id, clauseKey: key });
    else {
      const version = 1 + Math.max(0, ...priorVersions.map(row => row.version));
      operations.push({ action: prior ? "version" : "add", id: prior?.id ?? null, clauseKey: key,
        nextId: "see_lep_" + key.toLowerCase() + "_v" + version + "_" + spec.originalSha256.slice(0, 12),
        version, title: next.title, bodyHtml: next.bodyHtml, bodyText: next.bodyText,
        hierarchyPath: next.hierarchyPath, contentHash: next.contentHash });
    }
  }
  const sourceUrl = "https://legislation.nsw.gov.au/view/html/inforce/2026-09-30/" + spec.instrument;
  const old = history.map(({ id, clauseKey, title, hierarchyPath, contentHash, version, isCurrent,
    retrievedAt, effectiveFrom, effectiveTo, updatedAt, bodyTextSha256, bodyHtmlSha256 }) => ({
      id, clauseKey, title, hierarchyPath, contentHash, version, isCurrent,
      retrievedAt, effectiveFrom, effectiveTo, updatedAt, bodyTextSha256, bodyHtmlSha256,
    }));
  const counts = operations.reduce((out, row) => { out[row.action] = (out[row.action] || 0) + 1; return out; }, {});
  const statementCount = operations.filter(x => ["revalidate", "retire", "version"].includes(x.action)).length;
  const insertCount = (counts.version || 0) + (counts.add || 0);
  const payload = JSON.stringify({ receipt, history: old, operations });
  const statements = [
    "SET LOCAL lock_timeout = '5s'",
    "SET LOCAL statement_timeout = '30s'",
    "SET LOCAL standard_conforming_strings = on",
    'LOCK TABLE public."Instrument", public."Clause" IN SHARE ROW EXCLUSIVE MODE',
    'CREATE TEMP TABLE lep_refresh_history ON COMMIT DROP AS SELECT * FROM jsonb_to_recordset(' + literal(JSON.stringify(old)) +
      '::jsonb) AS x(id text, "clauseKey" text, title text, "hierarchyPath" text[], "contentHash" text, version integer, "isCurrent" boolean, "retrievedAt" text, "effectiveFrom" text, "effectiveTo" text, "updatedAt" text, "bodyTextSha256" text, "bodyHtmlSha256" text)',
    'CREATE TEMP TABLE lep_refresh_operations ON COMMIT DROP AS SELECT * FROM jsonb_to_recordset(' + literal(JSON.stringify(operations)) +
      '::jsonb) AS x(action text, id text, "clauseKey" text, "nextId" text, version integer, title text, "bodyHtml" text, "bodyText" text, "hierarchyPath" text[], "contentHash" text)',
    `DO $lep_refresh_guard$
DECLARE changed integer; inserted integer;
BEGIN
  IF current_database() <> 'neondb' OR
     (SELECT count(*) FROM public."Instrument" WHERE id = ${literal(instrument.instrumentId)}
       AND name = ${literal(spec.name)} AND "instrumentType" = 'LEP'
       AND "sourceUrl" = ${literal(instrument.sourceUrl)}
       AND "updatedAt" = ${literal(instrument.instrumentUpdatedAt)}::timestamp) <> 1
     OR (SELECT count(*) FROM public."Clause" WHERE "instrumentId" = ${literal(instrument.instrumentId)}) <> ${history.length}
  THEN RAISE EXCEPTION 'lep_refresh_inventory_changed'; END IF;
  IF EXISTS (
    SELECT 1 FROM pg_temp.lep_refresh_history x LEFT JOIN public."Clause" c ON c.id = x.id
    WHERE c.id IS NULL OR c."instrumentId" IS DISTINCT FROM ${literal(instrument.instrumentId)}
      OR c."clauseKey" IS DISTINCT FROM x."clauseKey" OR c.version IS DISTINCT FROM x.version
      OR c."isCurrent" IS DISTINCT FROM x."isCurrent" OR c.title IS DISTINCT FROM x.title
      OR c."hierarchyPath" IS DISTINCT FROM x."hierarchyPath" OR c."contentHash" IS DISTINCT FROM x."contentHash"
      OR c."updatedAt" IS DISTINCT FROM x."updatedAt"::timestamp
      OR c."retrievedAt" IS DISTINCT FROM x."retrievedAt"::timestamp
      OR c."effectiveFrom" IS DISTINCT FROM x."effectiveFrom"::timestamp
      OR c."effectiveTo" IS DISTINCT FROM x."effectiveTo"::timestamp
      OR encode(sha256(convert_to(c."bodyText",'UTF8')),'hex') IS DISTINCT FROM x."bodyTextSha256"
      OR encode(sha256(convert_to(c."bodyHtml",'UTF8')),'hex') IS DISTINCT FROM x."bodyHtmlSha256"
  ) THEN RAISE EXCEPTION 'lep_refresh_history_changed'; END IF;
  IF ${literal(spec.completedAt)}::timestamptz > clock_timestamp()
     OR ${literal(spec.completedAt)}::timestamptz <= clock_timestamp() - interval '7 days'
  THEN RAISE EXCEPTION 'lep_refresh_manual_source_expired'; END IF;
  UPDATE public."Clause" c SET
    "isCurrent" = CASE WHEN x.action = 'revalidate' THEN c."isCurrent" ELSE false END,
    "retrievedAt" = CASE WHEN x.action = 'revalidate' THEN ${literal(spec.completedAt)}::timestamp ELSE c."retrievedAt" END,
    "updatedAt" = CURRENT_TIMESTAMP
    FROM pg_temp.lep_refresh_operations x
    WHERE c.id = x.id AND c."instrumentId" = ${literal(instrument.instrumentId)}
      AND x.action IN ('revalidate','retire','version');
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> ${statementCount} THEN RAISE EXCEPTION 'lep_refresh_update_count'; END IF;
  INSERT INTO public."Clause" (id, "instrumentId", "clauseKey", title, "bodyHtml", "bodyText",
    "hierarchyPath", version, "isCurrent", "effectiveFrom", "effectiveTo", "retrievedAt", "contentHash", "createdAt", "updatedAt")
    SELECT x."nextId", ${literal(instrument.instrumentId)}, x."clauseKey", x.title, x."bodyHtml", x."bodyText",
      x."hierarchyPath", x.version, true, NULL, NULL, ${literal(spec.completedAt)}::timestamp,
      x."contentHash", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM pg_temp.lep_refresh_operations x WHERE x.action IN ('version','add');
  GET DIAGNOSTICS inserted = ROW_COUNT;
  IF inserted <> ${insertCount} THEN RAISE EXCEPTION 'lep_refresh_insert_count'; END IF;
  UPDATE public."Instrument" SET "sourceUrl" = ${literal(sourceUrl)}, "updatedAt" = CURRENT_TIMESTAMP
    WHERE id = ${literal(instrument.instrumentId)};
END $lep_refresh_guard$`,
    `SELECT ${literal(council)} AS council,
      (SELECT count(*) FROM pg_temp.lep_refresh_operations WHERE action='revalidate')::integer AS revalidated,
      (SELECT count(*) FROM pg_temp.lep_refresh_operations WHERE action='retire')::integer AS repealed_retired,
      (SELECT count(*) FROM pg_temp.lep_refresh_operations WHERE action='version')::integer AS new_versions,
      (SELECT count(*) FROM pg_temp.lep_refresh_operations WHERE action='add')::integer AS new_keys,
      (SELECT bool_and(encode(sha256(convert_to(c."bodyText",'UTF8')),'hex')=x."bodyTextSha256"
        AND encode(sha256(convert_to(c."bodyHtml",'UTF8')),'hex')=x."bodyHtmlSha256")
       FROM public."Clause" c JOIN pg_temp.lep_refresh_history x ON c.id=x.id) AS historical_bodies_preserved,
      NOT EXISTS (SELECT 1 FROM public."Clause" c JOIN pg_temp.lep_refresh_operations x ON c.id=x.id
        WHERE x.action IN ('retire','version') AND c."isCurrent") AS retired_rows_not_current`,
  ];
  return { schema: "isolated-manual-lep-refresh.v1", council, projectId, branchId, databaseName,
    acquisition: receipt.acquisition, manualCompletedAt: spec.completedAt, httpRetrievedAt: null,
    originalSha256: spec.originalSha256, sourceVersionId: spec.versionId, sourceUrl,
    counts, untouchedHistory: old.length - statementCount, payloadSha256: SHA(payload), operations, statements };
}
