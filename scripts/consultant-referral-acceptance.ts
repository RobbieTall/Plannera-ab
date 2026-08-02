import { runConsultantReferralAcceptance } from "../src/lib/consultant-referral-acceptance";

async function main() {
  const summary = await runConsultantReferralAcceptance(process.env);
  process.stdout.write(`${JSON.stringify(summary)}\n`);
  if (!summary.passed) process.exitCode = 1;
}

void main().catch(() => {
  process.stderr.write("Consultant referral acceptance runner failed\n");
  process.exitCode = 1;
});
