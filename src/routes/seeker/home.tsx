import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/MobileLayout";
import { RoleGate } from "@/components/RoleGate";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { INDUSTRY_LABEL, ROLE_LABEL, REGIONS } from "@/lib/constants";
import { formatWorkDatesWithWeekday } from "@/lib/job-visuals";
import { MapPin, Search, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { parseRegions } from "@/components/RegionPicker";

export const Route = createFileRoute("/seeker/home")({ component: () => <RoleGate role="seeker"><Page /></RoleGate> });

const CATEGORIES: { key: string; label: string; industries: string[] }[] = [
  { key: "all", label: "전체", industries: [] },
  { key: "lodging", label: "호텔/모텔/리조트", industries: ["hotel", "motel", "resort"] },
  { key: "restaurant", label: "식당", industries: ["restaurant"] },
  { key: "medical", label: "병원/요양", industries: ["hospital", "nursing"] },
];

function Page() {
  const { user } = useAuth();
  const [region, setRegion] = useState("all");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [jobs, setJobs] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [prefRegions, setPrefRegions] = useState<string[]>([]);
  const [prefOnly, setPrefOnly] = useState(true);
  const touchStartY = useRef<number | null>(null);
  const nav = useNavigate();

  useEffect(() => { (async () => {
    if (!user) return;
    const { data: sp } = await supabase.from("seeker_profiles")
      .select("preferred_region").eq("user_id", user.id).maybeSingle();
    setPrefRegions(parseRegions(sp?.preferred_region));
  })(); }, [user]);

  useEffect(() => { (async () => {
    let qb = supabase.from("jobs").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(100);
    if (region !== "all") qb = qb.eq("region", region);
    else if (prefOnly && prefRegions.length > 0) qb = qb.in("region", prefRegions);
    if (q) qb = qb.ilike("title", `%${q}%`);
    const cat = CATEGORIES.find(c => c.key === category);
    if (cat && cat.industries.length) qb = qb.in("industry", cat.industries as any);
    const { data } = await qb;
    setJobs(data ?? []);
  })(); }, [region, q, category, prefOnly, prefRegions]);

  // Swipe down to reveal, swipe up to hide
  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => { touchStartY.current = e.touches[0].clientY; };
    const onTouchMove = (e: TouchEvent) => {
      if (touchStartY.current == null) return;
      const dy = e.touches[0].clientY - touchStartY.current;
      if (window.scrollY < 10 && dy > 40) { setShowSearch(true); touchStartY.current = null; }
      if (dy < -40) { setShowSearch(false); touchStartY.current = null; }
    };
    const onTouchEnd = () => { touchStartY.current = null; };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  return (
    <MobileLayout role="seeker">
      {/* Pull tab */}
      <button
        onClick={() => setShowSearch(v => !v)}
        className="sticky top-[57px] z-30 w-full bg-background border-b flex items-center justify-center gap-1 py-1.5 text-xs text-muted-foreground"
        aria-label="검색 열기"
      >
        {showSearch ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        <Search size={12} />
        <span>{showSearch ? "검색 닫기" : "쓸어내려 검색하기"}</span>
      </button>

      {showSearch && (
        <div className="p-3 space-y-2 bg-background border-b">
          <div className="flex gap-2">
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger className="w-28 h-9 text-xs"><SelectValue placeholder="지역" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 지역</SelectItem>
                {REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="공고 검색" className="pl-7 h-9 text-sm" />
            </div>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map(c => (
              <Button key={c.key} size="sm" variant={category === c.key ? "default" : "outline"} onClick={() => setCategory(c.key)} className="text-xs h-7">
                {c.label}
              </Button>
            ))}
          </div>
          {prefRegions.length > 0 && (
            <Button
              size="sm"
              variant={prefOnly && region === "all" ? "default" : "outline"}
              className="text-xs h-7"
              onClick={() => { setPrefOnly(v => !v); setRegion("all"); }}
            >
              <MapPin size={12} className="mr-1" />
              선호지역만 보기
            </Button>
          )}
        </div>
      )}

      <div className="p-3 space-y-2">
        <Link to="/guide/$role" params={{ role: "seeker" }}>
          <Card
            className="p-3 text-white flex items-center gap-2 border-transparent"
            style={{ backgroundColor: "#0047AB" }}
          >
            <BookOpen size={18} />
            <span className="text-sm font-semibold flex-1">앱 사용법 확인 (신청·승인·확정·노쇼 안내)</span>
            <span>→</span>
          </Card>
        </Link>
        {jobs.length === 0 && <div className="text-center text-sm text-muted-foreground py-12">공고가 없습니다</div>}
        {jobs.map(j => (
          <Card key={j.id} className="p-3 cursor-pointer" onClick={() => nav({ to: "/seeker/jobs/$id", params: { id: j.id } })}>
            <div className="flex gap-3">
              {j.photo_url ? (
                <img src={j.photo_url} className="w-20 h-20 rounded object-cover" alt={j.title} />
              ) : (
                <div className="w-20 h-20 rounded bg-muted flex items-center justify-center text-2xl">🏢</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex gap-1 flex-wrap mb-1">
                  <Badge variant="secondary" className="text-xs">{INDUSTRY_LABEL[j.industry]}</Badge>
                  <Badge variant="outline" className="text-xs">{ROLE_LABEL[j.job_role]}</Badge>
                </div>
                <h3 className="font-semibold text-sm truncate">{j.title}</h3>
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1"><MapPin size={10} />{j.place_name}</p>
                <p className="text-sm font-bold text-primary mt-1">일당 {Number(j.daily_wage).toLocaleString()}원</p>
              </div>
              <div className="flex flex-col items-end justify-start shrink-0 text-right">
                <span className="text-xs text-muted-foreground">근무일</span>
                <span className="text-sm font-semibold text-foreground leading-tight whitespace-pre-line">
                  {formatWorkDatesWithWeekday(j.work_dates)?.split(", ").slice(0, 2).join("\n") || "협의"}
                </span>
              </div>
            </div>
          </Card>
        ))}
        <Link to="/seeker/featured" className="block text-center text-xs text-primary py-3">⭐ 추천 공고 보러가기 →</Link>
      </div>
    </MobileLayout>
  );
}
