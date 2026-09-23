import { pathToFileURL } from 'node:url';

const BRANCH = 'refs/heads/accept/item-78c-byron-kempsey-20260914';
const TARGETS = Object.freeze({
  BYRON: { endpoint: 'ep-wild-water-a796xzd7', project: 'cmp6uspof0000k10420hkjz9b' },
  KEMPSEY: { endpoint: 'ep-muddy-dawn-a7tfo3kp', project: 'cmpmfohu20000jm04g67x29l4' },
});
const CHECKS = ['sessionPresent', 'sessionUnexpired', 'projectPresent', 'sessionOwnsProject', 'projectUsesDevBypassOwner'];

export function configuration(env) {
  const target = TARGETS[env.ITEM78C_DIAGNOSTIC_COUNCIL];
  if (!target || env.ITEM78C_DIAGNOSTIC_CONFIRMATION !== 'READ ONLY PREVIEW LOGIN CHECK'
    || env.GITHUB_REF !== BRANCH || !/^[a-f0-9]{40}$/.test(env.ITEM78C_DIAGNOSTIC_EXPECTED_SHA || '')
    || env.GITHUB_SHA !== env.ITEM78C_DIAGNOSTIC_EXPECTED_SHA) throw new Error('configuration_invalid');
  const url = new URL(env.ITEM74H_PREVIEW_DATABASE_URL);
  const host = new RegExp(`^${target.endpoint}(-pooler)?\\.[a-z0-9.-]+\\.neon\\.tech$`);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !host.test(url.hostname)
    || (url.port && url.port !== '5432') || url.pathname !== '/neondb'
    || !url.username || !url.password || url.hash
    || !['require', 'verify-full'].includes(url.searchParams.get('sslmode'))) throw new Error('configuration_invalid');
  // Keep connection options bounded; never accept an embedded alternate host or startup command.
  for (const key of url.searchParams.keys()) {
    if (!['sslmode', 'channel_binding', 'connect_timeout', 'pool_timeout', 'connection_limit', 'pgbouncer'].includes(key)
      || url.searchParams.getAll(key).length !== 1) throw new Error('configuration_invalid');
  }
  const cookie = env.PLANNERA_STRIPE_TEST_SESSION_COOKIE;
  if (typeof cookie !== 'string' || cookie.length > 16384 || /[\r\n\x00]/.test(cookie)) throw new Error('configuration_invalid');
  const names = ['__Secure-next-auth.session-token', 'next-auth.session-token'];
  const tokens = [];
  const seen = new Set();
  for (const part of cookie.split(';')) {
    const i = part.indexOf('=');
    if (i < 1) throw new Error('configuration_invalid');
    const name = part.slice(0, i).trim();
    if (!names.includes(name)) continue;
    if (seen.has(name)) throw new Error('configuration_invalid');
    seen.add(name);
    const value = part.slice(i + 1).trim();
    if (!/^[A-Za-z0-9._~-]{1,512}$/.test(value)) throw new Error('configuration_invalid');
    tokens.push(value);
  }
  if (tokens.length === 0) return { council: env.ITEM78C_DIAGNOSTIC_COUNCIL, missingCookie: true };
  if (new Set(tokens).size !== 1) throw new Error('configuration_invalid');
  return { council: env.ITEM78C_DIAGNOSTIC_COUNCIL, url: url.href, token: tokens[0], project: target.project };
}

export async function queryReadOnly(prisma, config) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    const rows = await tx.$queryRaw`
      SELECT
        EXISTS (SELECT 1 FROM "Session" WHERE "sessionToken" = ${config.token}) AS "sessionPresent",
        EXISTS (SELECT 1 FROM "Session" WHERE "sessionToken" = ${config.token} AND "expires" > CURRENT_TIMESTAMP) AS "sessionUnexpired",
        EXISTS (SELECT 1 FROM "Project" WHERE "id" = ${config.project}) AS "projectPresent",
        EXISTS (SELECT 1 FROM "Session" s JOIN "Project" p ON p."userId" = s."userId"
          WHERE s."sessionToken" = ${config.token} AND p."id" = ${config.project}) AS "sessionOwnsProject",
        EXISTS (SELECT 1 FROM "Project" WHERE "id" = ${config.project} AND "userId" = 'dev-bypass-user') AS "projectUsesDevBypassOwner"
    `;
    if (rows.length !== 1) throw new Error('database_contract_invalid');
    return rows[0];
  }, { maxWait: 5000, timeout: 10000 });
}

async function database(config) {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient({ datasources: { db: { url: config.url } }, log: [] });
  try { return await queryReadOnly(prisma, config); }
  finally { await prisma.$disconnect().catch(() => {}); }
}

export async function diagnose(env, read = database) {
  const summary = { version: 'item78c_session_preflight.v1', council: null, matched: false, reason: 'configuration_invalid', checks: null };
  let config;
  try { config = configuration(env); } catch { return summary; }
  summary.council = config.council;
  if (config.missingCookie) return { ...summary, reason: 'nextauth_cookie_missing' };
  try {
    const row = await read(config);
    if (!row || Object.keys(row).length !== CHECKS.length || CHECKS.some(k => typeof row[k] !== 'boolean')) {
      return { ...summary, reason: 'database_contract_invalid' };
    }
    // Only allowlisted booleans leave the process. Never emit driver errors or database rows wholesale.
    summary.checks = Object.fromEntries(CHECKS.map(k => [k, row[k]]));
    summary.reason = !row.projectPresent ? 'project_missing'
      : !row.sessionPresent ? 'session_missing'
      : !row.sessionUnexpired ? 'session_expired'
      : !row.sessionOwnsProject ? 'session_owner_mismatch' : 'session_project_match';
    summary.matched = summary.reason === 'session_project_match';
  } catch (error) {
    summary.reason = ({ P1000: 'database_authentication_failed', P1001: 'database_unreachable', P1002: 'database_timeout' })[error?.code]
      || 'database_check_failed';
  }
  return summary;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const summary = await diagnose(process.env);
  process.stdout.write(`${JSON.stringify(summary)}\n`);
  process.exitCode = summary.matched ? 0 : 1;
}
