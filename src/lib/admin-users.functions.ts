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
      gender: z.enum(["M", "F"]),
      referrerCode: z.string().optional().default(""),
      preferredRegions: z.string().optional().default(""),
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

    // Generate 8-digit staff_no: gender(1=M,2=F) + YY + MM + 3-digit sequence per month
    const g = data.gender === "M" ? "1" : "2";
    const seoul = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    const yy = String(seoul.getFullYear()).slice(-2);
    const mm = String(seoul.getMonth() + 1).padStart(2, "0");
    const prefix = `${g}${yy}${mm}`;
    let staffNo: string | null = null;
    for (let attempt = 0; attempt < 5 && !staffNo; attempt++) {
      const { data: rows, error: qErr } = await supabaseAdmin
        .from("profiles")
        .select("staff_no")
        .like("staff_no", `${prefix}%`);
      if (qErr) throw new Error(qErr.message);
      const used = new Set((rows ?? []).map((r: any) => r.staff_no).filter(Boolean));
      let next = 1;
      while (used.has(`${prefix}${String(next).padStart(3, "0")}`)) next++;
      if (next > 999) throw new Error("해당 월 사번이 모두 소진되었습니다");
      const candidate = `${prefix}${String(next).padStart(3, "0")}`;
      const { error: upErr } = await supabaseAdmin
        .from("profiles")
        .upsert(
          { id: newId, full_name: data.fullName, phone: data.phone, gender: data.gender, staff_no: candidate },
          { onConflict: "id" },
        );
      if (!upErr) { staffNo = candidate; break; }
      if (!/duplicate key|unique/i.test(upErr.message)) throw new Error(upErr.message);
    }
    if (!staffNo) throw new Error("사번 발급 실패 - 다시 시도해주세요");

    await supabaseAdmin.from("user_roles").insert({ user_id: newId, role: data.role });
    const refCode = (data.referrerCode || "").trim() || null;
    if (data.role === "employer") {
      await supabaseAdmin.from("employer_profiles").insert({
        user_id: newId,
        company_name: data.fullName,
        manager_name: data.fullName,
        contact_phone: data.phone || "",
        location: "",
        referrer_code: refCode,
      });
    } else {
      await supabaseAdmin.from("seeker_profiles").insert({
        user_id: newId,
        nationality: "korean",
        experience: "lt5",
        referrer_code: refCode,
        preferred_region: (data.preferredRegions || "").trim() || null,
      });
    }
    return { ok: true, id: newId, staffNo };
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

export const adminResetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ userId: z.string().uuid(), newPassword: z.string().min(6) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.newPassword,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpdateUserProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      userId: z.string().uuid(),
      role: z.enum(["seeker", "employer", "unknown"]),
      fullName: z.string().max(100).optional().default(""),
      phone: z.string().max(50).optional().default(""),
      seeker: z.object({
        nationality: z.enum(["korean", "foreigner"]),
        visa: z.enum(["student", "jobseeker", "resident", "other"]).optional().nullable(),
        koreanOk: z.boolean(),
        experience: z.enum(["lt5", "gte5"]),
        preferredRegions: z.string().max(100).optional().nullable(),
        referrerCode: z.string().max(50).optional().nullable(),
      }).optional(),
      employer: z.object({
        companyName: z.string().max(120),
        location: z.string().max(200),
        managerName: z.string().max(100),
        referrerCode: z.string().max(50).optional().nullable(),
      }).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({ id: data.userId, full_name: data.fullName, phone: data.phone }, { onConflict: "id" });
    if (profileError) throw new Error(profileError.message);

    if (data.role === "seeker" && data.seeker) {
      const { error } = await supabaseAdmin.from("seeker_profiles").update({
        nationality: data.seeker.nationality,
        visa: data.seeker.nationality === "korean" ? null : (data.seeker.visa || null),
        korean_ok: data.seeker.koreanOk,
        experience: data.seeker.experience,
        preferred_region: data.seeker.preferredRegions || null,
        referrer_code: data.seeker.referrerCode || null,
      }).eq("user_id", data.userId);
      if (error) throw new Error(error.message);
    }

    if (data.role === "employer" && data.employer) {
      const { error } = await supabaseAdmin.from("employer_profiles").update({
        company_name: data.employer.companyName,
        location: data.employer.location,
        manager_name: data.employer.managerName,
        contact_phone: data.phone,
        referrer_code: data.employer.referrerCode || null,
      }).eq("user_id", data.userId);
      if (error) throw new Error(error.message);
    }

    return { ok: true };
  });

export const adminListAllUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const users: Array<{
      id: string;
      email: string;
      created_at: string;
      last_sign_in_at: string | null;
      banned_until: string | null;
    }> = [];
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) throw new Error(error.message);
      for (const u of list.users) {
        users.push({
          id: u.id,
          email: u.email ?? "",
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null,
          banned_until: (u as any).banned_until ?? null,
        });
      }
      if (list.users.length < perPage) break;
      page++;
      if (page > 20) break;
    }
    return { users };
  });

export const adminSetUserBan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ userId: z.string().uuid(), ban: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.userId === context.userId) throw new Error("자기 자신은 변경할 수 없습니다");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.ban ? "876000h" : "none",
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListUserEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userIds: z.array(z.string().uuid()).max(1000) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const map: Record<string, string> = {};
    // paginate through all users (admin API has no in() filter)
    let page = 1;
    const perPage = 1000;
    const wanted = new Set(data.userIds);
    while (wanted.size > 0) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) throw new Error(error.message);
      for (const u of list.users) {
        if (wanted.has(u.id)) {
          map[u.id] = u.email ?? "";
          wanted.delete(u.id);
        }
      }
      if (list.users.length < perPage) break;
      page++;
      if (page > 20) break;
    }
    return { emails: map };
  });

export const adminUpdateReferrer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      code: z.string().min(1).max(50).regex(/^[A-Z0-9]+$/, "코드는 영문 대문자와 숫자만 사용 가능합니다"),
      name: z.string().min(1).max(100),
      phone: z.string().max(50).optional().default(""),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("referrers")
      .update({ code: data.code, name: data.name, phone: data.phone })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

