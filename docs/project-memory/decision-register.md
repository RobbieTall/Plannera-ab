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

Decision: Byron Shire and Kempsey Shire are the two designated production test LGAs for Plannera's initial live customer release. All launch-path features (Quick Site Check, Detailed Planning Pack, Planning Feasibility Summary, SEE Builder, and consultant referral) must function with real, cited planning controls for these two councils before auth, paywall, or broader LGA expansion is enabled. Byron is the primary test LGA and Kempsey is the secondary test LGA; current ingestion/coverage truth is tracked in `build-next.md`, not frozen in this older decision's original rollout wording.

Rationale: These two LGAs represent different coastal NSW planning contexts — Byron is a high-demand lifestyle/development market; Kempsey is a regional council without a proprietary GIS platform. Together they validate the full feature set across different data availability profiles.

Reference: docs/project-memory/build-next.md items 24–28

## DR-012 — No Auth/Paywall Until Both Test LGAs Are Fully Functional

Status: Active

Decision: Authentication (magic-link email), user accounts, and any paywall or subscription features must not be enabled in production until the Quick Site Check → Detailed Planning Pack → Planning Feasibility Summary → SEE/referral path produces predominantly Cited, exact-bound outputs for the approved Byron and Kempsey journeys. The product must work before it is closed off.

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


## DR-034 — Same-Project Focused Plannera Check Promotion

Status: Active

Decision: The premium mobile Plannera Check acquisition flow is a focused mode of the existing requester-scoped workspace, entered through a small query contract and not through a separate app, project, resolver, backend, or evidence system. It may auto-run Quick Site Check only after the current workspace has confirmed real site context with LGA plus parcel, coordinates, or zoning identity and site-context mutations are enabled; manual address-only fallback is insufficient. Progress language may describe only real states: requester project creation/loading, site resolution, planning-control retrieval, and evidence-view preparation.

The reveal must preserve cited and unavailable evidence exactly: site/LGA/LEP/zone identity, key controls, source references, zone objectives, permissibility, and highlighted clauses are shown without turning missing evidence into success. After useful value, **Create project in Plannera** is the evidence-preserving promotion action: it saves the displayed Quick Site Check snapshot through the existing same-project artefact path or reuses an equivalent current-site saved snapshot, then enters the full workspace. Billing, price, Stripe, quotas, credits, checkout, entitlements, auth policy, PWA/native work, and consultant sending remain outside this slice.

Reference: docs/project-memory/build-next.md Item 65


## DR-035 — Main Reachability Is the Merge Truth for Stacked Pull Requests

Status: Active

Decision: GitHub's merged flag is insufficient evidence that a stacked change is present on `main`. A sequential PR merged into another feature branch is stack-merged only. Documentation, release claims, and the next implementation base may call an item main-integrated only after its merge commit or equivalent tree is reachable from `main` and the resulting `main` state is verified.

After a parent PR lands, each remaining stacked PR must either be retargeted/rebased onto `main` before merge or be carried through one explicit integration PR whose base is `main`. Before advancing the commercial sequence, verify PR base, merge commit, `main` reachability/tree, changed-file scope, mergeability, and required checks. This prevents a green, merged feature-branch stack from being mistaken for deployed product capability.

Reference: docs/project-memory/build-next.md Item 66


## DR-036 — Property Controls Come From Spatial LEP Maps; Project Identity Is Dual-Key

Status: Active

Decision: Height of buildings, floor space ratio, and minimum lot size are property-specific mapped LEP controls. Generic clauses 4.1, 4.3, and 4.4 establish the control and refer to maps, but clause text alone is not evidence of the value at a confirmed property. Quick Site Check must query the official NSW EPI primary planning layers at the confirmed coordinates, select the current LEP feature against the resolved instrument/LGA, and cite the instrument, map, and clause. Spatial values outrank generic clause-text extraction and legacy client/project payload values. Missing, failed, or ambiguous map evidence remains unavailable.

A Plannera project has both an internal database `id` and an optional `publicId`. Any user-facing link may emit either identifier, so requester-scoped reads and claims must resolve both through one ownership predicate. Matching an identifier never weakens user/session ownership, and a guest session may match only unowned projects from that same session.

The free Check remains site scoped. Development intent is a separate proposal input that may drive cited permissibility interpretation and the Detailed Planning Pack only after its classification contract is explicit; it must not be used to manufacture property controls.

Reference: docs/project-memory/build-next.md Items 67–68


## DR-037 — Development Intent Is User-Provided; Permissibility Matching Is Exact and Server-Verified

Status: Active

Decision: Plannera Check remains property first. Site identity and mapped LEP controls are resolved and revealed independently of proposal wording. Before same-project promotion, the user supplies a concise proposed-development description that is persisted with the Quick Site Check and carried unchanged into the existing Detailed Planning Pack brief.

Plannera may label that intent with a cited zone permissibility pathway only when the server-retrieved, DB-backed current-zone land-use table contains exactly one complete statutory term matching the normalized input. Case, whitespace and dash variants may normalize; substrings, fuzzy descriptions, fallback evidence, duplicate cross-path terms, missing zones and absent tables remain `Unresolved`. Even an exact term match is a cited table match, not proof that the factual proposal satisfies the statutory definition or that approval will be granted. Client-supplied classification, pathway, match, citation and explanatory text are recomputed at Quick Site Check persistence.

Reference: docs/project-memory/build-next.md Item 68


## DR-038 — Launch Feasibility Must Be Derived From the Single Commercial Evidence Path

Status: Active

Decision: The standalone Basic Feasibility experience must not remain a competing source of planning truth beside the commercial funnel. Its useful assessment logic should be consolidated into a Planning Feasibility Summary derived from the exact current-site Quick Site Check, active proposal and exact Detailed Planning Pack after Item 68. The launch sequence is Property Check → proposal intent → Detailed Planning Pack → Planning Feasibility Summary → SEE / consultant referral.

The consolidated summary must preserve cited/unresolved evidence, fail closed when the DPP is unresolved or mismatched, and never issue a second ungrounded permissibility answer. Its strict write request carries only the project, exact DPP artefact and expected proposal; the server resolves ownership, current-site scope, QSC provenance and proposal equality. `Blocked` requires an exact cited prohibited intent bound to the same proposal. Legacy and different-proposal feasibility artefacts remain history and cannot drive the active workspace output.

Reference: docs/project-memory/build-next.md Item 69


## DR-039 — Commercial Conversion Is Measured From Authoritative Outcomes

Status: Active

Decision: Plannera's launch funnel must be measured from successful evidence-state transitions, not browser clicks or artefact existence. Persisted milestones such as a quality-valid Quick Site Check, same-project promotion, exact proposal/DPP generation, evidence-derived feasibility summary, exact SEE and expert-review package are server-confirmed outcomes. Client-only events may describe an impression or interaction but cannot claim that generation, payment or referral succeeded.

The event contract must be versioned, idempotent, test/bypass-aware and privacy-minimal. Raw addresses, parcel/coordinate data, proposal/chat text, clause excerpts, personal/contact details, secrets and uploaded content are prohibited event properties. Retention, access, deletion, disclosure/consent, vendor and data-location requirements must be reviewed before production collection. No analytics SDK, marketing pixel or ad hoc click-tracking implementation precedes that contract.

Reference: docs/project-memory/build-next.md Item 70


## DR-040 — Payment Purchases Exact-Scope Analysis, Never Planning Certainty

Status: Active

Decision: a one-time DCP purchase may unlock generation only for one owned project, exact current-site Quick Site Check snapshot, normalized proposal fingerprint and product version recorded by a signature-verified, idempotent server payment flow. Browser redirects, displayed prices, client fields and artefact existence cannot create entitlement. Changing project, site or material proposal scope requires the documented regeneration/new-purchase policy.

Payment never upgrades evidence confidence, suppresses unresolved topics or guarantees approval. The same DPP citation qualification, provenance and commercial-readiness rules apply to paid and unpaid/test generation. Production payment remains disabled until the protected current-release Byron/Kempsey golden gate passes.

Reference: docs/project-memory/build-next.md Items 40, 71–72


## DR-041 — Consultant-Ready Packaging Is Not Referral Delivery

Status: Active

Decision: a saved, copied or downloaded Expert Review Request is a consultant-ready package, not proof that Plannera transmitted it, matched a consultant, obtained acknowledgement or completed a referral. Delivery status may advance only from an owned, exact-provenance submission through a server-authoritative, idempotent operational workflow with explicit user consent and truthful status labels.

The first launch workflow may use a human-operated Plannera referral queue, but the product must not claim automated matching, consultant availability, credentials, quote competition or response SLAs until those capabilities and disclosures are real.

Implementation contract: the exact current QSC/DPP evidence chain deterministically produces a versioned needs matrix and separate discipline briefs. `PACK_GAP` may explain why expert input is required but is never presented as a statutory citation. Hazard and specialist disciplines outside the current evidence coverage are labelled `Not identified from current evidence`, never “not required”. A consented submission stores minimum contact fields separately from one immutable package snapshot and digest, is unique per exact project/DPP/QSC/proposal scope, and appends every operational state change to a non-secret audit ledger.

The user-visible delivery states are distinct facts: `SUBMITTED` means saved to Plannera only; `ACKNOWLEDGED` means a Plannera operator reviewed it; `ASSIGNED` means the package was actually sent to a consultant; `CONSULTANT_ACKNOWLEDGED` requires actual consultant acknowledgement. Contact data and package content never enter funnel analytics. Direct submission remains disabled unless the approved server flags name the human queue.

Protected non-production acceptance completed in run `30772575070` on merged `main` commit `299145bfa7158c0cc5495cae2812dccbef6b9c2b`. Its privacy-minimal artifact `8841017675` proved exact configuration, empty preflight, consented submission, immutable package/digest integrity, protected queue visibility, the ordered `SUBMITTED` → `ACKNOWLEDGED` → `ASSIGNED` → `CONSULTANT_ACKNOWLEDGED` → `CLOSED` lifecycle, redacted user status and cleanup. This satisfies Item 73 verification only. Production flags remain false/absent; activation still requires a separate explicit operator decision and must not imply automated matching or consultant availability.

Reference: docs/project-memory/build-next.md Item 73


## DR-042 — Commercial Measurement Uses a Property-Free First-Party Ledger

Status: Active

Decision: Plannera launch conversion measurement uses a first-party PostgreSQL event ledger with a fixed, versioned event taxonomy and no JSON/free-form properties. Persisted milestones are emitted only after their server write succeeds; handoff copy/download events are accepted only after requester ownership and the exact saved Expert Review Request are resolved again. Database-unique keys make each exact project/output transition idempotent.

The ledger stores only event contract fields plus opaque internal project/output references required for deduplication and cascade deletion. Raw addresses, parcel/coordinate or zoning detail, proposal/chat text, clause excerpts, names, email/contact details, uploaded content, secrets and payment data are structurally excluded. Aggregate reports return unique-project counts and cohort intersections only. Environment, demo, server-allowlisted internal/golden-project and development-bypass exclusion is server-derived.

Events expire after 90 days, project/artefact deletion cascades, and an authenticated daily retention endpoint performs physical pruning. Production collection is fail-closed until `COMMERCIAL_FUNNEL_ENABLED=true` and `CRON_SECRET` are both configured; no browser field can enable or include traffic. No third-party analytics SDK, marketing pixel, profiling identifier or query-string admin secret is introduced.

Reference: docs/project-memory/build-next.md Item 70


## DR-043 — Terminal Audit Acceptance Is Distinct From Commercial Readiness

Status: Active

Decision: The protected Commercial Funnel Live Audit has two honest terminal journeys. A strict quality chain remains the only commercial-ready path: current cited Quick Site Check, exact-source cited Detailed Planning Pack with no unresolved topics, exact-provenance SEE, and `quality_chain_referral`. An unresolved pack may also be an accepted terminal audit journey, but only as expert-review material: the QSC must be ready and cited, the exact active QSC-bound DPP must be `needs_expert_review` with cited and unresolved topics, SEE must be absent by design with zero applicable evidence, referral eligibility must be `unresolved_pack_referral`, and the server-derived expert-review reason codes must prove the unresolved DPP, SEE non-applicability, and selected cited QSC provenance.

Audit summaries therefore expose `acceptedJourney` and `terminalPath` independently from `commercialReady`. Aggregate audit exit success means both approved projects reached an accepted terminal journey; aggregate commercial readiness remains true only when both projects are strict quality chains. Existing `ready` semantics remain aligned to commercial readiness rather than being silently redefined. Invalid identity, site, proposal, citation, provenance, state, eligibility, or next-action mismatches still fail closed with deterministic runner reasons.

Reference: Commercial Funnel Live Audit run 30066635612 / Item 71


## DR-044 — Purchase Entitlements Are Provider-Neutral Exact-Scope Records

Status: Active

Decision: The Item 72A foundation records purchases and entitlements as provider-neutral lifecycle state only. A purchase snapshots server-owned product code/version, amount in minor units, ISO currency, opaque provider reference fields, idempotency key, exact current Quick Site Check artefact and normalized proposal SHA-256 fingerprint. An entitlement is a separate exact-scope record for the purchaser, owned project, saved QSC artefact, proposal fingerprint and product/version, sourced from a paid purchase.

Active entitlement lookup must fail closed for any cross-user, cross-project, changed QSC/site, changed proposal, product or version mismatch. Refund and revoke remove active entitlement scope so a legitimate later repurchase can be recorded without weakening duplicate-active protection. These records must never persist raw proposal text, address, zoning detail, clauses, contact data, provider payloads/secrets or arbitrary JSON metadata.

Lifecycle transitions are guarded server-side and idempotent for identical terminal replays. Settlement may move only a payable purchase to `PAID` through an atomic status condition; it must not overwrite a concurrent failed, cancelled or refunded transition, and it must never reactivate a `REVOKED` or `REFUNDED` entitlement. Concurrent pending-intent creation may return the winning exact-scope record after a unique-key race, but must not leak provider or database errors to the customer.

This foundation does not select a provider, create checkout/webhook/API/UI paths, launch payment, gate DPP generation, mutate evidence quality, change `acceptedJourney`/`commercialReady`, emit analytics or send consultant referrals. Production checkout still requires operator approval of provider, final product/name/price, GST/tax treatment, refund/credit/regeneration policy and launch timing.

Implementation evidence: PR #318 (domain foundation) and PR #319 (lifecycle hardening); docs/project-memory/build-next.md Item 72 / Item 72A


## DR-045 — Stripe Checkout Implements, but Does Not Activate, the Approved Pack Contract

Status: Active

Decision: The Planning Controls Pack is a Stripe-hosted one-time payment with server-owned product code `planning_controls_pack`, version `v1`, price A$49.00 total and AUD currency; Tallrok Developments Pty Ltd is GST-registered and the displayed total includes GST. Browser price, product, tax and redirect state are never authoritative. Entitlement activates only from a signature-verified paid webhook whose Checkout session, `mode=payment`, paid status, A$49.00 amount, AUD currency and opaque purchase/payment references all match the exact requester-owned project, current-site cited QSC artefact, normalized proposal fingerprint and product/version. Same-scope retry/regeneration reuses value; any project/site/QSC/material-proposal change requires purchase.

Stripe Checkout must enable automatic tax, require billing-address collection and use inclusive tax behavior while retaining the A$49.00 customer total. Stripe Tax registration/settings and an appropriate default product tax code are operator configuration, not hard-coded application policy. Before activation, the protected Stripe test-mode Australian case must itemise A$4.45 GST within that total; the GST-included representation applies where the verified Stripe configuration and billing location determine Australian GST is applicable.

Checkout is fail-closed and disabled by default. When disabled, existing free DPP generation is identical and builds need no Stripe secrets. When enabled, missing configuration denies safely and exact active entitlement is checked before DPP retrieval or persistence. Payment cannot change citation status, confidence, readiness or expert-review routing. A truthful persisted cited/unresolved pack is delivered value. A system/retrieval failure that prevents generation and persistence requires an operator-initiated full refund to the original method; state changes atomically to refunded only after signed provider confirmation of the full A$49.00 refund, including when that confirmation precedes settlement, which revokes active entitlement and blocks later paid replay. Partial refunds or paid-after-failed/cancelled contradictions require non-2xx reconciliation and are never silently acknowledged. There is no public refund endpoint. Production checkout remains explicitly not activated.

Reference: docs/project-memory/build-next.md Item 72B


## DR-046 — Test-mode Acceptance Is Protected Evidence, Not Activation

Status: Active

Decision: Stripe acceptance for the Planning Controls Pack runs only by explicit manual dispatch against a protected non-production deployment and Stripe test-mode objects. The operator manually completes hosted Checkout between the before-payment and paid phases and manually requests the full refund before the refunded phase; automation verifies provider amount/currency/tax facts, webhook-settled exact entitlement, duplicate and cross-scope denial, repeatable phase-aligned terminal state and provider-confirmed full refund. Automation calls real status, checkout and DPP routes but does not inject webhook events, inspect private response bodies, or perform payment/refund actions. Redirects, UI copy, live keys/objects, production-like hosts, partial refunds, contradictory events, missing configuration, or unsafe output fail closed.

Acceptance evidence contains only allowlisted aggregate/result fields and opaque IDs. Raw addresses, proposal/contact/card data, cookies, secrets and provider payloads must not enter logs, summaries or artifacts, and test-card data is never persisted. Deploying or completing protected test acceptance is not enabling checkout. Production keeps `PLANNING_PACK_CHECKOUT_ENABLED` false/absent until a separate explicitly approved activation PR. Item 72C may be described as protected sandbox lifecycle complete, but not Production-activated.

Reference: docs/project-memory/build-next.md Item 72C; docs/operations/stripe-test-mode-acceptance.md


## DR-047 — Two Paid Products and One Exact-Scope SEE Credit

Status: Active

Decision: Plannera's launch funnel has two one-time paid products. The proposal-specific Planning Controls Pack is A$49.00 total including GST under its approved contract. The submission-oriented SEE is A$749 before credits. One settled, unrefunded, unrevoked Planning Controls Pack for the same requester, owned project, current-site Quick Site Check, normalized proposal fingerprint and compatible product version may be consumed once as an A$49 SEE credit, leaving A$700 payable.

The credit is server-derived, single-use, exact-scope, non-transferable and not cash-redeemable. A changed project, site, QSC or material proposal, a refunded/revoked pack, or a previously consumed credit is ineligible. Checkout must itemise list price, credit, balance and applicable GST truthfully. Payment or credit never improves citation, confidence, completeness, consultant requirements or submission readiness. The SEE purchase/credit implementation and production activation remain future operator-gated work.

Reference: docs/project-memory/build-next.md Item 74; README.md Commercial pilot funnel


## DR-048 — A Final SEE Is an Evidence State, Not a Generation Event

Status: Active

Decision: the current pre-SEE planning memo is groundwork and must not be represented as the finished paid product. A commercial SEE begins as a versioned living draft bound to the exact QSC/Planning Controls Pack/proposal chain. It becomes submission-oriented only after required statutory, spatial, plan, user and specialist evidence is present, readable, applicable and cited, or an unresolved matter is explicitly held for professional review.

The Planning Feasibility and Delivery Plan classifies professional inputs as `Required`, `Conditional`, `Recommended`, or `Not identified from current evidence`. It never promises that no later council or professional request will arise. Uploaded documents, plans, maps and returned reports are evidence candidates, not accepted facts merely because they were stored. Their provenance, page/layer, site/scope, freshness, readability and conflicts must be assessed before they support a section. Final paid output is an editable DOCX and professionally rendered PDF with source register, revision history and appendices; `.txt` is convenience output only.

Reference: docs/project-memory/build-next.md Items 73–74


## DR-049 — Certify Byron and Kempsey Before Replicating LGA Automation

Status: Active

Decision: Byron and Kempsey must reach explicit whole-LGA and submission-document flight acceptance before Plannera builds the general LGA onboarding factory. Readiness requires a versioned authoritative-source manifest, every current LEP zone and exact land-use term, current relevant DCP material, available spatial sources, source freshness, representative golden cases, consultant/report paths, rendered SEE inspection and fail-closed demotion. Document or clause counts and one successful address do not establish whole-LGA readiness.

After sign-off, new councils use paid just-in-time activation: available LEP/state preliminaries are returned immediately; an A$49 proposal-specific pack purchase queues source discovery, ingestion and QA with truthful status and notification. Completed LGA preparation becomes shared infrastructure, while the purchased analysis and any SEE credit remain exact to the paying project scope.

Reference: docs/project-memory/build-next.md Items 74–75; docs/architecture/just-in-time-lga-activation.md


## DR-050 — Readability and Retrieval Readiness Are Separate Evidence Facts

Status: Active

Decision: a project upload has two independent persisted states. Readability records whether Plannera could extract meaningful content from the original bytes (`Ready`, `Partially readable`, `Image only`, or `Needs review`); indexing records whether that extracted content is available to the project retrieval path (`pending`, `ready`, `failed`, or `not applicable`). A readable file with failed or pending indexing is not silently treated as evidence available to the SEE compiler.

Every supported upload retains a SHA-256 hash, extraction method/time and structured extraction metadata. PDF page and spreadsheet-sheet provenance travels into source chunks. Parser warnings, unsupported legacy formats, text-empty scans and indexing failures remain visible. Storage success alone never establishes accepted facts, applicability, freshness or submission readiness; OCR, map/plan interpretation, conflict resolution and SEE section acceptance remain separate gates.

Reference: docs/project-memory/build-next.md Item 74A; DR-048

## 2026-08-25 - Item 74H controlled evidence acceptance boundary

Decision: Accept the protected Preview flight as proof of authoritative retrieval and privacy-safe deterministic gating, but do not treat it as paid-product acceptance.

Rationale:

- The controlled Byron RU2 site was uniquely resolved and produced seven authoritative observation groups.
- The deterministic result remained `MORE_EVIDENCE_REQUIRED`, which correctly blocks the A$49 Planning Controls Pack and A$749 submission SEE.
- Production checkout remained disabled and no Production mutation occurred.
- An earlier protected-log disclosure was invalidated; request-scoped resolver suppression was added and the final run completed without that disclosure.
- Temporary Preview variables were removed and the clean exact-head deployment completed with acceptance phases disabled.

Consequence: Item 74H proceeds to evidence-confirmed road/setback and mapped-constraint interpretation. No developer may weaken a missing-evidence state, infer unsupported controls, or activate paid eligibility to make this slice appear complete.
