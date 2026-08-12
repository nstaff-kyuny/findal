import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/MobileLayout";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useServerFn } from "@tanstack/react-start";
import { listMyRefundRequests, cancelMyRefundRequest } from "@/lib/refunds.functions";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/employer/credits_/history")({
  component: () => <RoleGate role="employer"><Page /></RoleGate>,
});

type Filter = "all" | "purchase" | "usage" | "refund";

const REFUND_STATUS_KO: Record<string, string> = {
  pending: "심사중", approved: "승인", completed: "환불완료", rejected: "거절", cancelled: "신청취소",
};

function todayStr() { return new Date().toISOString().slice(0, 10); }
function daysAgoStr(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const STATUS_LABEL: Record<string, string> = { pending: "대기", approved: "승인", rejected: "거절", confirmed: "✅ 출근 확정", no_show: "노쇼", cancelled: "취소" };

function prettyTitle(note: string | null, type: string): string {
  if (!note) return type;
  // Replace bare UUIDs in the note (e.g. "신청 승인: <uuid>") with friendlier text
  if (type === "approval_use") return note.replace(UUID_RE, "").replace(/[:：]\s*$/, "").trim() || "신청 승인";
  return note;
}

function Page() {
  const { user } = useAuth();
  const [tx, setTx] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [from, setFrom] = useState(daysAgoStr(30));
  const [to, setTo] = useState(todayStr());
  const [detail, setDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refunds, setRefunds] = useState<any[]>([]);
  const fetchRefunds = useServerFn(listMyRefundRequests);
  const cancelRefund = useServerFn(cancelMyRefundRequest);

  const loadRefunds = async () => {
    try { setRefunds(await fetchRefunds({})); } catch { setRefunds([]); }
  };
  useEffect(() => { loadRefunds(); }, []);

  useEffect(() => { if (!user) return; (async () => {
    const { data: t } = await supabase.from("credit_transactions")
      .select("*").eq("employer_id", user.id).order("created_at", { ascending: false }).limit(500);
    setTx(t ?? []);
    const { data: p } = await supabase.from("credit_purchase_requests")
      .select("*").eq("employer_id", user.id).order("created_at", { ascending: false }).limit(500);
    setPurchases(p ?? []);
  })(); }, [user]);

  const openApprovalDetail = async (rawNote: string | null, txRow: any) => {
    const match = rawNote?.match(UUID_RE);
    if (!match) { toast.error("연결된 신청 정보를 찾을 수 없습니다"); return; }
    const appId = match[0];
    setDetail({ loading: true, txRow });
    setDetailLoading(true);
    try {
      const { data: app, error } = await supabase
        .from("job_applications")
        .select("*")
        .eq("id", appId)
        .maybeSingle();
      if (error) throw error;
      if (!app) { toast.error("신청을 찾을 수 없습니다 (삭제되었을 수 있음)"); setDetail(null); return; }
      const [jobRes, profRes] = await Promise.all([
        supabase.from("jobs").select("id, title, place_name, location, daily_wage, work_dates").eq("id", app.job_id).maybeSingle(),
        supabase.from("profiles").select("id, full_name, phone").eq("id", app.seeker_id).maybeSingle(),
      ]);
      setDetail({ app, job: jobRes.data, profile: profRes.data, txRow });
    } catch (e: any) {
      toast.error(e?.message ?? "불러오기 실패");
      setDetail(null);
    } finally { setDetailLoading(false); }
  };

  const items = useMemo(() => {
    const fromTs = from ? new Date(from + "T00:00:00").getTime() : 0;
    const toTs = to ? new Date(to + "T23:59:59").getTime() : Date.now();
    const purchaseItems = purchases.map(p => ({
      id: `p-${p.id}`, kind: "purchase" as const, created_at: p.created_at,
      title: `${p.pack} 크레딧 · ${Number(p.amount_krw).toLocaleString()}원`,
      sub: p.status === "fulfilled" ? "결제완료" : "결제대기",
      delta: null as number | null, status: p.status, raw: p,
    }));
    const txItems = tx.map(t => ({
      id: `t-${t.id}`, kind: "usage" as const, created_at: t.created_at,
      title: prettyTitle(t.note, t.type), sub: "", delta: t.delta as number, status: null, raw: t,
    }));
    let merged = [...purchaseItems, ...txItems];
    if (filter === "purchase") merged = purchaseItems;
    if (filter === "usage") merged = txItems;
    merged = merged.filter(i => {
      const ts = new Date(i.created_at).getTime();
      return ts >= fromTs && ts <= toTs;
    });
    return merged.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  }, [tx, purchases, filter, from, to]);

  return (
    <MobileLayout role="employer">
      <div className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base">크레딧 내역</h2>
          <Link to="/employer/credits"><Button size="sm" variant="ghost">← 크레딧</Button></Link>
        </div>

        <div className="flex gap-1.5">
          {(["all", "purchase", "usage", "refund"] as const).map(f => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"}
              className="flex-1" onClick={() => setFilter(f)}>
              {f === "all" ? "전체" : f === "purchase" ? "구매" : f === "usage" ? "사용" : "환불"}
            </Button>
          ))}
        </div>

        <Card><CardContent className="p-3 space-y-2">
          <Label className="text-xs">기간 선택</Label>
          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
            <span className="text-muted-foreground">~</span>
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <div className="flex gap-1 flex-wrap">
            {[
              { label: "7일", n: 7 }, { label: "30일", n: 30 }, { label: "90일", n: 90 },
            ].map(p => (
              <Button key={p.n} size="sm" variant="outline"
                onClick={() => { setFrom(daysAgoStr(p.n)); setTo(todayStr()); }}>{p.label}</Button>
            ))}
          </div>
        </CardContent></Card>

        <div className="space-y-1">
          {items.length === 0 && <p className="text-center text-xs text-muted-foreground py-8">내역이 없습니다</p>}
          {items.map(i => {
            const isApproval = i.kind === "usage" && i.raw?.type === "approval_use";
            const clickable = isApproval;
            return (
              <button
                key={i.id}
                type="button"
                disabled={!clickable}
                onClick={() => clickable && openApprovalDetail(i.raw?.note ?? null, i.raw)}
                className={`w-full flex justify-between items-center text-sm px-2 py-2 border-b text-left ${clickable ? "hover:bg-muted/50 active:bg-muted" : "cursor-default"}`}
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">
                    {i.title}
                    {clickable && <span className="ml-1 text-[10px] text-primary">상세보기 ▸</span>}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{new Date(i.created_at).toLocaleString("ko-KR")}</p>
                </div>
                {i.kind === "purchase" ? (
                  <Badge variant={i.status === "fulfilled" ? "default" : "secondary"}>{i.sub}</Badge>
                ) : (
                  <p className={`font-bold ${(i.delta ?? 0) > 0 ? "text-green-600" : "text-red-600"}`}>
                    {(i.delta ?? 0) > 0 ? "+" : ""}{i.delta}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>신청 승인 상세</DialogTitle>
            <DialogDescription>
              {detail?.txRow && (
                <>
                  {new Date(detail.txRow.created_at).toLocaleString("ko-KR")} · {detail.txRow.delta} 크레딧
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <p className="text-sm text-muted-foreground text-center py-6">불러오는 중...</p>
          ) : detail?.app ? (
            <div className="space-y-2 text-sm">
              <Row label="공고" value={detail.job?.title ?? "-"} />
              <Row label="장소" value={detail.job?.place_name ?? "-"} />
              <Row label="지역" value={detail.job?.location ?? "-"} />
              <Row label="일당" value={detail.job?.daily_wage ? `${Number(detail.job.daily_wage).toLocaleString()}원` : "-"} />
              <Row label="근무일" value={(detail.job?.work_dates ?? []).join(", ") || "-"} />
              <hr className="my-1" />
              <Row label="구직자" value={detail.profile?.full_name ?? "(이름미입력)"} />
              <Row label="연락처" value={detail.profile?.phone ?? "-"} />
              <Row label="현재상태" value={STATUS_LABEL[detail.app.status] ?? detail.app.status} />
              {detail.app.message && (
                <div>
                  <p className="text-xs text-muted-foreground">신청 메모</p>
                  <p className="text-xs italic">"{detail.app.message}"</p>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-medium text-right break-all">{value}</span>
    </div>
  );
}
