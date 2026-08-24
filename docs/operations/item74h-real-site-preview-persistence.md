# Item 74H hosted composite-scope persistence acceptance

## Purpose

The protected Vercel Preview build now exercises both Item 74H persistence
boundaries against the isolated Neon branch.

The established scenario proves that unresolved synthetic evidence persists and
replays safely while both paid stages remain blocked.

The composite-scope scenario proves that a fully synthetic, evidence-confirmed
bridge result can:

- persist exactly one PROCEED assessment;
- replay the same assessment without duplication;
- preserve the composite evidence and exact commercial scope after reload;
- bind exactly one synthetic A$49 Planning Controls Pack;
- replay that same pack binding;
- bind exactly one synthetic A$749 submission SEE;
- replay that same SEE binding;
- clean every synthetic row to zero residue.

## Safety

The scenario is restricted by the parent harness to:

- Vercel Preview;
- branch agent/item74h-pathway-check;
- the isolated Item 74H Neon endpoint;
- disabled Planning Controls Pack checkout;
- disabled submission SEE checkout.

Every project, property, site, evidence item and artefact is explicitly marked
synthetic and non-authoritative. No real address, coordinate, parcel identifier,
survey, plan, payment or Production record is used.

Passing this acceptance proves the durable engineering path only. It does not
make the actual Byron site evidence-confirmed, does not replace operator review,
and does not activate checkout.

## Build evidence

The vercel-build command runs the composite scenario through
accept:pathway-persistence-preview. A successful JSON summary must show:

- decision PROCEED for the synthetic composite scope;
- one replay-safe assessment;
- one replay-safe pack binding;
- one replay-safe SEE binding;
- zero cleanup residue;
- Production checkout false;
- Production mutation false.


## Hosted execution record: 2026-08-25

Deployment dpl_FP9mYNChWg6jZTsnmzFXJoe716pW reached the composite
Preview persistence scenario after the launch and whole-LGA gates passed.

The first composite run exposed a cleanup selector defect. The commercial
scope key is a SHA-256 digest, but cleanup searched that field for the
synthetic prefix. PostgreSQL correctly refused to delete the referenced
PathwayDefinition while the assessment remained.

The failed synthetic rows were identified only by the explicit
item74h-paid-df36579afb6c prefix and removed from the isolated Preview branch.
A read-only residual audit then returned zero projects, sites, definitions,
spatial rows, artefacts, bindings, properties and users.

Commit 6a931730ba3fdb9cf38c2589103cb4afb8de42ea changed both cleanup and
residual counting to select assessments by the synthetic projectId. A focused
regression contract now freezes that invariant.

The exact-head hosted rerun remains required. Vercel rate-limited the immediate
follow-up deployment, so the composite paid-scope acceptance must remain
NOT EXECUTED AFTER FIX until a new protected Preview deployment passes.
