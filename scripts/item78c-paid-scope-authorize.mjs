import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const REPOSITORY = 'RobbieTall/Plannera-ab';
export const BRANCH = 'diag/item78c-paid-scope-20260928';
export const ACCEPTANCE_BRANCH = 'accept/item-78c-byron-kempsey-20260914';
export const ACCEPTANCE_SHA = 'fcd0c27c68daea81bd51e28b567e469a5fe6b97a';
export const EXPIRES_AT = '2026-09-30T00:00:00Z';
export const ENVIRONMENTS = ['item78c-byron-preview', 'item78c-kempsey-preview'];

export function requireSafe(value) {
  if (!value) throw new Error('scope_diagnostic_authorization_denied');
}

export function validateRequest(env, now = Date.now()) {
  requireSafe(env.GITHUB_REPOSITORY === REPOSITORY);
  requireSafe(env.GITHUB_EVENT_NAME === 'workflow_dispatch');
  requireSafe(env.GITHUB_REF === 'refs/heads/' + BRANCH);
  requireSafe(env.ITEM78C_DIAGNOSTIC_CONFIRMATION === 'READ ONLY PREVIEW SCOPE CHECK');
  requireSafe(/^[a-f0-9]{40}$/.test(env.ITEM78C_DIAGNOSTIC_EXPECTED_SHA || ''));
  requireSafe(env.GITHUB_SHA === env.ITEM78C_DIAGNOSTIC_EXPECTED_SHA);
  requireSafe(env.PLANNING_PACK_CHECKOUT_ENABLED === 'false');
  requireSafe(env.SUBMISSION_SEE_CHECKOUT_ENABLED === 'false');
  requireSafe(Number.isFinite(now) && now >= Date.parse('2026-09-27T00:00:00Z')
    && now < Date.parse(EXPIRES_AT));
}

export function validateProtection(environment, policies) {
  requireSafe(environment?.deployment_branch_policy?.custom_branch_policies === true);
  requireSafe(environment.deployment_branch_policy.protected_branches === false);
  requireSafe(environment.can_admins_bypass === false);
  requireSafe(Array.isArray(environment.protection_rules));
  const reviewerRules = environment.protection_rules.filter(rule =>
    rule?.type === 'required_reviewers');
  requireSafe(reviewerRules.length === 1);
  const reviewers = reviewerRules[0].reviewers;
  requireSafe(Array.isArray(reviewers) && reviewers.length === 1);
  requireSafe(reviewers[0]?.type === 'User' && reviewers[0].reviewer?.id === 106786418);
  requireSafe(policies?.total_count === 2 && policies.branch_policies?.length === 2);
  const names = new Set(policies.branch_policies.map(policy => {
    requireSafe(policy.type === 'branch');
    return policy.name;
  }));
  requireSafe(names.size === 2 && names.has(BRANCH) && names.has(ACCEPTANCE_BRANCH));
}

function git(args) {
  return spawnSync('git', args, {
    shell: false, encoding: 'utf8', timeout: 30000,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

export function validateGit(env, run = git) {
  validateRequest(env);
  requireSafe(run(['fetch', '--no-tags', 'origin',
    '+refs/heads/main:refs/remotes/origin/main']).status === 0);
  const head = run(['rev-parse', 'HEAD']);
  requireSafe(head.status === 0 && head.stdout.trim() === env.GITHUB_SHA);
  requireSafe(run(['merge-base', '--is-ancestor', ACCEPTANCE_SHA, env.GITHUB_SHA]).status === 0);
  requireSafe(run(['merge-base', '--is-ancestor', env.GITHUB_SHA,
    'refs/remotes/origin/main']).status === 1);
}

export async function authorize(env, phase, run = git, request = fetch) {
  requireSafe(phase === 'credential-free' || phase === 'protected');
  validateGit(env, run);
  if (phase === 'protected') {
    requireSafe(['BYRON', 'KEMPSEY'].includes(env.ITEM78C_DIAGNOSTIC_COUNCIL));
    requireSafe(env.ITEM78C_SCOPE_DIAGNOSTIC_AUTHORIZED_COMMIT === env.GITHUB_SHA);
    requireSafe(env.ITEM74H_WORKFLOW_AUTHORIZED_COMMIT === ACCEPTANCE_SHA);
  }
  requireSafe(typeof env.GH_TOKEN === 'string' && env.GH_TOKEN.length > 0);
  for (const name of ENVIRONMENTS) {
    const base = 'https://api.github.com/repos/' + REPOSITORY + '/environments/' + name;
    const get = async path => {
      const response = await request(base + path, {
        method: 'GET', redirect: 'error',
        headers: { Authorization: 'Bearer ' + env.GH_TOKEN,
          Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
        signal: AbortSignal.timeout(15000),
      });
      requireSafe(response.ok);
      return response.json();
    };
    validateProtection(await get(''), await get('/deployment-branch-policies?per_page=100'));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await authorize(process.env, process.argv[2]);
    process.stdout.write('Read-only Preview scope authorization passed.\n');
  } catch {
    process.stdout.write('Read-only Preview scope authorization refused; no raw error output.\n');
    process.exitCode = 1;
  }
}
