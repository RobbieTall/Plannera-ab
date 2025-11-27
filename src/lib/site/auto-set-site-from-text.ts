import { extractCandidateAddress } from "./extract-address-from-text";
import { lookupNswSite } from "./nsw-search";
import { fetchAndPersistNswZoning } from "@/lib/nsw-zoning";
import { prisma } from "@/lib/prisma";

export async function autoSetSiteFromText(opts: {
  projectId: string;
  text: string;
}): Promise<"set" | "skipped"> {
  const { projectId, text } = opts;

  const candidate = extractCandidateAddress(text);
  if (!candidate) return "skipped";

  const result = await lookupNswSite(candidate);
  const match = result?.bestMatch;
  if (!match) return "skipped";

  const { formattedAddress, latitude, longitude, lgaName, lgaCode, parcelId, lot, planNumber, zone } = match;

  await prisma.siteContext.upsert({
    where: { projectId },
    update: {
      addressInput: candidate,
      formattedAddress,
      lgaName: lgaName ?? null,
      lgaCode: lgaCode ?? null,
      parcelId: parcelId ?? null,
      lot: lot ?? null,
      planNumber: planNumber ?? null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      zone: zone ?? null,
    },
    create: {
      projectId,
      addressInput: candidate,
      formattedAddress,
      lgaName: lgaName ?? null,
      lgaCode: lgaCode ?? null,
      parcelId: parcelId ?? null,
      lot: lot ?? null,
      planNumber: planNumber ?? null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      zone: zone ?? null,
    },
  });

  const zoning = await fetchAndPersistNswZoning({
    projectId,
    lat: typeof latitude === "number" ? latitude : null,
    lng: typeof longitude === "number" ? longitude : null,
    parcel: lot && planNumber ? { lot, dp: planNumber } : null,
  });

  if (zoning) {
    await prisma.siteContext.update({
      where: { projectId },
      data: { zone: zoning.zoneCode },
    });
  }

  return "set";
}
