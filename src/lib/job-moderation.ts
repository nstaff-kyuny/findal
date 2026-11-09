export type JobModerationStatus = "live" | "admin_hidden" | "inactive" | "completed";

/** How a job appears to seekers: admin hiding always wins over the employer's own on/off switch. */
export function jobModerationStatus(
  job: { is_active?: boolean | null; admin_hidden?: boolean | null },
  completed: boolean,
): JobModerationStatus {
  if (job.admin_hidden) return "admin_hidden";
  if (!job.is_active) return "inactive";
  if (completed) return "completed";
  return "live";
}
