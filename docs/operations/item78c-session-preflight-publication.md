# Item 78C diagnostic publication boundary

Draft PR #420 targets the existing acceptance branch, not main. The draft branch is fix/item78c-session-preflight-20260923. Its vercel.json disables Git deployments only for that exact branch. Existing application functions and cron configuration is retained. Main, the active acceptance branch and existing authorised pins are unchanged by publication.

The deployment-disable rule follows https://vercel.com/docs/project-configuration/git-configuration . The initial complete Git tree/commit existed before the branch reference was created, so there was no intermediate new-branch commit without the rule. The inherited workflow push triggers were inspected at the base acceptance SHA; they target other named branches. A post-initial-publication Vercel list query returned zero deployments for the examined time window. This is a point-in-time observation, not protection against a later manual deployment or merging into a differently configured branch.

The diagnostic workflow is manual-only. Its separate PR contract workflow has no package installation, protected environment or application secrets. Publishing tests does not dispatch the real diagnostic. Existing whole-funnel coverage is not replaced or weakened.

Manual workflow dispatch availability must be resolved before execution: a newly introduced workflow present only on a non-default branch must not be assumed dispatchable. This PR does not authorise changing main simply to register it. Review integration with an existing registered workflow if necessary, retaining original acceptance coverage and exact-commit protections.

Read-only UI inspection found both council environments with required reviewers disabled, administrator bypass enabled and one exact acceptance-branch rule. No protection setting has been changed. The proposed workflow requires those missing protections before credentials. Required API metadata access: https://docs.github.com/en/rest/deployments/environments and https://docs.github.com/en/rest/deployments/branch-policies .

Before merge/repin/run: complete review and CI, preserve canonical project-memory history, establish publication and dispatch safety, record protection settings actually saved, record exact approved SHA, then run the bounded diagnostic. Do not run stateful acceptance unchanged or activate Production checkout. Issue #395 is the rolling evidence record and docs/project-memory/item78c-current-handover.md is the repository handover.
