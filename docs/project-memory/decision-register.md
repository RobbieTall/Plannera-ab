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


## DR-020 — Billing/Auth Unlock Requires Read-Only Live Chain Audit

Status: Active

Decision: Billing, checkout, subscriptions, auth gating, or paid commercial unlock cannot be justified by artefact existence, local tests, or deployment success. The protected read-only commercial funnel audit plus approved live evidence must prove an exact current-site Quick Site Check → Detailed Planning Pack → SEE/referral chain before the Byron/Kempsey commercial gate can close. Legacy, stale, malformed, forged, cross-site, or broken-provenance artefacts remain history only and must never unlock payment/auth readiness.

Reference: docs/project-memory/build-next.md item 51


## DR-021 — Fail-Closed Commercial Funnel Live-Audit Runner

Status: Active

Decision: Item 52 live verification must use the deterministic commercial funnel audit runner rather than ad hoc production calls. The runner is environment-only for base URL, admin token, expected commit, and approved existing Byron/Kempsey project IDs; authenticates with the `x-admin-token` header; performs exactly one read-only GET per configured project; emits only an allowlisted documentation-safe summary; and fails closed for missing config, unsafe URLs, HTTP/auth/network/JSON/contract failures, project identity mismatches, or any broken QSC → DPP → SEE/referral invariant. The live gate cannot close unless both Byron and Kempsey golden chains independently pass.

Reference: docs/project-memory/build-next.md item 52


## DR-022 — Protected Manual Remote Commercial Funnel Audit Lane

Status: Active

Decision: The approved Byron/Kempsey commercial funnel audit must be run through a manually dispatched, protected GitHub Actions environment on `main`, not through chat, local shells, ad hoc curl calls, or production mutation paths. The workflow uses immutable official action pins, read-only repository permissions, environment/repository secret and variable injection only, `github.sha` as the expected commit, no caching, no persisted checkout credentials, no build/deployment/DB/Prisma/ingest/generation steps, and uploads only the runner's validated allowlisted JSON summary. The gate remains fail-closed: only runner exit `0` can pass the workflow; runner exit `1`, runner exit `2`, install failure, missing exit output, or absent/invalid JSON fails.

Reference: docs/project-memory/build-next.md item 53


## DR-023 — Live Non-Ready Evidence Must Drive Normal-Product Remediation

Status: Active

Decision: A protected commercial-funnel audit exit `2` is valid production evidence, not a technical failure to hide or bypass. The 2026-07-16 Byron/Kempsey run proved both approved projects exist and return the versioned contract, while both genuine saved QSC → DPP → SEE chains are missing. Those artefacts must be produced through the normal user-facing workflow with real, user-approved proposal briefs and the existing evidence/provenance gates. They must not be fabricated, database-backfilled, generated by the read-only audit, or treated as ready because a deployment succeeded.

Golden identity validation may canonicalise presentation-only address differences and use canonical `lgaName` when `lgaCode` is null, but it must continue to fail closed for a different project identifier, site number/locality/postcode, LGA, or zone. Identity normalisation cannot suppress any missing, unresolved, uncited, stale/mismatched, malformed, legacy, or broken-provenance reason.

Operationally, the protected audit credential must match the effective admin-auth value in precedence order: `ADMIN_ACCESS_TOKEN`, then `INGEST_ADMIN_SECRET`, then `ADMIN_SECRET`. Secret values remain outside repository documentation.

Reference: docs/project-memory/build-next.md Item 54


## DR-024 — Commercial Golden Projects Must Be Normal-Workspace Accessible

Status: Active

Decision: An admin-auditable project is not a valid end-to-end commercial golden unless the intended requester can open it through the normal product workspace and create artefacts through the same user-facing APIs as a pilot customer. Historical projects tied to an inaccessible session or owner must not be made public, silently claimed, ownership-backfilled, or given an admin generation bypass merely to satisfy an audit.

When historical golden records are readable only by the protected admin audit, create fresh requester-owned/session-owned pilot projects through the normal production UI after explicit approval. Verify site identity before replacing protected audit project-ID variables. QSC, DPP, SEE, and referral outputs must then be produced through normal provenance and evidence gates; unresolved outputs remain valid product evidence and must not be upgraded.

Reference: docs/project-memory/build-next.md Item 55

## DR-025 — Deterministic Commercial Funnel CI Is Required Regression Evidence

Status: Active

Decision: Every commercial-funnel pull request must pass a secret-free remote golden gate that persists fixed Byron SP3 and Kempsey E2 journeys through the real QSC, Detailed Planning Pack, SEE/referral, and read-only audit services. The gate must also exercise an unresolved evidence branch that blocks SEE and packages an honest consultant referral. It may use deterministic in-memory dependencies, but it must not connect to production, receive production secrets, call models or live retrieval, build/deploy, or mutate external data.

A green deterministic gate proves service integration and provenance invariants only. It does not prove live planning-data quality, normal-workspace accessibility, saved production output, or commercial readiness, and it cannot replace the protected live audit required by DR-020 through DR-024.

Reference: docs/project-memory/build-next.md Item 56

## DR-026 — Consultant Evidence Requires Exact Server-Sourced Snapshots

Status: Active

Decision: Client-supplied values, clause references, confidence labels, matching artefact IDs, or plausible citation strings are not provenance. Persisted core LEP controls must be re-derived from server-retrieved evidence and must become Unavailable when a value and clause reference cannot be verified. Optional QSC setback, parking, and active-frontage/built-form controls must likewise be rebuilt from server DCP results and become DCP-Unavailable without a server Cited value/ref. LEP clause 2.3 may be cited only when the saved Quick Site Check proves a DB-backed zone table through both zone objectives and land-use entries; cited numeric controls do not establish permissibility.

A SEE may advance the commercial audit or consultant-review handoff only when its proposal summary, LEP instrument and permissibility, copied QSC controls, DPP clause metadata and body text, source excerpts, and consistency assessments exactly match its active source QSC/DPP snapshot. Ref-only or ID-only matches fail closed. Review packages rebuild citations from verified source artefacts and must not promote unsupported SEE evidence.

This deterministic invariant is required regression evidence but does not replace the approved live Byron/Kempsey saved-output audit or unlock billing/auth.

Reference: docs/project-memory/build-next.md Item 57



## DR-027 — DPP Topics Require Topic-Relevant DCP Evidence

Status: Active

Decision: A Detailed Planning Pack topic may be marked Cited only when retrieved DCP evidence is both site-applicable and topic-relevant according to that topic's deterministic matcher. Part B, all-development, current-zone, chapter labels, and source references are provenance/scope signals only; they cannot bypass topic matching. Generic local-control rows must contain explicit general/local/all-development/design/site/development-control terms, and unrelated topics remain Unavailable. Commercial readiness remains fail-closed and may be true only when every required DPP topic is genuinely Cited.

Reference: docs/project-memory/build-next.md Item 58


## DR-028 — DPP Topic Citations Require Substantive Clause-Body Requirements

Status: Active

Decision: Topic matching and provenance are necessary but insufficient for paid Detailed Planning Pack citations. A DPP topic may be marked Cited only when the site-applicable, topic-relevant DCP clause has a real source reference and the body text itself states a substantive requirement. Substantive body text can be numeric/rate-based or a concrete qualitative prescription/prohibition using strong prescriptive control language, including checked-in Byron DCP variants such as “should” controls and parking/headroom bodies that refer to cars or accessible spaces. Mixed objectives-plus-controls chunks may qualify only when the same sentence/control row contains both the topic match and genuine control, including controls that contain “where relevant”; metadata alone, headings, refs, topic tags, objective-only “To ensure/provide…” prose, overviews, administrative/index text, topic listings, unrelated-topic controls elsewhere in the same body, or vague “controls apply where relevant” wording must leave the topic Unavailable with no citations.

Commercial readiness remains fail-closed and may be true only when all required topics pass this substantive body requirement test. This decision follows merged Item 58, which landed in PR #302 from exact head `558ca9d5fcaf7ea85c40e155739e9c3103ccb943` at exact merge commit `963662cac8418767b901a4355577614ae07eb888`; Item 59 is DONE/MERGED in PR #303 from exact head `03132bd473e2b13d0ad5d47356da7b697217b7bd` at exact merge commit `ac34b1b336706db7d77fc6aa39faf33381af095c`.

Reference: docs/project-memory/build-next.md Item 59

## DR-029 — Exact DCP Requirement Excerpts and Self-Contained Consultant Handoff

Status: Active

Decision: Paid Detailed Planning Pack DCP citations must persist only the exact normalized requirement rows that independently satisfy site applicability, topic isolation, and substantive requirement rules. Broad clause bodies, objectives, administrative/index/overview text, generic “controls apply” wording, and unrelated-topic rows must not be saved merely because another row in the same clause qualified. Downstream SEE controls, source excerpts, prompt grounding, and exact-provenance checks must carry those persisted excerpts unchanged.

Expert Review Request payloads must make consultant handoff self-contained by deriving cited DCP requirements only from the selected current Detailed Planning Pack and including topic identity, citation identity/hierarchy, and the exact excerpt in both commercial-ready and unresolved referrals when cited topics exist. Legacy review requests remain valid through optional/default-empty handling.

Reference: docs/project-memory/build-next.md Item 60

## DR-030 — Proposed-Works Brief Is Active DPP Scope

Status: Active

Decision: The proposed-works brief captured for a Detailed Planning Pack is part of the active commercial-funnel scope, not merely display text. In the normal workspace, a current-site pack generated for a different brief must not be selected as the active pack for next-action readiness, SEE progression, or expert-review prompting. Normal SEE and expert-review write requests must send the intended DPP artefact ID plus expected proposal brief, and the server must resolve that exact owned current-site DPP with intact cited QSC provenance and matching normalized persisted proposal before writing anything. Explicit source binding must not silently fall back to another/newer DPP. Legacy requests without explicit binding may continue through the existing newest-current resolver only for compatibility, but the normal current workspace path must be exact-bound.

Reference: docs/project-memory/build-next.md Item 61


## DR-031 — Displayed Workspace Outputs Are Exact Proposal/DPP Scoped

Status: Active

Decision: Normal-workspace current SEE and Expert Review Request cards, readiness flags, and commercial CTA progression must derive only from outputs that exactly match the active current-site Detailed Planning Pack and its proposed-works brief. A SEE must name the active DPP artefact ID, the active DPP source Quick Site Check artefact ID, and the same normalized proposal summary. An Expert Review Request must name the active DPP, active source QSC, normalized proposal, matching commercial-ready state, and, if it includes a source SEE memo, that SEE must be from the same active DPP.

Changing or clearing the proposal brief intentionally removes the active exact-bound DPP/output set until a non-empty brief matches or regenerates a pack. Old or malformed outputs remain artefact history only and cannot drive current cards, `hasSee`, `hasQualitySee`, readiness, or normal-workspace SEE/review POSTs. Normal current-workspace handlers must stop client-side rather than invoking server legacy compatibility fallback with omitted DPP/proposal bindings.

Reference: docs/project-memory/build-next.md Item 62


## DR-032 — Address-First Commercial Entry and Truthful Requester UI

Status: Active

Decision: The normal homepage must present the real free Quick Site Check task in the first viewport: Plannera and Quick Site Check naming, a labelled Site address input, and a Run free site check action. Launch examples are limited to 45 Broken Head Road, Byron Bay NSW 2481 and 52 Belgrave St, Kempsey NSW 2440, with copy restricted to cited NSW Byron/Kempsey pilot scope and the four-step Site → Quick Site Check → Detailed Planning Pack → SEE/referral journey. Decorative/fabricated readiness, timeline, risk, document-count, monitoring, template, or consultant-directory claims must not be shown unless backed by current normal product state.

Auth-bypass entitlement is not the same as an actual signed-in NextAuth user. UI chrome may preserve `isAuthenticated`/`requireAuth` compatibility for protected actions, but must use a truthful signed-in state before showing Sign out. My Projects is canonical at `/projects` and must be requester-scoped: signed-in users see owned projects after safe session-project claiming, while guests/bypass requesters see only current anonymous-session projects. The canonical Projects UI should stay operational and compact, with truthful guest copy and a single New site check action rather than decorative stats, dark hero panels, or unsupported project-management claims.

Reference: docs/project-memory/build-next.md Item 63

## DR-033 — Plannera Check Is Shared Product Acquisition, Workspace Funnel Is Evidence-Derived

Status: Active

Decision: Plannera Check is the mobile-first acquisition surface of Plannera, not a separate subscription product, repository, database, duplicated backend, or independent checkout surface. The free check may use the existing session-owned project as an ephemeral technical container, but the user-facing promotion boundary after useful Quick Site Check value is “Create project in Plannera” / “Save as a Plannera project”. Account claiming or promotion must reuse the exact project and evidence snapshot rather than creating a duplicate project.

The workspace commercial path is the shared-product sequence Site → Quick Site Check → Detailed Planning Pack → SEE / consultant handoff. Its displayed stage state must derive from current-site/proposal/exact-DPP evidence and the existing commercial next-action result. It must not create a parallel readiness truth, infer readiness from artefact existence alone, introduce A$2 microtransactions, or make global traffic-light certainty claims. Future DCP Deep Dive purchase work, if approved, must bind to the claimed project, exact site snapshot, and proposal intent. Billing, price, Stripe, quotas, credits, checkout, entitlements, auth policy, PWA/native implementation, consultant sending, and the promotion gate remain deferred.

Reference: docs/project-memory/build-next.md Item 64
