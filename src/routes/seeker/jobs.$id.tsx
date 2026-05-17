import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/MobileLayout";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { INDUSTRY_LABEL, ROLE_LABEL } from "@/lib/constants";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { MapPin, Calendar, Wallet, Wrench } from "lucide-react";

export const Route = createFileRoute("/seeker/jobs/$id")({ component: () => <RoleGate role="seeker"><Page /></RoleGate> });

function Page() {
  const { id } = useParams({ from: "/seeker/jobs/$id" });
  const { user } = useAuth();
  const nav = useNavigate();
  const [job, setJob] = useState<any>(null);
  const [app, setApp] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("jobs").select("*").eq("id", id).single();
    setJob(data);
    if (user) {
      const { data: a } = await supabase.from("job_applications").select("*").eq("job_id", id).eq("seeker_id", user.id).maybeSingle();
      setApp(a);
    }
  };
  useEffect(() => { load(); }, [id, user]);

  const apply = async () => {
    if (!job || !user) return;
    setBusy(true);
    const { error } = await supabase.from("job_applications").insert({
      job_id: job.id, seeker_id: user.id, employer_id: job.employer_id, message: msg || null,
    } as any);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("요청 보냄! 구인자 승인 후 연락처가 공개됩니다.");
    load();
  };

  if (!job) return <MobileLayout role="seeker"><div className="p-6 text-center text-sm text-muted-foreground">불러오는 중…</div></MobileLayout>;

  return (
    <MobileLayout role="seeker">
      <div className="space-y-3">
        {job.photo_url ? <img src={job.photo_url} className="w-full h-56 object-cover" alt={job.title} /> :
          <div className="w-full h-56 bg-muted flex items-center justify-center text-5xl">🏢</div>}
        <div className="px-4 space-y-3">
          <div className="flex gap-1 flex-wrap">
            <Badge>{INDUSTRY_LABEL[job.industry]}</Badge>
            <Badge variant="outline">{ROLE_LABEL[job.job_role]}</Badge>
          </div>
          <h1 className="text-xl font-bold">{job.title}</h1>
          <Card><CardContent className="p-4 space-y-2 text-sm">
            <div className="flex items-center gap-2"><MapPin size={14} className="text-muted-foreground" /><span>{job.place_name} · {job.location}</span></div>
            <div className="flex items-center gap-2"><Wallet size={14} className="text-muted-foreground" /><span>일당 <b>{Number(job.daily_wage).toLocaleString()}원</b> (지급일: {job.pay_day})</span></div>
            <div className="flex items-center gap-2"><Calendar size={14} className="text-muted-foreground" /><span>근무일: {(job.work_dates || []).join(", ") || "협의"}</span></div>
            {job.rooms_per_day && <div className="flex items-center gap-2">🛏️ 일일 객실수: {job.rooms_per_day}개</div>}
            {job.preparations && <div className="flex items-start gap-2"><Wrench size={14} className="text-muted-foreground mt-0.5" /><span>{job.preparations}</span></div>}
            <div className="text-xs text-muted-foreground pt-2">📞 담당자 연락처는 승인 후 공개됩니다.</div>
          </CardContent></Card>

          {app?.status === "approved" ? (
            <Card className="border-green-500"><CardContent className="p-4">
              <p className="font-bold text-green-700 mb-1">✅ 승인되었습니다</p>
              <p className="text-sm">담당자 연락처: <a href={`tel:${job.contact_phone}`} className="text-primary font-bold">{job.contact_phone}</a></p>
            </CardContent></Card>
          ) : app?.status === "pending" ? (
            <Button className="w-full" disabled>요청 대기중…</Button>
          ) : app?.status === "rejected" ? (
            <Button className="w-full" disabled variant="outline">거절됨</Button>
          ) : (
            <div className="space-y-2">
              <Textarea placeholder="구인자에게 보낼 메시지 (선택)" value={msg} onChange={e => setMsg(e.target.value)} />
              <Button className="w-full" onClick={apply} disabled={busy}>일하고 싶어요 (요청 보내기)</Button>
            </div>
          )}
          <Button variant="ghost" className="w-full" onClick={() => nav({ to: "/seeker/home" })}>← 뒤로</Button>
        </div>
      </div>
    </MobileLayout>
  );
}
