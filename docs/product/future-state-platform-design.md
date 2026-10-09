# Plannera future-state platform design

Status: **ADOPTED PRODUCT / UX DIRECTION — POST-COMMERCIAL IMPLEMENTATION QUEUED**  
Decision recorded: 9 October 2026. Delivery umbrella: [#454](https://github.com/RobbieTall/Plannera-ab/issues/454). Commercial reconciliation: [#453](https://github.com/RobbieTall/Plannera-ab/issues/453).

## Where we are aiming

Plannera is a calm, evidence-led planning platform that takes someone from an address, to understanding what is possible, to managing the project and producing planning work. Each interaction adds reusable intelligence to the same project.

The destination is **address-first Home → Site Intelligence → Project Workspace**, supported by **one Project Library/Sources** and a **Create** area. The commercial funnel is an early delivery milestone within this platform, not the complete platform design.

This is the canonical future-state product and UX contract. It supersedes conflicting legacy navigation, filing-system, opportunity-score and mapping-engine wording. It does not claim that these screens or capabilities are implemented or accepted. Current implementation descriptions and historical acceptance records remain evidence of their own scope.

**PR #452 and the current commercial gate remain untouched.** The gate remains on HOLD; this design supplies no new acceptance evidence, does not widen that PR, and does not change current pricing, checkout, entitlements, deployment, Production data or schema. Operational status belongs to the active commercial lane, not to this design document.

## Product experience

### 1. Home / Quick Site Check entry

A minimal, spacious, address-first entry with one clear action. Establish the site before asking the user to navigate a workspace or understand planning terminology. Ask for proposal details progressively when a proposal-specific answer needs them.

A free check and subsequent saved project retain the same site, proposal intent and evidence chain. The separate screens do not imply separate backends or duplicated planning lookups. Do not invent site certainty from an ambiguous address match.

### 2. Site Intelligence

A beautiful scrolling explanation of the site, distinct from the operating workspace:

1. **What Matters** — the important conclusions and material uncertainties.
2. **At-a-glance controls** — concise applicable controls with confidence and freshness.
3. **Authoritative map context** — site, parcel/context and relevant planning/constraint layers.
4. **Constraints and risks** — consequences for the proposal, gaps and required review.
5. **Development pathways** — options by proposal type and the conditions that change them.
6. **Next steps** — the evidence, decision, professional input or creation action needed next.

Use **conclusion → explanation → evidence** progressive disclosure within each section. Keep the answer understandable at a glance, with accessible expansion into reasoning, citations and source details. Material uncertainty belongs in the conclusion; disclosure must not hide blockers.

### 3. Project Workspace

A separate operating hub for pursuing a project, with conversation, proposal/brief, site intelligence, next actions, project progress/timeline and creation tools. It retains the same project context as the site check.

Conversation is one working surface, not the entire product. Site Intelligence remains available as a coherent view rather than being fragmented into chat messages or dashboard widgets. Progress reflects evidence-backed actions and dependencies, not a decorative completion percentage. Detailed Project Controls remains a later architecture lane.

### 4. Project Library / Sources

One user-facing home for uploaded plans/reports, correspondence, notes, links, statutory/council sources, research captures and generated Plannera outputs. Useful type, status and origin filters may distinguish them without making users choose between competing Sources and Artefacts filing systems.

Internal generated-artefact records may remain dedicated to generation status, versions, regeneration, export and delivery. On completion, each output must automatically become a **linked reusable project Source** in the same Library. The user does not manually download and re-upload it.

Preserve the original generation record and exact version lineage. The Library entry links to the output and its upstream sources, project/site/proposal scope, generation time, source version/current-as-at information and working/final/review state. Regeneration creates traceable versions and preserves original-version reopening; it must not silently overwrite history or relabel stale outputs as current.

A generated source is derived project material, not independent statutory authority. Reuse must trace through to underlying evidence and cannot create circular corroboration or promote a working SEE to final. Upload quarantine, malware scanning, extraction, applicability review, ownership and private access remain separate gates. Library visibility is not evidence acceptance.

### 5. Create

Provide a clear Create area for **Quick Site Check, risk assessment, feasibility and SEE**. Creation uses the existing project, selected proposal and eligible sources. Completed results return to Library and remain usable by chat and later creation. Keep pending, failed, stale, working and reviewed/final states understandable.

### 6. Contextual professional help

Recommend a consultant when a specific risk, evidence gap or pathway requires one. Explain the discipline, why it is relevant and the question/input needed. Preserve required, conditional, recommended and not-identified-from-current-evidence distinctions.

The consultant marketplace is not primary navigation. Referral, credential disclosure and returned-report governance remain valid supporting capabilities. Do not imply guaranteed availability, verified credentials, approval or absence of future consultant needs.

## Pathways, confidence and visual language

Development guidance is **by proposal type**, not a crude overall site opportunity score. For each supported type, show the relevant pathway, conditions, constraints, missing evidence, review needs and next action. An unknown or unsupported pathway stays visibly unresolved. Existing conservative feasibility hold points may remain decision aids; they must not become an unqualified site-wide opportunity rating.

Separate:
- **Confirmed authoritative facts** — supported by applicable current official source evidence.
- **Derived interpretation** — Plannera's reasoning from cited inputs and stated assumptions.
- **Needs input/review or unavailable** — missing, conflicting, stale or insufficient evidence.

Show provenance, source publisher/instrument/layer or clause, source version and current-as-at state. Distinguish the source's effective/current date, retrieval or capture date and output generation date. A citation or green numeric badge alone is not proof of applicability, currency, verification or compliance. Existing Cited/Inferred/Unavailable labels require a deliberate display mapping; this decision does not rename runtime enums.

Preserve the approved mock-up direction: calm, clean, spacious, premium and readable, with a clear hierarchy and generous whitespace. Avoid dense dashboard grids, competing metrics and persistent tool clutter. Apply the same hierarchy on mobile and desktop, with keyboard-accessible disclosure and text labels that do not rely on colour alone.

The exact approved mock-up file/version was not available in this documentation review. Its visual direction is preserved; pixel-level visual acceptance remains to be attached to the implementation task.

## Mapping architecture boundary

Plannera supplies its own branded presentation and interaction layer over **authoritative NSW state and official council GIS/services where available**. Validate suitability per source/layer, retain attribution and source metadata, and use existing mapping/viewer capabilities and the current source registry.

Do not plan or build a custom GIS engine. Existing spatial resolution, evidence adapters and supported spatial queries may remain; older PostGIS/overlay architecture language is not authority to recreate council/state GIS platforms.

Identify authority per layer. The NSW Planning Portal Spatial Viewer is an access/display surface, not automatically the legal authority for every layer. For mapped statutory controls retain the applicable instrument and adopted map; use official council sources for council-only detail where appropriate. Show coverage, currency, scale/parcel-edge limitations and state/council conflicts. Missing data must never imply no constraint.

Where direct integration is unsuitable, use the governed Research Viewer or external official-source fallback. Do not promise universal embedding or bypass provider restrictions. Remote browsing remains deferred and separately governed. Captures enter Library as private, source-linked research evidence with immutable reopening; a capture does not automatically verify a planning control.

## Local Controls Unlock: preserve, then reconcile

The proposed **indicative A$29 Local Controls Unlock** buys project-specific, cited application of local controls to the exact site and stated proposal. It identifies applicable DCP chapters/controls, explains relevant requirements, includes clause/source links and current-as-at/version information, separates facts from interpretation/gaps, and saves a reusable Local Controls result to Library.

The result remains permanently in project history. The proposed product includes **12 months of current-control revalidation** from purchase, with relevant source changes flagged for review. After that period, retain the result and mark it as needing revalidation before reliance as current. Renewal/refresh pricing is TBD.

Loaded and underprepared LGAs buy the same customer result. Loaded current intelligence can be applied promptly; an underprepared LGA may require reusable JIT discovery/ingestion/QA behind the scenes, with truthful service/failure states. Do not sell ingestion as the customer value or charge subsequent users for re-ingesting the same corpus.

[#453](https://github.com/RobbieTall/Plannera-ab/issues/453) must explicitly reconcile this with the approved **A$49 Planning Controls Pack** before product/checkout implementation: lighter feeder product, replacement of only a deferred DCP Deep Dive, or one consolidated product. Decide scope changes, entitlements, credits, failure/refund treatment and customer language together. No outcome is selected here.

The existing A$49 pack and A$749 SEE before applicable existing credits remain the current approved commercial contract. No automatic SEE-credit entitlement is promised for A$29. [#423](https://github.com/RobbieTall/Plannera-ab/issues/423) retains its A$49 preparation/failure-resolution scope. Payment never improves evidence confidence or readiness.

## How we get there

1. **Current milestone: commercial gate.** Finish the existing protected customer document and human acceptance gates in the active lane. This document does not close or change them.
2. **Post-gate hardening.** Preserve the representative journey replay, truthful LGA service/failure resolution and consultant disclosure prerequisites already queued.
3. **Design and source contracts.** Specify screen states, responsive navigation, Library/output linkage and evidence display against this contract before building those slices.
4. **First post-gate product lane: Research Viewer.** Validate Byron/Kempsey source capabilities, then native viewing, private capture, provenance, reopening and external fallback. Integrate with Site Intelligence and Library.
5. **Platform experience slices.** Deliver Home/Site Intelligence, separate Workspace and unified Library/Create on the same evidence chain. Sequence implementation dependencies from then-current main; preserve private-evidence/OCR/returned-report prerequisites.
6. **Practitioner validation, then Project Controls.** Test the experience with governed, sanitised pilots before expanding evidence-backed timelines, dependencies, blockers and Finance Clock. Broader LGA, CAD, marketplace and council-edition ambition does not jump these gates.

This refines the destination around the existing Research Viewer → practitioner governance → Project Controls sequence; it does not revive historical parallel PRs or authorise implementation now. Recreate still-valid work from then-current main after the gate.

## Legacy wording reconciliation

| Earlier wording or design implication | Canonical future-state interpretation |
| --- | --- |
| Workspace as chat plus persistent Outputs column | Separate operating hub; creation/status controls can remain, but completed work is discoverable in one Library. |
| Sources versus Artefacts as separate customer filing systems | One Library/Sources UX with linked internal generation records and version lineage. |
| Everything in one scrolling page | Site Intelligence scrolls; ongoing project operations live in a separate Workspace. |
| Marketplace as a primary destination | Contextual professional help when a project need is identified. |
| Overall opportunity/confidence score as the planning answer | Proposal-specific pathways and item-level provenance, interpretation and review states. |
| “Show the source first” as screen order | Make the source inspectable; show conclusion, then explanation, then evidence. |
| GIS/PostGIS architecture as a product build mandate | Authoritative-service integration and branded presentation; no custom GIS engine. |
| Charge for DCP ingestion; A$29 replacing A$49 by implication | Buy a cited project result; #453 must settle the relationship post-gate. |
| Historic subscription/day-pass pricing or old feature completion claims | Historical proposals/evidence, not authority to change the current commercial contract or claim future UX delivery. |

Historical implementation and acceptance records are not rewritten to claim future behaviour. The source-of-truth indexes point here for product direction and to PR #452 for the active commercial lane.

## Open decisions and delivery acceptance

The structure above is settled. Remaining choices are bounded:
- Exact navigation labels, placement and responsive behaviour; attach the approved mock-up asset/version before visual sign-off.
- Initial supported proposal types and the pathway evidence/eligibility matrix.
- Library version-selection, regeneration and downstream update UX without losing immutable lineage.
- Per-layer official GIS capability, licensing/attribution and fallback validation.
- #453 product relationship, exact renewal/scope/credit rules, and revalidation cadence/notifications/service commitments.

Future acceptance must demonstrate one address → What Matters → explanation/evidence → same-project Workspace journey; automatic output-to-Library reuse; honest stale/unknown/conflicting states; proposal-specific pathways; authoritative map/fallback behaviour; and clean accessible mobile/desktop presentation. Generated-source reuse must not launder assumptions into facts. These criteria are queued, not passed.
