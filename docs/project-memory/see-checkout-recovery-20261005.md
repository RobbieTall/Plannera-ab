# SEE checkout recovery - 5 October 2026

## Scope and base

Recovery was approved after the former temporary working directory became unavailable.
This permanent working copy starts from the public GitHub archive at exact PR #452
head `de8469ea416c0cf9b5570d2cdc1eb7d767826233`. Existing working copies are untouched.

The six checkout/configuration/scope/provider/HTTP/route source files and the two
provider/HTTP test files were reconstructed from recorded source patches, including
both approved naming and header-typing corrections. The configuration, saved-scope
and checkout transaction test suites were recreated from the documented contracts;
they are not claimed to be byte-identical to the lost fixtures. The published
payment-policy, atomic-persistence and credit tests remain unchanged.

## Validation and limitations

Fresh validation is required for this recovery. Historical 162-test/build results
apply only to the former local snapshot and must not be reused as current proof.
The recovery validation transcript and the latest PR #452 / Issue #395 checkpoint
record the new results.

Dependency installation uses `npm ci --ignore-scripts --no-audit --no-fund`.
Tests use synthetic identities, provider stubs and transaction doubles. No real
Stripe calls or database queries are authorised by the recovery checks.
Prisma generation is schema-to-client generation only, not migration.

## Remaining work and safeguards

This local checkout must remain disabled. Signed-webhook application dispatch and
customer UI are unfinished. The map-title-as-numeric-control finding, current-source
applicability, actual hosted project-specific DOCX/PDF generation, private downloads,
exact-version reopening, permissions and native visual acceptance remain open.

No push, merge, deployment, cloud configuration, payment, Production data/schema
change or Production checkout activation is part of recovery. Establish deployment
safety before any subsequent push. Preserve both independent isolated council
fixtures and all immutable acceptance snapshots. Commercial HOLD.

Research Viewer, Project Controls and real-user pilots remain deferred.
