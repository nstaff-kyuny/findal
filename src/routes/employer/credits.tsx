import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/MobileLayout";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { CREDIT_PACKS } from "@/lib/constants";
import { toast } from "sonner";

export const Route = createFileRoute("/employer/credits")({ component: () => <RoleGate role="employer"><Page /></RoleGate> });

function Page() {
  const { user } = useAuth();
  const [emp, setEmp] = useState<any>(null);
  const [tx, setTx] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const load = async () => {
    if (!user) return;
    const { data: e } = await supabase.from("employer_profiles").select("*").eq("user_id", user.id).single();
    setEmp(e);
    const { data: t } = await supabase.from("credit_transactions").select("*").eq("employer_id", user.id).order("created_at", { ascending: false }).limit(30);
    setTx(t ?? []);
    const { data: p } = await supabase.from("credit_purchase_requests").select("*").eq("employer_id", user.id).order("created_at", { ascending: false }).limit(20);
    setPurchases(p ?? []);
  };
  useEffect(() => { load(); }, [user]);

  // 온라인 결제 - 결제 모듈 연동 전까지는 즉시 결제 완료 처리 (관리자가 결제수단 등록 후 활성화)
  const purchase = async (pack: number, amount: number) => {
    if (!user) return;
    const paymentRef = `MOCK-${Date.now()}`;
    // 1) 구매 기록
    const { error: e1 } = await supabase.from("credit_purchase_requests").insert({
      employer_id: user.id, pack, amount_krw: amount,
      status: "fulfilled", payment_ref: paymentRef, payment_method: "online",
    } as any);
    if (e1) return toast.error(e1.message);
    // 2) 크레딧 적립 (직접 update + transaction)
    const { error: e2 } = await supabase.from("employer_profiles")
      .update({ credits: (emp?.credits ?? 0) + pack } as any).eq("user_id", user.id);
    if (e2) return toast.error(e2.message);
    await supabase.from("credit_transactions").insert({
      employer_id: user.id, delta: pack, type: "admin_grant", note: `온라인 구매(${pack} 크레딧)`,
    } as any);
    toast.success(`${pack} 크레딧이 적립되었습니다`);
    load();
  };

  return (
    <MobileLayout role="employer">
      <div className="p-3 space-y-3">
        <Card className="bg-primary text-primary-foreground"><CardContent className="p-5">
          <p className="text-xs opacity-80">보유 크레딧</p>
          <p className="text-4xl font-bold">{emp?.credits ?? 0}</p>
        </CardContent></Card>
        <h3 className="font-bold mt-3">크레딧 구매 (1크레딧 = 1,000원)</h3>
        <div className="space-y-2">
          {CREDIT_PACKS.map(p => (
            <Card key={p.qty}><CardContent className="p-3 flex justify-between items-center">
              <div>
                <p className="font-bold">{p.qty} 크레딧</p>
                <p className="text-xs text-muted-foreground">{p.price.toLocaleString()}원</p>
              </div>
              <Button onClick={() => purchase(p.qty, p.price)}>바로 구매</Button>
            </CardContent></Card>
          ))}
        </div>

        <h3 className="font-bold mt-4">구매 현황</h3>
        <div className="space-y-1">
          {purchases.length === 0 && <p className="text-center text-xs text-muted-foreground py-4">구매 내역이 없습니다</p>}
          {purchases.map(p => (
            <div key={p.id} className="flex justify-between items-center text-sm px-2 py-2 border-b">
              <div>
                <p className="text-xs font-semibold">{p.pack} 크레딧 · {Number(p.amount_krw).toLocaleString()}원</p>
                <p className="text-[10px] text-muted-foreground">{new Date(p.created_at).toLocaleString("ko-KR")}</p>
              </div>
              <Badge variant={p.status === "fulfilled" ? "default" : "secondary"}>{p.status === "fulfilled" ? "결제완료" : "대기"}</Badge>
            </div>
          ))}
        </div>

        <h3 className="font-bold mt-4">크레딧 사용 내역</h3>
        <div className="space-y-1">
          {tx.length === 0 && <p className="text-center text-xs text-muted-foreground py-4">내역이 없습니다</p>}
          {tx.map(t => (
            <div key={t.id} className="flex justify-between text-sm px-2 py-2 border-b">
              <div>
                <p className="text-xs">{t.note}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleString("ko-KR")}</p>
              </div>
              <p className={`font-bold ${t.delta > 0 ? "text-green-600" : "text-red-600"}`}>{t.delta > 0 ? "+" : ""}{t.delta}</p>
            </div>
          ))}
        </div>
      </div>
    </MobileLayout>
  );
}
