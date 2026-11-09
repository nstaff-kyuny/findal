import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { isJobCompleted } from "@/lib/job-visuals";
import { useI18n } from "@/lib/i18n";
import { jobModerationStatus, type JobModerationStatus } from "@/lib/job-moderation";

const STATUS_LABEL: Record<JobModerationStatus, string> = {
  live: "노출중",
  admin_hidden: "관리자 비노출",
  inactive: "구인자 비활성",
  completed: "마감",
};

export function JobsModerationTab() {
  const { tIndustry, tRole } = useI18n();
  const [jobs, setJobs] = useState<any[]>([]);
  const [companies, setCompanies] = useState<Record<string, { company_name: string; contact_phone: string }>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"live" | "admin_hidden" | "inactive" | "all">("live");
  const [q, setQ] = useState("");
  const [target, setTarget] = useState<any | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("jobs").select("*").order("created_at", { ascending: false }).limit(1000);
    if (error) toast.error(error.message);
    const list = data ?? [];
    setJobs(list);
    const ids = Array.from(new Set(list.map((j: any) => j.employer_id)));
    if (ids.length) {
      const { data: eps } = await supabase.from("employer_profiles").select("user_id, company_name, contact_phone").in("user_id", ids);
      const m: Record<string, { company_name: string; contact_phone: string }> = {};
      (eps ?? []).forEach((e: any) => { m[e.user_id] = { company_name: e.company_name, contact_phone: e.contact_phone }; });
      setCompanies(m);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const withStatus = useMemo(
    () => jobs.map((j) => ({ ...j, _status: jobModerationStatus(j, isJobCompleted(j)) as JobModerationStatus })),
    [jobs],
  );
  const counts = useMemo(() => {
    const c = { live: 0, admin_hidden: 0, inactive: 0, completed: 0 };
    withStatus.forEach((j) => { c[j._status]++; });
    return c;
  }, [withStatus]);

  const shown = withStatus.filter((j) => {
    if (filter === "live" && j._status !== "live") return false;
    if (filter === "admin_hidden" && j._status !== "admin_hidden") return false;
    if (filter === "inactive" && !(j._status === "inactive" || j._status === "completed")) return false;
    const s = q.trim().toLowerCase();
    if (!s) return true;
    const comp = companies[j.employer_id]?.company_name ?? "";
    return [j.title, j.place_name, j.region, j.location, comp].some((v) => String(v ?? "").toLowerCase().includes(s));
  });

  const setHidden = async (job: any, hidden: boolean, why?: string) => {
    setBusy(true);
    const { error } = await supabase.rpc("admin_set_job_hidden" as any, { _job_id: job.id, _hidden: hidden, _reason: why ?? null } as any);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(hidden ? "공고를 비노출 처리했습니다. 구인자에게 알림이 전송됩니다." : "공고 노출을 다시 허용했습니다.");
    setTarget(null); setReason("");
    load();
  };

  const wageText = (j: any) =>
    j.contract_type === "monthly"
      ? `월 ${Number(j.monthly_wage ?? 0).toLocaleString()}원`
      : `일 ${Number(j.daily_wage ?? 0).toLocaleString()}원`;
  const datesText = (j: any) => {
    if (j.contract_type === "monthly") return j.contract_months ? `${j.contract_months}개월` : "단기";
    const d: string[] = Array.isArray(j.work_dates) ? [...j.work_dates].sort() : [];
    if (d.length === 0) return "-";
    return d.length === 1 ? d[0] : `${d[0]} ~ ${d[d.length - 1]} (${d.length}일)`;
  };

  return (
    <Card><CardContent className="p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-lg">공고 노출 관리</h3>
          <p className="text-sm text-muted-foreground">
            부적절한 공고를 강제로 비노출할 수 있습니다. 비노출된 공고는 구직자 화면에서 사라지고, 구인자가 직접 다시 켤 수 없습니다.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>새로고침</Button>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Badge>노출중 {counts.live}</Badge>
        <Badge variant="destructive">관리자 비노출 {counts.admin_hidden}</Badge>
        <Badge variant="secondary">구인자 비활성 {counts.inactive}</Badge>
        <Badge variant="outline">마감 {counts.completed}</Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="live">노출중인 공고</SelectItem>
            <SelectItem value="admin_hidden">관리자 비노출</SelectItem>
            <SelectItem value="inactive">비활성·마감</SelectItem>
            <SelectItem value="all">전체</SelectItem>
          </SelectContent>
        </Select>
        <Input className="w-72" placeholder="공고명, 업체명, 지역 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="text-sm text-muted-foreground self-center">표시 {shown.length}건</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b text-muted-foreground">
              <th className="py-2 pr-2">등록일</th>
              <th className="pr-2">업체(구인자)</th>
              <th className="pr-2">공고</th>
              <th className="pr-2">지역</th>
              <th className="pr-2">급여</th>
              <th className="pr-2">근무일</th>
              <th className="pr-2">상태</th>
              <th className="text-right">관리</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">불러오는 중...</td></tr>}
            {!loading && shown.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">해당하는 공고가 없습니다</td></tr>}
            {!loading && shown.map((j) => {
              const comp = companies[j.employer_id];
              return (
                <tr key={j.id} className="border-b align-top">
                  <td className="py-2 pr-2 text-xs whitespace-nowrap">{new Date(j.created_at).toLocaleDateString()}</td>
                  <td className="pr-2">
                    <div className="font-medium">{comp?.company_name ?? "-"}</div>
                    <div className="text-xs text-muted-foreground">{comp?.contact_phone ?? ""}</div>
                  </td>
                  <td className="pr-2 max-w-xs">
                    <div className="font-medium flex items-center gap-2">
                      {j.photo_url && <img src={j.photo_url} alt="" className="w-8 h-8 rounded object-cover shrink-0" />}
                      <span className="truncate">{j.title}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{j.place_name} · {tIndustry(j.industry)} / {tRole(j.job_role)}</div>
                    {j._status === "admin_hidden" && j.admin_hidden_reason && (
                      <div className="text-xs text-destructive mt-0.5">사유: {j.admin_hidden_reason}</div>
                    )}
                  </td>
                  <td className="pr-2 text-xs">{j.region ?? j.location}</td>
                  <td className="pr-2 text-xs whitespace-nowrap">{wageText(j)}</td>
                  <td className="pr-2 text-xs">{datesText(j)}</td>
                  <td className="pr-2">
                    <Badge
                      variant={j._status === "live" ? "default" : j._status === "admin_hidden" ? "destructive" : j._status === "inactive" ? "secondary" : "outline"}
                      className="whitespace-nowrap"
                    >
                      {STATUS_LABEL[j._status as JobModerationStatus]}
                    </Badge>
                    {j._status === "admin_hidden" && j.admin_hidden_at && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">{new Date(j.admin_hidden_at).toLocaleDateString()}</div>
                    )}
                  </td>
                  <td className="text-right whitespace-nowrap">
                    {j.admin_hidden ? (
                      <Button size="sm" variant="outline" disabled={busy}
                        onClick={() => { if (confirm("이 공고를 다시 노출할까요? 구직자 화면에 다시 보이게 됩니다.")) setHidden(j, false); }}>
                        노출 허용
                      </Button>
                    ) : (
                      <Button size="sm" variant="destructive" disabled={busy} onClick={() => { setTarget(j); setReason(""); }}>
                        강제 비노출
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!target} onOpenChange={(o) => { if (!o) setTarget(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>공고 강제 비노출</DialogTitle></DialogHeader>
          {target && (
            <div className="space-y-3">
              <div className="text-sm">
                <div className="font-medium">{target.title}</div>
                <div className="text-muted-foreground">{companies[target.employer_id]?.company_name ?? ""} · {target.place_name}</div>
              </div>
              <div className="space-y-1">
                <Label>비노출 사유 (구인자에게 알림으로 전달됩니다)</Label>
                <Textarea rows={3} placeholder="예: 서비스 목적과 맞지 않는 광고성 공고" value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">
                비노출하면 구직자 홈·추천·검색에서 즉시 사라지며, 구인자는 직접 다시 활성화할 수 없습니다.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>취소</Button>
            <Button variant="destructive" disabled={busy} onClick={() => target && setHidden(target, true, reason)}>비노출 처리</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CardContent></Card>
  );
}
