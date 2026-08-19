# Byron and Kempsey whole-LGA source matrix

Run the fail-closed matrix checker with:

```bash
npm run smoke:whole-lga
```

The representative launch gate remains first:

```text
Prisma client generation
  -> npm run smoke:launch
  -> npm run smoke:whole-lga
  -> next build
```

Vercel runs both checks against its isolated Preview database branch. Neither check changes planning data or schema. GitHub Actions verifies the ordering without receiving database credentials.

## Authoritative matrix

The matrix is explicit rather than inferred from whichever rows happen to exist in the database.

Byron must contain exactly 22 zones:

```text
C1 C2 C3 C4 E1 E3 E4 MU1 R1 R2 R3 R5 RE1 RE2 RU1 RU2 RU5 SP1 SP2 SP3 W1 W2
```

Kempsey must contain exactly 23 zones:

```text
C1 C2 C3 C4 E1 E2 E3 E4 MU1 R1 R3 R5 RE1 RE2 RU1 RU2 RU3 RU4 RU5 SP2 SP3 W1 W2
```

For every zone the checker requires:

- at least one non-empty LEP objective;
- at least one non-empty projected land-use row;
- the expected stored permission profile;
- no missing or unexpected zone codes.

The evidence baseline records `C1` with `PROHIBITED` and `WITHOUT_CONSENT`. Every other matrix zone must contain `PROHIBITED`, `WITHOUT_CONSENT`, and `WITH_CONSENT`.

## Council-level source contract

Each council must also have:

- `VERIFIED` coverage with a preparation timestamp;
- its exact LEP slug, current clauses, an HTTPS authoritative source, and a sync timestamp;
- referenced, substantive DCP clauses;
- at least one council DCP document whose source is an authoritative HTTPS URL;
- council-source chunks; and
- an HTTPS planning-map or NSW Spatial Viewer registry entry.

Missing evidence is red. Relative application paths do not establish authoritative DCP provenance and must not be made green by weakening the URL requirement.

## Acceptance boundary

A green matrix proves that the committed 45-zone source inventory is populated and provenance-ready. It does not prove:

- address-to-lot or address-to-zone spatial resolution;
- overlay or hazard completeness;
- proposal-specific outcomes in every zone;
- evidence-aware upload behavior;
- submission-grade A$749 SEE DOCX/PDF output;
- A$49 Planning Controls Pack credit behavior;
- Production checkout readiness; or
- operator acceptance.

Those remain separate Item 74C evidence gates. Production checkout stays disabled until the complete record is approved.
