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

  const premiumCard = (j: any) => (
    <Card key={j.id} className="p-2 cursor-pointer" onClick={() => nav({ to: "/seeker/jobs/$id", params: { id: j.id } })}>
      {j.photo_url ? (
        <img src={j.photo_url} className="w-full h-24 rounded object-cover mb-1" alt={j.title} />
      ) : <div className="w-full h-24 rounded bg-muted flex items-center justify-center text-2xl mb-1">🏢</div>}
      <Badge variant="secondary" className="text-[10px]">{INDUSTRY_LABEL[j.industry]}</Badge>
      <h3 className="text-xs font-semibold mt-1 truncate">{j.title}</h3>
      <p className="text-[11px] text-muted-foreground truncate">🏨 {j.place_name}</p>
      <p className="text-xs text-primary font-bold">{Number(j.daily_wage).toLocaleString()}원</p>
      <p className="text-[10px] text-muted-foreground mt-1">👥 지원 {counts[j.id] ?? 0} / 필요 {j.headcount ?? 1}명</p>
    </Card>
  );

  const todayCard = (j: any) => (
    <Card key={j.id} className="p-3 cursor-pointer" onClick={() => nav({ to: "/seeker/jobs/$id", params: { id: j.id } })}>
      <Badge variant="secondary" className="text-[10px]">{INDUSTRY_LABEL[j.industry]}</Badge>
      <h3 className="text-sm font-semibold mt-1 truncate">{j.title}</h3>
      <p className="text-xs text-muted-foreground truncate mt-0.5">🏨 {j.place_name}</p>
      <p className="text-sm text-primary font-bold mt-1">{Number(j.daily_wage).toLocaleString()}원</p>
      <p className="text-[10px] text-muted-foreground mt-1">👥 지원 {counts[j.id] ?? 0} / 필요 {j.headcount ?? 1}명</p>
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
