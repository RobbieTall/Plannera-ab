import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(
  new URL(
    "../.github/workflows/item74h-stateful-preview-acceptance.yml",
    import.meta.url,
  ),
  "utf8",
);

const expectedRoute =
  "environment: " +
  "$" +
  "{{ inputs.suite == 'commercial-bridge' && 'stripe-test-acceptance' || 'item74h-stateful-preview-acceptance' }}";

test("routes only the commercial bridge through the established Stripe environment", () => {
  assert.match(workflow, /commercial-bridge/);
  assert.ok(workflow.includes(expectedRoute));
  assert.equal(workflow.split(expectedRoute).length - 1, 1);
});

test("retains the dedicated Item 74H environment as the default", () => {
  assert.match(expectedRoute, /stripe-test-acceptance/);
  assert.match(expectedRoute, /item74h-stateful-preview-acceptance/);
  assert.match(expectedRoute, /inputs\.suite == 'commercial-bridge'/);
});
