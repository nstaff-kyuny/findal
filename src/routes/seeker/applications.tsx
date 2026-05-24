import { createFileRoute } from "@tanstack/react-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/MobileLayout";
import { RoleGate } from "@/components/RoleGate";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useI18n, useDynamicTranslate } from "@/lib/i18n";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

const STATUS_KEY: Record<string,string> = { pending:"st_pending", approved:"st_approved", rejected:"st_rejected", confirmed:"st_confirmed", no_show:"st_no_show", cancelled:"st_cancelled" };
const STATUS_VARIANT: Record<string, any> = { approved:"default", rejected:"destructive", no_show:"destructive", pending:"secondary" };
const STATUS_CLASS: Record<string,string> = { confirmed: "bg-orange-500 hover:bg-orange-500 text-white border-transparent" };

export const Route = createFileRoute("/seeker/applications")({ component: () => <RoleGate role="seeker"><Page /></RoleGate> });

function Page() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [apps, setApps] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [filter, setFilter] = useState<"day"|"week"|"month">("month");
  const [topTab, setTopTab] = useState<"list"|"calendar">("list");
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  });
  const pdfRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (!user) return;
    const { data: appsData, error } = await supabase.from("job_applications")
      .select("*").eq("seeker_id", user.id).order("created_at", { ascending: false });
    if (error) { toast.error(error.message); return; }
    const list = appsData ?? [];
    const jobIds = Array.from(new Set(list.map((a: any) => a.job_id)));
    const jobsRes = jobIds.length
      ? await supabase.from("jobs").select("id, title, place_name, daily_wage, work_dates").in("id", jobIds)
      : { data: [] as any[] };
    // Fetch contact_phone only for approved/confirmed applications (RLS enforces this)
    const approvedJobIds = list
      .filter((a: any) => a.status === "approved" || a.status === "confirmed")
      .map((a: any) => a.job_id);
    const contactsRes = approvedJobIds.length
      ? await supabase.from("job_contacts").select("job_id, contact_phone").in("job_id", approvedJobIds)
      : { data: [] as any[] };
    const contactsMap = new Map((contactsRes.data ?? []).map((c: any) => [c.job_id, c.contact_phone]));
    const jobsMap = new Map((jobsRes.data ?? []).map((j: any) => [j.id, { ...j, contact_phone: contactsMap.get(j.id) ?? null }]));
    setApps(list.map((a: any) => ({ ...a, jobs: jobsMap.get(a.job_id) })));
    const { data: p } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
    setProfile(p);
  };
  useEffect(() => { load(); }, [user]);

  const confirmApp = async (id: string) => {
    const { error } = await supabase.rpc("seeker_confirm_application", { _app_id: id } as any);
    if (error) return toast.error(error.message);
    toast.success("확정 완료! 구인자에게 알림이 전달됩니다.");
    load();
  };

  const cancelApp = async (id: string) => {
    if (!confirm("신청을 취소하시겠습니까?")) return;
    const { error } = await supabase.from("job_applications")
      .update({ status: "cancelled" } as any).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("신청이 취소되었습니다");
    load();
  };

  const filtered = useMemo(() => {
    const cutoff = new Date();
    if (filter === "day") cutoff.setDate(cutoff.getDate() - 1);
    if (filter === "week") cutoff.setDate(cutoff.getDate() - 7);
    if (filter === "month") cutoff.setMonth(cutoff.getMonth() - 1);
    return apps.filter(a => new Date(a.created_at) >= cutoff);
  }, [apps, filter]);

  const approved = filtered.filter(a => a.status === "approved");

  const buildByDay = (statuses: string[]) => {
    const [y, m] = calMonth.split("-").map(Number);
    const map = new Map<string, any[]>();
    apps.filter(a => statuses.includes(a.status)).forEach(a => {
      const dates: string[] = a.jobs?.work_dates ?? [];
      dates.forEach((d: string) => {
        const dt = new Date(d);
        if (dt.getFullYear() === y && dt.getMonth() + 1 === m) {
          if (!map.has(d)) map.set(d, []);
          map.get(d)!.push(a);
        }
      });
    });
    return map;
  };
  const confirmedByDay = useMemo(() => buildByDay(["confirmed", "no_show"]), [apps, calMonth]);
  const confirmedByDayForPdf = useMemo(() => buildByDay(["confirmed"]), [apps, calMonth]);


  const downloadPdf = async () => {
    if (!pdfRef.current) return;
    toast.info("PDF 생성 중...");
    try {
      const canvas = await html2canvas(pdfRef.current, { scale: 2, backgroundColor: "#ffffff" });
      const img = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = 210;
      const imgH = (canvas.height * pageW) / canvas.width;
      pdf.addImage(img, "JPEG", 0, 0, pageW, imgH);
      pdf.save(`근무기록_${calMonth}.pdf`);
    } catch (e: any) {
      toast.error("PDF 생성 실패: " + e.message);
    }
  };

  return (
    <MobileLayout role="seeker">
      <div className="p-3 space-y-3">
        <h2 className="font-bold">나의 신청 내역</h2>
        <Tabs value={topTab} onValueChange={(v: any) => setTopTab(v)}>
          <TabsList className="grid grid-cols-2 w-full h-12">
            <TabsTrigger value="list" className="text-base font-semibold h-10">전체 내역</TabsTrigger>
            <TabsTrigger value="calendar" className="text-base font-semibold h-10">일한 기록 보기</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-3">
            <Tabs value={filter} onValueChange={(v: any) => setFilter(v)}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="day">일</TabsTrigger>
                <TabsTrigger value="week">주</TabsTrigger>
                <TabsTrigger value="month">월</TabsTrigger>
              </TabsList>
              <TabsContent value={filter} className="mt-3">
                <div className="text-xs text-muted-foreground mb-2">총 {filtered.length}건 · 승인 {approved.length}건</div>
                <div className="space-y-2">
                  {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-12">기록이 없습니다</p>}
                  {filtered.map(a => (
                    <Card key={a.id} className="p-4 space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <h4 className="font-semibold text-base">{a.jobs?.title}</h4>
                          <p className="text-sm text-muted-foreground">{a.jobs?.place_name} · {Number(a.jobs?.daily_wage ?? 0).toLocaleString()}원</p>
                          <p className="text-sm text-muted-foreground mt-1">{new Date(a.created_at).toLocaleString("ko-KR")}</p>
                        </div>
                        <Badge variant={STATUS_VARIANT[a.status] ?? "secondary"} className={`text-sm px-3 py-1 ${STATUS_CLASS[a.status] ?? ""}`}>{STATUS_LABEL[a.status] ?? a.status}</Badge>
                      </div>
                      {a.status === "pending" && (
                        <Button size="lg" variant="outline" className="w-full" onClick={() => cancelApp(a.id)}>신청 취소</Button>
                      )}
                      {a.status === "approved" && (
                        <div className="grid grid-cols-2 gap-2">
                          <Button size="lg" className="text-base font-bold py-6" onClick={() => confirmApp(a.id)}>✋ 갈께요 (최종확정)</Button>
                          <Button size="lg" variant="outline" className="text-base" onClick={() => cancelApp(a.id)}>신청 취소</Button>
                        </div>
                      )}
                      {a.status === "confirmed" && (
                        <div className="grid grid-cols-2 gap-2">
                          {a.jobs?.contact_phone ? (
                            <a href={`tel:${a.jobs.contact_phone}`} className="block">
                              <Button size="lg" className="w-full text-base font-semibold">연락하기</Button>
                            </a>
                          ) : (
                            <Button size="lg" className="w-full text-base font-semibold" disabled>연락하기</Button>
                          )}
                          <a href={`/seeker/jobs/${a.job_id}?from=apps`} className="block">
                            <Button size="lg" variant="outline" className="w-full text-base font-semibold border-orange-500 text-orange-600 hover:bg-orange-50">일자리(승인) 확인</Button>
                          </a>
                        </div>
                      )}
                      {a.status === "no_show" && (
                        <p className="text-sm text-destructive text-center font-semibold">⚠️ 노쇼 처리됨</p>
                      )}
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="calendar" className="mt-3 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="month"
                value={calMonth}
                onChange={(e) => setCalMonth(e.target.value)}
                className="flex-1 h-10 px-3 rounded-md border bg-background text-sm"
              />
              <Button onClick={downloadPdf}>PDF 다운로드</Button>
            </div>
            <p className="text-xs text-muted-foreground">확정 된 기록만 표시됩니다.</p>
            <CalendarView month={calMonth} data={confirmedByDay} />

            <div style={{ position: "fixed", left: "-10000px", top: 0 }}>
              <PdfDoc ref={pdfRef} month={calMonth} data={confirmedByDayForPdf} userName={profile?.full_name ?? user?.email ?? ""} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
}

function CalendarView({ month, data }: { month: string; data: Map<string, any[]> }) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const daysInMonth = new Date(y, m, 0).getDate();
  const startDow = first.getDay();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weekdays = ["일","월","화","수","목","금","토"];
  return (
    <div className="border rounded-md overflow-hidden bg-card">
      <div className="grid grid-cols-7 bg-muted/50 text-xs font-semibold text-center">
        {weekdays.map(w => <div key={w} className="p-2">{w}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          const key = d ? `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}` : "";
          const entries = d ? (data.get(key) ?? []) : [];
          return (
            <div key={i} className="min-h-[72px] border-t border-l p-1 text-[10px]">
              {d && <div className="font-bold text-xs mb-0.5">{d}</div>}
              {entries.map((e, idx) => (
                <div key={idx} className="bg-primary/10 rounded px-1 py-0.5 mb-0.5">
                  <div className="font-semibold truncate">{e.jobs?.place_name}</div>
                  <div className="truncate text-muted-foreground">{Number(e.jobs?.daily_wage ?? 0).toLocaleString()}원</div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const PdfDoc = React.forwardRef<HTMLDivElement, { month: string; data: Map<string, any[]>; userName: string }>(
  ({ month, data, userName }, ref) => {
    const [y, m] = month.split("-").map(Number);
    const first = new Date(y, m - 1, 1);
    const daysInMonth = new Date(y, m, 0).getDate();
    const startDow = first.getDay();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    const weekdays = ["일","월","화","수","목","금","토"];
    const total = Array.from(data.values()).flat().reduce((s, e) => s + Number(e.jobs?.daily_wage ?? 0), 0);

    return (
      <div ref={ref} style={{ width: "794px", minHeight: "1123px", padding: "40px", background: "#fff", color: "#111", fontFamily: "'Malgun Gothic','Apple SD Gothic Neo','Nanum Gothic',sans-serif", boxSizing: "border-box" }}>
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>근무 기록 확인서</h1>
        </div>
        <div style={{ marginBottom: "16px", fontSize: "13px", lineHeight: 1.8 }}>
          <div><strong>성명:</strong> {userName}</div>
          <div><strong>확인 기간:</strong> {y}년 {m}월 ({y}-{String(m).padStart(2,"0")}-01 ~ {y}-{String(m).padStart(2,"0")}-{daysInMonth})</div>
          <div><strong>합계 금액:</strong> {total.toLocaleString()}원</div>
        </div>

        <div style={{ border: "1px solid #333" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "#f0f0f0", fontWeight: "bold", fontSize: "11px", textAlign: "center" }}>
            {weekdays.map(w => <div key={w} style={{ padding: "6px", borderRight: "1px solid #333" }}>{w}</div>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {cells.map((d, i) => {
              const key = d ? `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}` : "";
              const entries = d ? (data.get(key) ?? []) : [];
              return (
                <div key={i} style={{ minHeight: "110px", borderTop: "1px solid #333", borderRight: "1px solid #333", padding: "4px", fontSize: "9px", boxSizing: "border-box" }}>
                  {d && <div style={{ fontWeight: "bold", fontSize: "11px", marginBottom: "2px" }}>{d}</div>}
                  {entries.map((e, idx) => (
                    <div key={idx} style={{ background: "#eef4ff", borderRadius: "3px", padding: "2px 3px", marginBottom: "2px" }}>
                      <div style={{ fontWeight: "bold" }}>{e.jobs?.place_name}</div>
                      <div style={{ color: "#444" }}>{e.jobs?.title}</div>
                      <div>{Number(e.jobs?.daily_wage ?? 0).toLocaleString()}원</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: "40px", paddingTop: "16px", borderTop: "2px solid #333", textAlign: "center", fontSize: "11px", color: "#555" }}>
          <div style={{ fontSize: "18px", fontWeight: "bold", color: "#1d4ed8", marginBottom: "6px", letterSpacing: "1px" }}>Find AR</div>
          <div>본 문서는 단순 기록에 대한 확인서이며, 단순 확인용 정보 제공에 대한 기록물입니다.</div>
          <div style={{ marginTop: "4px" }}>발급일: {new Date().toLocaleDateString("ko-KR")}</div>
        </div>
      </div>
    );
  }
);
PdfDoc.displayName = "PdfDoc";
