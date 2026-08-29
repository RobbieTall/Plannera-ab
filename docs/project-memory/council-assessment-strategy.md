# Plannera Council Edition — Development Assessment Operating System

## Strategic position

Plannera's long-term council opportunity is not limited to a public-facing white-label planning widget. The larger opportunity is a council-facing Development Assessment Operating System that manages each development application as a project and helps assessment teams improve speed, consistency, transparency and statutory defensibility.

This is a post-professional-platform expansion. It should reuse Plannera's existing statutory intelligence, project workspace, sources, artefacts, timelines, provenance and confidence architecture rather than become a separate product stack.

## Market entry

NSW and Australian Government pressure to improve housing delivery and development assessment timeframes creates the entry point.

Plannera should position the Council Edition as infrastructure that helps councils:

- reduce avoidable assessment delay
- identify missing information earlier
- manage referrals and statutory clocks
- prepare assessment reports and conditions more efficiently
- improve consistency between assessing officers
- retain human accountability for recommendations and determinations
- produce better operational reporting on bottlenecks and workloads

The product promise is not that AI makes planning decisions. The planner remains the decision-maker. Plannera prepares, organises, checks, drafts, cites and records the assessment work.

## Product model

Each development application becomes a council assessment workspace containing:

- DA identity, site and applicant details
- assigned assessing officer and team
- proposal summary
- applicable LEP, DCP, SEPP and mapped constraints
- submitted plans, reports and correspondence
- internal and external referrals
- requests for additional information
- statutory and operational timeframes
- assessment issues and risk flags
- draft conditions
- assessment report and recommendation
- determination outcome
- complete activity and decision audit trail

## Core Council Edition modules

### 1. Assessment Workspace

A council-specific project workspace for each DA, including status, assigned officer, statutory days, documents, correspondence, referrals, issues, conditions and determination material.

### 2. Planner Copilot

An evidence-grounded assistant that can:

- summarise the proposal and supporting documents
- identify potentially missing information
- retrieve and cite relevant LEP, DCP and SEPP provisions
- compare proposal details against mapped and documentary controls
- flag inconsistencies, unresolved matters and referral triggers
- draft assessment report sections
- suggest draft conditions from approved council libraries

All outputs must remain reviewable, editable, cited and attributable to source material.

### 3. Assessment Workflow Engine

Configurable stages such as:

1. Lodgement received
2. Validation and completeness review
3. Additional information required
4. Internal referrals
5. External referrals
6. Public notification and submissions
7. Technical assessment
8. Draft conditions and recommendation
9. Determination
10. Post-determination handoff

The workflow must support council-specific variations without forking the core platform.

### 4. Referral Management

Referral functionality should include:

- deterministic or assisted referral identification
- referral owner and recipient
- sent, due and response dates
- reminders and overdue status
- response capture and issue extraction
- visibility of referrals blocking determination

### 5. Assessment Report and Conditions Builder

The artefact engine should produce council-controlled drafts using approved templates, clause references and source provenance. It must support section-level regeneration without overwriting officer edits.

### 6. Management Analytics

Council reporting should include:

- median and average assessment time
- stage-level delay and bottlenecks
- outstanding referrals and RFIs
- planner workload and caseload mix
- common information gaps
- common conditions and refusal reasons
- application volumes by development type, location and outcome
- housing and development pipeline indicators where supported

## Reuse from the existing Plannera platform

The Council Edition should reuse and extend:

- statutory intelligence and retrieval
- LEP, DCP and SEPP ingestion
- spatial and hazard context
- project workspaces
- sources and document indexing
- artefacts and versioning
- timeline/state progression
- clause-level citations and provenance
- confidence and unresolved-state handling
- consultant/professional workflow concepts

This reuse is the strategic advantage. The citizen, professional and council products can share one statutory intelligence layer while applying different permissions, interfaces and workflows.

## Major additional requirements

Before council deployment, Plannera will require:

### Enterprise identity and permissions

- SSO/SAML
- role-based access control
- team and department structures
- delegated authority and approval paths
- strict tenant isolation

### Records, audit and governance

- immutable activity history
- document and decision versioning
- source snapshots
- officer attribution
- AI output attribution and review status
- retention and records-management compatibility

### Council-system integration

Initial strategy: integrate alongside existing systems rather than attempt immediate replacement.

Likely integration categories include:

- development application and property systems
- document and records management
- payment and lodgement systems
- GIS and spatial services
- email and correspondence systems
- public DA trackers
- reporting and business intelligence

### Security and procurement readiness

- Australian privacy and public-sector security controls
- Australian data-residency options
- penetration testing and security assurance
- accessibility compliance
- service levels, incident response and disaster recovery
- configurable model/data-retention policies

### Configurable council rule and template libraries

Councils must control:

- assessment workflow stages
- referral rules
- report templates
- condition libraries
- delegation pathways
- terminology and branding
- local service standards and escalation rules

## Delivery sequence

### Phase 0 — Design for reuse now

While building the professional platform:

- keep projects tenant-ready
- log material actions
- version artefacts and source snapshots
- model workflows as configurable states
- retain provenance for every cited output
- separate recommendations from determinations

### Phase 1 — Internal assessment prototype

Create a council-style assessment workspace using test or synthetic DAs. Prove proposal summarisation, statutory retrieval, issue registers, referrals, report drafting and conditions drafting.

### Phase 2 — Council pilot alongside existing systems

Run with one willing council team without replacing the system of record. Import or manually create selected applications, test time savings and compare officer outputs.

### Phase 3 — Integrated Council Edition

Add SSO, records integrations, configurable workflows, council templates, management analytics and production-grade governance.

### Phase 4 — Multi-council platform

Support multiple councils through tenant configuration, jurisdiction packs, reusable integrations and common product infrastructure.

## Pilot success measures

A council pilot should measure:

- reduction in time spent on initial document review
- earlier detection of missing information
- reduction in duplicated statutory research
- report-drafting time saved
- referral turnaround visibility
- fewer stalled or unowned workflow steps
- officer acceptance and edit rates for AI-assisted drafts
- citation and source accuracy
- overall assessment-time movement without reduced assessment quality

## Guardrails

- Plannera assists assessment; it does not make or represent the legal determination.
- Every material recommendation must be traceable to evidence, rules or an identified professional judgement.
- Unsupported or conflicting matters remain unresolved rather than being inferred as compliant.
- Council officers must be able to inspect, edit, reject and override AI-assisted content.
- Council-specific templates and policy settings must remain under council control.
- A council pilot should begin alongside the existing system of record, not attempt immediate wholesale replacement.

## Strategic product structure

Plannera can ultimately operate as three connected products:

1. **Citizen Platform** — helps applicants understand sites and prepare better applications.
2. **Professional Platform** — helps planners, consultants and developers prepare and manage projects.
3. **Council Edition** — helps consent authorities assess applications faster, more consistently and with stronger evidence trails.

The common foundation is Plannera's statutory intelligence and project operating layer.

## Current roadmap status

- **Status:** Strategic direction accepted
- **Build timing:** Post-professional-workspace maturity; design-for-reuse decisions begin now
- **Immediate implementation priority:** No Council Edition feature build yet
- **Current action:** Preserve this opportunity in the canonical project memory and ensure current architecture does not close off the future council workflow, audit and multi-tenant requirements
