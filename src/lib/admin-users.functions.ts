import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("관리자 권한이 필요합니다");
}

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      email: z.string().email(),
      password: z.string().min(6),
      fullName: z.string().min(1),
      phone: z.string().optional().default(""),
      role: z.enum(["seeker", "employer"]),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, phone: data.phone },
    });
    if (error) throw new Error(error.message);
    const newId = created.user!.id;
    await supabaseAdmin.from("user_roles").insert({ user_id: newId, role: data.role });
    if (data.role === "employer") {
      await supabaseAdmin.from("employer_profiles").insert({
        user_id: newId,
        company_name: data.fullName,
        manager_name: data.fullName,
        contact_phone: data.phone || "",
        location: "",
      });
    } else {
      await supabaseAdmin.from("seeker_profiles").insert({
        user_id: newId,
        nationality: "korean",
        experience: "lt5",
      });
    }
    return { ok: true, id: newId };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.userId === context.userId) throw new Error("자기 자신은 삭제할 수 없습니다");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
