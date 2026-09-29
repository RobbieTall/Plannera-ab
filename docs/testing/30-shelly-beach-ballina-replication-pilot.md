# Live User Pilot — 30 Shelly Beach Road, East Ballina

Status: Candidate council-replication and Research Viewer pilot; not yet a validated golden case  
Last updated: September 2026

## Purpose

Use 30 Shelly Beach Road as the first post-Byron/Kempsey council-replication acceptance case for the Research Viewer and wider planning-intelligence architecture.

This case should prove that a new council can be added largely through configuration, source discovery/registration and repeatable validation rather than bespoke feature development.

## Acceptance focus

- replicate the Byron/Kempsey council-adapter/source-registry pattern into Ballina;
- establish authoritative State and council spatial sources and their role per layer;
- register and validate relevant local planning/DCP sources;
- verify zoning, height, lot-size/density and relevant coastal/environmental constraints against current authoritative sources;
- test alternative housing/complying-development pathways only where current rules genuinely support them;
- make cited controls and mapped constraints directly inspectable in the Research Viewer;
- preserve provenance, currency, source hierarchy and unresolved conflicts;
- prove the same evidence chain can feed downstream planning-controls analysis and artefact generation;
- identify any council-specific code that reveals a weakness in the reusable adapter architecture.

## Replication rule

Ballina should not become another bespoke integration. If adding it requires substantial special-case application logic rather than council/source configuration plus validated adapters, treat that as an architecture defect to fix before broader rollout.

## Relationship to other live pilots

- **41 Julian Rocks Drive, Byron Bay:** depth, plan-ingestion and output-quality test inside an established LGA.
- **503 Comleroy Road, Kurrajong:** Just-in-Time LGA Activation test for a genuine user entering an unsupported LGA.
- **30 Shelly Beach Road, East Ballina:** deliberate replication test proving the established council/Research Viewer pattern can be rolled into the next LGA efficiently.

Together these test three different scaling behaviours: depth, automatic activation and repeatable council replication.

## Sequencing

Finish the current commercial release gates and prerequisite fixes first. Complete Byron/Kempsey Research Viewer/source accuracy next. Then use Ballina and this site as the first replication proof before broader council expansion.

## Success signal

Ballina can be added without a bespoke rebuild, the site's relevant planning and spatial sources are current and inspectable inside Plannera, and the same reusable architecture supports downstream reasoning and artefacts.
