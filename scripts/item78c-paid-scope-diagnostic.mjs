import { pathToFileURL } from 'node:url';
import { ACCEPTANCE_SHA, requireSafe, validateRequest } from './item78c-paid-scope-authorize.mjs';

const TARGETS = Object.freeze({
  BYRON: Object.freeze({
    project: 'cmp6uspof0000k10420hkjz9b',
    otherProject: 'cmpmfohu20000jm04g67x29l4',
    qsc: 'cmu46wmy60001jw04kzysjnph',
    alias: 'https://plannera-ab-git-accept-item-78c-byr-57ba55-robbietalls-projects.vercel.app',
    immutable: 'https://plannera-8lkwbwyg4-robbietalls-projects.vercel.app',
  }),
  KEMPSEY: Object.freeze({
    project: 'cmpmfohu20000jm04g67x29l4',
    otherProject: 'cmp6uspof0000k10420hkjz9b',
    qsc: 'cmu46zfph0001l4042nja8wf2',
    alias: 'https://plannera-ab-git-accept-item-78c-byr-c36eb6-robbietalls-projects.vercel.app',
    immutable: 'https://plannera-8ibu6w7b0-robbietalls-projects.vercel.app',
  }),
});
const STATES = new Set(['available', 'waiting', 'paid', 'failed', 'cancelled', 'refunded', 'revoked']);
const ERRORS = new Set(['network_or_redirect_denied', 'http_401', 'http_403',
  'http_404', 'http_other', 'response_contract_invalid', 'checkout_disabled']);
class SafeFailure extends Error {
  constructor(reason) { super(reason); this.reason = reason; }
}
const failure = reason => { throw new SafeFailure(reason); };
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const sameKeys = (value, keys) => value && typeof value === 'object'
  && !Array.isArray(value) && Object.keys(value).sort().join(',') === keys.slice().sort().join(',');

export function configuration(env) {
  validateRequest(env);
  requireSafe(env.ITEM78C_SCOPE_DIAGNOSTIC_AUTHORIZED_COMMIT === env.GITHUB_SHA);
  requireSafe(env.ITEM74H_WORKFLOW_AUTHORIZED_COMMIT === ACCEPTANCE_SHA);
  const council = env.ITEM78C_DIAGNOSTIC_COUNCIL;
  requireSafe(Object.hasOwn(TARGETS, council || ''));
  const target = TARGETS[council];
  const cleanOrigin = value => {
    const url = new URL(value);
    requireSafe(url.protocol === 'https:' && !url.username && !url.password
      && !url.search && !url.hash && url.pathname === '/');
    return url.origin;
  };
  requireSafe(cleanOrigin(env.PLANNERA_STRIPE_TEST_BASE_URL) === target.alias);
  requireSafe(cleanOrigin(env.PLANNERA_STRIPE_TEST_ALLOWED_BASE_URL) === target.alias);
  requireSafe(env.PLANNERA_STRIPE_TEST_PROJECT_ID?.trim() === target.project);
  requireSafe(env.PLANNERA_STRIPE_TEST_OTHER_PROJECT_ID?.trim() === target.otherProject);
  requireSafe(env.PLANNERA_STRIPE_TEST_QSC_ARTEFACT_ID?.trim() === target.qsc);
  const proposal = env.PLANNERA_STRIPE_TEST_PROPOSAL?.trim();
  const otherProposal = env.PLANNERA_STRIPE_TEST_OTHER_PROPOSAL?.trim();
  requireSafe(nonempty(proposal) && nonempty(otherProposal)
    && proposal.length <= 32768 && otherProposal.length <= 32768);
  requireSafe(proposal !== otherProposal);
  const body = JSON.parse(env.PLANNERA_STRIPE_TEST_DPP_REQUEST_JSON || '');
  requireSafe(sameKeys(body, ['projectId', 'proposalBrief']));
  requireSafe(body.projectId === target.project && body.proposalBrief === proposal);
  const cookie = env.PLANNERA_STRIPE_TEST_SESSION_COOKIE?.trim();
  const bypass = env.PLANNERA_STRIPE_TEST_VERCEL_BYPASS?.trim();
  requireSafe(nonempty(cookie) && cookie.length <= 16384 && !/[\r\n\x00]/.test(cookie));
  requireSafe(/^[A-Za-z0-9_-]{16,256}$/.test(bypass || ''));
  return { council, target, proposal, otherProposal, body, cookie, bypass };
}

async function boundedJson(response) {
  if (!response.body) failure('response_contract_invalid');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = '';
  try {
    for (;;) {
      const result = await reader.read();
      if (result.done) break;
      bytes += result.value.byteLength;
      if (bytes > 2048) {
        await reader.cancel().catch(() => {});
        failure('response_contract_invalid');
      }
      text += decoder.decode(result.value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text);
  } catch (error) {
    if (error instanceof SafeFailure) throw error;
    failure('response_contract_invalid');
  } finally {
    reader.releaseLock();
  }
}

async function status(config, body, request) {
  // The only application network operation is a source-reviewed read-only
  // status endpoint on one of two fixed immutable Preview deployments.
  let response;
  try {
    response = await request(config.target.immutable + '/api/planning-pack/status', {
      method: 'POST', redirect: 'error', cache: 'no-store',
      headers: { 'content-type': 'application/json', cookie: config.cookie,
        'x-vercel-protection-bypass': config.bypass },
      body: JSON.stringify(body), signal: AbortSignal.timeout(15000),
    });
  } catch { failure('network_or_redirect_denied'); }
  if (!response.ok) {
    failure([401, 403, 404].includes(response.status) ? 'http_' + response.status : 'http_other');
  }
  const value = await boundedJson(response);
  if (!sameKeys(value, ['enabled', 'state'])) failure('response_contract_invalid');
  if (value.enabled === false && value.state === 'free') failure('checkout_disabled');
  if (value.enabled !== true || !STATES.has(value.state)) failure('response_contract_invalid');
  return value.state;
}

export async function diagnose(env, request = fetch) {
  const summary = {
    version: 'item78c_paid_scope_diagnostic.v1',
    council: null,
    completed: false,
    reason: 'configuration_denied',
    targetKind: 'fixed_immutable_preview',
    statuses: { exact: null, changedProposal: null, otherProject: null },
    checks: null,
    requestErrors: { exact: null, changedProposal: null, otherProject: null },
    containsSensitiveValues: false,
    acceptanceDecisionUnchanged: true,
  };
  let config;
  try { config = configuration(env); } catch { return summary; }
  summary.council = config.council;
  const bodies = {
    exact: config.body,
    changedProposal: { projectId: config.target.project, proposalBrief: config.otherProposal },
    otherProject: { projectId: config.target.otherProject, proposalBrief: config.proposal },
  };
  for (const key of Object.keys(bodies)) {
    try { summary.statuses[key] = await status(config, bodies[key], request); }
    catch (error) {
      summary.requestErrors[key] = error instanceof SafeFailure && ERRORS.has(error.reason)
        ? error.reason : 'response_contract_invalid';
    }
  }
  summary.completed = Object.values(summary.requestErrors).every(value => value === null);
  if (!summary.completed) {
    summary.reason = 'request_incomplete';
    return summary;
  }
  summary.checks = {
    exactPaid: summary.statuses.exact === 'paid',
    changedProposalNotPaid: summary.statuses.changedProposal !== 'paid',
    otherProjectNotPaid: summary.statuses.otherProject !== 'paid',
    inputProposalsDiffer: config.proposal !== config.otherProposal,
  };
  summary.reason = !summary.checks.exactPaid ? 'exact_scope_not_paid'
    : !summary.checks.changedProposalNotPaid ? 'changed_proposal_paid'
    : !summary.checks.otherProjectNotPaid ? 'other_project_paid'
    : 'three_scope_checks_match';
  return summary;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const summary = await diagnose(process.env);
    process.stdout.write(JSON.stringify(summary) + '\n');
    process.exitCode = summary.completed ? 0 : 1;
  } catch {
    process.stdout.write('Read-only scope diagnostic refused; no raw error output.\n');
    process.exitCode = 1;
  }
}
