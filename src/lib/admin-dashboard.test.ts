import { describe, it, expect } from "vitest";
import {
  kstDayKey, kstWeekKey, kstYesterdayRange, lastNMonthKeys, lastNWeekKeys,
  bucketPurchases, countSignups, bannerState,
} from "./admin-dashboard";

describe("admin dashboard dates use Korean time", () => {
  it("23:30 UTC counts as the next day in Korea", () => {
    expect(kstDayKey("2026-11-12T23:30:00Z")).toBe("2026-11-13");
  });
  it("yesterday is the previous Korean calendar day", () => {
    // 2026-11-13 12:14 KST
    const r = kstYesterdayRange(new Date("2026-11-13T03:14:00Z"));
    expect(r.key).toBe("2026-11-12");
    expect(r.start.toISOString()).toBe("2026-11-11T15:00:00.000Z");
    expect(r.end.toISOString()).toBe("2026-11-12T15:00:00.000Z");
  });
  it("weeks start on Monday", () => {
    // 2026-11-15 is a Sunday (KST)
    expect(kstWeekKey("2026-11-15T10:00:00Z")).toBe("2026-11-09");
    expect(kstWeekKey("2026-11-16T00:00:00Z")).toBe("2026-11-16");
  });
  it("monthly view covers the last 6 months, including this one", () => {
    expect(lastNMonthKeys(new Date("2026-02-10T00:00:00Z"), 6)).toEqual([
      "2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02",
    ]);
  });
  it("weekly view covers the last 8 weeks, ending this week", () => {
    const w = lastNWeekKeys(new Date("2026-11-13T03:00:00Z"), 8);
    expect(w).toHaveLength(8);
    expect(w[7]).toBe("2026-11-09");
    expect(w[0]).toBe("2026-09-21");
  });
});

describe("credit purchase totals", () => {
  it("adds per-period sales and a running total on top of earlier sales", () => {
    const rows = [
      { created_at: "2026-10-05T01:00:00Z", amount_krw: 20000, pack: 20 },
      { created_at: "2026-11-01T01:00:00Z", amount_krw: 100000, pack: 100 },
      { created_at: "2026-11-10T01:00:00Z", amount_krw: 50000, pack: 50 },
    ];
    const out = bucketPurchases(rows, ["2026-10", "2026-11"], (iso) => kstDayKey(iso).slice(0, 7), 30000, 30);
    expect(out[0]).toMatchObject({ count: 1, amount: 20000, cumAmount: 50000, cumCredits: 50 });
    expect(out[1]).toMatchObject({ count: 2, amount: 150000, credits: 150, cumAmount: 200000 });
  });
});

describe("yesterday's sign-ups by role", () => {
  it("splits employers and job seekers and ignores other days", () => {
    const profiles = [
      { id: "a", created_at: "2026-11-12T01:00:00Z" },
      { id: "b", created_at: "2026-11-12T14:59:00Z" },
      { id: "c", created_at: "2026-11-12T15:00:00Z" }, // 11/13 00:00 KST
      { id: "d", created_at: "2026-11-11T20:00:00Z" },
    ];
    const roles = new Map([["a", ["seeker"]], ["b", ["employer"]], ["c", ["seeker"]]]);
    const r = kstYesterdayRange(new Date("2026-11-13T03:14:00Z"));
    expect(countSignups(profiles, roles, r.start, r.end)).toEqual({ seeker: 1, employer: 1, none: 1, total: 3 });
  });
});

describe("banner status", () => {
  const now = new Date("2026-11-13T03:00:00Z");
  it("is live only while switched on and inside its dates", () => {
    expect(bannerState({ active: true, starts_at: "2026-11-01T00:00:00Z", ends_at: "2026-12-01T00:00:00Z" }, now)).toBe("live");
    expect(bannerState({ active: false, starts_at: "2026-11-01T00:00:00Z", ends_at: "2026-12-01T00:00:00Z" }, now)).toBe("off");
    expect(bannerState({ active: true, starts_at: "2026-11-20T00:00:00Z", ends_at: "2026-12-01T00:00:00Z" }, now)).toBe("scheduled");
    expect(bannerState({ active: true, starts_at: "2026-10-01T00:00:00Z", ends_at: "2026-11-01T00:00:00Z" }, now)).toBe("ended");
  });
});
