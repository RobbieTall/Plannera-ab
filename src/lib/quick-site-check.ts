import type { Project, SiteContext } from "@prisma/client";

import { findLepZoneForZoningCode } from "@/lib/lep/lep-lookup";
import { lookupLepInstruments } from "@/lib/lep/lep-search";
import type { LepParseResult } from "@/lib/lep/types";
import { resolveInstrumentsForSite, serializeSiteContext } from "@/lib/site-context";
import type { QuickSiteCheckControl, QuickSiteCheckReport } from "@/types/quick-site-check";

const truncate = (value: string | null | undefined, length = 220) => {
  if (!value) return null;
  return value.length > length ? `${value.slice(0, length)}…` : value;
};

const normaliseValue = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);

const extractMappedControls = (lepData: LepParseResult | null) => {
  if (!lepData || typeof lepData !== "object") {
    return {} as Record<string, string | null>;
  }

  const container = (lepData as { controls?: unknown }).controls;
  const controls = container && typeof container === "object" ? (container as Record<string, unknown>) : null;

  const pickValue = (keys: string[]) => {
    if (!controls) return null;
    for (const key of keys) {
      const value = normaliseValue(controls[key]);
      if (value) return value;
    }
    return null;
  };

  return {
    heightOfBuilding: pickValue(["heightOfBuilding", "heightLimit", "hob", "buildingHeight"]),
    floorSpaceRatio: pickValue(["floorSpaceRatio", "fsr", "floorSpace", "floorSpaceIndex"]),
    minimumLotSize: pickValue(["minimumLotSize", "minLotSize", "lotSize", "mls"]),
  };
};

const shortenList = (list: string[], limit = 6) => list.map((item) => item.trim()).filter(Boolean).slice(0, limit);

const formatList = (list: string[]) => {
  const items = shortenList(list);
  if (!items.length) return "no explicit uses listed";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
};

const buildControl = (
  label: string,
  value: string | null,
  clauseRef?: string | null,
  clauseText?: string | null,
): QuickSiteCheckControl => {
  const detail = truncate(clauseText);
  const present = Boolean(value || detail);

  const interpretation = value
    ? `${label} appears to be ${value}. Confirm against the LEP map${clauseRef ? ` and clause ${clauseRef}` : ""}.`
    : detail
      ? `${label} is covered by clause ${clauseRef ?? ""}. ${detail}`.trim()
      : `No mapped ${label.toLowerCase()} found yet. Check the LEP map layer or council GIS before progressing.`;

  return {
    label,
    value,
    present,
    clauseRef: clauseRef ?? null,
    detail,
    source: value ? "LEP mapping" : detail ? "LEP clause" : null,
    interpretation,
  } satisfies QuickSiteCheckControl;
};

export const buildQuickSiteCheckReport = async (
  project: Project & { siteContext: SiteContext | null },
): Promise<QuickSiteCheckReport> => {
  const lepData = (project.lepData as LepParseResult | null | undefined) ?? null;
  const siteContext = serializeSiteContext(project.siteContext, project);
  const zoneLabel = project.zoningCode || project.zoningName
    ? [project.zoningCode, project.zoningName].filter(Boolean).join(" – ")
    : siteContext?.zone ?? null;

  const lepZoneContext = findLepZoneForZoningCode({
    lepData,
    zoningCode: project.zoningCode ?? siteContext?.zoningCode ?? siteContext?.zone,
  });

  const permissibility = lepZoneContext
    ? {
        zoneLabel: `${lepZoneContext.zone.zoneCode} – ${lepZoneContext.zone.zoneName}`,
        permittedWithoutConsent: lepZoneContext.zone.permittedWithoutConsent,
        permittedWithConsent: lepZoneContext.zone.permittedWithConsent,
        prohibited: lepZoneContext.zone.prohibited,
        interpretation: `Zone ${lepZoneContext.zone.zoneCode} generally permits ${formatList(lepZoneContext.zone.permittedWithoutConsent)} without consent and requires consent for ${formatList(lepZoneContext.zone.permittedWithConsent)}. Uses such as ${formatList(lepZoneContext.zone.prohibited)} are typically prohibited unless another instrument applies.`,
      }
    : null;

  const instrumentMatch = resolveInstrumentsForSite(siteContext);
  const lepSearchLga = instrumentMatch.lgaCode ?? siteContext?.lgaName ?? null;
  const lepLookupResult = lepSearchLga
    ? await lookupLepInstruments({ lga: lepSearchLga, instrument: instrumentMatch.lepInstrumentSlug ?? undefined })
    : null;

  let lepInstrumentCandidate = lepLookupResult?.instruments?.[0] ?? null;
  if (!lepInstrumentCandidate?.clauses?.length && lepInstrumentCandidate) {
    const detailedResult = await lookupLepInstruments({
      lga: lepSearchLga!,
      instrument: lepInstrumentCandidate.code,
    });
    lepInstrumentCandidate = detailedResult.instruments[0] ?? lepInstrumentCandidate;
  }

  const lepInstrument = lepData?.metadata
    ? {
        name: lepData.metadata.instrumentName,
        code: lepData.metadata.instrumentType,
        lga: lepData.metadata.lgaName,
        source: "project" as const,
      }
    : lepInstrumentCandidate
      ? {
          name: lepInstrumentCandidate.name,
          code: lepInstrumentCandidate.code,
          lga: lepSearchLga,
          source: "ingestion" as const,
        }
      : null;

  const mappedControls = extractMappedControls(lepData);
  const findClause = (ref: string) =>
    lepInstrumentCandidate?.clauses?.find((clause) => clause.ref === ref || clause.ref.startsWith(`${ref}`));

  const controls = {
    heightOfBuilding: buildControl(
      "Height of building",
      mappedControls.heightOfBuilding ?? null,
      findClause("4.3")?.ref ?? "4.3",
      findClause("4.3")?.text ?? null,
    ),
    floorSpaceRatio: buildControl(
      "Floor space ratio",
      mappedControls.floorSpaceRatio ?? null,
      findClause("4.4")?.ref ?? "4.4",
      findClause("4.4")?.text ?? null,
    ),
    minimumLotSize: buildControl(
      "Minimum lot size",
      mappedControls.minimumLotSize ?? null,
      findClause("4.1")?.ref ?? "4.1",
      findClause("4.1")?.text ?? null,
    ),
  } satisfies QuickSiteCheckReport["controls"];

  const notes: string[] = [];
  if (!siteContext) {
    notes.push("Site context is missing; set a site to improve accuracy.");
  }
  if (!lepZoneContext) {
    notes.push("Zoning could not be matched to LEP data yet.");
  }

  const nextSteps = [
    "Check DCP controls for design specifics.",
    "Review hazard layers (flood, bushfire, coastal).",
    "Confirm LEP Part 4 controls and any local variations.",
    "Consider CDC triggers and state overlays before lodging.",
  ];

  return {
    projectId: project.id,
    generatedAt: new Date().toISOString(),
    site: {
      address: siteContext?.formattedAddress ?? project.address ?? null,
      lga: siteContext?.lgaName ?? null,
      zoneCode: project.zoningCode ?? siteContext?.zoningCode ?? null,
      zoneName: project.zoningName ?? siteContext?.zoningName ?? siteContext?.zone ?? null,
      zoneLabel,
      zoningSource: project.zoningSource ?? null,
    },
    lepInstrument,
    permissibility,
    controls,
    notes,
    nextSteps,
  } satisfies QuickSiteCheckReport;
};
