import { describe, expect, it } from "vitest";
import { backupRetentionCutoff, BACKUP_RETENTION_MONTHS } from "./backup-retention";

describe("backup retention", () => {
  it("keeps backups for 3 months", () => {
    expect(BACKUP_RETENTION_MONTHS).toBe(3);
  });

  it("cutoff is exactly 3 months before now", () => {
    const now = new Date("2026-11-09T03:00:00Z");
    expect(backupRetentionCutoff(now).toISOString()).toBe("2026-08-09T03:00:00.000Z");
  });

  it("a backup from 2026-08-08 is older than the cutoff, 2026-08-10 is not", () => {
    const cutoff = backupRetentionCutoff(new Date("2026-11-09T03:00:00Z"));
    expect(new Date("2026-08-08T03:00:00Z") < cutoff).toBe(true);
    expect(new Date("2026-08-10T03:00:00Z") < cutoff).toBe(false);
  });
});
