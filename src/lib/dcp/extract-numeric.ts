export type NumericMeta = {
  numbers: number[];
  units: string[];
  labels: string[];
};

const NORMALIZE_UNIT_MAP: Record<string, string> = {
  m: "m",
  metre: "m",
  metres: "m",
  meter: "m",
  meters: "m",
  "m2": "m²",
  "m^2": "m²",
  "m²": "m²",
  sqm: "m²",
  "sq m": "m²",
  "%": "%",
  percent: "%",
  percentage: "%",
  space: "spaces",
  spaces: "spaces",
  car: "spaces",
  cars: "spaces",
  storey: "storeys",
  storeys: "storeys",
  bedroom: "bedrooms",
  bedrooms: "bedrooms",
};

const normalizeText = (text: string) => text.replace(/\s+/g, " ").trim();

const normalizeUnit = (raw?: string | null) => {
  if (!raw) return "";
  const lower = raw.toLowerCase();
  return NORMALIZE_UNIT_MAP[lower] ?? lower;
};

const numericRegex = /(?<value>\d+(?:\.\d+)?)(?:\s*)(?<unit>m2|m\^2|m²|sqm|sq\s*m|metres?|meters?|m|%|percent|percentage|spaces?|car(?:s)?|storeys?|bedrooms?|beds?)/gi;

const contextualRegexes: RegExp[] = [
  /(setback|front|rear|side)[^\.\n]{0,30}?(\d+(?:\.\d+)?)(\s*(m2|m\^2|m²|sqm|sq\s*m|metres?|meters?|m))?/gi,
  /(parking|car ?spaces?|visitor)[^\.\n]{0,30}?(\d+(?:\.\d+)?)/gi,
  /(site coverage|coverage)[^\.\n]{0,30}?(\d+(?:\.\d+)?)(\s*%)/gi,
  /(private open space|pos)[^\.\n]{0,30}?(\d+(?:\.\d+)?)(\s*(m2|m\^2|m²|sqm|sq\s*m))/gi,
];

export const extractNumericMeta = (text: string): NumericMeta => {
  const numbers = new Set<number>();
  const units = new Set<string>();
  const labels = new Set<string>();

  const normalized = normalizeText(text);

  const pushMatch = (value: string, unit?: string | null, label?: string) => {
    const numericValue = parseFloat(value);
    if (!Number.isFinite(numericValue)) return;
    numbers.add(numericValue);
    const normalizedUnit = normalizeUnit(unit);
    if (normalizedUnit) {
      units.add(normalizedUnit);
    }
    if (label) {
      const snippet = normalizeText(label).slice(-80);
      if (snippet) labels.add(snippet);
    }
  };

  let match: RegExpExecArray | null;
  while ((match = numericRegex.exec(normalized)) !== null) {
    pushMatch(match.groups?.value ?? match[1], match.groups?.unit ?? match[2]);
  }

  contextualRegexes.forEach((regex) => {
    while ((match = regex.exec(normalized)) !== null) {
      const value = match[2] ?? match[1];
      const unit = match[3];
      const contextStart = Math.max(0, (match.index ?? 0) - 20);
      const context = normalized.slice(contextStart, regex.lastIndex + 20);
      pushMatch(value, unit, context);
    }
  });

  return {
    numbers: Array.from(numbers),
    units: Array.from(units),
    labels: Array.from(labels),
  };
};

export const extractQueryNumbers = (text: string): NumericMeta => extractNumericMeta(text);
