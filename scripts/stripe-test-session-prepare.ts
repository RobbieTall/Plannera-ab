import { writeFile } from "node:fs/promises";

import {
  prepareStripeTestSession,
  safeStripeTestSessionSummary,
} from "../src/lib/stripe-test-session-prepare";

const outputPath = process.env.PLANNERA_STRIPE_TEST_PREPARE_OUTPUT?.trim();
if (!outputPath) throw new Error("missing_plannera_stripe_test_prepare_output");

const artifact = await prepareStripeTestSession(process.env);
await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, {
  encoding: "utf8",
  mode: 0o600,
});
console.log(JSON.stringify(safeStripeTestSessionSummary(artifact)));
