import { describe, expect, it } from "vitest";

import { getRelativeTime } from "./relative-time";

describe("getRelativeTime", () => {
  const now = new Date("2026-06-08T12:00:00.000Z");

  it("returns just now for 30 seconds ago", () => {
    expect(getRelativeTime(new Date("2026-06-08T11:59:30.000Z"), now)).toBe("just now");
  });

  it("returns just now for 59 seconds ago", () => {
    expect(getRelativeTime(new Date("2026-06-08T11:59:01.000Z"), now)).toBe("just now");
  });

  it("returns 1 minute ago", () => {
    expect(getRelativeTime(new Date("2026-06-08T11:59:00.000Z"), now)).toBe("1 minute ago");
  });

  it("returns 5 minutes ago", () => {
    expect(getRelativeTime(new Date("2026-06-08T11:55:00.000Z"), now)).toBe("5 minutes ago");
  });

  it("returns 1 hour ago", () => {
    expect(getRelativeTime(new Date("2026-06-08T11:00:00.000Z"), now)).toBe("1 hour ago");
  });

  it("returns 3 hours ago", () => {
    expect(getRelativeTime(new Date("2026-06-08T09:00:00.000Z"), now)).toBe("3 hours ago");
  });

  it("returns yesterday for 1 day ago", () => {
    expect(getRelativeTime(new Date("2026-06-07T12:00:00.000Z"), now)).toBe("yesterday");
  });

  it("returns 3 days ago", () => {
    expect(getRelativeTime(new Date("2026-06-05T12:00:00.000Z"), now)).toBe("3 days ago");
  });

  it("returns just now for a future date", () => {
    expect(getRelativeTime(new Date("2026-06-08T12:00:01.000Z"), now)).toBe("just now");
  });
});
