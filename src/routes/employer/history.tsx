import { createFileRoute, useNavigate } from "@tanstack/react-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/MobileLayout";
import { RoleGate } from "@/components/RoleGate";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

export const Route = createFileRoute("/employer/history")({
  component: () => (
    <RoleGate role="employer">
      <Page />
    </RoleGate>
  ),
});

const STATUS_LABEL: Record<string, string> = {
  approved: "승인",
  confirmed: "✅ 확정(온데요)",
  no_show: "노쇼",
};
const STATUS_CLASS: Record<string, string> = {
  confirmed: "bg-green-600 hover:bg-green-600 text-white border-transparent",
  approved: "bg-blue-600 hover:bg-blue-600 text-white border-transparent",
  no_show: "bg-destructive text-destructive-foreground border-transparent",
};

function Page() {
  const { user } = useAuth();
  const [apps, setApps] = useState<any[]>([]);
  const [topTab, setTopTab] = useState<"list" | "calendar">("list");
  const [filter, setFilter] = useState<"day" | "week" | "month">("month");
  const [search, setSearch] = useState("");
  const [employer, setEmployer] = useState<any>(null);
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const pdfRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: list, error } = await supabase
        .from("job_applications")
        .select("*")
        .eq("employer_id", user.id)
        .in("status", ["approved", "confirmed", "no_show"])
        .order("approved_at", { ascending: false });
      if (error) {
        toast.error(error.message);
        return;
      }
      const arr = list ?? [];
      const seekerIds = Array.from(new Set(arr.map((a: any) => a.seeker_id)));
      const jobIds = Array.from(new Set(arr.map((a: any) => a.job_id)));
      const [jobsRes, profilesRes] = await Promise.all([
        jobIds.length
          ? supabase
              .from("jobs")
              .select("id, title, place_name, daily_wage, work_dates")
              .in("id", jobIds)
          : Promise.resolve({ data: [] as any[] }),
        seekerIds.length
          ? supabase.from("profiles").select("id, full_name, phone").in("id", seekerIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const jobsMap = new Map((jobsRes.data ?? []).map((j: any) => [j.id, j]));
      const profilesMap = new Map((profilesRes.data ?? []).map((p: any) => [p.id, p]));
      setApps(
        arr.map((a: any) => ({
          ...a,
          jobs: jobsMap.get(a.job_id),
          profiles: profilesMap.get(a.seeker_id),
        })),
      );
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      setEmployer(prof);
    })();
  }, [user]);

  const filtered = useMemo(() => {
    const cutoff = new Date();
    if (filter === "day") cutoff.setDate(cutoff.getDate() - 1);
    if (filter === "week") cutoff.setDate(cutoff.getDate() - 7);
    if (filter === "month") cutoff.setMonth(cutoff.getMonth() - 1);
    const q = search.trim().toLowerCase();
    return apps.filter((a) => {
      const ts = a.approved_at ?? a.created_at;
      if (!ts || new Date(ts) < cutoff) return false;
      if (q && !(a.profiles?.full_name ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [apps, filter, search]);

  const confirmedByDay = useMemo(() => {
    const [y, m] = calMonth.split("-").map(Number);
    const map = new Map<string, any[]>();
    apps
      .filter((a) => a.status === "confirmed" || a.status === "no_show")
      .forEach((a) => {
        const savedDates: string[] = a.jobs?.work_dates ?? [];
        const fallbackDate = (
          a.confirmed_at ??
          a.no_show_at ??
          a.approved_at ??
          a.created_at
        )?.slice(0, 10);
        const dates: string[] =
          savedDates.length > 0 ? savedDates : fallbackDate ? [fallbackDate] : [];
        dates.forEach((d: string) => {
          const dt = new Date(d);
          if (dt.getFullYear() === y && dt.getMonth() + 1 === m) {
            const q = search.trim().toLowerCase();
            if (q && !(a.profiles?.full_name ?? "").toLowerCase().includes(q)) return;
            if (!map.has(d)) map.set(d, []);
            map.get(d)!.push(a);
          }
        });
      });
    return map;
  }, [apps, calMonth, search]);

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
      pdf.save(`승인기록_${calMonth}.pdf`);
    } catch (e: any) {
      toast.error("PDF 생성 실패: " + e.message);
    }
  };

  return (
    <MobileLayout role="employer">
      <div className="p-3 space-y-3">
        <h2 className="font-bold">승인 기록</h2>

        <Input
          placeholder="구직자 이름 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Tabs value={topTab} onValueChange={(v: any) => setTopTab(v)}>
          <TabsList className="grid grid-cols-2 w-full h-12">
            <TabsTrigger value="list" className="text-base font-semibold h-10">
              전체 기록
            </TabsTrigger>
            <TabsTrigger value="calendar" className="text-base font-semibold h-10">
              일자별 보기
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-3">
            <Tabs value={filter} onValueChange={(v: any) => setFilter(v)}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="day">일</TabsTrigger>
                <TabsTrigger value="week">주</TabsTrigger>
                <TabsTrigger value="month">월</TabsTrigger>
              </TabsList>
              <TabsContent value={filter} className="mt-3">
                <p className="text-xs text-muted-foreground mb-2">총 {filtered.length}건</p>
                {filtered.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-12">기록이 없습니다</p>
                )}
                {filtered.map((a) => (
                  <Card key={a.id} className="p-3 mb-2 space-y-1">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">
                          {a.profiles?.full_name ?? "(이름미입력)"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {a.jobs?.title} · {a.jobs?.place_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(a.approved_at ?? a.created_at).toLocaleString("ko-KR")}
                        </p>
                      </div>
                      <Badge className={`text-xs px-2 py-1 ${STATUS_CLASS[a.status] ?? ""}`}>
                        {STATUS_LABEL[a.status] ?? a.status}
                      </Badge>
                    </div>
                  </Card>
                ))}
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
            <CalendarView
              month={calMonth}
              data={confirmedByDay}
              onSelectDay={(d) => navigate({ to: "/employer/history/$date", params: { date: d } })}
            />

            <div style={{ position: "fixed", left: "-10000px", top: 0 }}>
              <PdfDoc
                ref={pdfRef}
                month={calMonth}
                data={confirmedByDay}
                employerName={employer?.full_name ?? user?.email ?? ""}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
}

function CalendarView({
  month,
  data,
  onSelectDay,
}: {
  month: string;
  data: Map<string, any[]>;
  onSelectDay: (d: string) => void;
}) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const daysInMonth = new Date(y, m, 0).getDate();
  const startDow = first.getDay();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  return (
    <div className="border rounded-md overflow-hidden bg-card">
      <div className="grid grid-cols-7 bg-muted/50 text-xs font-semibold text-center">
        {weekdays.map((w) => (
          <div key={w} className="p-2">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          const key = d ? `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` : "";
          const entries = d ? (data.get(key) ?? []) : [];
          const clickable = d && entries.length > 0;
          return (
            <button
              type="button"
              key={i}
              disabled={!clickable}
              onClick={() => clickable && onSelectDay(key)}
              className={`min-h-[72px] border-t border-l p-1 text-[10px] text-left ${clickable ? "hover:bg-accent cursor-pointer" : "cursor-default"}`}
            >
              {d && (
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold text-xs">{d}</span>
                  {entries.filter((e) => e.status === "confirmed").length >= 2 && (
                    <span className="text-[10px] font-bold text-white bg-green-600 rounded-full px-1.5 leading-4">
                      {entries.filter((e) => e.status === "confirmed").length}명
                    </span>
                  )}
                </div>
              )}
              {entries.map((e, idx) => (
                <div key={idx} className="bg-primary/10 rounded px-1 py-0.5 mb-0.5">
                  <div className="font-semibold truncate">{e.profiles?.full_name}</div>
                  <div className="truncate text-muted-foreground">{e.jobs?.place_name}</div>
                  <div className="truncate text-muted-foreground">
                    {Number(e.jobs?.daily_wage ?? 0).toLocaleString()}원
                  </div>
                </div>
              ))}
            </button>
          );
        })}
      </div>
    </div>
  );
}


const PdfDoc = React.forwardRef<
  HTMLDivElement,
  { month: string; data: Map<string, any[]>; employerName: string }
>(({ month, data, employerName }, ref) => {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const daysInMonth = new Date(y, m, 0).getDate();
  const startDow = first.getDay();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const total = Array.from(data.values())
    .flat()
    .reduce((s, e) => s + Number(e.jobs?.daily_wage ?? 0), 0);

  return (
    <div
      ref={ref}
      style={{
        width: "794px",
        minHeight: "1123px",
        padding: "40px",
        background: "#fff",
        color: "#111",
        fontFamily: "'Malgun Gothic','Apple SD Gothic Neo','Nanum Gothic',sans-serif",
        boxSizing: "border-box",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>승인/확정 기록 확인서</h1>
      </div>
      <div style={{ marginBottom: "16px", fontSize: "13px", lineHeight: 1.8 }}>
        <div>
          <strong>구인자:</strong> {employerName}
        </div>
        <div>
          <strong>확인 기간:</strong> {y}년 {m}월 ({y}-{String(m).padStart(2, "0")}-01 ~ {y}-
          {String(m).padStart(2, "0")}-{daysInMonth})
        </div>
        <div>
          <strong>합계 금액:</strong> {total.toLocaleString()}원
        </div>
      </div>

      <div style={{ border: "1px solid #333" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            background: "#f0f0f0",
            fontWeight: "bold",
            fontSize: "11px",
            textAlign: "center",
          }}
        >
          {weekdays.map((w) => (
            <div key={w} style={{ padding: "6px", borderRight: "1px solid #333" }}>
              {w}
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {cells.map((d, i) => {
            const key = d ? `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` : "";
            const entries = d ? (data.get(key) ?? []) : [];
            return (
              <div
                key={i}
                style={{
                  minHeight: "110px",
                  borderTop: "1px solid #333",
                  borderRight: "1px solid #333",
                  padding: "4px",
                  fontSize: "9px",
                  boxSizing: "border-box",
                }}
              >
                {d && (
                  <div style={{ fontWeight: "bold", fontSize: "11px", marginBottom: "2px" }}>
                    {d}
                  </div>
                )}
                {entries.map((e, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "#eef4ff",
                      borderRadius: "3px",
                      padding: "2px 3px",
                      marginBottom: "2px",
                    }}
                  >
                    <div style={{ fontWeight: "bold" }}>{e.profiles?.full_name}</div>
                    <div style={{ color: "#444" }}>{e.jobs?.place_name}</div>
                    <div>{Number(e.jobs?.daily_wage ?? 0).toLocaleString()}원</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          marginTop: "40px",
          paddingTop: "16px",
          borderTop: "2px solid #333",
          textAlign: "center",
          fontSize: "11px",
          color: "#555",
        }}
      >
        <div
          style={{
            fontSize: "18px",
            fontWeight: "bold",
            color: "#1d4ed8",
            marginBottom: "6px",
            letterSpacing: "1px",
          }}
        >
          Find AR
        </div>
        <div>본 문서는 단순 기록에 대한 확인서이며, 단순 확인용 정보 제공에 대한 기록물입니다.</div>
        <div style={{ marginTop: "4px" }}>발급일: {new Date().toLocaleDateString("ko-KR")}</div>
      </div>
    </div>
  );
});
PdfDoc.displayName = "PdfDoc";
