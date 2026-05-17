import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/MobileLayout";
import { RoleGate } from "@/components/RoleGate";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/employer/history/$date")({
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
  const { date } = Route.useParams();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<any[]>([]);
  const [employer, setEmployer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data: list } = await supabase
        .from("job_applications")
        .select("*")
        .eq("employer_id", user.id)
        .in("status", ["confirmed", "no_show"])
        .order("confirmed_at", { ascending: false });
      const arr = list ?? [];
      const seekerIds = Array.from(new Set(arr.map((a: any) => a.seeker_id)));
      const jobIds = Array.from(new Set(arr.map((a: any) => a.job_id)));
      const [jobsRes, profilesRes, profRes] = await Promise.all([
        jobIds.length
          ? supabase
              .from("jobs")
              .select("id, title, place_name, daily_wage, work_dates, location")
              .in("id", jobIds)
          : Promise.resolve({ data: [] as any[] }),
        seekerIds.length
          ? supabase.from("profiles").select("id, full_name, phone").in("id", seekerIds)
          : Promise.resolve({ data: [] as any[] }),
        supabase.from("profiles").select("full_name").eq("id", user.id).single(),
      ]);
      const jobsMap = new Map((jobsRes.data ?? []).map((j: any) => [j.id, j]));
      const profilesMap = new Map((profilesRes.data ?? []).map((p: any) => [p.id, p]));
      const filtered = arr
        .map((a: any) => ({
          ...a,
          jobs: jobsMap.get(a.job_id),
          profiles: profilesMap.get(a.seeker_id),
        }))
        .filter((a: any) => {
          const saved: string[] = a.jobs?.work_dates ?? [];
          const fallback = (
            a.confirmed_at ??
            a.no_show_at ??
            a.approved_at ??
            a.created_at
          )?.slice(0, 10);
          const dates = saved.length > 0 ? saved : fallback ? [fallback] : [];
          return dates.includes(date);
        });
      setEntries(filtered);
      setEmployer(profRes.data);
      setLoading(false);
    })();
  }, [user, date]);

  const downloadPdf = async () => {
    if (!pdfRef.current) return;
    toast.info("PDF 생성 중...");
    try {
      const canvas = await html2canvas(pdfRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
      });
      const img = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = 210;
      const pageH = 297;
      const imgH = (canvas.height * pageW) / canvas.width;
      let heightLeft = imgH;
      let pos = 0;
      pdf.addImage(img, "JPEG", 0, pos, pageW, imgH);
      heightLeft -= pageH;
      while (heightLeft > 0) {
        pos = heightLeft - imgH;
        pdf.addPage();
        pdf.addImage(img, "JPEG", 0, pos, pageW, imgH);
        heightLeft -= pageH;
      }
      pdf.save(`확정기록_${date}.pdf`);
    } catch (e: any) {
      toast.error("PDF 생성 실패: " + e.message);
    }
  };

  const confirmedCount = entries.filter((e) => e.status === "confirmed").length;
  const total = entries.reduce((s, e) => s + Number(e.jobs?.daily_wage ?? 0), 0);

  return (
    <MobileLayout role="employer">
      <div className="p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/employer/history" })}>
            <ChevronLeft className="h-4 w-4 mr-1" /> 뒤로
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg">{date}</h2>
            <p className="text-xs text-muted-foreground">
              확정 {confirmedCount}명 · 전체 {entries.length}건
            </p>
          </div>
          <Button onClick={downloadPdf} disabled={entries.length === 0}>
            PDF 다운로드
          </Button>
        </div>

        {loading && <p className="text-sm text-muted-foreground text-center py-12">불러오는 중...</p>}
        {!loading && entries.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">기록이 없습니다</p>
        )}

        <div className="space-y-2">
          {entries.map((e) => (
            <Card key={e.id} className="p-3 space-y-1">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{e.profiles?.full_name ?? "(이름미입력)"}</p>
                  {e.profiles?.phone && (
                    <p className="text-xs text-muted-foreground">{e.profiles.phone}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {e.jobs?.title} · {e.jobs?.place_name}
                  </p>
                  <p className="text-xs font-semibold mt-1">
                    {Number(e.jobs?.daily_wage ?? 0).toLocaleString()}원
                  </p>
                </div>
                <Badge className={`text-xs px-2 py-1 ${STATUS_CLASS[e.status] ?? ""}`}>
                  {STATUS_LABEL[e.status] ?? e.status}
                </Badge>
              </div>
            </Card>
          ))}
        </div>

        <div style={{ position: "fixed", left: "-10000px", top: 0 }}>
          <PdfDoc
            ref={pdfRef}
            date={date}
            entries={entries}
            employerName={employer?.full_name ?? user?.email ?? ""}
            total={total}
            confirmedCount={confirmedCount}
          />
        </div>
      </div>
    </MobileLayout>
  );
}

const PdfDoc = React.forwardRef<
  HTMLDivElement,
  {
    date: string;
    entries: any[];
    employerName: string;
    total: number;
    confirmedCount: number;
  }
>(({ date, entries, employerName, total, confirmedCount }, ref) => {
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
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>일자별 확정 기록 확인서</h1>
      </div>
      <div style={{ marginBottom: "20px", fontSize: "13px", lineHeight: 1.8 }}>
        <div>
          <strong>구인자:</strong> {employerName}
        </div>
        <div>
          <strong>일자:</strong> {date}
        </div>
        <div>
          <strong>확정 인원:</strong> {confirmedCount}명 / 전체 {entries.length}건
        </div>
        <div>
          <strong>합계 금액:</strong> {total.toLocaleString()}원
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
        <thead>
          <tr style={{ background: "#f0f0f0" }}>
            <th style={th}>번호</th>
            <th style={th}>구직자</th>
            <th style={th}>연락처</th>
            <th style={th}>공고</th>
            <th style={th}>장소</th>
            <th style={th}>일당</th>
            <th style={th}>상태</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={e.id}>
              <td style={td}>{i + 1}</td>
              <td style={td}>{e.profiles?.full_name ?? "-"}</td>
              <td style={td}>{e.profiles?.phone ?? "-"}</td>
              <td style={td}>{e.jobs?.title ?? "-"}</td>
              <td style={td}>{e.jobs?.place_name ?? "-"}</td>
              <td style={{ ...td, textAlign: "right" }}>
                {Number(e.jobs?.daily_wage ?? 0).toLocaleString()}원
              </td>
              <td style={td}>
                {e.status === "confirmed" ? "확정" : e.status === "no_show" ? "노쇼" : e.status}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

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

const th: React.CSSProperties = {
  border: "1px solid #333",
  padding: "6px",
  background: "#f0f0f0",
  fontWeight: "bold",
  textAlign: "left",
};
const td: React.CSSProperties = {
  border: "1px solid #333",
  padding: "6px",
};
