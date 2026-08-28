# Item 74H ClamAV Preview Acceptance

Status: **ACCEPTED IN PREVIEW / DISABLED IN NORMAL BUILDS**

Date: 2026-08-28

## Scope

This record covers the synthetic-only, private malware-scanning acceptance for Item 74H. It does not approve a real planning document, trusted evidence, a paid Planning Controls Pack, an SEE, Production access, or Production checkout.

The flight used harmless bytes generated inside the acceptance process. No real customer or planning document was used.

## Accepted protected flight

- Candidate commit: `d343290a217951a47c51a896f337e35066b98e38`
- Protected Preview deployment: `dpl_9uZhvGLLLQ71XLcDK9gReAtJrjPU`
- GitHub result: 21 of 21 workflows passed.
- Vercel result: `READY`.
- Scanner gate result: `PASS`.
- The recorded contract confirmed a current ClamAV engine and definition set, exact pre/post hash equality, exactly one target, no limit hit, deny-all scanner networking, a stopped Sandbox, successful cleanup, and zero live flight resources.
- The result remained `QUARANTINED` after a `CLEAN` scan. It did not unlock paid eligibility.
- The aggregate record contained no secret, private evidence reference, content hash, snapshot reference, direct object URL, or raw scanner output.
- Production checkout was false and Production was not accessed.

## Cleanup and restored state

- The temporary branch-only ClamAV activation variable was deleted after the accepted flight.
- The obsolete synthetic snapshot left by an earlier failed flight was permanently deleted.
- The Vercel snapshot inventory showed no live Item 74H synthetic snapshot after cleanup.
- Normal-state commit: `2155d2d03caad361b6e723901adeb5ba34dfad2f`
- Normal-state Preview deployment: `dpl_AzxKozcgMW7GbAF6yFvA3iC3KST1`
- GitHub result: 21 of 21 workflows passed.
- Vercel result: `READY`.
- Both private acceptance gates reported `SKIPPED_FEATURE_DISABLED`.
- Production checkout remained false.

## Operating boundary

A `CLEAN` malware result is necessary but never sufficient for trusted planning evidence. Operator review, provenance checks, instrument currency, proposal-to-site binding, and deterministic planning decisions remain separate fail-closed requirements.

The current real Byron pathway remains `MORE_EVIDENCE_REQUIRED`. A$49 and A$749 eligibility remain blocked until evidence-confirmed operator acceptance is complete.
