# Agent Execution Protocol

Purpose

- Keep repository changes safe, auditable, and aligned to a single issue.
- Prevent risky actions (especially destructive commands) unless explicitly approved.

Scope Control

- Every session starts with a scope statement.
- Do not implement work outside the stated issue.
- If a request implies cross-cutting changes, pause and ask for explicit approval.

Safe Environment Defaults

- Use a feature branch; never write directly to protected branch.
- No destructive git commands without explicit approval:
  - `git reset --hard`
  - `git clean -fdx`
  - `rm -rf` / recursive delete
  - force pushes / history rewrites
- No direct access to secrets from agent output.
- No secret values in chat output, even in truncated snippets.

Command Allowlist (per-task)

- Prefer these low-risk actions:
  - Read files and inspect diffs
  - Make targeted file edits
  - Run requested project tests/lint/build commands when explicitly permitted
- Any operation that touches external systems (deploy, PR open, secret mutation, payment/webhook config, DB schema changes) requires explicit user approval.

Workflow

1. Investigate and confirm issue context.
2. Share a short plan and any ambiguity before coding.
3. Implement only the accepted plan.
4. Summarize changed files and assumptions.
5. Stop before merge when:
   - required tests are not green, or
   - any side-effect action is pending approval.

PR and Merge Safety

- Open PR only after tests required for the issue are green.
- Include a checklist in PR body:
  - Scope matched issue
  - Files changed
  - Commands run
  - Tests and results
  - Risks / follow-up tasks
- Do not merge if:
  - required checks are failing
  - evidence/audit trail is missing
  - user requested hold/rollback condition applies

Recovery and Rollback

- Avoid partial or hidden changes.
- Prefer reversible changes and include rollback notes in PR summary.
- If a risky path is needed, ask for a go/no-go before execution.

Audit Trail

- Maintain a visible log in thread and PR description:
  - commands run
  - files touched
  - any manual approvals granted
- For any unexpected state changes, flag immediately and report back.

Recommended Repository Settings (one-time)

- Enable branch protection on main branch.
- Require PR review for production-impacting paths.
- Require status checks before merge.
- Require explicit approvals for environment/secrets workflows.

Canonical Documentation

- Treat the repository's GitHub documentation, especially `docs/project-memory/`, as the canonical source of product and delivery continuity.
- Update the relevant project-memory, decision, operating, and README records whenever implemented behaviour, acceptance evidence, operating requirements, or product direction changes.
- Do not describe a capability as accepted, production-ready, or complete until the corresponding evidence exists.
