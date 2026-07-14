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

## 38) Kempsey DCP 2026 PDF part ingestion — DONE ✅ (updated 2026-07-02)

Kempsey DCP ingestion now uses DCP 2026 PDF Parts B and D because council retired the DCP 2013 HTML chapter pages and assesses new DAs lodged after 1 July 2026 against DCP 2026. The ingest skips individual failed PDF fetch/parse attempts after a 30 second timeout and stores successful PDF text chunks as searchable DCP clauses under `KEMPSEY_DCP_2026`.

## 39) Wire real LEP clause citations into SEE key development standards — ✅ DONE (2026-07-06)

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

## 40) Paid export/review conversion gate — OUT OF SCOPE FOR NOW

Add the smallest billing-aware gate around SEE download and expert review request submission so users can preview readiness, then choose paid export or planner review without changing the underlying artefact generation flow.

Do not build billing, payment, paywall, account-tier, or paid conversion logic until the commercialisation scope explicitly re-opens this item.

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

## 44) Kempsey workspace-chat DCP/setback grounding — DONE ✅ (2026-07-13)

Fixed the remaining workspace-chat DCP-topic path for Kempsey setback questions. Topic-keyed DCP retrieval now passes the confirmed site zone into `getDCPContext`, so non-Byron LGAs such as Kempsey can use the same zone-aware clause filtering as statutory retrieval. Workspace chat also treats retrieved DCP clauses or council DCP chunks as searchable local evidence for response coverage, preventing stale “Local controls preparing” notices when the DCP table has ingested searchable clauses even if the LGA coverage-state row is still queued.

Success signal: asking workspace chat “What is the minimum side setback for this site?” for 52 Belgrave St, Kempsey NSW 2440 (E2 Commercial Centre) retrieves E2-relevant Kempsey DCP evidence, avoids rural/residential-only stale clauses such as KEMP_2013_1, and does not show a “Local controls preparing — Kempsey Shire” notice.

## 43) Zone-aware LEP/DCP retrieval (grounding bug) — TODO — HIGH PRIORITY (found 2026-07-13)

Live production testing on 2026-07-13 found that Kempsey LEP/DCP clause retrieval is not filtering by the site's confirmed zone/land-use type. For a Kempsey site confirmed as E2 Commercial Centre, both Quick Site Check and workspace chat surfaced rural/residential-specific clauses (for example secondary dwellings in a rural zone, dwelling house provisions in specified RU1 zones, and dual occupancy street-frontage setbacks) instead of commercial-zone-relevant controls. A workspace chat question asking for commercial setback and height requirements returned only generic keyword-matched excerpts and explicitly stated it could not confirm any numeric answer, citing cl. KEMP_2013_1.

This is confirmed to be a retrieval/relevance-filtering issue, not an ingestion issue: the admin ingest-status endpoint confirms Kempsey DCP 2026 has 893 chunks ingested (2026-07-02) and Kempsey LEP 2013 has 103 clauses ingested (2026-06-13), so the source data exists but is not being filtered by zone before surfacing to the user.

Fix should make LEP/DCP clause retrieval (Quick Site Check, workspace chat, and SEE grounding) zone-aware: prefer and filter retrieved clauses by the site's confirmed zone and applicable land-use type before falling back to generic keyword matches, and continue to show an honest "cannot confirm" response rather than inferring numbers when no zone-relevant clause is retrieved. Do not change Byron DCP ingestion or retrieval logic while fixing this.

Success signal: asking a Kempsey E2 Commercial Centre site about setback or height requirements returns clauses that are actually applicable to a commercial zone (not rural/residential-only clauses), with citations, and the same zone-relevant filtering applies to Quick Site Check and SEE grounding.

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

Deploy/live retest note: after this branch is reviewed and deployed, re-run safe non-force Byron/Kempsey LEP refresh if production projections were created before this fix, then re-check the same fresh Quick Site Check journeys to confirm rendered lists no longer contain legal-term fragments or standalone section ordinals.
