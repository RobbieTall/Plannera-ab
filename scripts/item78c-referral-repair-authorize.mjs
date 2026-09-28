import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { REPOSITORY, BRANCH, ACCEPTANCE_SHA, EXPIRES_AT, validateProtection } from './item78c-test-purchase-authorize.mjs';
const requireSafe = value => { if (!value) throw new Error('referral_repair_authorization_denied'); };
export function validateRequest(env, now = Date.now()) {
  requireSafe(env.ITEM78C_REFERRAL_REPAIR_ONLY === 'true');
  requireSafe(env.ITEM78C_REFERRAL_REPAIR_CONFIRMATION === 'REGENERATE PREVIEW REVIEW PACKAGE');
  requireSafe(env.ITEM78C_REFERRAL_REPAIR_TARGET === 'PROTECTED NON-PRODUCTION');
  requireSafe(env.GITHUB_REPOSITORY === REPOSITORY && env.GITHUB_EVENT_NAME === 'workflow_dispatch');
  requireSafe(env.GITHUB_REF === 'refs/heads/' + BRANCH);
  requireSafe(/^[a-f0-9]{40}$/.test(env.ITEM78C_REFERRAL_REPAIR_EXPECTED_SHA || ''));
  requireSafe(env.GITHUB_SHA === env.ITEM78C_REFERRAL_REPAIR_EXPECTED_SHA);
  requireSafe(env.PLANNING_PACK_CHECKOUT_ENABLED === 'false' && env.SUBMISSION_SEE_CHECKOUT_ENABLED === 'false');
  requireSafe(Number.isFinite(now) && now >= Date.parse('2026-09-28T00:00:00Z') && now < Date.parse(EXPIRES_AT));
}
const git = args => spawnSync('git', args, { shell: false, encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] });
export async function authorize(env, phase, run = git, request = fetch, now = Date.now()) {
  requireSafe(['credential-free', 'protected'].includes(phase));
  validateRequest(env, now);
  requireSafe(run(['fetch', '--no-tags', 'origin', '+refs/heads/main:refs/remotes/origin/main']).status === 0);
  const head = run(['rev-parse', 'HEAD']);
  requireSafe(head.status === 0 && head.stdout.trim() === env.GITHUB_SHA);
  requireSafe(run(['merge-base', '--is-ancestor', ACCEPTANCE_SHA, env.GITHUB_SHA]).status === 0);
  requireSafe(run(['merge-base', '--is-ancestor', env.GITHUB_SHA, 'refs/remotes/origin/main']).status === 1);
  if (phase === 'protected') {
    requireSafe(env.ITEM78C_REFERRAL_REPAIR_AUTHORIZED_COMMIT === env.GITHUB_SHA);
    requireSafe(env.ITEM74H_WORKFLOW_AUTHORIZED_COMMIT === ACCEPTANCE_SHA);
    requireSafe(env.ITEM74H_PREVIEW_MUTATION_APPROVED === 'true');
    requireSafe(env.ITEM74H_AUTHORIZED_DATABASE_TARGET === 'ep-muddy-dawn-a7tfo3kp');
  }
  requireSafe(typeof env.GH_TOKEN === 'string' && env.GH_TOKEN.length > 0);
  const get = async path => {
    const response = await request('https://api.github.com/repos/' + REPOSITORY + path, {
      method: 'GET', redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { Authorization: 'Bearer ' + env.GH_TOKEN, Accept: 'application/vnd.github+json' },
    });
    requireSafe(response.ok);
    return response.json();
  };
  const base = '/environments/item78c-kempsey-preview';
  validateProtection(await get(base), await get(base + '/deployment-branch-policies?per_page=100'));
  for (const status of ['queued', 'in_progress', 'waiting', 'pending', 'requested']) {
    const runs = await get('/actions/workflows/item78c-byron-kempsey-acceptance.yml/runs?status=' + status + '&per_page=1');
    requireSafe(runs.total_count === 0 && Array.isArray(runs.workflow_runs) && runs.workflow_runs.length === 0);
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await authorize(process.env, process.argv[2]); process.stdout.write('Preview referral repair authorization passed.\n'); }
  catch { process.stdout.write('Preview referral repair authorization refused.\n'); process.exitCode = 1; }
}

