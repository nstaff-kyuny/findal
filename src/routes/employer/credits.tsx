import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/MobileLayout";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { CREDIT_PACKS } from "@/lib/constants";
import { createCreditOrder, getTossPublicConfig } from "@/lib/toss.functions";
import { listRefundableOrders, createRefundRequest } from "@/lib/refunds.functions";
import { toast } from "sonner";


export const Route = createFileRoute("/employer/credits")({
  component: () => (
    <RoleGate role="employer">
      <Page />
    </RoleGate>
  ),
});

const FALLBACK_TOSS_CLIENT_KEY = "test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm";

declare global {
  interface Window {
    TossPayments?: any;
  }
}

function loadTossSdk(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("no window"));
    if (window.TossPayments) return resolve(window.TossPayments);
    const existing = document.querySelector<HTMLScriptElement>('script[data-toss="v2"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.TossPayments));
      existing.addEventListener("error", () => reject(new Error("Toss SDK 로드 실패")));
      return;
    }
    const s = document.createElement("script");
    s.src = "https://js.tosspayments.com/v2/standard";
    s.async = true;
    s.dataset.toss = "v2";
    s.onload = () => resolve(window.TossPayments);
    s.onerror = () => reject(new Error("Toss SDK 로드 실패"));
    document.head.appendChild(s);
  });
}

const PAY_METHODS = [
  { key: "CARD", label: "카드" },
  { key: "TRANSFER", label: "계좌이체" },
  { key: "VIRTUAL_ACCOUNT", label: "가상계좌" },
] as const;

function Page() {
  const { user } = useAuth();
  const [emp, setEmp] = useState<any>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [payMethod, setPayMethod] = useState<"CARD" | "TRANSFER" | "VIRTUAL_ACCOUNT">("CARD");
  const createOrder = useServerFn(createCreditOrder);
  const widgetsRef = useRef<any>(null);


  const load = async () => {
    if (!user) return;
    const { data: e } = await supabase.from("employer_profiles").select("*").eq("user_id", user.id).single();
    setEmp(e);
  };
  useEffect(() => {
    load();
  }, [user]);

  // Preload SDK
  useEffect(() => {
    loadTossSdk().catch(() => {});
  }, []);

  const fetchPublicCfg = useServerFn(getTossPublicConfig);

  const purchase = async (qty: number) => {
    if (!user) return;
    setBusy(qty);
    try {
      const TossPayments = await loadTossSdk();
      const cfg = await fetchPublicCfg({}).catch(() => null);
      if (cfg && !cfg.enabled) {
        toast.error("현재 결제가 비활성화되어 있습니다.");
        setBusy(null);
        return;
      }
      const clientKey = cfg?.clientKey || FALLBACK_TOSS_CLIENT_KEY;
      const order = await createOrder({ data: { pack: qty } });

      const tossPayments = TossPayments(clientKey);
      const successUrl = window.location.origin + "/employer/credits/success";
      const failUrl = window.location.origin + "/employer/credits/fail";

      // API 개별 연동 키(ck_)는 결제창 API, 결제위젯 연동 키(gck_)는 위젯 API 사용
      if (!clientKey.includes("_gck_")) {
        const payment = tossPayments.payment({ customerKey: user.id });
        await payment.requestPayment({
          method: payMethod,
          amount: { currency: "KRW", value: order.amount },
          orderId: order.orderId,
          orderName: order.orderName,
          successUrl,
          failUrl,
          ...(payMethod === "CARD"
            ? { card: { useEscrow: false, flowMode: "DEFAULT", useCardPoint: false, useAppCardOnly: false } }
            : {}),
          ...(payMethod === "VIRTUAL_ACCOUNT"
            ? { virtualAccount: { cashReceipt: { type: "소득공제" }, useEscrow: false, validHours: 24 } }
            : {}),
        });
        return;
      }


      const widgets = tossPayments.widgets({ customerKey: user.id });
      widgetsRef.current = widgets;

      await widgets.setAmount({ value: order.amount, currency: "KRW" });

      const paymentWindow = await widgets.renderPaymentWindow({
        variantKey: { paymentMethod: "DEFAULT", agreement: "AGREEMENT" },
      });

      paymentWindow.on("paymentRequest", async () => {
        try {
          await widgets.requestPayment({
            orderId: order.orderId,
            orderName: order.orderName,
            successUrl,
            failUrl,
          });
        } catch (err: any) {
          toast.error(err?.message || "결제 요청 실패");
        }
      });

    } catch (e: any) {
      toast.error(e?.message || "결제창을 열 수 없습니다");
    } finally {
      setBusy(null);
    }
  };

  return (
    <MobileLayout role="employer">
      <div className="p-3 space-y-3">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-5">
            <p className="text-xs opacity-80">보유 크레딧</p>
            <p className="text-4xl font-bold">{emp?.credits ?? 0}</p>
          </CardContent>
        </Card>
        <h3 className="font-bold mt-3">크레딧 구매 (1크레딧 = 1,000원)</h3>
        <p className="text-xs text-muted-foreground">
          결제는 토스페이먼츠를 통해 안전하게 진행됩니다. 크레딧의 유효기간은 구매일로부터 1년입니다.
        </p>
        <p className="text-[11px] text-muted-foreground">
          ※ 임의 금액 입력은 지원되지 않으며, 아래의 <b>고정 상품</b> 중에서만 결제할 수 있습니다.
        </p>
        <div className="flex gap-1.5">
          {PAY_METHODS.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setPayMethod(m.key)}
              className={`flex-1 h-9 rounded-md border text-sm ${
                payMethod === m.key ? "bg-primary text-primary-foreground border-primary" : "bg-background"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="space-y-2">

          {CREDIT_PACKS.map((p) => (
            <Card key={p.qty}>
              <CardContent className="p-3 flex justify-between items-center">
                <div>
                  <p className="font-bold">{p.qty} 크레딧</p>
                  <p className="text-xs text-muted-foreground">{p.price.toLocaleString()}원</p>
                </div>
                <Button onClick={() => purchase(p.qty)} disabled={busy !== null}>
                  {busy === p.qty ? "결제창 여는 중…" : "결제하기"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-muted/40">
          <CardContent className="p-3 text-[12px] space-y-1.5 leading-relaxed">
            <p className="font-semibold text-foreground">크레딧 사용 안내</p>
            <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
              <li>구직자 신청을 <b>승인</b>할 때 건당 <b>1 크레딧</b>이 차감됩니다.</li>
              <li>공고를 <b>프리미엄 노출(광고)</b>로 등록 시 기간에 따라 10~25 크레딧이 차감됩니다.</li>
              <li>차감된 내역은 <b>구매 및 사용 내역</b> 페이지에서 실시간 확인할 수 있습니다.</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="p-3 text-[12px] leading-relaxed space-y-1">
            <p className="font-semibold text-amber-900">환불 정책 및 유의사항</p>
            <ul className="list-disc pl-4 space-y-0.5 text-amber-900/90">
              <li>결제 후 <b>7일 이내 & 미사용</b> 시 전액 환불이 가능합니다.</li>
              <li>일부 사용 시 잔여 크레딧에 한해 부분 환불(수수료 차감)됩니다.</li>
              <li>충전된 크레딧은 서비스 내 결제 수단이며, <b>현금·상품권 등으로 환급/전환되지 않습니다.</b></li>
              <li>이벤트로 무상 지급된 크레딧은 환불 대상에서 제외됩니다.</li>
            </ul>
            <Link to="/terms" className="inline-block text-primary underline text-[12px] mt-1">환불정책 전문 보기 →</Link>
          </CardContent>
        </Card>

        <RefundSection onDone={load} />

        <Link to="/employer/credits/history" className="block pt-4">
          <Button variant="outline" className="w-full h-12 text-base">
            구매 · 사용 · 환불 내역 →
          </Button>
        </Link>


      </div>
    </MobileLayout>
  );
}
