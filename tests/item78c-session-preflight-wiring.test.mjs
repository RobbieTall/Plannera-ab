import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateGit } from '../scripts/item78c-session-preflight-authorize.mjs';

const read = name => readFileSync(new URL('../.github/workflows/' + name, import.meta.url), 'utf8');
const caller = read('item77-protected-commercial-journey.yml');
const callee = read('item78c-session-preflight.yml');
const ci = read('item78c-session-preflight-contract.yml');
const diagnostic = caller.slice(caller.indexOf('  session-diagnostic:'));
const originalSteps = "    steps:\n      - name: Checkout\n        uses: actions/checkout@v4\n      - name: Use Node.js\n        uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: npm\n      - name: Install dependencies\n        run: npm ci\n      - name: Verify Stripe test lifecycle contract\n        run: npx tsx --test tests/stripe-test-acceptance.test.ts\n      - name: Verify credit, evidence, rendering and progressive disclosure\n        run: >-\n          npx vitest run\n          src/lib/submission-see-credit.test.ts\n          src/lib/item74h-progressive-evidence-regeneration.test.ts\n          src/lib/submission-see-renderer.test.ts\n          src/lib/item74h-visual-acceptance.test.ts\n          tests/see-document-panel.test.tsx\n      - name: Verify qualified working DOCX/PDF regeneration\n        run: npm run --silent accept:item74h-working-see-preview\n";

test('registered caller preserves every original commercial test step', () => {
  const job = caller.slice(caller.indexOf('  commercial-journey:'), caller.indexOf('\n  session-diagnostic:'));
  assert.equal(job.slice(job.indexOf('    steps:')).trimEnd(), originalSteps.trimEnd());
  assert.ok(job.includes("github.event_name != 'workflow_dispatch' || !inputs.diagnostic_only"));
});
test('diagnostic is explicitly opted into and never a PR side effect', () => {
  assert.match(caller, /diagnostic_only:\n[\s\S]*?type: boolean\n        required: false\n        default: false/);
  assert.ok(diagnostic.includes("github.event_name == 'workflow_dispatch' && inputs.diagnostic_only"));
  assert.ok(caller.includes("cancel-in-progress: $" + "{{ !inputs.diagnostic_only }}"));
});
test('caller passes data only to same-commit reusable workflow and no secrets', () => {
  assert.ok(diagnostic.includes('uses: ./.github/workflows/item78c-session-preflight.yml'));
  for (const name of ['expected_commit', 'confirmation']) {
    assert.ok(diagnostic.includes(name + ': $' + '{{ inputs.' + name + ' }}'));
  }
  assert.doesNotMatch(diagnostic, /secrets:|secrets\.|\brun:|environment:/);
  assert.match(diagnostic, /permissions:\n      contents: read\n      actions: read/);
});
test('callee keeps required call inputs and credentials behind authorisation', () => {
  assert.match(callee, /workflow_call:\n    inputs:\n      expected_commit:\n        type: string\n        required: true\n      confirmation:\n        type: string\n        required: true/);
  const split = callee.indexOf('  diagnose:');
  assert.ok(split > 0);
  assert.doesNotMatch(callee.slice(0, split), /secrets\.|environment:/);
  assert.match(callee.slice(split), /needs: authorize/);
  const credentialStep = callee.indexOf('      - name: Read session\/project match');
  assert.ok(credentialStep > callee.indexOf('Recheck protections and environment commit pin'));
  assert.doesNotMatch(callee.slice(0, credentialStep), /secrets\./);
  assert.equal((callee.match(/secrets\./g) || []).length, 2);
  assert.ok(callee.includes('environment: $' + '{{ matrix.environment }}'));
});
test('malicious or missing forwarded inputs fail before git or credential use', () => {
  const valid = {
    GITHUB_REPOSITORY: 'RobbieTall/Plannera-ab', GITHUB_EVENT_NAME: 'workflow_dispatch',
    GITHUB_REF: 'refs/heads/accept/item-78c-byron-kempsey-20260914',
    GITHUB_SHA: 'a'.repeat(40), ITEM78C_DIAGNOSTIC_EXPECTED_SHA: 'a'.repeat(40),
    ITEM78C_DIAGNOSTIC_CONFIRMATION: 'READ ONLY PREVIEW LOGIN CHECK'
  };
  const patches = [
    { ITEM78C_DIAGNOSTIC_EXPECTED_SHA: '' },
    { ITEM78C_DIAGNOSTIC_EXPECTED_SHA: '$(touch /tmp/never-execute)' },
    { ITEM78C_DIAGNOSTIC_CONFIRMATION: 'READ ONLY PREVIEW LOGIN CHECK\nignored' },
    { GITHUB_EVENT_NAME: 'pull_request' }, { GITHUB_REF: 'refs/heads/main' }
  ];
  for (const patch of patches) assert.throws(() => validateGit({ ...valid, ...patch }, () => assert.fail('Git must not execute')));
});
test('contract CI covers registered caller and wiring regression with no app credentials', () => {
  assert.ok(ci.includes('- .github/workflows/item77-protected-commercial-journey.yml'));
  assert.ok(ci.includes('tests/item78c-session-preflight-wiring.test.mjs'));
  assert.doesNotMatch(ci, /secrets\.|environment:|npm ci|workflow_dispatch:/);
});
