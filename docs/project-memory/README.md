# Plannera Project Memory

This folder is the canonical, in-repo product memory for Plannera.

Its purpose is to keep strategic direction durable and discoverable so planning, product, and engineering decisions stay aligned over time.

## What belongs here

- product philosophy and positioning references
- architecture decisions and constraints
- roadmap priorities and sequencing
- current focus and next actions
- confidence and quality standards

## Where we are aiming

The [canonical future-state platform design](../product/future-state-platform-design.md) defines address-first Home → Site Intelligence → separate Project Workspace, with one Library/Sources and Create area. [#454](https://github.com/RobbieTall/Plannera-ab/issues/454) tracks post-commercial delivery; [#453](https://github.com/RobbieTall/Plannera-ab/issues/453) tracks A$29/A$49 reconciliation. These are future directions, not completed capabilities. The current commercial gate and PR #452 remain unchanged.

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
