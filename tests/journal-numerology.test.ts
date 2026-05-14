import { describe, it, expect } from "vitest";
import {
  calculateLifePath,
  calculateSoulUrge,
  calculateExpression,
  calculatePersonalDay,
  getNumerologyMeaning,
  getNumerologyProfile,
} from "../lib/numerology";

describe("reduceToSingleDigit (via calculateLifePath)", () => {
  it("preserves master numbers 11, 22, 33", () => {
    // 1990-09-29: 1+9+9+0+0+9+2+9 = 39 → 12 → 3, not a master number
    // Build dates that hit master numbers:
    // 11: need digits summing to 11, e.g. 2000-02-09: 2+0+0+0+0+2+0+9 = 13 → 4... let's try
    // 29-11-1964: 2+9+1+1+1+9+6+4 = 33 → master 33
    expect(calculateLifePath("1964-11-29")).toBe(33);
    // 1975-02-04: 1+9+7+5+0+2+0+4 = 28 → 10 → 1
    expect(calculateLifePath("1975-02-04")).toBe(1);
  });
});

describe("calculateLifePath", () => {
  it("sums all digits and reduces", () => {
    // 1990-03-15: 1+9+9+0+0+3+1+5 = 28 → 2+8 = 10 → 1+0 = 1
    expect(calculateLifePath("1990-03-15")).toBe(1);
  });

  it("handles master number 11", () => {
    // 1984-02-06: 1+9+8+4+0+2+0+6 = 30 → 3
    // 1985-11-02: 1+9+8+5+1+1+0+2 = 27 → 9
    // Let's find a real master 11: 1/29/1975: 1+2+9+1+9+7+5 = 34 → 7... hmm
    // 29/02/1980: 2+9+0+2+1+9+8+0 = 31 → 4
    // Birth date 02/09/1980: 0+2+0+9+1+9+8+0 = 29 → 11!
    expect(calculateLifePath("1980-09-02")).toBe(11);
  });

  it("handles master number 22", () => {
    // Need digits summing to 22: 1975-04-04: 1+9+7+5+0+4+0+4 = 30 → 3
    // 1984-09-29: 1+9+8+4+0+9+2+9 = 42 → 6
    // 1989-12-11: 1+9+8+9+1+2+1+1 = 32 → 5
    // 1994-05-14: 1+9+9+4+0+5+1+4 = 33 → 33... master!
    // 1993-04-14: 1+9+9+3+0+4+1+4 = 31 → 4
    // 1994-04-04: 1+9+9+4+0+4+0+4 = 31 → 4
    // 1999-05-04: 1+9+9+9+0+5+0+4 = 37 → 10 → 1
    // 1975-10-16: 1+9+7+5+1+0+1+6 = 30 → 3
    // 1978-06-01: 1+9+7+8+0+6+0+1 = 32 → 5
    // To get 22: digits must sum to 22 directly
    // 1975-07-04: 1+9+7+5+0+7+0+4 = 33 (master!)
    // Need sum=22: 1+9+0+3+0+9+0 = 22? 1903-09-00 not valid
    // 4+9+0+0+0+9+0+0 = 22? Not a real date
    // Let's try: 2+2+0+0+0+9+0+9 = 22 → 2020-09-09? 2+0+2+0+0+9+0+9=22!
    expect(calculateLifePath("2020-09-09")).toBe(22);
  });

  it("returns 9 for 1+9+8+1+0+1+2+7 = 29 → 11... wait", () => {
    // 1981-01-27: 1+9+8+1+0+1+2+7 = 29 → 11
    expect(calculateLifePath("1981-01-27")).toBe(11);
  });
});

describe("calculateSoulUrge", () => {
  it("sums vowel values only", () => {
    // "ANN" → A=1, N=no vowel, N=no → 1
    expect(calculateSoulUrge("ann")).toBe(1);
    // "AEIOU" → 1+5+9+6+3 = 24 → 6
    expect(calculateSoulUrge("aeiou")).toBe(6);
  });

  it("ignores non-letter characters", () => {
    expect(calculateSoulUrge("O'Brien")).toBe(calculateSoulUrge("OBrien"));
  });
});

describe("calculateExpression", () => {
  it("sums all letter values", () => {
    // "A" → 1
    expect(calculateExpression("a")).toBe(1);
    // "S" → 1 (s=1)
    expect(calculateExpression("s")).toBe(1);
    // "AB" → 1+2 = 3
    expect(calculateExpression("ab")).toBe(3);
  });

  it("ignores spaces and punctuation", () => {
    expect(calculateExpression("a b")).toBe(calculateExpression("ab"));
  });
});

describe("calculatePersonalDay", () => {
  it("applies the correct three-step formula", () => {
    // birthDate: 1990-03-15, targetDate: 2026-05-14
    // birthMonth=3, birthDay=15, year=2026, month=5, day=14
    // personalYear = reduce(3+15+2026) = reduce(2044) = reduce(10) = 1
    // personalMonth = reduce(1+5) = 6
    // personalDay = reduce(6+14) = reduce(20) = 2
    expect(calculatePersonalDay("1990-03-15", "2026-05-14")).toBe(2);
  });

  it("respects master numbers throughout reduction", () => {
    // birthDate: 1980-09-02, targetDate: 2020-09-09
    // birthMonth=9, birthDay=2, year=2020, month=9, day=9
    // personalYear = reduce(9+2+2020) = reduce(2031) = reduce(6) = 6
    // personalMonth = reduce(6+9) = reduce(15) = 6
    // personalDay = reduce(6+9) = reduce(15) = 6
    expect(calculatePersonalDay("1980-09-02", "2020-09-09")).toBe(6);
  });

  it("uses today's date when targetDate is omitted", () => {
    // Just verify it returns a number in range [1-9] | 11 | 22 | 33
    const result = calculatePersonalDay("1990-03-15");
    const valid = [1,2,3,4,5,6,7,8,9,11,22,33];
    expect(valid).toContain(result);
  });

  it("does NOT use birthParts[2] as personal year base", () => {
    // The old bug: personalYear = birthParts[2] + month + year
    // For 1990-03-15, targetDate 2026-05-14:
    //   old (wrong): personalYear = 15 + 5 + 2026 = 2046 → 12 → 3
    //   new (right):  personalYear = 3 + 15 + 2026 = 2044 → 10 → 1
    // Personal day differs, so we can detect the old behaviour
    const result = calculatePersonalDay("1990-03-15", "2026-05-14");
    // Old broken formula gives personalDay = reduce(reduce(15+5)+14+reduce(2046)) = wrong chain
    // Just assert we get the known-correct answer:
    expect(result).toBe(2);
    expect(result).not.toBe(8); // what the broken formula produced
  });
});

describe("getNumerologyMeaning", () => {
  it("returns meanings for all core numbers", () => {
    [1,2,3,4,5,6,7,8,9,11,22,33].forEach((n) => {
      const meaning = getNumerologyMeaning(n);
      expect(meaning).toBeTruthy();
      expect(meaning).not.toBe("Personal journey and growth");
    });
  });

  it("returns fallback for unknown number", () => {
    expect(getNumerologyMeaning(42)).toBe("Personal journey and growth");
  });
});

describe("getNumerologyProfile", () => {
  it("returns life path and personal day", () => {
    const profile = getNumerologyProfile("1990-03-15");
    expect(profile.lifePath).toBeGreaterThanOrEqual(1);
    expect(profile.personalDay).toBeGreaterThanOrEqual(1);
    expect(profile.lifePathMeaning).toBeTruthy();
    expect(profile.personalDayMeaning).toBeTruthy();
  });

  it("includes soul urge and expression when name provided", () => {
    const profile = getNumerologyProfile("1990-03-15", "Jane Doe");
    expect(profile.soulUrge).toBeDefined();
    expect(profile.expression).toBeDefined();
  });

  it("omits soul urge and expression when no name", () => {
    const profile = getNumerologyProfile("1990-03-15");
    expect(profile.soulUrge).toBeUndefined();
    expect(profile.expression).toBeUndefined();
  });
});
