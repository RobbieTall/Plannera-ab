# Item 74E submission SEE section compilation

Status: **SECTION COMPILER IMPLEMENTED / REAL PROJECT EXECUTION NOT PERFORMED**

## Purpose

This compiler turns an exact current DPP/QSC evidence chain and explicit
reviewed assessment inputs into the eight required submission SEE sections. It
does not ask a model to fill missing sections with generic planning prose.

## Required evidence

Compilation requires:

- one exact project ID across the DPP and source evidence memo;
- the exact current DPP artefact and Quick Site Check chain;
- matching council, zone and confirmed address scope;
- a commercially ready DPP with no unresolved topics;
- a registered source-ID set;
- a substantive, cited site-and-surrounds assessment;
- cited proposal evidence;
- current statutory source IDs;
- individually cited planning-control findings;
- one or more substantive environmental impact assessments;
- substantive mitigation for every accepted impact; and
- a substantive, cited conclusion.

Unknown source IDs are not copied through. Weak or uncited evidence causes the
affected section to be omitted, and the complete draft remains blocked.

## Generated sections

1. Executive summary
2. Site and surrounds
3. Proposed development
4. Statutory planning framework
5. Planning controls assessment
6. Environmental impacts
7. Mitigation measures
8. Conclusion

The compiler derives proposal and statutory facts from the current pack and
memo. Site context, environmental assessments, mitigation and conclusion
remain explicit evidence inputs. This avoids inventing environmental findings.

## Deterministic evidence

The Submission SEE Section Compilation workflow checks:

- complete Byron SP3 and Kempsey E2 section sets;
- substantive narrative and citations for every section;
- stale DPP/QSC provenance;
- absent environmental and mitigation evidence;
- invented source IDs; and
- unregistered planning-control citations.

The fixtures are not real project acceptance and do not establish professional
adequacy. Real acceptance still requires protected Preview evidence, polished
DOCX/PDF rendering, output hashes, exact-site binding, operator review and
payment test acceptance.

## Safety

- Production checkout remains disabled.
- The compiler is pure and performs no database writes.
- No Production schema, data or configuration is changed.
- No missing assessment is inferred.
- No real address, coordinate, parcel, credential or uploaded content appears
  in CI output.
