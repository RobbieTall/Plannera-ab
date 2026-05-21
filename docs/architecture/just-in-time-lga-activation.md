# Just-in-Time LGA Activation for Unsupported Local Controls

## Decision

Adopt **Just-in-Time LGA Activation** as the default strategy for LGAs where local DCP controls and council mapping context are not yet loaded.

This means Plannera should:

1. provide immediate baseline planning context from available sources,
2. trigger local-control preparation as an asynchronous background workflow, and
3. update the project once local controls are ready.

Plannera should **not** attempt full DCP fetch/parse/classify/map reasoning inside a single live user request.

---

## Why this approach

A live, one-request full parse flow is slow, expensive, and brittle. It also increases the risk of overconfident outputs when data quality or parsing confidence is still low.

A just-in-time background model enables:

- fast first response,
- demand-led LGA expansion,
- reduced wasted ingestion,
- better cache reuse,
- clearer confidence handling,
- cleaner path to verified rule packs.

---

## Product flow

## 1) Address intake and baseline response

On address input, resolve and return baseline context immediately:

- address
- coordinates
- parcel (if available)
- LGA
- LEP and zone
- available mapped/state planning context

## 2) Coverage-state check

For the resolved LGA, inspect coverage state:

- LEP available
- DCP searchable status
- structured control status
- local mapping registry status
- automated overlay-check status
- QA/golden-test status
- last updated timestamp

## 3) Trigger asynchronous preparation when needed

If local controls are not ready, enqueue a job (do not block live response):

- `prepare_lga_pack(<LGA_CODE>)`

Background workflow responsibilities:

- identify authoritative DCP source URL
- store source descriptor + retrieval metadata
- download/index DCP content
- extract headings, tables, and topic tags
- identify proposal-relevant sections
- determine council mapping type (ArcGIS/IntraMaps/Pozi/Exponare/manual)
- persist updated LGA coverage state
- attach resulting source context to project

## 4) Honest holding state in UI

Recommended wording:

> **Reviewing local controls**  
> Plannera is preparing the local DCP and council mapping context for this LGA. Initial LEP and state planning information is available now. Local controls will be added to this project once reviewed.

## 5) Interim guidance while prep runs

Plannera should provide safe interim guidance with clear uncertainty labels, e.g.:

- LEP/state context: available
- local DCP controls: preparing
- council-specific built-form checks: unresolved pending local review

## 6) Completion update

On completion, notify the user and prompt regeneration of affected outputs:

- Quick Site Check
- SEE sections
- risk summary
- feasibility notes

---

## Coverage maturity levels

Use explicit levels to prevent overclaiming:

1. **NOT_STARTED**
2. **QUEUED**
3. **PROCESSING**
4. **SEARCHABLE_READY** (on-demand searchable)
5. **STRUCTURED_PARTIAL** (selected controls extracted)
6. **VERIFIED** (tested/approved rule pack)
7. **FAILED_REVIEW_NEEDED**

Interpretation:

- `SEARCHABLE_READY` is sufficient for cited early guidance.
- `STRUCTURED_PARTIAL` supports broader project intelligence.
- `VERIFIED` is required before deterministic compliance/pass-fail outputs.

---

## Guardrails

1. **Do not block first response** on full local ingestion.
2. **Do not run duplicate jobs** for same LGA status window (job lock/dedupe required).
3. **Do not present fresh scans as verified**.
4. **Do not overuse high-cost AI parsing** where deterministic extraction is enough.
5. **Do not assume council map uniformity**; registry confidence must be explicit.

---

## Confidence and user communication

When local pack is in progress, use restrained language:

- “preparing local planning context”
- “local controls are being reviewed”
- “more complete planning-ready guidance will be available after local review”

Avoid certainty language such as “correct/complete response” during preparation.

---

## Implementation notes (initial)

- Add an LGA coverage-state record with lockable transitions.
- Add a queue-based `prepare_lga_pack` worker.
- Add project-level subscription/notification for coverage completion.
- Add response templates for:
  - baseline available + local prep running,
  - local prep complete,
  - local prep failed/review required.

---

## Scope framing

This is an architecture feature, not a quick UX copy patch.

Suggested roadmap task title:

**Add Just-in-Time LGA Activation for unsupported DCP and local mapping coverage.**
