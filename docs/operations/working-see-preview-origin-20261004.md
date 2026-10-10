> **Latest SEE purchase-integration checkpoint (4 October 2026): HOLD.** The signed Preview/test payment policy and atomic persistence handler are now prepared with 66 passing focused tests, clean type checking, a passing build-safety contract and a successful credential-free build (37/37 pages). Payment, credit and entitlement changes share one serializable transaction; failure tests exercise rollback using a transactional test double, not a live database. The customer checkout/quote route, selected-document scope binding, provider dispatch and UI remain to be connected. These modules do not enable checkout and no new test payment or hosted document acceptance is claimed. Both isolated deployments remain on the prior origin-fix SHAs. Production is unchanged and must stay disabled; no deployment or merge. Earlier checkpoints below are historical.

> **Current hosted checkpoint (4 October 2026): HOLD.** The Preview origin correction is deployed and both councils now pass that guard. 106 local checks, type checking, a credential-free build and all 14 GitHub runs passed. Neither isolated fixture has a PAID `submission_see` purchase or ACTIVE SEE entitlement; existing paid Planning Controls Packs do not confer SEE access. The SEE credit persistence service has no production-source callers in the inspected application tree, and no customer SEE checkout route was found. Connect and test the legitimate SEE purchase/credit/webhook journey using existing approved terms, without fabricating entitlements or repeating planning-pack payments. Word/PDF generation, private download, reopening and visual acceptance remain unproven; current-source/applicability review also remains open. Production is unchanged and checkout must remain disabled. No merge or Production deployment.
>
> Authoritative hosted evidence: [Issue #395](https://github.com/RobbieTall/Plannera-ab/issues/395#issuecomment-5977156678) and [PR #452](https://github.com/RobbieTall/Plannera-ab/pull/452#issuecomment-5977157198). Earlier checkpoints below are historical and superseded.

# Working SEE Preview origin correction - 4 October 2026

## Evidence and scope
The actual Kempsey document-generation request returned HTTP 400 with `invalid_generation_request` and safe reason `origin`. See [Issue #395](https://github.com/RobbieTall/Plannera-ab/issues/395#issuecomment-5976984641). The mismatch is confirmed; the exact internal proxy hostname has not been inspected and is not needed for this bounded correction.

Only the working Word/PDF generation route changes. Production remains disabled by the existing Preview-only gate. No session, owner, entitlement, source-provenance, request-body, evidence-warning or private-storage checks are removed.

## Trusted-origin policy
- Preserve exact equality with Request.url origin for ordinary requests.
- Reject missing/null Origin and contradictory browser fetch-site metadata.
- For an externally same-origin Preview request whose Request.url origin differs, require all of: server-side VERCEL_ENV=preview; server-side VERCEL=1; browser Sec-Fetch-Site=same-origin; exact HTTPS Origin equality with a valid VERCEL_URL or VERCEL_BRANCH_URL supplied by server-side platform metadata.
- Only a single valid DNS label beneath vercel.app is accepted from those two configuration fields. No wildcard, suffix-only comparison, custom-domain fallback, path, port, credentials or arbitrary domain is allowed.
- Do not trust incoming Host, Forwarded, X-Forwarded-Host, X-Forwarded-Proto, client origin-looking headers, NEXTAUTH_URL or VERCEL_PROJECT_PRODUCTION_URL.
- Missing platform metadata fails closed. Do not add ad-hoc request-header fallbacks to make a test pass.
- Origin validation remains a browser CSRF boundary, not authentication. Session and project permissions still apply afterward.

Vercel documents these system fields as available at runtime: [system environment variables](https://vercel.com/docs/environment-variables/system-environment-variables).

## Local validation
79 Node tests, 16 integration tests and 11 build-safety tests passed (106 total). Type checking passed. The reviewed credential-free Next build passed, generating 37/37 pages. Build-safety contract: 7 commands, 6 entries, 15 transitive sources. Existing browser-data freshness warnings and the dynamic DCP search static-render warning remain; neither caused build failure.
Synthetic coverage includes internal Request.url, both exact platform origins, sibling/foreign/lookalike origins, malformed metadata, spoofed forwarding headers, missing Origin/fetch metadata, authentication ordering and disabled Production. These do not prove hosted file delivery.

## Deployment and acceptance
Publish through draft PR #452 without merge. Feature automatic deployment is disabled. Rehearse only on see-doc-byron-20260930 and see-doc-kempsey-20260930, retaining their independent isolated databases and existing protected configuration. Do not alter Production, create new credentials, or migrate databases.
After hosted deployment, generate through the customer UI, inspect only safe failure codes if rejected, and prove private DOCX/PDF persistence, download and exact-version reopening. No hosted success is claimed by this patch.

## Separate source-currency gate
The official Byron DCP listing now links D1-D4 adopted 17 September 2026, effective 1 October 2026. This is listing metadata, not yet a PDF-content review. Chrome blocked opening the current D3 PDF; no bypass occurred. Verify current official content and refresh isolated provenance before content acceptance. Do not treat historical 2023 D3 material or draft search snippets as current adopted evidence, and do not infer tourist-accommodation applicability from residential zoning alone.

Commercial decision remains HOLD pending hosted document delivery, representative visual review, permissions/version checks and applicable current evidence.
