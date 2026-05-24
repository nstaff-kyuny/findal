import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/MobileLayout";
import { RoleGate } from "@/components/RoleGate";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { INDUSTRY_LABEL } from "@/lib/constants";
import { INDUSTRY_FALLBACK_IMAGE, INDUSTRY_GRADIENT, INDUSTRY_EMOJI, formatWorkDatesWithWeekday } from "@/lib/job-visuals";
import { useAuth } from "@/lib/auth";
import { parseRegions } from "@/components/RegionPicker";
import { generateSeekerMatchReasons } from "@/lib/ai.functions";

export const Route = createFileRoute("/seeker/featured")({ component: () => <RoleGate role="seeker"><Page /></RoleGate> });

function Page() {
  const { user } = useAuth();
  const [promoted, setPromoted] = useState<any[]>([]);
  const [random, setRandom] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [matches, setMatches] = useState<Record<string, { score: number; reason: string }>>({});
  const [prefRegions, setPrefRegions] = useState<string[]>([]);
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
        setMatches(await getReasons({ data: { jobs: picked } }));
      } catch {}
    }
  })(); }, [user]);

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

  const premiumCard = (j: any) => (
    <Card key={j.id} className="p-3 cursor-pointer border-2 border-primary/60 shadow-md" onClick={() => nav({ to: "/seeker/jobs/$id", params: { id: j.id } })}>
      {j.photo_url ? (
        <img src={j.photo_url} className="w-full h-28 rounded object-cover mb-2" alt={j.title} />
      ) : (
        <div className={`relative w-full h-28 rounded mb-2 overflow-hidden bg-gradient-to-br ${INDUSTRY_GRADIENT[j.industry] ?? "from-slate-400 to-slate-600"} flex flex-col items-center justify-center text-white`}>
          <div className="text-3xl drop-shadow">{INDUSTRY_EMOJI[j.industry] ?? "🏢"}</div>
          <div className="text-xs font-bold tracking-wide mt-1 px-2 py-0.5 rounded-full bg-white/25 backdrop-blur">{INDUSTRY_LABEL[j.industry]}</div>
          <div className="absolute -right-3 -bottom-3 text-7xl opacity-15 select-none">{INDUSTRY_EMOJI[j.industry] ?? "🏢"}</div>
        </div>
      )}
      <div className="flex items-center justify-between gap-1">
        <Badge variant="secondary" className="text-sm">{INDUSTRY_LABEL[j.industry]}</Badge>
        {matches[j.id] && (
          <Badge className="text-xs border-transparent text-white" style={{ backgroundColor: "#6495ED" }}>
            AI {matches[j.id].score}점
          </Badge>
        )}
      </div>
      <h3 className="text-base font-bold mt-1 truncate">{j.title}</h3>
      {matches[j.id]?.reason && <p className="text-[11px] text-primary font-semibold mt-0.5 truncate">{matches[j.id].reason}</p>}
      <p className="text-sm text-muted-foreground truncate">🏨 {j.place_name}</p>
      <p className="text-base text-primary font-bold mt-1">{Number(j.daily_wage).toLocaleString()}원</p>
      <div className="mt-0.5">
        <span className="text-[10px] text-muted-foreground mr-1">근무일</span>
        <span className="text-[12px] font-semibold">{formatWorkDatesWithWeekday(j.work_dates) || "협의"}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">👥 지원 {counts[j.id] ?? 0} / 필요 {j.headcount ?? 1}명</p>
    </Card>
  );

  const todayCard = (j: any) => (
    <Card key={j.id} className="relative p-3 cursor-pointer overflow-hidden" onClick={() => nav({ to: "/seeker/jobs/$id", params: { id: j.id } })}>
      <div className="absolute right-1 bottom-1 text-6xl opacity-10 pointer-events-none select-none">{industryIcon(j.industry)}</div>
      <div className="relative">
        <div className="flex items-center justify-between gap-1">
          <Badge variant="secondary" className="text-xs">{INDUSTRY_LABEL[j.industry]}</Badge>
          {matches[j.id] && (
            <Badge className="text-xs border-transparent text-white" style={{ backgroundColor: "#6495ED" }}>
              AI {matches[j.id].score}점
            </Badge>
          )}
        </div>
        <h3 className="text-sm font-semibold mt-1 truncate">{j.title}</h3>
        {matches[j.id]?.reason && <p className="text-[11px] text-primary font-semibold mt-0.5 truncate">{matches[j.id].reason}</p>}
        <p className="text-xs text-muted-foreground truncate mt-0.5">🏨 {j.place_name}</p>
        <p className="text-sm text-primary font-bold mt-1">{Number(j.daily_wage).toLocaleString()}원</p>
        <div className="mt-0.5">
          <span className="text-[10px] text-muted-foreground mr-1">근무일</span>
          <span className="text-[11px] font-semibold">{formatWorkDatesWithWeekday(j.work_dates) || "협의"}</span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">👥 지원 {counts[j.id] ?? 0} / 필요 {j.headcount ?? 1}명</p>
      </div>
    </Card>
  );

  return (
    <MobileLayout role="seeker">
      <div className="p-3 space-y-5">
        <Card className="p-3 bg-primary/5 border-primary/30">
          <p className="text-xs text-muted-foreground">내 선호 지역</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {prefRegions.length === 0
              ? <span className="text-sm text-muted-foreground">설정된 선호 지역이 없습니다 · 전체 공고 표시</span>
              : prefRegions.map(r => <Badge key={r} variant="default" className="text-xs">{r}</Badge>)}
          </div>
        </Card>
        <section>
          <h2 className="font-bold mb-2 flex items-center gap-1">⭐ 프리미엄 추천</h2>
          {promoted.length === 0 ? <p className="text-xs text-muted-foreground">진행중인 추천 공고가 없습니다</p>
            : <div className="grid grid-cols-2 gap-2">{promoted.map(premiumCard)}</div>}
        </section>
        <section>
          <h2 className="font-bold mb-2">🎲 오늘의 추천</h2>
          {random.length === 0 ? <p className="text-xs text-muted-foreground">공고가 없습니다</p>
            : <div className="grid grid-cols-2 gap-2">{random.map(todayCard)}</div>}
        </section>
        <section>
          <h2 className="font-bold mb-2">📢 광고</h2>
          <div className="space-y-2">
            {ads.length === 0 && <p className="text-xs text-muted-foreground">현재 광고가 없습니다</p>}
            {ads.map(a => (
              <a key={a.id} href={a.link_url ?? "#"} target="_blank" rel="noopener" className="block">
                <Card className="p-3 flex items-center gap-3">
                  {a.image_url && <img src={a.image_url} className="w-16 h-16 rounded object-cover" alt={a.title} />}
                  <div className="font-semibold text-sm">{a.title}</div>
                </Card>
              </a>
            ))}
          </div>
        </section>
      </div>
    </MobileLayout>
  );
}
