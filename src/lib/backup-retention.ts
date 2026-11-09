/** 백업 기록 보관 기간(개월). 이보다 오래된 백업은 자동 삭제됩니다. */
export const BACKUP_RETENTION_MONTHS = 3;

/** 이 시각보다 먼저 만들어진 백업은 삭제 대상입니다. */
export function backupRetentionCutoff(now: Date = new Date()): Date {
  const d = new Date(now.getTime());
  d.setMonth(d.getMonth() - BACKUP_RETENTION_MONTHS);
  return d;
}
