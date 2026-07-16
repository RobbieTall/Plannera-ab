import { runCommercialFunnelAudit } from "../src/lib/commercial-funnel-audit-runner";

runCommercialFunnelAudit(process.env, fetch).then(({ exitCode, summary }) => {
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  process.exitCode = exitCode;
}).catch(() => {
  process.stdout.write(`${JSON.stringify({ runnerVersion: "commercial_funnel_live_audit_runner.v1", ready: false, runnerValidationReasons: ["runner_unhandled_failure"] })}\n`);
  process.exitCode = 1;
});
