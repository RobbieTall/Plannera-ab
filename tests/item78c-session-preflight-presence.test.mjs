import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { presenceSummary } from '../scripts/item78c-session-preflight-presence.mjs';
import { authorize } from '../scripts/item78c-session-preflight-authorize.mjs';

const caller = readFileSync(new URL('../.github/workflows/item77-protected-commercial-journey.yml', import.meta.url), 'utf8');
const authorization = caller.slice(caller.indexOf('  presence-authorize:'), caller.indexOf('\n  presence:'));
const protectedJob = caller.slice(caller.indexOf('\n  presence:'));
const reportOffset = protectedJob.indexOf('      - name: Report two presence flags only');
const report = protectedJob.slice(reportOffset);
const cli = fileURLToPath(new URL('../scripts/item78c-session-preflight-presence.mjs', import.meta.url));

test('all boolean combinations yield only the two flags and correct CLI status', () => {
  for (const database of ['true', 'false']) for (const session of ['true', 'false']) {
    const env = { DATABASE_CONFIGURED: database, SESSION_CONFIGURED: session };
    const expected = { databaseConfigured: database === 'true', sessionConfigured: session === 'true' };
    assert.deepEqual(presenceSummary(env), expected);
    const result = spawnSync(process.execPath, [cli], { env, encoding: 'utf8' });
    assert.equal(result.status, database === 'true' && session === 'true' ? 0 : 1);
    assert.equal(result.stderr, '');
    assert.equal(result.stdout, JSON.stringify(expected) + '\n');
  }
});
test('missing, secret-like or malicious input is rejected without echo or execution', () => {
  for (const value of [undefined, '', 'TRUE', 'true\n', '$(touch /tmp/never-execute)', 'secret-synthetic-do-not-print']) {
    const env = { DATABASE_CONFIGURED: value, SESSION_CONFIGURED: 'true' };
    assert.throws(() => presenceSummary(env), { message: 'presence_input_invalid' });
    const result = spawnSync(process.execPath, [cli], { env, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.equal(result.stderr, '');
    assert.equal(result.stdout, 'Presence probe refused invalid boolean inputs.\n');
  }
});
test('presence mode is manual opt-in, cannot invoke the reusable database diagnostic', () => {
  assert.match(caller, /presence_only:\n[\s\S]*?type: boolean\n        required: false\n        default: false/);
  assert.ok(authorization.includes("github.event_name == 'workflow_dispatch' && inputs.presence_only"));
  assert.ok(protectedJob.includes("github.event_name == 'workflow_dispatch' && inputs.diagnostic_only && inputs.presence_only"));
  assert.ok(authorization.includes('if (process.env.DIAGNOSTIC_ONLY !== "true") process.exit(1)'));
  const reusable = caller.slice(caller.indexOf('  session-diagnostic:'), caller.indexOf('\n  presence-authorize:'));
  assert.ok(reusable.includes("inputs.diagnostic_only && !inputs.presence_only"));
  assert.ok(caller.includes("!inputs.diagnostic_only && !inputs.presence_only"));
});
test('failed prerequisite cannot reach protected job; protections rechecked before flags', () => {
  assert.match(protectedJob, /needs: presence-authorize/);
  assert.doesNotMatch(authorization, /secrets\.|environment:|always\(/);
  assert.doesNotMatch(protectedJob, /always\(/);
  assert.ok(authorization.includes('item78c-session-preflight-authorize.mjs credential-free'));
  assert.ok(protectedJob.indexOf('item78c-session-preflight-authorize.mjs protected') < reportOffset);
  assert.doesNotMatch(protectedJob.slice(0, reportOffset), /secrets\./);
  for (const name of ['ITEM74H_WORKFLOW_AUTHORIZED_COMMIT', 'ITEM74H_AUTHORIZED_DATABASE_TARGET']) assert.ok(protectedJob.includes(name));
  assert.ok(protectedJob.includes('environment: $' + '{{ matrix.environment }}'));
  for (const council of ['byron', 'kempsey']) assert.ok(protectedJob.includes('environment: item78c-' + council + '-preview'));
});
test('only boolean expressions reach the probe; no install, raw secret or database code path', () => {
  const expected = "      - name: Report two presence flags only\n        env:\n          DATABASE_CONFIGURED: $" + "{{ secrets.ITEM74H_PREVIEW_DATABASE_URL != '' }}\n          SESSION_CONFIGURED: $" + "{{ secrets.PLANNERA_STRIPE_TEST_SESSION_COOKIE != '' }}\n        run: node scripts/item78c-session-preflight-presence.mjs\n";
  assert.equal(report, expected);
  assert.equal((protectedJob.match(/secrets\./g) || []).length, 2);
  assert.doesNotMatch(authorization + protectedJob, /secrets: inherit|npm |npx |prisma|upload-artifact|curl |wget /);
  assert.doesNotMatch(authorization + protectedJob, /run:.*\$\{\{/);
  assert.ok(caller.includes("inputs.presence_only && 'item78c-presence-only'"));
});
test('unapproved commit, main ancestry or malicious dispatch stops authorizer before metadata', async () => {
  const valid = { GITHUB_REPOSITORY: 'RobbieTall/Plannera-ab', GITHUB_EVENT_NAME: 'workflow_dispatch',
    GITHUB_REF: 'refs/heads/accept/item-78c-byron-kempsey-20260914', GITHUB_SHA: 'a'.repeat(40),
    ITEM78C_DIAGNOSTIC_EXPECTED_SHA: 'a'.repeat(40), ITEM78C_DIAGNOSTIC_CONFIRMATION: 'READ ONLY PREVIEW LOGIN CHECK',
    GH_TOKEN: 'synthetic', ITEM78C_DIAGNOSTIC_COUNCIL: 'BYRON', ITEM74H_WORKFLOW_AUTHORIZED_COMMIT: 'a'.repeat(40),
    ITEM74H_AUTHORIZED_DATABASE_TARGET: 'ep-wild-water-a796xzd7' };
  for (const patch of [{ GITHUB_EVENT_NAME: 'pull_request' }, { GITHUB_REF: 'refs/heads/main' },
    { ITEM78C_DIAGNOSTIC_EXPECTED_SHA: '$(never-execute)' }, { ITEM78C_DIAGNOSTIC_CONFIRMATION: 'READ ONLY PREVIEW LOGIN CHECK\nno' }]) {
    await assert.rejects(authorize({ ...valid, ...patch }, true, () => assert.fail('Git must not run'), () => assert.fail('Metadata must not run')));
  }
  const fakeGit = args => ({ status: args[0] === 'merge-base' ? 1 : 0, stdout: valid.GITHUB_SHA });
  await assert.rejects(authorize({ ...valid, ITEM74H_WORKFLOW_AUTHORIZED_COMMIT: 'b'.repeat(40) }, true, fakeGit, () => assert.fail('Metadata must not run')));
  await assert.rejects(authorize(valid, true, args => ({ status: 0, stdout: valid.GITHUB_SHA }), () => assert.fail('Main-contained SHA must fail first')));
});
