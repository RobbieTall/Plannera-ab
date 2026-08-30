# Item 74H controlled Byron address flight

Status: READ-ONLY PREFLIGHT AND TEMPORARY PERSISTENCE ACCEPTED / DISABLED / INPUTS REMOVED / ZERO RESIDUE

Last updated: 2026-08-29

## Purpose

Safely confirm one non-customer, publicly advertised Byron rural property before persisting a shed/outbuilding pathway, and preserve the approval boundary for any later rerun.

The controlled address is not repository data. It must not appear in source, fixtures, workflow inputs, PR comments, deployment logs or acceptance summaries.

## Current boundary

The protected read-only preflight and temporary persistence flight were accepted on 25 August 2026.

The accepted flight proved:

- exactly one precise public address result in Byron Shire;
- exactly one official NSW EPI zoning polygon for Byron LEP 2014 and RU2;
- current repository LEP, Byron DCP and Codes SEPP retrieval;
- deterministic `MORE_EVIDENCE_REQUIRED`;
- 4 evidence snapshots, 17 control snapshots and 6 gate snapshots;
- replay and reload of the same assessment;
- rejection of an unsafe `PROCEED` write;
- replay-safe free Pathway Check binding;
- blocked A$49 and A$749 bindings;
- no retained raw address, coordinates or parcel identifiers; and
- zero residual controlled records after cleanup.

The temporary protected address and enable variables were removed. No existing controlled Byron RU2 SiteContext remains in the isolated Item 74H Preview database because cleanup is part of the accepted contract.

The controlled address harness is now disabled and approval-gated. Its disabled normal state does not mean the accepted 25 August flight was never executed.

## Harness

Run:

`npx tsx scripts/item74h-controlled-address-preflight.ts`

Default behavior is a credential-free disabled pass:

- phase: `disabled`;
- reason: `approval_gated`;
- database access: none;
- address access: none; and
- Production mutation: none.

Enabled behavior remains read-only. It requires:

- Vercel Preview;
- exact Git ref `agent/item74h-pathway-check`;
- isolated Neon endpoint `ep-misty-dream-a7l6wcp8`;
- both checkout flags disabled;
- `ITEM74H_CONTROLLED_ADDRESS_ACCEPTANCE=true`;
- temporary protected `ITEM74H_CONTROLLED_ADDRESS`; and
- existing protected `GOOGLE_MAPS_API_KEY`.

## Candidate criteria

The controlled site must be:

- currently or recently publicly advertised;
- vacant land or otherwise non-customer test data;
- within Byron Shire;
- uniquely resolvable by the protected geocoder;
- resolved precisely enough for zoning;
- intersect exactly one current official NSW zoning polygon;
- resolve to Byron LEP 2014 and RU2; and
- have no address, coordinate, parcel or provider payload copied into repository evidence.

A failed criterion is a red result. Another site may be selected only from public evidence; the checker must not be weakened.

## Read-only preflight

The enabled preflight:

1. hashes the protected address;
2. resolves exactly one NSW address without logging it;
3. requires Byron Shire from address components;
4. queries the official NSW EPI zoning layer;
5. requires exactly one Byron LEP 2014 RU2 feature;
6. confirms current repository Byron LEP source and RU2 coverage;
7. confirms the current Byron DCP source;
8. discovers candidate shed/outbuilding DCP clauses without printing their text; and
9. returns `MORE_EVIDENCE_REQUIRED` until numeric controls and branch predicates are reviewed.

It reports only hashes, public instrument metadata and counts. It performs no database writes.

## Re-execution approval boundary

The accepted flight does not grant standing authority to reintroduce the address or rerun controlled writes.

Before any re-execution, obtain explicit approval for:

- temporarily adding a public address as a protected Preview environment value;
- triggering the protected read-only deployment;
- if preflight passes, creating temporary controlled Preview records;
- deleting the temporary environment value after use; and
- reconciling all temporary records to zero after the controlled acceptance.

Production environment variables, data and schema remain prohibited.

## Persistence boundary

A green address preflight does not permit `PROCEED` or paid binding.

Before paid eligibility:

- verify exact LEP and DCP source locators;
- validate every material numeric control;
- identify and verify the proposal's ancillary-use assumption;
- determine legal land-area applicability;
- resolve road classification, measured setbacks and all required mapped site predicates;
- accept the real private road, survey and shed-layout evidence chain;
- publish a reviewed pathway definition version; and
- compute one evidence digest shared by every output.

Unknown or conflicting facts remain `MORE_EVIDENCE_REQUIRED`.

## Cleanup

After every controlled flight:

- remove the temporary address environment value;
- remove the enable flag;
- delete only the controlled fixture records;
- prove zero residual fixture rows;
- return the normal disabled harness state; and
- leave Production checkout disabled.
