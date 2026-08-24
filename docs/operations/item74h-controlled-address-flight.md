# Item 74H controlled Byron address flight

Status: REDACTED HARNESS IMPLEMENTED / DISABLED / NOT EXECUTED

Last updated: 2026-08-24

## Purpose

Safely confirm one non-customer, publicly advertised Byron rural property before persisting a shed/outbuilding pathway.

The controlled address is not repository data. It must not appear in source, fixtures, workflow inputs, PR comments, deployment logs or acceptance summaries.

## Current boundary

The synthetic persistence lifecycle is accepted. It proves replay, reload, unsafe-PROCEED rejection, free binding, paid blocking and zero-row cleanup.

No existing Byron RU2 demo SiteContext with an address, parcel or coordinates exists in the isolated Item 74H Preview database.

The controlled address preflight is therefore disabled and approval-gated.

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

## Approval boundary

Before execution, obtain explicit approval for:

- temporarily adding the public address as a protected Preview environment value;
- triggering the protected read-only deployment;
- if preflight passes, creating temporary controlled Preview records;
- deleting the temporary environment value after use; and
- reconciling all temporary records to zero after the controlled acceptance.

Production environment variables, data and schema remain prohibited.

## Persistence boundary

A green address preflight does not permit `PROCEED` or paid binding.

Before persistence:

- verify exact LEP and DCP source locators;
- validate every material numeric control;
- identify the proposal's ancillary-use assumption;
- determine land-area applicability;
- resolve flood, minimum-lot-size and other required site predicates;
- publish a reviewed pathway definition version; and
- compute one evidence digest shared by every output.

Unknown or conflicting facts remain `MORE_EVIDENCE_REQUIRED`.

## Cleanup

After the controlled flight:

- remove the temporary address environment value;
- remove the enable flag;
- delete only the controlled fixture records;
- prove zero residual fixture rows;
- return the normal disabled harness state; and
- leave Production checkout disabled.
