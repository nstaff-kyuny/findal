import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { backupRetentionCutoff } from "@/lib/backup-retention";

export const BACKUP_TABLES = [
  "profiles",
  "user_roles",
  "seeker_profiles",
  "employer_profiles",
  "jobs",
  "job_applications",
  "job_contacts",
  "promoted_jobs",
  "seeker_favorites",
  "credit_transactions",
  "credit_orders",
  "credit_purchase_requests",
  "partner_programs",
  "referrers",
  "notifications",
  "notices",
  "events",
  "faqs",
  "inquiries",
  "ad_banners",
  "company_info",
  "legal_documents",
  "custom_industries",
  "custom_job_roles",
  "app_version",
  "backup_jobs",
];

/**
 * 3개월이 지난 백업 기록(backup_jobs)과 그 백업 파일(backups 버킷)만 삭제합니다.
 * 앱 화면·공고·회원 정보 테이블은 건드리지 않습니다.
 */
export async function purgeOldBackups(now: Date = new Date()): Promise<number> {
  const cutoff = backupRetentionCutoff(now).toISOString();
  const { data: old, error } = await supabaseAdmin
    .from("backup_jobs")
    .select("id, file_path")
    .lt("created_at", cutoff)
    .limit(500);
  if (error) throw error;
  if (!old || old.length === 0) return 0;

  const paths = old.map((r) => r.file_path).filter((p): p is string => !!p);
  if (paths.length > 0) {
    const { error: rmErr } = await supabaseAdmin.storage.from("backups").remove(paths);
    if (rmErr) throw rmErr;
  }
  const { error: delErr } = await supabaseAdmin
    .from("backup_jobs")
    .delete()
    .in("id", old.map((r) => r.id));
  if (delErr) throw delErr;
  return old.length;
}

export async function runBackup(kind: "manual" | "scheduled") {
  const { data: job, error: jobErr } = await supabaseAdmin
    .from("backup_jobs")
    .insert({ kind, status: "running" })
    .select("*")
    .single();
  if (jobErr) throw jobErr;

  try {
    const data: Record<string, any[]> = {};
    const rowCounts: Record<string, number> = {};
    for (const t of BACKUP_TABLES) {
      const { data: rows, error } = await supabaseAdmin.from(t as any).select("*");
      if (error) {
        rowCounts[t] = -1;
        data[t] = [];
        continue;
      }
      data[t] = rows ?? [];
      rowCounts[t] = rows?.length ?? 0;
    }

    const payload = {
      generated_at: new Date().toISOString(),
      app: "findar",
      kind,
      schema: { tables: BACKUP_TABLES },
      row_counts: rowCounts,
      data,
    };
    const json = JSON.stringify(payload);
    const buffer = new TextEncoder().encode(json);
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const path = `backup-${ts}.json`;

    const { error: upErr } = await supabaseAdmin.storage
      .from("backups")
      .upload(path, buffer, { contentType: "application/json", upsert: false });
    if (upErr) throw upErr;

    await supabaseAdmin
      .from("backup_jobs")
      .update({
        status: "completed",
        file_path: path,
        size_bytes: buffer.byteLength,
        row_counts: rowCounts,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    // 백업 성공 후 3개월 지난 백업 기록·파일 자동 정리 (실패해도 백업 결과에는 영향 없음)
    let purged = 0;
    try {
      purged = await purgeOldBackups();
    } catch (e) {
      console.error("old backup purge failed", e);
    }

    return { ok: true, id: job.id, path, size: buffer.byteLength, purged };
  } catch (e: any) {
    await supabaseAdmin
      .from("backup_jobs")
      .update({ status: "failed", error: String(e?.message ?? e), completed_at: new Date().toISOString() })
      .eq("id", job.id);
    throw e;
  }
}
