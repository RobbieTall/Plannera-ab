const LETTER_VALUES: Record<string, number> = {
  a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9,
  j: 1, k: 2, l: 3, m: 4, n: 5, o: 6, p: 7, q: 8, r: 9,
  s: 1, t: 2, u: 3, v: 4, w: 5, x: 6, y: 7, z: 8,
};

const VOWELS = new Set(["a", "e", "i", "o", "u"]);

function reduceToSingleDigit(n: number): number {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = String(n)
      .split("")
      .reduce((sum, d) => sum + parseInt(d), 0);
  }
  return n;
}

export function calculateLifePath(birthDate: string): number {
  const digits = birthDate.replace(/\D/g, "");
  const sum = digits.split("").reduce((acc, d) => acc + parseInt(d), 0);
  return reduceToSingleDigit(sum);
}

export function calculateSoulUrge(fullName: string): number {
  const sum = fullName
    .toLowerCase()
    .split("")
    .filter((c) => VOWELS.has(c))
    .reduce((acc, c) => acc + (LETTER_VALUES[c] ?? 0), 0);
  return reduceToSingleDigit(sum);
}

export function calculateExpression(fullName: string): number {
  const sum = fullName
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .split("")
    .reduce((acc, c) => acc + (LETTER_VALUES[c] ?? 0), 0);
  return reduceToSingleDigit(sum);
}

export function calculatePersonalDay(birthDate: string, targetDate?: string): number {
  const today = targetDate ?? new Date().toISOString().slice(0, 10);
  const [year, month, day] = today.split("-").map(Number);
  const [, birthMonth, birthDay] = birthDate.split("-").map(Number);

  // Standard numerology: Personal Year = birth month + birth day + current year
  const personalYear = reduceToSingleDigit(birthMonth + birthDay + year);
  // Personal Month = Personal Year + current month
  const personalMonth = reduceToSingleDigit(personalYear + month);
  // Personal Day = Personal Month + current day
  return reduceToSingleDigit(personalMonth + day);
}

export function getNumerologyMeaning(number: number): string {
  const meanings: Record<number, string> = {
    1: "Leadership, independence, new beginnings",
    2: "Harmony, cooperation, balance",
    3: "Creativity, self-expression, joy",
    4: "Stability, discipline, hard work",
    5: "Freedom, change, adventure",
    6: "Responsibility, nurturing, love",
    7: "Introspection, spirituality, wisdom",
    8: "Abundance, power, achievement",
    9: "Completion, compassion, universal love",
    11: "Spiritual insight, intuition, enlightenment",
    22: "Master builder, vision, manifestation",
    33: "Master teacher, compassion, healing",
  };
  return meanings[number] ?? "Personal journey and growth";
}

export function getNumerologyProfile(
  birthDate: string,
  fullName?: string
): {
  lifePath: number;
  soulUrge?: number;
  expression?: number;
  personalDay: number;
  lifePathMeaning: string;
  personalDayMeaning: string;
} {
  const lifePath = calculateLifePath(birthDate);
  const personalDay = calculatePersonalDay(birthDate);

  return {
    lifePath,
    personalDay,
    lifePathMeaning: getNumerologyMeaning(lifePath),
    personalDayMeaning: getNumerologyMeaning(personalDay),
    ...(fullName
      ? {
          soulUrge: calculateSoulUrge(fullName),
          expression: calculateExpression(fullName),
        }
      : {}),
  };
}
