# Post-commercial roadmap consolidation task — Research Viewer, practitioner pilots and Project Controls

Status: **PREPARED / EXECUTE ONLY AFTER THE CURRENT COMMERCIAL DOCUMENT GATE IS RESOLVED**

Historical source branches:
- PR #448 — Research Viewer
- PR #451 — practitioner workflow governance and live pilots
- PR #449 — Project Schedule / Project Controls

## Goal

Recreate the valid roadmap/product documentation on one clean branch from the then-current main, without importing stale shared-index history or identifiable private project details.

Sequence:
1. Research Viewer (#448)
2. Practitioner workflow governance + sanitised pilot framework (#451)
3. Project Controls architecture (#449)

Do not merge the three historical branches sequentially.

## Why recreate

All three were parallel documentation branches from the old main and touch shared product/index/roadmap files.

The unique product documents remain valuable, but direct merges would:
- reintroduce stale README/build-next/decision-register history;
- create avoidable conflicts;
- risk widening the current commercial scope;
- in #451/#449, carry real-project identifiers into a public repository.

Start from the post-commercial current main and reconstruct only the still-valid concepts.

---

# Part A — Research Viewer (#448)

## Preserve

Carry forward the Research Viewer contract and operating principles:

- controlled Research Viewer, not an arbitrary embedded browser;
- native integrations first;
- Byron/Kempsey initial acceptance;
- existing `lga-map-registry.ts` extended rather than replaced;
- official NSW state layers as the baseline;
- official council layers used as supplements or primary sources for council-only topics where appropriate;
- authoritative source evaluated **per layer**, not by provider brand;
- Planning Portal Spatial Viewer is a viewing/access surface, not itself the legal authority for every layer;
- mapped LEP/SEPP controls must remain tied to the applicable instrument/adopted map;
- state/council conflicts remain visible and unresolved until reviewed;
- source publisher, service ID, layer ID, currency, scale/coverage, CRS, licence/attribution and validation result retained;
- parcel-edge uncertainty;
- capture provenance and immutable reopening;
- capture is research evidence, not automatic planning verification;
- remote browser remains deferred and separately governed.

## First implementation task

Retain the RV0/RV1 task:
1. source/capability matrix for Byron and Kempsey;
2. native project viewer;
3. site focus;
4. layer controls;
5. private immutable capture;
6. source/legend/feature metadata;
7. reopen exact capture;
8. failure/external fallback;
9. then one DA-tracker adapter as a later slice.

No remote browser, general URL bar or statewide promise in V1.

## Accuracy acceptance

Require an explicit matrix for every pilot layer:
- topic;
- applicable instrument/authority;
- official state baseline;
- council supplement if any;
- source date/currency;
- validation date;
- scale/resolution;
- legal/administrative role;
- known conflict/gap;
- downstream use allowed/not allowed.

A screenshot or successful render cannot promote a planning control to verified.

---

# Part B — practitioner workflow governance and pilots (#451)

## Preserve governance

Retain the key doctrine:

**Practitioner workflow intelligence may inform what Plannera checks; authoritative current sources determine what Plannera says.**

Preserve:
- authoritative planning sources;
- professional assessment frameworks;
- practitioner workflow intelligence as distinct layers;
- complexity-aware assessment depth;
- practitioner checklists as issue-spotting/workflow inputs, never statutory rules;
- validation across councils, experienced planners, specialists and proposal types;
- real-user pilots as validation cases, not automatic precedents/golden truth.

Integrate the practitioner boundary into the canonical SEE Builder standard and JIT LGA architecture only after comparing against the then-current files.

## Public-repo privacy requirement

**Do not copy PR #451's pilot files as written.**

The public historical branch contains:
- personal first names;
- exact street addresses;
- private project filenames;
- document-derived project observations.

Public roadmap/test docs must use neutral identifiers only, for example:

- `PILOT_ESTABLISHED_LGA_DEPTH_01`
- `PILOT_JIT_UNSUPPORTED_LGA_01`
- `PILOT_COUNCIL_REPLICATION_01`

Public fields may include only the minimum non-identifying purpose, such as:
- established NSW pilot LGA;
- unsupported NSW LGA activation;
- next-LGA council replication.

Exact user, address, file names, survey/DWG/photos, proposal details and mapping to the neutral pilot ID remain in private project records, not GitHub.

Do not write private Drive URLs/IDs into the public repo.

### History note

Sanitising a new integration does not erase identifying details from historical public branch commits. Do not rewrite Git history without a separate explicit owner decision. Record this as a privacy follow-up if full historical removal is desired.

## Sanitised pilot concepts

### Established-LGA depth pilot
Prove:
- private plan/document ingestion;
- provenance-backed proposed-works extraction;
- user confirmation/correction;
- current statutory/spatial integration;
- material evidence gaps;
- proportionate SEE;
- experienced-planner comparison;
- product feedback.

### Unsupported-LGA JIT pilot
Prove:
- address/LGA resolution;
- coverage maturity detection;
- useful immediate state/LEP baseline;
- truthful local-preparation state;
- DCP/mapping discovery;
- provenance/freshness;
- duplicate-job prevention;
- same-project regeneration;
- maturity promotion only after validation.

### Council-replication pilot
Prove:
- next council added primarily by configuration/source registry/validated adapters;
- state/council layer sourcing per topic;
- relevant statutory/local source registration;
- same evidence chain into downstream analysis;
- bespoke code requirement treated as architecture debt.

---

# Part C — Project Controls (#449)

## Preserve

Carry forward the Project Controls architecture as future context:
- site-specific work-item ontology;
- `requiredForSite` first-class;
- dependencies, blockers and evidence;
- consent-condition actions;
- finance clock;
- readiness gates;
- Journey / My Actions / Project Schedule / Readiness views;
- manual + system evidence updates;
- future document intelligence;
- later Research Viewer/external evidence;
- no factual completion from unsupported inference.

## Public-repo privacy requirement

Do not copy exact private development-site identifiers into the public architecture.

Replace exact case-study/property references with a neutral public identifier such as:

`INTERNAL_DEVELOPMENT_CASE_001`

Public docs may describe it only as a real internal development case used to seed/test the ontology.

Exact site address, lender, finance, consultant, cost, title, easement and project evidence remain private.

As with #451, historical public commits are a separate privacy/history question and must not be force-rewritten without explicit owner approval.

## Research Viewer relationship

Because Research Viewer is consolidated first:
- Project Controls may reference Research Viewer captures as **candidate evidence**;
- a screenshot/status observation cannot silently mark a schedule item complete;
- consequential state changes require sufficient evidence or explicit user confirmation.

---

# Shared-index integration

After the three unique documentation sets are reconciled:

Update from current truth only:
- README;
- docs/product/README.md;
- docs/project-memory/README.md;
- build-next;
- decision register;
- product philosophy where appropriate;
- JIT LGA architecture;
- SEE Builder standard.

Do not paste old September shared-index changes wholesale.

Preserve commercial status as historical/completed context; do not reopen the prior gate.

## Tests/checks

Documentation-only consolidation should still run:
- Markdown/link/reference checks available in repo;
- conflict-marker scan;
- repository automatic checks;
- privacy grep for known real-user names/addresses/private filenames before publication;
- no application/schema/config change.

## Acceptance criteria

1. Research Viewer contract retained with authoritative per-layer sourcing.
2. Practitioner governance retained without private identifiers.
3. Three pilot concepts retained with neutral IDs only.
4. Project Controls architecture retained without private site identifiers.
5. Shared indexes reflect current, not September, state.
6. No private Drive/file/customer data enters the public repo.
7. Current commercial lane is not widened/reopened.
8. All automatic checks green.
9. No merge/deployment/Production action performed by the task.

## Output

Report:
1. unique docs carried forward;
2. privacy substitutions made;
3. shared indexes changed;
4. checks/results;
5. any historical-public-branch privacy issue that still requires an owner decision.
