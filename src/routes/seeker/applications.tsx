import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/MobileLayout";
import { RoleGate } from "@/components/RoleGate";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/seeker/applications")({ component: () => <RoleGate role="seeker"><Page /></RoleGate> });

function Page() {
  const { user } = useAuth();
  const [apps, setApps] = useState<any[]>([]);
  const [filter, setFilter] = useState<"day"|"week"|"month">("month");
  useEffect(() => { if (!user) return; (async () => {
    const { data } = await supabase.from("job_applications")
      .select("*, jobs(title, place_name, daily_wage)").eq("seeker_id", user.id).order("created_at", { ascending: false });
    setApps(data ?? []);
  })(); }, [user]);

  const filtered = useMemo(() => {
    const cutoff = new Date();
    if (filter === "day") cutoff.setDate(cutoff.getDate() - 1);
    if (filter === "week") cutoff.setDate(cutoff.getDate() - 7);
    if (filter === "month") cutoff.setMonth(cutoff.getMonth() - 1);
    return apps.filter(a => new Date(a.created_at) >= cutoff);
  }, [apps, filter]);

  const approved = filtered.filter(a => a.status === "approved");

  return (
    <MobileLayout role="seeker">
      <div className="p-3 space-y-3">
        <h2 className="font-bold">나의 신청 내역</h2>
        <Tabs value={filter} onValueChange={(v: any) => setFilter(v)}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="day">일</TabsTrigger>
            <TabsTrigger value="week">주</TabsTrigger>
            <TabsTrigger value="month">월</TabsTrigger>
          </TabsList>
          <TabsContent value={filter} className="mt-3">
            <div className="text-xs text-muted-foreground mb-2">총 {filtered.length}건 · 승인 {approved.length}건</div>
            <div className="space-y-2">
              {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-12">기록이 없습니다</p>}
              {filtered.map(a => (
                <Card key={a.id} className="p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-sm">{a.jobs?.title}</h4>
                      <p className="text-xs text-muted-foreground">{a.jobs?.place_name} · {Number(a.jobs?.daily_wage ?? 0).toLocaleString()}원</p>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(a.created_at).toLocaleString("ko-KR")}</p>
                    </div>
                    <Badge variant={a.status === "approved" ? "default" : a.status === "rejected" ? "destructive" : "secondary"}>
                      {a.status === "approved" ? "승인" : a.status === "rejected" ? "거절" : "대기"}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
}
