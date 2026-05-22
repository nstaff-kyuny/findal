import { createFileRoute, Link } from "@tanstack/react-router";
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
  const load = async () => {
    if (!user) return;
    const { data: e } = await supabase.from("employer_profiles").select("*").eq("user_id", user.id).single();
    setEmp(e);
  };
  useEffect(() => { load(); }, [user]);

  const purchase = async (pack: number, amount: number) => {
    if (!user) return;
    const paymentRef = `MOCK-${Date.now()}`;
    const { error: e1 } = await supabase.from("credit_purchase_requests").insert({
      employer_id: user.id, pack, amount_krw: amount,
      status: "fulfilled", payment_ref: paymentRef, payment_method: "online",
    } as any);
    if (e1) return toast.error(e1.message);
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
        <Link to="/employer/credits/history" className="block pt-4">
          <Button variant="outline" className="w-full h-12 text-base">구매 및 사용 내역 →</Button>
        </Link>
      </div>
    </MobileLayout>
  );
}
