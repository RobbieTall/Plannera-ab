export interface ZodiacSign {
  sign: string;
  symbol: string;
  element: string;
  modality: string;
  ruling_planet: string;
  traits: string[];
}

const ZODIAC_SIGNS: ZodiacSign[] = [
  { sign: "Aries", symbol: "♈", element: "Fire", modality: "Cardinal", ruling_planet: "Mars", traits: ["courageous", "energetic", "pioneering"] },
  { sign: "Taurus", symbol: "♉", element: "Earth", modality: "Fixed", ruling_planet: "Venus", traits: ["patient", "reliable", "sensual"] },
  { sign: "Gemini", symbol: "♊", element: "Air", modality: "Mutable", ruling_planet: "Mercury", traits: ["curious", "adaptable", "expressive"] },
  { sign: "Cancer", symbol: "♋", element: "Water", modality: "Cardinal", ruling_planet: "Moon", traits: ["intuitive", "nurturing", "protective"] },
  { sign: "Leo", symbol: "♌", element: "Fire", modality: "Fixed", ruling_planet: "Sun", traits: ["creative", "generous", "bold"] },
  { sign: "Virgo", symbol: "♍", element: "Earth", modality: "Mutable", ruling_planet: "Mercury", traits: ["analytical", "practical", "precise"] },
  { sign: "Libra", symbol: "♎", element: "Air", modality: "Cardinal", ruling_planet: "Venus", traits: ["diplomatic", "fair", "social"] },
  { sign: "Scorpio", symbol: "♏", element: "Water", modality: "Fixed", ruling_planet: "Pluto", traits: ["intense", "perceptive", "transformative"] },
  { sign: "Sagittarius", symbol: "♐", element: "Fire", modality: "Mutable", ruling_planet: "Jupiter", traits: ["adventurous", "philosophical", "optimistic"] },
  { sign: "Capricorn", symbol: "♑", element: "Earth", modality: "Cardinal", ruling_planet: "Saturn", traits: ["disciplined", "ambitious", "responsible"] },
  { sign: "Aquarius", symbol: "♒", element: "Air", modality: "Fixed", ruling_planet: "Uranus", traits: ["innovative", "humanitarian", "independent"] },
  { sign: "Pisces", symbol: "♓", element: "Water", modality: "Mutable", ruling_planet: "Neptune", traits: ["empathetic", "imaginative", "spiritual"] },
];

const SIGN_BOUNDARIES = [
  [3, 21, "Aries"], [4, 20, "Taurus"], [5, 21, "Gemini"], [6, 21, "Cancer"],
  [7, 23, "Leo"], [8, 23, "Virgo"], [9, 23, "Libra"], [10, 23, "Scorpio"],
  [11, 22, "Sagittarius"], [12, 22, "Capricorn"], [1, 20, "Aquarius"], [2, 19, "Pisces"],
] as const;

export function getSunSign(birthDate: string): string {
  const date = new Date(birthDate);
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  for (const [m, d, sign] of SIGN_BOUNDARIES) {
    if (month === m && day >= d) return sign;
    if (month === (m % 12) + 1 && day < d) return sign;
  }
  return "Capricorn";
}

export function getZodiacInfo(sign: string): ZodiacSign | undefined {
  return ZODIAC_SIGNS.find((z) => z.sign === sign);
}

export function getMoonPhase(date?: string): {
  phase: string;
  illumination: number;
  emoji: string;
} {
  const target = date ? new Date(date) : new Date();
  const knownNew = new Date("2024-01-11");
  const cycleMs = 29.53059 * 24 * 60 * 60 * 1000;
  const elapsed = ((target.getTime() - knownNew.getTime()) % cycleMs + cycleMs) % cycleMs;
  const progress = elapsed / cycleMs;

  const phases = [
    { name: "New Moon", emoji: "🌑", min: 0, max: 0.0625 },
    { name: "Waxing Crescent", emoji: "🌒", min: 0.0625, max: 0.25 },
    { name: "First Quarter", emoji: "🌓", min: 0.25, max: 0.3125 },
    { name: "Waxing Gibbous", emoji: "🌔", min: 0.3125, max: 0.5 },
    { name: "Full Moon", emoji: "🌕", min: 0.5, max: 0.5625 },
    { name: "Waning Gibbous", emoji: "🌖", min: 0.5625, max: 0.75 },
    { name: "Last Quarter", emoji: "🌗", min: 0.75, max: 0.8125 },
    { name: "Waning Crescent", emoji: "🌘", min: 0.8125, max: 1 },
  ];

  const phase = phases.find((p) => progress >= p.min && progress < p.max) ?? phases[0];
  const illumination =
    progress < 0.5
      ? Math.round(progress * 2 * 100)
      : Math.round((1 - progress) * 2 * 100);

  return { phase: phase.name, illumination, emoji: phase.emoji };
}

export function getDailyAstrology(sunSign: string, date?: string): {
  moonPhase: ReturnType<typeof getMoonPhase>;
  sunSignInfo: ZodiacSign | undefined;
  dailyGuidance: string;
} {
  const moonPhase = getMoonPhase(date);
  const sunSignInfo = getZodiacInfo(sunSign);

  const guidanceByElement: Record<string, string[]> = {
    Fire: ["Channel your passion into creative pursuits today.", "Bold action aligns with cosmic energy.", "Your enthusiasm lights the way forward."],
    Earth: ["Ground yourself in practical matters.", "Steady progress builds lasting foundations.", "Trust your instincts about material security."],
    Air: ["Mental clarity supports important decisions.", "Connect with others to gain new perspectives.", "Ideas flow freely — capture them now."],
    Water: ["Trust your intuition above all else.", "Emotional depth brings meaningful connections.", "Flow with what feels right rather than forcing outcomes."],
  };

  const element = sunSignInfo?.element ?? "Fire";
  const options = guidanceByElement[element] ?? guidanceByElement["Fire"];
  const guidance = options[new Date().getDate() % options.length];

  return { moonPhase, sunSignInfo, dailyGuidance: guidance };
}
