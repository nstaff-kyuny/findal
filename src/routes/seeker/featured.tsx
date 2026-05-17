import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/MobileLayout";
import { RoleGate } from "@/components/RoleGate";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { INDUSTRY_LABEL } from "@/lib/constants";

export const Route = createFileRoute("/seeker/featured")({ component: () => <RoleGate role="seeker"><Page /></RoleGate> });

function Page() {
  const [promoted, setPromoted] = useState<any[]>([]);
  const [random, setRandom] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const nav = useNavigate();

  useEffect(() => { (async () => {
    const now = new Date().toISOString();
    const { data: p } = await supabase.from("promoted_jobs")
      .select("job_id, jobs(*)").gte("ends_at", now).limit(12);
    const promotedJobs = (p ?? []).map((r: any) => r.jobs).filter(Boolean);
    setPromoted(promotedJobs);
    const { data: r } = await supabase.from("jobs").select("*").eq("is_active", true).limit(20);
    const randomJobs = (r ?? []).sort(() => Math.random() - 0.5);
    setRandom(randomJobs);
    const { data: a } = await supabase.from("ad_banners").select("*").eq("active", true).gte("ends_at", now).lte("starts_at", now).limit(3);
    setAds(a ?? []);

    const jobIds = Array.from(new Set([...promotedJobs, ...randomJobs].map((j: any) => j.id)));
    if (jobIds.length) {
      const { data: apps } = await supabase.from("job_applications").select("job_id").in("job_id", jobIds);
      const map: Record<string, number> = {};
      (apps ?? []).forEach((x: any) => { map[x.job_id] = (map[x.job_id] ?? 0) + 1; });
      setCounts(map);
    }
  })(); }, []);

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
      ) : <div className="w-full h-28 rounded bg-muted flex items-center justify-center text-3xl mb-2">{industryIcon(j.industry)}</div>}
      <Badge variant="secondary" className="text-xs">{INDUSTRY_LABEL[j.industry]}</Badge>
      <h3 className="text-base font-bold mt-1 truncate">{j.title}</h3>
      <p className="text-sm text-muted-foreground truncate">🏨 {j.place_name}</p>
      <p className="text-base text-primary font-bold mt-1">{Number(j.daily_wage).toLocaleString()}원</p>
      <p className="text-xs text-muted-foreground mt-1">👥 지원 {counts[j.id] ?? 0} / 필요 {j.headcount ?? 1}명</p>
    </Card>
  );

  const todayCard = (j: any) => (
    <Card key={j.id} className="relative p-3 cursor-pointer overflow-hidden" onClick={() => nav({ to: "/seeker/jobs/$id", params: { id: j.id } })}>
      <div className="absolute right-1 bottom-1 text-6xl opacity-10 pointer-events-none select-none">{industryIcon(j.industry)}</div>
      <div className="relative">
        <Badge variant="secondary" className="text-[10px]">{INDUSTRY_LABEL[j.industry]}</Badge>
        <h3 className="text-sm font-semibold mt-1 truncate">{j.title}</h3>
        <p className="text-xs text-muted-foreground truncate mt-0.5">🏨 {j.place_name}</p>
        <p className="text-sm text-primary font-bold mt-1">{Number(j.daily_wage).toLocaleString()}원</p>
        <p className="text-[10px] text-muted-foreground mt-1">👥 지원 {counts[j.id] ?? 0} / 필요 {j.headcount ?? 1}명</p>
      </div>
    </Card>
  );

  return (
    <MobileLayout role="seeker">
      <div className="p-3 space-y-5">
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
