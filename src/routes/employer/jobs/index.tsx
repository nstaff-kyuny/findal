import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/MobileLayout";
import { RoleGate } from "@/components/RoleGate";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Megaphone, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { INDUSTRY_LABEL, ROLE_LABEL, PROMOTION_OPTIONS } from "@/lib/constants";
import { isJobCompleted } from "@/lib/job-visuals";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/employer/jobs/")({ component: () => <RoleGate role="employer"><Page /></RoleGate> });

function Page() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [jobs, setJobs] = useState<any[]>([]);
  const [promoOpenId, setPromoOpenId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("jobs").select("*").eq("employer_id", user.id).order("created_at", { ascending: false });
    setJobs(data ?? []);
  };
  useEffect(() => { load(); }, [user]);

  const toggle = async (j: any) => {
    const { error } = await supabase.from("jobs").update({ is_active: !j.is_active }).eq("id", j.id);
    if (error) return toast.error(error.message);
    load();
  };
  const remove = async (id: string) => {
    if (!confirm("삭제할까요?")) return;
    await supabase.from("jobs").delete().eq("id", id);
    load();
  };
  const promote = async (jobId: string, dur: string) => {
    const { error } = await supabase.rpc("promote_job", { _job_id: jobId, _duration: dur } as any);
    if (error) {
      if (error.message?.includes("SLOTS_FULL")) {
        toast.error("지금은 가능한 광고 여분의 자리가 없습니다. 잠시 후 다시 신청해주세요.", { duration: 6000 });
        setPromoOpenId(null);
        return;
      }
      if (error.message?.includes("크레딧")) {
        toast.error("크레딧이 부족합니다. 크레딧 구매 페이지로 이동합니다.");
        setTimeout(() => nav({ to: "/employer/credits" }), 600);
        return;
      }
      return toast.error(error.message);
    }
    setPromoOpenId(null);
    toast.success("추천 배너 광고가 적용되었습니다!");
    setTimeout(() => nav({ to: "/employer/home" }), 600);
  };

  return (
    <MobileLayout role="employer">
      <div className="p-3 space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-base">내 공고 ({jobs.length})</h2>
          <Link to="/employer/jobs/new"><Button size="default" className="h-11 px-5 text-base"><Plus size={18} className="mr-1" />등록</Button></Link>
        </div>
        <Link to="/seeker/featured" search={{ preview: "1" } as any}>
          <Button variant="secondary" className="w-full"><Megaphone size={14} className="mr-1" />추천 페이지 노출 미리보기</Button>
        </Link>
        {jobs.length === 0 && <p className="text-center text-sm text-muted-foreground py-12">공고가 없습니다</p>}
        {jobs.map(j => {
          const editCount = j.edit_count ?? 0;
          const canEdit = editCount < 2;
          return (
          <Card key={j.id} className="p-4 space-y-3">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <div className="flex gap-1 flex-wrap mb-1.5">
                  <Badge variant="secondary" className="text-xs">{INDUSTRY_LABEL[j.industry]}</Badge>
                  <Badge variant="outline" className="text-xs">{ROLE_LABEL[j.job_role]}</Badge>
                  {!j.is_active && <Badge variant="destructive" className="text-xs">비활성</Badge>}
                  <Badge variant="outline" className="text-xs">수정 {editCount}/2</Badge>
                </div>
                <h4 className="font-semibold text-base truncate">{j.title}</h4>
                <p className="text-sm text-muted-foreground">{j.place_name} · {Number(j.daily_wage).toLocaleString()}원</p>
                <p className="text-xs text-muted-foreground mt-0.5">※ 공고 수정은 최대 2회까지 가능합니다</p>
              </div>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <Link to="/employer/jobs/edit/$id" params={{ id: j.id }} className={!canEdit ? "pointer-events-none opacity-50" : ""}>
                <Button size="sm" variant="secondary" disabled={!canEdit}>수정</Button>
              </Link>
              <Button size="sm" variant="outline" className="flex-1" onClick={() => toggle(j)}>{j.is_active ? "비활성" : "활성"}</Button>
              <Dialog open={promoOpenId === j.id} onOpenChange={(o) => setPromoOpenId(o ? j.id : null)}>
                <DialogTrigger asChild><Button size="sm" variant="outline" className="flex-1"><Megaphone size={14} className="mr-1" />광고</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>추천 배너 광고</DialogTitle></DialogHeader>
                  <p className="text-sm text-muted-foreground">크레딧이 차감됩니다.</p>
                  {PROMOTION_OPTIONS.map(p => (
                    <Button key={p.value} variant="outline" className="w-full" onClick={() => promote(j.id, p.value)}>{p.label}</Button>
                  ))}
                </DialogContent>
              </Dialog>
              <Button size="sm" variant="destructive" onClick={() => remove(j.id)}>삭제</Button>
            </div>
          </Card>
          );
        })}
      </div>
    </MobileLayout>
  );
}

