import { describe, it, expect } from "vitest";
import { formatPhone } from "./phone";

describe("formatPhone", () => {
  it("formats 11-digit mobile numbers as 3-4-4", () => {
    expect(formatPhone("01089339199")).toBe("010-8933-9199");
  });
  it("re-formats messy input", () => {
    expect(formatPhone("010 1234. 5678")).toBe("010-1234-5678");
  });
  it("formats partial input while typing", () => {
    expect(formatPhone("0101")).toBe("010-1");
    expect(formatPhone("0101234")).toBe("010-123-4");
  });
  it("formats Seoul 02 numbers", () => {
    expect(formatPhone("0212345678")).toBe("02-1234-5678");
    expect(formatPhone("021234567")).toBe("02-123-4567");
    expect(formatPhone("021234")).toBe("02-123-4");
  });
  it("formats 070 and representative numbers", () => {
    expect(formatPhone("07080805228")).toBe("070-8080-5228");
    expect(formatPhone("15881234")).toBe("1588-1234");
  });
  it("caps input at 11 digits", () => {
    expect(formatPhone("010123456789999")).toBe("010-1234-5678");
  });
});
