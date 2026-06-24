import { supabaseAdmin } from "@/integrations/supabase/client.server";

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

    return { ok: true, id: job.id, path, size: buffer.byteLength };
  } catch (e: any) {
    await supabaseAdmin
      .from("backup_jobs")
      .update({ status: "failed", error: String(e?.message ?? e), completed_at: new Date().toISOString() })
      .eq("id", job.id);
    throw e;
  }
}
