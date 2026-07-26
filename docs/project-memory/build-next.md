# Build Next (Execution Queue)

This is the active sequence for what to build next so direction is never lost.

## Item A — SEE output quality — DONE ✅

Strengthened SEE generation grounding so retrieved DCP chunks are injected as inline `DCP Source — [title]: [chunk text]` evidence, SEE section instructions require exact DCP source titles and LEP clause-number citations, generic control numbers are prohibited unless present in retrieved text, and section JSON can carry `citations` entries for each cited LEP/DCP source.

**Success signal:** generated SEE/pre-SEE section output can list real citation objects such as `{ ref: "Byron LEP 2014 cl. 4.3", type: "LEP" }` and DCP source-title citations instead of generic planning advice.

## Item B — Kempsey zone-aware commercial clause retrieval — DONE ✅

Fixed non-Byron statutory retrieval so confirmed site zoning is passed into LEP/DCP clause search and commercial-zoned Kempsey sites prioritise E2 Commercial Centre material while suppressing unrelated rural/residential-only clauses unless the user explicitly asks about those zones. Added regression coverage for an E2 Kempsey commercial setbacks/height query.

**Success signal:** Workspace Chat and Quick Site Check grounding for a confirmed E2 Commercial Centre Kempsey site returns commercial-zone LEP/DCP excerpts and avoids stale rural boundary setback, dual occupancy, bed and breakfast, and secondary dwelling provisions.

## Item C — structured Kempsey control extraction — DONE ✅ (2026-07-13)

Extended non-Byron Quick Site Check structured extraction for Kempsey E2 Commercial Centre so mapped LEP height/FSR values and DCP-backed setback, parking, and active frontage/built-form controls can be promoted into deterministic controls with real LEP clause or Kempsey DCP source citations. Missing DCP controls are now explicitly marked `Unavailable` instead of inferred when retrieved Kempsey text does not contain a numeric/explicit E2 value.

Regression coverage now verifies cited Kempsey E2 height, FSR, setback, and active frontage extraction from representative LEP/DCP rows plus an unavailable parking case where the DCP excerpt contains no explicit numeric E2 rate. Byron ingestion and Byron LEP structured-control logic were left untouched.

**Success signal:** Quick Site Check for a Kempsey E2 Commercial Centre site shows cited structured values where the ingested LEP/DCP text contains them and explicitly marks missing controls unavailable rather than inferring them.

## 1) Just-in-Time LGA Activation Core — DONE ✓

- Implement LGA coverage-state persistence.
- Implement job de-duplication/locking.
- Implement async `prepare_lga_pack(<LGA_CODE>)` worker contract.
- Add project-level status + completion notification.

**Success signal:** unsupported LGA requests return immediately with baseline guidance while local preparation runs in background.

## 2) Confidence-State Surface Area — DONE ✓

- Ensure outputs consistently distinguish:
  - confirmed / cited / inferred / user-provided / unresolved.
- Add UI-visible confidence + source state for local controls.

**Success signal:** no local-control claim is shown as verified unless coverage state is `VERIFIED`.

## 3) Regeneration Flow After Local Readiness — DONE ✓

- Trigger or prompt regeneration of:
  - Quick Site Check
  - SEE sections
  - risk summary
  - feasibility notes

**Success signal:** user can refresh project artefacts immediately after local controls become available.

## 4) Coverage Maturity Promotion — DONE ✓

- Support progression across:
  - `NOT_STARTED` → `QUEUED` → `PROCESSING` → `SEARCHABLE_READY` → `STRUCTURED_PARTIAL` → `VERIFIED`.
- Add QA checks/golden tests required before `VERIFIED` promotion.

**Success signal:** deterministic checks gated behind `VERIFIED` state only.

## 5) LGA Coverage Status Panel — DONE ✓ (this goal)

Real-time polling hook + status panel component wired into workspace.

**Success signal:** user sees live progress while LGA data is being indexed.

## 6) End-to-End Notification: LGA Ready In-App Alert — DONE ✓

When an LGA transitions to `SEARCHABLE_READY`, notify the project owner with a persistent, dismissible in-app notification stored in the DB.

**Success signal:** user is proactively informed when their LGA becomes available without needing to refresh.

## 7) Project Intelligence Summary Card — DONE ✓

A persistent "Project Intelligence" card in the workspace sidebar now shows:

- Site address and zone
- LGA coverage maturity level (human-readable)
- Artefact freshness (last generated, stale count)
- Confidence breakdown (% cited vs inferred vs unresolved from last chat session)

**Success signal:** user can assess data quality at a glance without asking the chat.

## 8) Workspace Chat History Persistence & Thread UX — DONE ✓

Persist chat messages to the Project model so conversation history survives page refresh.
Add a "New thread" button to clear the UI without deleting history.

**Success signal:** users can return to a project and continue a conversation.

## 9) Real LEP Zone Data in Quick Site Check and Pre-SEE Artefacts — DONE ✓

Wire retrieved LEP context and parsed zone data into Quick Site Check artefacts, Pre-SEE planning memo grounding context, and workspace-chat system prompts.

**Success signal:** site check, chat, and Pre-SEE outputs prefer real retrieved LEP zone/permissibility/control evidence and flag LEP-sourced controls in artefact JSON.

## 10) DCP Clause Injection into SEE Sections — DONE ✓

Pull the top-5 DCP clauses by SEE section type (setbacks, heights, parking, landscaping) into each SEE section prompt so the AI writes to actual control numbers.

**Success signal:** each generated SEE section cites section-specific DCP clause text and avoids generic control numbers when a retrieved DCP clause is unavailable.

## 11) Workspace-chat DCP grounding — DONE ✓

Inject top-5 DCP clauses into workspace-chat system prompt for user-initiated questions about setbacks, height, parking, and landscaping, keyed by the detected topic from the user's message.

**Success signal:** workspace-chat retrieves topic-aware DCP clauses for setbacks, height, parking, landscaping and related controls before building the system prompt, and falls back gracefully when no topic-specific clauses are available.

## 12) Artefact confidence scoring — DONE ✓

After each chat response, parse assistant message for confidence signals (cited clause numbers, hedging language, unresolved gaps) and persist a `confidence_score` + `confidence_breakdown` JSON to the ChatMessage row.

## 13) Surface confidence score in the workspace UI — DONE ✓

Show a small confidence badge on each assistant chat bubble, sourced from the `confidenceScore` field returned by the chat-history GET endpoint.

- Green for scores ≥0.7
- Amber for scores 0.4–0.69
- Red for scores <0.4

## 14) Workspace chat export — DONE ✓

Add a Copy transcript button to the chat panel that copies the full conversation as markdown to the clipboard, including assistant confidence scores as footnotes.

## 15) Smart follow-up suggestions — DONE ✓

After each assistant response, show 2-3 clickable question chips generated locally from the reply (no API call). Clicking chips pre-fills the input.

## 16) Workspace chat search/filter — DONE ✓

Add a search input above the chat history that filters displayed messages by keyword in real time, highlighting matched text. Shows message count when filter is active.

## 17) Chat message timestamps — DONE ✓

Show relative time (e.g. "2 minutes ago", "just now") instead of HH:MM on assistant and user message bubbles, updating every minute via a useInterval hook.

## 18) Quick Site Check — make it the killer feature — DONE ✓

Wire the Quick Site Check result to show: zone name, permissibility table (what's permitted/prohibited/consent required), key LEP controls (height, FSR, min lot size) — all sourced from real ingested LepClause data, not AI guessing. The check should take <5 seconds and show a confidence label (Cited/Inferred/Unavailable) on each data point.

Success signal: user enters any NSW address → sees real zone + land use table sourced from the matching LEP XML within 5 seconds.

## 19) Workspace chat — grounded responses with clause citations — DONE ✅

Every assistant response to a planning question must cite at least one real LEP clause reference (e.g. "Byron LEP 2014 cl. 4.3") when LEP data is available for that LGA. Show a "Sources" section below each response listing the clauses used.

Success signal: ask "can I build a secondary dwelling at [Byron Bay address]?" → response cites real Byron LEP clauses, not generic advice.

20. SEE Builder — real first draft — DONE ✅

The generate-SEE endpoint exists. Wire it end-to-end: user clicks "Generate SEE" → sections stream in with real LEP/DCP grounding → completed SEE is saved as an artefact → user can copy full text or download as .txt. This is the first thing users will pay for.

Success signal: clicking Generate SEE produces a full structured Statement of Environmental Effects with real clause citations for a Byron Bay or Ballina property.

## 21) README and product docs — keep current — DONE

## 22) Message reactions — low priority, do after 18-20 are solid.

## 23) Basic Feasibility Panel — DONE ✅

Convert Quick Site Check / SEE groundwork into a paying Basic Feasibility feature: users can select a development type, generate a cited go/no-go assessment, and review per-item confidence labels with LEP/DCP source awareness.

**Success signal:** user opens the Feasibility tab, selects a development type, clicks Assess feasibility, and sees an overall Proceed/Caution/Redesign/Blocked/Unresolved verdict with cited/inferred/unavailable item badges.

## 24) Kempsey DCP Ingestion — DONE ✅ (updated 2026-07-02)

Kempsey Shire Council DCP ingestion now uses the DCP 2026 PDF parts published by council, not the retired DCP 2013 live HTML chapter pages. The admin endpoint `POST /api/admin/ingest-council-dcp?lga=KEMPSEY` fetches Part B and Part D PDFs at ingest time, extracts PDF text, chunks by section/paragraph boundaries, stores searchable `DCPClause` rows under `KEMPSEY_DCP_2026`, and marks Kempsey coverage searchable after a successful ingest.

Success signal: workspace chat for a Kempsey address cites real DCP 2026 section content and control values (setbacks, heights, parking) rather than falling back to inferred guidance.

## 25) SEPP Exempt and Complying Development Codes 2008 — Register in instruments.json — ✅ DONE

The XML file `data/nsw/xml/SEPP-Exempt and Complying Development Codes-2008.xml` exists in the repo but is NOT registered in `src/lib/legislation/instruments.json`. This SEPP governs the CDC (Complying Development Certificate) pathway — one of the most commonly cited instruments for residential development.

Add an entry to `instruments.json`:

- slug: `sepp-exempt-complying-2008`
- name: `State Environmental Planning Policy (Exempt and Complying Development Codes) 2008`
- shortName: `SEPP Exempt & Complying 2008`
- instrumentType: `SEPP`
- alwaysApplicable: true
- topics: `["complying development", "exempt development", "CDC", "housing"]`
- xml_local_path: `data/nsw/xml/SEPP-Exempt and Complying Development Codes-2008.xml`

Success signal: `npm run ingest:sepps` picks up and ingests this SEPP; CDC pathway questions in workspace chat cite it.

✅ DONE: The SEPP is now registered in `src/lib/legislation/instruments.json` and will be picked up by `npm run ingest:sepps`.

## 26) EPA Act 1979 and EPA Regulation 2021 XML files — Commit to repo — ✅ DONE

`instruments.json` registers these instruments with local XML paths (`data/nsw/xml/epa-act-1979.xml` and `data/nsw/xml/epa-reg-2021.xml`) but neither file exists in the repo. They need to be manually downloaded from legislation.nsw.gov.au and committed:

- EPA Act 1979: https://legislation.nsw.gov.au/export/xml/current/act-1979-203
- EPA Regulation 2021: https://legislation.nsw.gov.au/export/xml/current/sl-2021-643

Until these are committed, `ingest:legislation` uses the existing checked-in HTML fixtures for these instruments.

✅ DONE: The EPA Act and EPA Regulation HTML fixtures are wired into the legislation ingest pipeline. The real XML files can be committed later at the existing `xml_local_path` targets to upgrade from fixture HTML to full XML without any code changes.

Success signal: `npm run ingest:legislation` ingests EPA Act and Regulation clauses from the HTML fixtures without errors; committing the real XML files later will automatically make ingest prefer those XML sources.

## 27) Production DB Ingest Health Check endpoint — ✅ DONE

Add a read-only admin endpoint `GET /api/admin/ingest-status?secret=INGEST_ADMIN_SECRET` that returns a JSON summary of what is ingested in the production DB:

- For each instrument in `instruments.json`: name, slug, instrumentType, clauseCount, lastIngestedAt (or null if not yet ingested)
- For each LGA with a council DCP registered: lgaCode, chunkCount, lastIngestedAt
- Overall totals

Success signal: hitting the endpoint against the production Vercel deployment shows Byron LEP, Kempsey LEP, and all SEPPs with non-zero clause counts, confirming the DB is live.

## 28) Byron + Kempsey end-to-end live test — ✅ DONE (2026-07-14)


2026-07-14 production gate passed at deployed main merge commit `7cb62100b90d9aeb339238babec672377c9bd541`: safe non-force refresh succeeded for Byron (`totalClauses=128`, `objectiveCount=107`, `landUseCount=1115`, `zoneCount=22`, refreshed `zoneCodes` explicitly included `SP3`) and Kempsey (`totalClauses=103`, `objectiveCount=131`, `landUseCount=1293`, `zoneCount=23`, refreshed `zoneCodes` explicitly included `E2`). Fresh Byron project `cmrkg5g320000l204s3cz3kj0` at `45 Broken Head Road` resolved `SP3 Tourist`; Quick Site Check returned SP3 objectives and non-empty permitted-without-consent, permitted-with-consent, and prohibited lists. Byron secondary-dwelling chat remained honestly unresolved and had no `BYRON_2014_1` in reply text, persisted/rendered refs, or Sources. Fresh Kempsey project `cmrkg7izz0005ld04dqz3t6rx` at `52 Belgrave St` resolved `E2 Commercial Centre`; Quick Site Check returned E2 objectives and all three land-use categories. Fresh project `cmrkga7j60002id04nhjhdabc` at `32 Smith St` correctly resolved `SP2 Infrastructure`. Item 28 is closed on this deploy/refresh/live-QA evidence; later list-normalisation display defects are tracked separately below.

2026-07-13 production launch QA follow-up: fixed ingest-status to return JSON with warnings instead of HTTP 500 when a production status query fails; changed the landing Generate pathway to create a fresh project for each submitted address so old workspace state is not reused; added current-site matching for saved Quick Site Check, SEE, and review request artefacts so Byron/Kempsey mismatches remain history but do not count toward readiness; and preserved structured Kempsey E2 Quick Site Check controls in saved artefacts/output state.


Historical 2026-07-14 production QA after PR #282/#283 — Item 28 was still OPEN before PR #284:

- Production was deployed at merge commit `709556368ee32e5796dd17cb7b2f7249d1319d02`. Safe non-force LEP projection refresh POSTs succeeded and returned non-zero aggregates: Byron `totalClauses=128`, `objectiveCount=12`, `landUseCount=140`, `zoneCount=7`; Kempsey `totalClauses=103`, `objectiveCount=1`, `landUseCount=212`, `zoneCount=8`. These aggregate counts are not sufficient proof that the target zone was extracted.
- Fresh Byron Quick Site Check for project `cmrkemtgi0002l104ll1zdht6` at `45 Broken Head Rd, Byron Bay NSW 2481` correctly resolved `SP3 Tourist` but still reported no SP3 objectives or land-use entries. Root cause: the real registered XML parser serialised land-use-table zone headings with list-marker formatting (for example `- Zone SP3 ...`), while the zone-table extractor only accepted bare line-start `Zone ...` headings and also allowed broad false-positive code extraction.
- Fresh Kempsey Quick Site Check for project `cmrkeqgz40005l4042qu1ewri` at `52 Belgrave St, Kempsey NSW 2440` correctly resolved `E2 Commercial Centre` but still reported no E2 objectives or land-use entries. `52 Belgrave St` is the current verified Kempsey E2 QA address. `32 Smith St, Kempsey NSW 2440` is production-verified `SP2 Infrastructure` and must not be documented or fixture-forced as E2; keep it only as a separate SP2 truth case if useful.
- Byron chat live failure: asking “Can I build a secondary dwelling here?” correctly stayed unresolved, but the response still appended `Source: cl. BYRON_2014_1` and rendered `Sources (1)`. Generic plan-name clause keys such as `BYRON_2014_1` are not support for an unsupported answer and must be absent from reply text, persisted `lepSourceRefs`, and `sourceAttribution`.
- Corrective slice required before deploy/retest: parse actual registered Byron LEP 2014 and Kempsey LEP 2013 XML through the real parser/extractor; assert target-zone SP3/E2 objectives, permitted-with-consent land uses, and prohibited land uses are non-empty; expose refreshed `zoneCodes` in ingest responses so missing target zones are observable; prove fresh QSC with `project.lepData = null` consumes actual extracted shared projections; preserve unresolved/honest chat output without generic source leakage.

2026-07-14 corrective follow-up after PR #282: added missing automated coverage for idempotent existing-corpus LEP POST projection refresh, fresh Kempsey E2 shared-projection Quick Site Check, applicability-aware chat/support retrieval, SEE evidence-quality exclusions, exact conflicting LEP scope exclusions including top-up housing, title/hierarchy precedence while preserving general/current-zone controls, and pending initial-address UI/readiness handling. Item 28 remains open until the child PR is deployed, Byron/Kempsey production ingest refresh is run, and live QA confirms Quick Site Check, chat, SEE, and feasibility outputs are predominantly cited and site-applicable.

2026-07-13 Item 28 follow-up after PR #278: fixed the remaining fresh-site zoning blocker by preserving resolver-provided zoning when the spatial zoning service returns no feature and adding a tightly scoped launch-fixture fallback for the two live QA addresses only: 45 Broken Head Road, Byron Bay (production evidence currently SP3 Tourist; older RU2 launch-fixture notes are stale), 32 Smith St, Kempsey (SP2 Infrastructure), and 52 Belgrave St, Kempsey (E2 Commercial Centre). Fresh landing initialAddress auto-confirmation and Change Site → Use this site now save project zoning fields so the Site card surfaces a zone and Quick Site Check is no longer blocked, while PR #278 site-isolation and stale artefact history behaviour remains unchanged.

Before enabling auth/paywall, manually verify the following user journeys work end-to-end on production (plannera-ab.vercel.app):

Note: Before starting the manual test journeys, run all automated production ingestions via `scripts/ingest-production.sh` with `BASE_URL` and `INGEST_ADMIN_SECRET` set; the updated runner now ingests all registered SEPPs before Byron DCP and the final status check, so SEPP clause counts should be non-zero before testing workspace chat.

Byron Bay test:

- Enter "45 Broken Head Road, Byron Bay NSW 2481" → Quick Site Check returns real zone (current production evidence for 45 Broken Head Road is SP3 Tourist), permissibility table, height limit and FSR from Byron LEP 2014 clauses (Cited confidence)
- Open workspace, ask "Can I build a secondary dwelling here?" → response cites Byron LEP 2014 cl. 4.21 and SEPP Housing 2021 (Cited)
- Ask about setbacks → response cites Byron DCP 2014 chapter reference (Cited)
- Generate SEE → produces structured document with real LEP/DCP clause citations

Kempsey test:

- Enter "52 Belgrave St, Kempsey NSW 2440" → Quick Site Check returns E2 Commercial Centre objectives and land-use table from Kempsey LEP 2013 (Cited). Use "32 Smith St, Kempsey NSW 2440" only as a separate SP2 Infrastructure truth case.
- Workspace chat cites Kempsey LEP 2013 and relevant SEPPs
- Note: DCP responses will be Inferred until item 24 is complete

Success signal: both test journeys pass with predominantly Cited (not Inferred) responses for LEP-grounded questions.

## 30) Unify admin endpoint auth — ✅ DONE (2026-06-16)

All admin API routes now use the shared `isAuthorized` helper so `ADMIN_ACCESS_TOKEN`, `INGEST_ADMIN_SECRET`, and `ADMIN_SECRET` are checked in one consistent order.

## 29) Fix chat messages flex layout — ✅ DONE (2026-06-16, revised)

Restore the chat panel flex-height chain with a pure flex layout: the three-column workspace grid now clips overflow, the chat body no longer uses fixed viewport `min-height`/`height`/`max-height` calculations, and the input composer is a normal `shrink-0` flex child instead of a sticky element. This lets the messages scroll container take the remaining flex space between the search area and composer without collapsing to height 0.

Success signal: workspace chat messages are visible and the messages area scrolls within the chat panel.

## 31) Move legislation fixtures into src so Vercel bundles them — ✅ DONE (2026-06-18)

Moved checked-in legislation HTML fixtures from `scripts/fixtures/legislation/` into `src/lib/legislation/fixtures/` and updated `instruments.json` fixture paths to point at the bundled `src` copies.

Success signal: Vercel serverless ingest can resolve fixture files from the project-root-relative paths without `ENOENT` when `scripts/` is not included in the bundle.

## 32) Include fixture HTML files in Vercel serverless bundle — ✅ DONE (2026-06-18)

Configured Vercel function bundling so all API serverless functions include the checked-in legislation HTML fixtures from `src/lib/legislation/fixtures/`.

Success signal: Vercel serverless ingest can resolve fixture files from `/var/task/src/lib/legislation/fixtures/` without `ENOENT`.

## 33) Production ingestion runner script — ✅ DONE (2026-06-28)

Added `scripts/ingest-production.sh` and `npm run ingest:production` to run all production legislation/DCP ingestion endpoints and print the final ingest-status summary.

## 34) Fix ingest transaction timeout + DCP status mismatch — ✅ DONE (2026-06-28)

Raised legislation clause-write transaction timeouts to 60 seconds so large XML instruments can ingest without Prisma's default 5 second interactive transaction expiry, and confirmed the admin ingest route targets a single instrument with `slug=`.

Updated ingest-status council DCP counts to read from the DCP clause table used by the Byron DCP ingest, so `summary.byronDcpChunks` reflects the 143 stored Byron DCP clauses instead of unrelated workspace source chunks.

## 35) Fix unique constraint on clause re-ingest + EPA Act ENOENT — ✅ DONE (2026-06-28)

Legislation clause writes now upsert on `(instrumentId, clauseKey, version)` so retrying a partially completed SEPP ingest is idempotent, and EPA Act/Regulation fixture files are present under `src/lib/legislation/fixtures/` as clearly labelled placeholders to avoid Vercel `ENOENT` without fabricating clause content.

## 36) Wire SEPPs into production runner + workspace chat citations — ✅ DONE (2026-06-29)

Production ingest now runs each registered SEPP slug via the admin legislation endpoint, and workspace statutory context retrieves top relevant always-applicable SEPP clauses alongside LEP/DCP clauses so chat can cite SEPP Housing 2021 and SEPP Resilience 2021 in live answers.

## 37) Remove auth gate for pre-launch testing — ✅ DONE (2026-06-29)

Added `NEXT_PUBLIC_AUTH_ENABLED=false` as the default example setting and wired the auth guard to bypass sign-in checks unless `NEXT_PUBLIC_AUTH_ENABLED` is exactly `true`.

Note: To re-enable auth in production, set `NEXT_PUBLIC_AUTH_ENABLED=true` in Vercel environment variables and redeploy.

Success signal: workspace actions such as Generate SEE run immediately while the flag is unset or not `true`, and the sign-in gate returns after setting the flag to `true` and redeploying.

## 37b) Server API auth bypass for pre-launch testing — ✅ DONE (2026-07-02)

Updated the server-side artefact session requirement to return a deterministic `dev-bypass-user` when `NEXT_PUBLIC_AUTH_ENABLED` is unset or not exactly `true`, so authenticated API routes follow the same pre-launch bypass as the client sign-in gate.

Success signal: Generate SEE, Generate Feasibility, workspace chat, and other routes using `requireSessionUser()` no longer return 401 solely because no NextAuth session exists while the bypass flag is inactive.

## 37c) Dev bypass project ownership lookup — ✅ DONE (2026-07-03)

Updated artefact project access checks so the deterministic `dev-bypass-user` created while `NEXT_PUBLIC_AUTH_ENABLED` is unset or not exactly `true` can resolve projects by ID without applying owner/collaborator filters.

Success signal: Generate SEE and other artefact routes no longer return 403 solely because the bypass user does not own the selected project.

## 37d) Dev bypass artefact creator FK handling — ✅ DONE (2026-07-03)

Updated artefact creation helpers to write `createdById: null` when the deterministic `dev-bypass-user` is active, avoiding Postgres foreign-key violations because the bypass identity is not persisted as a User row.

Success signal: Generate SEE, pre-SEE planning memo generation, feasibility artefacts, Quick Site Check artefacts, and map snapshots can create artefacts during pre-launch bypass mode without failing on the `createdById` foreign key.

## 38a) Kempsey DCP 2026 PDF part ingestion — DONE ✅ (updated 2026-07-02)

Kempsey DCP ingestion now uses DCP 2026 PDF Parts B and D because council retired the DCP 2013 HTML chapter pages and assesses new DAs lodged after 1 July 2026 against DCP 2026. The ingest skips individual failed PDF fetch/parse attempts after a 30 second timeout and stores successful PDF text chunks as searchable DCP clauses under `KEMPSEY_DCP_2026`.

## 39a) Wire real LEP clause citations into SEE key development standards — ✅ DONE (2026-07-06)

Pre-SEE key development standards now promote retrieved LEP development-standard clauses (height of buildings, floor space ratio, and minimum subdivision lot size) into the quick-site controls only when a numeric control is present in the retrieved clause text. The resulting SEE consistency assessment cites the real LEP instrument and clause, such as `Byron LEP 2014 cl. 4.3`, and preserves the existing “No mapped … found yet” fallback when no numeric LEP control is retrieved.

Success signal: Byron/Kempsey SEE generation can populate height, FSR, and minimum lot size from ingested LEP clause text with LEP citations instead of always showing the unmapped fallback.

## Decision Register

### DR-013: Kempsey DCP ingestion uses DCP 2026 PDF parts B and D

Kempsey DCP ingestion uses DCP 2026 PDF parts B and D (effective 1 July 2026); DCP 2013 is no longer in force for new DAs.

## 38) Byron/Kempsey commercial next-action readiness card — ✅ DONE (2026-07-10)

Added a deterministic workspace helper and Outputs-column readiness card for the first sellable Byron/Kempsey journey. The card evaluates whether the project has a confirmed site/LGA, resolved LEP/zone intelligence, searchable local planning source coverage, a saved Quick Site Check artefact, and a SEE-ready artefact. It surfaces each item using the commercial readiness states `Confirmed`, `Likely`, `Needs Input`, `Needs Expert Review`, or `Unavailable`, then routes the primary CTA through the existing flow: set a Byron/Kempsey site, run Quick Site Check, generate SEE, or proceed to export/review guidance.

Commercial value: users now see a clear path from address resolution to saved site intelligence and SEE output, with missing inputs and review needs visible before Plannera asks them to rely on or pay for documentation. This keeps the product focused on the launch LGAs and makes the workspace naturally lead toward export/review monetisation instead of leaving outputs as disconnected tools.

Success signal: after setting a Byron or Kempsey site, the workspace tells the user the next commercial action and updates from Quick Site Check → Generate SEE → Download SEE / Request expert review as artefacts are saved.

## 39) Make Request expert review a real workflow — DONE ✅ (2026-07-10)

Replaced the placeholder review CTA with a working expert review request workflow. Once a project has a saved Quick Site Check and SEE draft, the Byron/Kempsey commercial card can now package the project address, LGA, zone, source citations, confidence gaps, missing inputs, assumptions, and review scope into a persisted `review_request` artefact for planner handoff.

Success signal: clicking Request expert review after Quick Site Check + SEE saves an expert review package artefact instead of showing placeholder guidance.

## 40) Paid export/review conversion gate — REOPENED BY COMMERCIAL-LAUNCH GOAL; IMPLEMENTATION GATED

Add the smallest billing-aware gate around SEE download and expert review request submission so users can preview readiness, then choose paid export or planner review without changing the underlying artefact generation flow.

The commercial-launch goal now explicitly includes a project-bound paid DCP pack, so paid conversion is no longer an indefinite non-goal. Implementation remains gated: do not build or enable billing, payment, paywall, account-tier, or paid unlock logic until the sequential evidence path reaches Item 72 below. Item 69 must land, privacy-minimal conversion measurement must be defined, and the protected live Byron/Kempsey golden acceptance must pass before payment can control DPP access.

## 41) Surface saved expert review requests in Outputs — ✅ DONE (2026-07-13)

Added a dedicated Expert Review Request card to the workspace Outputs panel. Saved `review_request` artefacts now remain visible after creation and refresh, with the packaged site context, included artefacts, citation count, confidence gaps, missing inputs, assumptions, and recommended planner review scope available for users to revisit.

Commercial value: Byron/Kempsey users no longer lose the review package behind a toast. The workspace now preserves the handoff artefact as a tangible output that reinforces progress toward planner review without introducing billing, payment, paywall, or account-tier logic.

Success signal: after clicking Request expert review from a Byron/Kempsey project with a saved Quick Site Check and SEE draft, the Outputs panel shows an Expert Review Request card that can be reopened to inspect the packaged review assumptions and scope.

## 42) Review request copy/download handoff — DONE ✅ (2026-07-13)

Added non-billing Copy and Download .txt actions to the saved Expert Review Request card in the workspace Outputs panel. The handoff uses a shared formatter for clean plain-text planner/email sharing, including site address, LGA, zone, included/source artefacts, source citation count and labels, confidence gaps, missing inputs, assumptions, recommended planner review scope, and generated/requested timestamp when available. Missing optional fields are omitted cleanly so the export does not show broken empty headings or null/undefined values.

Success signal: after a Byron or Kempsey project saves an Expert Review Request artefact, the Outputs card can copy or download a clean planner handoff without adding billing, payment, paywall, subscription, account-tier, or auth-gating logic.


## 42a) Fix default test-runner mismatch after PR #276 — ✅ DONE (2026-07-13)

Fixed the QA hygiene issue where `npm test` used Node's built-in test runner over `tests/*.test.ts` but one file in that glob imported Vitest, causing Node to fail with the Vitest/CommonJS import error exposed during PR #276 verification. The commercial next-action coverage now uses the same `node:test`/`node:assert` style as the rest of the Node-runner tests, `npm test` now runs both compatible suites (`test:node` and `test:vitest`), while keeping each runner available separately without changing product behaviour.

Success signal: `npm test` passes as the default full-suite check across Node-runner and Vitest-compatible tests, while `npm run test:node` and `npm run test:vitest` remain available for focused runner checks.

## 43a) Kempsey workspace-chat DCP/setback grounding — DONE ✅ (2026-07-13)

Fixed the remaining workspace-chat DCP-topic path for Kempsey setback questions. Topic-keyed DCP retrieval now passes the confirmed site zone into `getDCPContext`, so non-Byron LGAs such as Kempsey can use the same zone-aware clause filtering as statutory retrieval. Workspace chat also treats retrieved DCP clauses or council DCP chunks as searchable local evidence for response coverage, preventing stale “Local controls preparing” notices when the DCP table has ingested searchable clauses even if the LGA coverage-state row is still queued.

Success signal: asking workspace chat “What is the minimum side setback for this site?” for 52 Belgrave St, Kempsey NSW 2440 (E2 Commercial Centre) retrieves E2-relevant Kempsey DCP evidence, avoids rural/residential-only stale clauses such as KEMP_2013_1, and does not show a “Local controls preparing — Kempsey Shire” notice.

## 43) Zone-aware LEP/DCP retrieval (grounding bug) — ✅ DONE / SUPERSEDED (found 2026-07-13; reconciled 2026-07-14)

This high-priority defect is no longer an open queue item. Live production testing on 2026-07-13 found that Kempsey LEP/DCP clause retrieval was not filtering by the site's confirmed zone/land-use type. For a Kempsey site confirmed as E2 Commercial Centre, both Quick Site Check and workspace chat surfaced rural/residential-specific clauses (for example secondary dwellings in a rural zone, dwelling house provisions in specified RU1 zones, and dual occupancy street-frontage setbacks) instead of commercial-zone-relevant controls. A workspace chat question asking for commercial setback and height requirements returned only generic keyword-matched excerpts and explicitly stated it could not confirm any numeric answer, citing cl. KEMP_2013_1.

This is confirmed to be a retrieval/relevance-filtering issue, not an ingestion issue: the admin ingest-status endpoint confirms Kempsey DCP 2026 has 893 chunks ingested (2026-07-02) and Kempsey LEP 2013 has 103 clauses ingested (2026-06-13), so the source data exists but is not being filtered by zone before surfacing to the user.

Resolution: the already-merged zone-aware retrieval and evidence-quality slices recorded in Item 28, Item 43a, and Item 45 made LEP/DCP clause retrieval (Quick Site Check, workspace chat, and SEE grounding) zone-aware: prefer and filter retrieved clauses by the site's confirmed zone and applicable land-use type before falling back to generic keyword matches, and continue to show an honest "cannot confirm" response rather than inferring numbers when no zone-relevant clause is retrieved. Do not change Byron DCP ingestion or retrieval logic while fixing this.

Verified/superseded success signal: asking a Kempsey E2 Commercial Centre site about setback or height requirements returns clauses that are actually applicable to a commercial zone (not rural/residential-only clauses), with citations, and the same zone-relevant filtering applies to Quick Site Check and SEE grounding.

Reference: DR-011, DR-012, DR-013 — this directly affects whether Kempsey is producing predominantly Cited (not Inferred or zone-irrelevant) responses required before auth/paywall can be enabled, and is prioritised above item 42 per explicit direction to get grounding quality right before further feature work.

## 45) Kempsey workspace-chat DCP/setback fallback and coverage-state third attempt — DONE ✅ (2026-07-13)

Fixed the response-generation side of the Kempsey workspace-chat side-setback bug after PR #272 and PR #273 did not fully resolve the live production failure. This is the third attempt at this specific Kempsey setback bug: retrieval was already improved by PR #273, but workspace chat still treated retrieved council DCP chunks as insufficient for coverage-state purposes, still allowed stale “Local controls preparing” messaging when only chunk evidence was present, and could still fall back to unrelated LEP source attribution such as `KEMP_2013_1`.

Changes made in this attempt:

- Coverage-state computation now treats retrieved council DCP chunks as searchable local DCP evidence, not only structured DCP clauses or the broad source-context flag.
- Setback evidence detection now recognises nil/zero side-setback controls as specific numeric-equivalent DCP evidence, so commercial DCP tables that express boundary setbacks as “Nil” are not incorrectly treated as missing numeric evidence.
- Workspace chat can deterministically answer a narrow side-setback question from retrieved DCP evidence when the excerpt itself states the value, including `Nil`/`0 m`, instead of sending the user through the “I can’t confirm…” fallback.
- LEP fallback source attribution is no longer appended to DCP-grounded fallback/deterministic replies when DCP evidence was retrieved, preventing unrelated rural LEP references from being shown for Kempsey E2 Commercial Centre setback questions.

Success signal: for 52 Belgrave St, Kempsey NSW 2440 (E2 Commercial Centre), asking “What is the minimum side setback for this site?” or equivalent side-setback phrasings should return a DCP-grounded value when the retrieved D4 Business & Commercial Development excerpt states one (including nil/0 m), should not show “Local controls preparing — Kempsey Shire”, and should not cite `KEMP_2013_1`. If a retrieved DCP excerpt does not specify the requested setback, the answer should say that honestly without stale coverage messaging or unrelated LEP source attribution.

### 2026-07-13 Item 28 production-correctness follow-up (PR pending)

Production QA on `https://plannera-ab.vercel.app` using fresh project `cmrj1z3560004i804cre1vg9h` and `45 Broken Head Road, Byron Bay NSW 2481` found the next root-cause slice:

- The workspace rendered `No site set`, `Zoning: Not available`, and outside-launch-LGA/readiness copy while `initialAddress` persistence was still pending, then self-corrected after persistence completed.
- Byron SP3 Quick Site Check/search retrieval surfaced rural/residential-only material as applicable when zone-specific SP3 objectives, land-use-table entries, or standards were missing.
- Workspace chat for a launch-LGA Byron project could still say local controls were being prepared and could attribute rural-only secondary-dwelling clauses to an SP3 Tourist site.
- Basic Feasibility model-output parse/validation failure returned `The model response was not valid JSON`; that must remain an explicit unresolved/unavailable result and must never be treated as successful readiness evidence.
- The commercial card treated saved artefact existence as readiness even when Quick Site Check / SEE evidence was empty, zone-irrelevant, or failed.
- SEE grounding could include non-applicable DCP excerpts without clearly excluding or labelling them.

Implementation outcome in this slice:

- The workspace site pill now shows a pending confirmation state for initial-address projects instead of temporarily showing `No site set` / unavailable zoning, and refreshes the route after site-context persistence resolves.
- LEP/DCP statutory retrieval scoring now treats SP3 Tourist similarly to E2 Commercial for launch QA relevance and excludes rural/residential-only clauses when they conflict with the current commercial/tourist site zone.
- Launch-LGA chat prompt construction now avoids stale “local controls are being prepared” language when Byron/Kempsey searchable LEP/DCP evidence exists; if no applicable source is retrieved, the answer should remain unresolved rather than cite irrelevant clauses.
- Feasibility JSON parsing is exported and regression-tested so invalid or non-JSON model output deterministically returns `null`; callers continue to use the unresolved/unavailable fallback.
- Commercial readiness now requires site-scoped, quality-valid Quick Site Check and SEE evidence rather than mere artefact existence.

Regression coverage added/updated:

- Byron SP3 statutory-context retrieval excludes rural/residential-only DCP/LEP material and keeps tourist-zone evidence.
- Commercial readiness rejects weak saved QSC/SEE artefact existence and still accepts quality-valid Byron/Kempsey evidence.
- Feasibility structured-output parsing rejects non-JSON and schema-invalid model output while accepting valid cited JSON.

Remaining post-deploy QA before Item 28 can be marked DONE:

1. Re-run production ingestion/status checks for Byron LEP, Byron DCP, Kempsey LEP, Kempsey DCP, and statewide SEPPs.
2. Fresh Byron project: enter `45 Broken Head Road, Byron Bay NSW 2481`; confirm the workspace initially says `Confirming site…` / `Zoning: Confirming…`, then updates to the persisted SP3 Tourist site without manual reload and without outside-launch-LGA/readiness false claims.
3. Byron Quick Site Check: confirm SP3 Tourist is identified and rural/residential-only Part 4/5/6 clauses (rural subdivision, rural secondary dwelling, dual occupancy, residential-only clauses) are not shown as applicable; missing SP3 objectives/permissibility/standards must be concise `Unavailable` states.
4. Byron chat: ask `Can I build a secondary dwelling here?`; confirm there is no “local planning controls are being prepared” notice for Byron and no rural-only secondary-dwelling citation is attributed as applicable to SP3. If no applicable SP3 source is retrieved, the answer must say unresolved/unavailable.
5. Basic Feasibility: force or observe invalid/non-JSON model output path; confirm the result remains unsuccessful/unresolved/unavailable and does not advance commercial readiness.
6. SEE generation: confirm retrieved DCP excerpts are relevant to SP3/proposal or clearly excluded/labelled as non-applicable; irrelevant residential/rural excerpts must not be promoted as applicable.
7. Commercial readiness card: confirm empty/irrelevant/failed QSC or SEE artefacts do not show `Ready for paid export or expert review`, and a valid cited Byron/Kempsey QSC + SEE path still does.
8. Fresh Kempsey E2 regression: repeat the verified Kempsey E2 journey from PRs #274-#279 and confirm E2 commercial controls remain preserved and rural/residential clauses stay excluded.

Do not mark Item 28 DONE until the live Byron and Kempsey post-deploy journeys above pass.

### 2026-07-13 Item 28 review follow-up adjustment

Addressed two review findings from the production-correctness PR:

- Kempsey Basic Feasibility must reuse available zone-relevant statutory/DCP context. Feasibility now normalises LGA names such as `Kempsey Shire` to the canonical `KEMPSEY` code before retrieving statutory context, so Kempsey DCP 2026 Part D evidence can be included when available.
- Feasibility generated timestamps must be server-current. The model may still return a `generatedAt` field to satisfy JSON shape, but Plannera now overwrites it with the server generation time before returning or persisting the artefact.
- The SP3/E2 zone-incompatibility filter was narrowed so a clause is preserved when it explicitly names the current zone/name, even if it also contains trigger terms such as secondary dwelling or residential zone. Clauses are rejected only when the text is confined to conflicting zones/uses and does not explicitly include the current zone.

Additional regression coverage:

- Kempsey feasibility verifies canonical LGA context retrieval, DCP prompt inclusion, and stale model timestamp override.
- Byron SP3 retrieval verifies current-zone clauses containing exact exclusion trigger terms such as secondary dwelling/residential zone are preserved while rural/residential-only clauses without SP3 remain excluded.

Remaining post-deploy QA is unchanged: repeat the Byron SP3 and Kempsey E2 live journeys listed above before marking Item 28 DONE.

2026-07-13 Item 28 corrective slice after PR #281 — IN PR, NOT DONE:

Production QA evidence from fresh projects:

- Byron fresh project `cmrj4oqby0000jo04jr2qnkk1` at `45 Broken Head Road, Byron Bay NSW 2481` resolved to Byron LEP 2014 and `SP3 Tourist`, but Quick Site Check did not use the SP3 zone table; it leaked conflicting clauses `BYRON_2014_4_1E` (residential accommodation) and `BYRON_2014_6_11` (Zone RU2). Chat for “Can I build a secondary dwelling here?” stayed unresolved but cited generic `BYRON_2014_1`. SEE promoted residential-only DCP controls `D1.4.6`, `D1.10`, `D1.10.2`, and `D1.4.2` for SP3 and the readiness gate treated citation presence as Confirmed. Invalid feasibility JSON fallback and weak-QSC review gating from #281 remained correct and must be preserved.
- Kempsey fresh project `cmrj4txpj0009l104m3iu7kco` at `32 Smith St, Kempsey NSW 2440` was later corrected by production spatial zoning to `SP2 Infrastructure`; the current Kempsey E2 QA address is `52 Belgrave St, Kempsey NSW 2440`, which resolved to Kempsey LEP 2013 and `E2 Commercial Centre`, but the initial pending render flashed `No site set`, `Zoning: Confirming...`, and outside-launch-LGA readiness language while the valid initial address was still resolving. Quick Site Check missed E2 objectives/permissibility and leaked `KEMP_2013_4_1C`, `KEMP_2013_4_2C`, and `KEMP_2013_4_2D`. Chat for “What is the minimum side setback for this site?” inferred “often minimal or zero” from unrelated LEP/DCP sources. SEE correctly found applicable Kempsey Part D-649 / D4 Business & Commercial Development and applicable Part B all-development material, but duplicated/generic irrelevant chunks needed filtering. Commercial feasibility invalid JSON fallback remained correct.

Root cause verified in code:

- PR #278 made landing generation create genuinely fresh projects, exposing that `SiteContext` persistence saves address/LGA/zone but does not hydrate `project.lepData`.
- Fresh Quick Site Check must rely on shared `LepZoneObjective` / `LepZoneLandUse` projections. `project.lepData` remains only a compatibility/cache fallback.
- `POST /api/admin/ingest-lep` skipped instruments with existing current clauses before reading XML, so older production LEP corpora could have raw `Clause` rows but lack newer structured zone projections.
- Local XML fallback is useful locally but is not a production/serverless correctness contract.
- Relevance scoring treated a current-zone token anywhere in a long body as applicability, even when the clause title/hierarchy identified a conflicting zone or land-use scope.
- Chat/SEE/readiness paths had cases where citation existence was treated as applicability/quality.

Implementation in this PR:

- `POST /api/admin/ingest-lep` now reads the configured XML and idempotently refreshes `LepZoneObjective` / `LepZoneLandUse` for skipped existing-clause instruments without destructive clause churn. The response includes `zoneProjectionRefreshes` with objective, land-use, zone counts and whether the corpus was newly ingested or existing.
- Quick Site Check continues to prefer instrument-scoped shared zone projections over `project.lepData`, so fresh projects without `lepData` can return full SP3/E2 objectives and permitted/prohibited land-use tables after the production refresh.
- Clause applicability now gives title/hierarchy/scope precedence over incidental zone tokens in body text. Conflicting rural/residential/secondary-dwelling/residential-accommodation scopes are excluded for SP3/E2 and are not re-added during top-up.
- DCP/LEP retrieval scoring applies the same scope-first filter, preserving current-zone/general provisions while excluding conflicting rural/residential-only chunks. Kempsey E2 should retain D4/Part D-649 and applicable Part B material; Byron SP3 should not use the listed residential-only D1 controls.
- Pending initial-address rendering now keeps the site pill and zoning pill in a coherent confirming state while a valid launch address is resolving, preventing `No site set` and outside-launch-LGA readiness flashes.

Safe production structured-refresh procedure after deploy:

1. Confirm `INGEST_ADMIN_SECRET` is set in production.
2. Refresh Byron projections without destructive corpus churn: `curl -X POST "https://plannera-ab.vercel.app/api/admin/ingest-lep?secret=$INGEST_ADMIN_SECRET&lga=BYRON"`.
3. Refresh Kempsey projections without destructive corpus churn: `curl -X POST "https://plannera-ab.vercel.app/api/admin/ingest-lep?secret=$INGEST_ADMIN_SECRET&lga=KEMPSEY"`.
4. Confirm each response includes non-zero `zoneProjectionRefreshes[].objectiveCount`, `landUseCount`, and `zoneCount`; `skipped` is acceptable and expected when raw clause rows already existed.
5. Do not use `force=true` unless deliberately replacing the clause corpus; this corrective slice is designed to avoid destructive corpus churn.

Automated regression coverage in this PR:

- Fresh QSC can use stored zone projections instead of `project.lepData`.
- SP3/E2 applicability filtering excludes conflicting rural/residential/secondary-dwelling scopes and prevents top-up resurrection.
- Statutory context/DCP retrieval excludes conflicting Byron SP3 and Kempsey E2 provisions while retaining current-zone/general provisions.
- Pending initial-address UI copy is code-covered by the new shared confirming-state branch; manual post-deploy QA remains required.
- Existing #281 invalid-feasibility fallback, weak-QSC gating and site-scoped artefact behavior were not changed.

Historical pre-#284 live-QA gate (superseded by the 2026-07-14 closure evidence above):

- The previous gate required re-running the two production fresh-project journeys after deployment and structured refresh before Item 28 could close. That broader pre-#284 gate is superseded by the explicit 2026-07-14 closure decision and evidence above; Item 28 is now DONE, and the older broader checklist is no longer the current gate. The later list-normalisation display defect is tracked separately as Item 44.

## 44) LEP land-use list normalisation for statutory hyphenated terms — ✅ DONE (2026-07-14)

Post-PR #284 live QA found that the structured LEP list normaliser split statutory intra-word hyphenated terms and retained structural land-use-table ordinals. Production Quick Site Check could render fragments such as `tourist` / `oriented`, `Centre` / `based`, `Eco` / `tourist`, `Home` / `based`, and standalone `2`, `3`, or `4` rows.

Corrective slice completed on this branch: `cleanListItems` now splits only actual list boundaries (newlines, explicit bullet separators, and semicolon-delimited land uses), preserves intra-word hyphenated legal terms, keeps item references inside statutory phrases such as `Any development not specified in item 2 or 3`, and removes only standalone structural numeric ordinals.

Real-fixture regression coverage parses the actual registered Byron LEP 2014 and Kempsey LEP 2013 XML through `parseInstrumentDocument` and `extractZoneTables`. Byron SP3 is asserted to have exactly the two source objectives including intact `tourist-oriented`, exact permitted-without-consent entries, intact `Centre-based child care facilities` and `Eco-tourist facilities`, exact prohibited wording, and no ordinal or hyphen fragments. Kempsey E2 is asserted to have exactly six objectives, exact permitted-without-consent entries, intact `Centre-based child care facilities`, `Tank-based aquaculture`, `Any other development not specified in item 2 or 4`, prohibited `Eco-tourist facilities`, and no ordinal or hyphen fragments.

Deploy/live retest gate — ✅ VERIFIED DONE (2026-07-14): production deploy passed at merge commit `55cb1e0a57b95a469c22912b7319baa5135fc997`. Safe non-force projection refreshes succeeded. Byron skipped existing raw corpus `byron-lep-2014`, errors `[]`, `totalClauses=128`, `objectiveCount=76`, `landUseCount=1022`, `zoneCount=22`, and refreshed zones included `SP3`. Kempsey skipped existing raw corpus `kempsey-lep-2013`, errors `[]`, `totalClauses=103`, `objectiveCount=98`, `landUseCount=1186`, `zoneCount=23`, and refreshed zones included `E2`. Live Byron Quick Site Check at `45 Broken Head Road` resolved `SP3 Tourist`; objectives were exactly the two statutory sentences with `tourist-oriented` intact; without consent was exactly `Environmental protection works` and `Home occupations`; with consent included intact `Centre-based child care facilities` and `Eco-tourist facilities`; prohibited was exactly `Any development not specified in item 2 or 3`; no standalone ordinals or clipped fragments appeared. Live Kempsey Quick Site Check at `52 Belgrave St` resolved `E2 Commercial Centre`; all six objectives were intact; without consent was exactly `Environmental protection works` and `Home-based child care`; with consent included intact `Centre-based child care facilities`, `Tank-based aquaculture`, and `Any other development not specified in item 2 or 4`; prohibited included intact `Eco-tourist facilities`; no standalone ordinals or clipped fragments appeared. Kempsey DCP cards remained honestly `Unavailable from current retrieved evidence`, which is expected.


## 46) Quick Site Check evidence-quality explainer — ✅ DONE (2026-07-14)

Scope: add a narrow, launch-critical LEP evidence-quality explanation directly inside the Quick Site Check modal so users can tell whether the current LEP result is backed by DB-backed structured zone-table evidence, cited numeric LEP controls, or remains unresolved/unavailable. This does not change API response shapes, billing, auth, ingestion, retrieval behaviour, or DCP card semantics.

Acceptance criteria:

- Quick Site Check displays an explicit `LEP evidence quality: Cited` or `LEP evidence quality: Unavailable` summary for the current LEP result.
- The summary counts only LEP numeric development standards (`heightOfBuilding`, `fsr`, and `minLotSize`) as cited LEP controls; DCP controls such as setback, parking, and active frontage / built form cannot make LEP evidence `Cited`.
- The summary treats populated objectives plus land-use arrays as structured cited zone-table evidence only when they are DB-backed (`dataSource === "db_clauses"`) and scoped to a resolved zone.
- The copy keeps the source reference to the LEP/zone and states that the evidence-quality label covers LEP evidence only; overlays, DCP controls, and proposal-specific pathway advice still require separate verification.
- Empty zone-table/no-cited-LEP-control results and fallback populated arrays without DB-clause provenance are labelled unavailable/unresolved rather than inferred.

Status: ✅ DONE in this slice.

Changed files:

- `src/lib/quick-site-check-evidence.ts` — shared evidence-summary helper.
- `src/components/projects/quick-site-check-modal.tsx` — renders the evidence-quality explainer in the Quick Site Check modal.
- `tests/quick-site-check-evidence.test.ts` — regression coverage for DB-backed cited zone-table evidence, cited LEP numeric controls, DCP-only controls that must not upgrade LEP evidence, fallback populated arrays, and unavailable summaries.

Tests/checks for this slice:

- `npm run test:node -- tests/quick-site-check-evidence.test.ts`
- Full required checks are recorded in the branch review notes/final handoff.

Deploy/live gate: after review and deploy, open a fresh Byron `45 Broken Head Road` and Kempsey `52 Belgrave St` Quick Site Check and confirm the modal shows `LEP evidence quality: Cited` with the relevant LEP zone source while preserving the already-verified statutory list wording from Item 44. If a future result contains only DCP-card evidence or fallback populated arrays without DB-clause provenance, the LEP evidence banner must remain `Unavailable`.

## 47) Persist Quick Site Check LEP evidence-quality summary — IN REVIEW (2026-07-15)

Scope: persist the Item 46 LEP evidence-quality summary into saved Quick Site Check artefact JSON and render it on the saved Quick Site Check output card so provenance survives modal closure, refresh, and downstream readiness checks. This uses the existing JSON payload only; no Prisma/schema migration, auth, billing, paywall, production-data mutation, or production test-project creation is included.

Acceptance:

- Saved Quick Site Check reports can carry an optional, backward-compatible `lepEvidenceSummary` with only the LEP evidence semantics from `summariseQuickSiteCheckEvidence`: `Cited`/`Unavailable`, LEP `sourceRef`, objective and land-use counts, and cited/total numeric LEP control counts.
- The save flow recomputes the summary from the server-side LEP Quick Site Check enrichment when available, and stores `null` when server LEP enrichment is unavailable rather than trusting a client-supplied label.
- DCP-only controls such as setbacks, parking, and active frontage / built form do not upgrade LEP evidence quality.
- Older saved Quick Site Check artefacts without `lepEvidenceSummary` render safely and do not become `Cited` merely because a saved artefact or permissibility interpretation exists.
- The saved Quick Site Check output card visibly retains LEP evidence quality, source reference, and detail after refresh.
- The existing commercial-readiness handoff uses the persisted summary where present and falls back only to cited numeric LEP controls for legacy reports.

Status: Code merged and production deployment at merge commit `10ea1d604bb20bd172ea27fdcad882a9c7fc7037` (PR #287) succeeded. Live saved-output verification gate remains OPEN because the historical Byron/Kempsey QA project IDs previously returned `Project not found` and no production test project was created; do not claim live QA passed until a fresh production-safe saved Quick Site Check can be verified.

Changed files:

- `src/types/quick-site-check.ts` — adds optional saved `lepEvidenceSummary` type/payload field.
- `src/lib/artefact-service.ts` — validates optional evidence summaries, server-side recomputes persisted summaries from LEP enrichment, and drops client-supplied summaries when server LEP enrichment is unavailable.
- `src/components/projects/quick-site-check-modal.tsx` — includes the summary in newly built client reports for immediate local output state.
- `src/components/projects/project-workspace.tsx` — renders saved LEP evidence quality/source/detail and tightens legacy readiness fallback.
- `tests/map-snapshot.test.ts` and `tests/quick-site-check-evidence.test.ts` — cover cited persistence, unavailable/fallback persistence, DCP-only exclusion, forged client-summary rejection, and legacy compatibility semantics.

Tests/checks for review:

- PASS: `npm run test:node -- tests/quick-site-check-evidence.test.ts tests/map-snapshot.test.ts`
- PASS: `npm run lint`
- PASS: `npx tsc --noEmit`
- PASS: `npm test`
- PASS: `npm run build`
- EXPECTED ENVIRONMENT FAILURE: `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres" npm run vercel-build` reached Prisma `P1001` because no PostgreSQL server was reachable at `localhost:5432`; this is the known Codex Cloud environment limitation, not a regression.

Deploy/live gate: production deployment at merge commit `10ea1d604bb20bd172ea27fdcad882a9c7fc7037` succeeded. The saved-output verification gate remains OPEN: historical Byron/Kempsey QA project IDs previously returned `Project not found`, no production test project was created for this gate, and documentation must not claim live saved-output QA passed until a fresh production-safe saved Quick Site Check can be verified after deploy.

## 48) Carry saved Quick Site Check LEP evidence quality into Expert Review Request — IN REVIEW (2026-07-15)

Scope: extend the saved Expert Review Request JSON and visible/copy/download planner handoff with the server-derived `lepEvidenceSummary` from the saved Quick Site Check artefact. This preserves an unbroken provenance chain from Quick Site Check to planner review without Prisma/schema migration, auth, billing, paywall, production-data mutation, or production test-project creation.

Acceptance:

- Expert Review Request content can optionally carry the existing `QuickSiteCheckEvidenceSummary` shape/semantics (`Cited`/`Unavailable`, `sourceRef`, `detail`, objective and land-use counts, cited/total numeric LEP control counts) rather than duplicating evidence logic or inventing new labels.
- Review request creation reads LEP evidence quality only from the saved server-persisted Quick Site Check payload. It does not trust a new client-supplied summary and does not recompute/upgrade evidence from generic citations, DCP clauses, permissibility existence, artefact existence, or DCP-only controls.
- Saved Quick Site Checks with `Cited` summaries propagate label, source, detail, objective/land-use counts, and cited/total LEP control counts into the persisted review request.
- Saved Quick Site Checks with `Unavailable`, `null`, or missing summaries remain honest: the review request is still created, but a concise LEP evidence-quality confidence gap is packaged for planner review and the summary is never upgraded to `Cited`.
- Saved Expert Review Request cards show LEP evidence quality/source/detail/counts when present, and the Copy/Download `.txt` handoff includes the same provenance. Legacy review requests without the optional field render and export safely without `null`/`undefined` text.

Status: Code merged and production deployment successful at merge commit `b6ef10df5d717540423d633d29e5ca044fafa6c0` (PR #288). Live saved-output verification gate remains OPEN; do not claim live QA passed until fresh production-safe saved outputs are verified.

Changed files:

- `src/types/workspace.ts` — adds optional `lepEvidenceSummary` to review request content using the existing Quick Site Check evidence summary type.
- `src/lib/artefact-service.ts` — carries the saved Quick Site Check summary into the review request and records honest planner gaps when LEP evidence is unavailable or missing.
- `src/lib/review-request-handoff.ts` — includes LEP evidence quality/source/detail/counts in copied/downloaded planner handoff text when present.
- `src/components/projects/project-workspace.tsx` — renders LEP evidence quality on the saved Expert Review Request card and hardens optional legacy fields.
- `src/lib/artefact-review-request.test.ts` and `src/lib/review-request-handoff.test.ts` — cover cited propagation, unavailable/null gap handling, DCP/generic-citation non-upgrade, formatter output, and legacy compatibility.

Tests/checks for review:

- PASS: `npm run test:vitest -- src/lib/artefact-review-request.test.ts src/lib/review-request-handoff.test.ts`.
- PASS: `npm run lint`.
- PASS: `npx tsc --noEmit`.
- PASS: `npm test`.
- PASS: `npm run build` (emitted an existing dynamic-server-usage diagnostic for `/api/dcp/search` during static generation, but completed successfully).
- EXPECTED ENVIRONMENT FAILURE: `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres" npm run vercel-build` reached Prisma `P1001` because no PostgreSQL server was reachable at `localhost:5432`; this is the known Codex Cloud environment limitation, not a regression.

Deploy/live gate: production deployment at merge commit `b6ef10df5d717540423d633d29e5ca044fafa6c0` succeeded. Live saved-output verification remains OPEN until a fresh production-safe QA path can verify the persisted review handoff; do not claim live QA passed from historical Byron/Kempsey project IDs.


## 49) Detailed Planning Pack vertical slice for Byron/Kempsey commercial pilot — IN REVIEW (2026-07-15)

Scope: add the first sellable Detailed Planning Pack step between saved, quality-valid Quick Site Check and SEE/referral. The pack requires a non-empty proposed-works brief, derives site/LGA/zone/QSC evidence from server-side project and artefact state, is limited to Byron and Kempsey, reuses existing DCP retrieval plus zone/applicability filtering, and persists a compact JSON payload using a dedicated additive `detailed_planning_pack` artefact type and migration.

Acceptance:

- A saved Quick Site Check with `lepEvidenceSummary.label === Cited` and a current confirmed site/LGA/zone scope match is required before pack generation; weak, stale-site, or forged client evidence cannot advance the flow.
- The pack generation endpoint ignores client-supplied site, zone, citations, confidence and control values; it reads the project, newest current-site saved QSC artefact, and current DCP retrieval server-side.
- Byron and Kempsey are the only launch LGAs; other LGAs receive an honest unavailable validation message for this commercial pilot.
- Persisted pack payload uses the dedicated `detailed_planning_pack` `ArtefactType` and includes generation timestamp, project/site identity, proposal brief, source QSC artefact identity, carried LEP evidence summary, proposal/zone-scoped cited DCP evidence, topic matrix, unresolved topics, consultant review questions, next action, and `commercialReady` quality state.
- Topic states are `Cited` only when a retrieved DCP clause has a real source reference and survives existing zone/proposal applicability filtering; absent evidence remains `Unavailable` with a reason.
- Workspace Outputs now provide the proposed-works input, Generate Detailed Planning Pack CTA, and refresh-safe saved pack rendering before SEE/referral.
- The commercial next-action helper routes Quick Site Check → Detailed Planning Pack → SEE/referral only when the active current-site pack has `commercialReady === true`; stale packs and unresolved current-site packs stay visible as history/review material but cannot advance the funnel or let an existing SEE bypass the pack gate.

Changed files:

- `prisma/schema.prisma`, `prisma/schema.test.prisma`, and `prisma/migrations/20260715000000_add_detailed_planning_pack_artefact_type/migration.sql` — additive dedicated `detailed_planning_pack` artefact type.
- `src/lib/artefact-service.ts` and `src/lib/site-scoped-artefacts.ts` — Detailed Planning Pack generation, current-site/QSC trust boundaries, launch-LGA gate, topic DCP retrieval and persisted payload.
- `src/app/api/artefacts/generate-detailed-planning-pack/route.ts` — authenticated API route for pack generation.
- `src/types/workspace.ts` — workspace Detailed Planning Pack content and artefact typing.
- `src/components/projects/project-workspace.tsx` — Outputs proposal input, CTA and saved pack rendering.
- `src/lib/commercial-next-action.ts`, `src/lib/detailed-planning-pack-selector.ts`, `src/lib/artefact-regeneration.ts`, stale artefact routes/banner, and related tests — commercial funnel progression, current-site quality pack selection, plus dedicated pack stale/regeneration handling.
- `tests/commercial-next-action.test.ts`, `tests/detailed-planning-pack-selector.test.ts`, and `tests/map-snapshot.test.ts` — commercial readiness/quality-pack gating plus Byron/Kempsey/no-evidence/unsupported-LGA/forged-client/current-site-vs-stale-QSC pack regressions.
- `README.md` and `docs/project-memory/decision-register.md` — commercial pilot funnel and evidence-gated monetisation decision.

Tests/checks for review:

- PASS: `npm run test:node -- tests/map-snapshot.test.ts tests/commercial-next-action.test.ts`
- PASS: `npm run test:vitest -- src/lib/artefact-regeneration.test.ts src/app/api/projects/[projectId]/artefacts/stale/route.test.ts`
- PASS: `npm run lint`
- PASS: `npx tsc --noEmit`
- PASS: `npm test`
- PASS: `npm run build`
- EXPECTED ENVIRONMENT FAILURE: `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres" npm run vercel-build` reaches Prisma `P1001` in Codex Cloud when localhost Postgres is unavailable.

Deploy/migration/live gate: OPEN. Apply the additive Prisma migration before deploying the pack route/UI, then verify fresh saved-output workflows for Byron `45 Broken Head Road` SP3 and Kempsey `52 Belgrave St` E2 without mutating production projects/data outside the approved QA path. Confirm saved pack rendering survives refresh and that irrelevant rural/residential DCP clauses are not promoted as applicable. No live QA is claimed in this item yet.

Status reconciliation: Item 49 moved from IN REVIEW to merged/deployed at exact merge commit `ae3e8a8bab58bb78a3777f79bfb7e451c823278b` (PR #289). Live saved-output verification gate remains OPEN until fresh production-safe saved outputs verify the current QSC → DPP path.

## 50) SEE and consultant referral consume Detailed Planning Pack — DONE/MERGED (2026-07-15)

Scope: make the saved current-site Detailed Planning Pack the server-authoritative proposal and DCP evidence source for SEE generation, and require consultant referral to carry an unbroken current-site QSC → DPP → matching SEE chain when SEE is present.

Acceptance:

- `/api/artefacts/generate-see` / `createPreSeePlanningMemoArtefact` resolve the newest current-site `detailed_planning_pack` that parses as `DetailedPlanningPackContent`, has `commercialReady === true`, and points to an existing current-site saved Quick Site Check with cited LEP evidence.
- SEE generation ignores fresh client-supplied proposal/site/zone/citation/readiness fields. `proposedWorksSummary`, DCP clauses, source excerpts, topic assessments, and durable `sourceDetailedPlanningPack` provenance are derived from the persisted pack.
- Stale, malformed, unresolved, cross-site, or broken-provenance packs reject clearly before persistence; no SEE is saved for those states.
- Expert review request generation resolves artefacts by provenance/current-site scope. Matching commercial-ready chains package QSC + DPP + SEE. Unresolved current-site packs can create QSC + DPP referral with unresolved topics/questions and no SEE/readiness claim. Missing/stale-only packs reject with regeneration guidance.
- Review request payloads include `detailed_planning_pack` in `includedArtefacts`, DPP proposal brief, topic matrix/source refs, unresolved topics, carried QSC LEP evidence summary, and optional matching SEE provenance. Legacy review/SEE payloads remain renderable/exportable but cannot unlock the current commercial funnel.
- Workspace SEE CTA is gated by a current commercial-ready DPP and posts only the project ID. Unresolved current-site packs expose expert referral copy without enabling SEE.

Changed files:

- `src/lib/artefact-service.ts` — shared server DPP/QSC provenance resolver, DPP-derived SEE persistence, and provenance-safe referral packaging.
- `src/types/workspace.ts` — durable SEE `sourceDetailedPlanningPack` and review DPP/SEE provenance payload fields.
- `src/components/projects/project-workspace.tsx` and `src/lib/commercial-next-action.ts` — current quality DPP gate for SEE and unresolved-pack expert-review branch.
- `src/lib/review-request-handoff.ts` — copied/downloaded handoff now includes DPP provenance, proposal brief, topic source refs, unresolved topics, and SEE provenance when present.
- `docs/project-memory/build-next.md` and `docs/project-memory/decision-register.md` — Item 49 reconciliation, Item 50 review record, and DPP branch decision.

Tests/checks for review:

- PASS: `npx tsx --test tests/map-snapshot.test.ts tests/commercial-next-action.test.ts` — 32 tests passed, including Byron SP3/Kempsey E2 DPP-derived SEE, forged body, stale/current pack, unresolved-pack rejection, and unresolved referral CTA coverage.
- PASS: `npm run test:vitest -- src/lib/artefact-review-request.test.ts src/lib/review-request-handoff.test.ts` — 9 tests passed, including QSC + DPP + matching SEE packaging, unresolved QSC + DPP referral without SEE, mismatched SEE exclusion, legacy bypass rejection, DPP handoff provenance, unresolved topics, and legacy export safety.
- PASS: `npm run lint` — no warnings/errors.
- PASS: `npx tsc --noEmit --pretty false`.
- PASS: `npm test` — 46 Vitest files and 209 total Vitest tests passed after Node test suite completed with 64 passing tests.
- PASS: `npm run build` — completed successfully; existing `/api/dcp/search` dynamic-server-usage diagnostic emitted during static generation and did not fail the build.
- EXPECTED ENVIRONMENT FAILURE: `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres" npm run vercel-build` reached Prisma `P1001` because no PostgreSQL server was reachable at `localhost:5432` in Codex Cloud.

Status reconciliation: Item 50 moved to DONE/MERGED at exact merge commit `b997b8f6f8985f947e7a8d0edef765d4d0ac84d7` (PR #290) and Vercel deployment succeeded for target `https://vercel.com/robbietalls-projects/plannera-ab/DuvyeHc4Zp9SmnDDSgWRmkbMKuMg`. Live saved-output/commercial audit gate remains OPEN; deployment success alone is not live funnel proof. Do not claim live saved-output verification until fresh production-safe Byron `45 Broken Head Road` SP3 and Kempsey `52 Belgrave St` E2 paths confirm DPP-derived SEE citations/provenance and referral branching without production data mutation outside the approved QA path. Item 40 billing/auth remains deferred.

## 51) Production-safe commercial funnel readiness audit — DONE/MERGED/DEPLOYED (2026-07-16)

Scope: add a protected, read-only operational audit endpoint for an authorised operator to verify one existing project's saved Quick Site Check → Detailed Planning Pack → matching SEE/referral chain without creating projects, generating artefacts, invoking OpenAI, retrieving DCP/LEP, or mutating production data.

Contract:

- `GET /api/admin/commercial-funnel-audit?projectId=<id>` returns `commercial_funnel_audit.v1` JSON for one explicit project identifier when authorised with the existing admin secret conventions; production operators should prefer the `x-admin-token: INGEST_ADMIN_SECRET` header instead of putting secrets in URLs or logs.
- Output includes `checkedAt`, project/site scope, compact QSC/DPP/SEE states, saved artefact IDs, exact source QSC/DPP IDs, cited/applicable evidence counts, unresolved topics, referral eligibility (`none`, `unresolved_pack_referral`, or `quality_chain_referral`), and machine-readable next-action reason codes.
- The audit is read-only: it may query project/site/artefacts only and must never create, update, upsert, delete, regenerate, retrieve DCP/LEP, call OpenAI, expose full artefact payloads, DCP excerpts, contact details, or secrets.
- Readiness uses the same current-site/provenance selectors as artefact generation: new quality chains require exact current-site saved QSC → DPP → SEE provenance from Item 50. Legacy, stale, cross-site, malformed, forged, or broken-ID chains remain history and cannot pass.

Changed files for review:

- `src/lib/commercial-funnel-audit.ts` — side-effect-free commercial funnel audit helper driven by the shared current-site DPP/QSC chain resolver.
- `src/lib/commercial-funnel-audit.test.ts` — dedicated helper regression coverage for quality chains, unresolved/newer active packs, stale/malformed/forged/broken provenance, strict SEE parsing, and deterministic ordering.
- `src/app/api/admin/commercial-funnel-audit/route.ts` — protected read-only admin GET route using existing admin secret conventions.
- `src/app/api/admin/commercial-funnel-audit/route.test.ts` — dedicated route auth, missing-project, unknown-project, and valid-secret coverage.
- `src/lib/artefact-service.ts` — shared canonical current-site DPP/QSC chain resolver, strict SEE parser, schemas/current-site/recency helpers reused by generation and audit.
- `tests/map-snapshot.test.ts` — Item 50 generation regression for newer unresolved active DPP superseding an older ready pack.
- `README.md`, `docs/project-memory/build-next.md`, and `docs/project-memory/decision-register.md` — operator endpoint note, Item 49/50 reconciliation, Item 51 record, and billing/auth decision.

Tests/checks for review:

- PASS: `npm run test:vitest -- src/lib/commercial-funnel-audit.test.ts src/app/api/admin/commercial-funnel-audit/route.test.ts` — 2 files and 16 tests passed.
- PASS: `npx tsx --test tests/map-snapshot.test.ts tests/commercial-next-action.test.ts` — 33 tests passed.
- PASS: `npm run test:vitest -- src/lib/artefact-review-request.test.ts src/lib/review-request-handoff.test.ts` — 2 files and 9 tests passed.
- PASS: `npm run lint` — no warnings/errors.
- PASS: `npx tsc --noEmit --pretty false`.
- PASS: `npm test` — Node suite passed 65 tests; Vitest passed 48 files and 225 tests.
- PASS: `npm run build` — completed successfully; existing `/api/dcp/search` dynamic-server-usage diagnostic emitted during static generation and did not fail the build.
- EXPECTED ENVIRONMENT FAILURE: `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres" npm run vercel-build` reached Prisma `P1001` because no PostgreSQL server was reachable at `localhost:5432` in Codex Cloud.

Deployment reconciliation: Item 51 moved to DONE/MERGED/DEPLOYED on 2026-07-16 at exact merge commit `a7b4c1af4a2a6add435018e1b18e954f30550132` (PR #291). GitHub/Vercel status for that merge commit is success. Vercel deployment target: `https://vercel.com/robbietalls-projects/plannera-ab/8TAyJA3FbSpmxz5FfuWvg2CWznfb`. The merged/deployed PR changed 9 files and deployed the protected read-only endpoint `GET /api/admin/commercial-funnel-audit`.

Final verification evidence preserved for Item 51:

- PASS: `npm run test:vitest -- src/lib/commercial-funnel-audit.test.ts src/app/api/admin/commercial-funnel-audit/route.test.ts` — 2 focused audit/route files and 16 tests passed.
- PASS: `npx tsx --test tests/map-snapshot.test.ts tests/commercial-next-action.test.ts` — Item 50 generation/golden coverage passed with 33 tests.
- PASS: `npm run test:vitest -- src/lib/artefact-review-request.test.ts src/lib/review-request-handoff.test.ts` — referral/handoff coverage passed with 2 files and 9 tests.
- PASS: `npm run lint` — no warnings/errors.
- PASS: `npx tsc --noEmit --pretty false`.
- PASS: `npm test` — full suite passed with 65 Node tests plus 48 Vitest files / 225 Vitest tests.
- PASS: `npm run build` — completed successfully; existing `/api/dcp/search` dynamic-server-usage diagnostic emitted during static generation and did not fail the build.
- EXPECTED ENVIRONMENT FAILURE: `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres" npm run vercel-build` reached Prisma `P1001` because no PostgreSQL server was reachable at `localhost:5432` in Codex Cloud.

Live saved-output/commercial audit gate: OPEN. Deployment success is not live funnel proof. No approved live Byron/Kempsey audit result has been captured yet, so saved-output/commercial readiness remains unproven and billing/auth/payment remains deferred.

## 52) Approved live Byron/Kempsey commercial funnel audit — RUNNER MERGED/DEPLOYED; LIVE AUDIT OPEN (2026-07-16)

Purpose: run the deployed Item 51 read-only audit against approved existing production projects and record a non-secret, documentation-safe summary proving whether the current live saved-output commercial funnel is ready. This item closes only when both approved chains pass independently.

Runner deployment status: the fail-closed Item 52 runner merged and deployed in PR #293 at exact merge commit `9e1cffed5c34f12767210c83760adcc0f48327b4` (reviewed head `0188ef8cad25c776f2df8eb63b76d4a92ad477ec`) with successful Vercel deployment `https://vercel.com/robbietalls-projects/plannera-ab/9nknpTUpsUpQpE1cPU7Cju54W6c3`. This is a runner-only deployed status, not a DONE audit result. No live runner execution occurred because approved existing Byron/Kempsey project IDs and the private admin token were unavailable; there was no production mutation. The live gate remains OPEN until the approved existing-project-only runbook is executed and both golden chains independently pass.

Merged runner slice files/tests/checks:

- `package.json` — adds the `audit:commercial-funnel` operator script.
- `scripts/audit-commercial-funnel.ts` — CLI wrapper that prints the safe JSON summary and exits with the runner exit code.
- `src/lib/commercial-funnel-audit-runner.ts` — pure env parsing, URL construction, fetch orchestration, strict response contract validation, golden-chain evaluation, safe summary, and exit-code policy.
- `tests/commercial-funnel-audit-runner.test.ts` — mocked-fetch/env coverage for ready chains, open gates, broken provenance/evidence/identity/timestamps, missing env, unsafe URLs, deterministic GET order/header/body behaviour, HTTP/network/JSON/malformed failures, token/raw leakage prevention, and allowlisted deterministic output.
- `README.md` — operator usage, env names, exit codes, no-token-in-URL/header-only guarantees, no production mutation, and billing/auth deferral.
- `docs/project-memory/decision-register.md` — DR-021 records the fail-closed live-verification runner policy.

Checks recorded for merged PR #293:

- PASS: `npx tsx --test tests/commercial-funnel-audit-runner.test.ts` — 6 focused runner tests passed, including exact nested contract-shape failures and valid non-ready exit 2 coverage.
- PASS: `npm test` — full suite passed with 71 Node tests plus 48 Vitest files / 225 Vitest tests.
- PASS: `npm run lint`.
- PASS: `npx tsc --noEmit`.
- PASS: `npm run build`.
- EXPECTED ENVIRONMENT FAILURE: `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres" npm run vercel-build` reached Prisma `P1001` in Codex Cloud because no PostgreSQL server was reachable at `localhost:5432`; this is the known Cloud-only vercel-build limitation, not a production audit result.

Production-safe operator runbook:

1. Confirm the audited deployment and code identity before querying production. For the protected remote lane added in Item 53, dispatch only from `main` after the exact `main` SHA has a green Vercel deployment; the workflow derives `PLANNERA_AUDIT_EXPECTED_COMMIT` from `github.sha`, so operators must not supply an arbitrary expected commit.
2. Use only approved existing production projects for the two golden chains: Byron `45 Broken Head Road, Byron Bay NSW 2481` with current-site zone `SP3 Tourist`, and Kempsey `52 Belgrave St, Kempsey NSW 2440` with current-site zone `E2 Commercial Centre`.
3. Never create a project, update a project, generate or regenerate Quick Site Check / Detailed Planning Pack / SEE / referral artefacts, invoke OpenAI, ingest legislation/DCP, or otherwise mutate production data while performing this audit.
4. Use the protected manual GitHub Actions lane from Item 53 rather than local shells, chat, browser calls, or ad hoc HTTP commands. The admin token must stay in the protected GitHub environment secret, project IDs must stay in GitHub variables, and only the validated safe JSON artifact should be downloaded/stored.
5. Do not commit or paste secrets, full JSON payloads, DCP/LEP excerpts, artefact body text, project owner/contact details, emails, phone numbers, or other contact data into repo docs. Store raw responses only in approved private operational systems if needed.
6. In this file, record only the safe audit summary needed to close or keep open the gate: `checkedAt`, project/site identity sufficient to distinguish Byron vs Kempsey without contact data, deployment URL, commit SHA, QSC/DPP/SEE states, exact saved artefact IDs, exact source QSC/DPP IDs, `referralEligibility`, and `nextAction` reason codes.
7. Treat Byron and Kempsey as independent gates. Byron `45 Broken Head Road` SP3 must pass its current-site saved QSC → DPP → SEE/referral provenance chain independently, and Kempsey `52 Belgrave St` E2 must pass its current-site saved QSC → DPP → SEE/referral provenance chain independently, before this item can move to DONE.
8. Record honest failures exactly as returned: missing, unresolved, stale/mismatched, malformed, legacy, broken-provenance, or other non-ready reason codes are valid audit outcomes and must not be hidden or repaired during the audit run. Do not regenerate anything to make the audit pass.
9. Keep billing, checkout, subscriptions, auth gating, and payment unlock blocked until both approved live audit summaries prove exact current-site QSC → DPP → SEE/referral provenance on the exact dispatched main SHA with a green Vercel deployment.

Protected live evidence (2026-07-16): GitHub Actions [run 29492417071, attempt 2](https://github.com/RobbieTall/Plannera-ab/actions/runs/29492417071) was approved through the `commercial-funnel-audit` environment and audited exact deployed `main` commit `c723a8932e697e7f86860eb57f02f551ab6baf5e`. Dependency install, read-only runner execution, safe JSON validation/print, and artifact upload all passed. The runner returned controlled exit `2`, so the final fail-closed gate failed as designed. Safe artifact `8373345476` is 958 bytes, expires 2026-07-30, and has digest `sha256:7080d322dc8f9d6bd3700e691e0a33fb876a585a751da42b685829b35384fa9b`.

The authenticated audit returned valid contracts for both approved projects. Byron `cmrkg5g320000l204s3cz3kj0` resolved SP3 and Kempsey `cmrkg7izz0005ld04dqz3t6rx` resolved E2, but each reported `quickSiteCheck.state=missing`, `detailedPlanningPack.state=missing`, `see.state=missing`, `referralEligibility=none`, and next action `generate_or_refresh_required_chain` with `qsc_missing`, `dpp_missing`, and `see_missing`. No production data was mutated. The runner also exposed audit-only identity false negatives: production addresses use canonical abbreviations plus `, Australia`, and both safe summaries carried `lgaCode=null`. Item 54 separates those representation issues from the real missing-chain result.

Gate status: OPEN with valid live evidence. Item 52 is no longer awaiting its first execution, but neither Byron nor Kempsey passes. Billing, checkout, subscriptions, auth gating, and payment unlock remain deferred until normal-product saved chains pass independently.

## 53) Protected remote commercial funnel audit execution lane — DONE/MERGED/DEPLOYED (2026-07-16)

Purpose: provide a secure, manually dispatched GitHub Actions lane for the already-merged fail-closed Item 52 commercial funnel audit runner, so the approved live Byron/Kempsey audit can be run without pasting the private admin token into chat and without local execution.

Status: DONE/MERGED/DEPLOYED/CONFIGURED. The protected lane merged in PR #295 at exact merge commit `5582c2e83c0d3195805424e4c6a72703b221c916` (reviewed head `fb752ea50ae307907549b945f6e7160920a806be`) and deployed successfully via Vercel deployment target `https://vercel.com/robbietalls-projects/plannera-ab/fWBS4p1HGRTDzq339Ck6uRvS8Ssp`. The protected environment was subsequently configured with required-reviewer approval, main-only deployment policy, the private audit secret, and the three required variables. Run `29492417071` proved the lane executes safely; attempt 2 authenticated and produced the valid non-ready Item 52 evidence above. No projects were created and no production data was mutated. Billing, checkout, subscriptions, auth gating, and payment unlock remain deferred.

Files changed in this slice:

- `.github/workflows/commercial-funnel-live-audit.yml` — adds a `workflow_dispatch`-only protected environment lane requiring exact confirmation `RUN APPROVED READ-ONLY AUDIT`, `main` branch guard, read-only contents permission, non-cancelling concurrency, 10-minute timeout, immutable official action pins, `npm ci --ignore-scripts`, exactly one execution of `./node_modules/.bin/tsx scripts/audit-commercial-funnel.ts`, stdout capture to `commercial-funnel-audit.json`, JSON validation before display/upload, 14-day safe summary artifact retention, and final exit-0-only enforcement.
- `tests/commercial-funnel-audit-workflow.test.ts` — static Node contract coverage for manual-only trigger, protected environment, main-only guard, approved vars/secret mapping, `github.sha` expected commit, exact runner invocation, forbidden commands/surfaces, JSON validation, safe artifact upload, final gate policy, and official full-SHA action pins.
- `README.md` — adds protected remote-run setup and operator steps without secret or project values.
- `docs/project-memory/decision-register.md` — adds DR-022 for the protected manual remote audit lane policy.

Pinned official action SHAs selected for this lane:

- `actions/checkout` v6.0.2 — `de0fac2e4500dabe0009e67214ff5f5447ce83dd`.
- `actions/setup-node` v6.4.0 — `48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e`.
- `actions/upload-artifact` v7.0.1 — `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a`.

Configuration completed on 2026-07-16: the protected GitHub environment `commercial-funnel-audit` has required reviewer `RobbieTall`, administrator bypass disabled, selected-branch policy limited to `main`, secret `PLANNERA_AUDIT_ADMIN_TOKEN`, and variables `PLANNERA_AUDIT_BASE_URL`, `PLANNERA_BYRON_PROJECT_ID`, and `PLANNERA_KEMPSEY_PROJECT_ID`. Secret values remain undocumented. The effective production admin credential follows `ADMIN_ACCESS_TOKEN` → `INGEST_ADMIN_SECRET` → `ADMIN_SECRET` precedence; the audit secret must match the first configured value. The workflow continues to derive `PLANNERA_AUDIT_EXPECTED_COMMIT` from `github.sha`.

Checks for this slice:

- PASS: `npx tsx --test tests/commercial-funnel-audit-workflow.test.ts` — 6 focused workflow contract tests passed.
- PASS: `npx tsx --test tests/commercial-funnel-audit-workflow.test.ts tests/commercial-funnel-audit-runner.test.ts` — 12 focused workflow plus existing runner tests passed.
- PASS: `ruby -e "require 'yaml'; YAML.load_file('.github/workflows/commercial-funnel-live-audit.yml'); puts 'YAML parsed'"` — non-executing YAML syntax parse/check completed for `.github/workflows/commercial-funnel-live-audit.yml`.
- PASS: `npm run lint`.
- PASS: `npx tsc --noEmit`.
- PASS: `npm test` — full suite passed with 77 Node tests plus 48 Vitest files / 225 Vitest tests.
- PASS: `npm run build`.
- PASS: PR #295 squash-merged to `main` at exact merge commit `5582c2e83c0d3195805424e4c6a72703b221c916`; the reviewed final head was `fb752ea50ae307907549b945f6e7160920a806be` and the merged diff remained exactly five intended files.
- PASS: Vercel reported success for merge commit `5582c2e83c0d3195805424e4c6a72703b221c916` at `https://vercel.com/robbietalls-projects/plannera-ab/fWBS4p1HGRTDzq339Ck6uRvS8Ssp`.
- NOT RERUN FOR REVIEW CORRECTION: `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres" npm run vercel-build` — intentionally not run again per review instruction; prior Item 53 verification had already recorded the known Codex Cloud `P1001` limitation.

Lane status: DONE. Item 52 commercial readiness remains OPEN because the protected run returned valid exit `2`; both approved saved chains are missing.


## 54) Live golden identity hardening and saved-output remediation — IDENTITY SLICE DONE/MERGED/DEPLOYED; SAVED-OUTPUT REMEDIATION OPEN (2026-07-16)

Purpose: act on the first valid protected production audit without weakening its fail-closed contract or manufacturing readiness. This item separates representation-only identity mismatches from the real missing QSC → DPP → SEE chains.

Identity slice completion:

- PR #297 merged at exact commit `5cb75a51894aab40e701bff4d3f541cbff85e71d`.
- Vercel production deployment succeeded at `https://vercel.com/robbietalls-projects/plannera-ab/BWaaGemdMei5UcPDNLUtquWCvdWs`.
- Golden identity comparison now canonicalises only case/punctuation, `Road`/`Rd`, `Street`/`St`, whitespace, and the optional `Australia` suffix. Site number, locality, postcode, zone, and approved project identifier still must match.
- The audit contract's canonical `lgaName` is accepted when `lgaCode` is null after removing council-type suffixes such as `Shire` and `Council`. Missing or conflicting LGA identity still fails.
- Every real readiness failure remains fail-closed. Identity formatting cannot upgrade missing, unresolved, stale/mismatched, malformed, uncited, broken-provenance, or legacy artefacts.
- Focused regression coverage was added for the exact production address/LGA representations. No local build/tests were run per operator instruction; the remote Vercel preview and merged production deployments passed.

Post-merge protected evidence:

- [Commercial Funnel Live Audit run 29494711998](https://github.com/RobbieTall/Plannera-ab/actions/runs/29494711998) was manually dispatched from `main`, approved through the protected environment, and checked exact merge commit `5cb75a51894aab40e701bff4d3f541cbff85e71d`.
- Dependency installation, runner execution, JSON validation/print, and artifact upload passed. The controlled runner returned exit `2`, so the final gate failed as designed.
- Safe artifact `8373903558` is 939 bytes, expires 2026-07-30, and has digest `sha256:603372049b35dda723645bf15b392b753e3a023796d8b6d79a12f58783a1ca32`.
- Byron `cmrkg5g320000l204s3cz3kj0` passed approved project/address/LGA/SP3 identity validation. Kempsey `cmrkg7izz0005ld04dqz3t6rx` passed approved project/address/LGA/E2 identity validation. The prior `site_address_mismatch` and `site_lga_mismatch` reasons are absent for both.
- Both projects still truthfully report `quickSiteCheck.state=missing`, `detailedPlanningPack.state=missing`, `see.state=missing`, `referralEligibility=none`, and next action `generate_or_refresh_required_chain`. No production data was mutated.

Remaining saved-output remediation:

1. Obtain a real user-approved proposed-works brief for each approved golden project.
2. Through the normal user-facing product workflow, save a cited current-site Quick Site Check, generate the Detailed Planning Pack, and generate SEE only when the pack is commercial-ready. This is an intentional production action and must not be performed by the audit or an admin/database backfill.
3. Rerun the protected audit. Byron and Kempsey must independently return exact current-site provenance and runner exit `0` before Item 52 can close.
4. Only after that evidence may Item 40 billing/auth/payment gating be reconsidered.

Gate status: OPEN for genuine saved outputs only. The audit now cleanly distinguishes site identity from the remaining commercial blocker.


## 55) Normal-workspace-accessible production golden projects — BLOCKED ON EXPLICIT PRODUCTION APPROVAL (2026-07-16)

Finding: after Item 54's clean protected audit, both historical approved project records were opened through the deployed normal workspace using their internal IDs and their returned public IDs. All four normal-workspace URLs rendered `Project not found`, while the admin read-only audit continued to resolve both records. No generation or production mutation was attempted.

Root cause: the normal workspace correctly uses requester ownership/session access through `getProjectForRequester`; the admin audit intentionally uses authorised identifier lookup without granting workspace access. The historical QA projects belong to an inaccessible prior requester/session. Admin audit visibility is therefore not proof that an operator can complete the real user funnel.

Decision for the next production action:

- Do not weaken workspace ownership, expose admin-readable projects publicly, claim historical projects across requester boundaries, database-backfill ownership, or add an audit-only generation path.
- After explicit operator approval, create two fresh pilot projects through the normal production UI under the current requester/session.
- Use the fixed golden sites: Byron `45 Broken Head Road, Byron Bay NSW 2481` / SP3 and Kempsey `52 Belgrave St, Kempsey NSW 2440` / E2.
- Use only explicitly approved pilot proposal briefs. Recommended low-complexity briefs:
  - Byron: `Internal refurbishment and minor alterations to existing tourist accommodation, with no change of use, additional floor area, guest rooms, parking, or access.`
  - Kempsey: `Internal commercial fit-out and minor shopfront improvements, with no change of use, additional floor area, parking, access, or building envelope.`
- Save a cited current-site Quick Site Check first. Generate the Detailed Planning Pack from that saved QSC. Generate SEE only if the pack is commercial-ready; otherwise preserve the unresolved pack and exercise the consultant-referral branch honestly.
- Replace the protected GitHub environment project-ID variables only after each fresh project's site identity and normal workspace access are verified. Never place IDs or secrets in public logs beyond the approved safe summary contract.
- Rerun the protected audit on the exact deployed commit and record the new safe artifact.

Approval boundary: creating projects, setting production sites, and generating/saving QSC/DPP/SEE or referral artefacts are intentional production mutations and may invoke retrieval/model workflows. They require explicit user approval for these exact two sites and proposal briefs before execution.

Success signal: each protected-audit golden ID opens in the normal product workspace for the current requester and produces an honest, provenance-valid funnel result through the same UI and APIs a pilot user would use.

## 56) Deterministic Byron/Kempsey commercial funnel golden CI — DONE/MERGED (2026-07-16)

Purpose: make the evidence-gated QSC → Detailed Planning Pack → SEE/referral contract an ordinary remote pull-request check while live saved-output work remains blocked. The repository previously relied on Vercel deployment status plus fragmented focused tests; there was no secret-free CI check that persisted both launch-LGA chains through the real artefact services and then evaluated the saved result with the production audit logic.

Implementation in this slice:

- `tests/commercial-funnel-golden.test.ts` uses an in-memory Prisma-compatible repository and the real `createQuickSiteCheckArtefact`, `createDetailedPlanningPackArtefact`, `createPreSeePlanningMemoArtefact`, `createExpertReviewRequestArtefact`, and `auditCommercialFunnel` functions.
- The fixed Byron `45 Broken Head Road` SP3 and Kempsey `52 Belgrave St` E2 sites use the exact low-complexity pilot briefs recorded in Item 55.
- Byron and Kempsey each prove a persisted cited QSC → five-topic cited DPP → DPP-derived SEE → consultant handoff → `quality_chain_referral` audit result with exact QSC/DPP/SEE provenance.
- A separate Kempsey evidence-gap journey removes parking/access evidence, proves the DPP remains unresolved, SEE generation rejects without persistence, the review package omits SEE and disclaims readiness, and the audit returns `unresolved_pack_referral`.
- `tests/commercial-funnel-golden-workflow.test.ts` fails closed if the workflow gains secrets, a protected environment, database/build/deploy/model/live-audit commands, unpinned actions, or loses the required commercial tests.
- `npm run test:commercial-funnel` runs the new journeys plus existing QSC persistence, DPP/SEE generation, next-action, referral/handoff, audit helper/route, audit runner, and workflow-contract regressions.
- `.github/workflows/commercial-funnel-golden.yml` runs that focused command on pull requests, pushes to `main`, and manual dispatch. It uses read-only repository permission, immutable action pins, `npm ci --ignore-scripts`, an explicit database-free Prisma client generation step, no secrets, and no build or production access.

Evidence boundary: this is deterministic non-production regression evidence only. It must not be reported as live planning-data accuracy, live saved-output success, deployment success, or production commercial readiness. Item 52 remains OPEN, Item 55 remains blocked on an explicitly approved normal-product production run, and Item 40 billing/auth remains deferred.

Verification for this slice: no local build or test command was run, per operator instruction. The GitHub Actions check is the authoritative execution surface. Final-head review run [29501006341](https://github.com/RobbieTall/Plannera-ab/actions/runs/29501006341), job `87629618176`, passed in 50 seconds on `a0c5dc0d94e9b110c01c218921c419ec4aaf169c`; Vercel preview and all PR checks were green. PR #300 merged to `main` at exact merge commit `70edf69eccc5365ee5247efa5f8cefefc5ec7885`.

Lane status: DONE. This deterministic gate is now required regression evidence; Items 52 and 55 remain open at their documented production boundaries.

## 57) Strict persisted LEP and SEE source-snapshot provenance — DONE/MERGED (2026-07-17)

Purpose: close a consultant-facing evidence integrity gap left by ref-only provenance checks. A client-shaped QSC control could retain a plausible numeric value, clause reference, and `Cited` label without server evidence; a legacy or altered SEE could also preserve matching QSC/DPP IDs and valid-looking refs while changing copied controls, permissibility, proposal text, DCP bodies, excerpts, or assessments.

Implementation in this slice:

- QSC persistence treats height, floor space ratio, and minimum lot size as server-derived controls. A control is Cited only when retrieved LEP text or a server-returned structured Cited control supplies both value and clause reference; otherwise value, ref, detail, source claim, confidence, and interpretation are reset to an honest `Unavailable` control.
- A verified numeric control requires `lepSource=true`, a present non-empty value, and a non-empty clause reference. A client-supplied `confidence=Cited` or ref cannot satisfy that invariant.
- Optional QSC setback, parking, and active-frontage/built-form controls are rebuilt from the server-returned DCP controls. A server Cited value/ref becomes a DCP-sourced card; a posted client card without that evidence is reset to an honest DCP `Unavailable` state.
- Clause 2.3 permissibility provenance is independent: the QSC must have a Cited evidence summary with at least one DB-backed zone objective and at least one land-use entry, plus a saved permissibility result and LEP instrument. Numeric controls alone cannot create a clause 2.3 citation.
- SEE generation copies sanitised QSC controls and emits LEP citations only for verified controls/permissibility.
- SEE audit and consultant handoff require an exact current-source snapshot: project/proposal identity, LEP instrument, permissibility, copied controls, DPP clause metadata/body, source excerpts, and all consistency assessments must match the source QSC/DPP. Matching artefact IDs or citation refs alone are insufficient.
- Review packages rebuild cited sources from the verified QSC core controls and source DPP; they do not trust a SEE citation list. Unsupported controls become confidence gaps and altered SEE artefacts remain history only.
- The production read-only audit applies the same exact snapshot helper before returning `quality_chain_referral`.

Focused regression coverage:

- QSC persistence clears forged client numeric and optional DCP controls even when a separate DB-backed zone table keeps the overall LEP summary Cited.
- Server-returned Kempsey E2 DCP controls persist with their exact DCP value, clause ref and source detail without inflating the LEP evidence summary.
- LEP lookup failure persists honest Unavailable controls rather than fallback client values.
- SEE generation clears legacy controls lacking server provenance and withholds clause 2.3 when zone-table evidence is absent.
- Review handoff rejects altered QSC/SEE snapshots and excludes forged refs.
- Commercial audit rejects matching-ID SEE payloads with changed control values, DCP body text, permissibility, proposal text, or unsupported clause 2.3 evidence.
- Existing Byron SP3 and Kempsey E2 commercial golden journeys remain in the focused remote gate.

Evidence boundary: this hardens deterministic persistence and handoff invariants. It does not prove live Byron/Kempsey planning-data accuracy, create production artefacts, close Item 52/55, or unlock Item 40 billing/auth. No local build or test command is run; the secret-free Commercial Funnel Golden Gate and Vercel preview are the review authority.

Verification evidence: no local build or test command was run, per operator instruction. Initial PR review run [29505222238](https://github.com/RobbieTall/Plannera-ab/actions/runs/29505222238), job `87644106899`, passed the lifecycle-script-free install, database-free Prisma generation, and complete `test:commercial-funnel` command on head `a906f789e33154156bb753eff0912bce6d5147cd`. Vercel preview `BY9cWkMDtAuZDkioUbo1Y7wQqUUi` also passed. Item 57 merged in PR #301 at exact merge commit `27475cd513c280ea163377ef2973bdfd146dda29`. The documentation evidence commit retained the green final-head golden gate and Vercel check before merge.



## 58) Topic-specific DCP evidence qualification for commercial DPP — DONE/MERGED (2026-07-17)

Purpose: prevent a generic/current-zone Part B DCP row or source-reference-only clause from being promoted as Cited evidence for unrelated paid Detailed Planning Pack topics. Item 57 exact snapshot provenance proves the saved SEE/DPP chain was not altered; it does not, by itself, prove that each DPP topic was genuinely supported by topic-relevant DCP text.

Implementation in this slice:

- DPP generation now passes the required topic ID into `filterSiteApplicableDcpClauses` for every topic instead of a single first-word query token or no topic for local controls.
- Site applicability still preserves the existing current-zone behaviour and zone/scope conflict exclusions, but Part B/all-development evidence must also match the requested topic through the actual title, heading path, or body text.
- Deterministic topic matchers cover setbacks/building lines/front-side-rear-street boundary equivalents, parking/access/driveway/loading/service-access equivalents, built-form/active-frontage/street-frontage/shopfront/building-design equivalents, landscaping/open-space/deep-soil/tree-planting equivalents, and explicit general/local/all-development/design/site/development-control terms for local controls.
- Source refs, Part/chapter labels, current-zone mentions, and generic Part B provenance no longer qualify a DPP topic by themselves. Missing topic evidence remains `Unavailable` with unresolved-topic reasons.
- `commercialReady` remains fail-closed and is true only when all five required DPP topics are genuinely Cited.

Focused regression coverage:

- A single generic Kempsey E2/current-zone Part B clause returned for every DPP query leaves all five topics Unavailable and `commercialReady=false`.
- A Part B clause with actual parking/access/loading text qualifies for `parking_access` only and does not populate unrelated topics.
- The deterministic Byron SP3 and Kempsey E2 commercial-ready golden journeys and the Kempsey unresolved referral branch remain in `npm run test:commercial-funnel`.

Evidence boundary: this is a deterministic DPP evidence-quality hardening slice only. It does not call live planning services, mutate production data, create production projects, close Item 52 or Item 55, or unlock Item 40 billing/auth. Items 52/55 and billing/auth remain explicitly open/deferred.

Verification evidence: Codex Cloud ran and passed `npm run test:commercial-funnel`, `npm run lint`, and `npx tsc --noEmit`. Build/vercel-build was not run per operator instruction. The final PR head still required the secret-free Commercial Funnel Golden Gate and Vercel preview to pass before merge.

Status reconciliation: Item 58 merged in PR #302 from exact head `558ca9d5fcaf7ea85c40e155739e9c3103ccb943` at exact merge commit `963662cac8418767b901a4355577614ae07eb888`. The existing green gate/Vercel review evidence above remains the Item 58 verification record.


## 59) Substantive DCP requirement qualification for paid DPP topics — DONE/MERGED (2026-07-17)

Purpose: tighten the now-merged Item 58 topic-specific DCP qualification so a paid Detailed Planning Pack topic cannot be sold as Cited when the body merely names the topic or says vague controls apply. Item 59 follows merged Item 58 sequentially: Item 58 merged in PR #302 from exact head `558ca9d5fcaf7ea85c40e155739e9c3103ccb943` at exact merge commit `963662cac8418767b901a4355577614ae07eb888`. Item 59 merged in PR #303 from exact head `03132bd473e2b13d0ad5d47356da7b697217b7bd` at exact merge commit `ac34b1b336706db7d77fc6aa39faf33381af095c`.

Invariant: a DPP topic may be Cited only when evidence is site-applicable, topic-relevant, has a real source reference, and the clause body itself contains substantive requirement content. Substantive content may be quantitative (number/unit, ratio, percentage, nil/zero, rate) or qualitative when normative control language states a concrete topic-relevant prescription or prohibition. Refs, titles, headings, topic tags, Part/chapter labels, and current-zone metadata may establish provenance/topic classification, but never substantive sufficiency by themselves.

Focused coverage:

- A current-zone Part B parking clause with parking/access/loading words and the vague body “Parking, driveway access, loading and service access controls apply where relevant.” remains `Unavailable`, has no citations, and keeps `commercialReady=false`.
- Title/heading/ref-only numeric-looking or topic text cannot satisfy substance when the body is only overview/admin text.
- A mixed objectives-plus-controls body qualifies when the body contains a genuine numeric or strong prescriptive control for the intended topic.
- Objective-only “To ensure/provide…” prose remains `Unavailable`, and an objective sentence for one topic cannot be paired with a separate substantive control sentence for another topic.
- A substantive requirement containing “where relevant” still qualifies when the same sentence/control row states a concrete topic-relevant control.
- Checked-in Byron DCP B4 examples using “should” and headroom bodies whose body text says “cars” / “accessible spaces” qualify `parking_access` without relying on heading metadata alone for substance.
- A quantitative parking requirement qualifies `parking_access` only.
- A qualitative prescriptive active-frontage/built-form requirement qualifies `built_form_active_frontage` only.
- Byron SP3 and Kempsey E2 commercial-ready golden journeys, unresolved referral branch, Item 57 forged-snapshot tests, and Item 58 topic-isolation tests remain preserved in the focused commercial-funnel suite.

Evidence boundary: reject table-of-contents/index text, headings only, objectives, overviews, administrative/topic-listing text, and generic “controls apply where relevant” statements. Repository evidence remains limited for real Kempsey PDF body shapes because the checked-in Kempsey HTML is a placeholder and 2026 Kempsey ingestion fetches live PDFs at ingest time. Do not add schema/migrations, billing/auth/paywall, production access, live retrieval, production projects, or production mutation. This deterministic hardening does not prove live planning-data accuracy, close Item 52/55, or unlock Item 40 billing/auth.

Verification commands for this slice: `npm run test:commercial-funnel`, `npm run lint`, and `npx tsc --noEmit`. Do not run `npm run build` or `npm run vercel-build` for this item.

Status: DONE/MERGED — PR #303 merged from exact head `03132bd473e2b13d0ad5d47356da7b697217b7bd` at exact merge commit `ac34b1b336706db7d77fc6aa39faf33381af095c`.

## 60) Exact DCP requirement excerpts through SEE/referral handoff — DONE/MERGED (2026-07-17)

Purpose: close the consultant-inspectability gap between the paid Detailed Planning Pack and downstream SEE/referral handoff. Item 59 correctly decides whether a topic is Cited from a topic-matching substantive sentence/control row, but the saved citation excerpt still used the broader clause body, allowing objectives or unrelated controls to travel into SEE and consultant review text.

Invariant: DPP citation excerpts must contain only the exact normalized sentence/control row(s) that independently match the requested topic and contain a quantitative requirement or genuine qualitative prescription/prohibition. Objective-only, index/admin/overview/topic-list text, generic “controls apply” wording, and controls for other topics must not qualify a topic or appear in that topic's excerpt. SEE `dcpClauses`, `sourceExcerpts`, prompt grounding and exact-provenance checks must carry the persisted excerpt byte-for-byte. Expert Review Request payloads and copied/downloaded handoff text must include the selected current DPP's cited requirements so a consultant can inspect the exact requirement without opening the app.

Focused coverage:

- Mixed active-frontage objective plus parking-only control yields a parking citation whose excerpt is exactly the parking control row, excludes the active-frontage objective, and leaves built-form Unavailable.
- Newline/table-style rows cannot borrow topic or substance from neighbouring rows; only independently qualifying rows appear.
- Multiple same-topic qualifying rows from one clause are preserved in deterministic source order and deduplicated; unrelated rows are absent.
- Quantitative and qualitative controls both yield exact excerpts; vague/objective-only cases remain Unavailable.
- Byron “should” and headroom examples remain Cited with precise persisted excerpts.
- SEE copies exact persisted excerpts into `dcpClauses`, `sourceExcerpts`, and prompt inputs, and exact provenance continues to reject tampering.
- Expert review request payload and exported text contain topic/ref/hierarchy/exact requirement; broad unrelated objective text is absent.
- Unresolved-pack referrals still include any available exact cited requirements without claiming SEE readiness.
- Existing Byron SP3 and Kempsey E2 commercial golden journeys plus Item 57/58/59 protections remain in the required verification suite.

Limits: no schema migration, no decorative UI, no billing/auth/paywall, no production access, no production project creation, no live planning-data retrieval, and no production audit completion claim. This does not prove live Byron/Kempsey planning accuracy, billing readiness, or merge status.

Verification commands for this slice: `npm run test:commercial-funnel`, focused review-request handoff tests, directly relevant DPP exact-excerpt tests, `npm run lint`, and `npx tsc --noEmit`. Do not run `npm run build` or `npm run vercel-build` for this item.

Evidence boundary: local deterministic tests can prove persistence, exact-copy, and provenance invariants only. Protected live saved-output audit and any production readiness claims remain outside this slice.

Status: DONE/MERGED — PR #304 merged from exact head `d694d6d0b57c0d4cf39fd25b61afddbbcc9b6eae` at exact merge commit `4ede5ca0b04644876ae48315145852b9e317ee51`.


## 61) Proposal-scoped DPP selection in the normal workspace — DONE/MERGED (2026-07-17)

Purpose: close the normal-user workflow gap where a current-site Detailed Planning Pack could remain selected after the user changed the proposed-works brief. The service already persists the brief into the DPP and downstream SEE/referral provenance, but the workspace active-pack selector treated only site scope and recency as active state. A pilot user could therefore edit “what I want to build” and still see the previous pack driving readiness/SEE prompts until they manually noticed the mismatch.

Invariant: the active normal-workspace Detailed Planning Pack must match both the current site and the current proposed-works brief when a brief is present. Current-site packs generated for a different brief remain saved history, but are proposal-stale for next-action readiness and downstream SEE/referral prompting. The workspace must surface the mismatch and normal SEE/expert-review write requests must send the intended DPP artefact ID plus expected proposal brief. The server must resolve that exact owned current-site DPP, verify intact cited QSC provenance and normalized proposal equality, and reject missing, stale-site, wrong-project, forged-ID, malformed, unresolved-for-SEE, or proposal-mismatched inputs before persistence without falling back to another/newer pack.

Focused coverage:

- The shared DPP selector still ignores different-site stale packs and chooses the newest matching current-site pack deterministically.
- When a current proposal brief is supplied, a newer current-site pack for a different brief is ignored in favour of an older matching pack.
- When only current-site packs for different briefs exist, the selector returns no active pack, so SEE/readiness progression fails closed until regeneration.
- SEE service coverage binds generation to an explicit selected DPP/proposal, proves normalized proposal equality, rejects mismatches without a second persistence, and does not fall back to a different pack when an explicit source is supplied.
- Expert-review service coverage binds an unresolved referral to the explicit selected DPP/proposal, preserves the honest no-SEE-readiness branch, and rejects proposal mismatches without persistence.
- The commercial golden journey now sends explicit source DPP/proposal bindings for commercial-ready SEE/review and unresolved referral branches, and includes mismatch rejection.
- `npm run test:commercial-funnel` includes the selector, exact-source SEE, unresolved referral, audit, and handoff coverage.

Evidence boundary: this is a normal-workspace source-selection plus server write-boundary hardening slice only. Explicit binding is enforced for the normal current workspace requests; compatibility requests that omit both source DPP ID and expected proposal retain the existing newest-current resolver and are documented as legacy only. This does not change database schema, billing/auth/paywall, ownership/session controls, production access, live retrieval, production projects, or live audit status. It does not prove live Byron/Kempsey planning accuracy, close Items 52/55, or unlock Item 40.

Verification commands for this slice: focused selector test, `npm run test:commercial-funnel`, `npm run lint`, and `npx tsc --noEmit`. Do not run `npm run build` or `npm run vercel-build` for this item.

Status: DONE/MERGED — PR #305 merged from exact head `694f5d3deeb373857f7b01de0bc087906d2484cc` at exact merge commit `bb874fe4642664fa2ccbc14ffc5475dbf6615467`.

## 62) Exact proposal/DPP-scoped displayed SEE and Expert Review Request readiness — IN REVIEW (2026-07-17)

Purpose: close the remaining normal-workspace display/readiness gap after Item 61. New SEE/referral writes are exact-bound to a selected proposal-matching DPP, but the current Outputs cards and readiness selectors still accepted any current-site SEE or Expert Review Request. Older proposal A outputs could therefore remain visible or advance commercial readiness after a user moved to proposal B on the same site/QSC.

Invariant: current normal-workspace SEE and Expert Review Request outputs are scoped to the active current-site, proposal-matching DPP. A displayed SEE must point to the active DPP artefact ID, the active DPP source Quick Site Check artefact ID, and a normalized proposed-works summary equal to the active DPP proposal, while retaining existing quality checks. A displayed Expert Review Request must point to the active DPP artefact ID, normalized proposal brief, active source QSC, matching `commercialReady` state, and, when present, a source SEE from the same active DPP. Legacy, malformed, forged, different-DPP, different-proposal, or stale-site outputs remain history only. Strict normal-workspace DPP selection fails closed when the proposal brief is empty, and normal SEE/review handlers never POST omitted DPP/proposal bindings.

Focused coverage:

- Newer proposal B DPP plus older proposal A DPP/SEE/review on the same site/QSC: selecting A shows only A exact outputs; selecting B hides A outputs and requires B SEE/referral.
- Current B pack plus old A SEE with plausible site/QSC/readiness data yields no displayed/current SEE and no SEE quality readiness for B.
- Forged/legacy SEE without exact DPP ID, or with matching QSC but different proposal, is ignored.
- Exact B SEE is selected deterministically by generated/captured time with stable ID fallback even when unrelated A SEE artefacts exist.
- Exact commercial-ready review packages with exact B SEE are selected; unresolved exact B referrals without a SEE remain selectable; A/legacy/malformed review packages are ignored.
- Untouched reload hydrates the newest current-site saved DPP proposal after server artefacts load; typed edits, including deliberate clearing, are never overwritten.
- Strict normal-workspace empty proposal state selects no DPP/output and cannot issue SEE/review POSTs without both exact binding fields.
- Existing Item 61 selection/mismatch behaviour, Byron SP3/Kempsey E2 golden journeys, unresolved referral branch, and exact server-write tests remain in the commercial-funnel suite.

Evidence boundary: this is a client selector/display/readiness and normal-workspace request-boundary hardening slice only. Old outputs remain visible in general artefact history but are scoped out of current Outputs cards/readiness/CTA when they do not exactly match the active proposal/DPP. No schema/migrations, billing/auth/paywall, production access, production mutation, production project creation, live retrieval, live-audit completion claim, broad redesign, or server-only imports into client code.

Verification commands for this slice: focused selector/output tests, `npm run test:commercial-funnel`, `npm run lint`, and `npx tsc --noEmit`. Do not run `npm run build` or `npm run vercel-build` for this item.

Status: IN REVIEW — not merged.

## 62) Exact Proposal/DPP Scoped Current Outputs — DONE/MERGED ✓

Item 62 is DONE/MERGED in PR #306 from exact head `02eeadb9c85d4b1a0ae6b6d907136e6c40ec1c32` at exact merge commit `e66f0543d3e3c268e1a52c71624eac40de4de061`. The evidence/provenance funnel is now exact proposal/DPP scoped for normal current-workspace SEE and expert-review outputs. This does not close Items 52/55 live completion and does not enable Item 40 billing/auth/paywall.

## 63) Address-First Quick Site Check Entry and Requester Project Continuity — IN REVIEW

Review state (2026-07-17): PR #307 is open. The Commercial Funnel Golden Gate and Vercel preview checks are green; the rendered address-first entry was visually verified with customer-facing example copy, compact 8px header controls, a content-height scope panel, and nonblank-address button gating. No project submission, production access/mutation, live retrieval, merge, or billing/auth/paywall change was performed.

Purpose: replace the generic AI marketing landing hero with the actual free Quick Site Check entry and make project continuity deterministic for both signed-in and guest/auth-bypass requesters.

Invariant:
- First viewport names Plannera and Quick Site Check, labels the primary input `Site address`, and uses `Run free site check` as the primary action.
- Landing submission preserves `/api/projects/ensure` → `/projects/{id}/workspace?prompt=...&initialAddress=...` with trimmed, safely encoded address seeds, duplicate-submit protection, and retryable on-page errors.
- Launch examples are only `45 Broken Head Road, Byron Bay NSW 2481` and `52 Belgrave St, Kempsey NSW 2440`; no generic Australia prompts or broad nationwide-readiness claims.
- Copy states the Byron/Kempsey NSW pilot scope, the free site/zone/key-LEP-control coverage, DPP follow-up for proposal-specific DCP detail, and the professional-advice limitation.
- Auth-bypass entitlement remains compatible for protected actions but is not treated as an actual signed-in NextAuth state in UI chrome. Sign out appears only for actual signed-in users.
- `/projects` is the canonical requester-scoped project list; `/dashboard` redirects for compatibility. Signed-in requesters see user-owned projects after safe session claim, while guests see only current anonymous-session projects. Deletes are requester-scoped and server-authoritative. The Projects route uses compact operational chrome, a simple workspace list, truthful guest copy, and one primary `New site check` action without decorative stats or generic SaaS project-management claims.

Focused coverage:
- Landing copy/helper tests for literal labels/actions, exact examples, honest pilot/DPP/advice copy, removed fabricated claims, empty-address prevention, and encoded workspace seed query.
- Auth guard test proving bypass `isAuthenticated` remains true while `isSignedIn` remains false for guest/bypass UI chrome.
- Requester project service and API tests for guest-only current-session listing, signed-in safe claim/list, requester-scoped create/delete, and ignoring client-supplied owner/session identity.
- Commercial-funnel golden tests remain required.

Evidence boundary: no schema/migrations, production auth/paywall/billing, production access/mutation/project creation, live retrieval, live-audit completion claim, consultant sending, or broad workspace redesign. Do not run `npm run build` or `npm run vercel-build` for this item.

Verification commands:
- `npx vitest run --config vitest.config.ts src/lib/landing-entry.test.ts src/app/page.content.test.ts src/app/projects/(authenticated)/page.content.test.ts src/components/providers/auth-guard-provider.test.tsx src/lib/projects.requester-scope.test.ts src/app/api/projects/route.test.ts src/app/api/projects/[projectId]/route.test.ts`
- `npm run test:commercial-funnel`
- `npm run lint`
- `npx tsc --noEmit`

## 64) In-workspace commercial funnel navigator and Plannera Check product boundary — DONE/MERGED VIA PR #310 (2026-07-19)

Stacking: Item 64 was implemented on exact Item 63 head `791a4b567d715a4b8b825c0c43d3b544717aa7ed`. PR #308 merged into the Item 63 feature branch on 2026-07-17, not into `main`; integration PR #310 now carries the reviewed Item 64/65 tree to `main`.

Purpose: make the real in-workspace commercial sequence visible without adding a parallel readiness system: Site → Quick Site Check → Detailed Planning Pack → SEE / consultant handoff. Also record that Plannera Check is an in-product acquisition surface, not a separate product/backend, and clean only the workspace shell/planning-path surface so the workspace is truthful and mobile-safe.

Invariant:
- Stage state is derived from current-site/proposal/exact-DPP evidence and the existing `buildCommercialNextAction` result, not from artefact existence alone.
- Stage states are deterministic and limited to complete, current, review needed, and upcoming.
- A current-site unresolved DPP exposes expert review/review-needed without marking SEE ready.
- The dominant next action reuses existing handlers; DPP generation focuses the proposed-works brief when blank rather than issuing a doomed request.
- Stage controls scroll/focus the existing site, Quick Site Check, Detailed Planning Pack, SEE, and expert-review output sections with accessible navigation semantics.
- Feasibility remains available outside the primary four-stage revenue path.
- The workspace shell uses restrained white/charcoal/source-blue/forest accents, compact project/site chrome, truthful `isSignedIn` sign-out UI, and visible `/projects` access for guests and signed-in requesters.

Focused coverage:
- Pure stage mapping for `set_site`, `run_quick_site_check`, `generate_detailed_pack` absent/unresolved pack, `generate_see`, and `export_or_review`.
- Current/completed stage mapping fails closed when quality flags are false.
- Unresolved pack exposes review needed without SEE readiness.
- Workspace static coverage for the four literal stage labels, accessible planning-path nav, target anchors/focus behavior, one primary next action, truthful `isSignedIn` chrome, `/projects` access for guests, and absence of the removed radial gradient, giant dark hero, unsupported Get help/Share workspace controls, and nested commercial card wall.
- Existing commercial-next-action, proposal/DPP selector, QSC/DPP/SEE/referral, auth, and golden-funnel coverage remain required.

Evidence boundary: no schema/migrations, production access/mutation, production project creation, live retrieval, live audit, payment/price/checkout/credit/quota work, auth enablement/policy broadening, native/PWA implementation, consultant sending, readiness claim, merge, or deployed API access. Do not run `npm run build` or `npm run vercel-build` for this item.

Verification commands for this slice: focused stage/static tests, existing commercial-next-action tests, `npm run test:commercial-funnel`, `npm run lint`, and `npx tsc --noEmit`.

Status: DONE/MERGED — PR #308 was stack-merged and the reviewed Item 64 tree reached `main` through PR #310 at merge commit `76c0a7a2e99e12e9731de2e401436d2b8c9292fa`.

## 65) Premium mobile Plannera Check acquisition and evidence reveal — DONE/MERGED VIA PR #310 (2026-07-19)

Implementation PR [#309](https://github.com/RobbieTall/Plannera-ab/pull/309) merged on 2026-07-17 into the Item 64 feature branch, not into `main`. Final reviewed Item 65 head `713f4462e004cf1c14b0c47ab00803f854e53bb6` is carried to `main` by integration PR #310. Its implementation tree began at commit `0e153fe574a4f849190595b057d044e220018d86`, exactly one commit above Item 64 head `bdc9c4a8023510a00faaae90e387650fd6d4962d`; subsequent commits record review corrections and publication metadata. The homepage remains the real product entry with one labelled Site address field, one dominant **Run free site check** action, honest Byron/Kempsey pilot disclosure, and only the approved Byron/Kempsey launch examples. Submitting an address now opens the existing requester-scoped project workspace with a small `check=1` focused-mode query contract rather than a parallel app or backend.

Focused Plannera Check mode reuses the current workspace site-context path, waits for focused mode, enabled site-context mutations, LGA identity, and confirmed spatial/planning identity (parcel, coordinates, or zoning) before calling the existing Quick Site Check endpoint; manual address-only fallback remains blocked with recoverable copy. Progress copy is limited to real states: creating/loading the requester project, resolving the site, retrieving planning controls, and preparing the evidence view. The reveal is inline and mobile-safe, with site identity, LGA/LEP/zone identity, evidence-quality source details, all returned structured controls including optional setback, parking, and active frontage/built form, accessible disclosure for objectives/permissibility/highlighted clauses, and honest unavailable/error states.

After the reveal, the dominant CTA is **Create project in Plannera**. It saves the displayed Quick Site Check through the existing project artefact path for the same project and transitions into the ordinary full workspace without creating another project or reconstructing a different evidence snapshot. Duplicate submission is disabled, equivalent current-site saved QSC snapshots are reused instead of posted again, retry is available after failed checks, and save errors remain recoverable. Ordinary non-Check workspace entry remains unchanged and the Item 64 evidence-derived planning path remains the normal workspace path after promotion.

Explicit deferrals: no Prisma/schema, billing, price, Stripe, credits, quotas, entitlements, auth-policy, PWA/native, consultant sending, production configuration, production API/data mutation, separate product/app/backend, readiness score, or evidence-truth changes.

Tests/checks run in this slice: `npm run test:vitest -- src/lib/landing-entry.test.ts src/app/page.content.test.ts`; `npx tsx --test tests/plannera-check-flow.test.ts tests/plannera-check-acquisition-static.test.ts`; `npm run test:commercial-funnel`; `npm run lint`; `npx tsc --noEmit`; `git diff --check`. No build was run. PR #309 was stack-merged and the reviewed Item 65 tree reached `main` through PR #310 at merge commit `76c0a7a2e99e12e9731de2e401436d2b8c9292fa`.

Remote UI QA completed against source head `452f58335f1f8681eef99a61ef6e847b788746ad` on Vercel preview `https://plannera-2nvmuhksg-robbietalls-projects.vercel.app/`: 320×800, 390×844, and 1440×900 all showed no horizontal overflow; the next-step content was visible in the first viewport; homepage/header controls met the 44px target; long launch addresses wrapped without overlap; and desktop exposed one header-level **My Projects** action. The commercial golden gate and Vercel deployment both passed for that source head.


## 66) Integrate stack-merged Items 64–65 into main — DONE/MERGED (2026-07-19)

Merge-state audit after PRs #307, #308, and #309 were merged found that only #307 had `main` as its base. PR #308 merged into the Item 63 feature branch and PR #309 merged into the Item 64 feature branch. GitHub therefore reported all three PRs merged while `main` still contained only Item 63 at merge commit `b1273aee59d6d1d66f33d2b96ec76dd8c0e018ac`.

Integration PR [#310](https://github.com/RobbieTall/Plannera-ab/pull/310) targets `main` from final reviewed Item 65 branch `codex/implement-premium-mobile-plannera-check`. Before this documentation update, its exact head was `713f4462e004cf1c14b0c47ab00803f854e53bb6`; merge base is Item 63 reviewed head `791a4b567d715a4b8b825c0c43d3b544717aa7ed`. The audited compare contains only the reviewed Item 64 funnel navigator, Item 65 focused Plannera Check flow, their focused tests, and their README/boundary/project-memory documentation.

Integration invariant: a PR is not considered present on `main` merely because GitHub reports it merged. The merge commit must be reachable from `main`, or an explicit integration PR targeting `main` must merge and the resulting `main` tree must be verified. Future stacked PRs must be retargeted to `main` after their parent lands, or closed through one explicit final integration PR; merge state and main reachability must be checked before documentation says live or merged.

Verification completed: PR #310 was mergeable and independently passed Vercel plus Commercial Funnel Golden Gate. Post-merge comparison proves merge commit `76c0a7a2e99e12e9731de2e401436d2b8c9292fa` has the exact reviewed tree `bf6868ff4f752cdd874d0498dea8c415b97abcf9`. No local build, production access/mutation, production project creation, ingestion, or billing/auth implementation was performed by this item.

Status: DONE/MERGED — PR #310 integrated Items 64/65 into `main` at exact merge commit `76c0a7a2e99e12e9731de2e401436d2b8c9292fa`.


## 67) Live funnel correction: property-mapped LEP controls and requester project continuity — DONE/MERGED (2026-07-19)

Post-merge verification: integration PR #310 merged into `main` at exact merge commit `76c0a7a2e99e12e9731de2e401436d2b8c9292fa`. Its tree is exactly the reviewed Item 64/65 tree `bf6868ff4f752cdd874d0498dea8c415b97abcf9`; Item 66 is therefore DONE/MERGED.

Trigger: a real user acceptance run of the approved Byron preset `45 Broken Head Road, Byron Bay NSW 2481` exposed two release-blocking gaps. The focused Check showed Height, FSR, and Minimum lot size as unavailable even though the official NSW EPI Primary Planning Layers service returns property-specific Byron LEP 2014 values at the resolved point: 9m from the Height of Buildings Map, 0.3:1 from the Floor Space Ratio Map, and 40ha from the Lot Size Map. The same run also created a project that appeared in My Projects but failed to open because the list preferred `publicId` while the requester workspace lookup matched only internal `id`.

Invariant:
- Property-specific mapped LEP controls come from the official NSW EPI spatial layers for the confirmed coordinates, selected against the resolved LEP instrument/LGA, and carry the map name plus statutory clause as source evidence.
- Missing, ambiguous, malformed, non-LEP, or failed map responses remain null/unavailable; no zone-wide value is invented from generic clause text.
- Official property map values outrank generic clause-text extraction and legacy project payload controls.
- Every requester-scoped project route must accept internal `id` and `publicId` under the same user/session ownership predicate. Guest session identity must never match a project owned by another user.
- The commercial golden gate includes the official-map parser, Byron focused-control regression, ordinary report source semantics, and requester `publicId` continuity tests.

Evidence boundary: the live acceptance lookup and official NSW map queries were read-only. No production project was created, modified, deleted, claimed, or audited by this item. No schema, billing, auth-policy, PWA/native, DCP pricing, or consultant-send change is included. No local build is run.

Status: DONE/MERGED — PR #311 merged into `main` at exact merge commit `bda25cd7c8a1a70b13af3bae95b649e808933a73`. Its implementation includes source head `e361b3b2ac66095e59fd608461d58460459b4bf8`, the Byron regression correction `6dd4da201e60d71bf0cf1b3402bd843e581e3dba`, and documentation reconciliation `58a60fb0fbe278e90ea5fe8b2fd191169edce39f`.

Post-merge user acceptance on the deployed PR environment succeeded for requester project `proj-798cf4b41f0e44bc8e`: the project was created, appeared in My Projects, reopened through the project menu, and displayed cited property-mapped Byron controls at 41 Julian Rocks Dr (9m height, 0.5:1 FSR, 600m² minimum lot size) with Byron LEP map/clause references. This proves the reported project-continuity defect and mapped-control reveal were corrected in the deployed merged tree; it does not replace the still-open protected production commercial-funnel audit in Item 52.

## 68) Intent-aware Quick Site Check handoff — DONE/MERGED (2026-07-19)

Purpose: preserve the property-first value reveal while closing the missing proposal-intent handoff between free Plannera Check and the paid Detailed Planning Pack.

Invariant:
- Property-specific mapped LEP controls remain site/coordinate scoped and are retrieved before intent capture; proposal wording cannot alter or manufacture height, FSR, minimum-lot-size, zone or source evidence.
- Focused Check requires one concise user-provided development description before **Create project in Plannera** promotion.
- A permissibility pathway is `Cited` only when normalized case, whitespace and dash variants produce exactly one complete statutory land-use-term match in the server-retrieved DB-backed current-zone table. Substrings, fuzzy prose, fallback tables, absent zones and duplicate cross-path matches remain `Unresolved` with no assigned pathway.
- An exact term match still states that the proposal must satisfy the statutory land-use definition and other controls; it is not a development approval or professional advice claim.
- The Quick Site Check artefact persists the exact compacted user description plus the server-recomputed assessment. Client-supplied status, pathway, matched term, citation and detail are never trusted.
- Promotion reuses the same requester project and evidence snapshot. The saved intent seeds the normal workspace proposed-works brief immediately and after reload when no saved DPP brief already establishes a later active proposal.
- Changing the workspace brief after promotion remains supported and continues to trigger the existing exact proposal/DPP mismatch and regeneration rules.

Focused coverage:
- Exact without-consent, with-consent and prohibited statutory terms; case/whitespace/dash normalization; fuzzy prose, fallback evidence and ambiguous duplicate matches.
- Focused report persistence/fingerprint semantics and exact intent extraction for DPP hydration.
- Forged client classification replaced by the server-derived current-zone assessment at QSC persistence.
- Focused UI requires intent, exposes cited versus unresolved language, saves intent in the same QSC request, and hydrates the DPP brief without a second project or URL-only state.

Evidence boundary: no schema/migration, billing, price, checkout, credits, auth-policy change, production data mutation, production project creation, local application build, fuzzy/AI statutory classification, or change to property-map control retrieval. This does not close Item 52 or enable Item 40.

Verification for review: focused intent/static/persistence tests, `npm run lint`, `npx tsc --noEmit`, `npm run test:commercial-funnel`, and the existing secret-free Commercial Funnel Golden Gate. Do not run `npm run build` or `npm run vercel-build` for this item.

Status: DONE/MERGED — PR #312 merged into `main` at exact merge commit `2ec4dc433632160376fb1aa3994ce0116eef6a4a` on 2026-07-19. Its reviewed remote head was `385fdbbeda507ac9a5f534450a433c4b4cf6fe54`; Commercial Funnel Golden Gate run `29673911590` and Vercel passed on that final head. Local `npm run lint`, `npx tsc --noEmit`, and `git diff --check` also passed; no local application build or production access/mutation was performed.

## 69) Consolidate Basic Feasibility into the evidence funnel — DONE/MERGED: PR #313 (2026-07-19)

Purpose: remove the disconnected Basic Feasibility truth path that accepted a second browser-provided development type/site context and ran a fresh AI statutory lookup beside stronger saved Quick Site Check and Detailed Planning Pack evidence. Preserve the useful decision-summary function as one deterministic, proposal-bound Planning Feasibility Summary.

Invariant:
- The normal launch sequence is Property Check → proposal intent → Detailed Planning Pack → Planning Feasibility Summary → SEE / consultant referral.
- A summary request contains only project ID, exact source DPP artefact ID, and expected proposal brief. The authenticated server resolves requester access, current site, exact proposal equality, and intact cited QSC provenance before persistence.
- Address, zone, LGA, development type, verdict, confidence, citations, and site context supplied by the browser are ignored by the strict schema and cannot influence the saved result.
- The summary is deterministic and makes no model or fresh LEP/DCP retrieval call. It carries cited LEP land-use/control evidence and every saved DPP topic state from the exact chain.
- The decision calculation lives in a framework/database-free module; the authenticated artefact service resolves ownership and provenance, then passes only the exact persisted chain into that pure calculation.
- `Blocked` is available only for an exact cited prohibited QSC land-use term whose saved description exactly equals the active DPP proposal. Missing/mismatched intent, absent mapped controls, or unresolved DPP topics fail closed to `Review needed`; an early-planning summary never claims approval.
- Only a `planning_feasibility_summary` whose DPP artefact ID and normalized proposal match the active workspace pack is displayed. Legacy and different-proposal feasibility artefacts remain history only.
- The standalone development-type selector and second AI go/no-go endpoint behavior are removed; the summary appears immediately after the active DPP and before SEE/referral.

Focused coverage:
- Exact cited prohibition produces `blocked`; unresolved DCP evidence produces `unresolved`, never `proceed`.
- Server generation persists the exact DPP/QSC provenance and ignores forged client address/verdict fields.
- Proposal mismatch is rejected before persistence rather than falling back to another pack.
- UI has no second development-type combobox, posts only the exact DPP/proposal binding, and renders cited/unavailable evidence states without decorative verdict icons.

Evidence boundary: PR #313 targets `main` from implementation commit `61ee750e69dfbe68669a2af9db92db3b92b5e3f2`, whose parent is the exact Item 68 merge commit `2ec4dc433632160376fb1aa3994ce0116eef6a4a`. Its initial GitHub tree SHA `9d8a3b456cc4a3b4206da420d8bceb42245d2e08` exactly matched the locally verified tree before the PR was opened. The code-bearing reviewed head is `1cd63292b0f5fa2f12b03b8c3888152d6d183e71`; it includes a test-only exact-text assertion correction after the first Linux run exposed two ambiguous React queries. It adds no schema/migration, billing, checkout, credits, auth-policy change, production access/mutation, production project, live retrieval, consultant sending, or local application build. Existing legacy feasibility artefacts are retained as history.

Verification: local `npm run lint`, `npx tsc --noEmit`, and `git diff --check` passed before publication, together with twenty pure Planning Feasibility Summary and selector tests through Node 22 native TypeScript transformation. After the assertion correction, focused ESLint and `git diff --check` passed locally; a later full local typecheck was polluted only by four untracked stale ` 2` file copies that are absent from GitHub and remain excluded from this PR. On clean code-bearing head `1cd63292b0f5fa2f12b03b8c3888152d6d183e71`, authoritative Commercial Funnel Golden Gate run `29677217105` passed all 49 tests across nine files, including server-generation and React runtime coverage, and Vercel deployment `8qczxPfX6cFBL8AfVC5qxMVh2yEx` succeeded. The following documentation-only commit records this evidence and changes no application or test behavior.

Merge evidence: final reviewed head `25ed7cc4abd75867bc11dbea2968f1f6cb14e4f9` merged to `main` as `b0c80a947be10338561ffb8424b1eda92ed0572d` on 2026-07-19. Final-head Commercial Funnel Golden Gate run `29677315305` and Vercel deployment `A1usKTcWpQzSdZrs4pbjs8FurZnK` both passed.

## 70) Privacy-minimal commercial funnel measurement — DONE/MERGED/DEPLOYED VIA PR #314 (2026-07-24)

Trigger: the commercial-launch goal requires conversion analytics, but the repository currently has no analytics SDK, event service/model, canonical event taxonomy, deduplication contract, or privacy/telemetry disclosure. Do not choose a vendor or scatter browser click tracking through the workspace before the measurement contract exists.

Required contract:
- Measure successful state transitions, not optimistic clicks: site resolved, quality-valid Quick Site Check saved, same-project promotion completed, exact proposal/DPP generated, DPP unresolved, Planning Feasibility Summary generated, exact SEE generated, expert review package generated, and handoff copied/downloaded.
- Define funnel versions and conversion denominators explicitly: Check started → quality Check; quality Check → project promotion; promoted project → DPP; DPP → feasibility summary; commercial-ready DPP → SEE; any DPP → expert referral.
- Server-confirmed writes are authoritative for persisted milestones. Client events are limited to impressions or non-persisting interactions and can never claim generation/payment/referral success.
- Event properties must exclude raw addresses, parcel identifiers, coordinates, proposal text, clause excerpts, chat text, names, email addresses, secrets, and uploaded-document content. Use opaque requester/project identifiers only where retention/consent policy permits; coarse launch-LGA/zone/coverage state may be included only after privacy review.
- Every event has a stable name, schema version, occurred-at time, source, funnel version and idempotency key. Retries, refreshes, hydration and duplicate button presses must not inflate conversion.
- Internal/test/bypass traffic and golden/audit runs must be identifiable and excluded from customer conversion reporting without trusting a browser-supplied flag.
- Define retention, access, deletion, consent/disclosure and vendor/data-location requirements before production collection. No analytics SDK or new production telemetry ships until those requirements are reviewed and the repository contains truthful user-facing privacy disclosure.

Evidence boundary: PR #314 targets the exact Item 69 merge commit `b0c80a947be10338561ffb8424b1eda92ed0572d`. Initial GitHub implementation tree `4adefac9d3fa35692847065603fa551ca6c27a75` exactly matched the locally verified implementation tree before review. Current code-bearing head `16e9e128e329133a45dd959dd1c9eb3c20db9554` has tree `06896f2fe636c4eb710b157e24e41e2f1df2876b`; it contains the narrow follow-up that moves a pure metrics-window helper out of the Next.js route export surface after Vercel exposed the unsupported export. Item 70 does not enable billing, cookies, third-party analytics, marketing pixels, user profiling, production telemetry, or auth/paywall.

Implementation:
- Adds one first-party `CommercialFunnelEvent` ledger and migration. Its fixed enum taxonomy covers check start, resolved site, quality QSC, same-project promotion, DPP generated/ready/unresolved, Planning Feasibility Summary, SEE, expert-review package and verified package copy/download. There is no metadata/property JSON column.
- Every exact transition uses a database-unique SHA-256 idempotency key derived only from funnel version, event name and opaque internal project/source record IDs. Retries, refreshes and duplicate copy/download actions cannot inflate unique-project conversion.
- Persisted milestones are emitted only after the corresponding server write succeeds. Quality QSC and promotion are derived from the final saved report's cited evidence and persisted development intent. DPP readiness comes from the saved server-calculated `commercialReady` result. Copy/download uses a strict three-field endpoint that re-resolves requester access and the exact same-project `review_request` artefact.
- Event collection is fail-closed off unless server environment has both `COMMERCIAL_FUNNEL_ENABLED=true` and `CRON_SECRET`. Preview/test activity, demo projects, server-allowlisted internal/golden projects and the development bypass are excluded by server state, never browser fields. `COMMERCIAL_FUNNEL_EXCLUDED_PROJECT_IDS` may contain approved internal/public project IDs and is not exposed to the client.
- Rows expire after 90 days, are opportunistically pruned on writes/reports, are cascade-deleted with their project or linked artefact, and have a daily Vercel cron at `/api/cron/commercial-funnel-retention`. The endpoint accepts only Vercel's `Authorization: Bearer <CRON_SECRET>` contract.
- `/api/admin/commercial-funnel-metrics` accepts only `x-admin-token`, limits windows to the 90-day retention period, and returns aggregate unique-project counts plus cohort-intersection rates for the documented funnel denominators. It never returns event rows, user IDs, project IDs or output IDs.
- `/privacy`, the landing footer, README, product philosophy and DR-042 disclose the purpose, fixed data boundary, no-third-party/no-advertising position, retention, deletion and operator-only aggregate access.

Verification in this clean Item 70 worktree: production Prisma schema formatting and client generation pass; `npm run lint`, `npx tsc --noEmit`, and `git diff --check` pass. Focused Vitest execution is locally blocked before test collection by the existing macOS policy rejection of Rollup's native binary. On corrected code-bearing head `16e9e128e329133a45dd959dd1c9eb3c20db9554`, authoritative Commercial Funnel Golden Gate run `30063062946` passed 91 Node tests and 69 Vitest tests, including all new ledger, aggregate-metrics, start, retention and verified-handoff coverage; Vercel deployment `9Pp71Pgg81RPeXKjESBWSotYfBxQ` also succeeded. The preceding Vercel deployment failed only because the route module exported the pure metrics-window helper; that helper now lives under `src/lib`, with no metrics-contract change. This following documentation-only commit records the evidence and changes no application or test behavior. The legacy SQLite `prisma/schema.test.prisma` still cannot be formatted/validated because of its pre-existing unsupported `String[]` DCP fields; Item 70 adds the equivalent ledger model but does not alter those legacy fields. No local application build, production database access/mutation, external analytics service, billing, payment, auth policy, live audit or consultant delivery was performed.

Activation boundary: merge and deploy the reviewed migration first, configure a random Production `CRON_SECRET` of at least 16 characters, place any approved golden/internal projects in server-only `COMMERCIAL_FUNNEL_EXCLUDED_PROJECT_IDS`, then deliberately set Production `COMMERCIAL_FUNNEL_ENABLED=true`. Until the enable flag and retention secret both exist, the application records no funnel rows. Enabling measurement is not permission to enable payment or proceed past Item 71.

Merge evidence: final reviewed head `f4cb9d4915d018f0c0c99b58232b487a90888838` merged to `main` as `509b4e83bf1e2b2cd18d5cb98f5658f75112ef90` on 2026-07-24. Final-head Commercial Funnel Golden Gate run `30063261152` and Vercel preview `5TnLpniK8thzJeNYXrFWgaeu9jKe` passed; merged-main Vercel production deployment `FGzcqhvpqkkKPitQBmmvDywRqcpy` also passed. Production measurement remains fail-closed until the documented operator activation sequence is completed.

## 71) Current-release protected Byron/Kempsey golden acceptance — ✅ DONE (2026-07-24)

Production acceptance is proven on the exact deployed current release without mutating either golden project:

- PR #315 merged as `e50e465e82c0453eb87c00a87ef4fb2fe271a2f6`, recording the first protected audit and its honest unresolved terminal states.
- PR #316 merged as `319fb1a6dfc1aca00e1c68aa7fdb09942aaf3b53`, separating accepted terminal journeys from strict commercial readiness while preserving fail-closed citation, identity, site, proposal and provenance checks.
- Vercel production deployment for `319fb1a6dfc1aca00e1c68aa7fdb09942aaf3b53` was Ready before the post-deploy audit.
- Under fresh explicit operator approval, `Commercial Funnel Live Audit #4` ran as workflow run `30071947827`, job `89414497966`, on exact `main` SHA `319fb1a6dfc1aca00e1c68aa7fdb09942aaf3b53`.
- Checkout, dependency installation, controlled read-only audit execution, safe JSON validation, summary printing, artifact upload and final gate enforcement all passed. Audit exit was `0`.

Safe audit result:

- Runner `commercial_funnel_live_audit_runner.v2`, schema `commercial_funnel_audit.v1`.
- Aggregate `acceptedJourney: true`, `commercialReady: false`, `ready: false`. Exit success means both projects reached an accepted terminal journey; it does not relabel unresolved evidence or missing SEE as commercial-ready.
- Byron `proj-bc765ae0290d44699e`, 45 Broken Head Rd, SP3: QSC `ready` with three cited LEP controls; exact-bound DPP `needs_expert_review` with four cited topics and one unresolved topic; SEE `missing` by design; `terminalPath: unresolved_pack_referral`; `acceptedJourney: true`; `commercialReady: false`; validation reasons `[]`.
- Kempsey `proj-6ccd8facab414f1ebd`, 52 Belgrave St, E2: QSC `ready` with one cited LEP control; exact-bound DPP `needs_expert_review` with four cited topics and one unresolved topic; SEE `missing` by design; `terminalPath: unresolved_pack_referral`; `acceptedJourney: true`; `commercialReady: false`; validation reasons `[]`.
- Both next actions are exactly `refer_unresolved_pack_for_expert_review`, supported by `active_dpp_unresolved_topics`, `see_not_applicable_for_unresolved_active_pack`, and `selected_dpp_source_qsc_current_cited`.
- Safe artifact `8588380006`, `commercial-funnel-audit-summary`, is 1,074 bytes with digest `sha256:1035617922b53a80b51d0834b841d711c9d6b3e1efe1346f970c22ba86c229b5` and expires 2026-08-07T06:21:42Z.

Boundary and handoff:

- No project creation, regeneration, backfill, payment, consultant transmission, environment mutation or evidence weakening occurred in the post-deploy audit.
- Do not alter either protected golden project without fresh explicit operator approval.
- The next commercial slice is Item 72: exact project/site/QSC/proposal-bound one-time DCP pack purchase. Payment must purchase the analysis only; it must never upgrade evidence quality or commercial readiness.
- The live-audit workflow success message is corrected in the closure PR to say both projects reached an accepted terminal journey, rather than incorrectly claiming both chains are ready.

## 72) Exact project-bound one-time DCP pack purchase — ITEM 72A FOUNDATION COMPLETE; CHECKOUT NOT LAUNCHED

Purpose: charge once for proposal-specific DCP intelligence without allowing payment state to weaken evidence quality or cross project/site/proposal boundaries. The currently discussed customer offer is an A$29 DCP Deep Dive, but the final product name, tax treatment and price must be operator-confirmed against the commercialisation document before production checkout is enabled.

Item 72A status: ✅ DONE (2026-07-26). PR #318 added the provider-neutral purchase and exact-scope entitlement domain foundation. PR #319 then hardened settlement and terminal lifecycle transitions against replay and concurrency, repaired the executable test harness, and placed the purchase-entitlement suite inside the mandatory Commercial Funnel Golden Gate. Checkout is still not launched: there is no selected payment provider, checkout, webhook, API route, UI, production price/flag/secret, DPP entitlement gate, customer payment event, live provider call, project mutation or consultant delivery. Existing free Detailed Planning Pack generation remains unchanged until the operator explicitly approves checkout launch.

Operator decisions still required before any launch:
- Payment provider.
- Final product name/code/version and production price.
- GST/tax treatment.
- Refund, credit and regeneration policy, including what happens to changed proposals and unavailable evidence.
- Checkout launch approval and operational runbook.

Required contract:
- Checkout is offered only after same-project promotion and a quality-valid current-site QSC plus non-empty proposal brief. The server creates a purchase intent from the owned project, exact QSC artefact ID, normalized proposal fingerprint, product/version and server-configured price; none is accepted from browser display state.
- Payment-provider checkout and webhook handling are server-side, signature-verified and idempotent. A redirect/success page never grants access by itself.
- The durable entitlement names the purchaser/requester, project, site/QSC snapshot, proposal fingerprint, product version, amount/currency, provider transaction and lifecycle state. It cannot unlock another project, changed site or materially changed proposal.
- DPP generation verifies the paid entitlement at the server boundary before retrieval/persistence. Evidence qualification and `commercialReady` remain exactly fail-closed; payment purchases the analysis, not a favourable result.
- Retries for the same paid scope are idempotent and the regeneration/refund policy is explicit. Failed or unavailable evidence produces the promised resolution path without silently consuming value or fabricating controls.
- Test/bypass/admin operation is explicit and server-derived, excluded from customer conversion, and impossible to activate with client fields. Secrets, transaction details and contact data never enter artefact text or analytics properties.

Verification must cover forged checkout fields, replayed webhooks, duplicate delivery, cross-user/project/site/proposal reuse, changed proposal, cancelled/failed/refunded states, guest-to-account claiming, DPP generation without entitlement, and successful exact-scope generation. No payment provider or production price is selected by this documentation item.


Merge and verification evidence:
- PR #318 merged to `main` as `38c3386b3d7d2b234c6074d8858650509610db00`, adding the provider-neutral schema, migration, exact-scope service, tests and DR-044 without enabling checkout or changing free DPP access.
- Review identified replay, terminal-transition and concurrent intent-creation gaps after #318 merged. PR #319 closed those gaps and merged to `main` as `e42d1303a822fbdbd81809c3b21295debc390ae1`.
- Final #319 head `b48811bfe5d7b9eb5f8cb4e39bf76ad477d12116` passed Commercial Funnel Golden Gate run `30182618113` (#87): 105 Node tests and 69 Vitest tests passed with zero failures. Its Vercel preview also passed.
- The commercial gate now executes `tests/purchase-entitlements.test.ts` on every covered PR. Regression coverage includes replay after revoke/refund, guarded and idempotent terminal transitions, concurrent purchase-intent creation, cancellation winning during settlement, exact-scope isolation and privacy-minimal persistence.
- Item 72A completion is a domain-foundation milestone only. It does not approve a provider, price, tax treatment, refund policy, entitlement-gated DPP generation or production checkout.

## 73) Real consultant referral submission and delivery state — QUEUED AFTER ITEM 72

Current truth: Plannera already creates a self-contained, exact-DPP-bound Expert Review Request with cited requirements, gaps, assumptions and review scope, and lets the user copy/download it. That is consultant-ready packaging, not transmission to a consultant, quote request, acceptance, or completed referral.

Minimum launch delivery contract:
- A user explicitly consents to submit one exact saved review-request artefact and supplies only the contact details required for follow-up. The server re-resolves project ownership and exact current DPP/QSC/SEE provenance; stale or changed proposals cannot be submitted.
- Submission persists an immutable package snapshot plus operational status (`submitted`, `acknowledged`, `assigned`, `needs_information`, `declined`, `closed`) and a non-secret audit trail. Retries are idempotent and cannot send duplicate referrals.
- The initial delivery target may be a truthful human-operated Plannera referral queue. Do not claim automated matching, consultant availability, response times, credentials or quote competition until those systems and disclosures exist.
- User-facing confirmation distinguishes “package saved”, “submitted to Plannera”, “sent to consultant”, and “consultant acknowledged”. Copy/download remains available but cannot advance delivery status.
- Contact information and package contents are excluded from analytics events and require reviewed retention, access, deletion and disclosure handling.

Completion evidence requires server tests for ownership/provenance, duplicate submission, stale scope, status transitions and delivery failure; UI tests for explicit consent and truthful states; and an operationally verified non-production delivery target before production enablement.
