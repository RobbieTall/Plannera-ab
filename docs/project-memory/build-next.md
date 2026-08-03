Warning: truncated output (original token count: 45840)
Total output lines: 1375

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

Deploy/live gate: production deployment at merge commit `10ea1d604bb20bd172ea27fdcad882a9c7fc7037` succeeded. The saved-output verification gate remains OPEN: historical Byron/Kempsey QA project IDs previously returned `Project not found`, no production test project was created for this gate, and documentation must not claim live saved-output QA passed until a fresh production-safe save…15840 tokens truncated… address`, and uses `Run free site check` as the primary action.
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

## 72) Exact project-bound one-time DCP pack purchase — ITEM 72C COMPLETE; PRODUCTION CHECKOUT NOT ACTIVATED

Purpose: charge once for proposal-specific DCP intelligence without allowing payment state to weaken evidence quality or cross project/site/proposal boundaries. The approved offer is the Planning Controls Pack at A$49.00 total including GST.

Item 72A status: ✅ DONE (2026-07-26). PR #318 added the provider-neutral purchase and exact-scope entitlement domain foundation. PR #319 then hardened settlement and terminal lifecycle transitions against replay and concurrency, repaired the executable test harness, and placed the purchase-entitlement suite inside the mandatory Commercial Funnel Golden Gate. Checkout is still not launched: there is no selected payment provider, checkout, webhook, API route, UI, production price/flag/secret, DPP entitlement gate, customer payment event, live provider call, project mutation or consultant delivery. Existing free Detailed Planning Pack generation remains unchanged until the operator explicitly approves checkout launch.

Item 72B status: ✅ IMPLEMENTED, NOT ACTIVATED (2026-07-26). Stripe hosted Checkout is implemented for the server-owned `planning_controls_pack` `v1` offer at A$49.00 total including GST, with exact-scope authenticated checkout/status routes, raw-body signature-verified idempotent webhook lifecycle with exact paid-fact validation and non-2xx reconciliation on contradictory money events, atomic opaque provider references, provider-confirmed full-refund revocation, minimal workspace UI and a feature-flagged DPP generation entitlement boundary. `PLANNING_PACK_CHECKOUT_ENABLED` is false/absent by default, so free DPP behavior is preserved and builds/previews require no Stripe configuration. Production checkout is explicitly not activated; no production secrets/flags were changed and no live charge was made.

Approved retry/refund contract: the same exact requester/project/current-site QSC/proposal fingerprint/product/version may retry or regenerate without another payment; any changed scope requires a new purchase. Payment never upgrades cited/unresolved evidence. A persisted truthful pack including unresolved topics is delivered value for expert review. Only inability to generate and persist because of system/retrieval failure triggers a full original-method refund, and Plannera records `REFUNDED` only after provider confirmation.

Activation gates still required before any launch:
- Explicit production checkout approval and an operator runbook covering Stripe configuration, webhook health, reconciliation, support and confirmed-refund verification.
- Stripe Tax registration/settings and an appropriate default product tax code must be configured and verified without hard-coding a tax code in Plannera. Protected Stripe test-mode acceptance must show the Australian billing case itemises A$4.45 GST inside the fixed A$49.00 customer total.
- Protected non-production lifecycle evidence is complete for the accepted release; Production activation still requires the established current-release Byron/Kempsey gate and explicit operator approval.
- Production secrets/URLs and the feature flag must be configured only during the separately approved activation change.

Required contract:
- Checkout is offered only after same-project promotion and a quality-valid current-site QSC plus non-empty proposal brief. The server creates a purchase intent from the owned project, exact QSC artefact ID, normalized proposal fingerprint, product/version and server-configured price; none is accepted from browser display state.
- Payment-provider checkout and webhook handling are server-side, signature-verified and idempotent. A redirect/success page never grants access by itself.
- The durable entitlement names the purchaser/requester, project, site/QSC snapshot, proposal fingerprint, product version, amount/currency, provider transaction and lifecycle state. It cannot unlock another project, changed site or materially changed proposal.
- DPP generation verifies the paid entitlement at the server boundary before retrieval/persistence. Evidence qualification and `commercialReady` remain exactly fail-closed; payment purchases the analysis, not a favourable result.
- Retries for the same paid scope are idempotent and the regeneration/refund policy is explicit. Failed or unavailable evidence produces the promised resolution path without silently consuming value or fabricating controls.
- Test/bypass/admin operation is explicit and server-derived, excluded from customer conversion, and impossible to activate with client fields. Secrets, transaction details and contact data never enter artefact text or analytics properties.

Verification must cover forged checkout fields, replayed webhooks, duplicate delivery, cross-user/project/site/proposal reuse, changed proposal, cancelled/failed/refunded states, guest-to-account claiming, DPP generation without entitlement, and successful exact-scope generation. Item 72B implements the approved provider and terms without activating production checkout.


Senior-review hardening evidence: behavioral tests now execute the checkout controller, Stripe adapter request, signature-verification boundary, normalized event application, DPP entitlement boundary and purchase lifecycle service rather than regex-matching source. They prove already-entitled checkout makes no new purchase/provider call, unpaid redirect grants nothing, exact paid settlement and duplicate replay, paid-fact mismatch denial, cross-session denial, non-2xx contradictory transitions, durable refund-before-paid, partial-refund rejection, atomic reference races, feature-off compatibility and feature-on pre-generation denial. The Commercial Funnel Golden Gate runs these tests automatically.

Merge and verification evidence:
- PR #318 merged to `main` as `38c3386b3d7d2b234c6074d8858650509610db00`, adding the provider-neutral schema, migration, exact-scope service, tests and DR-044 without enabling checkout or changing free DPP access.
- Review identified replay, terminal-transition and concurrent intent-creation gaps after #318 merged. PR #319 closed those gaps and merged to `main` as `e42d1303a822fbdbd81809c3b21295debc390ae1`.
- Final #319 head `b48811bfe5d7b9eb5f8cb4e39bf76ad477d12116` passed Commercial Funnel Golden Gate run `30182618113` (#87): 105 Node tests and 69 Vitest tests passed with zero failures. Its Vercel preview also passed.
- The commercial gate now executes `tests/purchase-entitlements.test.ts` and the behavioral `tests/planning-pack-checkout.test.ts` on every covered PR. Regression coverage includes replay after revoke/refund, guarded and idempotent terminal transitions, concurrent purchase-intent creation, cancellation winning during settlement, exact-scope isolation and privacy-minimal persistence.
- Item 72A was the domain foundation. Item 72B implements the subsequently approved provider, terms, refund boundary and feature-gated entitlement check; it does not approve or perform production activation.

### Item 72C — protected Stripe test-mode acceptance infrastructure — ✅ COMPLETE (2026-08-02)

Item 72C adds the manual-dispatch, protected `stripe-test-acceptance` environment contract, fail-closed executable runner, safe artifact, focused tests, and operator runbook. It requires an operator-provided non-production deployment, dedicated requester/projects/current QSC/proposal, test key/session cookie, and one manual Stripe-hosted Australian test payment. It validates Stripe provider facts (test mode, paid payment session, one AUD 49.00 line with AUD 4.45 tax), webhook-settled exact entitlement, duplicate Checkout denial, changed-proposal and cross-project/site/QSC isolation, and three-phase before-payment/paid/refunded lifecycle and full-refund terminal reconciliation. It never prints raw provider responses or address/proposal/contact/card/secret data and never creates an environment, configures a secret, stores card data, aims at Production, or treats a redirect as settlement.

Protected test-mode acceptance completed all three phases on one dedicated Checkout: `before_payment` run `30732647096`, corrected `paid` run `30734666290`, and `refunded` run `30735071908` passed. The sandbox payment was A$49.00 AUD with A$4.45 GST; exact-scope entitlement, changed-scope denial, one DPP creation, full refund, webhook-backed entitlement removal, and preservation of the project/QSC chain were independently observed. Safe final paid/refunded artifacts were `8829151091` and `8829295014`; the latter has digest `bdff979152e7b14d6993566bc4960e9014e48033d4112f11803a92de0a8ad015` and expires 2026-08-16. PR #331 repaired the verifier-only public/internal project-ID mismatch exposed by the first paid run and merged as `ec8875138462c50b98da2151b2ba3be1e86d0259` before the final green paid/refunded runs.

Item 72C proves the protected non-production lifecycle; it does not activate checkout. Production `PLANNING_PACK_CHECKOUT_ENABLED` remains false/absent, and Production keys, webhook destination, payment data, projects and configuration were untouched. Production activation remains a separate explicit operator decision. The next build priority is Item 73.

## 73) Real consultant referral submission and delivery state — ✅ COMPLETE, NOT PRODUCTION-ACTIVATED (2026-08-03)

Current truth: Plannera already creates a self-contained, exact-DPP-bound Expert Review Request with cited requirements, gaps, assumptions and review scope, and lets the user copy/download it. That is consultant-ready packaging, not transmission to a consultant, quote request, acceptance, or completed referral.

Minimum launch delivery contract:
- The Planning Feasibility and Delivery Plan classifies each professional input as `Required`, `Conditional`, `Recommended`, or `Not identified from current evidence`, with the exact trigger, source, question and expected deliverable. It never promises that no later council or professional request will arise.
- A user explicitly consents to submit one exact saved review-request artefact and supplies only the contact details required for follow-up. The server re-resolves project ownership and exact current DPP/QSC/SEE provenance; stale or changed proposals cannot be submitted.
- Submission persists an immutable package snapshot plus operational status (`submitted`, `acknowledged`, `assigned`, `needs_information`, `declined`, `closed`) and a non-secret audit trail. Retries are idempotent and cannot send duplicate referrals.
- The initial delivery target may be a truthful human-operated Plannera referral queue. Do not claim automated matching, consultant availability, response times, credentials or quote competition until those systems and disclosures exist.
- User-facing confirmation distinguishes “package saved”, “submitted to Plannera”, “sent to consultant”, and “consultant acknowledged”. Copy/download remains available but cannot advance delivery status.
- Contact information and package contents are excluded from analytics events and require reviewed retention, access, deletion and disclosure handling.

Completion evidence requires server tests for ownership/provenance, duplicate submission, stale scope, status transitions and delivery failure; UI tests for explicit consent and truthful states; and an operationally verified non-production delivery target before production enablement.

Implementation merged in PR #333 (`d536ae2848cf96c36aca65191b91d1df6237781c`):

- Expert Review Request generation deterministically derives a versioned consultant-needs matrix from the exact current Quick Site Check and Planning Controls Pack. Statuses are limited to `Required`, `Conditional`, `Recommended`, and `Not identified from current evidence`; every identified need carries LEP/DCP evidence or an explicit `PACK_GAP`, while bushfire, flood, ecology, heritage and contamination/geotechnical remain visibly unassessed by the current evidence chain rather than being declared unnecessary.
- Each identified discipline receives its own scope, questions, evidence and limitations inside a `consultant-needs.v1` review package. The existing copy/download export includes the matrix and discipline briefs.
- A new provider-independent `ConsultantReferral` model persists one immutable, SHA-256-digested package snapshot per exact project/DPP/QSC/proposal scope, separate minimum follow-up contact fields, consent version/time, human-queue target and a delivery event ledger. Exact-scope retries are idempotent, contact replacement conflicts, and concurrent unique races return only the winning same-contact submission.
- User submission re-resolves requester access, current site, active proposal, intact QSC/DPP provenance, optional exact SEE provenance, and a byte-equivalent server-recomputed needs matrix before persistence. Legacy, stale, altered or different-proposal packages fail closed.
- Direct submission requires explicit consent and truthfully distinguishes package saved, submitted to Plannera, sent to consultant and consultant acknowledged. Copy/download cannot advance delivery. The operational states are `SUBMITTED`, `ACKNOWLEDGED`, `ASSIGNED`, `CONSULTANT_ACKNOWLEDGED`, `NEEDS_INFORMATION`, `DECLINED`, and `CLOSED`.
- The protected operator API lists the human queue and performs guarded, append-only status transitions. A protected deletion endpoint plus a daily bearer-authenticated retention job delete declined/closed records 180 days after terminal state and support verified early deletion requests.
- Submission emits one property-free, server-confirmed `CONSULTANT_REFERRAL_SUBMITTED` funnel milestone only after durable persistence. Contact fields and package contents are structurally absent from that event.
- Production remains fail-closed. Submission requires both `CONSULTANT_REFERRALS_ENABLED=true` and `CONSULTANT_REFERRAL_QUEUE_TARGET=plannera_human_queue`; neither is changed by this implementation.
- A manual, environment-protected non-production acceptance workflow and `docs/operations/consultant-referral-queue.md` prove preflight emptiness, synthetic consented submission, protected queue visibility, ordered operator transitions, user-safe status, safe artifact output and cleanup. It refuses production/localhost/non-exact targets and any pre-existing referral scope.

Completion evidence:

- Clean application CI passed on PR #333 head `1ff996a3779a24e6f0d0f18c66832d017de2db35`: Commercial Funnel Golden Gate run `30745647472` generated Prisma successfully, then passed 138 Node tests and 77 Vitest tests with zero failures. The latest hardening independently recomputes the stored package-snapshot digest, requires non-empty exact QSC/DPP-bound consultant needs and discipline packages, and verifies the precise user-visible delivery-event sequence during protected acceptance. Local lint, typecheck and diff checks passed; the focused local `tsx` invocation could not start because the shared checkout points at an incompatible esbuild binary, so the clean remote gate is the authoritative execution evidence.
- Vercel Preview deployment `CE8rgtqopLHRisCAWk4FmEEBgxKt` for exact head `1ff996a3779a24e6f0d0f18c66832d017de2db35` reached `Ready` in 1m 59s after integration provisioning completed in 3s. After merge, the branch-only acceptance configuration was loaded by Ready redeployment `LqcHskjGm` at `plannera-ab-git-feat-item-73-consul-dae87e-robbietalls-projects.vercel.app`. Only that Preview branch has `CONSULTANT_REFERRALS_ENABLED=true`, `CONSULTANT_REFERRAL_QUEUE_TARGET=plannera_human_queue`, and its dedicated admin token. Production remains false/absent and untouched.
- GitHub environment `consultant-referral-test-acceptance` permits only `main`, requires reviewer `RobbieTall`, disallows administrator bypass, and holds the exact allowed/base Preview URL plus dedicated encrypted cookie, Vercel bypass and admin-token secrets. One new non-customer Byron SP3 project produced a cited Quick Site Check, an exact proposal-bound Planning Controls Pack with two cited and three honestly unresolved topics, and a `consultant-needs.v1` review-request package.
- Initial protected run `30771610148` failed before contacting the app because the CLI used top-level `await` under CommonJS `tsx`; it made no referral mutation. PR #334 added a real CLI regression, passed Commercial Funnel Golden Gate run `30771992616`, reached a Ready Vercel Preview after one operator-approved stale Neon Preview deletion, and merged as `299145bfa7158c0cc5495cae2812dccbef6b9c2b`.
- Protected acceptance run `30772575070` on exact `main` commit `299145bfa7158c0cc5495cae2812dccbef6b9c2b` passed. Safe artifact `8841017675` (`sha256:78cca470ff0e340349a5194939a7ba846159257401ff40dc296d8f0cc8ee1e77`) records every check true: exact configuration, empty preflight, consented submission, protected operator-queue visibility, transitions, user-safe status and cleanup. The observed sequence was exactly `SUBMITTED` → `ACKNOWLEDGED` → `ASSIGNED` → `CONSULTANT_ACKNOWLEDGED` → `CLOSED`; the immutable package digest was independently verified and the synthetic referral was deleted at the end.
- Item 73 is complete as protected non-production capability and evidence. Production activation remains a separate explicit operator decision; completion does not claim automated matching, consultant availability, credentials, quotes or response times.

## 74) Submission-grade SEE and Byron/Kempsey whole-LGA commercial readiness — IN PROGRESS (2026-08-03)

Purpose: finish the second paid product and prove both launch councils across their complete current LEP zone sets before expansion. The commercial SEE list price is **A$749 before credits**. One settled, unrefunded A$49 Planning Controls Pack for the same requester/project/current-site QSC/normalized proposal may be consumed once as an A$49 credit, leaving **A$700 payable**. The credit is exact-scope, single-use, non-transferable, not cash-redeemable, and cannot upgrade evidence confidence or readiness.

### 74A — Evidence intake and spatial provenance
- Index supported project uploads rather than merely storing them. Extract PDF/DOCX/spreadsheet/text content, add OCR fallback for scans, retain source title/page/date/hash, and expose `Ready`, `Partially readable`, `Image only`, or `Needs review` status.
- Treat maps and plans as evidence objects with authoritative source, capture/effective date, layer/legend, site identity, user-confirmed observation and limitation. Stored screenshots alone do not prove a constraint.
- Reconcile uploaded and spatial facts against the exact proposal and statutory chain. Conflicts, stale files and unsupported claims remain visible and block affected final sections.
- Returned consultant reports enter the same evidence pipeline; referral completion does not automatically make a report accepted or applicable.

Implementation checkpoint — evidence extraction and provenance foundation (`feat/item-74-evidence-intake`):
- Workspace uploads now retain SHA-256 source hash, extraction method/time/metadata, PDF page count, extracted text, readability status, review reason, indexing status/time and indexing failure detail. Existing uploads default to `Needs review`/not indexed rather than acquiring unsupported readiness.
- PDF extraction uses real page-aware parsing and preserves page numbers on citation chunks. DOCX raw text, XLSX worksheet/cell text, CSV and plain text are supported; DOCX parser warnings demote the upload to `Partially readable`. Legacy DOC/XLS and ZIP fail closed with conversion/review guidance.
- Image uploads and text-empty scanned PDFs are marked `Image only`; they do not enter retrieval until OCR plus visual review exists. OCR is therefore still open work, not implied by this checkpoint.
- Readability and semantic indexing are separate persisted facts. Extracted evidence is chunked with source title, hash, extraction method and page/sheet provenance. Embedding/index failure leaves the upload visible with `FAILED` indexing instead of treating it as SEE-ready.
- The workspace Sources panel exposes `Ready`, `Partially readable`, `Image only`, or `Needs review` and the review/indexing reason. A stored upload is no longer labelled generically as synced.
- Regression coverage proves hashing/text extraction, PDF page provenance, image-only/legacy/parser-failure demotion, successful indexing and visible indexing failure. On 3 August 2026, Commercial Funnel Golden Gate run `30776099344` passed on head `7313eba` (155 Node tests and 77 Vitest tests, zero failures) and the Vercel Preview deployment completed successfully with the additive Prisma migration and full application build.

Remaining before 74A is complete: add an asynchronous OCR/provider path with operator-visible retry/review; model map/plan source, layer/legend, dates, site identity, observation and limitation; add proposal/statutory reconciliation and conflict/freshness gates; and make SEE section readiness consume only readable, successfully indexed, accepted evidence.

### 74B — Professional SEE compiler and paid entitlement
- Replace the current pre-SEE `.txt` memo as the commercial endpoint with a versioned living SEE that becomes final only when all required inputs are resolved or explicitly routed to professional review.
- Compile site/context, proposal, statutory framework, zone objectives/permissibility, LEP standards, DCP compliance, applicable SEPPs, section 4.15 considerations, natural/built/social/economic impacts, access/parking, hazards, servicing/waste/stormwater, mitigation, suitability, public interest, conclusion, source register and appendices as applicable to the exact proposal.
- Every material statement must cite legislation, DCP, a spatial source, an uploaded report, or labelled user-provided information. Page/layer references and a source schedule are mandatory; missing evidence is not filled from generic model knowledge.
- Produce an editable DOCX and professionally rendered PDF with stable headings, tables, maps/figures, page numbers, document metadata, revision history and appendix/report schedule. Copy/`.txt` remains convenience output only.
- Add a provider-neutral `see_document` purchase/entitlement and credit-consumption ledger. Checkout derives A$749, eligible A$49 credit and A$700 balance server-side, shows applicable GST truthfully, and prevents replay, cross-scope use, refunded/revoked-pack use and double consumption.
- Regeneration preserves immutable versions and identifies which sections changed after new evidence; it never silently overwrites the previously purchased document.

### 74C — Whole-LGA coverage and flight acceptance
- Inventory the complete current authoritative Byron and Kempsey corpus: LEP zones/objectives/land-use tables and mapped controls; every relevant DCP part/chapter/appendix; relevant state instruments, contributions/planning policies, lodgement guidance and available authoritative spatial layers. Store source URLs, effective dates, hashes and freshness state.
- Build a coverage matrix for every current zone code and exact LEP land-use term. Preserve statutory terms while grouping them into maintainable assessment/document families; never infer permissibility from a family.
- Make DCP material table-aware and stably citable. Structured controls are promoted only where source text supports them; absent values remain `Unavailable` or `Needs Expert Review`.
- Flight-test representative permitted, consent-required and prohibited developments across every zone, plus changed-site/proposal, stale-source, map conflict, unreadable upload, missing report, referral-return and credit/payment cases.
- Require the complete journey: investigate → Quick Site Check → paid pack → feasibility/consultant triage → direct SEE or referral → report upload → final DOCX/PDF → optional review/submission. Inspect rendered documents, citations, source coverage and privacy, not only JSON or route success.
- Add freshness monitoring and fail-closed coverage demotion when a source URL, effective date, hash, parser result or golden case changes. Obtain explicit operator sign-off before either LGA is described as commercially flight-ready.

Success signal: any address resolving to a current Byron or Kempsey zone and any exact development term in its LEP receives a truthful cited or explicitly unresolved journey, with a proposal-specific paid pack and either a polished evidence-backed SEE or a complete consultant pathway. No fabricated control, uncited material claim, unexamined upload/map, cross-scope credit or unsupported readiness claim is allowed.

## 75) Repeatable LGA Pack Registry and paid just-in-time onboarding — QUEUED AFTER ITEM 74

Do not start this slice until Item 73 has a verified non-production referral target and Item 74 has explicit Byron/Kempsey whole-LGA and document-flight sign-off.

Purpose: make later LGA expansion a configure, ingest and verify process while preserving the user-funded just-in-time path.

Minimum contract:
- A new-LGA user receives available LEP/state preliminaries immediately. Purchasing the A$49 proposal-specific Planning Controls Pack queues source discovery, retrieval, ingestion and QA; the project shows queued/in-progress/ready/failed status, an honest service target, interim limitations and persistent notification.
- Add a versioned LGA manifest covering LGA code, LEP instrument, DCP title/effective date, authoritative document/part URLs, parser profile, spatial sources, council policies, priority topics, golden addresses and expected extraction counts.
- Use one generic pipeline for fetch, hashing, archival metadata, text/table extraction, OCR fallback, cited chunking and coverage transitions. Council-specific adapters remain explicit only where a source genuinely breaks the generic contract.
- Generate a privacy-safe QA report and require source, zone, citation, structured-control, spatial and golden-address gates before promotion from searchable to structured or verified states.
- Monitor URLs, effective dates and hashes so amendments cannot silently leave a council marked current. Searchable coverage supports cited guidance; only reviewed rule packs support deterministic claims or higher document automation.
- LGA preparation is shared infrastructure after completion, but each A$49 purchase remains a proposal-specific analysis and may earn only its own exact-scope SEE credit.

Success signal: a clean text-PDF council can be registered, prepared and made searchable without application branching, then promoted through repeatable automated/operator QA and notified back to the paying project without claiming whole-LGA verification from one site or zone.
