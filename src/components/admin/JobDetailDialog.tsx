import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

type Props = {
  job: any | null;
  company?: { company_name: string; contact_phone: string };
  statusLabel?: string;
  onOpenChange: (open: boolean) => void;
  onHide: (job: any) => void;
  onUnhide: (job: any) => void;
};

const STATUS_KO: Record<string, string> = {
  pending: "대기", approved: "승인", confirmed: "출근 확정", rejected: "거절", cancelled: "취소", no_show: "노쇼",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 py-2 border-b last:border-b-0 text-sm">
      <div className="text-muted-foreground">{label}</div>
      <div className="min-w-0 break-words whitespace-pre-wrap">{children}</div>
    </div>
  );
}

export function JobDetailDialog({ job, company, statusLabel, onOpenChange, onHide, onUnhide }: Props) {
  const { tIndustry, tRole } = useI18n();
  const [contact, setContact] = useState<string | null>(null);
  const [appCounts, setAppCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!job) return;
    setContact(null); setAppCounts({});
    (async () => {
      const [{ data: c }, { data: apps }] = await Promise.all([
        supabase.from("job_contacts").select("contact_phone").eq("job_id", job.id).maybeSingle(),
        supabase.from("job_applications").select("status").eq("job_id", job.id),
      ]);
      setContact(c?.contact_phone ?? null);
      const m: Record<string, number> = {};
      (apps ?? []).forEach((a: any) => { m[a.status] = (m[a.status] ?? 0) + 1; });
      setAppCounts(m);
    })();
  }, [job?.id]);

  const isMonthly = job?.contract_type === "monthly";
  const dates: string[] = Array.isArray(job?.work_dates) ? [...job.work_dates].sort() : [];
  const appTotal = Object.values(appCounts).reduce((a, b) => a + b, 0);

  return (
    <Dialog open={!!job} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap pr-6">
            <span>{job?.title}</span>
            {statusLabel && <Badge variant={job?.admin_hidden ? "destructive" : "secondary"}>{statusLabel}</Badge>}
          </DialogTitle>
        </DialogHeader>
        {job && (
          <div className="space-y-4">
            {job.photo_url && (
              <a href={job.photo_url} target="_blank" rel="noreferrer">
                <img src={job.photo_url} alt={job.title} className="w-full max-h-80 object-cover rounded-md border" />
              </a>
            )}
            {job.admin_hidden && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                관리자 비노출 처리됨{job.admin_hidden_at ? ` (${new Date(job.admin_hidden_at).toLocaleString()})` : ""}
                {job.admin_hidden_reason ? ` · 사유: ${job.admin_hidden_reason}` : ""}
              </div>
            )}
            <div>
              <Row label="업체(구인자)">{company?.company_name ?? "-"} {company?.contact_phone ? `· ${company.contact_phone}` : ""}</Row>
              <Row label="근무지명">{job.place_name}</Row>
              <Row label="주소">{job.location}</Row>
              <Row label="지역">{job.region ?? "-"}</Row>
              <Row label="업종 / 직무">{tIndustry(job.industry)} / {tRole(job.job_role)}</Row>
              <Row label="계약 형태">{isMonthly ? "단기 계약(월급)" : "일용직(일당)"}</Row>
              <Row label="급여">
                {isMonthly
                  ? `월 ${Number(job.monthly_wage ?? 0).toLocaleString()}원`
                  : `일 ${Number(job.daily_wage ?? 0).toLocaleString()}원`}
              </Row>
              <Row label="급여 지급일">{job.pay_day || "-"}</Row>
              {isMonthly ? (
                <Row label="계약 기간">{job.contract_months ? `${job.contract_months}개월` : "1개월 이상"}</Row>
              ) : (
                <Row label="근무일">
                  {dates.length === 0 ? "-" : `${dates.length}일: ${dates.join(", ")}`}
                </Row>
              )}
              <Row label="필요 인원">{job.headcount ?? 1}명</Row>
              {job.rooms_per_day ? <Row label="일일 객실수">{job.rooms_per_day}{job.rooms_unit === "실" ? "실" : " unit"}</Row> : null}
              <Row label="준비물">{job.preparations || "-"}</Row>
              <Row label="공고 연락처">{contact ?? "-"}</Row>
              <Row label="신청 현황">
                {appTotal === 0
                  ? "신청 없음"
                  : `총 ${appTotal}건 · ` + Object.entries(appCounts).map(([s, n]) => `${STATUS_KO[s] ?? s} ${n}`).join(", ")}
              </Row>
              <Row label="등록 / 수정">
                {new Date(job.created_at).toLocaleString()} / {new Date(job.updated_at).toLocaleString()} (수정 {job.edit_count ?? 0}회)
              </Row>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>닫기</Button>
          {job && (job.admin_hidden
            ? <Button variant="outline" onClick={() => onUnhide(job)}>노출 허용</Button>
            : <Button variant="destructive" onClick={() => onHide(job)}>강제 비노출</Button>)}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
