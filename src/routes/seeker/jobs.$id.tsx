import { createFileRoute, useParams, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/MobileLayout";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { INDUSTRY_LABEL } from "@/lib/constants";
import { INDUSTRY_FALLBACK_IMAGE, formatWorkDates } from "@/lib/job-visuals";
import { useAuth } from "@/lib/auth";
import { useI18n, useDynamicTranslate } from "@/lib/i18n";
import { toast } from "sonner";
import { MapPin, Calendar, Wallet, Wrench, ClipboardCheck, Heart } from "lucide-react";
import { generateScreeningQuestions, moderateText } from "@/lib/ai.functions";

export const Route = createFileRoute("/seeker/jobs/$id")({
  component: () => <RoleGate role="seeker"><Page /></RoleGate>,
  validateSearch: (s: Record<string, unknown>) => ({ from: (s.from as string) || "" }),
});

function Page() {
  const { id } = useParams({ from: "/seeker/jobs/$id" });
  const { from } = useSearch({ from: "/seeker/jobs/$id" });
  const { user } = useAuth();
  const { t, tIndustry, tRole } = useI18n();
  const nav = useNavigate();
  const makeQuestions = useServerFn(generateScreeningQuestions);
  const moderate = useServerFn(moderateText);
  const [job, setJob] = useState<any>(null);
  const [app, setApp] = useState<any>(null);
  const [favId, setFavId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("jobs").select("*").eq("id", id).single();
    setJob(data);
    if (user) {
      const { data: a } = await supabase.from("job_applications").select("*").eq("job_id", id).eq("seeker_id", user.id).maybeSingle();
      setApp(a);
      // contact_phone is only readable from job_contacts when approved/confirmed
      if (a && (a.status === "approved" || a.status === "confirmed")) {
        const { data: jc } = await supabase.from("job_contacts").select("contact_phone").eq("job_id", id).maybeSingle();
        if (jc?.contact_phone) setJob((prev: any) => prev ? { ...prev, contact_phone: jc.contact_phone } : prev);
      }
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

  const runScreening = async () => {
    setAiBusy(true);
    try { const res = await makeQuestions({ data: { jobId: id } }); setQuestions(res.questions ?? []); }
    catch (e: any) { toast.error(e?.message ?? "AI"); }
    finally { setAiBusy(false); }
  };

  const apply = async () => {
    if (!job || !user) return;
    setBusy(true);
    try {
      if (msg && msg.trim().length > 0) {
        const m = await moderate({ data: { text: msg, context: "application" } });
        if (!m.allow) { toast.error(m.reason); return; }
        if (m.risk === "보통") { toast.warning(m.reason); }
      }
      // If a previous cancelled/rejected application exists, reactivate it instead of inserting (avoids unique key conflict)
      if (app?.status === "cancelled" || app?.status === "rejected") {
        const { error: rpcErr } = await supabase.rpc("seeker_reapply_application", { _app_id: app.id, _message: msg || null } as any);
        if (rpcErr) return toast.error(rpcErr.message);
        toast.success("OK");
        load();
        return;
      }
      const { error } = await supabase.from("job_applications").insert({
        job_id: job.id, seeker_id: user.id, employer_id: job.employer_id, message: msg || null,
      } as any);
      if (error) return toast.error(error.message);
      toast.success("OK");
      load();
    } finally { setBusy(false); }
  };

  // dynamic translate of job-specific Korean strings
  const dynTexts = useMemo(() => {
    if (!job) return [];
    return [job.title, job.place_name, job.location, job.preparations].filter((s) => typeof s === "string" && s.trim().length > 0);
  }, [job]);
  const tx = useDynamicTranslate(dynTexts);

  if (!job) return <MobileLayout role="seeker"><div className="p-6 text-center text-sm text-muted-foreground">{t("loading")}</div></MobileLayout>;

  return (
    <MobileLayout role="seeker">
      <div className="space-y-3">
        {job.photo_url ? <img src={job.photo_url} className="w-full h-56 object-cover" alt={job.title} /> :
          <img src={INDUSTRY_FALLBACK_IMAGE[job.industry] ?? INDUSTRY_FALLBACK_IMAGE.hotel} className="w-full h-56 object-cover" alt={INDUSTRY_LABEL[job.industry]} />}
        <div className="px-4 space-y-3">
          <div className="flex gap-1 flex-wrap">
            <Badge>{tIndustry(job.industry)}</Badge>
            <Badge variant="outline">{tRole(job.job_role)}</Badge>
          </div>
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl font-bold flex-1">{tx[job.title] ?? job.title}</h1>
            <Button size="sm" variant="outline" onClick={toggleFavorite} className="shrink-0">
              <Heart size={18} className={favId ? "text-rose-500 fill-rose-500" : "text-muted-foreground"} />
              <span className="ml-1 text-xs">{favId ? t("fav_title") : t("fav_title")}</span>
            </Button>
          </div>
          <Card><CardContent className="p-4 space-y-2 text-sm">
            <div className="flex items-center gap-2"><MapPin size={14} className="text-muted-foreground" /><span>{tx[job.place_name] ?? job.place_name} · <span className="text-muted-foreground">{t("detail_location")}:</span> {tx[job.location] ?? job.location}</span></div>
            <div className="flex items-center gap-2"><Wallet size={14} className="text-muted-foreground" />
              {job.contract_type === "monthly" ? (
                <span>{t("monthly_wage")} <b>{Number(job.monthly_wage ?? 0).toLocaleString()}{t("won")}</b>{t("per_month")} ({t("pay_day_label")}: {job.pay_day})</span>
              ) : (
                <span>{t("daily_wage")} <b>{Number(job.daily_wage ?? 0).toLocaleString()}{t("won")}</b> ({t("pay_day_label")}: {job.pay_day})</span>
              )}
            </div>
            <div className="flex items-center gap-2"><Calendar size={14} className="text-muted-foreground" />
              {job.contract_type === "monthly"
                ? <span>{t("contract_months")}: {job.contract_months ? `${job.contract_months}${t("months_unit")}` : t("one_month_plus")}</span>
                : <span>{t("work_dates")}: {formatWorkDates(job.work_dates)}</span>}
            </div>
            {job.rooms_per_day && <div className="flex items-center gap-2">🛏️ {t("rooms_per_day")}: {job.rooms_per_day}/{(job as any).rooms_unit === "실" ? "실" : "unit"}</div>}
            {job.preparations && <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded p-2"><Wrench size={14} className="text-amber-700 mt-0.5" /><span className="font-semibold text-amber-900">{t("prep_label")}: <span className="font-bold">{tx[job.preparations] ?? job.preparations}</span></span></div>}
            <div className="text-xs text-muted-foreground pt-2">{t("contact_after_approval")}</div>
          </CardContent></Card>

          {from === "apps" || app?.status === "confirmed" ? (
            <Card className="border-orange-500"><CardContent className="p-4">
              <p className="font-bold text-orange-600 mb-1">{t("approved_confirmed_job")}</p>
              {job.contact_phone && <p className="text-sm">{t("contact_label")}: <a href={`tel:${job.contact_phone}`} className="text-primary font-bold">{job.contact_phone}</a></p>}
            </CardContent></Card>
          ) : app?.status === "approved" ? (
            <Card className="border-green-500"><CardContent className="p-4">
              <p className="font-bold text-green-700 mb-1">{t("approved_msg")}</p>
              <p className="text-sm">{t("contact_label")}: <a href={`tel:${job.contact_phone}`} className="text-primary font-bold">{job.contact_phone}</a></p>
            </CardContent></Card>
          ) : app?.status === "pending" ? (
            <div className="space-y-2">
              <Button className="w-full" disabled>{t("pending_btn")}</Button>
              <Button variant="outline" className="w-full" onClick={cancelApplication}>{t("apply_cancel")}</Button>
            </div>
          ) : app?.status === "rejected" || app?.status === "cancelled" ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground text-center">
                {app.status === "rejected" ? "이전 신청이 거절되었습니다. 다시 신청할 수 있습니다." : "이전 신청을 취소했습니다. 다시 신청할 수 있습니다."}
              </p>
              <Button variant="secondary" className="w-full" onClick={runScreening} disabled={aiBusy}><ClipboardCheck size={16} className="mr-1" />{t("ai_pre_questions")}</Button>
              {questions.length > 0 && <Card className="p-3 bg-muted/40"><ul className="text-sm space-y-1 list-disc list-inside">{questions.map((q, i) => <li key={i}>{q}</li>)}</ul></Card>}
              <Textarea placeholder={t("msg_to_employer_ph")} value={msg} onChange={e => setMsg(e.target.value)} />
              <Button
                className="w-full text-lg font-bold py-6 text-white hover:opacity-90"
                style={{ backgroundColor: "#1E90FF" }}
                onClick={apply}
                disabled={busy}
              >
                {t("want_to_work")}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Button variant="secondary" className="w-full" onClick={runScreening} disabled={aiBusy}><ClipboardCheck size={16} className="mr-1" />{t("ai_pre_questions")}</Button>
              {questions.length > 0 && <Card className="p-3 bg-muted/40"><ul className="text-sm space-y-1 list-disc list-inside">{questions.map((q, i) => <li key={i}>{q}</li>)}</ul></Card>}
              <Textarea placeholder={t("msg_to_employer_ph")} value={msg} onChange={e => setMsg(e.target.value)} />
              <Button
                className="w-full text-lg font-bold py-6 text-white hover:opacity-90"
                style={{ backgroundColor: "#1E90FF" }}
                onClick={apply}
                disabled={busy}
              >
                {t("want_to_work")}
              </Button>
            </div>
          )}
          {from === "apps" ? (
            <Button variant="ghost" className="w-full" onClick={() => nav({ to: "/seeker/applications" })}>{t("back_to_apps")}</Button>
          ) : (
            <Button variant="ghost" className="w-full" onClick={() => nav({ to: "/seeker/home" })}>{t("back")}</Button>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
