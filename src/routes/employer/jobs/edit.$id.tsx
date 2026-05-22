import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/MobileLayout";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { INDUSTRY_LABEL, ROLE_LABEL, ROLES_BY_INDUSTRY, REGIONS } from "@/lib/constants";
import { moderateText } from "@/lib/ai.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/employer/jobs/edit/$id")({
  component: () => <RoleGate role="employer"><Page /></RoleGate>,
});

const MAX_EDITS = 2;

function Page() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const moderate = useServerFn(moderateText);
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { (async () => {
    const { data } = await supabase.from("jobs").select("*").eq("id", id).single();
    setJob(data);
    setLoading(false);
  })(); }, [id]);

  if (loading) return <MobileLayout role="employer"><div className="p-6 text-sm text-muted-foreground">불러오는 중…</div></MobileLayout>;
  if (!job) return <MobileLayout role="employer"><div className="p-6 text-sm">공고를 찾을 수 없습니다</div></MobileLayout>;

  const editCount = job.edit_count ?? 0;
  const reached = editCount >= MAX_EDITS;

  const save = async () => {
    if (reached) return toast.error(`수정은 최대 ${MAX_EDITS}회까지만 가능합니다`);
    setSaving(true);
    try {
      const combined = `${job.title ?? ""}\n${job.preparations ?? ""}\n${job.place_name ?? ""}`.trim();
      if (combined) {
        const mod = await moderate({ data: { text: combined, context: "job" } });
        if (!mod.allow) {
          toast.error(`부적절한 표현이 감지되어 수정할 수 없습니다: ${mod.reason}`);
          return;
        }
        if (mod.risk === "보통") toast.warning(`주의 표현이 감지되었습니다: ${mod.reason}`);
      }
      const { error } = await supabase.from("jobs").update({
        title: job.title, place_name: job.place_name, location: job.location, region: job.region,
        industry: job.industry, job_role: job.job_role, daily_wage: Number(job.daily_wage) || 0,
        pay_day: job.pay_day, preparations: job.preparations, headcount: Math.max(1, Number(job.headcount) || 1),
        rooms_per_day: job.rooms_per_day ? Number(job.rooms_per_day) : null,
        contact_phone: job.contact_phone, photo_url: job.photo_url,
        edit_count: editCount + 1,
      } as any).eq("id", id);
      if (error) return toast.error(error.message);
      toast.success(`수정 완료 (${editCount + 1}/${MAX_EDITS})`);
      nav({ to: "/employer/jobs" });
    } finally {
      setSaving(false);
    }
  };

  const set = (k: string, v: any) => setJob({ ...job, [k]: v });

  return (
    <MobileLayout role="employer">
      <div className="p-3 space-y-3">
        <h2 className="font-bold">공고 수정</h2>
        <Card className="bg-amber-50 border-amber-200"><CardContent className="p-3 text-xs">
          공고 수정은 <b>최대 {MAX_EDITS}회</b>까지만 가능합니다. 현재 <b>{editCount}/{MAX_EDITS}</b>회 수정됨.
          {reached && <p className="text-red-600 mt-1">⚠ 수정 횟수를 초과하여 더 이상 수정할 수 없습니다.</p>}
        </CardContent></Card>

        <Card><CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div><Label>업종</Label>
              <Select value={job.industry} onValueChange={(v) => set("industry", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(INDUSTRY_LABEL).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>직무</Label>
              <Select value={job.job_role} onValueChange={(v) => set("job_role", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(ROLES_BY_INDUSTRY[job.industry] ?? []).map(r => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>공고 제목</Label><Input value={job.title ?? ""} onChange={e => set("title", e.target.value)} /></div>
          <div><Label>일할 곳 이름</Label><Input value={job.place_name ?? ""} onChange={e => set("place_name", e.target.value)} /></div>
          <div><Label>위치</Label><Input value={job.location ?? ""} onChange={e => set("location", e.target.value)} /></div>
          <div><Label>지역</Label>
            <Select value={job.region ?? "서울"} onValueChange={(v) => set("region", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>일당 (원)</Label><Input type="number" value={job.daily_wage ?? 0} onChange={e => set("daily_wage", e.target.value)} /></div>
            <div><Label>급여 지급일</Label><Input value={job.pay_day ?? ""} onChange={e => set("pay_day", e.target.value)} /></div>
          </div>
          <div><Label>필요 인원수</Label><Input type="number" min={1} value={job.headcount ?? 1} onChange={e => set("headcount", e.target.value)} /></div>
          <div><Label>준비물</Label><Textarea value={job.preparations ?? ""} onChange={e => set("preparations", e.target.value)} /></div>
          <div><Label>담당자 연락처</Label><Input value={job.contact_phone ?? ""} onChange={e => set("contact_phone", e.target.value)} /></div>
          <Button className="w-full" onClick={save} disabled={saving || reached}>
            {reached ? "수정 불가" : `수정 저장 (${editCount}/${MAX_EDITS})`}
          </Button>
        </CardContent></Card>
      </div>
    </MobileLayout>
  );
}
