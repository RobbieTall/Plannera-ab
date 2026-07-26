import { runStripeTestAcceptance } from "../src/lib/stripe-test-acceptance";

runStripeTestAcceptance(process.env, fetch).then(({ exitCode, summary }) => {
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  process.exitCode = exitCode;
}).catch(() => {
  process.stdout.write('{"runnerVersion":"stripe_test_acceptance.v2","phase":"before_payment","passed":false,"checks":{"configuration":false,"testMode":false,"providerPhase":false,"providerTerms":false,"paginationComplete":false,"checkoutReplaySafe":false,"exactScope":false,"changedScopesDenied":false,"dppGate":false,"terminalState":false,"dppCreatedThisRun":false},"opaque":{"checkoutSessionId":"unavailable"},"reason":"acceptance_unhandled_failure"}\n');
  process.exitCode = 1;
});
