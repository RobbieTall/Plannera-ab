import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { validateRequest, requireSafe, ACCEPTANCE_SHA } from './item78c-test-purchase-authorize.mjs';

export const OPERATION = 'item78c-replacement-20260928';
export const ACCOUNT = 'acct_1S3EmXRBynflQerf';
export const TARGETS = Object.freeze({
  BYRON: {
    project: 'cmp6uspof0000k10420hkjz9b', other: 'cmpmfohu20000jm04g67x29l4',
    qsc: 'cmu46wmy60001jw04kzysjnph', endpoint: 'ep-wild-water-a796xzd7',
    alias: 'https://plannera-ab-git-accept-item-78c-byr-57ba55-robbietalls-projects.vercel.app',
    deployment: 'dpl_HyncdptgBatoinZPEex5L44XN3uc',
    sha: '732de603021a3474222927ffbe34bac7a30b70f5',
    branch: 'accept/item-78c-byron-repaired-20260919',
  },
  KEMPSEY: {
    project: 'cmpmfohu20000jm04g67x29l4', other: 'cmp6uspof0000k10420hkjz9b',
    qsc: 'cmu46zfph0001l4042nja8wf2', endpoint: 'ep-muddy-dawn-a7tfo3kp',
    alias: 'https://plannera-ab-git-accept-item-78c-byr-c36eb6-robbietalls-projects.vercel.app',
    deployment: 'dpl_3Z7RZqws114FgjZ9MqCHuH5XiN37',
    sha: '87de1a054ed75290ff9d58e566cf37220f1de406',
    branch: 'accept/item-78c-byron-kempsey-20260914',
  },
});
export const REASONS = ['configuration_denied', 'preflight_refused', 'operation_already_paid',
  'prepared', 'recovered', 'preparation_failed'];
const normalize = s => s.replace(/\s+/g, ' ').trim().toLowerCase();
const fingerprint = s => createHash('sha256').update(normalize(s)).digest('hex');
const sessionId = s => typeof s === 'string' && /^cs_test_[A-Za-z0-9]{1,247}$/.test(s);
const sameKeys = (v, keys) => v && typeof v === 'object' && !Array.isArray(v)
  && Object.keys(v).sort().join(',') === keys.slice().sort().join(',');
const text = (v, limit) => typeof v === 'string' && v.length > 0 && v.length <= limit && !/[\r\n\x00]/.test(v);

export function configuration(env, now = Date.now()) {
  validateRequest(env, now);
  requireSafe(env.ITEM78C_TEST_PURCHASE_AUTHORIZED_COMMIT === env.GITHUB_SHA);
  requireSafe(env.ITEM74H_WORKFLOW_AUTHORIZED_COMMIT === ACCEPTANCE_SHA);
  const council = env.ITEM78C_PREPARE_COUNCIL;
  requireSafe(Object.hasOwn(TARGETS, council || ''));
  const target = TARGETS[council];
  requireSafe(env.PLANNERA_STRIPE_TEST_BASE_URL === target.alias
    && env.PLANNERA_STRIPE_TEST_ALLOWED_BASE_URL === target.alias);
  requireSafe(env.PLANNERA_STRIPE_TEST_PROJECT_ID === target.project
    && env.PLANNERA_STRIPE_TEST_OTHER_PROJECT_ID === target.other
    && env.PLANNERA_STRIPE_TEST_QSC_ARTEFACT_ID === target.qsc
    && env.ITEM74H_AUTHORIZED_DATABASE_TARGET === target.endpoint);
  const proposal = env.PLANNERA_STRIPE_TEST_PROPOSAL?.trim();
  const otherProposal = env.PLANNERA_STRIPE_TEST_OTHER_PROPOSAL?.trim();
  requireSafe(typeof proposal === 'string' && proposal.length >= 3 && proposal.length <= 2000);
  requireSafe(typeof otherProposal === 'string' && otherProposal.length >= 3 && otherProposal.length <= 2000
    && normalize(proposal) !== normalize(otherProposal));
  const body = JSON.parse(env.PLANNERA_STRIPE_TEST_DPP_REQUEST_JSON || '');
  requireSafe(sameKeys(body, ['projectId', 'proposalBrief'])
    && body.projectId === target.project && body.proposalBrief === proposal);
  const connection = env.ITEM74H_PREVIEW_DATABASE_URL;
  requireSafe(text(connection, 4096));
  const url = new URL(connection);
  requireSafe(['postgres:', 'postgresql:'].includes(url.protocol) && url.pathname === '/neondb'
    && url.username && url.password && !url.hash && (!url.port || url.port === '5432'));
  requireSafe(new RegExp('^' + target.endpoint + '(-pooler)?\\.[a-z0-9-]+\\.(aws|azure|gcp)\\.neon\\.tech$').test(url.hostname));
  requireSafe(['require', 'verify-full'].includes(url.searchParams.get('sslmode')));
  for (const key of url.searchParams.keys()) requireSafe(
    ['sslmode', 'channel_binding', 'connect_timeout', 'pool_timeout', 'connection_limit', 'pgbouncer'].includes(key)
    && url.searchParams.getAll(key).length === 1);
  requireSafe(/^sk_test_[A-Za-z0-9]{16,512}$/.test(env.STRIPE_TEST_SECRET_KEY || ''));
  requireSafe(sessionId(env.ITEM78A_STRIPE_TEST_SESSION_ID));
  requireSafe(text(env.PLANNERA_STRIPE_TEST_SESSION_COOKIE, 16384)
    && /^[A-Za-z0-9_-]{16,256}$/.test(env.PLANNERA_STRIPE_TEST_VERCEL_BYPASS || ''));
  const found = [];
  const seen = new Set();
  for (const part of env.PLANNERA_STRIPE_TEST_SESSION_COOKIE.split(';')) {
    const i = part.indexOf('=');
    requireSafe(i > 0);
    const name = part.slice(0, i).trim();
    if (!['__Secure-next-auth.session-token', 'next-auth.session-token'].includes(name)) continue;
    requireSafe(!seen.has(name)); seen.add(name);
    const value = part.slice(i + 1).trim();
    requireSafe(/^[A-Za-z0-9._~-]{1,512}$/.test(value)); found.push(value);
  }
  requireSafe(found.length > 0 && new Set(found).size === 1);
  requireSafe(text(env.ITEM74H_PREVIEW_VERCEL_ACCESS_TOKEN, 2048));
  return {
    council, target, proposal, otherProposal, body, connection,
    proposalFingerprint: fingerprint(proposal), otherFingerprint: fingerprint(otherProposal),
    oldSessionId: env.ITEM78A_STRIPE_TEST_SESSION_ID, sessionToken: found[0],
    cookie: env.PLANNERA_STRIPE_TEST_SESSION_COOKIE,
    bypass: env.PLANNERA_STRIPE_TEST_VERCEL_BYPASS,
    stripeKey: env.STRIPE_TEST_SECRET_KEY, vercelToken: env.ITEM74H_PREVIEW_VERCEL_ACCESS_TOKEN,
    operation: OPERATION, now,
  };
}

async function readJson(response, max = 131072) {
  requireSafe(response.ok && response.body);
  const reader = response.body.getReader();
  const chunks = []; let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      requireSafe(size <= max); chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

export async function verifyDeployment(config, request = fetch) {
  const d = await readJson(await request(
    'https://api.vercel.com/v13/deployments/' + config.target.deployment + '?teamId=team_PcbqmRcSuOQkGWFBsLLOrSbH',
    { method: 'GET', redirect: 'error', cache: 'no-store',
      headers: { Authorization: 'Bearer ' + config.vercelToken },
      signal: AbortSignal.timeout(15000) }));
  requireSafe(d.id === config.target.deployment && d.readyState === 'READY'
    && (d.target === null || d.target === 'preview')
    && (d.projectId ?? d.project?.id) === 'prj_zrdipeAvEKDJWlMDarjpDaxkHsVv'
    && d.meta?.githubCommitSha === config.target.sha
    && d.meta?.githubCommitRef === config.target.branch
    && Array.isArray(d.alias) && d.alias.includes(new URL(config.target.alias).hostname));
}

async function listAll(list, params) {
  const items = []; let after;
  for (let page = 0; page < 20; page++) {
    const result = await list({ ...params, limit: 100, ...(after ? { starting_after: after } : {}) });
    requireSafe(Array.isArray(result.data) && typeof result.has_more === 'boolean');
    items.push(...result.data);
    if (!result.has_more) return items;
    const next = result.data.at(-1)?.id;
    requireSafe(typeof next === 'string' && next && next !== after); after = next;
  }
  throw new Error('pagination_refused');
}

const paidSourceSnapshot = source => JSON.stringify(source);
const scopeEquals = (p, scope) => ['userId', 'projectId', 'quickSiteCheckArtefactId',
  'proposalFingerprint', 'productCode', 'productVersion', 'scopeKey', 'amountMinor', 'currency']
  .every(k => p[k] === scope[k]);

export function validateSession(session, purchase, config) {
  requireSafe(sessionId(session?.id) && session.livemode === false && session.mode === 'payment'
    && session.metadata?.purchase_id === purchase.id
    && session.metadata?.item78c_council === config.council
    && session.metadata?.item78c_operation === OPERATION
    && session.amount_total === 4900 && session.currency === 'aud'
    && session.automatic_tax?.enabled === true);
  requireSafe((session.status === 'open' && session.payment_status === 'unpaid')
    || (session.status === 'complete' && session.payment_status === 'paid'));
  const expected = config.target.alias + '/projects/' + config.target.project + '/workspace';
  requireSafe(session.success_url === expected + '?checkout=success'
    && session.cancel_url === expected + '?checkout=cancelled');
  if (session.status === 'open') {
    requireSafe(typeof session.expires_at === 'number' && session.expires_at * 1000 > config.now);
    const u = new URL(session.url);
    requireSafe(u.protocol === 'https:' && u.hostname === 'checkout.stripe.com'
      && !u.username && !u.password && u.pathname.split('/').includes(session.id));
  }
}

export async function prepare(env, openRuntime, request = fetch, now = Date.now()) {
  const summary = { version: 'item78c_test_purchase_preparation.v1', council: null,
    prepared: false, reason: 'configuration_denied', mutationMayHaveOccurred: false,
    oldPurchasePreserved: false, paymentPerformed: false, acceptanceDecisionUnchanged: true };
  let config;
  try { config = configuration(env, now); } catch { return summary; }
  summary.council = config.council;
  let runtime;
  try {
    await verifyDeployment(config, request);
    runtime = await openRuntime(config);
    const { db, stripe, service } = runtime;
    const account = await stripe.accounts.retrieve();
    requireSafe(account.id === ACCOUNT);
    const settings = await stripe.tax.settings.retrieve();
    const registrations = await listAll(p => stripe.tax.registrations.list(p), { status: 'active' });
    requireSafe(settings.status === 'active' && registrations.some(r =>
      r.country === 'AU' && r.status === 'active' && r.livemode === false));
    const hooks = await listAll(p => stripe.webhookEndpoints.list(p), {});
    requireSafe(hooks.some(h => {
      try {
        const u = new URL(h.url);
        return h.livemode === false && h.status === 'enabled'
          && u.origin === config.target.alias && u.pathname === '/api/webhooks/stripe'
          && !u.username && !u.password && !u.hash
          && Array.isArray(h.enabled_events)
          && (h.enabled_events.includes('*') || h.enabled_events.includes('checkout.session.completed'));
      } catch { return false; }
    }));
    const session = await db.session.findUnique({ where: { sessionToken: config.sessionToken } });
    requireSafe(session && new Date(session.expires).getTime() > now && typeof session.userId === 'string');
    const sources = await db.purchase.findMany({ where: {
      providerName: 'stripe', providerReference: config.oldSessionId,
    }, include: { entitlement: true }, take: 2 });
    requireSafe(sources.length === 1);
    const source = sources[0];
    requireSafe(source.status === 'PAID' && source.userId === session.userId
      && source.projectId === config.target.project && source.quickSiteCheckArtefactId === config.target.qsc
      && source.productCode === 'planning_controls_pack' && source.productVersion === 'v1'
      && source.amountMinor === 4900 && source.currency === 'AUD'
      && source.proposalFingerprint !== config.proposalFingerprint
      && source.entitlement?.status === 'ACTIVE' && source.entitlement.purchaseId === source.id
      && source.entitlement.activeScopeKey === source.scopeKey);
    for (const k of ['userId', 'projectId', 'quickSiteCheckArtefactId', 'proposalFingerprint', 'productCode', 'productVersion'])
      requireSafe(source.entitlement[k] === source[k]);
    const oldProvider = await stripe.checkout.sessions.retrieve(config.oldSessionId);
    requireSafe(oldProvider.id === config.oldSessionId && oldProvider.livemode === false
      && oldProvider.payment_status === 'paid' && oldProvider.status === 'complete'
      && oldProvider.metadata?.purchase_id === source.id);
    const sourceBefore = paidSourceSnapshot(source);
    const params = { userId: session.userId, projectId: config.target.project, proposalBrief: config.proposal };
    const scope = await service.resolveScope(params);
    requireSafe(scope.projectId === config.target.project && scope.quickSiteCheckArtefactId === config.target.qsc
      && scope.userId === session.userId && scope.proposalFingerprint === config.proposalFingerprint
      && scope.productCode === 'planning_controls_pack' && scope.productVersion === 'v1'
      && scope.amountMinor === 4900 && scope.currency === 'AUD');
    const own = await db.project.findUnique({ where: { id: config.target.project }, include: { siteContext: true } });
    requireSafe(own?.userId === session.userId && new RegExp('\\b' + config.council + '\\b', 'i')
      .test(String(own.siteContext?.lgaName || '') + ' ' + String(own.siteContext?.lgaCode || '')));
    const operationSessions = (await listAll(p => stripe.checkout.sessions.list(p), {
      created: { gte: Date.parse('2026-09-28T00:00:00Z') / 1000 },
    })).filter(s => s.metadata?.item78c_operation === OPERATION && s.metadata?.item78c_council === config.council);
    requireSafe(operationSessions.length <= 1 && operationSessions.every(s => s.livemode === false));
    const existing = await db.purchase.findMany({ where: { scopeKey: scope.scopeKey }, take: 2 });
    requireSafe(existing.length <= 1);
    let purchase = existing[0], checkout;
    if (purchase) {
      requireSafe(purchase.id !== source.id && scopeEquals(purchase, scope)
        && ['PENDING', 'PAID'].includes(purchase.status));
    }
    if (operationSessions.length === 1) {
      requireSafe(purchase && operationSessions[0].metadata?.purchase_id === purchase.id);
      checkout = await stripe.checkout.sessions.retrieve(operationSessions[0].id);
      validateSession(checkout, purchase, config);
      // A paid database record must never lead to another unpaid Checkout handoff.
      requireSafe(purchase.status !== 'PAID'
        || (checkout.status === 'complete' && checkout.payment_status === 'paid'));
      requireSafe(!purchase.providerReference || purchase.providerReference === checkout.id);
      if (!purchase.providerReference) {
        requireSafe(purchase.status === 'PENDING');
        summary.mutationMayHaveOccurred = true;
        await service.attachProviderCheckout(purchase.id, checkout.id);
      }
      summary.reason = checkout.payment_status === 'paid' ? 'operation_already_paid' : 'recovered';
    } else {
      requireSafe(!purchase?.providerReference && (!purchase || purchase.status === 'PENDING'));
      if (purchase) requireSafe(new Date(purchase.createdAt).getTime() <= now
        && now - new Date(purchase.createdAt).getTime() < 3600000);
      const state = await service.findCurrentScopePurchaseStatus(params);
      requireSafe(state.state === (purchase ? 'waiting' : 'available'));
      const negativeProposal = await service.findCurrentScopePurchaseStatus({ ...params, proposalBrief: config.otherProposal });
      const negativeProject = await service.findCurrentScopePurchaseStatus({ ...params, projectId: config.target.other });
      requireSafe(negativeProposal.state !== 'paid' && negativeProject.state !== 'paid');
      // This is the only creation path. Existing application services own purchase
      // creation, normal Stripe idempotency and provider-reference attachment.
      summary.mutationMayHaveOccurred = true;
      const created = await runtime.createCheckout(params);
      requireSafe(sessionId(created.id));
      checkout = await stripe.checkout.sessions.retrieve(created.id);
      const after = await db.purchase.findMany({ where: { scopeKey: scope.scopeKey }, take: 2 });
      requireSafe(after.length === 1);
      purchase = after[0];
      requireSafe(purchase.id !== source.id && scopeEquals(purchase, scope)
        && purchase.status === 'PENDING' && purchase.providerReference === checkout.id);
      validateSession(checkout, purchase, config);
      summary.reason = 'prepared';
    }
    const preserved = await db.purchase.findUnique({ where: { id: source.id }, include: { entitlement: true } });
    requireSafe(paidSourceSnapshot(preserved) === sourceBefore);
    summary.oldPurchasePreserved = true;
    summary.prepared = true;
  } catch {
    summary.reason = summary.mutationMayHaveOccurred ? 'preparation_failed' : 'preflight_refused';
  } finally {
    try { if (runtime) await runtime.close(); } catch {
      summary.prepared = false; summary.reason = 'preparation_failed';
    }
  }
  return summary;
}

export async function openRuntime(config) {
  // Called only AFTER strict target/key/configuration and Vercel identity checks.
  // Imports are executable dependency code, not proven safe by source hashes alone.
  process.env.DATABASE_URL = config.connection;
  process.env.DIRECT_URL = config.connection;
  const { PrismaClient } = await import('@prisma/client');
  const { default: Stripe } = await import('stripe');
  const { PurchaseEntitlementService } = await import('../src/lib/purchase-entitlements.ts');
  const { createPlanningPackCheckout } = await import('../src/lib/planning-pack-checkout.ts');
  const { StripeCommerceProvider } = await import('../src/lib/stripe-commerce.ts');
  const { PLANNING_CONTROLS_PACK_TERMS } = await import('../src/lib/planning-pack-commerce.ts');
  const db = new PrismaClient({ datasources: { db: { url: config.connection } }, log: [] });
  const stripe = new Stripe(config.stripeKey, { maxNetworkRetries: 0, timeout: 15000 });
  const create = stripe.checkout.sessions.create.bind(stripe.checkout.sessions);
  stripe.checkout.sessions.create = (params, options) => {
    requireSafe(params.mode === 'payment' && params.metadata?.purchase_id
      && params.automatic_tax?.enabled === true && options?.idempotencyKey);
    return create({ ...params, metadata: { ...params.metadata,
      item78c_operation: OPERATION, item78c_council: config.council } }, options);
  };
  const service = new PurchaseEntitlementService(db, PLANNING_CONTROLS_PACK_TERMS);
  const base = config.target.alias + '/projects/' + config.target.project + '/workspace';
  const provider = new StripeCommerceProvider({ enabled: true, secretKey: config.stripeKey,
    successUrl: base + '?checkout=success', cancelUrl: base + '?checkout=cancelled' }, stripe);
  return { db, stripe, service, createCheckout: params => createPlanningPackCheckout(service, provider, params),
    close: () => db.$disconnect() };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await prepare(process.env, openRuntime);
    process.stdout.write(JSON.stringify(result) + '\n');
    process.exitCode = result.prepared ? 0 : 1;
  } catch {
    process.stdout.write('{"version":"item78c_test_purchase_preparation.v1","council":null,"prepared":false,"reason":"preparation_failed","mutationMayHaveOccurred":true,"oldPurchasePreserved":false,"paymentPerformed":false,"acceptanceDecisionUnchanged":true}\n');
    process.exitCode = 1;
  }
}
