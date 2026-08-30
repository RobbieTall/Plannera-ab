# Pathway proposal attestation boundary

A proposal attestation is structured user input for the free Pathway Check. It
allows Plannera to calculate preliminary comparisons without representing an
estimate as verified evidence.

## Supported protected slice

The first contract covers a non-habitable rural shed or outbuilding used to
store machinery and goods for managing land and agriculture. Inputs include:

- landholding area;
- proposed and existing aggregate farm-building footprint;
- proposed height;
- road, side and other-boundary setbacks;
- unresolved road category.

The calculation reports aggregate footprint and site coverage. For the Byron
rural-road slice it compares the stated road setback against both the 15 metre
other-road minimum and the 55 metre classified-road minimum.

## Trust and decision rules

- All values enter at USER_ATTESTED trust.
- An unresolved road category never defaults to the less restrictive control.
- Meeting both possible road minima may be reported as a robust preliminary
  distance comparison.
- The overall deterministic decision remains MORE_EVIDENCE_REQUIRED.
- User attestations never unlock the Planning Controls Pack or submission SEE.
- Paid eligibility requires the evidence and operator approvals enforced by
  the real-site evidence and commercial-binding policies.

This boundary lets the free funnel provide immediate useful guidance and
capture structured SEE inputs without weakening provenance, currency or
liability controls.

Production checkout remains disabled. The contract performs no Production
data, schema, environment, payment or deployment mutation.
