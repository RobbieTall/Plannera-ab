import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const reasons = ['configuration_denied', 'preflight_refused', 'operation_already_paid',
  'prepared', 'recovered', 'preparation_failed'];
export function safeSummary(raw, expectedCouncil, outcome) {
  const v = JSON.parse(raw);
  const keys = ['version', 'council', 'prepared', 'reason', 'mutationMayHaveOccurred',
    'oldPurchasePreserved', 'paymentPerformed', 'acceptanceDecisionUnchanged'];
  if (!v || typeof v !== 'object' || Array.isArray(v)
    || Object.keys(v).sort().join(',') !== keys.sort().join(',')
    || v.version !== 'item78c_test_purchase_preparation.v1'
    || !['BYRON', 'KEMPSEY'].includes(expectedCouncil)
    || (v.council !== expectedCouncil && v.council !== null)
    || !reasons.includes(v.reason)
    || ['prepared', 'mutationMayHaveOccurred', 'oldPurchasePreserved',
      'paymentPerformed', 'acceptanceDecisionUnchanged'].some(k => typeof v[k] !== 'boolean')
    || v.paymentPerformed !== false || v.acceptanceDecisionUnchanged !== true
    || (v.prepared && (v.council !== expectedCouncil || !v.oldPurchasePreserved
      || !['prepared', 'recovered', 'operation_already_paid'].includes(v.reason)))) {
    throw new Error('summary_refused');
  }
  return { result: v, passed: v.prepared && outcome === 'success' };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const path = join(process.env.RUNNER_TEMP, 'item78c-replacement.json');
    if (statSync(path).size > 4096) throw new Error('summary_refused');
    const summary = safeSummary(readFileSync(path, 'utf8'),
      process.env.ITEM78C_PREPARE_COUNCIL, process.env.PREPARATION_OUTCOME);
    process.stdout.write(JSON.stringify(summary.result) + '\n');
    process.exitCode = summary.passed ? 0 : 1;
  } catch {
    process.stdout.write('Replacement preparation did not produce a valid safe summary. No private output disclosed. Inspect state before any retry.\n');
    process.exitCode = 1;
  }
}
