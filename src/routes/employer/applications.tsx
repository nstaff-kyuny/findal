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
    const { data: appsData, error } = await supabase.from("job_applications")
      .select("*")
      .eq("employer_id", user.id).order("created_at", { ascending: false });
    if (error) { toast.error(error.message); return; }
    const list = appsData ?? [];
    const seekerIds = Array.from(new Set(list.map((a: any) => a.seeker_id)));
    const jobIds = Array.from(new Set(list.map((a: any) => a.job_id)));
    const [jobsRes, profilesRes, seekerProfilesRes] = await Promise.all([
      jobIds.length ? supabase.from("jobs").select("id, title, place_name").in("id", jobIds) : Promise.resolve({ data: [] as any[] }),
      seekerIds.length ? supabase.from("profiles").select("id, full_name, phone").in("id", seekerIds) : Promise.resolve({ data: [] as any[] }),
      seekerIds.length ? supabase.from("seeker_profiles").select("user_id, nationality, experience, korean_ok, visa").in("user_id", seekerIds) : Promise.resolve({ data: [] as any[] }),
    ]);
    const jobsMap = new Map((jobsRes.data ?? []).map((j: any) => [j.id, j]));
    const profilesMap = new Map((profilesRes.data ?? []).map((p: any) => [p.id, p]));
    const spMap = new Map((seekerProfilesRes.data ?? []).map((s: any) => [s.user_id, s]));
    setApps(list.map((a: any) => ({
      ...a,
      jobs: jobsMap.get(a.job_id),
      profiles: profilesMap.get(a.seeker_id),
      seeker_profiles: spMap.get(a.seeker_id),
    })));
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
    if (!confirm("정말 노쇼(미출근)로 처리하시겠습니까?\n노쇼 처리는 구직자에게 불이익이 가는 작업입니다.")) return;
    if (!confirm("한 번 더 확인합니다. 노쇼 처리할까요?")) return;
    const { error } = await supabase.rpc("mark_no_show", { _app_id: id } as any);
    if (error) return toast.error(error.message);
    toast.success("노쇼 처리됨"); load();
  };
  const STATUS_LABEL: Record<string,string> = { pending:"대기", approved:"승인", rejected:"거절", confirmed:"✅ 확정(온데요)", no_show:"노쇼" };
  const STATUS_VARIANT: Record<string, any> = { approved:"default", rejected:"destructive", no_show:"destructive", pending:"secondary" };
  const STATUS_CLASS: Record<string,string> = { confirmed: "bg-green-600 hover:bg-green-600 text-white border-transparent" };

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
                {a.message && <p className="text-xs italic mt-1 text-muted-foreground">"{a.message}"</p>}
              </div>
              <Badge variant={STATUS_VARIANT[a.status] ?? "secondary"} className={STATUS_CLASS[a.status]}>{STATUS_LABEL[a.status] ?? a.status}</Badge>
            </div>
            {a.status === "pending" && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => reject(a.id)}>거절</Button>
                <Button size="sm" className="flex-1" onClick={() => approve(a.id)}>승인 (1크레딧)</Button>
              </div>
            )}
            {(a.status === "approved" || a.status === "confirmed") && (
              <div className="flex gap-2">
                {a.profiles?.phone && (
                  <a href={`tel:${a.profiles.phone}`} className="flex-1">
                    <Button size="sm" className="w-full">📞 연락하기</Button>
                  </a>
                )}
                <Button size="sm" variant="outline" className="flex-1" onClick={() => noShow(a.id)}>노쇼(미출근) 표시</Button>
              </div>
            )}
          </CardContent></Card>
        ))}
      </div>
    </MobileLayout>
  );
}
