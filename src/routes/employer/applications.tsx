import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/MobileLayout";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/employer/applications")({ component: () => <RoleGate role="employer"><Page /></RoleGate> });

function Page() {
  const { user } = useAuth();
  const [apps, setApps] = useState<any[]>([]);
  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("job_applications")
      .select("*, jobs(title, place_name), profiles:seeker_id(full_name, phone), seeker_profiles:seeker_id(nationality, experience, korean_ok, visa)")
      .eq("employer_id", user.id).order("created_at", { ascending: false });
    setApps(data ?? []);
  };
  useEffect(() => { load(); }, [user]);

  const approve = async (id: string) => {
    const { error } = await supabase.rpc("approve_application", { _app_id: id } as any);
    if (error) return toast.error(error.message);
    toast.success("승인 완료! 1 크레딧 차감됨.");
    load();
  };
  const reject = async (id: string) => {
    const { error } = await supabase.from("job_applications").update({ status: "rejected" }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };
  const noShow = async (id: string) => {
    if (!confirm("이 구직자를 노쇼(미출근)로 표시할까요?")) return;
    const { error } = await supabase.rpc("mark_no_show", { _app_id: id } as any);
    if (error) return toast.error(error.message);
    toast.success("노쇼 처리됨"); load();
  };
  const STATUS_LABEL: Record<string,string> = { pending:"대기", approved:"승인", rejected:"거절", confirmed:"확정(갈께요)", no_show:"노쇼" };
  const STATUS_VARIANT: Record<string, any> = { approved:"default", confirmed:"default", rejected:"destructive", no_show:"destructive", pending:"secondary" };

  return (
    <MobileLayout role="employer">
      <div className="p-3 space-y-2">
        <h2 className="font-bold">받은 요청</h2>
        {apps.length === 0 && <p className="text-center text-sm text-muted-foreground py-12">요청이 없습니다</p>}
        {apps.map(a => (
          <Card key={a.id}><CardContent className="p-3 space-y-2">
            <div className="flex justify-between items-start">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{a.jobs?.title} · {a.jobs?.place_name}</p>
                <p className="font-semibold mt-1">{a.profiles?.full_name ?? "(이름미입력)"}</p>
                <div className="flex gap-1 flex-wrap mt-1">
                  {a.seeker_profiles?.nationality && <Badge variant="secondary" className="text-[10px]">{a.seeker_profiles.nationality === "foreigner" ? "외국인" : "내국인"}</Badge>}
                  {a.seeker_profiles?.experience && <Badge variant="outline" className="text-[10px]">{a.seeker_profiles.experience === "lt5" ? "경력 5회 미만" : "경력 5회 이상"}</Badge>}
                  {a.seeker_profiles?.korean_ok && <Badge variant="outline" className="text-[10px]">한국어 가능</Badge>}
                </div>
                {a.status === "approved" && <p className="text-xs mt-2">📞 <a href={`tel:${a.profiles?.phone}`} className="text-primary font-bold">{a.profiles?.phone}</a></p>}
                {a.message && <p className="text-xs italic mt-1 text-muted-foreground">"{a.message}"</p>}
              </div>
              <Badge variant={STATUS_VARIANT[a.status] ?? "secondary"}>{STATUS_LABEL[a.status] ?? a.status}</Badge>
            </div>
            {a.status === "pending" && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => reject(a.id)}>거절</Button>
                <Button size="sm" className="flex-1" onClick={() => approve(a.id)}>승인 (1크레딧)</Button>
              </div>
            )}
            {(a.status === "approved" || a.status === "confirmed") && (
              <Button size="sm" variant="outline" className="w-full" onClick={() => noShow(a.id)}>노쇼(미출근) 표시</Button>
            )}
          </CardContent></Card>
        ))}
      </div>
    </MobileLayout>
  );
}
