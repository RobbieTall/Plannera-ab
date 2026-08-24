# Item 74H: Pathway Check and shared planning evidence graph

Status: ACTIVE DELIVERY OBJECTIVE / DOCUMENTED / NOT YET IMPLEMENTED

Last updated: 2026-08-24

## Decision

Plannera will introduce a Pathway Check that turns planning evidence into a short, gated decision sequence.

The Pathway Check is not a separate planning-data product. It is the customer-facing view of the same versioned evidence graph that must feed the A$49 Planning Controls Pack and the A$749 submission-grade Statement of Environmental Effects.

The first protected proof is:

- Byron LGA;
- RU2 zone, subject to exact current-source confirmation before fixture selection;
- detached shed or outbuilding proposal;
- one synthetic site followed by one controlled non-customer address;
- Preview or test mode only; and
- Production checkout disabled.

No Hawkesbury control or numeric value from the external worked example is accepted as Plannera evidence. That example demonstrated the useful output shape only.

## Product position

The Pathway Check is primarily an upstream feeder and secondarily a reusable rendering of planning evidence already needed downstream.

It must collect and normalize:

- jurisdiction and LGA;
- confirmed site and address fingerprint;
- zone and official spatial feature provenance;
- proposal type;
- existing or ancillary land use;
- lot-area band;
- mapped constraints;
- evidence still required; and
- the branch outcomes reached at each gate.

Those facts must flow forward without re-interpretation into the Planning Controls Pack and submission SEE.

## Commercial ladder

| Stage | Customer value | Commercial boundary |
| --- | --- | --- |
| Pathway preview | Generic zone and proposal sequence, likely forks, and evidence needed | Free and ungated |
| Address triage | Site-confirmed stop, proceed, merit, or more-evidence outcome | Free, address and account gated |
| Planning Controls Pack | Verified site-specific controls, numeric values, applicability and clause citations | A$49, exact-scope credit retained |
| Submission SEE | Evidence-aware assessment, merit justification, uploads, DOCX/PDF and operator approval | A$749, exact A$49 credit when eligible |

The free pathway must not silently give the Planning Controls Pack's full evidence-grade output away. It may explain the pathway and identify missing evidence. The A$49 product remains the verified site-specific control schedule and is credited against the exact-scope A$749 SEE.

## Trust levels

Every output must display one explicit trust level:

1. GENERAL_GUIDANCE: zone or proposal orientation only; no site conclusion.
2. SITE_CONFIRMED: address, site identity and zone are confirmed.
3. EVIDENCE_VERIFIED: every material branch and control has accepted current evidence.
4. OPERATOR_APPROVED: a named checklist review has no unresolved issue.
5. SUBMISSION_READY: accepted evidence, outputs and commercial scope satisfy the submission SEE gate.

A higher trust label must never be inferred from polished prose or document appearance.

## Why one-off LLM research is faster

A general LLM can search several documents, infer likely applicability and write a persuasive brief for one user in seconds. That is useful research, but it is not the same contract as a repeatable commercial product.

Plannera must additionally prove that:

- the correct current instruments were used;
- the rules apply to the exact site and proposal;
- missing evidence did not become an assumed negative;
- every important control is traceable to its source clause;
- stale or superseded controls are detectable;
- the same accepted inputs produce the same branch result;
- evidence remains attached through reload, purchase and document generation; and
- paid outputs fail closed until the required review and output evidence exists.

The LLM may explain and render an accepted pathway. It must not originate authoritative branches or numeric controls at request time.

## Recommended decision architecture

Use a retrieved-then-validated hybrid:

1. Retrieval identifies candidate LEP, DCP, spatial and uploaded evidence.
2. Structured extraction proposes controls, applicability conditions and source locators.
3. Deterministic validation checks source authority, dates, hashes, units, ranges and scope.
4. Human review promotes a control or rule into accepted use where required.
5. A deterministic engine evaluates accepted rules into STOP, PROCEED, MERIT_ASSESSMENT or MORE_EVIDENCE_REQUIRED.
6. The LLM explains the accepted result and renders the customer-facing brief.

Raw retrieval or an LLM response must never directly create an evidence-verified or submission-ready conclusion.

## Existing foundation

The repository already provides important parts of this chain:

- Project, Property, SiteContext and Artefact records;
- Instrument and versioned Clause evidence;
- normalized LEP zone objectives and land uses;
- DCP ingestion, clauses, topic tags, numeric metadata and search chunks;
- upload readability, indexing and content hashes;
- authoritative spatial provenance assessment;
- Detailed Planning Pack and Quick Site Check lineage;
- submission SEE source, section, output and operator-review acceptance; and
- the persistent exact-scope A$49 credit ledger accepted in isolated Preview.

## Material gaps

Item 74H must close these gaps without weakening existing acceptance:

- durable address-level spatial provenance that survives reload and artefact generation;
- typed planning controls with value, unit, comparator and applicability;
- immutable DCP edition and amendment lineage equivalent to LEP clause versioning;
- land-area bands and other structured predicates;
- versioned pathway definitions, nodes, edges and outcomes;
- control-level and branch-level source citations, not section-level citations alone;
- an immutable pathway assessment tied to exact site, proposal, graph and instrument versions;
- stale, superseded, unresolved and incomplete evidence blockers; and
- reuse of one accepted result across the free, A$49 and A$749 renderings.

## Source and currentness contract

Every material control must resolve through:

pathway result -> planning control -> source clause -> instrument edition -> official source

The minimum evidence is:

- official HTTPS source;
- instrument and edition identifier;
- clause or source locator;
- source content hash;
- effective-from and effective-to dates where available;
- retrieval timestamp;
- extraction method;
- verification status and reviewer where required;
- last-verified timestamp;
- supersession relationship; and
- explicit applicability and limitation data.

A disclaimer cannot make stale or unverified evidence acceptable.

## First end-to-end proof

The first slice must demonstrate:

- authoritative address and zone resolution;
- durable site and spatial provenance;
- confirmed proposal and ancillary-use inputs;
- at least one lot-area band;
- typed area, height and setback controls;
- deterministic stop, proceed, merit and more-evidence paths;
- source citations for every material branch and number;
- stale-source rejection;
- free pathway rendering;
- A$49 Planning Controls Pack reuse;
- A$749 submission SEE candidate reuse; and
- protected Preview evidence with no Production checkout.

The exact Byron site, proposal fixture and source clauses must be confirmed from current authoritative evidence before implementation. Do not invent a zone-control pairing to satisfy the acceptance contract.

## Safety boundary

Until separately approved:

- Production checkout remains false or absent;
- no Production payment or Stripe lifecycle is executed;
- no Production data or schema is changed;
- no customer address or uploaded content is placed in CI, logs or repository fixtures;
- no credential value is copied, printed or documented;
- no draft Item 74 PR is merged; and
- no red acceptance result is made green by weakening evidence requirements.

## Relationship to Item 74

Item 74H does not replace the launch, whole-LGA, spatial, submission SEE or credit work. It connects them into one customer-visible evidence pathway.

The delivery sequence remains:

1. durable address-to-artefact provenance;
2. one deterministic Byron pathway;
3. protected synthetic and controlled-address acceptance;
4. reuse in the A$49 Planning Controls Pack;
5. reuse in the A$749 submission SEE; and
6. whole-LGA Byron and Kempsey commercial expansion after the first slice is accepted.
