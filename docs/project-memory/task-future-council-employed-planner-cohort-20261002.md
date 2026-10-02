# Future task — council-employed planner cohort compliance architecture

Status: **FUTURE / OFF BY DEFAULT / DO NOT PRODUCTISE FROM HISTORICAL PR #419**

Historical source: PR #419 — Consultant Network and council-employed planner pathway.

## Decision

Preserve the concept of a future council-employed-planner cohort, but do not treat employment by a council as a credential, endorsement or automatic eligibility signal.

Independent consultants and the ordinary consultant network can proceed on their own roadmap. A council-employed cohort is a separate compliance-sensitive capability and remains disabled until its rules, evidence model and operating process have been independently reviewed.

## Current NSW framework checkpoint — 2 October 2026

Official NSW Office of Local Government material confirms:

- the 2020 Model Code of Conduct remains the current prescribed minimum standard for council officials;
- every council must adopt a code incorporating the Model Code, and a council may impose requirements that are more onerous;
- Model Code clauses 5.23–5.27 address outside paid work;
- for ordinary council staff, paid private work that relates to council business or may conflict with council duties requires written notification to the general manager and written general-manager approval under the Model Code;
- the general manager may prohibit such outside work;
- outside work must not conflict with official duties or use confidential information/council resources;
- section 353 of the Local Government Act 1993 remains a statutory baseline that must be rechecked against the current in-force text at implementation.

Official source pages checked:
- NSW OLG — Model Code of Conduct: https://www.olg.nsw.gov.au/councils/governance/model-code-of-conduct
- NSW OLG — Model Code of Conduct for Local Councils in NSW 2020
- NSW legislation — Local Government Act 1993, current in-force version, s 353

## Live reform warning

The NSW Government is currently reforming the conduct framework. As at 2 October 2026, OLG is consulting on a proposed new **Model Code of Conduct for Council Staff, Delegates and Committee Members**, with submissions closing 5 pm Monday 12 October 2026.

The product must not freeze the 2020 clause wording into a permanent eligibility engine while that reform is unresolved.

Before implementation:
1. check whether the new staff/delegates code has been finalised/prescribed;
2. compare its outside-employment/conflict requirements with the 2020 code and current s 353;
3. check the actual employing council's adopted code, secondary-employment policy and approval instrument;
4. record any stricter council-specific restrictions.

## Product eligibility model

A council-employed planner cohort must be **explicitly opt-in and default disabled**.

A provider is not eligible merely because:
- they work for a council;
- they work outside their employing LGA;
- they hold a planning qualification;
- they self-attest that no conflict exists.

Eligibility requires a current private operator-reviewed record covering:

- employing council;
- current role/functions;
- outside-employment approval evidence where required;
- approving authority/person;
- approval date;
- expiry/review date if any;
- approved work type/scope;
- geographic restrictions;
- subject-matter/project restrictions;
- other employer conditions;
- professional/insurance requirements where applicable;
- last policy/code review date;
- eligibility state.

Never publish sensitive employment-approval evidence in the provider profile.

## Council-specific policy first

Because councils may impose stricter requirements than the Model Code:

- never assume the state minimum is enough;
- require the relevant employing-council policy/code to be reviewed before that employee is activated;
- record the reviewed policy version/date;
- suspend eligibility when the approval/policy cannot be confirmed;
- recheck after employment/role changes, approval expiry, policy revision or material scope change.

## Per-job conflict screening

Employing-LGA exclusion is a useful default but is **not a safe harbour**.

Before each offer, screen at minimum:
- employing LGA;
- adjoining/shared-service or regional arrangements where relevant;
- whether the employee has council functions touching the site/applicant/owner/related entity;
- current or prior council matters connected to the project;
- actual, potential and perceived conflicts;
- approval conditions/restrictions;
- any role change since onboarding.

Ambiguous cases go to human review; do not auto-match.

The provider must make a per-offer declaration, but self-declaration alone does not override an employer restriction or known platform conflict.

## Marketing and representation guardrails

Never imply:
- council endorsement;
- privileged access;
- influence over assessment;
- preferential treatment;
- an inside track;
- guaranteed approval;
- access to confidential council information.

Public-facing wording should describe the provider only in their independent/private capacity where lawful and approved.

Council logos, email accounts, systems, templates, work time, confidential information and other council resources must not be used for private Plannera work.

## Privacy

Public profiles must not expose:
- private approval documents;
- HR correspondence;
- conflict records;
- internal role details beyond what is intentionally public;
- private council-system information.

Keep provider eligibility/conflict evidence in protected operator records with least-privilege access, retention/deletion rules and audit history.

## Legal / operational review before pilot

Before any council-employed provider is invited:
- current NSW Act/regulation/code review;
- employing-council policy review;
- legal review of the proposed platform process;
- professional registration/licensing requirements by discipline;
- professional indemnity/public liability requirements;
- privacy/records-retention review;
- conflict/dispute/escalation process;
- operator training and evidence-retention standard.

## Pilot sequence

1. Launch/test consultant network first with eligible independent consultants.
2. Keep council-employed cohort disabled.
3. After the NSW staff-code reform settles, select a small manual cohort only where employer approval and restrictions can be independently verified.
4. Manually screen every offer.
5. Measure conflict/refusal/approval-maintenance burden before automating matching.
6. Productise only controls proven in the manual pilot.

## Acceptance cases

At minimum:
- no approval evidence -> blocked;
- expired/withdrawn approval -> blocked;
- employing LGA -> blocked by default;
- stricter council-specific geographic restriction -> blocked;
- known related/current council matter -> blocked;
- ambiguous conflict -> human review required;
- changed role/employer -> eligibility suspended pending recheck;
- approval condition violated -> blocked;
- clear independently approved case -> offer may proceed only after per-job screen;
- no public profile leaks private approval/conflict data;
- no wording implies council endorsement/influence.

## Relationship to historical PR #419

Do not merge the September documentation branch as the implementation source.

The useful concept is retained here, updated for the live 2026 reform context. Shared README/project-memory changes should be generated later from then-current product truth.

No runtime/API/schema/billing/Production change is authorised by this task.
