# Working SEE hosted rehearsal checkpoint - 30 September 2026

## Current decision

**Commercial HOLD.** Both separate protected document Previews deployed successfully, but a hosted customer Word/PDF pass has not been achieved. Do not repeat completed key entry, source refreshes or deployments merely because an older handover says they are pending.

| Council | Rehearsal commit | Vercel Preview deployment | State |
| --- | --- | --- | --- |
| Byron | ca2212d7e914478a85b744d1acb06b1e4a00a494 | dpl_E6SLoZedSiWqmS1zoP5LAHCHAWQ9 | Ready |
| Kempsey | 638dc2d977e9c753ef8a7c98d6ef455d927534d0 | dpl_ABHpc6nCLtCB4pNN9tsTNDq9hCxX | Ready |

Both refs use reviewed tree 2800fc0ec36b54eb8546102ad1017e1e295a4e4f, separate branch-scoped database overrides and checkout=false. The feature branch and both rehearsal refs retain explicit automatic-deployment disable rules. Vercel Production tracks main; standard Preview login protection was enabled, and Byron's manual deployment explicitly skipped custom Production domain assignment. No main push, merge, Production deployment/data/schema mutation, secret reveal or checkout activation occurred.

The DCP and scoped LEP source-only transactions remain complete on the two approved isolated children. See [LEP execution](working-see-lep-refresh-execution-20260930.md) and [DCP/source checkpoint](working-see-source-proof-checkpoint-20260930.md). Neither transaction established full geographic applicability or complete statutory coverage.

## Hosted observations

The existing signed-in Byron acceptance project was opened on its isolated copy. Its normal DPP regeneration and matching pre-SEE generation completed. Original artifacts remain; the new versions were created through application actions, not by overwriting evidence.

The generated memo selected West Byron area-specific chapters and a commercial/retail chapter for the residential test proposal. Those are not established as applicable merely by matching R2 and topic keywords. The UI's previous claim that this was confirmed evidence was therefore not accepted as a commercial pass.

After acknowledging the working-document limitation, the normal Word/PDF generation action reported that documents could not be saved and no successful generation was confirmed. The new DPP's source capture was UNAVAILABLE/source_capture_incomplete. Native output inspection, successful protected downloads, reopening, complete ownership/paid-scope checks and version acceptance remain unproven.

The original site record had no canonical council code or saved spatial provenance. The normal address-search/select/save flow was exercised once rather than asking Robbie to re-enter it repeatedly. Official zoning lookup succeeded, but the saved council code remained null and saved provenance count remained zero. No fake verification record, hand-assigned council code or fixture-specific bypass was inserted.

Kempsey's independent Preview is Ready but currently has no signed-in customer session. Robbie must complete normal sign-in there before the protected customer journey can be exercised. Do not request Stripe reconnection or repeat saved secrets.

## Scoped retrieval correction prepared and tested

The correction conservatively withholds Byron Part E area-specific candidates unless a future reviewed spatial applicability path can establish them. It also withholds commercial Chapter D4 candidates for residential-zone document retrieval, and rural Chapter D2 candidates for R1-R4. These are unconfirmed candidates, not legal declarations that such controls can never apply.

Exclusion occurs before ranking and result limits, so high-scoring wrong-area sources cannot crowd out general candidates. A second guard covers structured memo/DPP filtering. Original source rows, citation identity and source proof are not changed. Body keywords and a matching zone cannot rescue a conflicting structured chapter scope.

This narrow guard is not a general applicability engine, a Research Viewer implementation, full land-use analysis or a certification of the retained candidates. Mixed use, precinct controls, all other chapter scopes and other LGAs still need proper authoritative applicability work. The customer-facing reason now distinguishes cited topic text from confirmed site/proposal applicability.

Local validation:
- 12 new pure scope regressions passed.
- 68 Vitest tests passed, including four new retrieval regressions and the existing 64 document/source tests.
- Full TypeScript checking passed.
- Build safety contract and all 11 contract tests passed after explicitly reviewing the added pure helper, pinning its hash, updating the changed read-only search hash and the expected closure count to 15.
- The first tsx CLI attempt hit sandbox IPC restrictions; the equivalent node --import tsx runner passed without expanding credentials or access.
- Static import fingerprints are change-control evidence, not proof of all possible build behaviour. Permitted commands, mutation prohibitions and credential-free compilation remain unchanged.

Published correction cc906ae285968bdd69ea4ded18490efc1af102b4 passed 315 tests (11 safety + 52 source planner + 178 Node + 68 Vitest + 6 offline), full TypeScript and separate credential-free compilation in run 36699459863. It has not been deployed. The previously deployed source-refresh application passed 299 tests at 9f1cca1a483a984209d9119237b53216fa46e6c6. Neither result is a hosted customer document pass.

## Council lookup diagnosis

The pinned official NSW LocalGovernmentArea service returned a public Byron record with enddate=32503680000000 (a future date), not null. The current lookup requests only enddate IS NULL and its response schema requires null, so it excludes this live record.

The initial content-type hypothesis was disproved: service metadata used text/plain, but the actual f=json query returned application/json. Do not relax content-type checks on that basis.

The public diagnostic queried only the council name, not project coordinates or credentials:
https://portal.spatial.nsw.gov.au/server/rest/services/NSW_Administrative_Boundaries_Theme/MapServer/8

A targeted correction must evaluate effective end dates against the actual retrieval time, continue rejecting expired/ambiguous/conflicting records, preserve exact-point binding and original-response provenance, and add realistic future-date regression cases. No council-query/schema correction has been applied in this checkpoint.

## Next work and handover

1. Scoped retrieval correction publication and isolated validation are complete on PR #452. Preserve the automatic-deployment safeguard; the correction is not yet deployed.
2. Correct the diagnosed official boundary-date handling after the requested targeted approval; do not replace it with name-only trust.
3. Redeploy only reviewed council rehearsal commits and repeat normal site confirmation, then regenerate new DPP/SEE versions.
4. Complete Kempsey normal customer sign-in; continue separate project-specific document tests.
5. Prove private generation/download/reopening, permissions, paid scope, evidence warnings and version isolation; inspect representative Word/PDF output natively.
6. Keep HOLD until those checks pass. Production activation remains outside this goal.

Potential shared integration variables marked Config/Needs Attention were observed masked. Branch-specific secret overrides exist. No Production variables were edited or credentials rotated; configuration hardening remains a separate reviewed issue.

Research Viewer, Project Controls, practitioner-governance material and real-user pilots remain deferred and unchanged.
