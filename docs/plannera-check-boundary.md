# Plannera Check product boundary

Plannera Check is the mobile-first acquisition surface inside Plannera. It is not a separate subscription product, repository, database, duplicated backend, or standalone checkout path.

The free check must remain in the existing Next.js app and reuse the same requester/session Project, SiteContext, Quick Site Check, Detailed Planning Pack, Statement of Environmental Effects, referral, evidence, and artefact services as the normal workspace.

A session-owned project may be used as an ephemeral technical container while a visitor receives useful Quick Site Check value. After that value is delivered, the user-facing promotion boundary is **Create project in Plannera** or **Save as a Plannera project**. Claiming or promoting the account must reuse that exact project and evidence snapshot rather than creating a duplicate project.

A later DCP Deep Dive purchase, when implemented, must bind to the claimed project, exact site snapshot, and proposal intent. This slice implements the free-check promotion gate: after useful value, **Create project in Plannera** saves the exact displayed Quick Site Check evidence snapshot on the same requester/session project before entering the full workspace, or reuses an equivalent current-site snapshot when one already exists. It does not implement price, Stripe, quotas, credits, checkout, entitlements, auth policy, PWA manifest/service worker, or consultant sending.

The in-workspace commercial funnel stays evidence-driven: Site → Quick Site Check → Detailed Planning Pack → SEE / consultant handoff. Stage state must be derived from current-site/proposal/exact-DPP evidence plus the existing commercial next-action result, not from artefact existence alone. Evidence/topic-level confidence and the next honest action remain the commercial gate; Plannera Check must not introduce A$2 microtransactions or global traffic-light certainty.

Mobile-first web is the posture for now. PWA/native surfaces can be revisited after the live golden chains and deferred billing/auth work are approved.
