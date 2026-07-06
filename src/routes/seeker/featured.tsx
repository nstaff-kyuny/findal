import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/MobileLayout";
import { RoleGate } from "@/components/RoleGate";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { INDUSTRY_FALLBACK_IMAGE, INDUSTRY_GRADIENT, INDUSTRY_EMOJI, formatWorkDatesWithWeekday, isJobCompleted } from "@/lib/job-visuals";
import { useAuth } from "@/lib/auth";
import { useI18n, useDynamicTranslate } from "@/lib/i18n";
import { parseRegions, serializeRegions, RegionPicker } from "@/components/RegionPicker";
import { generateSeekerMatchReasons } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil } from "lucide-react";


export const Route = createFileRoute("/seeker/featured")({ component: () => <RoleGate role="seeker"><Page /></RoleGate> });

function Page() {
  const { user } = useAuth();
  const { t, lang, tIndustry, tRegion } = useI18n();
  const [promoted, setPromoted] = useState<any[]>([]);
  const [random, setRandom] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [matches, setMatches] = useState<Record<string, { score: number; reason: string }>>({});
  const [prefRegions, setPrefRegions] = useState<string[]>([]);
  const [regionDlg, setRegionDlg] = useState(false);
  const [editRegions, setEditRegions] = useState<string[]>([]);
  const getReasons = useServerFn(generateSeekerMatchReasons);
  const nav = useNavigate();

  useEffect(() => { (async () => {
    let myRegions: string[] = [];
    if (user) {
      const { data: sp } = await supabase.from("seeker_profiles")
        .select("preferred_region").eq("user_id", user.id).maybeSingle();
      myRegions = parseRegions(sp?.preferred_region);
      setPrefRegions(myRegions);
    }
    const inRegion = (j: any) => myRegions.length === 0 || (j.region && myRegions.includes(j.region));

    const now = new Date().toISOString();
    const { data: p } = await supabase.rpc("get_active_promoted_jobs");
    const promotedIds = Array.from(new Set((p ?? []).map((r: any) => r.job_id)));
    let promotedJobs: any[] = [];
    if (promotedIds.length > 0) {
      const { data: pj } = await supabase.from("jobs").select("*").in("id", promotedIds).eq("is_active", true);
      const byId = new Map((pj ?? []).map((j: any) => [j.id, j]));
      promotedJobs = promotedIds
        .map((id) => byId.get(id))
        .filter((j: any) => j && inRegion(j));
    }
    setPromoted(promotedJobs.slice(0, 8));


    let rq = supabase.from("jobs").select("*").eq("is_active", true);
    if (myRegions.length > 0) rq = rq.in("region", myRegions);
    const { data: r } = await rq.limit(40);
    const randomJobs = (r ?? []).sort(() => Math.random() - 0.5);
    setRandom(randomJobs);

    const { data: a } = await supabase.from("ad_banners").select("*").eq("active", true).gte("ends_at", now).lte("starts_at", now).limit(20);
    const shuffledAds = (a ?? []).sort(() => Math.random() - 0.5).slice(0, 3);
    setAds(shuffledAds);

    const jobIds = Array.from(new Set([...promotedJobs, ...randomJobs].map((j: any) => j.id)));
    if (jobIds.length) {
      const { data: apps } = await supabase.from("job_applications").select("job_id").in("job_id", jobIds);
      const map: Record<string, number> = {};
      (apps ?? []).forEach((x: any) => { map[x.job_id] = (map[x.job_id] ?? 0) + 1; });
      setCounts(map);
      try {
        const picked = [...promotedJobs.slice(0, 6), ...randomJobs.slice(0, 6)].map((j: any) => ({ id: j.id, title: j.title, region: j.region, industry: j.industry, daily_wage: j.daily_wage }));
        setMatches(await getReasons({ data: { jobs: picked, language: lang } }));
      } catch {}
    }
  })(); }, [user, lang]);

  const industryIcon = (ind: string) => {
    switch (ind) {
      case "hospital":
      case "nursing": return "🏥";
      case "restaurant": return "🍽️";
      case "hotel":
      case "motel":
      case "resort": return "🏨";
      default: return "🏢";
    }
  };

  const dynTexts = useMemo(() => {
    const arr: string[] = [];
    [...promoted, ...random].forEach((j: any) => { if (j?.title) arr.push(j.title); if (j?.place_name) arr.push(j.place_name); });
    return arr.slice(0, 60);
  }, [promoted, random]);
  const tx = useDynamicTranslate(dynTexts);

  const renderWage = (j: any) => j.contract_type === "monthly"
    ? `${t("monthly_wage")} ${Number(j.monthly_wage ?? 0).toLocaleString()}${t("won")}${t("per_month")}`
    : `${Number(j.daily_wage ?? 0).toLocaleString()}${t("won")}`;
  const renderDates = (j: any) => j.contract_type === "monthly"
    ? (j.contract_months ? `${j.contract_months}${t("months_unit")}` : t("one_month_plus"))
    : (formatWorkDatesWithWeekday(j.work_dates) || t("to_be_arranged"));

  const premiumCard = (j: any) => {
    const done = isJobCompleted(j);
    return (
    <Card key={j.id} className={`relative p-3 cursor-pointer border-2 border-primary/60 shadow-md ${done ? "grayscale opacity-70" : ""}`} onClick={() => nav({ to: "/seeker/jobs/$id", params: { id: j.id } })}>
      {done && <Badge className="absolute top-2 right-2 z-10 bg-gray-600 text-white">{t("completed_badge")}</Badge>}
      {j.photo_url ? (
        <img src={j.photo_url} className="w-full h-28 rounded object-cover mb-2" alt={j.title} />
      ) : (
        <div className={`relative w-full h-28 rounded mb-2 overflow-hidden bg-gradient-to-br ${INDUSTRY_GRADIENT[j.industry] ?? "from-slate-400 to-slate-600"} flex flex-col items-center justify-center text-white`}>
          <div className="text-3xl drop-shadow">{INDUSTRY_EMOJI[j.industry] ?? "🏢"}</div>
          <div className="text-xs font-bold tracking-wide mt-1 px-2 py-0.5 rounded-full bg-white/25 backdrop-blur">{tIndustry(j.industry)}</div>
          <div className="absolute -right-3 -bottom-3 text-7xl opacity-15 select-none">{INDUSTRY_EMOJI[j.industry] ?? "🏢"}</div>
        </div>
      )}
      <div className="flex items-center justify-between gap-1">
        <Badge variant="secondary" className="text-base">{tIndustry(j.industry)}</Badge>
        {matches[j.id] && (
          <Badge className="text-sm border-transparent text-white" style={{ backgroundColor: "#6495ED" }}>
            AI {matches[j.id].score}
          </Badge>
        )}
      </div>
      <h3 className="text-lg font-bold mt-1 truncate">{tx[j.title] ?? j.title}</h3>
      {matches[j.id]?.reason && <p className="text-[13px] text-primary font-semibold mt-0.5 truncate">{matches[j.id].reason}</p>}
      <p className="text-base text-muted-foreground truncate">🏨 {tx[j.place_name] ?? j.place_name}</p>
      <p className="text-lg text-primary font-bold mt-1">{renderWage(j)}</p>
      {j.rooms_per_day && <p className="text-sm text-muted-foreground mt-0.5">🛏️ {j.rooms_per_day}/{(j as any).rooms_unit === "실" ? "실" : "unit"}</p>}
      <div className="mt-0.5">
        <span className="text-xs text-muted-foreground mr-1">{t("work_dates")}</span>
        <span className="text-sm font-semibold">{renderDates(j)}</span>
      </div>
      <p className="text-sm text-muted-foreground mt-1">👥 {t("applicants")} {counts[j.id] ?? 0} / {t("needed")} {j.headcount ?? 1}{t("people")}</p>

    </Card>
    );
  };

  const todayCard = (j: any) => {
    const done = isJobCompleted(j);
    return (
    <Card key={j.id} className={`relative p-3 cursor-pointer overflow-hidden ${done ? "grayscale opacity-70" : ""}`} onClick={() => nav({ to: "/seeker/jobs/$id", params: { id: j.id } })}>
      {done && <Badge className="absolute top-2 right-2 z-10 bg-gray-600 text-white">{t("completed_badge")}</Badge>}
      <div className="absolute right-1 bottom-1 text-6xl opacity-10 pointer-events-none select-none">{industryIcon(j.industry)}</div>
      <div className="relative">
        <div className="flex items-center justify-between gap-1">
          <Badge variant="secondary" className="text-sm">{tIndustry(j.industry)}</Badge>
          {matches[j.id] && (
            <Badge className="text-sm border-transparent text-white" style={{ backgroundColor: "#6495ED" }}>
              AI {matches[j.id].score}
            </Badge>
          )}
        </div>
        <h3 className="text-base font-semibold mt-1 truncate">{tx[j.title] ?? j.title}</h3>
        {matches[j.id]?.reason && <p className="text-[13px] text-primary font-semibold mt-0.5 truncate">{matches[j.id].reason}</p>}
        <p className="text-sm text-muted-foreground truncate mt-0.5">🏨 {tx[j.place_name] ?? j.place_name}</p>
        <p className="text-base text-primary font-bold mt-1">{renderWage(j)}</p>
        {j.rooms_per_day && <p className="text-xs text-muted-foreground mt-0.5">🛏️ {j.rooms_per_day}/{(j as any).rooms_unit === "실" ? "실" : "unit"}</p>}
        <div className="mt-0.5">
          <span className="text-xs text-muted-foreground mr-1">{t("work_dates")}</span>
          <span className="text-[13px] font-semibold">{renderDates(j)}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">👥 {t("applicants")} {counts[j.id] ?? 0} / {t("needed")} {j.headcount ?? 1}{t("people")}</p>

      </div>
    </Card>
    );
  };


  return (
    <MobileLayout role="seeker">
      <div className="p-3 space-y-5">
        
        <Card className="p-3 bg-primary/5 border-primary/30">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">{t("my_pref_regions")}</p>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[11px]"
              onClick={() => { setEditRegions(prefRegions); setRegionDlg(true); }}
            >
              <Pencil size={11} className="mr-1" />{t("edit") || "수정"}
            </Button>
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {prefRegions.length === 0
              ? <span className="text-sm text-muted-foreground">{t("no_pref_region")}</span>
              : prefRegions.map(r => <Badge key={r} variant="default" className="text-xs">{tRegion(r)}</Badge>)}
          </div>
        </Card>
        <Dialog open={regionDlg} onOpenChange={setRegionDlg}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{t("my_pref_regions")}</DialogTitle></DialogHeader>
            <RegionPicker value={editRegions} onChange={setEditRegions} />
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setRegionDlg(false)}>{t("cancel") || "취소"}</Button>
              <Button onClick={async () => {
                if (!user) return;
                const { error } = await supabase.from("seeker_profiles")
                  .update({ preferred_region: serializeRegions(editRegions) })
                  .eq("user_id", user.id);
                if (error) { toast.error(error.message); return; }
                setPrefRegions(editRegions);
                setRegionDlg(false);
                toast.success(t("saved") || "저장되었습니다");
              }}>{t("save") || "저장"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <section>
          <h2 className="font-bold mb-2 flex items-center gap-1">{t("premium_section")}</h2>
          {promoted.filter(j => !isJobCompleted(j)).length === 0 ? <p className="text-xs text-muted-foreground">{t("empty_promoted")}</p>
            : <div className="grid grid-cols-2 gap-2">{promoted.filter(j => !isJobCompleted(j)).map(premiumCard)}</div>}
        </section>
        <section>
          <h2 className="font-bold mb-2">{t("today_section")}</h2>
          {random.filter(j => !isJobCompleted(j)).length === 0 ? <p className="text-xs text-muted-foreground">{t("empty_jobs")}</p>
            : <div className="grid grid-cols-2 gap-2">{random.filter(j => !isJobCompleted(j)).map(todayCard)}</div>}
        </section>
        <section>
          <h2 className="font-bold mb-2">{t("ad_section")}</h2>
          <div className="space-y-2">
            {ads.length === 0 && <p className="text-xs text-muted-foreground">{t("empty_ads")}</p>}
            {ads.map(a => (
              <a key={a.id} href={a.link_url ?? "#"} target="_blank" rel="noopener" className="block">
                <Card className="overflow-hidden">
                  {a.image_url ? (
                    <div className="w-full aspect-[16/5] bg-muted">
                      <img src={a.image_url} className="w-full h-full object-cover" alt={a.title} />
                    </div>
                  ) : (
                    <div className="w-full aspect-[16/5] bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <p className="font-semibold text-sm px-3 text-center">{a.title}</p>
                    </div>
                  )}
                  {a.image_url && <div className="px-3 py-1.5 text-xs font-semibold truncate">{a.title}</div>}
                </Card>
              </a>
            ))}
          </div>
        </section>
      </div>
    </MobileLayout>
  );
}
