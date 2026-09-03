# Evidence-aware concept design workspace

Status: Approved product direction; future slice after protected Item 77 acceptance
Last updated: 4 September 2026
Production status: Disabled / not implemented

## Product promise

Plannera should help a customer move from “this is roughly what I want to build” to a clean, editable, planning-aware concept inside the same persistent project.

A customer may upload a rough hand sketch, photograph, marked-up deposited plan or survey-derived drawing. Plannera extracts visible lines, labels and dimensions, asks the customer to confirm or correct them, and uses a deterministic geometry service to produce a scaled digital concept. The concept can then be refined against cited planning controls and shared with the consultants who will verify or complete it.

The value is not autonomous drafting. The value is one evidence-aware workspace connecting customer intent, authoritative site evidence, planning controls, concept geometry, the A$49 Planning Controls Pack, the A$749 working SEE and professional handoff.

## Evidence and measurement states

Every measurement or geometric assertion must carry one of these states:

- **Authoritative**: read from a current accepted survey, registered plan or approved authoritative spatial source, with page/layer and date provenance.
- **Customer confirmed**: entered or explicitly confirmed by the customer; useful for a working concept but not transformed into survey truth.
- **Extracted**: detected from text, OCR or vision and awaiting confirmation.
- **Derived**: calculated deterministically from other recorded measurements, with lineage.
- **Conflicting**: inconsistent with another source or unable to close geometrically.
- **Unresolved**: missing or too uncertain to support the dependent assertion.

Improving evidence strengthens the same purchased project. Missing evidence blocks only the affected claim or final/submission-ready state; it does not unnecessarily prevent working generation, SEE progression or consultant engagement.

## Customer workflow

1. Start from the current Plannera project and confirmed site/proposal scope.
2. Upload or photograph a sketch/plan and preserve the original immutable source.
3. Extract candidate labels, dimensions, north direction, footprint and relationships.
4. Show the customer a concise confirmation step: accept, correct or mark unknown.
5. Build normalized geometry only after the minimum scale and topology inputs exist.
6. Overlay setbacks, mapped constraints, easements or buildable envelopes only where their evidence supports that treatment.
7. Let the customer revise the concept conversationally and with simple direct controls.
8. Preserve each concept, evidence and control revision with provenance.
9. Produce a responsive on-screen SVG, polished concept PDF and editable DXF.
10. Hand the same project to a surveyor, designer, planner or engineer for confirmation and further work.
11. Feed accepted geometry and professional evidence back into the working SEE and regenerate only affected sections.

## Technical boundary

The model is an orchestrator, not the source of geometric truth.

- An economical model can classify files, labels and routine customer intent.
- A vision-capable model can propose lines, symbols and written dimensions from sketches and plans.
- A frontier reasoning/tool model, including GPT-6 Astra if available and benchmarked, can resolve ambiguity, ask focused questions and issue structured design operations.
- A deterministic geometry/CAD kernel owns units, scale, topology, offsets, intersections, areas, setbacks and file serialization.
- Plannera's evidence and planning services own authority, currency, applicability, confidence and provenance.
- Deterministic validators reopen generated DXF and other outputs, verify dimensions/topology and reject malformed or inconsistent artifacts.
- A suitably qualified professional owns certification or submission use where required.

Model routing must be capability- and benchmark-driven rather than permanently coupled to one provider or model name. Strong models are reserved for high-value ambiguous work; extraction and evidence packs are cached by permitted source hash and version.

## Safety and liability guardrails

- Do not infer absolute scale from an image unless a customer-confirmed or authoritative reference dimension exists.
- Do not silently repair conflicting dimensions. Explain the conflict and request the smallest clarifying input.
- Do not overwrite, redraw or relabel an authoritative survey as a Plannera-certified document.
- Do not claim that a concept proves planning permission, building compliance, structural adequacy, title boundaries or construction readiness.
- Keep authoritative geometry, customer declarations, model extractions and deterministic derivations visually distinct.
- Display source dates and stale/conflict warnings beside affected dimensions and controls.
- Preserve the professional-advice and submission-readiness boundary structurally in data, UI and exports, not only in footer wording.
- Do not send customer files to a model or external processor without the applicable consent, privacy boundary and approved environment.

## Smallest proving slice

Use synthetic material only:

- one representative Byron rural shed concept;
- a rough sketch with a footprint, at least two dimensions, north direction and proposed boundary relationships;
- a known site geometry fixture and cited planning controls;
- a customer correction that triggers deterministic regeneration;
- an SVG/PDF concept and editable DXF that reopen successfully;
- visible provenance for every dimension and planning overlay;
- mobile and desktop review with progressive disclosure;
- a consultant handoff that identifies assumptions and the confirmations still required.

After Byron passes, repeat with a representative Kempsey case to prove the capability is not hard-coded to one council or zone.

## Acceptance evidence

The slice is not accepted until it proves:

- identical confirmed inputs reproduce equivalent geometry;
- malformed, impossible or non-closing dimensions fail safely;
- model text cannot override authoritative geometry or planning controls;
- a customer correction creates a new version rather than rewriting evidence history;
- plan overlays cite their controlling source and date;
- generated files are machine-validated and visually reviewed;
- the project can continue to the working SEE with unresolved items clearly disclosed;
- adding later survey or consultant evidence strengthens and regenerates the same project;
- no Production checkout, Production data, real document or customer payment is used during acceptance.

## Commercial position

This capability is a likely premium conversion bridge between the A$49 Planning Controls Pack and the A$749 SEE, and a stronger consultant-referral input. It may be packaged as a concept-feasibility add-on or included within the SEE/consultant journey. Do not set price or market it as available until the proving slice measures model cost, CAD/rendering cost, support burden, professional-review need and customer value.
