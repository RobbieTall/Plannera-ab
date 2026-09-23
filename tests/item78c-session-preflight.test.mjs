import test from 'node:test';
import assert from 'node:assert/strict';
import { configuration, diagnose, queryReadOnly } from '../scripts/item78c-session-preflight.mjs';

const env = {
  ITEM78C_DIAGNOSTIC_COUNCIL: 'BYRON',
  ITEM78C_DIAGNOSTIC_CONFIRMATION: 'READ ONLY PREVIEW LOGIN CHECK',
  GITHUB_REF: 'refs/heads/accept/item-78c-byron-kempsey-20260914',
  GITHUB_SHA: 'a'.repeat(40), ITEM78C_DIAGNOSTIC_EXPECTED_SHA: 'a'.repeat(40),
  ITEM74H_PREVIEW_DATABASE_URL: 'postgresql://synthetic:synthetic@ep-wild-water-a796xzd7.example.neon.tech/neondb?sslmode=require',
  PLANNERA_STRIPE_TEST_SESSION_COOKIE: '__Secure-next-auth.session-token=synthetic-token',
};
const good = { sessionPresent: true, sessionUnexpired: true, projectPresent: true, sessionOwnsProject: true, projectUsesDevBypassOwner: false };

test('invalid authorisation never invokes database', async () => {
  for (const patch of [{ GITHUB_REF: 'refs/heads/main' }, { GITHUB_SHA: 'b'.repeat(40) },
    { ITEM78C_DIAGNOSTIC_EXPECTED_SHA: '$(touch /tmp/unsafe)' }, { ITEM78C_DIAGNOSTIC_CONFIRMATION: '' },
    { ITEM78C_DIAGNOSTIC_COUNCIL: 'UNKNOWN' }]) {
    const result = await diagnose({ ...env, ...patch }, () => assert.fail('database accessed'));
    assert.equal(result.reason, 'configuration_invalid');
  }
});
test('different council, production, alternate hosts and connection commands are rejected', () => {
  for (const url of [env.ITEM74H_PREVIEW_DATABASE_URL.replace('ep-wild-water-a796xzd7', 'ep-muddy-dawn-a7tfo3kp'),
    env.ITEM74H_PREVIEW_DATABASE_URL.replace('.neon.tech', '.neon.tech.attacker.invalid'),
    env.ITEM74H_PREVIEW_DATABASE_URL.replace('ep-wild-water-a796xzd7', 'production'),
    env.ITEM74H_PREVIEW_DATABASE_URL + '&host=elsewhere', env.ITEM74H_PREVIEW_DATABASE_URL + '&options=unsafe',
    env.ITEM74H_PREVIEW_DATABASE_URL + '&sslmode=disable']) {
    assert.throws(() => configuration({ ...env, ITEM74H_PREVIEW_DATABASE_URL: url }));
  }
});
test('Kempsey uses its own fixed project and endpoint', () => {
  const config = configuration({ ...env, ITEM78C_DIAGNOSTIC_COUNCIL: 'KEMPSEY',
    ITEM74H_PREVIEW_DATABASE_URL: env.ITEM74H_PREVIEW_DATABASE_URL.replace('ep-wild-water-a796xzd7', 'ep-muddy-dawn-a7tfo3kp') });
  assert.equal(config.project, 'cmpmfohu20000jm04g67x29l4');
});
test('cookie ambiguity and header injection fail closed', async () => {
  for (const cookie of ['next-auth.session-token=a;next-auth.session-token=a',
    'next-auth.session-token=a;__Secure-next-auth.session-token=b', 'next-auth.session-token=a\r\nInjected: yes',
    "next-auth.session-token=';DROP TABLE x;--"]) {
    assert.equal((await diagnose({ ...env, PLANNERA_STRIPE_TEST_SESSION_COOKIE: cookie }, () => assert.fail())).reason, 'configuration_invalid');
  }
});
test('np_session alone is not treated as NextAuth login', async () => {
  assert.equal((await diagnose({ ...env, PLANNERA_STRIPE_TEST_SESSION_COOKIE: 'np_session=synthetic' }, () => assert.fail())).reason, 'nextauth_cookie_missing');
});
test('matching session yields booleans without credentials', async () => {
  const result = await diagnose(env, async () => good);
  assert.equal(result.matched, true);
  assert.equal(result.reason, 'session_project_match');
  assert.doesNotMatch(JSON.stringify(result), /synthetic|postgres|cmp6|sessionToken/);
});
test('missing, expired and wrong-owner cases have distinct safe reasons', async () => {
  for (const [field, reason] of [['projectPresent', 'project_missing'], ['sessionPresent', 'session_missing'],
    ['sessionUnexpired', 'session_expired'], ['sessionOwnsProject', 'session_owner_mismatch']]) {
    assert.equal((await diagnose(env, async () => ({ ...good, [field]: false }))).reason, reason);
  }
});
test('unexpected result fields are not emitted', async () => {
  const result = await diagnose(env, async () => ({ ...good, secret: 'synthetic-secret' }));
  assert.equal(result.reason, 'database_contract_invalid');
  assert.equal(result.checks, null);
});
test('driver errors never expose their messages', async () => {
  const result = await diagnose(env, async () => { throw Object.assign(new Error('synthetic-secret'), { code: 'P1000' }); });
  assert.equal(result.reason, 'database_authentication_failed');
  assert.doesNotMatch(JSON.stringify(result), /synthetic/);
});
test('read-only transaction precedes parameterised SELECT with bounded timeout', async () => {
  const events = [];
  const tx = {
    $executeRaw: async (parts) => events.push(parts.join('')),
    $queryRaw: async (parts, ...values) => { events.push(parts.join('?')); assert.ok(values.includes('synthetic-token')); return [good]; },
  };
  const prisma = { $transaction: async (fn, options) => { assert.equal(options.timeout, 10000); return fn(tx); } };
  assert.deepEqual(await queryReadOnly(prisma, configuration(env)), good);
  assert.equal(events[0], 'SET TRANSACTION READ ONLY');
  assert.match(events[1], /^\s*SELECT/);
  assert.doesNotMatch(events[1], /synthetic-token|\b(?:INSERT|UPDATE|DELETE|ALTER|CREATE|DROP)\b/);
});
test('failed read-only guard prevents SELECT', async () => {
  const prisma = { $transaction: async fn => fn({ $executeRaw: async () => { throw new Error('blocked'); }, $queryRaw: () => assert.fail() }) };
  await assert.rejects(queryReadOnly(prisma, configuration(env)));
});
