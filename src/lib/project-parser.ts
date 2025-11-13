export type ProjectParameters = {
  description: string;
  location: string;
  developmentType: string;
  scale: string;
};

const LOCATION_ALIASES: Record<string, string> = {
  bondi: "Bondi",
  sydney: "Sydney",
  brisbane: "Brisbane",
  melbourne: "Melbourne",
  victoria: "Melbourne",
  queensland: "Brisbane",
  nsw: "Sydney",
};

const DEVELOPMENT_KEYWORDS: { keyword: RegExp; label: string }[] = [
  { keyword: /townhouse|town home|rowhouse/i, label: "townhouse development" },
  { keyword: /dual\s+(occupancy|occ)/i, label: "dual occupancy" },
  { keyword: /second\s+story|second\s+storey|second\s+floor/i, label: "second storey addition" },
  { keyword: /apartment|mid\s*rise/i, label: "apartment building" },
  { keyword: /commercial|retail/i, label: "commercial building" },
  { keyword: /childcare|early\s+learning/i, label: "childcare centre" },
];

export function parseProjectDescription(description: string): ProjectParameters {
  const lower = description.toLowerCase();

  let location = "Australia";
  for (const [alias, canonical] of Object.entries(LOCATION_ALIASES)) {
    if (lower.includes(alias)) {
      location = canonical;
      break;
    }
  }

  const inMatch = description.match(/in\s+([A-Za-z\s]+)$/i);
  if (inMatch && inMatch[1]) {
    const candidate = inMatch[1].trim();
    const canonical = LOCATION_ALIASES[candidate.toLowerCase() as keyof typeof LOCATION_ALIASES];
    location = canonical ?? candidate;
  }

  let developmentType = "mixed-use development";
  for (const { keyword, label } of DEVELOPMENT_KEYWORDS) {
    if (keyword.test(description)) {
      developmentType = label;
      break;
    }
  }

  let scale = "concept stage";
  const dwellingMatch = description.match(/(\d+)\s+(townhouses?|units?|dwellings?)/i);
  if (dwellingMatch) {
    scale = `${dwellingMatch[1]} dwellings`;
  }

  const sqmMatch = description.match(/(\d+[\d,]*)\s*(sqm|m2|square\s*metres?)/i);
  if (sqmMatch) {
    const size = sqmMatch[1].replace(/,/g, "");
    scale = `${size} sqm site`;
  }

  return {
    description,
    location,
    developmentType,
    scale,
  };
}
