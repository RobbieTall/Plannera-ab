# Statutory-First Data Strategy (LEP/SEPP/Acts First, DCP Parallel)

## Problem

Plannera is currently strongest when local DCP excerpts are available, but this makes usefulness uneven across LGAs. We need consistently factual outputs even when DCP ingestion is incomplete.

## Decision

Adopt a **Statutory-First strategy**:

1. treat NSW statutory sources as the always-on backbone,
2. make LEP + legal map context first-class and deterministic,
3. keep DCP as a parallel enrichment layer with explicit maturity states.

This means every site should receive high-confidence answers from statutory sources first, then progressively richer local guidance as DCP coverage matures.

## Scope of “statutory-first”

Priority data layers:

1. **SEPP / Acts / Regulations / ministerial instruments** (statewide)
2. **LEP clauses** (LGA-specific, statutory)
3. **LEP legal maps / overlays** (heritage, environmental, flood, bushfire-linked where available through legal map references)
4. **DCP controls** (non-statutory but operationally critical; staged)

## Product behavior by source maturity

### Baseline (always available)

For every address, return:

- resolved site + LGA + zoning
- applicable statutory instruments (SEPP/LEP)
- cited statutory clauses relevant to the user question
- explicit confidence labels

### LEP-ready mode

When LEP clauses + map references are available:

- provide clause-cited permissibility + zone objectives
- provide legal-map-aware warnings (where mapped overlays are linked)
- avoid local DCP numeric claims unless DCP evidence is present

### DCP-ready mode

When DCP evidence exists:

- answer numeric built-form controls only from retrieved excerpts
- provide control-by-control values with section citations

## Implementation plan (phased)

### Phase 0 — Data-access audit (first engineering slice)

Before adding more chat copy, verify the factual data path end to end:

- list which statutory instruments are already ingested and searchable,
- confirm LEP instrument matching from resolved LGA/site context,
- confirm clause search returns cited LEP/SEPP clauses for common questions,
- identify which LEP map layers are available as legal-map references versus only human-readable URLs,
- add one automated regression for “DCP missing, statutory answer still cited.”

**Exit criteria:** for a test address, Plannera can show the relevant statutory source(s), retrieved clause references, and a clear statement that DCP controls remain unresolved.

### Phase 1 — Statutory reliability hardening (now)

- Ensure workspace-chat answers default to statutory citations when local controls are unavailable.
- Add deterministic response blocks for:
  - permissibility,
  - statutory triggers,
  - unresolved local controls.
- Add tests for “statutory answer present even when DCP absent.”

**First implementation PR:** make `/api/workspace-chat` include a structured statutory-baseline block in debug output and ensure fallback replies do not suppress available LEP/SEPP context.

### Phase 2 — LEP map linkage hardening

- Normalize LEP map references per LGA/instrument.
- Expose map-linked constraints in structured site context (heritage, environmental, flood, bushfire-linked where available).
- Add confidence tags: `STATUTORY_CITED`, `MAP_LINKED`, `LOCAL_UNRESOLVED`.

### Phase 3 — DCP parallel acceleration

- Keep just-in-time DCP activation.
- Add “targeted control extraction” mode for requested controls (setbacks/parking/height) before broad full-pack parsing.
- Trigger focused ingestion from known council DCP index pages where possible.

## Exact data priorities

| Priority | Data | Why it matters | Expected confidence |
| --- | --- | --- | --- |
| P0 | Site resolution + LGA + zone | needed before any planning answer is useful | confirmed / user-provided |
| P0 | State instruments / SEPPs / Acts | applies broadly and is easier to keep current | statutory cited |
| P1 | LEP clauses | local statutory permissibility and zone objectives | statutory cited |
| P1 | LEP legal map references | legal constraints such as heritage/environmental overlays | map-linked where available |
| P2 | DCP excerpts | operational built-form numbers such as setbacks/parking | cited, not verified until QA |
| P3 | Structured DCP rule packs | deterministic compliance-style checks | verified only after golden tests |

## Interim operator strategy

Until DCP automation is mature:

- user upload remains valid,
- but ingestion worker should prefer authoritative council index discovery and fetch where possible,
- and surface exactly which sections are missing to make next-step ingestion deterministic.

## Guardrails

1. Never output uncited numeric local controls.
2. Always return a useful statutory answer if available.
3. Keep DCP uncertainty explicit and actionable (what’s missing, what was retrieved, what to ingest next).
4. Preserve response shape; improve content quality within existing API contracts.

## Non-goals

- Do not block statutory answers while waiting for DCP ingestion.
- Do not build a broad DCP crawler before proving statutory answers are consistently useful.
- Do not present LEP map references as site-applicable overlays unless the site-to-map relationship is actually resolved or clearly labeled as requiring confirmation.

## Success metrics

- % of planning questions answered with at least one statutory citation.
- % of setbacks/parking queries returning either cited numeric control or explicit evidence-gap action.
- Median time from first local-controls query in an LGA to first cited DCP numeric answer.
- Regression rate for fabricated numeric controls (target: zero).
