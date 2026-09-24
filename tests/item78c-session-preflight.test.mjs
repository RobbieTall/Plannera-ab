import test from 'node:test';
import assert from 'node:assert/strict';
import { safeSummary } from '../scripts/item78c-session-preflight-authorize.mjs';
import { spawnSync } from 'node:child_process';
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
  for (const [patch, reason] of [
    [{ GITHUB_REF: 'refs/heads/main' }, 'configuration_branch_invalid'],
    [{ GITHUB_SHA: 'b'.repeat(40) }, 'configuration_commit_invalid'],
    [{ ITEM78C_DIAGNOSTIC_EXPECTED_SHA: '$(touch /tmp/unsafe)' }, 'configuration_commit_invalid'],
    [{ ITEM78C_DIAGNOSTIC_CONFIRMATION: '' }, 'configuration_confirmation_invalid'],
    [{ ITEM78C_DIAGNOSTIC_COUNCIL: 'UNKNOWN' }, 'configuration_council_invalid'],
    [{ ITEM78C_DIAGNOSTIC_COUNCIL: 'constructor' }, 'configuration_council_invalid'],
  ]) {
    const result = await diagnose({ ...env, ...patch }, () => assert.fail('database accessed'));
    assert.equal(result.reason, reason);
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
  for (const [cookie, reason] of [
    ['next-auth.session-token=a;next-auth.session-token=a', 'session_cookie_duplicate'],
    ['next-auth.session-token=a;__Secure-next-auth.session-token=b', 'session_cookie_conflict'],
    ['next-auth.session-token=a\r\nInjected: yes', 'session_cookie_format_invalid'],
    ["next-auth.session-token=';DROP TABLE x;--", 'session_cookie_value_invalid'],
  ]) {
    assert.equal((await diagnose({ ...env, PLANNERA_STRIPE_TEST_SESSION_COOKIE: cookie }, () => assert.fail())).reason, reason);
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


test('configuration categories are fixed, non-disclosing, and never query either council', async () => {
  const sentinel = 'DO_NOT_EMIT_SYNTHETIC_PRIVATE_VALUE';
  const cases = [
    ['configuration_council_invalid', 'ITEM78C_DIAGNOSTIC_COUNCIL', sentinel],
    ['configuration_confirmation_invalid', 'ITEM78C_DIAGNOSTIC_CONFIRMATION', sentinel],
    ['configuration_branch_invalid', 'GITHUB_REF', sentinel],
    ['configuration_commit_invalid', 'ITEM78C_DIAGNOSTIC_EXPECTED_SHA', sentinel],
    ['database_url_missing', 'ITEM74H_PREVIEW_DATABASE_URL', undefined],
    ['database_url_missing', 'ITEM74H_PREVIEW_DATABASE_URL', ''],
    ['database_url_invalid', 'ITEM74H_PREVIEW_DATABASE_URL', sentinel],
    ['database_protocol_invalid', 'ITEM74H_PREVIEW_DATABASE_URL', url => url.replace('postgresql:', 'https:')],
    ['database_target_mismatch', 'ITEM74H_PREVIEW_DATABASE_URL', url => url.replace(/ep-[^.]+/, sentinel)],
    ['database_port_invalid', 'ITEM74H_PREVIEW_DATABASE_URL', url => url.replace('/neondb', ':5433/neondb')],
    ['database_name_invalid', 'ITEM74H_PREVIEW_DATABASE_URL', url => url.replace('/neondb', '/' + sentinel)],
    ['database_credentials_missing', 'ITEM74H_PREVIEW_DATABASE_URL', url => url.replace('synthetic:synthetic@', 'synthetic@')],
    ['database_fragment_forbidden', 'ITEM74H_PREVIEW_DATABASE_URL', url => url + '#' + sentinel],
    ['database_tls_invalid', 'ITEM74H_PREVIEW_DATABASE_URL', url => url.replace('sslmode=require', 'sslmode=disable')],
    ['database_options_invalid', 'ITEM74H_PREVIEW_DATABASE_URL', url => url + '&host=' + sentinel],
    ['database_options_invalid', 'ITEM74H_PREVIEW_DATABASE_URL', url => url + '&sslmode=require'],
    ['session_cookie_missing', 'PLANNERA_STRIPE_TEST_SESSION_COOKIE', undefined],
    ['session_cookie_missing', 'PLANNERA_STRIPE_TEST_SESSION_COOKIE', ''],
    ['session_cookie_format_invalid', 'PLANNERA_STRIPE_TEST_SESSION_COOKIE', sentinel],
    ['session_cookie_format_invalid', 'PLANNERA_STRIPE_TEST_SESSION_COOKIE', sentinel + '\r\n'],
    ['session_cookie_format_invalid', 'PLANNERA_STRIPE_TEST_SESSION_COOKIE', 'x'.repeat(16385)],
    ['session_cookie_value_invalid', 'PLANNERA_STRIPE_TEST_SESSION_COOKIE', 'next-auth.session-token=' + sentinel + '%'],
    ['session_cookie_value_invalid', 'PLANNERA_STRIPE_TEST_SESSION_COOKIE', 'next-auth.session-token=' + 'x'.repeat(513)],
    ['session_cookie_duplicate', 'PLANNERA_STRIPE_TEST_SESSION_COOKIE', 'next-auth.session-token=' + sentinel + ';next-auth.session-token=' + sentinel],
    ['session_cookie_conflict', 'PLANNERA_STRIPE_TEST_SESSION_COOKIE', 'next-auth.session-token=' + sentinel + ';__Secure-next-auth.session-token=different'],
  ];
  for (const council of ['BYRON', 'KEMPSEY']) {
    const councilEnv = { ...env, ITEM78C_DIAGNOSTIC_COUNCIL: council,
      ITEM74H_PREVIEW_DATABASE_URL: env.ITEM74H_PREVIEW_DATABASE_URL.replace('ep-wild-water-a796xzd7',
        council === 'BYRON' ? 'ep-wild-water-a796xzd7' : 'ep-muddy-dawn-a7tfo3kp') };
    for (const [reason, field, value] of cases) {
      const patch = { [field]: typeof value === 'function' ? value(councilEnv.ITEM74H_PREVIEW_DATABASE_URL) : value };
      let reads = 0;
      const result = await diagnose({ ...councilEnv, ...patch }, async () => { reads++; return good; });
      assert.equal(reads, 0, reason + ': database must not be accessed');
      assert.deepEqual(result, { version: 'item78c_session_preflight.v1', council: null, matched: false, reason, checks: null });
      assert.deepEqual(safeSummary(result), result);
      assert.doesNotMatch(JSON.stringify(result), /DO_NOT_EMIT|synthetic|postgresql|ep-wild|ep-muddy|session-token|5433/);
    }
  }
});
test('unexpected configuration exceptions cannot masquerade as a safe reason', async () => {
  const poisoned = { ...env };
  Object.defineProperty(poisoned, 'ITEM74H_PREVIEW_DATABASE_URL', {
    get() { throw Object.assign(new Error('DO_NOT_EMIT'), { reason: 'session_project_match' }); },
  });
  const result = await diagnose(poisoned, () => assert.fail('database accessed'));
  assert.deepEqual(result, { version: 'item78c_session_preflight.v1', council: null, matched: false, reason: 'configuration_invalid', checks: null });
});
test('valid pooled and direct configurations retain read-only success for both councils', async () => {
  for (const council of ['BYRON', 'KEMPSEY']) {
    for (const suffix of ['', '-pooler']) {
      const endpoint = council === 'BYRON' ? 'ep-wild-water-a796xzd7' : 'ep-muddy-dawn-a7tfo3kp';
      const result = await diagnose({ ...env, ITEM78C_DIAGNOSTIC_COUNCIL: council,
        ITEM74H_PREVIEW_DATABASE_URL: 'postgres://synthetic:synthetic@' + endpoint + suffix +
          '.example.neon.tech:5432/neondb?sslmode=verify-full&channel_binding=require',
      }, async config => {
        assert.equal(config.council, council);
        assert.equal(config.project, council === 'BYRON' ? 'cmp6uspof0000k10420hkjz9b' : 'cmpmfohu20000jm04g67x29l4');
        return good;
      });
      assert.equal(result.matched, true);
      assert.equal(result.reason, 'session_project_match');
    }
  }
});
test('synthetic CLI rejects config with only a fixed stdout reason and no stderr', () => {
  const child = spawnSync(process.execPath, [new URL('../scripts/item78c-session-preflight.mjs', import.meta.url).pathname], {
    env: { ...env, ITEM74H_PREVIEW_DATABASE_URL: 'DO_NOT_EMIT_SYNTHETIC_PRIVATE_VALUE' },
    encoding: 'utf8', shell: false, timeout: 10000,
  });
  assert.equal(child.error, undefined);
  assert.equal(child.status, 1);
  assert.equal(child.stderr, '');
  assert.deepEqual(JSON.parse(child.stdout), {
    version: 'item78c_session_preflight.v1', council: null, matched: false, reason: 'database_url_invalid', checks: null,
  });
});
