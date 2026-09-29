# Plannera Project Schedule & Project Controls Engine

**Status:** recorded product/architecture direction. Future implementation; **not part of the current Commercial Gate goal**.

**Drive companion:** https://docs.google.com/document/d/1bZEJU4hRY_nVTGxTsujFMjvCVJGdlcHKZJrIzE4JzYY/edit

## Decision

Plannera's current lifecycle Timeline is a useful user-facing journey, but it must not remain the underlying model for long-term project delivery.

The target architecture is:

- **Project Controls Engine** — evidence-backed project state, tasks, dependencies, schedule logic, blockers and readiness.
- **Project Schedule** — the detailed user-facing programme generated from that engine.
- **Timeline / Journey** — the lightweight lifecycle visualisation of the same underlying state.

This turns Plannera's existing "project brain" direction into a practical development operating system without turning it into a generic task manager.

## Product outcome

Plannera should progressively build and maintain a project-specific development programme as evidence accumulates. The user should not need to manually model the whole development process before the system becomes useful.

The engine should answer:

1. What is required **for this site and proposal**?
2. What is complete, active, waiting, blocked or unresolved?
3. What evidence supports that state?
4. What does the item depend on and what does it block?
5. What is the next major readiness gate?
6. What should happen next?

The value is not a Gantt chart by itself. The value is statutory and project intelligence maintaining the programme behind it.

## Evidence inputs

Subject to the existing confidence, provenance, access and privacy rules, Project Controls may use:

- site, proposal and exit-strategy intent;
- LEP, DCP, SEPP and spatial/overlay intelligence;
- DA/CDC applications, determinations and consent conditions;
- S68, S138 and other authority approvals where triggered;
- service authority requirements, quotes and connection evidence;
- contracts, tenders, exclusions, allowances and variations;
- construction-finance approvals, conditions precedent and expiry dates;
- invoices, receipts, progress claims and cost updates;
- project emails and correspondence;
- uploaded plans, surveys, reports and certificates;
- Research Viewer snapshots/screenshots;
- authorised external trackers, portals and APIs; and
- explicit user confirmations/corrections.

## Evidence-driven state

AI may identify, propose, create or update a schedule item, but it must not silently turn an inference into a confirmed project fact.

Material schedule items should retain:

- source/evidence;
- confidence/provenance;
- why the item is required;
- trigger;
- responsible party;
- dependencies;
- what it blocks;
- relevant dates; and
- last evidence update.

A screenshot, email or document may create a candidate state change. Confirmed state requires sufficient evidence or explicit user confirmation.

## Core work-item model

The future work-item model should support at least:

- title;
- workstream;
- lifecycle stage;
- `requiredForSite`;
- requirement reason/trigger;
- status;
- owner/responsible party;
- start, target and due dates;
- expected duration;
- dependencies;
- `blockedBy` / `blocks`;
- critical-path flag where useful;
- cost/allowance/forecast impact;
- evidence references;
- confidence/provenance;
- source system;
- last updated; and
- manual correction/override history.

## Required-for-this-site logic

Templates contain **possible** tasks, not assumptions that all projects require the same approvals.

Examples:

- IF consent requires S138 works → create S138 workstream and relevant dependency.
- IF water/sewer/plumbing approval is triggered → create the applicable authority workstream.
- IF bushfire controls trigger specialist work → create the applicable assessment/report tasks.
- IF separate title is part of the exit strategy → investigate subdivision pathway early.
- IF strata is selected → add approval, survey, valuation, by-laws, certificate, mortgagee and registration tasks as applicable.
- IF an easement must be registered before OC → make it a pre-OC blocker.
- IF finance approval has an expiry date → create a Finance Clock and downstream risk warning.

The first-class question is always: **Required for this site?**

## Readiness gates

Initial target gates:

### Ready for CC
Planning approval, applicable consent-condition prerequisites, authority approvals, levies, engineering and certifier inputs.

### Ready to Commence
Planning, CC, finance, builder, services, owner works, insurance and other project-specific prerequisites.

### Ready for OC / Completion
Pre-OC conditions, authority sign-offs, easements, services, landscaping, certificates and inspections as applicable.

### Ready for Sale / Settlement
OC/title/strata, lender release, contracts, utilities and legal/tax/settlement prerequisites as applicable.

Readiness must be derived from the underlying evidence. It is not simply a phase label the user changes.

## User views

One engine should power four views:

1. **Journey** — the existing simple lifecycle progression.
2. **My Actions** — current actions, blockers, deadlines and waiting-on items.
3. **Project Schedule** — programme/Gantt-style dates, durations and dependencies.
4. **Readiness Gates** — clear evidence-backed readiness for the next major gate.

## Garruka — Template / Case Study 001

3 Garruka Way is the first real project case used to design and test the Project Controls ontology.

Potential workstreams include:

- opportunity / pre-purchase / pre-feasibility;
- physical-site, title and easement due diligence;
- services and authority due diligence;
- acquisition/entity setup;
- design and builder pricing;
- development approval;
- consent-conditions audit;
- S68/S138/authority approvals where triggered;
- CC and certifier;
- construction finance and Finance Clock;
- Ready to Commence;
- construction, variations and progress payments;
- utilities;
- easements;
- strata/subdivision;
- OC, practical completion and defects;
- sales/title/settlement/lender release; and
- financial close-out and lessons learned.

Garruka is a template seed and case study, **not a universal rule set**.

## Research Viewer / screenshot integration

Research Viewer should later be able to contribute project-control evidence.

Example:

1. Plannera views an authorised council tracker, planning portal, lender/authority portal or other source.
2. It records source identity, URL/context, retrieval time and snapshot/screenshot.
3. It extracts a candidate fact such as "RFI issued", "fee outstanding", "approval granted", "finance expires", or "application status changed".
4. Project Controls proposes or applies the appropriate state change according to confidence/evidence rules.
5. The evidence remains inspectable.

## Implementation sequence

### V1 — Project Controls foundation
- task/workstream ontology;
- Project Controls data model;
- `requiredForSite` trigger framework;
- dependency/blocking relationships;
- evidence/provenance on schedule items;
- manual + system-event updates;
- consent-conditions register integration;
- Finance Clock;
- readiness gates;
- Journey, My Actions, Project Schedule and Readiness views; and
- Garruka Template/Case Study 001.

### V2 — Document intelligence
Extract conditions, dates, deadlines, obligations and blockers from approvals, contracts, finance documents, quotes and authority correspondence, then propose evidence-backed schedule updates.

### V3 — External intelligence
Research Viewer evidence, council/DA trackers, authorised portals, useful mapping/data triggers, notifications and stale-evidence checks.

### V4 — Predictive controls
Critical-path risk, expiry/deadline conflicts, forecast delays, LGA/project-type duration benchmarking and project-health/readiness forecasting.

## Guardrails

- Site-specific logic beats generic templates.
- `requiredForSite` is first-class.
- No factual completion from unsupported inference.
- Consequential state changes remain traceable to evidence or explicit confirmation.
- Preserve confidence and "current as at" context.
- Do not treat screenshots or partial external data as verified merely because they look authoritative.
- Preserve project/customer data isolation.
- Schedule automation must not perform destructive or external actions without the applicable approval boundary.

## Current-build boundary

The active Commercial Gate work continues to its existing acceptance criteria.

This feature is **architectural context for what comes next**, not a request to widen the current implementation. Current work should not be refactored or delayed to build Project Controls unless an existing choice would unnecessarily prevent the future model.
