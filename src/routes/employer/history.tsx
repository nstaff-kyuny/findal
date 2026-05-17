import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/MobileLayout";
import { RoleGate } from "@/components/RoleGate";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/employer/history")({ component: () => <RoleGate role="employer"><Page /></RoleGate> });

function Page() {
  const { user } = useAuth();
  const [apps, setApps] = useState<any[]>([]);
  const [filter, setFilter] = useState<"day"|"week"|"month">("month");
  useEffect(() => { if (!user) return; (async () => {
    const { data } = await supabase.from("job_applications")
      .select("*, jobs(title), profiles:seeker_id(full_name)")
      .eq("employer_id", user.id).eq("status", "approved").order("approved_at", { ascending: false });
    setApps(data ?? []);
  })(); }, [user]);
  const filtered = useMemo(() => {
    const cutoff = new Date();
    if (filter === "day") cutoff.setDate(cutoff.getDate() - 1);
    if (filter === "week") cutoff.setDate(cutoff.getDate() - 7);
    if (filter === "month") cutoff.setMonth(cutoff.getMonth() - 1);
    return apps.filter(a => a.approved_at && new Date(a.approved_at) >= cutoff);
  }, [apps, filter]);
  return (
    <MobileLayout role="employer">
      <div className="p-3 space-y-3">
        <h2 className="font-bold">승인 기록</h2>
        <Tabs value={filter} onValueChange={(v: any) => setFilter(v)}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="day">일</TabsTrigger>
            <TabsTrigger value="week">주</TabsTrigger>
            <TabsTrigger value="month">월</TabsTrigger>
          </TabsList>
          <TabsContent value={filter} className="mt-3">
            <p className="text-xs text-muted-foreground mb-2">총 {filtered.length}건</p>
            {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-12">기록이 없습니다</p>}
            {filtered.map(a => (
              <Card key={a.id} className="p-3 mb-2">
                <p className="font-semibold text-sm">{a.profiles?.full_name}</p>
                <p className="text-xs text-muted-foreground">{a.jobs?.title}</p>
                <p className="text-xs text-muted-foreground">{new Date(a.approved_at).toLocaleString("ko-KR")}</p>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
}
