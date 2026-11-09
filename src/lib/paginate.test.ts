import { describe, it, expect } from "vitest";
import { paginate, pageWindow } from "./paginate";

const list = Array.from({ length: 23 }, (_, i) => i + 1);

describe("paginate", () => {
  it("shows 10 items per page by default", () => {
    expect(paginate(list, 1).items).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(paginate(list, 1).totalPages).toBe(3);
  });
  it("last page holds the remainder", () => {
    expect(paginate(list, 3).items).toEqual([21, 22, 23]);
  });
  it("clamps a page past the end to the last page", () => {
    expect(paginate(list, 9).page).toBe(3);
  });
  it("empty list still has one page", () => {
    expect(paginate([], 1).totalPages).toBe(1);
  });
});

describe("pageWindow", () => {
  it("collapses far pages", () => {
    expect(pageWindow(6, 12)).toEqual([1, "…", 4, 5, 6, 7, 8, "…", 12]);
  });
  it("single page", () => {
    expect(pageWindow(1, 1)).toEqual([1]);
  });
});
