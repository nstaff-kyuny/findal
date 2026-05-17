import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/MobileLayout";
import { RoleGate } from "@/components/RoleGate";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Megaphone } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { INDUSTRY_LABEL, ROLE_LABEL, PROMOTION_OPTIONS } from "@/lib/constants";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/employer/jobs/")({ component: () => <RoleGate role="employer"><Page /></RoleGate> });

function Page() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
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
    if (error) return toast.error(error.message);
    toast.success("광고 등록 완료!");
  };

  return (
    <MobileLayout role="employer">
      <div className="p-3 space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="font-bold">내 공고 ({jobs.length}/20)</h2>
          <Link to="/employer/jobs/new"><Button size="sm"><Plus size={14} className="mr-1" />등록</Button></Link>
        </div>
        {jobs.length === 0 && <p className="text-center text-sm text-muted-foreground py-12">공고가 없습니다</p>}
        {jobs.map(j => (
          <Card key={j.id} className="p-3 space-y-2">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <div className="flex gap-1 flex-wrap mb-1">
                  <Badge variant="secondary" className="text-[10px]">{INDUSTRY_LABEL[j.industry]}</Badge>
                  <Badge variant="outline" className="text-[10px]">{ROLE_LABEL[j.job_role]}</Badge>
                  {!j.is_active && <Badge variant="destructive" className="text-[10px]">비활성</Badge>}
                </div>
                <h4 className="font-semibold text-sm truncate">{j.title}</h4>
                <p className="text-xs text-muted-foreground">{j.place_name} · {Number(j.daily_wage).toLocaleString()}원</p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => toggle(j)}>{j.is_active ? "비활성" : "활성"}</Button>
              <Dialog>
                <DialogTrigger asChild><Button size="sm" variant="outline" className="flex-1"><Megaphone size={12} className="mr-1" />광고</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>추천 배너 광고</DialogTitle></DialogHeader>
                  <p className="text-xs text-muted-foreground">크레딧이 차감됩니다.</p>
                  {PROMOTION_OPTIONS.map(p => (
                    <Button key={p.value} variant="outline" className="w-full" onClick={() => promote(j.id, p.value)}>{p.label}</Button>
                  ))}
                </DialogContent>
              </Dialog>
              <Button size="sm" variant="destructive" onClick={() => remove(j.id)}>삭제</Button>
            </div>
          </Card>
        ))}
      </div>
    </MobileLayout>
  );
}
