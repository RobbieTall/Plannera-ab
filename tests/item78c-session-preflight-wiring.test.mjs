import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateGit } from '../scripts/item78c-session-preflight-authorize.mjs';

const read = name => readFileSync(new URL('../.github/workflows/' + name, import.meta.url), 'utf8');
const caller = read('item77-protected-commercial-journey.yml');
const callee = read('item78c-session-preflight.yml');
const ci = read('item78c-session-preflight-contract.yml');
const diagnostic = caller.slice(caller.indexOf('  session-diagnostic:'), caller.indexOf('\n  session-authorize:'));
const authorization = caller.slice(caller.indexOf('  session-authorize:'), caller.indexOf('\n  presence-authorize:'));
const originalSteps = "    steps:\n      - name: Checkout\n        uses: actions/checkout@v4\n      - name: Use Node.js\n        uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: npm\n      - name: Install dependencies\n        run: npm ci\n      - name: Verify Stripe test lifecycle contract\n        run: npx tsx --test tests/stripe-test-acceptance.test.ts\n      - name: Verify credit, evidence, rendering and progressive disclosure\n        run: >-\n          npx vitest run\n          src/lib/submission-see-credit.test.ts\n          src/lib/item74h-progressive-evidence-regeneration.test.ts\n          src/lib/submission-see-renderer.test.ts\n          src/lib/item74h-visual-acceptance.test.ts\n          tests/see-document-panel.test.tsx\n      - name: Verify qualified working DOCX/PDF regeneration\n        run: npm run --silent accept:item74h-working-see-preview\n";

test('registered caller preserves every original commercial test step', () => {
  const job = caller.slice(caller.indexOf('  commercial-journey:'), caller.indexOf('\n  session-diagnostic:'));
  assert.equal(job.slice(job.indexOf('    steps:')).trimEnd(), originalSteps.trimEnd());
  assert.ok(job.includes("github.event_name != 'workflow_dispatch' || (!inputs.diagnostic_only && !inputs.presence_only)"));
});
test('direct login diagnostic is manual-only and mutually exclusive with presence mode', () => {
  assert.match(caller, /diagnostic_only:\n[\s\S]*?type: boolean\n        required: false\n        default: false/);
  const gate = "github.event_name == 'workflow_dispatch' && inputs.diagnostic_only && !inputs.presence_only";
  assert.ok(diagnostic.includes(gate));
  assert.ok(authorization.includes(gate));
  assert.doesNotMatch(caller, /uses: \.\/\.github\/workflows\/item78c-session-preflight.yml/);
  assert.ok(caller.includes("cancel-in-progress: $" + "{{ !inputs.diagnostic_only && !inputs.presence_only }}"));
});
test('same-commit read-only protected steps exactly preserve the existing callee steps', () => {
  const originalJob = callee.slice(callee.indexOf('  diagnose:'));
  assert.equal(diagnostic.slice(diagnostic.indexOf('    steps:')).trimEnd(), originalJob.slice(originalJob.indexOf('    steps:')).trimEnd());
  assert.match(diagnostic, /needs: session-authorize/);
  assert.ok(diagnostic.includes('environment: $' + '{{ matrix.environment }}'));
  assert.doesNotMatch(diagnostic, /always\(\).*needs|secrets: inherit/);
  for (const job of [diagnostic, authorization]) {
    for (const name of ['expected_commit', 'confirmation']) assert.ok(job.includes('$' + '{{ inputs.' + name + ' }}'));
    assert.match(job, /permissions:\n      contents: read\n      actions: read/);
    assert.doesNotMatch(job, /run:.*\$\{\{/);
    assert.ok(job.includes('ref: $' + '{{ github.sha }}'));
    assert.ok(job.includes('persist-credentials: false'));
  }
});
test('direct prerequisite checks exact commit and protections without application credentials', () => {
  assert.doesNotMatch(authorization, /secrets\.|environment:|npm ci|prisma/);
  assert.ok(authorization.includes('node scripts/item78c-session-preflight-authorize.mjs credential-free'));
  assert.ok(authorization.includes('node --test tests/item78c-session-preflight*.test.mjs'));
  assert.doesNotMatch(diagnostic.split('    steps:')[0], /always\(|continue-on-error/);
});
test('application secrets remain final-step-only after protected recheck, install and synthetic generation', () => {
  const credentialStep = diagnostic.indexOf('      - name: Read session/project match');
  assert.ok(credentialStep > diagnostic.indexOf('Recheck protections and environment commit pin'));
  assert.ok(credentialStep > diagnostic.indexOf('Generate Prisma client with synthetic configuration'));
  assert.doesNotMatch(diagnostic.slice(0, credentialStep), /secrets\./);
  assert.equal((diagnostic.match(/secrets\./g) || []).length, 2);
  for (const council of ['byron', 'kempsey']) assert.ok(diagnostic.includes('environment: item78c-' + council + '-preview'));
  assert.ok(diagnostic.includes('npm ci --ignore-scripts --loglevel=error'));
  assert.ok(diagnostic.includes('DATABASE_URL: postgresql://synthetic:synthetic@127.0.0.1:5432/synthetic'));
  assert.ok(diagnostic.includes('node scripts/item78c-session-preflight-authorize.mjs summary'));
  assert.ok(diagnostic.includes('Remove temporary output without uploading it'));
  assert.doesNotMatch(diagnostic, /upload-artifact|secrets: inherit/);
});
test('existing standalone callee retains its protections and acceptance coverage', () => {
  assert.match(callee, /workflow_call:\n    inputs:\n      expected_commit:\n        type: string\n        required: true\n      confirmation:\n        type: string\n        required: true/);
  const split = callee.indexOf('  diagnose:');
  assert.ok(split > 0);
  assert.doesNotMatch(callee.slice(0, split), /secrets\.|environment:/);
  assert.match(callee.slice(split), /needs: authorize/);
});
test('malicious or missing dispatch inputs fail before Git or credential use', () => {
  const valid = {
    GITHUB_REPOSITORY: 'RobbieTall/Plannera-ab', GITHUB_EVENT_NAME: 'workflow_dispatch',
    GITHUB_REF: 'refs/heads/accept/item-78c-byron-kempsey-20260914',
    GITHUB_SHA: 'a'.repeat(40), ITEM78C_DIAGNOSTIC_EXPECTED_SHA: 'a'.repeat(40),
    ITEM78C_DIAGNOSTIC_CONFIRMATION: 'READ ONLY PREVIEW LOGIN CHECK'
  };
  for (const patch of [
    { ITEM78C_DIAGNOSTIC_EXPECTED_SHA: '' },
    { ITEM78C_DIAGNOSTIC_EXPECTED_SHA: '$(touch /tmp/never-execute)' },
    { ITEM78C_DIAGNOSTIC_CONFIRMATION: 'READ ONLY PREVIEW LOGIN CHECK\nignored' },
    { GITHUB_EVENT_NAME: 'pull_request' }, { GITHUB_REF: 'refs/heads/main' }
  ]) assert.throws(() => validateGit({ ...valid, ...patch }, () => assert.fail('Git must not execute')));
});
test('contract CI covers direct and presence wiring without app credentials', () => {
  assert.ok(ci.includes('- .github/workflows/item77-protected-commercial-journey.yml'));
  assert.ok(ci.includes('tests/item78c-session-preflight-wiring.test.mjs'));
  assert.ok(ci.includes('tests/item78c-session-preflight-presence.test.mjs'));
  assert.doesNotMatch(ci, /secrets\.|environment:|npm ci|workflow_dispatch:/);
});
