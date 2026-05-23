import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/MobileLayout";
import { RoleGate } from "@/components/RoleGate";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Heart, MapPin } from "lucide-react";
import { INDUSTRY_LABEL, ROLE_LABEL } from "@/lib/constants";
import { formatWorkDatesWithWeekday } from "@/lib/job-visuals";

export const Route = createFileRoute("/seeker/favorites")({
  component: () => <RoleGate role="seeker"><Page /></RoleGate>,
});

function Page() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [favs, setFavs] = useState<any[]>([]);
  const [jobsByKey, setJobsByKey] = useState<Record<string, any[]>>({});

  const load = async () => {
    if (!user) return;
    const { data: f, error } = await supabase
      .from("seeker_favorites")
      .select("*")
      .eq("seeker_id", user.id)
      .order("created_at", { ascending: false });
    if (error) return toast.error(error.message);
    setFavs(f ?? []);
    if ((f ?? []).length === 0) return setJobsByKey({});
    const empIds = Array.from(new Set((f ?? []).map((x) => x.employer_id)));
    const { data: jobs } = await supabase
      .from("jobs")
      .select("*")
      .in("employer_id", empIds)
      .eq("is_active", true);
    const map: Record<string, any[]> = {};
    (f ?? []).forEach((fav) => {
      const key = `${fav.employer_id}__${fav.place_name}`;
      map[key] = (jobs ?? []).filter(
        (j: any) => j.employer_id === fav.employer_id && j.place_name === fav.place_name
      );
    });
    setJobsByKey(map);
  };
  useEffect(() => { load(); }, [user]);

  const removeFav = async (id: string) => {
    if (!confirm("즐겨찾기에서 삭제하시겠습니까?")) return;
    const { error } = await supabase.from("seeker_favorites").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("삭제되었습니다");
    load();
  };

  return (
    <MobileLayout role="seeker">
      <div className="p-3 space-y-3">
        <h2 className="font-bold flex items-center gap-1"><Heart size={18} className="text-rose-500 fill-rose-500" /> 즐겨찾는 일터</h2>
        {favs.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-12">
            즐겨찾는 일터가 없습니다.<br />공고 상세에서 ♥ 버튼을 눌러 등록하세요.
          </p>
        )}
        {favs.map((f) => {
          const list = jobsByKey[`${f.employer_id}__${f.place_name}`] ?? [];
          return (
            <Card key={f.id} className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold flex items-center gap-1"><MapPin size={14} className="text-muted-foreground" />{f.place_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">진행중 공고 {list.length}건</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => removeFav(f.id)}>
                  <Heart size={16} className="text-rose-500 fill-rose-500" />
                </Button>
              </div>
              {list.length === 0 ? (
                <p className="text-xs text-muted-foreground">현재 진행중인 공고가 없습니다</p>
              ) : (
                <div className="space-y-1.5">
                  {list.map((j) => (
                    <button
                      key={j.id}
                      onClick={() => nav({ to: "/seeker/jobs/$id", params: { id: j.id } })}
                      className="w-full text-left p-2 rounded border hover:bg-muted/40"
                    >
                      <div className="flex gap-1 flex-wrap mb-0.5">
                        <Badge variant="secondary" className="text-[10px]">{INDUSTRY_LABEL[j.industry]}</Badge>
                        <Badge variant="outline" className="text-[10px]">{ROLE_LABEL[j.job_role]}</Badge>
                      </div>
                      <p className="text-sm font-semibold truncate">{j.title}</p>
                      <p className="text-xs text-primary font-bold">
                        일당 {Number(j.daily_wage).toLocaleString()}원 · {formatWorkDatesWithWeekday(j.work_dates) || "협의"}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </MobileLayout>
  );
}
