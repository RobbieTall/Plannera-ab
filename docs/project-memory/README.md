# Plannera Project Memory

## Current execution checkpoint - 29 September 2026

Start with [Item 78C current handover](item78c-current-handover.md), then [the closeout runbook](../operations/item78c-acceptance-closeout.md). The protected automated gate passed at `0a871d38a5806e6a28404700d660f5d363f3a1d4`; the remaining work is documented review and handover, not repeat payments or fixture recreation.

Do not confuse the accepted Preview runner, deployed application snapshots, current main, and open presentation PRs. Production remains outside this acceptance and checkout must stay disabled.


This folder is the canonical, in-repo product memory for Plannera.

Its purpose is to keep strategic direction durable and discoverable so planning, product, and engineering decisions stay aligned over time.

## What belongs here

- product philosophy and positioning references
- architecture decisions and constraints
- roadmap priorities and sequencing
- current focus and next actions
- confidence and quality standards

## Source-of-truth map

1. Product philosophy: `docs/plannera-product-philosophy.md`
2. JIT LGA architecture: `docs/architecture/just-in-time-lga-activation.md`
3. Council Edition strategy: `docs/project-memory/council-assessment-strategy.md`
4. Project memory index (this folder): `docs/project-memory/README.md`
5. Build-next queue: `docs/project-memory/build-next.md`
6. Active decisions register: `docs/project-memory/decision-register.md`

## Maintenance rule

Any PR that changes product direction, delivery model, confidence policy, or roadmap sequencing must update at least one file in `docs/project-memory/`.

Every merged Codex task must also update `docs/project-memory/build-next.md` to mark the completed item as ✅ DONE and add any follow-up items discovered. If the task changes LGA coverage state, active focus, or next actions, update this file too so anyone picking up the project can read the current state without digging through git history.
