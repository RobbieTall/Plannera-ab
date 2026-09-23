import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const REPO = 'RobbieTall/Plannera-ab';
const BRANCH = 'accept/item-78c-byron-kempsey-20260914';
const ENVIRONMENTS = ['item78c-byron-preview', 'item78c-kempsey-preview'];
const ENDPOINTS = { BYRON: 'ep-wild-water-a796xzd7', KEMPSEY: 'ep-muddy-dawn-a7tfo3kp' };
function requireSafe(condition) { if (!condition) throw new Error('authorization_denied'); }

export function validateRequest(env) {
  requireSafe(env.GITHUB_REPOSITORY === REPO && env.GITHUB_EVENT_NAME === 'workflow_dispatch');
  requireSafe(env.GITHUB_REF === `refs/heads/${BRANCH}`);
  requireSafe(env.ITEM78C_DIAGNOSTIC_CONFIRMATION === 'READ ONLY PREVIEW LOGIN CHECK');
  requireSafe(/^[a-f0-9]{40}$/.test(env.ITEM78C_DIAGNOSTIC_EXPECTED_SHA || ''));
  requireSafe(env.GITHUB_SHA === env.ITEM78C_DIAGNOSTIC_EXPECTED_SHA);
}

export function validateProtection(environment, policies) {
  requireSafe(environment?.deployment_branch_policy?.custom_branch_policies === true);
  requireSafe(environment.deployment_branch_policy.protected_branches === false);
  requireSafe(environment.can_admins_bypass === false);
  requireSafe(Array.isArray(environment.protection_rules) && environment.protection_rules.some(rule =>
    rule.type === 'required_reviewers' && Array.isArray(rule.reviewers) && rule.reviewers.length > 0));
  requireSafe(policies?.total_count === 1 && policies.branch_policies?.length === 1);
  requireSafe(policies.branch_policies[0].type === 'branch' && policies.branch_policies[0].name === BRANCH);
}

function git(args) {
  return spawnSync('git', args, { encoding: 'utf8', shell: false, timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] });
}
export function validateGit(env, run = git) {
  validateRequest(env);
  requireSafe(run(['fetch', '--no-tags', 'origin', '+refs/heads/main:refs/remotes/origin/main']).status === 0);
  const head = run(['rev-parse', 'HEAD']);
  requireSafe(head.status === 0 && head.stdout.trim() === env.GITHUB_SHA);
  // 0 means contained in main; 1 means not contained; any other result is an error.
  requireSafe(run(['merge-base', '--is-ancestor', env.GITHUB_SHA, 'refs/remotes/origin/main']).status === 1);
}

export async function authorize(env, protectedPhase, run = git, request = fetch) {
  validateGit(env, run);
  if (protectedPhase) {
    requireSafe(['BYRON', 'KEMPSEY'].includes(env.ITEM78C_DIAGNOSTIC_COUNCIL));
    requireSafe(env.ITEM74H_WORKFLOW_AUTHORIZED_COMMIT === env.GITHUB_SHA);
    requireSafe(env.ITEM74H_AUTHORIZED_DATABASE_TARGET === ENDPOINTS[env.ITEM78C_DIAGNOSTIC_COUNCIL]);
  }
  requireSafe(typeof env.GH_TOKEN === 'string' && env.GH_TOKEN.length > 0);
  for (const name of ENVIRONMENTS) {
    const base = `https://api.github.com/repos/${REPO}/environments/${name}`;
    const get = async path => {
      const response = await request(base + path, { method: 'GET', redirect: 'error',
        headers: { Authorization: `Bearer ${env.GH_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
        signal: AbortSignal.timeout(15000) });
      requireSafe(response.ok);
      return response.json();
    };
    validateProtection(await get(''), await get('/deployment-branch-policies?per_page=100'));
  }
}

export function safeSummary(summary) {
  const keys = ['checks', 'council', 'matched', 'reason', 'version'];
  const checks = ['projectPresent', 'projectUsesDevBypassOwner', 'sessionOwnsProject', 'sessionPresent', 'sessionUnexpired'];
  const reasons = ['configuration_invalid', 'nextauth_cookie_missing', 'database_contract_invalid', 'project_missing',
    'session_missing', 'session_expired', 'session_owner_mismatch', 'session_project_match',
    'database_authentication_failed', 'database_unreachable', 'database_timeout', 'database_check_failed'];
  requireSafe(summary && JSON.stringify(Object.keys(summary).sort()) === JSON.stringify(keys));
  requireSafe(summary.version === 'item78c_session_preflight.v1');
  requireSafe(summary.council === null || ['BYRON', 'KEMPSEY'].includes(summary.council));
  requireSafe(typeof summary.matched === 'boolean' && reasons.includes(summary.reason));
  requireSafe(summary.matched === (summary.reason === 'session_project_match'));
  requireSafe(summary.checks === null || (JSON.stringify(Object.keys(summary.checks).sort()) === JSON.stringify(checks)
    && Object.values(summary.checks).every(v => typeof v === 'boolean')));
  if (summary.matched) requireSafe(summary.checks?.sessionPresent && summary.checks.sessionUnexpired
    && summary.checks.projectPresent && summary.checks.sessionOwnsProject);
  return summary;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv[2] === 'summary') {
      const { readFile } = await import('node:fs/promises');
      const summary = safeSummary(JSON.parse(await readFile('item78c-session-preflight.json', 'utf8')));
      process.stdout.write(`${JSON.stringify(summary)}\n`);
      process.exitCode = summary.matched ? 0 : 1;
    } else {
      requireSafe(['credential-free', 'protected'].includes(process.argv[2]));
      await authorize(process.env, process.argv[2] === 'protected');
      process.stdout.write('Preview diagnostic authorization passed.\n');
    }
  } catch {
    process.stdout.write('Preview diagnostic gate refused; no raw error output.\n');
    process.exitCode = 1;
  }
}
