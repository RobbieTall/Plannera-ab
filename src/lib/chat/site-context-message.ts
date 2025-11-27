import type { SiteContextSummary } from "@/types/site";
import type { LepParseResult } from "../lep/types";
import { findLepZoneForZoningCode } from "../lep/lep-lookup";

const shortenList = (list?: string[], maxItems = 8) =>
  (list ?? [])
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, maxItems);

const formatList = (list?: string[]) => {
  const items = shortenList(list);
  return items.length ? items.join(", ") : "None listed.";
};

export const buildSiteContextMessage = (
  siteContext: SiteContextSummary | null,
  lepData?: LepParseResult | null,
) => {
  if (!siteContext) return null;

  const zoningLabel = [siteContext.zoningCode, siteContext.zoningName]
    .filter(Boolean)
    .join(" – ")
    .trim();

  const zone = zoningLabel || siteContext.zone;
  const zoningSource = siteContext.zoningSource ? ` (${siteContext.zoningSource})` : "";

  const siteLines = [
    `The current project site is: ${siteContext.formattedAddress}.`,
    siteContext.lgaName ? `LGA: ${siteContext.lgaName}.` : null,
    zone ? `Zoning: ${zone}${zoningSource}.` : "Zoning is not available yet.",
    "If a site is already set in the context, do not ask the user to provide the address again. Use the site details above in your answers.",
    "If zoning is available, use it to frame what is likely permitted, but still advise the user to confirm via LEP/DCP and council.",
    "If zoning is missing, provide general NSW guidance without requesting the address again.",
  ];

  const lepZoneContext = findLepZoneForZoningCode({
    lepData: lepData ?? null,
    zoningCode: siteContext.zoningCode ?? siteContext.zone,
  });

  if (lepZoneContext) {
    const { metadata, zone: lepZone } = lepZoneContext;
    const instrumentLabel = `${metadata.instrumentName}${metadata.instrumentType ? ` (${metadata.instrumentType})` : ""}`;
    const objectives = shortenList(lepZone.zoneObjectives);

    const lepLines = [
      "Local Environmental Plan (LEP) context:",
      `- Instrument: ${instrumentLabel}.`,
      `- Zone: ${lepZone.zoneCode} – ${lepZone.zoneName}.`,
      objectives.length ? `- Zone objectives: ${objectives.join(", ")}.` : null,
      `- Permitted without consent: ${formatList(lepZone.permittedWithoutConsent)}.`,
      `- Permitted with consent: ${formatList(lepZone.permittedWithConsent)}.`,
      `- Prohibited: ${formatList(lepZone.prohibited)}.`,
      "Use these zone rules as the primary reference when advising on what is likely permissible on this site. Where relevant, mention that the final decision depends on council assessment and any additional SEPP or DCP controls.",
    ];

    siteLines.push(lepLines.filter(Boolean).join("\n"));
  }

  return siteLines.filter(Boolean).join(" ");
};
