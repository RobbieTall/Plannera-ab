# Consultant credential disclosure

Status: **IMPLEMENTED ON CURRENT REFERRAL SURFACE / FUTURE DIRECTORY-RFQ REUSE**

Updated: 24 September 2026 (Australia/Sydney). Tracking: Issue #425.

## Approved disclosure

Consultants self-report their qualifications and regions of service. Plannera does not verify professional credentials or memberships. Users should confirm relevant licences directly with consultants before engaging.

## Current product placement

There is no live consultant directory or RFQ marketplace in the current product. The real customer-facing consultant surface is the human-operated referral panel attached to an exact Expert Review Request.

This slice renders the approved disclosure immediately before the referral contact/consent form. The existing referral copy separately states that Plannera does not promise matching, availability, competing quotes or response times.

## Reuse contract

The disclosure is exported through the reusable `ConsultantCredentialDisclosure` component and the canonical `CONSULTANT_CREDENTIAL_DISCLOSURE` string. Any future consultant directory, consultant profile, RFQ submission or matched-consultant surface should reuse this component/string rather than paraphrasing it.

## Boundary

This disclosure does not:

- verify a consultant;
- represent that Plannera checked a licence, registration or professional membership;
- collect or store credential data;
- change consultant matching or referral delivery;
- change billing, Production, environment variables or database state.

If Plannera later introduces verified credentials, the verification source, date and scope must be explicit and must not silently reuse this self-report disclosure.
