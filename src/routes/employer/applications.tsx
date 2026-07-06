import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/MobileLayout";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Search, FileDown } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";
import { useRef } from "react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { analyzeApplications } from "@/lib/ai.functions";

export const Route = createFileRoute("/employer/applications")({ component: () => <RoleGate role="employer"><Page /></RoleGate> });

function Page() {
  const { user } = useAuth();
  const [apps, setApps] = useState<any[]>([]);
  const [aiNotes, setAiNotes] = useState<Record<string, { summary: string; noShowRisk: "낮음" | "보통" | "높음"; question: string }>>({});
  const [aiBusy, setAiBusy] = useState(false);
  const analyze = useServerFn(analyzeApplications);
  const load = async () => {
    if (!user) return;
    const { data: appsData, error } = await supabase.from("job_applications")
      .select("*")
      .eq("employer_id", user.id).order("created_at", { ascending: false });
    if (error) { toast.error(error.message); return; }
    const list = appsData ?? [];
    const seekerIds = Array.from(new Set(list.map((a: any) => a.seeker_id)));
    const jobIds = Array.from(new Set(list.map((a: any) => a.job_id)));
    const [jobsRes, profilesRes, seekerProfilesRes] = await Promise.all([
      jobIds.length ? supabase.from("jobs").select("id, title, place_name, work_dates, headcount").in("id", jobIds) : Promise.resolve({ data: [] as any[] }),
      seekerIds.length ? supabase.from("profiles").select("id, full_name, phone").in("id", seekerIds) : Promise.resolve({ data: [] as any[] }),
      seekerIds.length ? supabase.from("seeker_profiles").select("user_id, nationality, experience, korean_ok, visa").in("user_id", seekerIds) : Promise.resolve({ data: [] as any[] }),
    ]);
    const jobsMap = new Map((jobsRes.data ?? []).map((j: any) => [j.id, j]));
    const profilesMap = new Map((profilesRes.data ?? []).map((p: any) => [p.id, p]));
    const spMap = new Map((seekerProfilesRes.data ?? []).map((s: any) => [s.user_id, s]));

    // Same-place visit history: confirmed apps by these seekers to this employer's jobs
    const visitsMap = new Map<string, number>();
    if (seekerIds.length) {
      const { data: priorApps } = await supabase
        .from("job_applications")
        .select("seeker_id, job_id, status")
        .eq("employer_id", user.id)
        .in("seeker_id", seekerIds)
        .in("status", ["confirmed", "approved"] as any);
      const jobToPlace = jobsMap;
      // Need place_name for ALL prior job_ids too
      const priorJobIds = Array.from(new Set((priorApps ?? []).map((p: any) => p.job_id)));
      const missing = priorJobIds.filter((jid) => !jobToPlace.has(jid));
      if (missing.length) {
        const { data: extra } = await supabase.from("jobs").select("id, title, place_name").in("id", missing);
        (extra ?? []).forEach((j: any) => jobToPlace.set(j.id, j));
      }
      (priorApps ?? []).forEach((p: any) => {
        const place = jobToPlace.get(p.job_id)?.place_name ?? "";
        const key = `${p.seeker_id}__${place}`;
        visitsMap.set(key, (visitsMap.get(key) ?? 0) + 1);
      });
    }

    setApps(list.map((a: any) => {
      const place = jobsMap.get(a.job_id)?.place_name ?? "";
      return {
        ...a,
        jobs: jobsMap.get(a.job_id),
        profiles: profilesMap.get(a.seeker_id),
        seeker_profiles: spMap.get(a.seeker_id),
        visits: visitsMap.get(`${a.seeker_id}__${place}`) ?? 0,
      };
    }));
  };
  useEffect(() => { load(); }, [user]);

  const runAiAnalyze = async () => {
    setAiBusy(true);
    try {
      const pending = apps.filter((a) => a.status === "pending").slice(0, 20).map((a) => ({
        id: a.id, jobTitle: a.jobs?.title, applicantName: a.profiles?.full_name,
        nationality: a.seeker_profiles?.nationality, experience: a.seeker_profiles?.experience,
        koreanOk: !!a.seeker_profiles?.korean_ok, message: a.message, status: a.status,
      }));
      setAiNotes(await analyze({ data: { applications: pending } }));
      toast.success("AI 지원자 요약이 생성되었습니다");
    } catch (e: any) { toast.error(e?.message ?? "AI 분석 실패"); }
    finally { setAiBusy(false); }
  };

  const approve = async (id: string) => {
    const { error } = await supabase.rpc("approve_application", { _app_id: id } as any);
    if (error) {
      const msg = error.message || "";
      if (msg.includes("HEADCOUNT_FULL")) {
        return toast.error("필요 인원을 모두 채웠습니다. 더 이상 승인할 수 없습니다.");
      }
      return toast.error(msg);
    }
    toast.success("승인 완료! 1 크레딧 차감됨.");
    load();
  };
  const reject = async (id: string) => {
    const { error } = await supabase.from("job_applications").update({ status: "rejected" }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };
  const noShow = async (id: string) => {
    if (!confirm("정말 노쇼(미출근)로 처리하시겠습니까?\n노쇼 처리는 구직자에게 불이익이 가는 작업입니다.")) return;
    if (!confirm("한 번 더 확인합니다. 노쇼 처리할까요?")) return;
    const { error } = await supabase.rpc("mark_no_show", { _app_id: id } as any);
    if (error) return toast.error(error.message);
    toast.success("노쇼 처리됨"); load();
  };
  const STATUS_LABEL: Record<string,string> = { pending:"대기", approved:"승인", rejected:"거절", confirmed:"출근 확정", no_show:"노쇼" };
  const unmarkNoShow = async (id: string) => {
    if (!confirm("노쇼 표시를 취소하고 이전 상태로 복구하시겠습니까?")) return;
    const { error } = await supabase.rpc("unmark_no_show", { _app_id: id } as any);
    if (error) return toast.error(error.message);
    toast.success("노쇼 표시가 취소되었습니다"); load();
  };
  const STATUS_VARIANT: Record<string, any> = { approved:"default", rejected:"destructive", no_show:"destructive", pending:"secondary" };
  const STATUS_CLASS: Record<string,string> = { confirmed: "bg-green-600 hover:bg-green-600 text-white border-transparent" };

  const [search, setSearch] = useState("");
  const matchSearch = (a: any) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const fields = [
      a.profiles?.full_name,
      a.profiles?.phone,
      a.jobs?.title,
      a.jobs?.place_name,
      a.message,
      a.seeker_profiles?.nationality,
      a.seeker_profiles?.visa,
      ...(Array.isArray(a.jobs?.work_dates) ? a.jobs.work_dates : []),
      a.created_at?.slice(0, 10),
    ];
    return fields.some((f) => f && String(f).toLowerCase().includes(q));
  };

  const groups = useMemo(() => ({
    pending: apps.filter(a => a.status === "pending").filter(matchSearch),
    approved: apps.filter(a => a.status === "approved" || a.status === "confirmed").filter(matchSearch),
    rejected: apps.filter(a => a.status === "rejected").filter(matchSearch),
    no_show: apps.filter(a => a.status === "no_show").filter(matchSearch),
  }), [apps, search]);

  // Approved 그룹: 공고별 묶음
  const approvedByJob = useMemo(() => {
    const map = new Map<string, { job: any; items: any[] }>();
    groups.approved.forEach((a) => {
      const jid = a.job_id;
      if (!map.has(jid)) map.set(jid, { job: a.jobs ?? { title: "(공고)", place_name: "" }, items: [] });
      map.get(jid)!.items.push(a);
    });
    return Array.from(map.entries()).map(([job_id, v]) => ({ job_id, ...v }));
  }, [groups.approved]);

  const [groupApproved, setGroupApproved] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);
  const [pdfData, setPdfData] = useState<{ job: any; items: any[] } | null>(null);

  const downloadJobPdf = async (job: any, items: any[]) => {
    setPdfData({ job, items });
    // wait for render
    await new Promise((r) => setTimeout(r, 80));
    const el = pdfRef.current;
    if (!el) { setPdfData(null); return; }
    try {
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW - 40;
      const imgH = (canvas.height * imgW) / canvas.width;
      let y = 20;
      if (imgH <= pageH - 40) {
        pdf.addImage(img, "PNG", 20, y, imgW, imgH);
      } else {
        // multi-page
        let remaining = imgH;
        let sY = 0;
        const pageContentH = pageH - 40;
        const sliceH = (pageContentH * canvas.width) / imgW;
        while (remaining > 0) {
          const c2 = document.createElement("canvas");
          c2.width = canvas.width;
          c2.height = Math.min(sliceH, canvas.height - sY);
          const ctx = c2.getContext("2d")!;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, c2.width, c2.height);
          ctx.drawImage(canvas, 0, sY, canvas.width, c2.height, 0, 0, canvas.width, c2.height);
          const partImg = c2.toDataURL("image/png");
          const partH = (c2.height * imgW) / canvas.width;
          pdf.addImage(partImg, "PNG", 20, 20, imgW, partH);
          sY += c2.height;
          remaining -= partH;
          if (remaining > 0) pdf.addPage();
        }
      }
      const fname = `승인자_${(job?.place_name || job?.title || "공고").replace(/[\\/:*?"<>|]/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fname);
      toast.success("PDF가 생성되었습니다");
    } catch (e: any) {
      toast.error(e?.message ?? "PDF 생성 실패");
    } finally {
      setPdfData(null);
    }
  };

  const renderCard = (a: any) => (
    <Card key={a.id}><CardContent className="p-3 space-y-2">
      <div className="flex justify-between items-start">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground truncate">{a.jobs?.title}</p>
          <p className="text-sm text-muted-foreground truncate">{a.jobs?.place_name}</p>
          {Array.isArray(a.jobs?.work_dates) && a.jobs.work_dates.length > 0 && (
            <p className="text-sm text-primary font-medium mt-0.5">📅 {a.jobs.work_dates.join(", ")}</p>
          )}
          <p className="text-sm text-muted-foreground">신청일: {a.created_at?.slice(0, 10)}</p>
          <p className="font-semibold text-base mt-1">{a.profiles?.full_name ?? "(이름미입력)"}</p>
          <div className="flex gap-1 flex-wrap mt-1">
            <Badge className="text-xs border-transparent text-white" style={{ backgroundColor: a.visits > 0 ? "#0047AB" : "#94a3b8" }}>
              같은 장소 방문 {a.visits}회
            </Badge>
            {a.seeker_profiles?.nationality && <Badge variant="secondary" className="text-xs">{a.seeker_profiles.nationality === "foreigner" ? "외국인" : "내국인"}</Badge>}
            {a.seeker_profiles?.experience && <Badge variant="outline" className="text-xs">{a.seeker_profiles.experience === "lt5" ? "경력 5회 미만" : "경력 5회 이상"}</Badge>}
            {a.seeker_profiles?.korean_ok && <Badge variant="outline" className="text-xs">한국어 가능</Badge>}
            {a.seeker_profiles?.visa && <Badge variant="outline" className="text-xs">비자: {a.seeker_profiles.visa}</Badge>}
          </div>
          <p className="text-xs text-muted-foreground mt-1">※ 연락처는 승인 후에만 표시됩니다</p>
          {a.message && <p className="text-sm italic mt-1 text-muted-foreground">"{a.message}"</p>}
          {aiNotes[a.id] && (() => {
            const r = aiNotes[a.id].noShowRisk;
            const riskCls = r === "높음" ? "bg-red-50 border-red-200 text-red-700" : r === "보통" ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-emerald-50 border-emerald-200 text-emerald-700";
            return <div className={`mt-2 rounded border p-2 text-sm ${riskCls}`}>
              <p className="font-semibold">🤖 AI 요약 · 노쇼 위험 {r}</p>
              <p className="mt-0.5 text-foreground">{aiNotes[a.id].summary}</p>
              <p className="mt-0.5 text-muted-foreground">확인 질문: {aiNotes[a.id].question}</p>
            </div>;
          })()}
        </div>
        <Badge variant={STATUS_VARIANT[a.status] ?? "secondary"} className={`text-base px-3 py-1 font-semibold whitespace-nowrap shrink-0 ${STATUS_CLASS[a.status] ?? ""}`}>{STATUS_LABEL[a.status] ?? a.status}</Badge>
      </div>
      {a.status === "pending" && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1" onClick={() => reject(a.id)}>거절</Button>
          <Button size="sm" className="flex-1" onClick={() => approve(a.id)}>승인 (1크레딧)</Button>
        </div>
      )}
      {(a.status === "approved" || a.status === "confirmed") && (
        <div className="flex gap-2">
          {a.profiles?.phone && (
            <a href={`tel:${a.profiles.phone}`} className="flex-1">
              <Button size="sm" className="w-full">연락하기</Button>
            </a>
          )}
          <Button size="sm" variant="outline" className="flex-1" onClick={() => noShow(a.id)}>노쇼(미출근) 표시</Button>
        </div>
      )}
      {a.status === "no_show" && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1" onClick={() => unmarkNoShow(a.id)}>노쇼 취소(복구)</Button>
        </div>
      )}
    </CardContent></Card>
  );


  return (
    <MobileLayout role="employer">
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold">받은 신청</h2>
          <Button size="sm" variant="default" onClick={runAiAnalyze} disabled={aiBusy || apps.filter(a => a.status === "pending").length === 0}>
            {aiBusy ? "분석 중..." : "🤖 AI 요약·노쇼 위험"}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground -mt-1">대기 중 지원자를 AI가 한 줄 요약하고 노쇼 위험을 표시합니다 (최대 20명).</p>

        <div className="relative">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름 · 업무장소 · 날짜(YYYY-MM-DD) · 업무 검색"
            className="pl-7 h-9 text-sm"
          />
        </div>

        <Tabs defaultValue="pending">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="pending" className="text-sm">대기 ({groups.pending.length})</TabsTrigger>
            <TabsTrigger value="approved" className="text-sm">승인 ({groups.approved.length})</TabsTrigger>
            <TabsTrigger value="rejected" className="text-sm">거절 ({groups.rejected.length})</TabsTrigger>
            <TabsTrigger value="no_show" className="text-sm">노쇼 ({groups.no_show.length})</TabsTrigger>
            <TabsTrigger value="calendar" className="text-sm">📅 달력</TabsTrigger>
          </TabsList>


          <TabsContent value="pending" className="space-y-2 mt-2">
            {groups.pending.length === 0
              ? <p className="text-center text-sm text-muted-foreground py-12">내역이 없습니다</p>
              : groups.pending.map(renderCard)}
          </TabsContent>

          <TabsContent value="approved" className="space-y-2 mt-2">
            <div className="flex items-center justify-end">
              <Button size="sm" variant={groupApproved ? "default" : "outline"} onClick={() => setGroupApproved(v => !v)}>
                {groupApproved ? "전체 목록 보기" : "공고별 보기 / PDF"}
              </Button>
            </div>
            {groups.approved.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-12">내역이 없습니다</p>
            ) : groupApproved ? (
              approvedByJob.map(({ job_id, job, items }) => (
                <Card key={job_id}><CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{job?.place_name || job?.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{job?.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">승인자 {items.length}명</p>
                    </div>
                    <Button size="sm" onClick={() => downloadJobPdf(job, items)}>
                      <FileDown size={14} className="mr-1" />PDF
                    </Button>
                  </div>
                  <div className="space-y-2">{items.map(renderCard)}</div>
                </CardContent></Card>
              ))
            ) : (
              groups.approved.map(renderCard)
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-2 mt-2">
            {groups.rejected.length === 0
              ? <p className="text-center text-sm text-muted-foreground py-12">내역이 없습니다</p>
              : groups.rejected.map(renderCard)}
          </TabsContent>

          <TabsContent value="no_show" className="space-y-2 mt-2">
            {groups.no_show.length === 0
              ? <p className="text-center text-sm text-muted-foreground py-12">내역이 없습니다</p>
              : groups.no_show.map(renderCard)}
          </TabsContent>

          <TabsContent value="calendar" className="space-y-3 mt-2">
            <CalendarView apps={apps} renderCard={renderCard} />
          </TabsContent>
        </Tabs>

      </div>

      {/* 오프스크린 PDF 렌더 영역 */}
      {pdfData && (
        <div style={{ position: "fixed", left: -10000, top: 0, width: 800, background: "#fff", color: "#111", padding: 24, fontFamily: "'Noto Sans KR', system-ui, sans-serif" }} ref={pdfRef}>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>승인자 명단</h1>
          <p style={{ fontSize: 13, color: "#444" }}>{pdfData.job?.place_name || "-"} · {pdfData.job?.title || "-"}</p>
          <p style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>
            발급일: {new Date().toLocaleString("ko-KR")} · 모집인원: {pdfData.job?.headcount ?? "-"} · 승인 {pdfData.items.length}명
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ background: "#f3f4f6" }}>
                {["#", "이름", "연락처", "국적", "비자", "한국어", "경력", "승인일", "확정일"].map(h => (
                  <th key={h} style={{ border: "1px solid #d1d5db", padding: "6px 4px", textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pdfData.items.map((a, i) => (
                <tr key={a.id}>
                  <td style={{ border: "1px solid #e5e7eb", padding: "6px 4px" }}>{i + 1}</td>
                  <td style={{ border: "1px solid #e5e7eb", padding: "6px 4px" }}>{a.profiles?.full_name ?? "-"}</td>
                  <td style={{ border: "1px solid #e5e7eb", padding: "6px 4px" }}>{a.profiles?.phone ?? "-"}</td>
                  <td style={{ border: "1px solid #e5e7eb", padding: "6px 4px" }}>{a.seeker_profiles?.nationality === "foreigner" ? "외국인" : a.seeker_profiles?.nationality === "korean" ? "내국인" : "-"}</td>
                  <td style={{ border: "1px solid #e5e7eb", padding: "6px 4px" }}>{a.seeker_profiles?.visa ?? "-"}</td>
                  <td style={{ border: "1px solid #e5e7eb", padding: "6px 4px" }}>{a.seeker_profiles?.korean_ok ? "가능" : "불가"}</td>
                  <td style={{ border: "1px solid #e5e7eb", padding: "6px 4px" }}>{a.seeker_profiles?.experience === "lt5" ? "5회 미만" : a.seeker_profiles?.experience === "gte5" ? "5회 이상" : "-"}</td>
                  <td style={{ border: "1px solid #e5e7eb", padding: "6px 4px" }}>{a.approved_at ? new Date(a.approved_at).toLocaleDateString("ko-KR") : "-"}</td>
                  <td style={{ border: "1px solid #e5e7eb", padding: "6px 4px" }}>{a.confirmed_at ? new Date(a.confirmed_at).toLocaleDateString("ko-KR") : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </MobileLayout>
  );
}

function CalendarView({ apps, renderCard }: { apps: any[]; renderCard: (a: any) => React.ReactNode }) {
  const [selected, setSelected] = useState<Date | undefined>(new Date());

  const dateMap = useMemo(() => {
    const m = new Map<string, any[]>();
    apps.forEach((a) => {
      const dates: string[] = Array.isArray(a.jobs?.work_dates) && a.jobs.work_dates.length > 0
        ? a.jobs.work_dates
        : (a.created_at ? [a.created_at.slice(0, 10)] : []);
      dates.forEach((d) => {
        if (!m.has(d)) m.set(d, []);
        m.get(d)!.push(a);
      });
    });
    return m;
  }, [apps]);

  const markedDates = useMemo(() => Array.from(dateMap.keys()).map((d) => new Date(d + "T00:00:00")), [dateMap]);

  const key = selected ? `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, "0")}-${String(selected.getDate()).padStart(2, "0")}` : "";
  const dayItems = key ? (dateMap.get(key) ?? []) : [];

  return (
    <div className="space-y-3">
      <Card><CardContent className="p-2 flex justify-center">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={setSelected}
          modifiers={{ hasApps: markedDates }}
          modifiersClassNames={{ hasApps: "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-primary" }}
          className="p-2 pointer-events-auto"
        />
      </CardContent></Card>
      <p className="text-sm text-muted-foreground">{key || "날짜를 선택하세요"} · {dayItems.length}건</p>
      {dayItems.length === 0
        ? <p className="text-center text-sm text-muted-foreground py-8">해당 일자의 신청이 없습니다</p>
        : <div className="space-y-2">{dayItems.map(renderCard)}</div>}
    </div>
  );
}
