import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const PACKS = [
  { qty: 20, price: 20000 },
  { qty: 50, price: 50000 },
  { qty: 100, price: 100000 },
] as const;

// 데모(문서) 키 - 키가 아예 없을 때 안전 폴백 (결제위젯 SDK 데모 키)
const TOSS_WIDGET_DEMO_CLIENT_KEY = "test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm";
const TOSS_WIDGET_DEMO_SECRET_KEY = "test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6";

// 결제위젯 연동 키(gck/gsk) 와 API 개별 연동 키(ck/sk) 모두 지원
const CLIENT_PREFIXES = ["test_gck_", "live_gck_", "test_ck_", "live_ck_"];
const SECRET_PREFIXES = ["test_gsk_", "live_gsk_", "test_sk_", "live_sk_"];

function sanitizeClientKey(k: string | null | undefined): string {
  const v = (k ?? "").trim();
  if (CLIENT_PREFIXES.some((p) => v.startsWith(p))) return v;
  return TOSS_WIDGET_DEMO_CLIENT_KEY;
}
function sanitizeSecretKey(k: string | null | undefined): string {
  const v = (k ?? "").trim();
  if (SECRET_PREFIXES.some((p) => v.startsWith(p))) return v;
  return TOSS_WIDGET_DEMO_SECRET_KEY;
}

// 클라이언트 키 종류: 위젯(widget) 또는 API 개별연동(payment)
function keyTypeOf(clientKey: string): "widget" | "payment" {
  return clientKey.includes("_gck_") ? "widget" : "payment";
}

// DB에 저장된 결제 설정을 서버에서 로드.
async function loadTossConfig() {
  const { data } = await supabaseAdmin
    .from("payment_settings" as any)
    .select("*")
    .eq("provider", "toss")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const row = data as any;
  const rawClient = row?.client_key || process.env.TOSS_CLIENT_KEY || "";
  const rawSecret = row?.secret_key || process.env.TOSS_SECRET_KEY || "";
  const clientKey = sanitizeClientKey(rawClient);
  return {
    enabled: row?.enabled ?? false,
    mode: (row?.mode ?? "test") as "test" | "live",
    clientKey,
    keyType: keyTypeOf(clientKey),
    secretKey: sanitizeSecretKey(rawSecret),
    rawClientKey: rawClient,
    rawSecretKey: rawSecret,
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
      keyType: cfg.keyType,
    };

  });

// 시크릿/보안 키는 절대 원문으로 반환하지 않고 마스킹 처리
function maskKey(k: string | null | undefined): string {
  const v = (k ?? "").trim();
  if (!v) return "";
  const head = v.slice(0, Math.min(12, v.length));
  return `${head}${"•".repeat(8)}`;
}

// 관리자 전용: 전체 설정 조회 (시크릿 키는 마스킹된 형태로만 반환)
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
      clientKey: cfg.rawClientKey || cfg.clientKey,
      secretKey: maskKey(cfg.rawSecretKey),
      secretKeySet: Boolean(cfg.rawSecretKey),
      securityKey: maskKey(cfg.securityKey),
      securityKeySet: Boolean(cfg.securityKey),
    };
  });


// 관리자 전용: 결제 설정 저장/갱신
export const savePaymentSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        mode: z.enum(["test", "live"]),
        enabled: z.boolean(),
        merchantId: z.string().max(200).optional().nullable(),
        clientKey: z.string().max(500).optional().nullable(),
        secretKey: z.string().max(500).optional().nullable(),
        securityKey: z.string().max(500).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("권한 없음");

    // 키 형식 검증: 결제위젯 연동 키(gck/gsk) 와 API 개별 연동 키(ck/sk) 모두 허용
    if (data.clientKey && !CLIENT_PREFIXES.some((p) => data.clientKey!.startsWith(p))) {
      throw new Error(
        "클라이언트 키 형식이 올바르지 않습니다. test_ck_/live_ck_ (API 개별 연동) 또는 test_gck_/live_gck_ (결제위젯 연동) 로 시작하는 키를 입력해 주세요.",
      );
    }
    if (data.secretKey && !SECRET_PREFIXES.some((p) => data.secretKey!.startsWith(p))) {
      throw new Error(
        "시크릿 키 형식이 올바르지 않습니다. test_sk_/live_sk_ 또는 test_gsk_/live_gsk_ 로 시작하는 키를 입력해 주세요.",
      );
    }
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
      const { error } = await supabaseAdmin.from("payment_settings" as any).insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// 결제 전: 서버에서 주문 생성(orderId + 금액 확정)
export const createCreditOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ pack: z.number().int().positive() }).parse(data))
  .handler(async ({ data, context }) => {
    const cfg = await loadTossConfig();
    if (!cfg.enabled) throw new Error("현재 결제가 비활성화되어 있습니다. 관리자에게 문의하세요.");
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
    z
      .object({
        paymentKey: z.string().min(1).max(200),
        orderId: z.string().min(1).max(64),
        // 토스 리다이렉트에서 금액이 누락/변형될 수 있으므로 선택값으로 처리하고
        // 실제 승인 금액은 서버에 저장된 주문 금액을 사용한다.
        amount: z.coerce.number().int().positive().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const cfg = await loadTossConfig();
    const secret = cfg.secretKey;
    if (!secret) throw new Error("결제 설정이 누락되었습니다. 관리자 페이지에서 시크릿 키를 등록해 주세요.");

    // 1. 주문 검증
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("credit_orders" as any)
      .select("*")
      .eq("id", data.orderId)
      .maybeSingle();
    if (orderErr || !order) throw new Error("주문을 찾을 수 없습니다");
    const ord = order as any;
    if (ord.employer_id !== context.userId) throw new Error("권한 없음");
    if (data.amount !== undefined && ord.amount_krw !== data.amount) {
      throw new Error("결제 금액이 일치하지 않습니다");
    }
    const amount = ord.amount_krw as number;


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
        amount,
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      await supabaseAdmin
        .from("credit_orders" as any)
        .update({
          status: "failed",
          raw: body,
        })
        .eq("id", data.orderId);
      throw new Error(body?.message || "결제 승인 실패");
    }

    // 3. 주문 확정 + 크레딧 적립
    await supabaseAdmin
      .from("credit_orders" as any)
      .update({
        status: "confirmed",
        payment_key: data.paymentKey,
        method: body?.method ?? null,
        approved_at: body?.approvedAt ?? new Date().toISOString(),
        raw: body,
      })
      .eq("id", data.orderId);

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

// 관리자 전용: 저장된 키가 실제로 어느 상점(MID)에 속하는지 토스 API로 진단
export const diagnoseTossKeys = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("권한 없음");

    const cfg = await loadTossConfig();
    const basic = Buffer.from(`${cfg.secretKey}:`).toString("base64");

    // 최근 주문이 있으면 그 주문으로 조회 → mId 확인. 없으면 더미 주문으로 키 유효성만 확인.
    const { data: recent } = await supabaseAdmin
      .from("credit_orders" as any)
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const probeId = (recent as any)?.id || `diag_${Date.now()}`;

    let mId: string | null = null;
    let keyValid = false;
    let note = "";
    try {
      const res = await fetch(`https://api.tosspayments.com/v1/payments/orders/${encodeURIComponent(probeId)}`, {
        headers: { Authorization: `Basic ${basic}` },
      });
      const body: any = await res.json().catch(() => ({}));
      if (res.ok) {
        keyValid = true;
        mId = body?.mId ?? null;
      } else if (body?.code === "NOT_FOUND_PAYMENT") {
        keyValid = true;
        note = "키는 유효하지만 조회할 결제 이력이 없어 상점 ID를 확인할 수 없습니다. 결제를 1회 시도한 뒤 다시 진단해 주세요.";
      } else if (body?.code === "UNAUTHORIZED_KEY") {
        note = "시크릿 키가 유효하지 않습니다. 토스 개발자센터에서 키를 다시 확인해 주세요.";
      } else {
        note = body?.message || `조회 실패 (HTTP ${res.status})`;
      }
    } catch (e: any) {
      note = e?.message || "토스 API 연결 실패";
    }

    const entered = (cfg.merchantId ?? "").trim();
    return {
      keyValid,
      mId,
      enteredMerchantId: entered || null,
      merchantMismatch: !!(mId && entered && mId !== entered),
      mode: cfg.mode,
      keyType: cfg.keyType,
      note,
    };
  });

// 결제 실패 사유를 주문에 기록 (본인 주문만)
export const reportOrderFailure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        orderId: z.string().min(1).max(64),
        code: z.string().max(100).optional().nullable(),
        message: z.string().max(500).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: order } = await supabaseAdmin
      .from("credit_orders" as any)
      .select("id, employer_id, status")
      .eq("id", data.orderId)
      .maybeSingle();
    const ord = order as any;
    if (!ord || ord.employer_id !== context.userId) return { ok: false };
    if (ord.status === "confirmed") return { ok: false };

    await supabaseAdmin
      .from("credit_orders" as any)
      .update({
        status: "failed",
        raw: { failure: { code: data.code ?? null, message: data.message ?? null, at: new Date().toISOString() } },
      })
      .eq("id", data.orderId);
    return { ok: true };
  });

// 1시간 이상 미완료로 남은 주문을 만료 처리
export const expireStaleCreditOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("권한 없음");
    const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data, error } = await supabaseAdmin
      .from("credit_orders" as any)
      .update({ status: "expired" })
      .eq("status", "pending")
      .lt("created_at", cutoff)
      .select("id");
    if (error) throw new Error(error.message);
    return { expired: (data as any[] | null)?.length ?? 0 };
  });
