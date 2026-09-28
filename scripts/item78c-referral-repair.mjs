import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { validateRequest } from './item78c-referral-repair-authorize.mjs';
const ORIGIN = 'https://plannera-ab-git-accept-item-78c-byr-c36eb6-robbietalls-projects.vercel.app';
const ID = /^[A-Za-z0-9_-]{1,128}$/;
const REASONS = ['configuration_invalid', 'request_failed', 'source_invalid', 'ambiguous_reviews', 'replacement_invalid', 'preservation_failed', 'unexpected_failure'];
const CHECKS = ['configuration', 'sourceBound', 'originalPreserved', 'replacementValidated'];
class Refusal extends Error {}
const requireSafe = (value, reason) => { if (!value) throw new Refusal(reason); };
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)])) : value;
const digest = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
export function configuration(env, now = Date.now()) {
  try { validateRequest(env, now); } catch { throw new Refusal('configuration_invalid'); }
  requireSafe(env.ITEM78C_REFERRAL_REPAIR_AUTHORIZED_COMMIT === env.GITHUB_SHA, 'configuration_invalid');
  requireSafe(env.ITEM74H_PREVIEW_MUTATION_APPROVED === 'true' &&
    env.ITEM74H_AUTHORIZED_DATABASE_TARGET === 'ep-muddy-dawn-a7tfo3kp', 'configuration_invalid');
  requireSafe(env.PLANNERA_REFERRAL_TEST_BASE_URL === ORIGIN &&
    env.PLANNERA_REFERRAL_TEST_ALLOWED_BASE_URL === ORIGIN, 'configuration_invalid');
  const project = env.PLANNERA_REFERRAL_TEST_PROJECT_ID;
  const oldReview = env.PLANNERA_REFERRAL_TEST_REVIEW_REQUEST_ARTEFACT_ID;
  requireSafe(ID.test(project || '') && ID.test(oldReview || ''), 'configuration_invalid');
  const cookie = env.PLANNERA_REFERRAL_TEST_SESSION_COOKIE;
  const bypass = env.PLANNERA_REFERRAL_TEST_VERCEL_BYPASS;
  requireSafe(typeof cookie === 'string' && cookie.length > 10 && cookie.length < 8192 &&
    !/[\r\n]/.test(cookie) && /^[A-Za-z0-9_-]{16,256}$/.test(bypass || ''), 'configuration_invalid');
  return { project, oldReview, cookie, bypass };
}
export async function repair(env, request = fetch, now = Date.now()) {
  const result = {
    version: 'item78c_referral_repair.v1', passed: false, reason: null,
    mutationMayHaveOccurred: false, reused: false,
    checks: Object.fromEntries(CHECKS.map(k => [k, false])),
  };
  try {
    const cfg = configuration(env, now);
    result.checks.configuration = true;
    const api = async (path, method = 'GET', body) => {
      try {
        const response = await request(ORIGIN + path, {
          method, redirect: 'error', signal: AbortSignal.timeout(30000),
          headers: { cookie: cfg.cookie, 'x-vercel-protection-bypass': cfg.bypass,
            ...(body ? { 'content-type': 'application/json' } : {}) },
          ...(body ? { body: JSON.stringify(body) } : {}),
        });
        requireSafe(response.ok, 'request_failed');
        const text = await response.text();
        requireSafe(text.length <= 4_000_000, 'request_failed');
        return JSON.parse(text);
      } catch (error) {
        if (error instanceof Refusal) throw error;
        throw new Refusal('request_failed');
      }
    };
    const projectPath = '/api/projects/' + encodeURIComponent(cfg.project);
    const list = await api(projectPath + '/artefacts');
    requireSafe(Array.isArray(list) && list.every(a => a.projectId === cfg.project), 'source_invalid');
    const old = list.find(a => a.id === cfg.oldReview && a.type === 'review_request');
    requireSafe(old && !old.staleAt && old.payload?.projectId === cfg.project &&
      /kempsey/i.test(old.payload?.site?.lga || ''), 'source_invalid');
    const originalDigest = digest(old);
    const binding = old.payload.detailedPlanningPack;
    requireSafe(binding && ID.test(binding.artefactId || '') && ID.test(binding.sourceQuickSiteCheckArtefactId || '') &&
      typeof binding.proposalBrief === 'string' && binding.proposalBrief.trim().length > 0, 'source_invalid');
    const pack = list.find(a => a.id === binding.artefactId && a.type === 'detailed_planning_pack' && !a.staleAt);
    const qsc = list.find(a => a.id === binding.sourceQuickSiteCheckArtefactId && a.type === 'quick_site_check' && !a.staleAt);
    requireSafe(pack && qsc && pack.payload?.proposalBrief === binding.proposalBrief, 'source_invalid');
    result.checks.sourceBound = true;
    const matches = a => a.type === 'review_request' && !a.staleAt && a.payload?.projectId === cfg.project &&
      a.payload?.consultantNeedsVersion === 'consultant-needs.v1' &&
      a.payload?.detailedPlanningPack?.artefactId === binding.artefactId &&
      a.payload?.detailedPlanningPack?.sourceQuickSiteCheckArtefactId === binding.sourceQuickSiteCheckArtefactId &&
      a.payload?.detailedPlanningPack?.proposalBrief === binding.proposalBrief;
    const candidates = list.filter(matches);
    requireSafe(candidates.length <= 1, 'ambiguous_reviews');
    let replacement = candidates[0];
    if (replacement) { result.reused = true; }
    else {
      result.mutationMayHaveOccurred = true;
      const generated = await api('/api/artefacts/request-review', 'POST', {
        projectId: cfg.project, sourceDetailedPlanningPackArtefactId: binding.artefactId,
        expectedProposalBrief: binding.proposalBrief,
      });
      requireSafe(ID.test(generated.artefactId || '') && generated.artefactId !== cfg.oldReview, 'replacement_invalid');
      replacement = { id: generated.artefactId, type: 'review_request', payload: generated.content, staleAt: null };
      requireSafe(matches(replacement), 'replacement_invalid');
    }
    const refreshed = await api(projectPath + '/artefacts');
    requireSafe(Array.isArray(refreshed) && refreshed.every(a => a.projectId === cfg.project), 'replacement_invalid');
    const preserved = refreshed.find(a => a.id === cfg.oldReview);
    requireSafe(preserved && digest(preserved) === originalDigest, 'preservation_failed');
    result.checks.originalPreserved = true;
    const eligible = refreshed.filter(matches);
    requireSafe(eligible.length === 1 && eligible[0].id === replacement.id, 'ambiguous_reviews');
    const preflight = await api(projectPath + '/consultant-referrals?reviewRequestArtefactId=' + encodeURIComponent(replacement.id));
    requireSafe(preflight.enabled === true && preflight.referral === null, 'replacement_invalid');
    result.checks.replacementValidated = true;
    result.passed = true;
  } catch (error) {
    result.reason = error instanceof Refusal && REASONS.includes(error.message) ? error.message : 'unexpected_failure';
  }
  return result;
}
export function safeSummary(result) {
  const keys = ['version', 'passed', 'reason', 'mutationMayHaveOccurred', 'reused', 'checks'].sort();
  requireSafe(result && JSON.stringify(Object.keys(result).sort()) === JSON.stringify(keys), 'replacement_invalid');
  requireSafe(result.version === 'item78c_referral_repair.v1' &&
    ['passed', 'mutationMayHaveOccurred', 'reused'].every(k => typeof result[k] === 'boolean') &&
    JSON.stringify(Object.keys(result.checks || {}).sort()) === JSON.stringify([...CHECKS].sort()) &&
    Object.values(result.checks).every(v => typeof v === 'boolean') &&
    (result.passed ? result.reason === null && Object.values(result.checks).every(Boolean) : REASONS.includes(result.reason)), 'replacement_invalid');
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = process.argv[2] === '--summary'
      ? safeSummary(JSON.parse(readFileSync(process.env.RUNNER_TEMP + '/item78c-referral-repair.json', 'utf8')))
      : await repair(process.env);
    process.stdout.write(JSON.stringify(result) + '\n');
    if (!result.passed) process.exitCode = 1;
  } catch {
    process.stdout.write('Preview referral repair output refused; no raw error output.\n');
    process.exitCode = 1;
  }
}

