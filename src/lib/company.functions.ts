import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CompanySchema = z.object({
  name: z.string().max(200),
  ceo: z.string().max(100),
  biz_no: z.string().max(50),
  mail_order_no: z.string().max(100),
  app_name: z.string().max(100),
  address: z.string().max(300),
  phone: z.string().max(50),
  email: z.string().max(200),
});

// 관리자 전용: 사업자 정보 저장 (관리자 확인 후 서버에서 저장)
export const saveCompanyInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CompanySchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("권한 없음");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("company_info")
      .upsert({ id: true, ...data, updated_at: new Date().toISOString() }, { onConflict: "id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
