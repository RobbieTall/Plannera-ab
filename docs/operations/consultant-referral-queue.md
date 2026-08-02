# Consultant referral queue operations

## Current delivery model

Plannera's first referral target is a human-operated database queue. It does not automatically match consultants, advertise availability, invite competing quotes, verify credentials, or promise response times.

A user can submit only a newly generated `consultant-needs.v1` Expert Review Request whose project, current site, proposal, Planning Controls Pack, Quick Site Check and optional SEE provenance still match. Submission stores an immutable package snapshot and SHA-256 digest separately from the minimum follow-up contact details.

## Fail-closed configuration

Direct submission is unavailable unless both server variables are set on the same non-production deployment:

```text
CONSULTANT_REFERRALS_ENABLED=true
CONSULTANT_REFERRAL_QUEUE_TARGET=plannera_human_queue
```

Merge and deploy the Prisma migration before setting either variable. Production activation requires separate operator approval after the protected non-production acceptance passes. Do not set these variables in Production as part of an ordinary implementation or documentation PR.

## User consent and data

The submission form collects only contact name and contact email. The user must explicitly consent to storage, follow-up and manual sharing with a consultant if Plannera assigns the request. The consent contract is versioned as `consultant-referral-consent.v1`.

Contact details and package contents never enter commercial-funnel analytics. The user-facing API returns only the referral ID, truthful status history and timestamps. It never returns the stored contact details or immutable package snapshot.

## Operator queue

All operator calls require `x-admin-token` with the effective admin secret.

List the oldest queue entries first:

```text
GET /api/admin/consultant-referrals?status=SUBMITTED&limit=50
```

The protected response includes the contact details, package snapshot, digest, consent record and audit events needed to action the request. Do not copy this response into logs, tickets, GitHub artifacts or chat.

Update status only after the represented operational event has actually happened:

```json
{
  "referralId": "opaque-referral-id",
  "toStatus": "ACKNOWLEDGED",
  "reasonCode": "queue_reviewed"
}
```

Allowed path and truthful meaning:

| Status | Meaning |
| --- | --- |
| `SUBMITTED` | Saved in Plannera's queue; no consultant contact claimed |
| `ACKNOWLEDGED` | A Plannera operator has reviewed the queue item |
| `ASSIGNED` | A Plannera operator has actually sent the package to a consultant |
| `CONSULTANT_ACKNOWLEDGED` | The consultant has actually acknowledged receipt |
| `NEEDS_INFORMATION` | Plannera requires more information and will contact the user |
| `DECLINED` | Plannera cannot progress the request through the current queue |
| `CLOSED` | The referral is complete or otherwise closed |

Transitions are append-only and optimistic. Invalid skips, stale concurrent updates and terminal replays fail closed. Copying or downloading a package never advances status.

## Retention and deletion

Declined and closed records receive a deletion date 180 days after that terminal transition. The daily `/api/cron/consultant-referral-retention` job requires Vercel's `Authorization: Bearer <CRON_SECRET>` contract and deletes expired referral plus event rows. Project deletion cascades to referrals. A verified early deletion request can be completed with:

```text
DELETE /api/admin/consultant-referrals?referralId=<opaque-id>
```

## Non-production acceptance

Use one dedicated preview project and one newly generated review-request artefact. The protected acceptance must prove:

1. The target is an exact allowlisted HTTPS non-production deployment with referral submission enabled.
2. No referral already exists for the selected exact scope.
3. One synthetic, explicitly consented submission returns `SUBMITTED` and is visible in the protected operator queue with an intact snapshot version and digest.
4. Operator transitions reach `ACKNOWLEDGED`, `ASSIGNED`, `CONSULTANT_ACKNOWLEDGED`, then `CLOSED` in order.
5. The user endpoint reports the same audit history without contact details or package content.
6. The synthetic referral created by the run is deleted, and the safe artifact contains only opaque IDs, statuses, booleans and the package digest.

Never run acceptance against a real customer referral, an existing referral scope, a Production domain, or either protected Byron/Kempsey golden project without fresh explicit approval.
