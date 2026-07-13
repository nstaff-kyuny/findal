import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/MobileLayout";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { CREDIT_PACKS } from "@/lib/constants";
import { createCreditOrder, getTossPublicConfig } from "@/lib/toss.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/employer/credits")({
  component: () => (
    <RoleGate role="employer">
      <Page />
    </RoleGate>
  ),
});

const TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY || "test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm";

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

function Page() {
  const { user } = useAuth();
  const [emp, setEmp] = useState<any>(null);
  const [busy, setBusy] = useState<number | null>(null);
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

  const purchase = async (qty: number) => {
    if (!user) return;
    setBusy(qty);
    try {
      const TossPayments = await loadTossSdk();
      const order = await createOrder({ data: { pack: qty } });

      const tossPayments = TossPayments(TOSS_CLIENT_KEY);
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
            successUrl: window.location.origin + "/employer/credits/success",
            failUrl: window.location.origin + "/employer/credits/fail",
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
          결제는 토스페이먼츠를 통해 안전하게 진행됩니다. 크레딧의 유효기간 구매일로 부터 1년입니다.
        </p>
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
        <Link to="/employer/credits/history" className="block pt-4">
          <Button variant="outline" className="w-full h-12 text-base">
            구매 및 사용 내역 →
          </Button>
        </Link>
      </div>
    </MobileLayout>
  );
}
