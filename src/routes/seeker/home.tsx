import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/MobileLayout";
import { RoleGate } from "@/components/RoleGate";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { INDUSTRY_LABEL, ROLE_LABEL, REGIONS } from "@/lib/constants";
import { MapPin, Search, Navigation, CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/seeker/home")({ component: () => <RoleGate role="seeker"><Page /></RoleGate> });

const CATEGORIES: { key: string; label: string; industries: string[] }[] = [
  { key: "all", label: "전체", industries: [] },
  { key: "lodging", label: "호텔/모텔/리조트", industries: ["hotel", "motel", "resort"] },
  { key: "restaurant", label: "식당", industries: ["restaurant"] },
  { key: "medical", label: "병원/요양", industries: ["hospital", "nursing"] },
];

function Page() {
  const [region, setRegion] = useState("all");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [jobs, setJobs] = useState<any[]>([]);
  const [nearby, setNearby] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const nav = useNavigate();

  const toYMD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

  useEffect(() => { (async () => {
    let qb = supabase.from("jobs").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(100);
    if (region !== "all") qb = qb.eq("region", region);
    if (q) qb = qb.ilike("title", `%${q}%`);
    const cat = CATEGORIES.find(c => c.key === category);
    if (cat && cat.industries.length) qb = qb.in("industry", cat.industries as any);
    if (selectedDate) qb = qb.contains("work_dates", [toYMD(selectedDate)]);
    const { data } = await qb;
    setJobs(data ?? []);
  })(); }, [region, q, category, selectedDate]);

  return (
    <MobileLayout role="seeker">
      <div className="p-3 space-y-3 sticky top-[57px] bg-muted/30 z-30 pt-3">
        <div className="flex gap-2">
          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger className="w-32"><SelectValue placeholder="지역" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 지역</SelectItem>
              {REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="공고 검색" className="pl-7" />
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map(c => (
            <Button key={c.key} size="sm" variant={category === c.key ? "default" : "outline"} onClick={() => setCategory(c.key)} className="text-xs">
              {c.label}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={selectedDate ? "default" : "outline"} size="sm" className={cn("flex-1 justify-start text-xs", !selectedDate && "text-muted-foreground")}>
                <CalendarIcon size={14} className="mr-1" />
                {selectedDate ? `${selectedDate.getMonth()+1}/${selectedDate.getDate()} 근무일 공고` : "날짜로 공고 찾기"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          {selectedDate && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedDate(undefined)}><X size={14} /></Button>
          )}
        </div>
        <Button variant={nearby ? "default" : "outline"} size="sm" className="w-full" onClick={() => setNearby(!nearby)}>
          <Navigation size={14} className="mr-1" /> 위치기반으로 찾기
        </Button>
      </div>
      <div className="p-3 space-y-2">
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
                  <Badge variant="secondary" className="text-[10px]">{INDUSTRY_LABEL[j.industry]}</Badge>
                  <Badge variant="outline" className="text-[10px]">{ROLE_LABEL[j.job_role]}</Badge>
                </div>
                <h3 className="font-semibold text-sm truncate">{j.title}</h3>
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1"><MapPin size={10} />{j.place_name}</p>
                <p className="text-sm font-bold text-primary mt-1">일당 {Number(j.daily_wage).toLocaleString()}원</p>
              </div>
            </div>
          </Card>
        ))}
        <Link to="/seeker/featured" className="block text-center text-xs text-primary py-3">⭐ 추천 공고 보러가기 →</Link>
      </div>
    </MobileLayout>
  );
}
