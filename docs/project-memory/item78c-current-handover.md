# Item 78C current handover

## Current checkpoint - 29 September 2026

Automated gate: **READY_FOR_NON_PRODUCTION_ACCEPTANCE**.
Commercial launch: **NOT APPROVED**.
Documentation/review closeout: **INCOMPLETE** until the remaining evidence below is recorded.

## Proven evidence

- [Whole-funnel run #24](https://github.com/RobbieTall/Plannera-ab/actions/runs/36426605240): completed successfully.
- Runner commit: `0a871d38a5806e6a28404700d660f5d363f3a1d4`.
- Runner branch: `accept/item-78c-byron-kempsey-20260914`.
- All six jobs passed: credential-free authorisation, canonical SEE compiler/rendering, independent Byron bridge, independent Kempsey bridge, protected consultant handoff and final decision.
- The only retained run artifact is `item78c-whole-funnel-decision`, artifact `11006011812`, expiring 29 October 2026. It is decision JSON, not a Word/PDF bundle.
- GitHub main at reconciliation: `ff2179e06f68a8f265d7cc0b873cd28320a4da6b`. Do not equate main or any deployed Preview application with the acceptance runner.

## Output review and limits

The bridge renders baseline and strengthened synthetic working-SEE bytes, checks their warnings/hashes, persists metadata for replay tests, then deletes synthetic records. Do not look for those deleted records in the customer's workspace or rerun the workflow to recover files it never retains.

Four local synthetic Word/PDF pairs were generated with the accepted renderer and its candidate builder using separate synthetic Byron R2 and Kempsey SP2 identifiers. No credentials, paid fixtures, real addresses or private documents were used. All 16 PDF pages were inspected. Working/non-submission-ready warnings and distinct evidence states are visible; no visible clipping was observed.

Presentation observations: the statutory heading displays "Section 4 15"; strengthened-output source-register entries split across pages; a predecessor working-SEE reference is displayed as "Strengthens DPP". These findings are not silently repaired in the immutable acceptance runner.

Representative cross-council DOCX visual review is completed. The synthetic Byron missing-evidence DOCX was opened in Microsoft Word for Mac 16.113.2 and exported locally through Word's Save as PDF function; all ten rendered pages were inspected. Text, source references and non-submission-ready warnings remained readable with no visible clipping. Title/heading hierarchy is visually weak, the contents list has no page references, and short sections leave large blank areas. The Word layout is ten pages versus four in the separate generated PDF. This is a presentation finding, not an automatic acceptance failure or proof of actual hosted delivery.

Reviewed DOCX SHA-256: `c04044491bbf9adb48b9e8cf31200c0a983a2f0003525a3d6829c799da1b061d`.
Word-rendered PDF SHA-256: `5222170662553db7910c0153144ceb3254a0af8674ebe332598795d1d42d665a`.

Kempsey's strengthened synthetic DOCX was subsequently opened in the same native Word version after entering the output folder (not the full filename) in the picker, then selecting the document. All ten Word-rendered pages were inspected. Text, source register, evidence status, operator-review limitation and non-submission-ready footer remained visible, with no observed clipping. The same weak heading hierarchy, unnumbered contents, excessive blank space and `Section 4 15` label are present; `Strengthens DPP` is also a misleading predecessor label. The synthetic wording and source placeholders prove a rendering fixture only, not the quality of actual planning research. No original DOCX was edited or saved, no document uploaded and no software installed.

Kempsey DOCX SHA-256: `7be29a9d32e4eef358f45e18b76396f7871cdeb508056249e989c09a6dac768f`.
Kempsey Word-rendered PDF SHA-256: `ad4d18ca7e177160e2300ce7db9cbfc01a4500c50c279a1941c223b33510d1f1`.

Separately, all 14 pages of the PR #434 synthetic final PDF were inspected. Those bytes and the companion DOCX match its existing runbook hashes, but PR #434 is not the accepted renderer. That review cannot replace review of the accepted working documents or prove both actual council downloads.

## Remaining work, in order

1. Representative cross-council Word review is complete. Preserve its hashes, page counts and presentation findings above; do not call these presentation weaknesses fixed or substitute an unmerged renderer.
2. Establish hosted customer DOCX/PDF delivery separately before claiming commercial readiness. The inspected Preview Generate SEE route returned a pre-SEE memo and its UI offered a text download; the automated gate does not close that gap.
3. Reconcile presentation PRs #433, #434 and #435 through normal review. Preserve #433's revision-history work, #434's presentation model/styles relationship and #435's TOC/page-reference work. No combined implementation or merged result has been verified.
4. Review this published documentation proposal before merging. Robbie approved status-only publication and the documentation-branch safeguard on 29 September 2026. The issue checkpoint is https://github.com/RobbieTall/Plannera-ab/issues/395#issuecomment-5882042049. This branch is a draft proposal, not merged main.
5. Stop this acceptance goal with an accurate decision and residual risks. Production activation requires a separate approval; Research Viewer stays later.

## Non-negotiable boundaries

- Keep Production checkout disabled and Production data/schema unchanged.
- Do not infer current Production configuration from runner flags.
- No additional payment, refund, fixture recreation, migration or acceptance rerun is required merely to update this handover.
- Preserve independent council fixtures and all successful evidence.
- Do not expose credentials, cookies, private documents, signed URLs or customer/project/payment identifiers.
- Do not rewrite the accepted runner or silently extend expired diagnostic guards.
- Never call the GitHub docs updated until the publication actually succeeds.

## Mobile/desktop continuation

Read Issue #395, this handover and the linked run first. Use available connected services rather than assuming access to the other device's filesystem, clipboard or browser. Before requesting manual setup, confirm saved cloud metadata. Every checkpoint must distinguish completed actions, observed evidence, unproven claims, exact next action and required approval.

[Operating closeout instructions](../operations/item78c-acceptance-closeout.md).

