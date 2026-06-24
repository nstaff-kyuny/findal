import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Tables to back up (public schema, user-data)
const BACKUP_TABLES = [
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

async function assertAdmin(context: any) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("관리자 권한이 필요합니다");
}

async function runBackup(kind: "manual" | "scheduled") {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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

    return { ok: true, id: job.id, path, size: buffer.byteLength };
  } catch (e: any) {
    await supabaseAdmin
      .from("backup_jobs")
      .update({ status: "failed", error: String(e?.message ?? e), completed_at: new Date().toISOString() })
      .eq("id", job.id);
    throw e;
  }
}

export const createBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    return runBackup("manual");
  });

export const listBackups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("backup_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return { backups: data ?? [] };
  });

export const getBackupDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { path: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("backups")
      .createSignedUrl(data.path, 60 * 10);
    if (error) throw error;
    return { url: signed.signedUrl };
  });

export const deleteBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; path?: string | null }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.path) {
      await supabaseAdmin.storage.from("backups").remove([data.path]);
    }
    const { error } = await supabaseAdmin.from("backup_jobs").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// Internal helper used by the public cron hook (authentication handled by route)
export async function runScheduledBackup() {
  return runBackup("scheduled");
}
