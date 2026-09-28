import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { configuration as appConfiguration } from './item78c-paid-scope-diagnostic.mjs';
import { requireSafe } from './item78c-paid-scope-authorize.mjs';

const ENDPOINTS = Object.freeze({
  BYRON: 'ep-wild-water-a796xzd7',
  KEMPSEY: 'ep-muddy-dawn-a7tfo3kp',
});
export const CHECKS = Object.freeze([
  'transactionReadOnly', 'sessionPresent', 'sessionUnexpired', 'projectPresent',
  'sessionOwnsProject', 'sourcePurchasePresent', 'sourcePurchaseUnique',
  'sourcePurchasePaid', 'sourcePurchaseProjectMatches', 'sourcePurchaseOwnerMatches',
  'qscMatches', 'qscIsOnlySavedCheck', 'proposalMatches', 'changedProposalDiffers',
  'productMatches', 'priceMatches', 'sourceEntitlementActive',
  'sourceEntitlementConsistent', 'exactEntitlementExists', 'exactPurchaseExists',
]);
const normalize = value => value.replace(/\s+/g, ' ').trim().toLowerCase();
const fingerprint = value => createHash('sha256').update(normalize(value)).digest('hex');

// Fixed parameterized SELECT only. The batch transport requests READ ONLY and
// the response must independently confirm transaction_read_only=on.
export const QUERY = String.raw`
WITH s AS (
  SELECT "userId", expires FROM "Session" WHERE "sessionToken" = $1
), p AS (
  SELECT * FROM "Purchase" WHERE "providerName" = 'stripe' AND "providerReference" = $6
), project AS (
  SELECT id, "userId" FROM "Project" WHERE id = $2
)
SELECT
  current_setting('transaction_read_only') = 'on' AS "transactionReadOnly",
  EXISTS (SELECT 1 FROM s) AS "sessionPresent",
  EXISTS (SELECT 1 FROM s WHERE expires > CURRENT_TIMESTAMP) AS "sessionUnexpired",
  EXISTS (SELECT 1 FROM project) AS "projectPresent",
  EXISTS (SELECT 1 FROM s JOIN project ON project."userId" = s."userId") AS "sessionOwnsProject",
  EXISTS (SELECT 1 FROM p) AS "sourcePurchasePresent",
  (SELECT count(*) = 1 FROM p) AS "sourcePurchaseUnique",
  EXISTS (SELECT 1 FROM p WHERE status = 'PAID') AS "sourcePurchasePaid",
  EXISTS (SELECT 1 FROM p WHERE "projectId" = $2) AS "sourcePurchaseProjectMatches",
  EXISTS (SELECT 1 FROM p JOIN s ON s."userId" = p."userId") AS "sourcePurchaseOwnerMatches",
  EXISTS (SELECT 1 FROM p WHERE "quickSiteCheckArtefactId" = $3) AS "qscMatches",
  ((SELECT count(*) FROM "Artefact" WHERE "projectId" = $2 AND type = 'quick_site_check') = 1
    AND EXISTS (SELECT 1 FROM "Artefact" WHERE id = $3 AND "projectId" = $2
      AND type = 'quick_site_check' AND "staleAt" IS NULL
      AND payload->'lepEvidenceSummary'->>'label' = 'Cited')) AS "qscIsOnlySavedCheck",
  EXISTS (SELECT 1 FROM p WHERE "proposalFingerprint" = $4) AS "proposalMatches",
  NOT EXISTS (SELECT 1 FROM p WHERE "proposalFingerprint" = $5) AS "changedProposalDiffers",
  EXISTS (SELECT 1 FROM p WHERE "productCode" = 'planning_controls_pack'
    AND "productVersion" = 'v1') AS "productMatches",
  EXISTS (SELECT 1 FROM p WHERE "amountMinor" = 4900 AND currency = 'AUD') AS "priceMatches",
  EXISTS (SELECT 1 FROM p JOIN "Entitlement" e ON e."purchaseId" = p.id
    WHERE e.status = 'ACTIVE') AS "sourceEntitlementActive",
  EXISTS (SELECT 1 FROM p JOIN "Entitlement" e ON e."purchaseId" = p.id
    WHERE e.status = 'ACTIVE' AND e."userId" = p."userId"
      AND e."projectId" = p."projectId"
      AND e."quickSiteCheckArtefactId" = p."quickSiteCheckArtefactId"
      AND e."proposalFingerprint" = p."proposalFingerprint"
      AND e."productCode" = p."productCode" AND e."productVersion" = p."productVersion"
      AND e."activeScopeKey" = p."scopeKey"
      AND p."scopeKey" = concat_ws(':', p."userId", p."projectId",
        p."quickSiteCheckArtefactId", p."proposalFingerprint", p."productCode", p."productVersion")
    ) AS "sourceEntitlementConsistent",
  EXISTS (SELECT 1 FROM "Entitlement" e JOIN s ON s."userId" = e."userId"
    WHERE e."projectId" = $2 AND e."quickSiteCheckArtefactId" = $3
      AND e."proposalFingerprint" = $4 AND e."productCode" = 'planning_controls_pack'
      AND e."productVersion" = 'v1' AND e.status = 'ACTIVE') AS "exactEntitlementExists",
  EXISTS (SELECT 1 FROM "Purchase" q JOIN s ON s."userId" = q."userId"
    WHERE q."scopeKey" = concat_ws(':', s."userId", $2::text, $3::text, $4::text,
      'planning_controls_pack', 'v1') AND q.status = 'PAID') AS "exactPurchaseExists"
`;

export function configuration(env) {
  const app = appConfiguration(env);
  requireSafe(env.ITEM78C_SCOPE_RECONCILE_ONLY === 'true');
  requireSafe(normalize(app.proposal) !== normalize(app.otherProposal));
  const raw = env.ITEM74H_PREVIEW_DATABASE_URL;
  requireSafe(typeof raw === 'string' && raw.length <= 4096 && !/[\r\n\x00]/.test(raw));
  const db = new URL(raw);
  requireSafe(['postgres:', 'postgresql:'].includes(db.protocol));
  const endpoint = ENDPOINTS[app.council];
  const host = new RegExp('^' + endpoint + '(-pooler)?\\.([a-z0-9-]+\\.(?:aws|azure|gcp)\\.neon\\.tech)$');
  const match = db.hostname.match(host);
  requireSafe(match && (!db.port || db.port === '5432'));
  requireSafe(db.pathname === '/neondb' && db.username && db.password && !db.hash);
  requireSafe(['require', 'verify-full'].includes(db.searchParams.get('sslmode')));
  for (const key of db.searchParams.keys()) {
    requireSafe(['sslmode', 'channel_binding', 'connect_timeout', 'pool_timeout',
      'connection_limit', 'pgbouncer'].includes(key) && db.searchParams.getAll(key).length === 1);
  }
  const checkout = env.PLANNERA_STRIPE_TEST_SESSION_ID?.trim();
  requireSafe(/^cs_test_[A-Za-z0-9]{1,247}$/.test(checkout || ''));
  const tokens = [];
  const seen = new Set();
  for (const part of app.cookie.split(';')) {
    const i = part.indexOf('=');
    requireSafe(i > 0);
    const name = part.slice(0, i).trim();
    if (!['__Secure-next-auth.session-token', 'next-auth.session-token'].includes(name)) continue;
    requireSafe(!seen.has(name));
    seen.add(name);
    const token = part.slice(i + 1).trim();
    requireSafe(/^[A-Za-z0-9._~-]{1,512}$/.test(token));
    tokens.push(token);
  }
  requireSafe(tokens.length > 0 && new Set(tokens).size === 1);
  return {
    council: app.council,
    url: 'https://api.' + match[2] + '/sql',
    connection: raw,
    params: [tokens[0], app.target.project, app.target.qsc,
      fingerprint(app.proposal), fingerprint(app.otherProposal), checkout],
  };
}

async function boundedJson(response) {
  requireSafe(response.body);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = '', size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16384) {
        await reader.cancel().catch(() => {});
        throw new Error('response_contract_invalid');
      }
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally { reader.releaseLock(); }
}

export async function reconcile(env, request = fetch) {
  const summary = {
    version: 'item78c_paid_scope_reconciliation.v1', council: null,
    completed: false, reason: 'configuration_denied', checks: null,
    mismatches: [], containsSensitiveValues: false, acceptanceDecisionUnchanged: true,
  };
  let config;
  try { config = configuration(env); } catch { return summary; }
  summary.council = config.council;
  let response;
  try {
    response = await request(config.url, {
      method: 'POST', redirect: 'error', cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'Neon-Connection-String': config.connection,
        'Neon-Batch-Read-Only': 'true',
        'Neon-Batch-Isolation-Level': 'RepeatableRead',
        'Neon-Array-Mode': 'false',
        'Neon-Raw-Text-Output': 'false',
      },
      body: JSON.stringify({ queries: [{ query: QUERY, params: config.params }] }),
      signal: AbortSignal.timeout(15000),
    });
  } catch { return { ...summary, reason: 'database_request_failed' }; }
  if (!response.ok) return { ...summary, reason: 'database_request_refused' };
  try {
    const value = await boundedJson(response);
    const results = value?.results;
    requireSafe(Array.isArray(results) && results.length === 1);
    const result = results[0];
    requireSafe(result.command === 'SELECT' && result.rowCount === 1
      && Array.isArray(result.rows) && result.rows.length === 1);
    const row = result.rows[0];
    requireSafe(row && !Array.isArray(row) && Object.keys(row).length === CHECKS.length
      && CHECKS.every(k => typeof row[k] === 'boolean'));
    requireSafe(row.transactionReadOnly);
    summary.checks = Object.fromEntries(CHECKS.map(k => [k, row[k]]));
    summary.mismatches = CHECKS.filter(k => !row[k]);
    summary.completed = true;
    summary.reason = !row.sessionPresent || !row.sessionUnexpired || !row.sessionOwnsProject
      ? 'saved_session_mismatch'
      : !row.sourcePurchasePresent || !row.sourcePurchaseUnique
        ? 'saved_checkout_reference_mismatch'
        : !row.sourcePurchaseProjectMatches || !row.sourcePurchaseOwnerMatches
          ? 'purchase_identity_mismatch'
          : !row.qscMatches || !row.qscIsOnlySavedCheck ? 'quick_site_check_mismatch'
            : !row.proposalMatches ? 'saved_proposal_mismatch'
              : summary.mismatches.length ? 'purchase_or_entitlement_mismatch'
                : 'saved_inputs_match_database';
  } catch { summary.reason = 'database_response_invalid'; }
  return summary;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await reconcile(process.env);
    process.stdout.write(JSON.stringify(result) + '\n');
    process.exitCode = result.completed ? 0 : 1;
  } catch {
    process.stdout.write('Read-only reconciliation refused; no raw error output.\n');
    process.exitCode = 1;
  }
}
