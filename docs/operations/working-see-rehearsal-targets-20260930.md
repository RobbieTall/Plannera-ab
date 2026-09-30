# Protected SEE rehearsal targets - 2026-09-30

Approved scope: protected Preview configuration, genuine official-source refresh
and document tests using only the two isolated databases below. No Production
changes. No new database/schema permission beyond the already applied enum step.

| Git ref | Council | Neon branch ID |
|---|---|---|
| see-doc-byron-20260930 | Byron | br-blue-dawn-a733pff4 |
| see-doc-kempsey-20260930 | Kempsey | br-royal-breeze-a75t8c41 |

Source parent: b2258e7b601d539e520b214c464f7c386c6f9b2c (PR #452).
Application source: 31fc550d6402fb88160aad5b5d570a1740268342.
The rehearsal snapshot changes only deployment-disable entries and this register.
Both rehearsal refs and the original PR branch remain auto-deployment disabled
until their explicit protected Preview setup is complete. Manual deployment must
select Preview and the exact council ref. Never select main or promote to Production.

Production and original Item 78C acceptance deployments must not be repointed.
Database URLs must be branch-scoped and explicitly target the corresponding child,
not inherited broad variables. Robbie handles secret entry; no values in GitHub.
Do not assume the Neon integration reuses a branch from its name.

Status at preparation: databases and working_see enum ready; Preview connections,
flags, source ingestion, deployment and hosted document tests NOT YET COMPLETE.
Login protection observed enabled in Vercel. Existing inherited database variables
are broadly scoped and unverified. No secret values were revealed.

Fresh source retrieval must retain original provenance and hashes. Paid scope,
project identity, evidence warnings and original-version download/reopening must
pass for both councils. Synthetic/offline checks are not customer proof.

Canonical operations: docs/operations/working-see-download-contract.md.
Track all subsequent safe setup/results in Issue #395 and PR #452.
Commercial HOLD; no Production activation.
