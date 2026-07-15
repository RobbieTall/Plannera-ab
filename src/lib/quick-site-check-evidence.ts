import type { QuickSiteCheckEvidenceSummary } from "@/types/quick-site-check";
import type { QuickSiteCheckLepSuccess } from "@/types/quick-site-check-lep";

const lepControls = (payload: QuickSiteCheckLepSuccess) => [
  payload.controls.heightOfBuilding,
  payload.controls.fsr,
  payload.controls.minLotSize,
].filter((control): control is NonNullable<typeof control> => control != null);

const landUseCount = (payload: QuickSiteCheckLepSuccess) =>
  payload.landUse.withoutConsent.length + payload.landUse.withConsent.length + payload.landUse.prohibited.length;

export function summariseQuickSiteCheckEvidence(payload: QuickSiteCheckLepSuccess): QuickSiteCheckEvidenceSummary {
  const controls = lepControls(payload);
  const citedControlCount = controls.filter((control) => control.confidence === "Cited" && Boolean(control.value)).length;
  const totalControlCount = controls.length;
  const objectiveCount = payload.objectives.length;
  const landUseEntryCount = landUseCount(payload);
  const hasDbZoneProvenance = payload.dataSource === "db_clauses" && Boolean(payload.zone);
  const hasStructuredZoneTable = hasDbZoneProvenance && objectiveCount > 0 && landUseEntryCount > 0;
  const label = hasStructuredZoneTable || citedControlCount > 0 ? "Cited" : "Unavailable";
  const sourceRef = payload.zone ? `${payload.lepName} Zone ${payload.zone}` : payload.lepName;

  if (label === "Unavailable") {
    return {
      label,
      citedControlCount,
      totalControlCount,
      landUseEntryCount,
      objectiveCount,
      sourceRef,
      detail: "No DB-backed LEP zone table or cited numeric LEP controls were available for this site. Treat LEP evidence as unresolved until source data is refreshed or verified.",
    };
  }

  const parts = [
    hasStructuredZoneTable
      ? `${objectiveCount} DB-backed zone objective${objectiveCount === 1 ? "" : "s"} and ${landUseEntryCount} land-use entr${landUseEntryCount === 1 ? "y" : "ies"}`
      : null,
    citedControlCount > 0
      ? `${citedControlCount} cited numeric LEP control${citedControlCount === 1 ? "" : "s"}`
      : null,
  ].filter(Boolean);

  return {
    label,
    citedControlCount,
    totalControlCount,
    landUseEntryCount,
    objectiveCount,
    sourceRef,
    detail: `LEP evidence is grounded in ${parts.join(" plus ")} from ${sourceRef}.`,
  };
}
