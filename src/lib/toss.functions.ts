import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const PACKS = [
  { qty: 20, price: 20000 },
  { qty: 50, price: 50000 },
  { qty: 100, price: 100000 },
] as const;

// 결제 전: 서버에서 주문 생성(orderId + 금액 확정)
export const createCreditOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ pack: z.number().int().positive() }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const pack = PACKS.find((p) => p.qty === data.pack);
    if (!pack) throw new Error("유효하지 않은 상품입니다");

    const orderId = `cr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const { error } = await supabaseAdmin.from("credit_orders" as any).insert({
      id: orderId,
      employer_id: context.userId,
      pack: pack.qty,
      amount_krw: pack.price,
      status: "pending",
    });
    if (error) throw new Error(error.message);

    return {
      orderId,
      amount: pack.price,
      orderName: `크레딧 ${pack.qty}개`,
    };
  });

// 결제 후: successUrl에서 호출 → Toss confirm → 크레딧 적립
export const confirmCreditOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({
      paymentKey: z.string().min(1).max(200),
      orderId: z.string().min(1).max(64),
      amount: z.number().int().positive(),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const secret = process.env.TOSS_SECRET_KEY;
    if (!secret) throw new Error("결제 설정이 누락되었습니다");

    // 1. 주문 검증
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("credit_orders" as any)
      .select("*")
      .eq("id", data.orderId)
      .maybeSingle();
    if (orderErr || !order) throw new Error("주문을 찾을 수 없습니다");
    const ord = order as any;
    if (ord.employer_id !== context.userId) throw new Error("권한 없음");
    if (ord.amount_krw !== data.amount) throw new Error("결제 금액이 일치하지 않습니다");

    if (ord.status === "confirmed") {
      return { ok: true, alreadyConfirmed: true, pack: ord.pack };
    }

    // 2. Toss 결제 승인 API 호출
    const basic = Buffer.from(`${secret}:`).toString("base64");
    const res = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentKey: data.paymentKey,
        orderId: data.orderId,
        amount: data.amount,
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      await supabaseAdmin.from("credit_orders" as any).update({
        status: "failed",
        raw: body,
      }).eq("id", data.orderId);
      throw new Error(body?.message || "결제 승인 실패");
    }

    // 3. 주문 확정 + 크레딧 적립
    await supabaseAdmin.from("credit_orders" as any).update({
      status: "confirmed",
      payment_key: data.paymentKey,
      method: body?.method ?? null,
      approved_at: body?.approvedAt ?? new Date().toISOString(),
      raw: body,
    }).eq("id", data.orderId);

    const { data: emp } = await supabaseAdmin
      .from("employer_profiles")
      .select("credits")
      .eq("user_id", context.userId)
      .single();
    const current = (emp as any)?.credits ?? 0;
    await supabaseAdmin
      .from("employer_profiles")
      .update({ credits: current + ord.pack } as any)
      .eq("user_id", context.userId);

    await supabaseAdmin.from("credit_purchase_requests").insert({
      employer_id: context.userId,
      pack: ord.pack,
      amount_krw: ord.amount_krw,
      status: "fulfilled",
      payment_ref: data.paymentKey,
      payment_method: body?.method ?? "toss",
    } as any);

    await supabaseAdmin.from("credit_transactions").insert({
      employer_id: context.userId,
      delta: ord.pack,
      type: "admin_grant",
      note: `토스페이먼츠 결제(${ord.pack} 크레딧)`,
    } as any);

    return { ok: true, pack: ord.pack };
  });
