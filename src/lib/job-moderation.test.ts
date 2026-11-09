import { describe, it, expect } from "vitest";
import { jobModerationStatus } from "./job-moderation";

describe("jobModerationStatus", () => {
  it("admin-hidden job is never shown as live, even if active", () => {
    expect(jobModerationStatus({ is_active: true, admin_hidden: true }, false)).toBe("admin_hidden");
  });
  it("active, not hidden, not finished job is live", () => {
    expect(jobModerationStatus({ is_active: true, admin_hidden: false }, false)).toBe("live");
  });
  it("employer-deactivated job is inactive", () => {
    expect(jobModerationStatus({ is_active: false, admin_hidden: false }, false)).toBe("inactive");
  });
  it("active but finished job is completed", () => {
    expect(jobModerationStatus({ is_active: true, admin_hidden: false }, true)).toBe("completed");
  });
});
