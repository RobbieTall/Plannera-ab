Warning: truncated output (original token count: 42563)
Total output lines: 1347

# Decision Register

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

Status: DONE/MERGED/DEPLOYED/CONFIGURED. The protected lane merged in PR #295 at exact merge commit `5582c2e83c0d3195805424e4c6a72703b221c916` (reviewed head `fb752ea50ae307907549b945f6e7160920a806be`) and deployed successfully via Vercel deployment target `https://vercel.com/robbietalls-projects/plannera-ab/fWBS4p1HGRTDzq339Ck6uRvS8Ssp`. The protected environment was subsequently configur…12563 tokens truncated…ain outside repository documentation.

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

## 2026-08-25 - Persist exact commercial scope before paid artefact binding

Decision: A paid Item 74H artefact must derive its eligibility from the commercial binding stored with the persisted assessment, not from a new caller-supplied object.

Rationale:

- A transient eligibility object is not durable provenance and could diverge from the assessment that was originally accepted.
- The exact scope digest binds the site-evidence digest, control version, road category, applicable minimum, proposed measurement and deterministic outcome.
- Persisting that binding makes idempotent replay differences detectable.
- Rechecking policy before returning an existing paid binding prevents stale evidence, stale controls or reduced trust from bypassing current rules.
- `MERIT_ASSESSED` is a valid labelled scope, not a false compliance result, and requires the same evidence currency as `PROCEED`.
- Submission SEE binding requires operator-approved trust.

Consequence: Free and unresolved assessments may persist without a commercial binding, but no paid artefact can bind. Production checkout remains disabled independently of eligibility.

## 2026-08-28 - Private storage acceptance does not establish trusted evidence

Decision: Accept the protected Preview private Blob and deny-all Sandbox lifecycle as infrastructure proof only. A private object remains quarantined until a server-authoritative malware scan records an exact-hash, current-engine and current-definition `CLEAN` result and a trusted operator separately verifies evidence applicability. Storage success, authenticated retrieval, matching hashes and Sandbox isolation cannot unlock the A$49 Planning Controls Pack or A$749 submission SEE.

Rationale:

- The accepted synthetic flight proved one private write, replay reuse, denied unauthenticated access, authenticated and isolated hash equality, Sandbox stop, deletion and zero object residue.
- The flight intentionally recorded malware scan `NOT_EXECUTED` and evidence review `PENDING`; interpreting either as clean or verified would fabricate trust.
- The temporary branch-scoped activation switch was deleted and the clean Preview deployment returned `SKIPPED_FEATURE_DISABLED`.
- No real document, Production environment, Production schema/data, payment or checkout state was accessed or changed.

Consequence: the next Item 74H slice is a fail-closed scanner record and operator-review promotion using synthetic safe content. Real Byron documents and paid eligibility remain blocked until that chain is accepted.

Reference: docs/operations/item74h-private-blob-preview-activation.md; docs/operations/item74h-malware-scanning-architecture.md

## DR-051 — A Map Image Is Evidence Only After Site-Bound Review

Status: Active

Decision: a map screenshot or plan image is an immutable capture, not proof that a mapped constraint applies. Spatial evidence must bind the original image hash to the exact confirmed site fingerprint, source authority and URL, selected layer or plan topic, legend state, capture/effective/source-check dates, user-confirmed observation and explicit limitation. Government and council captures require an authoritative URL. Future dates, absent topics, unconfirmed observations and unexplained legend gaps fail closed.

The mutable fact is the review decision, not the captured source. Spatial evidence begins `Pending review` and may become `Accepted`, `Rejected`, `Conflict` or `Superseded`; each transition appends an actor/time/note event and uses optimistic versioning. Acceptance is refused when the project site has changed, the source-check window is older than 90 days, or the legend is unresolved. Legacy screenshots remain visible but cannot support a final SEE without recapture under this contract.

Downstream document readiness may consume only accepted, current-site, non-expired spatial evidence. Pending, conflicting, stale, site-mismatched or legend-unresolved evidence remains an explicit blocker for the affected SEE topics and must never be converted into a confident statement by model inference.

Accepted or conflicting spatial evidence must additionally name one or more finite SEE evidence topics. Layer names remain immutable source metadata and are never heuristically converted into section applicability. A legacy accepted observation without topic assignment fails closed until reviewed again.

Reference: docs/project-memory/build-next.md Item 74A; DR-048; DR-050

## DR-052 — Readable Uploads Require Exact-Scope Planning Acceptance

Status: Active

Decision: successful storage, text extraction and indexing make an uploaded document retrievable, not applicable. Every project upload begins `Pending review`. A planning-use decision must resolve the requester-owned project, current confirmed site, exact Detailed Planning Pack, normalized proposal and the real current Quick Site Check cited by that pack on the server. The resulting site, proposal and pack fingerprints plus one or more finite SEE evidence topics are persisted with an append-only actor/time/decision event; optimistic versioning prevents a concurrent review from being overwritten. Topic assignment is mandatory for accepted or conflicting material so one report cannot lend confidence to unrelated sections.

Only a fully readable, successfully indexed document may be accepted. Acceptance records the source document date, rejects future dates and may record an expiry date. Pending, conflicting, expired or cross-scope evidence blocks the affected final SEE evidence path; accepted evidence from an earlier site, proposal or pack is never silently carried forward. Rejected and superseded material remains visible project history but cannot support or block the final document.

The review state does not certify consultant competence, report correctness or council acceptance. It records that a human has assessed the exact document as applicable to the exact current planning chain, with limitations or conflicts preserved for reconciliation and citation. The final SEE compiler may consume only accepted, current, readable, indexed and conflict-free evidence and must retain source/page provenance.

Reference: docs/project-memory/build-next.md Item 74A; DR-048; DR-050; DR-051

## DR-053 — Evidence Confidence Is Section-Bound, Never Document-Wide

Status: Active

Decision: Plannera uses one finite, version-controlled SEE evidence-topic registry across uploaded documents and spatial observations. An accepted or conflicting review must explicitly select one or more topics. The selection is copied into the append-only review event and may affect only those sections. Source filenames, document wording, map layer labels and model similarity are not authority to assign evidence to an SEE section.

The registry covers site context/survey, statutory planning, built form/design, access/parking/traffic, flood/stormwater, bushfire, biodiversity/landscaping, heritage/Aboriginal heritage, contamination/geotechnical, servicing/waste, acoustic/amenity, and social/economic/public-interest effects. Rejected or superseded material has no supporting topic. Accepted legacy evidence with no topic assignment fails closed and must be reviewed again before final-document use.

Topic assignment establishes scope only; it does not prove the evidence resolves the topic. Section readiness must separately reconcile current accepted sources, conflicts, expiry, statutory gaps and required professional inputs. No strong source in one topic may raise confidence in an unrelated section or in the document as a whole.

Reference: docs/project-memory/build-next.md Item 74A; DR-048; DR-051; DR-052


## DR-054 — Registered Cadastral Plan Controls Legal Parcel Scope

Status: Active

Decision: a paid Item 74H scope must treat the registered cadastral plan as a separate, mandatory private evidence role and as the controlling legal source for parcel area. The detail survey must bind to the registered-plan content hash, and the proposed layout must bind to the detail-survey content hash. A survey area that differs from the registered plan is retained as an explicit reconciliation fact; it is not averaged, silently substituted or resolved from applicant estimates.

Road, side and rear setbacks may support paid scope only when promoted from survey measurements through that exact evidence chain. Current road classification, registered plan, detail survey and proposed layout must each be scanned, independently operator-reviewed, immutably promoted and assembled exactly once. The reviewed proposal attestation and evidence manifest must match the registered-plan area. Synthetic or fixture evidence may prove the machinery but cannot bind an A$49 Planning Controls Pack or A$749 submission SEE.

The free Pathway Check may truthfully explain missing registered-plan, reconciliation or setback evidence. It must not invent a value or imply paid readiness. Production checkout remains independently disabled, and Preview acceptance does not authorize a Production schema migration or real-document write.

Evidence: PR #365; protected Vercel Preview `dpl_HUMLJQ1MT8zLWXBeKCywMnwwkuQG`; Production deployment `dpl_H8pchMJGhTU4owpU2fGeuGJnQtjS`; `docs/operations/item74h-registered-plan-reconciliation.md`.

Consequence: Item 74H remains active until a real registered plan and real legal measurements pass the protected evidence flow and the rendered A$49/A$749 outputs are inspected. No developer may weaken the four-role chain to make a commercial gate green.


## Item 74H progressive-evidence SEE contract (2026-09-01)

- A current-site, proposal-matched QSC/DPP provenance chain may create a qualified `WORKING_SEE` even when the DPP identifies evidence gaps.
- The working SEE persists `evidenceStatus`, `submissionReady: false`, an outstanding-evidence schedule, and the exact source DPP/QSC chain.
- Missing survey, specialist report, or similar clarifying evidence does not abandon the customer journey. The customer can start now and strengthen the same project as evidence arrives.
- Unsupported exact claims remain prohibited. `SUBMISSION_READY`, polished paid outputs, and final commercial acceptance remain subject to the existing strict acceptance gate and operator review.
- Consultant handoff includes the qualified working SEE and its evidence gaps. The commercial funnel audit reports `working_needs_evidence` rather than incorrectly reporting that no SEE exists.
- Production checkout remains disabled. This change does not alter Production data, schema, payments, Blob resources, or environment variables.


## Decision: working outputs are a separate qualified render state (2026-09-01)

Decision: evidence gaps may qualify a working A$749 SEE and consultant pack, but they must not prevent the customer from beginning or strengthening the same purchased project. The working renderer is separate from the final renderer and may tolerate only named evidence/readiness blockers. It cannot tolerate identity, authoritative spatial provenance, DPP/QSC lineage, product, price, source, citation, section, output-integrity or Production-commercial-mode faults.

Every working DOCX/PDF must visibly state `WORKING SEE - NOT SUBMISSION READY`, carry the outstanding evidence schedule, record the current DPP and predecessor lineage, and remain `submissionReady: false`. When evidence arrives, regeneration retains the same project, confirmed site and QSC chain and produces changed outputs. Confirmed evidence still does not bypass final operator review.

Evidence: `src/lib/submission-see-renderer.ts`; `scripts/item74h-working-see-preview-acceptance.ts`; `.github/workflows/item74h-working-see-preview.yml`; `docs/operations/item74h-working-see-output.md`.

Consequence: Plannera can confidently tell a customer to start now and improve the work later, while unsupported exact claims and submission-ready status remain locked. Production checkout remains disabled and this decision authorizes no Production data, schema, payment, Blob or environment mutation.


## Decision: persist working A$49/A$749 readiness separately from final eligibility (2026-09-01)

Status: **ACCEPTED FOR PROTECTED PREVIEW PROOF / PRODUCTION CHECKOUT DISABLED**

Decision: use internal `PLANNING_CONTROLS_PACK_WORKING` and `SUBMISSION_SEE_WORKING` stages backed by one deterministic progressive binding. The binding records independent pathway and evidence decisions, exact product/price, scope and evidence digests, confirmed controls, and outstanding evidence. It must always keep final submission eligibility and Production checkout false.

The existing final paid-artefact policy is not weakened. Final `PLANNING_CONTROLS_PACK` and `SUBMISSION_SEE` bindings must continue to fail until exact evidence, trust, currentness and operator requirements are met.

Consequence: customers may confidently start useful work and strengthen the same project later, while Plannera preserves an evidence-based distinction between working, final and submission-ready outputs. This decision authorizes no Production data, schema, payment, checkout or real-document mutation.


## 2026-09-02 - Public DA history is permission-aware evidence discovery, not a document scraper

Decision: Plannera may discover allow-listed Council application metadata and document lists for an exact customer project, but must not silently crawl or copy public DA files. The customer selects relevant records; Plannera deep-links or accepts a customer-supplied private upload until an integration licence or written permission authorises server-side copying.

Official determinations and stamped plans are dated case evidence. Submitted SEEs and proponent reports are secondary evidence. No historical record is current planning law, proof of current compliance or a promise that a similar proposal will be approved. Current LEP, DCP and authoritative spatial controls must be replayed independently.

Discovery is a low-cost free or introductory feature. Protected OCR, extraction, conflict analysis and regeneration belong to the paid project and should run only for selected documents, with caching by permitted durable reference or content hash. Council adapters launch incrementally, beginning with Byron/Kempsey, and unsupported trackers fall back to a customer-supplied link or upload.

Consequence: the evidence graph records source, date, authority, currency, scope, selection and copy basis. Pending, conflicting, expired or unreviewed evidence cannot resolve a deterministic gate. Production checkout remains disabled.


## 2026-09-02 - Commercial proof must be one customer journey, with progressive disclosure

Decision: the next Item 74 acceptance composes existing services rather than creating another parallel product or duplicate commercial model. Property Check, A$49 pack purchase, evidence intake, regeneration, exact-scope credit and A$749 working SEE remain one persistent project and provenance chain.

Long clauses and dense evidence are concise by default but never hidden permanently. Customers can expand the complete text and reduce it again with accessible controls. Motion may reinforce sequence and state changes, but must be restrained, responsive and must not delay access to planning information.

Consequence: the deterministic composite gate proves contract compatibility; a fresh protected Stripe hosted lifecycle proves payment execution; exact-head Preview proves customer presentation. None of these activates Production checkout or changes Production data/schema without separate approval.

## 2026-09-04 - Models orchestrate concept design; deterministic geometry remains authoritative

Decision: Plannera may add an evidence-aware sketch-to-scaled-concept workspace after the protected Item 77 commercial journey is proven. A user may upload a rough sketch, photograph or marked-up plan and confirm its written dimensions. Model reasoning may interpret the drawing, ask focused questions and issue structured design operations, while a deterministic spatial/CAD service owns scale, topology, dimensions, constraint overlays and file validation.

A sketch, photograph or model-derived measurement is declared or extracted evidence, not a survey fact. Each measurement records its source, confirmation state and confidence. Unknown, conflicting and stale geometry remains visible and blocks only the dependent assertion or submission-ready status; it does not prevent the user buying and progressively improving the same working project.

Generated SVG, PDF, DXF or later CAD/BIM outputs are concept material until the appropriate professional confirms them. Plannera must not redraw or overwrite an authoritative survey as if it had become certified, infer absolute scale without a known dimension, or claim planning/building compliance from visual plausibility.

Consequence: the capability extends the existing project evidence graph and SEE/consultant workflow rather than becoming a disconnected drawing product. Model choice is routed by task and benchmarked cost/quality; no single frontier model is a permanent architectural dependency. Production activation requires separate acceptance for extraction accuracy, deterministic geometry, provenance, export validity, responsive editing and professional handoff. See [docs/product/evidence-aware-concept-design.md](../product/evidence-aware-concept-design.md).

## 2026-09-07 - Deployment builds are non-mutating; protected acceptance is a separate operation

Status: **IN REVIEW / NO STATEFUL EXECUTION AUTHORIZED**

Decision: a Vercel deployment build may generate the Prisma client, execute reviewed read-only or in-memory gates, and compile the application. It must not apply SQL, reconcile a migration ledger, write or clean database fixtures, write or delete Blob objects, or create/delete Sandbox resources. `vercel-build` is therefore an exact allowlist enforced before other build steps; each npm wrapper and direct entry source is pinned to its reviewed target and fingerprint.

The Item 74H schema runner and stateful acceptance suites remain available only as manual GitHub workflows. Each run must be authorized for one full non-main commit SHA and identified isolated Preview endpoint, plus the exact private Blob target when required. Both checkout surfaces remain false. Workflow YAML cannot prove that GitHub environment reviewers or environment-scoped credentials have been configured, so an operator must inspect that external protection before dispatch.

Migration-ledger reconciliation is not automated. The existing seven-file SQL runner remains separately guarded and non-transactional across files; target state and migration history require explicit operator review. Removing it from deployment builds does not break current Item 77 deterministic acceptance or UI presentation. Any future Item 77 persistence depending on Item 74H tables must use a separately completed schema step and fail closed if the target is not ready.

Consequence: branch pushes may create Preview deployments without turning deployment into an implicit mutation approval. Stateful coverage is preserved but remains unexecuted until its external controls and isolated targets are explicitly reviewed. This decision authorizes no migration, acceptance run, cloud-resource mutation, Production checkout, refund, merge or manual deployment.
## 2026-09-07 - Build and Preview authorization hardening clarification

Status: **IN REVIEW / NO STATEFUL EXECUTION AUTHORIZED**

Decision: manual Preview mutation workflows must prove authorisation without credentials before GitHub may enter the protected execution job. Dispatch inputs are data passed to a fixed command and validated against narrow formats. The exact checked-out SHA must equal the dispatch SHA and must not be an ancestor of `origin/main`; a non-main-looking branch name is insufficient. Protected secrets are step-scoped and appear only after environment allowlists have passed.

The deployment verifier recursively fingerprints and scans the known local import closure of retained scripted gates, and Next.js compilation receives a scrubbed environment with known database, Blob, Sandbox, payment-write and acceptance credentials removed. This supersedes any interpretation that entry-file fingerprints alone prove all build behaviour non-mutating. Static checks cannot guarantee third-party semantics, generated or dynamically loaded code, unauthenticated side effects, or future framework behaviour. Independent review, least-privilege deployment configuration and the absence of write-capable deployment credentials remain required controls.

Consequence: acceptance coverage remains available but separate and fail-closed. No migration, stateful acceptance, Production change, checkout activation, refund, merge or manual deployment is authorized by this clarification.

## 2026-09-09 - Item 78A proves one durable customer chain without weakening boundaries

Status: **IMPLEMENTED / PROTECTED HOSTED ACCEPTANCE PENDING**

Decision: commercial acceptance must begin with a real paid Stripe test-mode A$49 Planning Controls Pack and continue on that same persisted project through reviewed later evidence, regeneration, one single-use A$49 credit, and working A$749 SEE outputs. It may not fabricate the source payment or entitlement, create a second pack, bypass private-evidence review, or treat a working SEE as submission-ready.

Implementation boundary: the protected workflow proves real Blob quarantine and malware scanning before the domain bridge. The bridge then exercises persisted evidence review/promotion, exact-scope binding, replay/idempotency, credit reservation and consumption, regenerated DOCX/PDF outputs, and zero synthetic database residue. Production checkout remains disabled.

Evidence status: implemented in the Issue #388 branch. Protected hosted execution evidence is still required before acceptance is recorded as complete.
