import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/MobileLayout";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/employer/credits_/history")({
  component: () => <RoleGate role="employer"><Page /></RoleGate>,
});

type Filter = "all" | "purchase" | "usage";

function todayStr() { return new Date().toISOString().slice(0, 10); }
function daysAgoStr(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function Page() {
  const { user } = useAuth();
  const [tx, setTx] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [from, setFrom] = useState(daysAgoStr(30));
  const [to, setTo] = useState(todayStr());

  useEffect(() => { if (!user) return; (async () => {
    const { data: t } = await supabase.from("credit_transactions")
      .select("*").eq("employer_id", user.id).order("created_at", { ascending: false }).limit(500);
    setTx(t ?? []);
    const { data: p } = await supabase.from("credit_purchase_requests")
      .select("*").eq("employer_id", user.id).order("created_at", { ascending: false }).limit(500);
    setPurchases(p ?? []);
  })(); }, [user]);

  const items = useMemo(() => {
    const fromTs = from ? new Date(from + "T00:00:00").getTime() : 0;
    const toTs = to ? new Date(to + "T23:59:59").getTime() : Date.now();
    const purchaseItems = purchases.map(p => ({
      id: `p-${p.id}`, kind: "purchase" as const, created_at: p.created_at,
      title: `${p.pack} 크레딧 · ${Number(p.amount_krw).toLocaleString()}원`,
      sub: p.status === "fulfilled" ? "결제완료" : "결제대기",
      delta: null as number | null, status: p.status,
    }));
    const txItems = tx.map(t => ({
      id: `t-${t.id}`, kind: "usage" as const, created_at: t.created_at,
      title: t.note ?? t.type, sub: "", delta: t.delta as number, status: null,
    }));
    let merged = [...purchaseItems, ...txItems];
    if (filter === "purchase") merged = purchaseItems;
    if (filter === "usage") merged = txItems;
    merged = merged.filter(i => {
      const ts = new Date(i.created_at).getTime();
      return ts >= fromTs && ts <= toTs;
    });
    return merged.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  }, [tx, purchases, filter, from, to]);

  return (
    <MobileLayout role="employer">
      <div className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base">크레딧 내역</h2>
          <Link to="/employer/credits"><Button size="sm" variant="ghost">← 크레딧</Button></Link>
        </div>

        <div className="flex gap-1.5">
          {(["all", "purchase", "usage"] as const).map(f => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"}
              className="flex-1" onClick={() => setFilter(f)}>
              {f === "all" ? "전체" : f === "purchase" ? "구매 내역" : "사용 내역"}
            </Button>
          ))}
        </div>

        <Card><CardContent className="p-3 space-y-2">
          <Label className="text-xs">기간 선택</Label>
          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
            <span className="text-muted-foreground">~</span>
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <div className="flex gap-1 flex-wrap">
            {[
              { label: "7일", n: 7 }, { label: "30일", n: 30 }, { label: "90일", n: 90 },
            ].map(p => (
              <Button key={p.n} size="sm" variant="outline"
                onClick={() => { setFrom(daysAgoStr(p.n)); setTo(todayStr()); }}>{p.label}</Button>
            ))}
          </div>
        </CardContent></Card>

        <div className="space-y-1">
          {items.length === 0 && <p className="text-center text-xs text-muted-foreground py-8">내역이 없습니다</p>}
          {items.map(i => (
            <div key={i.id} className="flex justify-between items-center text-sm px-2 py-2 border-b">
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">{i.title}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(i.created_at).toLocaleString("ko-KR")}</p>
              </div>
              {i.kind === "purchase" ? (
                <Badge variant={i.status === "fulfilled" ? "default" : "secondary"}>{i.sub}</Badge>
              ) : (
                <p className={`font-bold ${(i.delta ?? 0) > 0 ? "text-green-600" : "text-red-600"}`}>
                  {(i.delta ?? 0) > 0 ? "+" : ""}{i.delta}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </MobileLayout>
  );
}
