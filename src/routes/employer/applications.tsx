import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/MobileLayout";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { analyzeApplications } from "@/lib/ai.functions";

export const Route = createFileRoute("/employer/applications")({ component: () => <RoleGate role="employer"><Page /></RoleGate> });

function Page() {
  const { user } = useAuth();
  const [apps, setApps] = useState<any[]>([]);
  const [aiNotes, setAiNotes] = useState<Record<string, { summary: string; noShowRisk: "낮음" | "보통" | "높음"; question: string }>>({});
  const [aiBusy, setAiBusy] = useState(false);
  const analyze = useServerFn(analyzeApplications);
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

  const runAiAnalyze = async () => {
    setAiBusy(true);
    try {
      const pending = apps.filter((a) => a.status === "pending").slice(0, 20).map((a) => ({
        id: a.id, jobTitle: a.jobs?.title, applicantName: a.profiles?.full_name,
        nationality: a.seeker_profiles?.nationality, experience: a.seeker_profiles?.experience,
        koreanOk: !!a.seeker_profiles?.korean_ok, message: a.message, status: a.status,
      }));
      setAiNotes(await analyze({ data: { applications: pending } }));
      toast.success("AI 지원자 요약이 생성되었습니다");
    } catch (e: any) { toast.error(e?.message ?? "AI 분석 실패"); }
    finally { setAiBusy(false); }
  };

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

  const groups = useMemo(() => ({
    pending: apps.filter(a => a.status === "pending"),
    approved: apps.filter(a => a.status === "approved" || a.status === "confirmed"),
    no_show: apps.filter(a => a.status === "no_show"),
  }), [apps]);

  const renderCard = (a: any) => (
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
          {aiNotes[a.id] && (() => {
            const r = aiNotes[a.id].noShowRisk;
            const riskCls = r === "높음" ? "bg-red-50 border-red-200 text-red-700" : r === "보통" ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-emerald-50 border-emerald-200 text-emerald-700";
            return <div className={`mt-2 rounded border p-2 text-xs ${riskCls}`}>
              <p className="font-semibold">🤖 AI 요약 · 노쇼 위험 {r}</p>
              <p className="mt-0.5 text-foreground">{aiNotes[a.id].summary}</p>
              <p className="mt-0.5 text-muted-foreground">확인 질문: {aiNotes[a.id].question}</p>
            </div>;
          })()}
        </div>
        <Badge variant={STATUS_VARIANT[a.status] ?? "secondary"} className={`text-sm px-3 py-1 font-semibold ${STATUS_CLASS[a.status] ?? ""}`}>{STATUS_LABEL[a.status] ?? a.status}</Badge>
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
              <Button size="sm" className="w-full">연락하기</Button>
            </a>
          )}
          <Button size="sm" variant="outline" className="flex-1" onClick={() => noShow(a.id)}>노쇼(미출근) 표시</Button>
        </div>
      )}
    </CardContent></Card>
  );

  return (
    <MobileLayout role="employer">
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold">받은 요청</h2>
          <Button size="sm" variant="default" onClick={runAiAnalyze} disabled={aiBusy || apps.filter(a => a.status === "pending").length === 0}>
            {aiBusy ? "분석 중..." : "🤖 AI 지원자 요약·노쇼 위험"}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground -mt-1">대기 중 지원자를 AI가 한 줄 요약하고 노쇼 위험을 표시합니다 (최대 20명).</p>
        <Tabs defaultValue="pending">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="pending">대기 ({groups.pending.length})</TabsTrigger>
            <TabsTrigger value="approved">승인 ({groups.approved.length})</TabsTrigger>
            <TabsTrigger value="no_show">노쇼 ({groups.no_show.length})</TabsTrigger>
          </TabsList>
          {(["pending", "approved", "no_show"] as const).map(key => (
            <TabsContent key={key} value={key} className="space-y-2 mt-2">
              {groups[key].length === 0
                ? <p className="text-center text-sm text-muted-foreground py-12">내역이 없습니다</p>
                : groups[key].map(renderCard)}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </MobileLayout>
  );
}
