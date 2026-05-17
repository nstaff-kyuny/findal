import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/MobileLayout";
import { RoleGate } from "@/components/RoleGate";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const STATUS_LABEL: Record<string,string> = { pending:"대기", approved:"승인", rejected:"거절", confirmed:"확정(갈께요)", no_show:"노쇼" };
const STATUS_VARIANT: Record<string, any> = { approved:"default", confirmed:"default", rejected:"destructive", no_show:"destructive", pending:"secondary" };

export const Route = createFileRoute("/seeker/applications")({ component: () => <RoleGate role="seeker"><Page /></RoleGate> });

function Page() {
  const { user } = useAuth();
  const [apps, setApps] = useState<any[]>([]);
  const [filter, setFilter] = useState<"day"|"week"|"month">("month");
  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("job_applications")
      .select("*, jobs(title, place_name, daily_wage, contact_phone)").eq("seeker_id", user.id).order("created_at", { ascending: false });
    setApps(data ?? []);
  };
  useEffect(() => { load(); }, [user]);
  const confirm = async (id: string) => {
    const { error } = await supabase.rpc("seeker_confirm_application", { _app_id: id } as any);
    if (error) return toast.error(error.message);
    toast.success("확정 완료! 구인자에게 알림이 전달됩니다.");
    load();
  };

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
                <Card key={a.id} className="p-3 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm">{a.jobs?.title}</h4>
                      <p className="text-xs text-muted-foreground">{a.jobs?.place_name} · {Number(a.jobs?.daily_wage ?? 0).toLocaleString()}원</p>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(a.created_at).toLocaleString("ko-KR")}</p>
                    </div>
                    <Badge variant={STATUS_VARIANT[a.status] ?? "secondary"}>{STATUS_LABEL[a.status] ?? a.status}</Badge>
                  </div>
                  {a.status === "approved" && (
                    <Button size="sm" className="w-full" onClick={() => confirm(a.id)}>✋ 갈께요 (최종확정)</Button>
                  )}
                  {a.status === "confirmed" && a.jobs?.contact_phone && (
                    <a href={`tel:${a.jobs.contact_phone}`} className="block text-xs text-primary text-center font-semibold">📞 {a.jobs.contact_phone}</a>
                  )}
                  {a.status === "no_show" && (
                    <p className="text-xs text-destructive text-center">⚠️ 노쇼 처리됨</p>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
}
