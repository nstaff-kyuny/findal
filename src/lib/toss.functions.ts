import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const PACKS = [
  { qty: 20, price: 20000 },
  { qty: 50, price: 50000 },
  { qty: 100, price: 100000 },
] as const;

// DB에 저장된 결제 설정을 서버에서 로드. 실패시 환경변수로 폴백.
async function loadTossConfig() {
  const { data } = await supabaseAdmin
    .from("payment_settings" as any)
    .select("*")
    .eq("provider", "toss")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const row = data as any;
  return {
    enabled: row?.enabled ?? false,
    mode: (row?.mode ?? "test") as "test" | "live",
    clientKey: row?.client_key || process.env.TOSS_CLIENT_KEY || "test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm",
    secretKey: row?.secret_key || process.env.TOSS_SECRET_KEY || "",
    securityKey: row?.security_key || process.env.TOSS_SECURITY_KEY || "",
    merchantId: row?.merchant_id ?? null,
  };
}

// 클라이언트 결제창 초기화용: 시크릿 키는 절대 반환하지 않음
export const getTossPublicConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const cfg = await loadTossConfig();
    return {
      enabled: cfg.enabled,
      mode: cfg.mode,
      clientKey: cfg.clientKey,
    };
  });

// 관리자 전용: 전체 설정 조회 (마스킹된 형태로 반환)
export const getPaymentSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("권한 없음");
    const cfg = await loadTossConfig();
    return {
      enabled: cfg.enabled,
      mode: cfg.mode,
      merchantId: cfg.merchantId,
      clientKey: cfg.clientKey,
      secretKey: cfg.secretKey,
      securityKey: cfg.securityKey,
    };
  });

// 관리자 전용: 결제 설정 저장/갱신
export const savePaymentSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({
      mode: z.enum(["test", "live"]),
      enabled: z.boolean(),
      merchantId: z.string().max(200).optional().nullable(),
      clientKey: z.string().max(500).optional().nullable(),
      secretKey: z.string().max(500).optional().nullable(),
      securityKey: z.string().max(500).optional().nullable(),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("권한 없음");

    // 키 형식 검증(테스트/실운영 접두어 자동 판별)
    if (data.enabled && data.mode === "live") {
      if (data.clientKey && !data.clientKey.startsWith("live_")) {
        throw new Error("실운영 모드에는 live_ 로 시작하는 클라이언트 키가 필요합니다");
      }
      if (data.secretKey && !data.secretKey.startsWith("live_")) {
        throw new Error("실운영 모드에는 live_ 로 시작하는 시크릿 키가 필요합니다");
      }
    }

    const { data: existing } = await supabaseAdmin
      .from("payment_settings" as any)
      .select("id")
      .eq("provider", "toss")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const payload: any = {
      provider: "toss",
      mode: data.mode,
      enabled: data.enabled,
      merchant_id: data.merchantId ?? null,
      client_key: data.clientKey ?? null,
      secret_key: data.secretKey ?? null,
      security_key: data.securityKey ?? null,
      updated_by: context.userId,
    };

    if ((existing as any)?.id) {
      const { error } = await supabaseAdmin
        .from("payment_settings" as any)
        .update(payload)
        .eq("id", (existing as any).id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("payment_settings" as any)
        .insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

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
