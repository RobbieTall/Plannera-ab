import test from 'node:test';
import assert from 'node:assert/strict';
import { authorize, validateGit, validateProtection, safeSummary } from '../scripts/item78c-session-preflight-authorize.mjs';

const env = { GITHUB_REPOSITORY: 'RobbieTall/Plannera-ab', GITHUB_EVENT_NAME: 'workflow_dispatch',
  GITHUB_REF: 'refs/heads/accept/item-78c-byron-kempsey-20260914', GITHUB_SHA: 'a'.repeat(40),
  ITEM78C_DIAGNOSTIC_EXPECTED_SHA: 'a'.repeat(40), ITEM78C_DIAGNOSTIC_CONFIRMATION: 'READ ONLY PREVIEW LOGIN CHECK',
  ITEM78C_DIAGNOSTIC_COUNCIL: 'BYRON', ITEM74H_WORKFLOW_AUTHORIZED_COMMIT: 'a'.repeat(40),
  ITEM74H_AUTHORIZED_DATABASE_TARGET: 'ep-wild-water-a796xzd7', GH_TOKEN: 'synthetic-built-in-token' };
const protection = { can_admins_bypass: false, deployment_branch_policy: { custom_branch_policies: true, protected_branches: false },
  protection_rules: [{ type: 'required_reviewers', reviewers: [{ type: 'User' }] }] };
const policies = { total_count: 1, branch_policies: [{ type: 'branch', name: 'accept/item-78c-byron-kempsey-20260914' }] };
const git = args => ({ status: args[0] === 'merge-base' ? 1 : 0, stdout: env.GITHUB_SHA });
const fetchMetadata = async url => ({ ok: true, json: async () => url.includes('/deployment-branch-policies?') ? policies : protection });

test('dispatch injection is rejected before any Git command', () => {
  assert.throws(() => validateGit({ ...env, ITEM78C_DIAGNOSTIC_EXPECTED_SHA: "'; echo unsafe; #" }, () => assert.fail()));
});
test('commit contained in main or ancestry errors are rejected', () => {
  for (const status of [0, 128]) assert.throws(() => validateGit(env, args => args[0] === 'merge-base' ? { status } : git(args)));
});
test('checkout SHA mismatch is rejected', () => {
  assert.throws(() => validateGit(env, args => args[0] === 'rev-parse' ? { status: 0, stdout: 'b'.repeat(40) } : git(args)));
});
test('reviewer absence, admin bypass, wildcard and tag rules fail closed', () => {
  assert.throws(() => validateProtection({ ...protection, protection_rules: [] }, policies));
  assert.throws(() => validateProtection({ ...protection, can_admins_bypass: true }, policies));
  assert.throws(() => validateProtection(protection, { ...policies, branch_policies: [{ type: 'branch', name: '*' }] }));
  assert.throws(() => validateProtection(protection, { ...policies, branch_policies: [{ ...policies.branch_policies[0], type: 'tag' }] }));
});
test('protected pin or target mismatch fails before metadata access', async () => {
  for (const patch of [{ ITEM74H_WORKFLOW_AUTHORIZED_COMMIT: 'b'.repeat(40) }, { ITEM74H_AUTHORIZED_DATABASE_TARGET: 'production' }]) {
    await assert.rejects(authorize({ ...env, ...patch }, true, git, () => assert.fail()));
  }
});
test('both environment protections are checked using fixed GitHub URLs', async () => {
  const urls = [];
  await authorize(env, true, git, async (url, opts) => {
    urls.push(url); assert.equal(opts.method, 'GET'); assert.equal(opts.redirect, 'error'); return fetchMetadata(url);
  });
  assert.equal(urls.length, 4);
  assert.equal(urls.filter(u => u.includes('item78c-byron-preview')).length, 2);
  assert.equal(urls.filter(u => u.includes('item78c-kempsey-preview')).length, 2);
  assert.ok(urls.every(u => u.startsWith('https://api.github.com/repos/RobbieTall/Plannera-ab/environments/')));
});
test('metadata access failure does not permit execution', async () => {
  await assert.rejects(authorize(env, false, git, async () => ({ ok: false })));
});
test('raw messages, extra fields and false success cannot be printed as summaries', () => {
  const base = { version: 'item78c_session_preflight.v1', council: 'BYRON', matched: false, reason: 'session_missing', checks: null };
  assert.deepEqual(safeSummary(base), base);
  for (const patch of [{ error: 'synthetic-secret' }, { reason: 'synthetic-secret' }, { matched: true },
    { matched: true, reason: 'session_project_match' }]) assert.throws(() => safeSummary({ ...base, ...patch }));
});

const configurationReasons = ["configuration_council_invalid","configuration_confirmation_invalid","configuration_branch_invalid","configuration_commit_invalid","database_url_missing","database_url_invalid","database_protocol_invalid","database_target_mismatch","database_port_invalid","database_name_invalid","database_credentials_missing","database_fragment_forbidden","database_tls_invalid","database_options_invalid","session_cookie_missing","session_cookie_format_invalid","session_cookie_duplicate","session_cookie_value_invalid","session_cookie_conflict"];

test('each configuration reason is failure-only with no checks or raw context', () => {
  for (const reason of configurationReasons) {
    const result = { version: 'item78c_session_preflight.v1', council: null, matched: false, reason, checks: null };
    assert.deepEqual(safeSummary(result), result);
    for (const patch of [
      { matched: true }, { council: 'BYRON' }, { checks: {} }, { value: 'DO_NOT_EMIT' },
      { reason: reason + ': DO_NOT_EMIT' }, { reason: 'database_url_invalid\nDO_NOT_EMIT' },
    ]) assert.throws(() => safeSummary({ ...result, ...patch }));
  }
});
