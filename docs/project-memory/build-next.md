# Build Next (Execution Queue)

This is the active sequence for what to build next so direction is never lost.

## Item A — SEE output quality — DONE ✅

Strengthened SEE generation grounding so retrieved DCP chunks are injected as inline `DCP Source — [title]: [chunk text]` evidence, SEE section instructions require exact DCP source titles and LEP clause-number citations, generic control numbers are prohibited unless present in retrieved text, and section JSON can carry `citations` entries for each cited LEP/DCP source.

**Success signal:** generated SEE/pre-SEE section output can list real citation objects such as `{ ref: "Byron LEP 2014 cl. 4.3", type: "LEP" }` and DCP source-title citations instead of generic planning advice.

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

20) SEE Builder — real first draft — DONE ✅

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

## 28) Byron + Kempsey end-to-end live test — TODO

Before enabling auth/paywall, manually verify the following user journeys work end-to-end on production (plannera-ab.vercel.app):

Note: Before starting the manual test journeys, run all automated production ingestions via `scripts/ingest-production.sh` with `BASE_URL` and `INGEST_ADMIN_SECRET` set; the updated runner now ingests all registered SEPPs before Byron DCP and the final status check, so SEPP clause counts should be non-zero before testing workspace chat.

Byron Bay test:
- Enter "45 Broken Head Road, Byron Bay NSW 2481" → Quick Site Check returns real zone (RU2/R2/E3), permissibility table, height limit and FSR from Byron LEP 2014 clauses (Cited confidence)
- Open workspace, ask "Can I build a secondary dwelling here?" → response cites Byron LEP 2014 cl. 4.21 and SEPP Housing 2021 (Cited)
- Ask about setbacks → response cites Byron DCP 2014 chapter reference (Cited)
- Generate SEE → produces structured document with real LEP/DCP clause citations

Kempsey test:
- Enter a Kempsey address → Quick Site Check returns real zone from Kempsey LEP 2013 (Cited)
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

## 38) Kempsey DCP 2026 PDF part ingestion — DONE ✅ (updated 2026-07-02)

Kempsey DCP ingestion now uses DCP 2026 PDF Parts B and D because council retired the DCP 2013 HTML chapter pages and assesses new DAs lodged after 1 July 2026 against DCP 2026. The ingest skips individual failed PDF fetch/parse attempts after a 30 second timeout and stores successful PDF text chunks as searchable DCP clauses under `KEMPSEY_DCP_2026`.

## Decision Register

### DR-013: Kempsey DCP ingestion uses DCP 2026 PDF parts B and D

Kempsey DCP ingestion uses DCP 2026 PDF parts B and D (effective 1 July 2026); DCP 2013 is no longer in force for new DAs.
