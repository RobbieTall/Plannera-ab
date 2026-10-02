# Codex task — reconcile #452 SEE front matter and PDF pagination

Status: **COMPLETED ON #452 / DO NOT RE-EXECUTE UNLESS THE RENDERER CHANGES**

## Completion record

The bounded presentation task was completed on the #452 lineage.

- Renderer fix lineage: `625d01920a33ecbc5f42bfcce8d14d248707fb59` → `8d91ef553827ef7b6fcfff4946d114501b8fa20f` → reviewed safety head `ea9f3339b4acdefcb35cf11ee41ddc0f9f7c5e38`.
- Build-safety fingerprint gate caught the unreviewed renderer change before the exact renderer hash was pinned.
- All 13 exact-head GitHub Actions passed at `ea9f333`.
- Exact synthetic artifact run `36994760847` / artifact `11221425681` was rendered and inspected page-by-page.
- PDF: 9 clean pages; DOCX: 8 clean pages.
- PDF page 2 keeps Document Control, Revision History, Proposal Summary and Document Status together.
- No observed clipping, overlap, broken tables/glyphs or orphan headings.

This closes synthetic presentation visual acceptance only. Actual hosted Byron/Kempsey customer output acceptance still belongs to the protected customer journey after the remaining council-provenance/sign-in gates.

The task body below is retained as historical implementation evidence.

---

You are a senior full-stack engineer (Next.js 14, TypeScript, Prisma, PostgreSQL, Vercel).

You have full access to the Plannera-ab repo and must investigate the codebase directly.

Your job is to:
- identify the real root cause of the presentation defect described below;
- propose the minimal, safest fix;
- implement only the presentation correction;
- verify with the relevant renderer/build-safety tests;
- provide clear non-developer verification steps.

You MUST NOT:
- guess without checking the repo;
- apply wide refactors;
- change public API response shapes;
- change planning/evidence/readiness logic;
- change billing, checkout, schema, environment or Production;
- weaken TypeScript, lint, renderer or build-safety checks.

---

# TASK OVERVIEW

Problem Summary:
- Current draft PR #452 is the reference document-delivery lineage.
- Exact-head synthetic QA on 2 October 2026 shows the PDF can render a near-empty standalone page containing only the **Document Status** callout between Document Control and Contents.
- The same synthetic DOCX does not show the same low-value page split.
- The later #452 renderer added Revision History and other front-matter content after the earlier professional presentation work.
- #433/#434/#435 are superseded independent code lanes; do not merge or copy them wholesale.

Expected behaviour:
- professional front matter should flow: Cover → Document Control/revision/proposal/status → Contents → optional Outstanding Evidence → substantive sections;
- no status-only orphan page;
- Document Control may span naturally if real content requires it, but the layout should not force an avoidable near-empty page;
- PDF and DOCX should remain semantically aligned while respecting format differences.

Important Context:
- canonical contract: `docs/operations/see-presentation-benchmark.md`;
- convergence plan: `docs/operations/pr-convergence-20261002.md`;
- current renderer lineage: `src/lib/submission-see-presentation.ts`, `src/lib/submission-see-renderer.ts`;
- preserve existing working/final gates and exact source/version semantics.

---

# EVIDENCE PROVIDED

- 2 October exact-head synthetic DOCX/PDF visual review recorded on PR #452.
- The reviewed PDF was 10 pages and contained the status-only page.
- The DOCX was 8 pages and did not exhibit the same standalone status page.
- #452 includes Revision History before Proposal Summary / Document Status in the PDF Document Control flow.
- The earlier #434 renderer did not contain the same Revision History block in that position.
- Do not assume removing Revision History is the right fix; inspect layout/space logic first.

Cross-check this evidence against the actual current branch before changing code.

---

# REQUIRED OUTCOME (ACCEPTANCE CRITERIA)

The fix is complete when ALL are true:

1. The representative synthetic PDF no longer contains an avoidable status-only/near-empty front-matter page.
2. Document Control, Revision History, Proposal Summary and Document Status remain present and readable.
3. Contents follows front matter and its page references remain correct.
4. DOCX real TOC/update-on-open behaviour remains intact.
5. Working SEE warnings remain prominent.
6. No planning section, citation, evidence issue, readiness state or source identity changes.
7. Deterministic output requirements remain satisfied.
8. No TypeScript errors.
9. Relevant renderer tests pass.
10. Build-safety contract passes without weakening fingerprints/checks.
11. Exact-head synthetic DOCX/PDF are regenerated and every page visually reviewed against `SEE Various Examples.pdf`.
12. No merge or deployment is performed by this task.

---

# WHAT YOU MUST DO

1. **Investigate first**
   - trace PDF front-matter layout and `ensureSpace`/page-break behaviour;
   - identify exactly why Document Status becomes isolated;
   - compare current DOCX/PDF front-matter layout semantics;
   - inspect current renderer tests before modifying them.

2. **Design a minimal fix**
   - prefer adjusting front-matter grouping/space reservation/layout rather than deleting required information;
   - do not hard-code page numbers or fixture-specific values;
   - preserve deterministic page-reference calculation.

3. **Implement the fix**
   - modify only renderer/presentation/tests genuinely required;
   - update build-safety fingerprint only after reviewing the exact changed transitive file, never to bypass the gate.

4. **Run build/tests**
   - full TypeScript;
   - relevant renderer/unit tests;
   - build-safety tests;
   - synthetic artifact workflow/credential-free compilation as applicable.

5. **Visual verification**
   - regenerate exact-head DOCX/PDF;
   - render/inspect every page;
   - compare front matter, hierarchy, whitespace and page furniture against the approved benchmark;
   - explicitly record whether the status-only page is gone and whether any new orphan page was introduced.

---

# OUTPUT FORMAT

When finished, output:

1. **Summary of what was wrong and how it was fixed (bullet points)**
2. **List of files changed (1 line per file)**
3. **Verification steps for Robbie (artifact/run + expected result)**
4. **Follow-up tasks (if needed)**

Do not claim commercial readiness from this presentation-only task.
