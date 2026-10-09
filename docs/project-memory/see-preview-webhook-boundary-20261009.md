# Submission SEE Preview webhook boundary - 9 October 2026

Status: draft PR #452, commercial HOLD. This document describes code pending GitHub CI; it does not claim a deployed webhook or customer acceptance.

The Submission SEE payment workflow now has a **separate** `/api/webhooks/stripe/see` route. The existing Planning Controls Pack webhook remains untouched. The new route fails closed unless the exact Byron or Kempsey Preview branch, its isolated Neon target, working-document generation flag, Preview checkout flag and test-only Stripe configuration all match the existing checkout configuration gate. A missing signature, malformed body or signed live-mode event cannot open the database. Signed test-mode events are passed to the existing atomic payment persistence, which checks the purchase and scope before changing an entitlement. Failed transitions return a retryable error without printing payloads or credentials.

This is **not yet enabled** and no Stripe destination, Preview deployment, test payment, entitlement, document, or Production change is asserted by this code commit. The separate destination must eventually be configured to this path with its matching test-mode signing secret for each isolated Preview. Do not point the Production Stripe endpoint at this route or turn on Production checkout.

Before customer acceptance, connect the customer quote/checkout UI; validate signed delivery and replay against the two isolated Preview databases; prove the exact project entitlement; then generate, download and reopen private versioned DOCX/PDF for both councils, including denial and evidence-warning checks. Keep source applicability and DCP gaps visible. Synthetic CI proves code behavior only, not hosted or statutory correctness.

Research Viewer and Project Controls remain future work. This change does not alter their source/provenance contracts or immutable acceptance snapshots.
