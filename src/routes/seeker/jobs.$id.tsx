import { createFileRoute, useParams, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/MobileLayout";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { INDUSTRY_LABEL, ROLE_LABEL } from "@/lib/constants";
import { INDUSTRY_FALLBACK_IMAGE, formatWorkDates } from "@/lib/job-visuals";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { MapPin, Calendar, Wallet, Wrench, Languages, ClipboardCheck, Heart } from "lucide-react";
import { generateScreeningQuestions, translateJobDetails, moderateText } from "@/lib/ai.functions";

export const Route = createFileRoute("/seeker/jobs/$id")({
  component: () => <RoleGate role="seeker"><Page /></RoleGate>,
  validateSearch: (s: Record<string, unknown>) => ({ from: (s.from as string) || "" }),
});

function Page() {
  const { id } = useParams({ from: "/seeker/jobs/$id" });
  const { from } = useSearch({ from: "/seeker/jobs/$id" });
  const { user } = useAuth();
  const nav = useNavigate();
  const translateJob = useServerFn(translateJobDetails);
  const makeQuestions = useServerFn(generateScreeningQuestions);
  const moderate = useServerFn(moderateText);
  const [job, setJob] = useState<any>(null);
  const [app, setApp] = useState<any>(null);
  const [favId, setFavId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [translation, setTranslation] = useState<any>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("jobs").select("*").eq("id", id).single();
    setJob(data);
    if (user) {
      const { data: a } = await supabase.from("job_applications").select("*").eq("job_id", id).eq("seeker_id", user.id).maybeSingle();
      setApp(a);
      if (data) {
        const { data: fav } = await supabase.from("seeker_favorites").select("id")
          .eq("seeker_id", user.id).eq("employer_id", data.employer_id).eq("place_name", data.place_name).maybeSingle();
        setFavId(fav?.id ?? null);
      }
    }
  };
  useEffect(() => { load(); }, [id, user]);

  const toggleFavorite = async () => {
    if (!user || !job) return;
    if (favId) {
      const { error } = await supabase.from("seeker_favorites").delete().eq("id", favId);
      if (error) return toast.error(error.message);
      setFavId(null);
      toast.success("즐겨찾기 해제됨");
    } else {
      const { data, error } = await supabase.from("seeker_favorites")
        .insert({ seeker_id: user.id, employer_id: job.employer_id, place_name: job.place_name } as any)
        .select("id").single();
      if (error) return toast.error(error.message);
      setFavId(data.id);
      toast.success("즐겨찾기에 추가됨");
    }
  };

  const cancelApplication = async () => {
    if (!app) return;
    if (!confirm("신청을 취소하시겠습니까?")) return;
    const { error } = await supabase.from("job_applications")
      .update({ status: "cancelled" } as any).eq("id", app.id);
    if (error) return toast.error(error.message);
    toast.success("신청이 취소되었습니다");
    load();
  };

  const runTranslate = async (language: "en" | "mn" | "ru" | "zh") => {
    setAiBusy(true);
    try { setTranslation(await translateJob({ data: { jobId: id, language } })); }
    catch (e: any) { toast.error(e?.message ?? "번역 실패"); }
    finally { setAiBusy(false); }
  };

  const runScreening = async () => {
    setAiBusy(true);
    try { const res = await makeQuestions({ data: { jobId: id } }); setQuestions(res.questions ?? []); }
    catch (e: any) { toast.error(e?.message ?? "AI 질문 생성 실패"); }
    finally { setAiBusy(false); }
  };

  const apply = async () => {
    if (!job || !user) return;
    setBusy(true);
    try {
      if (msg && msg.trim().length > 0) {
        const m = await moderate({ data: { text: msg, context: "application" } });
        if (!m.allow) {
          toast.error(`부적절한 표현이 감지되어 신청을 보낼 수 없습니다: ${m.reason}`);
          return;
        }
        if (m.risk === "보통") {
          toast.warning(`주의 표현이 감지되었습니다: ${m.reason}`);
        }
      }
      const { error } = await supabase.from("job_applications").insert({
        job_id: job.id, seeker_id: user.id, employer_id: job.employer_id, message: msg || null,
      } as any);
      if (error) return toast.error(error.message);
      toast.success("신청 보냄! 구인자 승인 후 연락처가 공개됩니다.");
      load();
    } finally {
      setBusy(false);
    }
  };

  if (!job) return <MobileLayout role="seeker"><div className="p-6 text-center text-sm text-muted-foreground">불러오는 중…</div></MobileLayout>;

  return (
    <MobileLayout role="seeker">
      <div className="space-y-3">
        {job.photo_url ? <img src={job.photo_url} className="w-full h-56 object-cover" alt={job.title} /> :
          <img src={INDUSTRY_FALLBACK_IMAGE[job.industry] ?? INDUSTRY_FALLBACK_IMAGE.hotel} className="w-full h-56 object-cover" alt={INDUSTRY_LABEL[job.industry]} />}
        <div className="px-4 space-y-3">
          <div className="flex gap-1 flex-wrap">
            <Badge>{INDUSTRY_LABEL[job.industry]}</Badge>
            <Badge variant="outline">{ROLE_LABEL[job.job_role]}</Badge>
          </div>
          <h1 className="text-xl font-bold">{job.title}</h1>
          <Card><CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold"><Languages size={16} className="text-primary" />AI 다국어 보기</div>
            <div className="grid grid-cols-4 gap-1.5">
              <Button size="sm" variant="outline" disabled={aiBusy} onClick={() => runTranslate("en")}>English</Button>
              <Button size="sm" variant="outline" disabled={aiBusy} onClick={() => runTranslate("mn")}>Монгол</Button>
              <Button size="sm" variant="outline" disabled={aiBusy} onClick={() => runTranslate("ru")}>Русский</Button>
              <Button size="sm" variant="outline" disabled={aiBusy} onClick={() => runTranslate("zh")}>中文</Button>
            </div>
            {translation && <div className="rounded bg-muted/50 p-2 text-sm space-y-1.5">
              <p className="font-bold text-base">{translation.title}</p>
              {translation.summary && <p>{translation.summary}</p>}
              <p>📍 {translation.place} · {translation.location}</p>
              <p>🏷️ {translation.industry} · {translation.jobRole}</p>
              <p className="text-primary font-semibold">💰 {translation.wage}</p>
              {translation.schedule && <p>📅 {translation.schedule}</p>}
              {translation.preparation && <p>🧰 {translation.preparation}</p>}
              <p className="text-xs text-muted-foreground">{translation.caution}</p>
            </div>}
          </CardContent></Card>
          <Card><CardContent className="p-4 space-y-2 text-sm">
            <div className="flex items-center gap-2"><MapPin size={14} className="text-muted-foreground" /><span>{job.place_name} · {job.location}</span></div>
            <div className="flex items-center gap-2"><Wallet size={14} className="text-muted-foreground" /><span>일당 <b>{Number(job.daily_wage).toLocaleString()}원</b> (지급일: {job.pay_day})</span></div>
            <div className="flex items-center gap-2"><Calendar size={14} className="text-muted-foreground" /><span>근무일: {formatWorkDates(job.work_dates)}</span></div>
            {job.rooms_per_day && <div className="flex items-center gap-2">🛏️ 일일 정비 객실수: {job.rooms_per_day}개</div>}
            {job.preparations && <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded p-2"><Wrench size={14} className="text-amber-700 mt-0.5" /><span className="font-semibold text-amber-900">준비물: <span className="font-bold">{job.preparations}</span></span></div>}
            <div className="text-xs text-muted-foreground pt-2">📞 담당자 연락처는 승인 후 공개됩니다.</div>
          </CardContent></Card>

          {from === "apps" || app?.status === "confirmed" ? (
            <Card className="border-orange-500"><CardContent className="p-4">
              <p className="font-bold text-orange-600 mb-1">✅ 승인 확정된 공고입니다</p>
              {job.contact_phone && <p className="text-sm">담당자 연락처: <a href={`tel:${job.contact_phone}`} className="text-primary font-bold">{job.contact_phone}</a></p>}
            </CardContent></Card>
          ) : app?.status === "approved" ? (
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
              <Button variant="secondary" className="w-full" onClick={runScreening} disabled={aiBusy}><ClipboardCheck size={16} className="mr-1" />AI 신청 전 확인 질문</Button>
              {questions.length > 0 && <Card className="p-3 bg-muted/40"><ul className="text-sm space-y-1 list-disc list-inside">{questions.map((q, i) => <li key={i}>{q}</li>)}</ul></Card>}
              <Textarea placeholder="구인자에게 보낼 메시지 (선택)" value={msg} onChange={e => setMsg(e.target.value)} />
              <Button className="w-full" onClick={apply} disabled={busy}>일하고 싶어요 (요청 보내기)</Button>
            </div>
          )}
          {from === "apps" ? (
            <Button variant="ghost" className="w-full" onClick={() => nav({ to: "/seeker/applications" })}>← 신청/승인 내역으로</Button>
          ) : (
            <Button variant="ghost" className="w-full" onClick={() => nav({ to: "/seeker/home" })}>← 뒤로</Button>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
