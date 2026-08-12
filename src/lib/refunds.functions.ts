import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// 환불 가능 기간(일)
const REFUND_WINDOW_DAYS = 7;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

// 구인자: 환불 신청 가능한 결제 목록
export const listRefundableOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    const since = new Date(Date.now() - REFUND_WINDOW_DAYS * 86400000).toISOString();
    const { data: orders } = await db
      .from("credit_orders" as any)
      .select("id, pack, amount_krw, approved_at, created_at, method, status")
      .eq("employer_id", context.userId)
      .eq("status", "confirmed")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(50);

    const { data: reqs } = await db
      .from("refund_requests" as any)
      .select("order_id, status")
      .eq("employer_id", context.userId);

    const blocked = new Set(
      ((reqs as any[]) ?? [])
        .filter((r) => ["pending", "approved", "completed"].includes(r.status))
        .map((r) => r.order_id),
    );

    const { data: emp } = await db
      .from("employer_profiles")
      .select("credits")
      .eq("user_id", context.userId)
      .maybeSingle();

    return {
      credits: ((emp as any)?.credits ?? 0) as number,
      windowDays: REFUND_WINDOW_DAYS,
      orders: (((orders as any[]) ?? []).filter((o) => !blocked.has(o.id))) as any[],
    };
  });

// 구인자: 내 환불 신청 목록
export const listMyRefundRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    const { data } = await db
      .from("refund_requests" as any)
      .select("*")
      .eq("employer_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    return (data as any[]) ?? [];
  });

// 구인자: 환불 신청 생성
export const createRefundRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ orderId: z.string().min(1).max(64), reason: z.string().min(2).max(500) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: order } = await db
      .from("credit_orders" as any)
      .select("*")
      .eq("id", data.orderId)
      .maybeSingle();
    const ord = order as any;
    if (!ord || ord.employer_id !== context.userId) throw new Error("주문을 찾을 수 없습니다");
    if (ord.status !== "confirmed") throw new Error("결제 완료된 주문만 환불 신청할 수 있습니다");

    const ageDays = (Date.now() - new Date(ord.created_at).getTime()) / 86400000;
    if (ageDays > REFUND_WINDOW_DAYS)
      throw new Error(`결제 후 ${REFUND_WINDOW_DAYS}일 이내에만 환불 신청이 가능합니다`);

    const { data: dup } = await db
      .from("refund_requests" as any)
      .select("id, status")
      .eq("order_id", data.orderId)
      .in("status", ["pending", "approved", "completed"])
      .maybeSingle();
    if (dup) throw new Error("이미 환불 신청이 접수된 결제입니다");

    const { data: emp } = await db
      .from("employer_profiles")
      .select("credits")
      .eq("user_id", context.userId)
      .maybeSingle();
    const credits = ((emp as any)?.credits ?? 0) as number;
    if (credits < ord.pack)
      throw new Error(
        `미사용 크레딧이 부족합니다. 이 결제(${ord.pack} 크레딧)를 전액 환불하려면 잔액이 ${ord.pack} 이상이어야 합니다. (현재 ${credits})`,
      );

    const { error } = await db.from("refund_requests" as any).insert({
      employer_id: context.userId,
      order_id: ord.id,
      amount_krw: ord.amount_krw,
      credits: ord.pack,
      reason: data.reason,
      status: "pending",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// 구인자: 대기중 신청 취소
export const cancelMyRefundRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { error } = await db
      .from("refund_requests" as any)
      .update({ status: "cancelled" })
      .eq("id", data.id)
      .eq("employer_id", context.userId)
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function assertAdmin(context: any) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("권한 없음");
}

// 관리자: 전체 환불 신청 목록
export const adminListRefundRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const db = await admin();
    const { data } = await db
      .from("refund_requests" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    const rows = ((data as any[]) ?? []);
    const ids = [...new Set(rows.map((r) => r.employer_id))];
    const { data: emps } = ids.length
      ? await db.from("employer_profiles").select("user_id, company_name, credits").in("user_id", ids)
      : { data: [] as any[] };
    const map = new Map(((emps as any[]) ?? []).map((e) => [e.user_id, e]));
    return rows.map((r) => ({
      ...r,
      company_name: map.get(r.employer_id)?.company_name ?? null,
      employer_credits: map.get(r.employer_id)?.credits ?? null,
    }));
  });

// 관리자: 환불 거절
export const adminRejectRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ id: z.string().uuid(), note: z.string().max(500).optional().nullable() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    const { error } = await db
      .from("refund_requests" as any)
      .update({
        status: "rejected",
        admin_note: data.note ?? null,
        processed_by: context.userId,
        processed_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// 관리자: 환불 승인 + 실제 결제취소(토스) + 크레딧 회수
export const adminApproveRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ id: z.string().uuid(), note: z.string().max(500).optional().nullable() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();

    const { data: reqRow } = await db.from("refund_requests" as any).select("*").eq("id", data.id).maybeSingle();
    const req = reqRow as any;
    if (!req) throw new Error("환불 신청을 찾을 수 없습니다");
    if (req.status !== "pending") throw new Error("이미 처리된 신청입니다");

    const { data: orderRow } = await db.from("credit_orders" as any).select("*").eq("id", req.order_id).maybeSingle();
    const ord = orderRow as any;
    if (!ord) throw new Error("결제 주문을 찾을 수 없습니다");

    const { data: emp } = await db
      .from("employer_profiles")
      .select("credits")
      .eq("user_id", req.employer_id)
      .maybeSingle();
    const credits = ((emp as any)?.credits ?? 0) as number;
    if (credits < req.credits)
      throw new Error(`미사용 크레딧이 부족합니다 (필요 ${req.credits} / 보유 ${credits}). 부분 환불은 수동 처리해 주세요.`);

    // 1) 토스 결제취소
    if (ord.payment_key) {
      const { data: cfg } = await db
        .from("payment_settings" as any)
        .select("secret_key")
        .eq("provider", "toss")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const secret = ((cfg as any)?.secret_key || process.env["TOSS_SECRET_KEY"] || "").trim();
      if (!secret) throw new Error("토스 시크릿 키가 설정되지 않았습니다");
      const basic = Buffer.from(`${secret}:`).toString("base64");
      const res = await fetch(
        `https://api.tosspayments.com/v1/payments/${encodeURIComponent(ord.payment_key)}/cancel`,
        {
          method: "POST",
          headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/json" },
          body: JSON.stringify({ cancelReason: req.reason?.slice(0, 200) || "구매자 환불 요청" }),
        },
      );
      const body: any = await res.json().catch(() => ({}));
      // 토스 대시보드에서 이미 취소한 건은 정상 처리로 간주(멱등)
      const alreadyCanceled =
        body?.code === "ALREADY_CANCELED_PAYMENT" ||
        (typeof body?.message === "string" && body.message.includes("이미 취소된 결제"));
      if (!res.ok && !alreadyCanceled) {
        await db
          .from("refund_requests" as any)
          .update({ admin_note: `취소 실패: ${body?.code ?? ""} ${body?.message ?? ""}`.trim() })
          .eq("id", req.id);
        throw new Error(body?.message || "토스 결제취소 실패");
      }
      await db
        .from("credit_orders" as any)
        .update({ status: "canceled", raw: body })
        .eq("id", ord.id);
      if (alreadyCanceled) {
        await db
          .from("refund_requests" as any)
          .update({ admin_note: "토스에서 이미 취소된 결제 — 크레딧만 회수 처리" })
          .eq("id", req.id);
      }

    } else {
      await db.from("credit_orders" as any).update({ status: "canceled" }).eq("id", ord.id);
    }

    // 2) 크레딧 회수 + 이력
    await db
      .from("employer_profiles")
      .update({ credits: credits - req.credits } as any)
      .eq("user_id", req.employer_id);

    await db.from("credit_transactions").insert({
      employer_id: req.employer_id,
      delta: -req.credits,
      type: "refund",
      note: `환불 처리(${req.credits} 크레딧 / ${Number(req.amount_krw).toLocaleString()}원)`,
    } as any);

    // 3) 신청 완료 처리
    await db
      .from("refund_requests" as any)
      .update({
        status: "completed",
        admin_note: data.note ?? null,
        processed_by: context.userId,
        processed_at: new Date().toISOString(),
      })
      .eq("id", req.id);

    return { ok: true };
  });
