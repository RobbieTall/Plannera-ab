# Item 74H controlled Byron evidence

Status: **READ-ONLY PREFLIGHT ACCEPTED / MORE EVIDENCE REQUIRED / TEMPORARY INPUTS REMOVED / PRODUCTION UNCHANGED**

Date: 2026-08-25 (Australia/Sydney)

## Purpose

This record captures the first controlled, customer-like Byron Pathway Check preflight without retaining the public address, coordinates, parcel identifier or provider identifiers.

It is acceptance evidence for the redacted resolver and evidence-retrieval boundary. It is not approval to issue a site-specific Planning Controls Pack or submission SEE.

## Safety boundary

- Vercel Preview only.
- Exact Git branch: `agent/item74h-pathway-check`.
- Exact reviewed code head: `4d00affd962cf53f380f9b3bfce86c7159d659a0`.
- Isolated Neon branch: `br-silent-boat-a74zto1n`.
- Production checkout remained disabled.
- No Production data, schema, configuration, payment or deployment action occurred.
- The controlled preflight performed zero database writes.
- No raw address, coordinate, parcel identifier or provider payload was emitted by the controlled harness.
- The two temporary sensitive Preview variables were restricted to the exact branch and removed after the run.

## Accepted preflight result

Controlled deployment: `dpl_ExAkXyYjrtBwpthvs6Cy4YYq5BxT`.

The redacted harness confirmed:

- exactly one precise geocoding result;
- NSW and Byron LGA;
- exactly one official NSW EPI zoning polygon;
- Byron Local Environmental Plan 2014;
- zone `RU2 Rural Landscape`;
- proposal class `SHED_OUTBUILDING`;
- a current repository Byron LEP source and RU2 projection;
- a current-edition Byron DCP source with retrievable shed/farm-building candidates;
- deterministic result `MORE_EVIDENCE_REQUIRED`; and
- `databaseWrites: 0`, checkout disabled and no Production mutation.

The result is intentionally not `PROCEED`. No blocker was weakened to make the flight green.

## Evidence reconciliation

### Byron LEP 2014

Repository evidence records the in-force LEP source at:

- `https://legislation.nsw.gov.au/view/html/inforce/current/epi-2014-355`

The RU2 projection contains five objectives and 61 land-use rows. Relevant evidence includes:

- `Extensive agriculture`: permitted without consent.
- `Farm buildings`: permitted with consent.
- RU2 objectives include sustainable primary production, rural landscape character, scenic protection and compatible land uses.

A structure is not a farm building merely because it looks like a shed or is located on RU2 land. Its use must be ancillary to an agricultural use of the landholding.

### Byron DCP 2014

The authoritative council source is:

- `https://www.byron.nsw.gov.au/Council/Plans-Strategies/Planning-Development-Strategies/Byron-Shire-Development-Control-Plan-2014`

The relevant current corpus evidence is Chapter D2, *Residential Accommodation and Ancillary Development in Rural Zones*, adopted 9 February 2023 and effective 28 February 2023.

Key retrieved controls:

- `D2.7`: farm buildings, sheds and similar structures are for rural activities such as a farm workshop or storage of farm equipment, stock or feed, and are not for separate habitation.
- `D2.7.2`: farm buildings must satisfy `D2.2.2` setbacks, `D2.2.3` character and visual impact, and Chapter B6 buffer and land-use-conflict assessment. Sheds should be open, minimally partitioned and plumbed, and suitable for machinery or vehicle storage.
- `D2.7.2`: no standalone prescriptive measures are specified. This makes site and merit evidence essential rather than optional.
- `D2.2.2`: minimum road-frontage setback is 55 m from a classified-road boundary and 15 m from other road boundaries. Side and rear setbacks are merit- and conflict-dependent and must comply with the Building Code of Australia.
- `D2.2.3`: design, materials, landscaping, glare, rural character and visual integration apply.

### NSW Codes SEPP

The repository's in-force source is:

- `https://legislation.nsw.gov.au/view/html/inforce/current/epi-2008-0572`

Relevant retrieved clauses include:

- `2.31`: a non-habitable farm building may be exempt development on RU2 only if it is ancillary to agricultural use and is not on a heritage item, draft heritage item or environmentally sensitive area.
- `2.32`: exempt-development controls include an individual footprint not exceeding 200 m2, aggregate footprint limits by landholding area, height bands, setbacks from roads and other boundaries, 6 m separation from another farm building, 50 m from a natural waterbody and professional-engineer design.
- `3D.54`: the Rural Housing Code farm-building division applies only to non-habitable farm buildings on lots of at least 4,000 m2 and excludes specified residential zones.
- `3D.56` to `3D.59`: complying-development controls include height, individual and aggregate footprint, road, side, rear, large-building and waterbody setbacks.

The repository SEPP corpus was last synced on 2026-06-29. Its source is the in-force NSW endpoint, but currentness must be rechecked before evidence is promoted into a paid or submission-grade artefact.

## Why more evidence is required

Before a deterministic `STOP`, `PROCEED` or `MERIT_ASSESSMENT` decision, the following must be confirmed and source-bound:

- the proposed shed's actual agricultural or other ancillary use;
- proposed footprint, height, construction and internal facilities;
- legal landholding area and title configuration;
- existing farm-building count and aggregate footprint;
- lawful road access and road classification;
- measured road, side, rear, building and waterbody setbacks;
- heritage, draft heritage and environmentally sensitive status;
- scenic-landscape, ridgeline, airport and PANS-OPS constraints;
- flooding, bushfire, biodiversity, drinking-water-catchment and other mapped constraints;
- whether exempt, complying or DA criteria are all met; and
- operator review of the exact clauses and application-date currentness.

Unknown evidence must continue to resolve to `MORE_EVIDENCE_REQUIRED`.

## Cleanup and normal state

Final clean-state deployment: `dpl_2T8Wa9SuLmLtiH7HVUWHkfEe4r3B`.

It reached Ready with:

- `smoke:launch`: 18 green, 0 amber, 0 red;
- `smoke:whole-lga`: 60 green, 0 red;
- synthetic pathway persistence: passed twice with zero residual rows;
- controlled address harness: `phase=disabled`, `passed=true`, `reason=approval_gated`;
- Production checkout disabled; and
- no Production mutation.

## Next acceptance boundary

The next slice is a protected evidence-completion and temporary persistence flight. It must store only durable hashes and reviewed evidence snapshots, reload the same assessment idempotently, bind the free Pathway Check, keep A$49 and A$749 outputs blocked until their trust requirements are met, and clean up all temporary records.
