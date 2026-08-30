# Item 74H Preview lineage repair

Date: 2026-08-24

## Diagnosis

The first Vercel-provisioned Item 74H Neon branch inherited from `main`.

Its read-only launch smoke correctly failed:

- Byron coverage was `QUEUED`;
- Byron council source chunks were absent;
- Kempsey coverage was `SEARCHABLE_READY`; and
- Kempsey LEP source provenance was invalid.

No checker was weakened and no planning evidence was invented.

## Corrected lineage

The misparented branch was preserved and renamed:

- `preview/obsolete/item74h-main-parent`
- parent: `main`
- rows or schema mutated: none

A new exact-name branch was created:

- name: `preview/agent/item74h-pathway-check`
- parent: `preview/agent/item74f-see-credit`
- parent branch ID: `br-winter-lake-a7kfbv6z`
- branch data and schema copied at the current parent point
- auto-delete: disabled

The accepted lineage is now:

`main -> Item 74D -> Item 74E -> Item 74F -> Item 74H`

Item 74C remains retained as authoritative whole-LGA evidence, although Neon records its original Vercel branch as a direct child of `main`.

## Safety

- Production data or schema changed: no
- Item 74H schema migration applied: no
- customer data used: no
- credential exposed: no
- Stripe or checkout activity: no
- acceptance checker weakened: no

This audit commit triggers a fresh Vercel Preview so the exact-name corrected branch can be verified through the normal read-only launch and whole-LGA gates.
