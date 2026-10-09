import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("./artefact-service", () => ({
  resolveCurrentDetailedPlanningPackChain: vi.fn(),
  parsePreSeePlanningMemoContent: vi.fn(),
  ArtefactValidationError: class extends Error {},
}));
import { parsePreSeePlanningMemoContent, resolveCurrentDetailedPlanningPackChain } from "./artefact-service";
import { resolveSeeCheckoutScope, type SeeCheckoutScopeClient } from "./submission-see-checkout-scope";

const input = { actorId: "owner-1", projectId: "public-project-1",
  sourceDetailedPlanningPackArtefactId: "pack-1", sourceMemoArtefactId: "memo-1" };
const fixture = () => {
  const site = { address: "10 Synthetic Street, Byron Bay NSW, Australia", zoneCode: "R1", zoneLabel: "R1", lga: "BYRON" };
  const project = { id: "project-1", publicId: input.projectId, userId: input.actorId,
    createdById: input.actorId, isDemo: false, zoningCode: "R1",
    siteContext: { lgaCode: "BYRON", formattedAddress: site.address, zone: "R1" } };
  const pack = { projectId: project.id, proposalBrief: "Synthetic dual occupancy", site: { ...site } };
  const qsc = { projectId: project.id, site: { ...site } };
  const memo = { projectId: project.id, siteDescription: { ...site },
    sourceDetailedPlanningPack: { artefactId: "pack-1", sourceQuickSiteCheckArtefactId: "qsc-1" } };
  const selected = { validProvenance: true, pack, quickSiteCheck: qsc,
    artefact: { id: "pack-1", staleAt: null as Date | null, payload: pack },
    quickSiteCheckArtefact: { id: "qsc-1", staleAt: null as Date | null, payload: qsc } };
  const row = { id: "memo-1", projectId: project.id, type: "pre_see_planning_memo",
    payload: memo, staleAt: null as Date | null };
  const db = { project: { findFirst: vi.fn().mockResolvedValue(project) },
    artefact: { findFirst: vi.fn().mockResolvedValue(row) } };
  vi.mocked(resolveCurrentDetailedPlanningPackChain).mockResolvedValue({
    candidates: [selected],
  } as unknown as Awaited<ReturnType<typeof resolveCurrentDetailedPlanningPackChain>>);
  vi.mocked(parsePreSeePlanningMemoContent).mockReturnValue(
    memo as unknown as NonNullable<ReturnType<typeof parsePreSeePlanningMemoContent>>);
  return { project, selected, row, memo, db, run: () => resolveSeeCheckoutScope(
    db as unknown as SeeCheckoutScopeClient, input, "BYRON") };
};
beforeEach(() => vi.clearAllMocks());
describe("reconstructed exact SEE checkout scope coverage", () => {
  it("binds internal project and exact saved memo enum", async () => {
    const h = fixture();
    expect(await h.run()).toMatchObject({ userId: "owner-1", projectId: "project-1",
      quickSiteCheckArtefactId: "qsc-1", council: "BYRON" });
    expect(h.db.artefact.findFirst).toHaveBeenCalledWith({ where: {
      id: "memo-1", projectId: "project-1", type: "pre_see_planning_memo" } });
  });
  it.each(["", "dev-bypass-user"])("rejects unauthorised actor before DB %s", async (actorId) => {
    const h = fixture();
    await expect(resolveSeeCheckoutScope(h.db as unknown as SeeCheckoutScopeClient, { ...input, actorId }, "BYRON"))
      .rejects.toThrow("source_scope_mismatch");
    expect(h.db.project.findFirst).not.toHaveBeenCalled();
  });
  it("rejects another owner even when the mocked query returns a project", async () => {
    const h = fixture(); h.project.userId = "other-owner";
    await expect(h.run()).rejects.toThrow("source_scope_mismatch");
  });
  it("rejects demo projects", async () => {
    const h = fixture(); h.project.isDemo = true;
    await expect(h.run()).rejects.toThrow("source_scope_mismatch");
  });
  it("rejects another council", async () => {
    const h = fixture(); h.project.siteContext.lgaCode = "KEMPSEY";
    await expect(h.run()).rejects.toThrow("source_scope_mismatch");
  });
  it("rejects an unselected pack", async () => {
    const h = fixture(); h.selected.artefact.id = "different-pack";
    await expect(h.run()).rejects.toThrow("source_scope_mismatch");
  });
  it("rejects invalid provenance", async () => {
    const h = fixture(); h.selected.validProvenance = false;
    await expect(h.run()).rejects.toThrow("source_scope_mismatch");
  });
  it.each(["pack", "qsc", "memo"])("rejects a stale %s", async (which) => {
    const h = fixture();
    if (which === "pack") h.selected.artefact.staleAt = new Date();
    if (which === "qsc") h.selected.quickSiteCheckArtefact.staleAt = new Date();
    if (which === "memo") h.row.staleAt = new Date();
    await expect(h.run()).rejects.toThrow("source_scope_mismatch");
  });
  it("rejects an invalid memo payload", async () => {
    const h = fixture(); vi.mocked(parsePreSeePlanningMemoContent).mockReturnValue(null);
    await expect(h.run()).rejects.toThrow("source_scope_mismatch");
  });
  it("rejects a memo from another project", async () => {
    const h = fixture(); h.memo.projectId = "other";
    await expect(h.run()).rejects.toThrow("source_scope_mismatch");
  });
  it("rejects a memo with a different site-check link", async () => {
    const h = fixture(); h.memo.sourceDetailedPlanningPack.sourceQuickSiteCheckArtefactId = "other";
    await expect(h.run()).rejects.toThrow("source_scope_mismatch");
  });
  it("rejects a site-address substitution", async () => {
    const h = fixture(); h.memo.siteDescription.address = "99 Different Street";
    await expect(h.run()).rejects.toThrow("source_scope_mismatch");
  });
  it("rejects a zone substitution", async () => {
    const h = fixture(); h.selected.pack.site.zoneCode = "R2";
    await expect(h.run()).rejects.toThrow("source_scope_mismatch");
  });
  it("binds source content into the quote signature", async () => {
    const h = fixture(); const first = await h.run();
    h.selected.pack.proposalBrief += " changed";
    const second = await h.run();
    expect(second.sourceSignature).not.toBe(first.sourceSignature);
    expect(second.proposalFingerprint).not.toBe(first.proposalFingerprint);
  });
});
