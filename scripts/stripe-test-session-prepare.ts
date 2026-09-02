import { writeFile } from "node:fs/promises";

import {
  prepareStripeTestSession,
  safeStripeTestSessionSummary,
} from "../src/lib/stripe-test-session-prepare";

const main = async () => {
  const outputPath = process.env.PLANNERA_STRIPE_TEST_PREPARE_OUTPUT?.trim();
  if (!outputPath) {
    throw new Error("missing_plannera_stripe_test_prepare_output");
  }

  const artifact = await prepareStripeTestSession(process.env);
  await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  console.log(JSON.stringify(safeStripeTestSessionSummary(artifact)));
};

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "preparation_failed";
  console.error(`[stripe-test-session-prepare] ${message}`);
  process.exitCode = 1;
});
