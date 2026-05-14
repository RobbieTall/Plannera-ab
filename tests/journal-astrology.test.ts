import { describe, it, expect } from "vitest";
import { getSunSign, getMoonPhase, getZodiacInfo, getDailyAstrology } from "../lib/astrology";

describe("getSunSign", () => {
  const cases: Array<[string, string]> = [
    ["1990-03-20", "Pisces"],      // day before Aries
    ["1990-03-21", "Aries"],       // Aries start
    ["1990-04-19", "Aries"],       // last day of Aries
    ["1990-04-20", "Taurus"],      // Taurus start
    ["1990-05-20", "Taurus"],
    ["1990-05-21", "Gemini"],
    ["1990-06-20", "Gemini"],
    ["1990-06-21", "Cancer"],
    ["1990-07-22", "Cancer"],
    ["1990-07-23", "Leo"],
    ["1990-08-22", "Leo"],
    ["1990-08-23", "Virgo"],
    ["1990-09-22", "Virgo"],
    ["1990-09-23", "Libra"],
    ["1990-10-22", "Libra"],
    ["1990-10-23", "Scorpio"],
    ["1990-11-21", "Scorpio"],
    ["1990-11-22", "Sagittarius"],
    ["1990-12-21", "Sagittarius"],
    ["1990-12-22", "Capricorn"],
    ["1991-01-19", "Capricorn"],
    ["1991-01-20", "Aquarius"],
    ["1991-02-18", "Aquarius"],
    ["1991-02-19", "Pisces"],
    ["1991-03-20", "Pisces"],
    // Year-boundary: Dec → Jan Capricorn
    ["1990-12-31", "Capricorn"],
    ["1991-01-01", "Capricorn"],
  ];

  cases.forEach(([date, expected]) => {
    it(`${date} → ${expected}`, () => {
      expect(getSunSign(date)).toBe(expected);
    });
  });
});

describe("getMoonPhase", () => {
  it("returns a known phase name", () => {
    const knownPhases = [
      "New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous",
      "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent",
    ];
    const { phase } = getMoonPhase("2024-01-11"); // known new moon
    expect(knownPhases).toContain(phase);
  });

  it("returns illumination between 0 and 100", () => {
    const { illumination } = getMoonPhase("2024-01-25");
    expect(illumination).toBeGreaterThanOrEqual(0);
    expect(illumination).toBeLessThanOrEqual(100);
  });

  it("returns an emoji", () => {
    const { emoji } = getMoonPhase();
    expect(emoji).toBeTruthy();
    expect(emoji.length).toBeGreaterThan(0);
  });

  it("full moon is near known full moon date 2024-01-25", () => {
    // Jan 25, 2024 was a full moon
    const { phase } = getMoonPhase("2024-01-25");
    expect(["Full Moon", "Waxing Gibbous", "Waning Gibbous"]).toContain(phase);
  });

  it("new moon is near known new moon date 2024-01-11", () => {
    const { phase } = getMoonPhase("2024-01-11");
    expect(["New Moon", "Waxing Crescent"]).toContain(phase);
  });
});

describe("getZodiacInfo", () => {
  it("returns zodiac data for a valid sign", () => {
    const info = getZodiacInfo("Aries");
    expect(info).toBeDefined();
    expect(info!.element).toBe("Fire");
    expect(info!.symbol).toBe("♈");
    expect(info!.traits.length).toBeGreaterThan(0);
  });

  it("returns undefined for unknown sign", () => {
    expect(getZodiacInfo("Ophiuchus")).toBeUndefined();
  });

  it("covers all 12 signs", () => {
    const signs = [
      "Aries","Taurus","Gemini","Cancer","Leo","Virgo",
      "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces",
    ];
    signs.forEach((s) => expect(getZodiacInfo(s)).toBeDefined());
  });
});

describe("getDailyAstrology", () => {
  it("returns guidance for a known sign", () => {
    const result = getDailyAstrology("Leo");
    expect(result.moonPhase).toBeDefined();
    expect(result.sunSignInfo).toBeDefined();
    expect(result.dailyGuidance).toBeTruthy();
  });
});
