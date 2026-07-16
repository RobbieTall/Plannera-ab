# Decision Register

A compact register of active product/architecture decisions.

## DR-001 — Product Philosophy Anchor

**Status:** Active  
**Decision:** Plannera turns planning complexity into project intelligence, with explicit confidence handling and source-aware guidance.  
**Reference:** `docs/plannera-product-philosophy.md`

## DR-002 — Staged Intelligence Delivery

**Status:** Active  
**Decision:** Start with usable search-supported capability, then progress to structured controls and verified rule packs. Do not pretend partial ingestion is complete intelligence. Workspace chat must surface source confidence explicitly so retrieved statutory/DCP excerpts are shown as cited, model-only guidance is labelled inferred, and coverage gaps remain unresolved until local controls are available.
**Reference:** `docs/plannera-product-philosophy.md`

## DR-003 — Just-in-Time LGA Activation

**Status:** Active  
**Decision:** For unsupported LGAs, return immediate baseline guidance and trigger asynchronous local DCP/mapping preparation. Do not run full DCP parse in live request path.  
**Reference:** `docs/architecture/just-in-time-lga-activation.md`

## DR-004 — Truthful User Messaging

**Status:** Active  
**Decision:** Use restrained language during local preparation (e.g., “reviewing local controls”); avoid “correct/complete” certainty until confidence level supports it.  
**Reference:** `docs/architecture/just-in-time-lga-activation.md`

## DR-005 — Statutory-First Data Strategy

**Status:** Active

**Decision:** Prioritise authoritative statutory instruments (LEPs, SEPPs, and council DCP source material) as the primary grounding layer before heuristic or model-inferred planning guidance. Local-control answers must cite retrieved statutory/DCP excerpts where available and must identify unresolved controls when source coverage is not yet searchable or verified.

**Reference:** `docs/architecture/just-in-time-lga-activation.md`


## DR-006 — Stale-not-deleted Artefact Strategy

**Status:** Active

**Decision:** When an LGA reaches `SEARCHABLE_READY`, existing artefacts are marked with `staleAt` rather than deleted, preserving history while surfacing a regeneration prompt to the user.

**Reference:** `docs/project-memory/build-next.md`

## DR-007 — Deterministic QA Gates for Coverage Maturity

**Status:** Active

**Decision:** Deterministic QA gates for coverage maturity — VERIFIED state requires ≥50 clauses with zoning and height/FSR coverage, plus all STRUCTURED_PARTIAL checks. Checks run automatically post-ingestion and can be re-run via admin API. FAILED_REVIEW_NEEDED is set on any check failure to surface issues without blocking the system.

**Reference:** `docs/project-memory/build-next.md`

## DR-008 — Live LGA Preparation Visibility

**Status:** Active

**Decision:** While LGA coverage state is `QUEUED` or `PROCESSING`, surface a dismissible status banner in the workspace using a polling hook (10s interval). Stop polling on terminal states. Never show internal `errorMessage` to end users — `FAILED_REVIEW_NEEDED` shows generic "review needed" copy only.

**Reference:** `docs/project-memory/build-next.md`

## DR-009 — Persistent LGA Ready Notifications

**Status:** Active

**Decision:** When an LGA transitions to SEARCHABLE_READY from a project-triggered preparation job, create a persistent in-app notification for the relevant project. Use in-app notifications before email to avoid provider/env complexity. Notifications must be deduplicated per project/LGA and dismissible by the user.

**Reference:** `docs/project-memory/build-next.md`

## DR-010 — Workspace Project Intelligence Summary

**Status:** Active

**Decision:** Surface a compact Project Intelligence card in the workspace sidebar as the primary at-a-glance summary of site context, LGA coverage maturity, artefact freshness and answer confidence mix. Keep the card read-only for this slice and derive it from existing workspace state and APIs rather than adding new persistence.

**Reference:** `docs/project-memory/build-next.md`

## DR-011 — Byron and Kempsey as Production Test LGAs

Status: Active

Decision: Byron Shire and Kempsey Shire are the two designated production test LGAs for Plannera's initial live customer release. All core features (Quick Site Check, Workspace Chat, SEE Builder, Basic Feasibility) must function with real, cited planning controls for these two councils before auth, paywall, or broader LGA expansion is enabled. Byron is the primary test LGA (LEP + DCP + SEPPs wired). Kempsey is the secondary test LGA (LEP + SEPPs wired; DCP pending item 24).

Rationale: These two LGAs represent different coastal NSW planning contexts — Byron is a high-demand lifestyle/development market; Kempsey is a regional council without a proprietary GIS platform. Together they validate the full feature set across different data availability profiles.

Reference: docs/project-memory/build-next.md items 24–28

## DR-012 — No Auth/Paywall Until Both Test LGAs Are Fully Functional

Status: Active

Decision: Authentication (magic-link email), user accounts, and any paywall or subscription features must not be enabled in production until Quick Site Check, Workspace Chat, SEE Builder, and Basic Feasibility all produce predominantly Cited (not Inferred) responses for Byron Bay and Kempsey addresses. The product must work before it is closed off.

Reference: docs/project-memory/build-next.md item 28


## DR-013 — Correctness Before New Features: Zone-Aware Retrieval Priority

Status: Active

Decision: Following live production testing on 2026-07-13 that found Kempsey LEP/DCP retrieval surfacing zone-irrelevant (rural/residential) clauses for a confirmed E2 Commercial Centre site, fixing zone-aware LEP/DCP retrieval takes priority over new feature work, including build-next.md item 42 (review request copy/download handoff). Item 40 (paid export/review gate) remains out of scope. This reinforces DR-011/DR-012: Kempsey must produce predominantly Cited, zone-relevant responses before any auth/paywall work proceeds.

Reference: docs/project-memory/build-next.md item 43

## DR-014 — Commercial Readiness Requires Evidence Quality

Status: Active

Decision: Commercial readiness is evidence/quality-based, never artefact-existence-based. A saved Quick Site Check, SEE, feasibility result, or review artefact only advances the Byron/Kempsey commercial path when it is scoped to the current site and contains relevant cited or otherwise quality-valid controls. Empty, zone-irrelevant, stale, or failed outputs remain useful project history, but must not trigger “ready for paid export or expert review” messaging.

Reference: docs/project-memory/build-next.md item 28 follow-up

## DR-015 — Canonical Shared LEP Zone Projections

Status: Active

Decision: Instrument-scoped `LepZoneObjective` and `LepZoneLandUse` projections are the canonical source for LEP zone objectives and land-use permissibility in fresh projects. `project.lepData` is compatibility/cache fallback only. LEP ingestion and refresh paths must idempotently rebuild these projections even when raw current `Clause` rows already exist, without forcing destructive corpus replacement, and must expose refreshed zone codes so a missing target zone is observable rather than hidden by aggregate counts.

Reference: docs/project-memory/build-next.md item 28 corrective slice after PR #281

## DR-016 — Citation Existence Is Not Applicability

Status: Active

Decision: A retrieved or saved citation is not, by itself, evidence quality. Clause title, hierarchy, zone scope and land-use scope must support the current site before the citation can make Quick Site Check, chat, SEE, or readiness output Confirmed/Cited. Conflicting zone or land-use scopes in title/hierarchy win over incidental current-zone tokens in long clause bodies. Unsupported controls must remain Unavailable/Unresolved rather than inferred from unrelated sources. Generic plan-name clauses such as `BYRON_2014_1` are not support and must not appear in reply text, persisted LEP source refs, or source attribution for unresolved answers.

Reference: docs/project-memory/build-next.md item 28 corrective slice after PR #281

## DR-017 — Preserve statutory list terms during LEP normalisation

Date: 2026-07-14

Decision: Structured LEP list parsing must preserve statutory land-use terms exactly where normalisation is only reconstructing list rows. Intra-word hyphenated terms such as `tourist-oriented`, `Centre-based`, `Eco-tourist`, `Home-based`, and `Tank-based` are legal terms and must not be split into fragments. The parser may split actual list boundaries and semicolon-delimited land-use entries, and may remove standalone structural land-use-table ordinals, but item references inside statutory text (for example `item 2 or 3`) must remain intact.

Rationale: Quick Site Check is a cited statutory product surface. Normalisation can improve display and structured storage, but it must not alter the meaning of LEP objectives or land-use permissibility terms.


## DR-018 — Evidence-Gated Commercial Funnel

Status: Active

Decision: Near-term monetisation follows a deliberately narrow free Quick Site Check → proposal-aware cited Detailed Planning Pack → consultant-ready SEE/referral funnel, with the pack represented as its own durable artefact type rather than a SEE memo or review request. Payment/auth gating remains deferred until the Detailed Planning Pack passes Byron/Kempsey golden-case saved-output and live-verification gates. Artefact existence alone is not commercial readiness; cited, applicable evidence and honest unresolved topics control readiness.

Reference: docs/project-memory/build-next.md item 49

## DR-019 — DPP-Provenance Branch for SEE and Referral

Status: Active

Decision: SEE generation requires a current-site, commercial-ready Detailed Planning Pack with an intact cited Quick Site Check provenance chain. Expert referral may branch earlier when the newest current-site Detailed Planning Pack is unresolved: package QSC + DPP, list unresolved topics/questions, and omit SEE rather than pretending commercial readiness. Review packaging must resolve QSC, DPP, and SEE by durable provenance and current-site scope, not by newest artefact type alone.

Reference: docs/project-memory/build-next.md item 50
