import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/MobileLayout";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { CREDIT_PACKS } from "@/lib/constants";
import { toast } from "sonner";

export const Route = createFileRoute("/employer/credits")({ component: () => <RoleGate role="employer"><Page /></RoleGate> });

function Page() {
  const { user } = useAuth();
  const [emp, setEmp] = useState<any>(null);
  const [tx, setTx] = useState<any[]>([]);
  const load = async () => {
    if (!user) return;
    const { data: e } = await supabase.from("employer_profiles").select("*").eq("user_id", user.id).single();
    setEmp(e);
    const { data: t } = await supabase.from("credit_transactions").select("*").eq("employer_id", user.id).order("created_at", { ascending: false }).limit(30);
    setTx(t ?? []);
  };
  useEffect(() => { load(); }, [user]);

  const request = async (pack: number, amount: number) => {
    if (!user) return;
    const { error } = await supabase.from("credit_purchase_requests").insert({
      employer_id: user.id, pack, amount_krw: amount,
    } as any);
    if (error) return toast.error(error.message);
    toast.success("구매 요청 접수됨. 관리자가 확인 후 크레딧을 적립해드립니다.");
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
              <Button onClick={() => request(p.qty, p.price)}>구매 요청</Button>
            </CardContent></Card>
          ))}
        </div>
        <h3 className="font-bold mt-4">크레딧 내역</h3>
        <div className="space-y-1">
          {tx.length === 0 && <p className="text-center text-xs text-muted-foreground py-6">내역이 없습니다</p>}
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
