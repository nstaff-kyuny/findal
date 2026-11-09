import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// 구인자가 받은 신청의 지원자 이름(모든 상태)과 연락처(승인·확정·노쇼만)를 반환
export const getApplicantContacts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: apps, error } = await context.supabase
      .from("job_applications")
      .select("seeker_id, status")
      .eq("employer_id", context.userId);
    if (error) throw new Error(error.message);
    const list = apps ?? [];
    if (!list.length) return {} as Record<string, { full_name: string | null; phone: string | null }>;
    const phoneOk = new Set(
      list.filter((a: any) => ["approved", "confirmed", "no_show"].includes(a.status)).map((a: any) => a.seeker_id),
    );
    const ids = Array.from(new Set(list.map((a: any) => a.seeker_id)));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profs } = await supabaseAdmin.from("profiles").select("id, full_name, phone").in("id", ids);
    const out: Record<string, { full_name: string | null; phone: string | null }> = {};
    (profs ?? []).forEach((p: any) => {
      out[p.id] = { full_name: p.full_name, phone: phoneOk.has(p.id) ? p.phone : null };
    });
    return out;
  });
