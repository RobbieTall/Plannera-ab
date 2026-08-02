import { runConsultantReferralAcceptance } from "../src/lib/consultant-referral-acceptance";

const summary = await runConsultantReferralAcceptance(process.env);
process.stdout.write(`${JSON.stringify(summary)}\n`);
if (!summary.passed) process.exitCode = 1;
