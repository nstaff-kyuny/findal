import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  LogOut, Monitor, Megaphone, Plus,
} from "lucide-react";
import {
  INDUSTRY_LABEL, ROLE_LABEL, PROMOTION_OPTIONS, CREDIT_PACKS,
} from "@/lib/constants";
import { NewJobPanel, HistoryPanel, ProfilePanel } from "@/components/manager/DesktopPanels";
import { isJobCompleted } from "@/lib/job-visuals";
import { createCreditOrder, getTossPublicConfig } from "@/lib/toss.functions";
import { listRefundableOrders, createRefundRequest, listMyRefundRequests, cancelMyRefundRequest } from "@/lib/refunds.functions";

const FALLBACK_TOSS_CLIENT_KEY = "test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm";
declare global { interface Window { TossPayments?: any } }
function loadTossSdk(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("no window"));
    if (window.TossPayments) return resolve(window.TossPayments);
    const existing = document.querySelector<HTMLScriptElement>('script[data-toss="v2"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.TossPayments));
      existing.addEventListener("error", () => reject(new Error("Toss SDK 로드 실패")));
      return;
    }
    const s = document.createElement("script");
    s.src = "https://js.tosspayments.com/v2/standard";
    s.async = true; s.dataset.toss = "v2";
    s.onload = () => resolve(window.TossPayments);
    s.onerror = () => reject(new Error("Toss SDK 로드 실패"));
    document.head.appendChild(s);
  });
}

export const Route = createFileRoute("/manager")({
  component: ManagerPage,
});

type TabValue = "new" | "jobs" | "apps" | "credits" | "history" | "profile";

const TAB_META: Record<TabValue, { label: string; previewSrc: string }> = {
  new: { label: "공고 등록", previewSrc: "/employer/jobs/new" },
  jobs: { label: "공고 관리", previewSrc: "/employer/jobs" },
  apps: { label: "신청/승인", previewSrc: "/employer/applications" },
  credits: { label: "크레딧", previewSrc: "/employer/credits" },
  history: { label: "히스토리", previewSrc: "/employer/history" },
  profile: { label: "프로필/설정", previewSrc: "/employer/me" },
};

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return toast.error(error.message);
      const uid = data.user?.id;
      if (!uid) return toast.error("로그인 실패");
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      const isEmployer = (roles ?? []).some((r: any) => r.role === "employer");
      if (!isEmployer) {
        await supabase.auth.signOut();
        return toast.error("구인자 계정만 접속할 수 있습니다.");
      }
      toast.success("환영합니다");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 space-y-5">
          <div className="text-center space-y-1">
            <Monitor className="mx-auto mb-2" size={32} />
            <h1 className="text-2xl font-bold">구인자 관리자 모드</h1>
            <p className="text-sm text-muted-foreground">구인자 계정으로만 접속할 수 있습니다</p>
          </div>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label>이메일</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div>
              <Label>비밀번호</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "로그인 중…" : "로그인"}
            </Button>
          </form>
          <p className="text-xs text-center text-muted-foreground">
            구인자 계정이 없으신가요? 모바일 앱에서 가입 후 이용해 주세요.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ManagerPage() {
  const { loading, user, roles, signOut } = useAuth();
  const [tab, setTab] = useState<TabValue>("jobs");
  const [phoneKey, setPhoneKey] = useState(0);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);

  useEffect(() => { setPhoneKey((k) => k + 1); }, [tab]);
  useEffect(() => { if (tab !== "jobs" && tab !== "new") setEditingJobId(null); }, [tab]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">불러오는 중…</div>;
  }

  if (!user || !roles.includes("employer")) {
    if (user && !roles.includes("employer")) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
          <p className="text-sm text-muted-foreground">구인자 계정만 접속할 수 있습니다.</p>
          <Button variant="outline" onClick={signOut}><LogOut size={14} className="mr-1" />로그아웃</Button>
        </div>
      );
    }
    return <LoginForm />;
  }

  const openEdit = (id: string) => { setEditingJobId(id); setTab("new"); };
  const closeEdit = () => { setEditingJobId(null); setTab("jobs"); };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <header className="bg-background border-b px-8 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <Monitor size={20} />
          <h1 className="font-bold text-lg">구인자 PC 관리자</h1>
          <span className="text-xs text-muted-foreground ml-3">{user.email}</span>
        </div>
        <Button size="sm" variant="outline" onClick={signOut}>
          <LogOut size={14} className="mr-1" />로그아웃
        </Button>
      </header>

      <div className="flex-1 flex min-h-0 w-full max-w-[1600px] mx-auto">
        <Tabs value={tab} onValueChange={(v) => { setTab(v as TabValue); if (v !== "new") setEditingJobId(null); }} orientation="vertical" className="flex-1 flex flex-row min-h-0">
          <aside className="w-52 shrink-0 sticky top-[60px] self-start max-h-[calc(100vh-60px)] overflow-auto p-4">
            <TabsList className="flex-col h-auto w-full items-stretch bg-background border rounded-lg p-2 gap-1">
              {(Object.keys(TAB_META) as TabValue[]).map((v) => (
                <TabsTrigger key={v} value={v} className="justify-start w-full">
                  {v === "new" && editingJobId ? "공고 수정" : TAB_META[v].label}
                </TabsTrigger>
              ))}
            </TabsList>
          </aside>
          <div className="flex-1 min-w-0 bg-background border-l">
            <TabsContent value="new" className="m-0">
              <NewJobPanel
                key={editingJobId ?? "new"}
                userId={user.id}
                editJobId={editingJobId ?? undefined}
                onBack={closeEdit}
                onCreated={() => setPhoneKey((k) => k + 1)}
              />
            </TabsContent>
            <TabsContent value="jobs" className="m-0">
              <JobsPanel userId={user.id} onChanged={() => setPhoneKey((k) => k + 1)} onEdit={openEdit} />
            </TabsContent>
            <TabsContent value="apps" className="m-0">
              <ApplicationsPanel userId={user.id} onChanged={() => setPhoneKey((k) => k + 1)} />
            </TabsContent>
            <TabsContent value="credits" className="m-0">
              <CreditsPanel userId={user.id} onChanged={() => setPhoneKey((k) => k + 1)} />
            </TabsContent>
            <TabsContent value="history" className="m-0">
              <HistoryPanel userId={user.id} />
            </TabsContent>
            <TabsContent value="profile" className="m-0">
              <ProfilePanel userId={user.id} userEmail={user.email ?? ""} onSignOut={signOut} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}


/* ----------------- 공고 관리 ----------------- */
function JobsPanel({ userId, onChanged, onEdit }: { userId: string; onChanged: () => void; onEdit: (id: string) => void }) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoOpenId, setPromoOpenId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("jobs").select("*").eq("employer_id", userId).order("created_at", { ascending: false });
    setJobs(data ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const filteredJobs = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const from = dateFrom ? new Date(dateFrom).getTime() : null;
    const to = dateTo ? new Date(dateTo + "T23:59:59").getTime() : null;
    return jobs.filter((j) => {
      if (statusFilter === "active" && !j.is_active) return false;
      if (statusFilter === "inactive" && j.is_active) return false;
      if (qq) {
        const hay = `${j.title ?? ""} ${j.place_name ?? ""} ${j.region ?? ""} ${j.location ?? ""}`.toLowerCase();
        if (!hay.includes(qq)) return false;
      }
      const ts = j.created_at ? new Date(j.created_at).getTime() : 0;
      if (from && ts < from) return false;
      if (to && ts > to) return false;
      return true;
    });
  }, [jobs, q, dateFrom, dateTo, statusFilter]);

  const toggle = async (j: any) => {
    const { error } = await supabase.from("jobs").update({ is_active: !j.is_active }).eq("id", j.id);
    if (error) return toast.error(error.message);
    load(); onChanged();
  };
  const remove = async (id: string) => {
    if (!confirm("이 공고를 삭제할까요?")) return;
    const { error } = await supabase.from("jobs").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("삭제됨"); load(); onChanged();
  };
  const promote = async (jobId: string, dur: string) => {
    const { error } = await supabase.rpc("promote_job", { _job_id: jobId, _duration: dur } as any);
    if (error) {
      if (error.message?.includes("SLOTS_FULL")) {
        toast.error("지금은 가능한 광고 여분의 자리가 없습니다. 잠시 후 다시 신청해주세요.");
        setPromoOpenId(null); return;
      }
      if (error.message?.includes("크레딧")) { toast.error("크레딧이 부족합니다."); return; }
      return toast.error(error.message);
    }
    setPromoOpenId(null);
    toast.success("추천 배너 광고가 적용되었습니다!");
    load(); onChanged();
  };

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">공고 관리</h2>
          <p className="text-xs text-muted-foreground">전체 {jobs.length}건 · 활성 {jobs.filter(j => j.is_active).length}건 · 표시 {filteredJobs.length}건</p>
        </div>
        <Button onClick={() => { window.open("/employer/jobs/new", "_blank"); }}>
          <Plus size={16} className="mr-1" />새 공고 등록
        </Button>
      </div>
      <Card>
        <CardContent className="p-3 grid grid-cols-[1fr_auto_auto_auto] gap-2 items-end">
          <div>
            <Label className="text-xs">제목/장소/지역 검색</Label>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="검색어 입력" />
          </div>
          <div>
            <Label className="text-xs">등록 시작일</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">등록 종료일</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant={statusFilter === "all" ? "default" : "outline"} onClick={() => setStatusFilter("all")}>전체</Button>
            <Button size="sm" variant={statusFilter === "active" ? "default" : "outline"} onClick={() => setStatusFilter("active")}>활성</Button>
            <Button size="sm" variant={statusFilter === "inactive" ? "default" : "outline"} onClick={() => setStatusFilter("inactive")}>비활성</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>제목</TableHead>
              <TableHead>업종/직무</TableHead>
              <TableHead>장소</TableHead>
              <TableHead className="text-right">일당</TableHead>
              <TableHead className="text-center">상태</TableHead>
              <TableHead className="text-center">수정</TableHead>
              <TableHead className="text-right">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">불러오는 중…</TableCell></TableRow>}
            {!loading && filteredJobs.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">조건에 맞는 공고가 없습니다</TableCell></TableRow>}
            {filteredJobs.map((j) => {
              const editCount = j.edit_count ?? 0;
              const canEdit = editCount < 2;
              const wageText = j.contract_type === "monthly"
                ? `월 ${Number(j.monthly_wage ?? 0).toLocaleString()}원`
                : `${Number(j.daily_wage ?? 0).toLocaleString()}원`;
              return (
                <TableRow key={j.id}>
                  <TableCell className="font-medium max-w-[260px] truncate">{j.title}</TableCell>
                  <TableCell className="text-xs">
                    <Badge variant="secondary" className="mr-1">{INDUSTRY_LABEL[j.industry] ?? j.industry}</Badge>
                    <Badge variant="outline">{ROLE_LABEL[j.job_role] ?? j.job_role}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{j.place_name}<br />{j.region}</TableCell>
                  <TableCell className="text-right tabular-nums">{wageText}</TableCell>
                  <TableCell className="text-center">
                    {isJobCompleted(j) ? <Badge variant="secondary" className="bg-slate-200 text-slate-700">마감</Badge>
                      : j.is_active ? <Badge>활성</Badge> : <Badge variant="destructive">비활성</Badge>}
                  </TableCell>
                  <TableCell className="text-center text-xs">{editCount}/2</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button size="sm" variant="secondary" disabled={!canEdit} onClick={() => onEdit(j.id)}>수정</Button>
                      <Button size="sm" variant="outline" onClick={() => toggle(j)}>{j.is_active ? "비활성화" : "활성화"}</Button>
                      <Dialog open={promoOpenId === j.id} onOpenChange={(o) => setPromoOpenId(o ? j.id : null)}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline"><Megaphone size={14} className="mr-1" />광고</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>추천 배너 광고</DialogTitle></DialogHeader>
                          <p className="text-sm text-muted-foreground">크레딧이 차감됩니다.</p>
                          {PROMOTION_OPTIONS.map((p) => (
                            <Button key={p.value} variant="outline" className="w-full" onClick={() => promote(j.id, p.value)}>{p.label}</Button>
                          ))}
                        </DialogContent>
                      </Dialog>
                      <Button size="sm" variant="destructive" onClick={() => remove(j.id)}>삭제</Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

/* ----------------- 신청/승인 ----------------- */
function ApplicationsPanel({ userId, onChanged }: { userId: string; onChanged: () => void }) {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "no_show" | "all">("pending");
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: list, error } = await supabase.from("job_applications")
      .select("*").eq("employer_id", userId).order("created_at", { ascending: false });
    if (error) { toast.error(error.message); setLoading(false); return; }
    const arr = list ?? [];
    const seekerIds = Array.from(new Set(arr.map((a: any) => a.seeker_id)));
    const jobIds = Array.from(new Set(arr.map((a: any) => a.job_id)));
    const [jobsRes, profilesRes, spRes] = await Promise.all([
      jobIds.length ? supabase.from("jobs").select("id, title, place_name").in("id", jobIds) : Promise.resolve({ data: [] as any[] }),
      seekerIds.length ? supabase.from("profiles").select("id, full_name, phone").in("id", seekerIds) : Promise.resolve({ data: [] as any[] }),
      seekerIds.length ? supabase.from("seeker_profiles").select("user_id, nationality, experience, korean_ok, visa").in("user_id", seekerIds) : Promise.resolve({ data: [] as any[] }),
    ]);
    const jm = new Map((jobsRes.data ?? []).map((j: any) => [j.id, j]));
    const pm = new Map((profilesRes.data ?? []).map((p: any) => [p.id, p]));
    const sm = new Map((spRes.data ?? []).map((s: any) => [s.user_id, s]));
    setApps(arr.map((a: any) => ({ ...a, jobs: jm.get(a.job_id), profiles: pm.get(a.seeker_id), seeker_profiles: sm.get(a.seeker_id) })));
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: string) => {
    const { error } = await supabase.rpc("approve_application", { _app_id: id } as any);
    if (error) return toast.error(error.message);
    toast.success("승인 완료! 1 크레딧 차감됨."); load(); onChanged();
  };
  const reject = async (id: string) => {
    const { error } = await supabase.from("job_applications").update({ status: "rejected" }).eq("id", id);
    if (error) return toast.error(error.message);
    load(); onChanged();
  };
  const noShow = async (id: string) => {
    if (!confirm("정말 노쇼(미출근)로 처리하시겠습니까?")) return;
    const { error } = await supabase.rpc("mark_no_show", { _app_id: id } as any);
    if (error) return toast.error(error.message);
    toast.success("노쇼 처리됨"); load(); onChanged();
  };

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const from = dateFrom ? new Date(dateFrom).getTime() : null;
    const to = dateTo ? new Date(dateTo + "T23:59:59").getTime() : null;
    return apps.filter((a) => {
      if (filter === "approved") {
        if (a.status !== "approved" && a.status !== "confirmed") return false;
      } else if (filter !== "all" && a.status !== filter) return false;
      if (qq) {
        const hay = `${a.profiles?.full_name ?? ""} ${a.profiles?.phone ?? ""} ${a.jobs?.title ?? ""} ${a.jobs?.place_name ?? ""} ${a.message ?? ""}`.toLowerCase();
        if (!hay.includes(qq)) return false;
      }
      const ts = a.created_at ? new Date(a.created_at).getTime() : 0;
      if (from && ts < from) return false;
      if (to && ts > to) return false;
      return true;
    });
  }, [apps, filter, q, dateFrom, dateTo]);

  const counts = {
    pending: apps.filter((a) => a.status === "pending").length,
    approved: apps.filter((a) => a.status === "approved" || a.status === "confirmed").length,
    no_show: apps.filter((a) => a.status === "no_show").length,
  };
  const STATUS_LABEL: Record<string, string> = { pending: "대기", approved: "승인", rejected: "거절", confirmed: "확정", no_show: "노쇼" };

  return (
    <div className="p-5 space-y-4">
      <div>
        <h2 className="text-lg font-bold">신청 / 승인 관리</h2>
        <p className="text-xs text-muted-foreground">대기 {counts.pending} · 승인/확정 {counts.approved} · 노쇼 {counts.no_show}</p>
      </div>
      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="pending">대기 ({counts.pending})</TabsTrigger>
          <TabsTrigger value="approved">승인/확정 ({counts.approved})</TabsTrigger>
          <TabsTrigger value="no_show">노쇼 ({counts.no_show})</TabsTrigger>
          <TabsTrigger value="all">전체</TabsTrigger>
        </TabsList>
      </Tabs>
      <Card>
        <CardContent className="p-3 grid grid-cols-[1fr_auto_auto] gap-2 items-end">
          <div>
            <Label className="text-xs">지원자/공고/장소/연락처 검색</Label>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="검색어 입력" />
          </div>
          <div>
            <Label className="text-xs">신청 시작일</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">신청 종료일</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </CardContent>
      </Card>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>지원자</TableHead>
              <TableHead>공고 / 장소</TableHead>
              <TableHead>프로필</TableHead>
              <TableHead>메시지</TableHead>
              <TableHead className="text-center">상태</TableHead>
              <TableHead className="text-right">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">불러오는 중…</TableCell></TableRow>}
            {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">내역이 없습니다</TableCell></TableRow>}
            {filtered.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <p className="font-medium">{a.profiles?.full_name ?? "(이름미입력)"}</p>
                  {(a.status === "approved" || a.status === "confirmed") && a.profiles?.phone && (
                    <a href={`tel:${a.profiles.phone}`} className="text-xs text-primary underline">{a.profiles.phone}</a>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                  <p className="truncate">{a.jobs?.title}</p>
                  <p className="truncate">{a.jobs?.place_name}</p>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {a.seeker_profiles?.nationality && <Badge variant="secondary" className="text-[10px]">{a.seeker_profiles.nationality === "foreigner" ? "외국인" : "내국인"}</Badge>}
                    {a.seeker_profiles?.experience && <Badge variant="outline" className="text-[10px]">{a.seeker_profiles.experience === "lt5" ? "경력 5회 미만" : "5회 이상"}</Badge>}
                    {a.seeker_profiles?.korean_ok && <Badge variant="outline" className="text-[10px]">한국어 가능</Badge>}
                    {a.seeker_profiles?.visa && <Badge variant="outline" className="text-[10px]">{a.seeker_profiles.visa}</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-xs italic text-muted-foreground max-w-[200px] truncate">{a.message ?? "-"}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={a.status === "rejected" || a.status === "no_show" ? "destructive" : a.status === "pending" ? "secondary" : "default"}
                    className={a.status === "confirmed" ? "bg-green-600 text-white border-transparent" : ""}>
                    {STATUS_LABEL[a.status] ?? a.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-1">
                    {a.status === "pending" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => reject(a.id)}>거절</Button>
                        <Button size="sm" onClick={() => approve(a.id)}>승인 (1크레딧)</Button>
                      </>
                    )}
                    {(a.status === "approved" || a.status === "confirmed") && (
                      <Button size="sm" variant="outline" onClick={() => noShow(a.id)}>노쇼 표시</Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

/* ----------------- 크레딧 ----------------- */
function CreditsPanel({ userId, onChanged }: { userId: string; onChanged: () => void }) {
  const [emp, setEmp] = useState<any>(null);
  const [tx, setTx] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [purDateFrom, setPurDateFrom] = useState("");
  const [purDateTo, setPurDateTo] = useState("");
  const [purStatus, setPurStatus] = useState<"all" | "fulfilled" | "pending">("all");

  const load = useCallback(async () => {
    const [{ data: e }, { data: t }, { data: p }] = await Promise.all([
      supabase.from("employer_profiles").select("*").eq("user_id", userId).single(),
      supabase.from("credit_transactions").select("*").eq("employer_id", userId).order("created_at", { ascending: false }).limit(100),
      supabase.from("credit_purchase_requests").select("*").eq("employer_id", userId).order("created_at", { ascending: false }).limit(100),
    ]);
    setEmp(e); setTx(t ?? []); setPurchases(p ?? []);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const createOrder = useServerFn(createCreditOrder);
  const fetchPublicCfg = useServerFn(getTossPublicConfig);
  const [busyPack, setBusyPack] = useState<number | null>(null);
  const [txDetail, setTxDetail] = useState<any | null>(null);
  const [txDetailExtra, setTxDetailExtra] = useState<any | null>(null);
  const [txDetailLoading, setTxDetailLoading] = useState(false);
  const widgetsRef = useRef<any>(null);

  const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  const TYPE_LABEL: Record<string, string> = {
    approval_use: "신청 승인 차감",
    purchase: "크레딧 충전",
    admin_grant: "관리자 무상지급",
    promote_use: "프리미엄 광고 차감",
    refund: "환불",
  };
  const STATUS_LABEL: Record<string, string> = { pending: "대기", approved: "승인", rejected: "거절", confirmed: "출근 확정", no_show: "노쇼", cancelled: "취소" };

  const openTxDetail = async (t: any) => {
    setTxDetail(t);
    setTxDetailExtra(null);
    const match = t?.note?.match(UUID_RE);
    if (!match || t.type !== "approval_use") return;
    setTxDetailLoading(true);
    try {
      const { data: app } = await supabase.from("job_applications").select("*").eq("id", match[0]).maybeSingle();
      if (!app) { setTxDetailExtra({ notFound: true }); return; }
      const [jobRes, profRes] = await Promise.all([
        supabase.from("jobs").select("id, title, place_name, location, daily_wage, work_dates").eq("id", app.job_id).maybeSingle(),
        supabase.from("profiles").select("id, full_name, phone").eq("id", app.seeker_id).maybeSingle(),
      ]);
      setTxDetailExtra({ app, job: jobRes.data, profile: profRes.data });
    } catch {
      setTxDetailExtra({ error: true });
    } finally { setTxDetailLoading(false); }
  };

  useEffect(() => { loadTossSdk().catch(() => {}); }, []);

  const purchase = async (pack: number) => {
    setBusyPack(pack);
    try {
      const TossPayments = await loadTossSdk();
      const cfg = await fetchPublicCfg({}).catch(() => null);
      if (cfg && !cfg.enabled) { toast.error("현재 결제가 비활성화되어 있습니다."); return; }
      const clientKey = cfg?.clientKey || FALLBACK_TOSS_CLIENT_KEY;
      const order = await createOrder({ data: { pack } });
      const tossPayments = TossPayments(clientKey);
      const successUrl = window.location.origin + "/employer/credits/success";
      const failUrl = window.location.origin + "/employer/credits/fail";

      // API 개별 연동 키(ck_)는 결제창 API, 결제위젯 연동 키(gck_)는 위젯 API 사용
      if (!clientKey.includes("_gck_")) {
        const payment = tossPayments.payment({ customerKey: userId });
        await payment.requestPayment({
          method: "CARD",
          amount: { currency: "KRW", value: order.amount },
          orderId: order.orderId,
          orderName: order.orderName,
          successUrl,
          failUrl,
          card: { useEscrow: false, flowMode: "DEFAULT", useCardPoint: false, useAppCardOnly: false },
        });
        return;
      }

      const widgets = tossPayments.widgets({ customerKey: userId });
      widgetsRef.current = widgets;
      await widgets.setAmount({ value: order.amount, currency: "KRW" });
      const paymentWindow = await widgets.renderPaymentWindow({
        variantKey: { paymentMethod: "DEFAULT", agreement: "AGREEMENT" },
      });
      paymentWindow.on("paymentRequest", async () => {
        try {
          await widgets.requestPayment({
            orderId: order.orderId,
            orderName: order.orderName,
            successUrl,
            failUrl,
          });
        } catch (err: any) { toast.error(err?.message || "결제 요청 실패"); }
      });
    } catch (e: any) {
      toast.error(e?.message || "결제창을 열 수 없습니다");
    } finally { setBusyPack(null); }
  };


  return (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-[1fr_2fr] gap-4">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-5">
            <p className="text-xs opacity-80">{emp?.company_name ?? "회사"}</p>
            <p className="text-xs opacity-80 mt-2">보유 크레딧</p>
            <p className="text-4xl font-bold">{emp?.credits ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 space-y-2">
            <h3 className="font-bold text-sm">크레딧 구매 (1크레딧 = 1,000원)</h3>
            <p className="text-[11px] text-muted-foreground">토스페이먼츠를 통해 안전하게 결제됩니다. 결제 완료 후 크레딧이 자동 적립됩니다.</p>
            <p className="text-[11px] text-muted-foreground">※ 임의 금액 입력은 지원되지 않으며, 아래 <b>고정 상품</b> 중에서만 결제할 수 있습니다.</p>
            <div className="grid grid-cols-3 gap-2">
              {CREDIT_PACKS.map((p) => (
                <Button key={p.qty} variant="outline" className="h-auto py-3 flex flex-col" onClick={() => purchase(p.qty)} disabled={busyPack !== null}>
                  <span className="font-bold text-base">{p.qty} 크레딧</span>
                  <span className="text-xs text-muted-foreground">{p.price.toLocaleString()}원</span>
                  {busyPack === p.qty && <span className="text-[10px] text-primary mt-1">결제창 여는 중…</span>}
                </Button>
              ))}
            </div>
            <div className="mt-2 p-2 rounded bg-muted/50 text-[11px] leading-relaxed text-muted-foreground">
              <p className="text-foreground font-semibold mb-1">크레딧 사용 경로</p>
              <p>· 구직자 신청 <b>승인</b> 시 건당 1 크레딧 차감</p>
              <p>· 공고 <b>프리미엄 노출(광고)</b> 등록 시 10~25 크레딧 차감 (기간별)</p>
            </div>
            <div className="mt-1 p-2 rounded bg-amber-50 border border-amber-200 text-[11px] leading-relaxed text-amber-900">
              <p className="font-semibold mb-0.5">환불 정책</p>
              <p>결제 후 7일 이내 & 미사용 시 전액 환불, 일부 사용 시 잔여분 부분 환불(수수료 차감).</p>
              <p><b>충전된 크레딧은 서비스 내 결제 수단이며, 현금·상품권 등으로 환급/전환되지 않습니다.</b></p>
              <a href="/terms" target="_blank" rel="noreferrer" className="text-primary underline">환불정책 전문 →</a>
            </div>
          </CardContent>
        </Card>

      </div>


      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-sm">구매 내역</h3>
            </div>
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end mb-3">
              <div>
                <Label className="text-[10px]">시작일</Label>
                <Input type="date" value={purDateFrom} onChange={(e) => setPurDateFrom(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-[10px]">종료일</Label>
                <Input type="date" value={purDateTo} onChange={(e) => setPurDateTo(e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant={purStatus === "all" ? "default" : "outline"} onClick={() => setPurStatus("all")}>전체</Button>
                <Button size="sm" variant={purStatus === "fulfilled" ? "default" : "outline"} onClick={() => setPurStatus("fulfilled")}>완료</Button>
                <Button size="sm" variant={purStatus === "pending" ? "default" : "outline"} onClick={() => setPurStatus("pending")}>대기</Button>
              </div>
            </div>
            {(() => {
              const from = purDateFrom ? new Date(purDateFrom).getTime() : null;
              const to = purDateTo ? new Date(purDateTo + "T23:59:59").getTime() : null;
              const list = purchases.filter((p) => {
                if (purStatus !== "all" && p.status !== purStatus) return false;
                const ts = p.created_at ? new Date(p.created_at).getTime() : 0;
                if (from && ts < from) return false;
                if (to && ts > to) return false;
                return true;
              });
              const totalQty = list.reduce((s, p) => s + Number(p.pack ?? 0), 0);
              const totalAmt = list.reduce((s, p) => s + Number(p.amount_krw ?? 0), 0);
              return (
                <>
                  <p className="text-[11px] text-muted-foreground mb-2">표시 {list.length}건 · 총 {totalQty}크레딧 / {totalAmt.toLocaleString()}원</p>
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>일시</TableHead><TableHead>크레딧</TableHead><TableHead>금액</TableHead><TableHead>상태</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {list.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6">내역 없음</TableCell></TableRow>}
                      {list.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-xs">{new Date(p.created_at).toLocaleDateString("ko-KR")}</TableCell>
                          <TableCell className="text-xs">{p.pack}</TableCell>
                          <TableCell className="text-xs">{Number(p.amount_krw).toLocaleString()}원</TableCell>
                          <TableCell><Badge variant={p.status === "fulfilled" ? "default" : "secondary"} className="text-[10px]">{p.status === "fulfilled" ? "완료" : "대기"}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              );
            })()}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <h3 className="font-bold text-sm mb-2">사용 내역</h3>
            <Table>
              <TableHeader><TableRow>
                <TableHead>일시</TableHead><TableHead>내용</TableHead><TableHead className="text-right">증감</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {tx.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-6">내역 없음</TableCell></TableRow>}
                {tx.map((t) => (
                  <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openTxDetail(t)}>
                    <TableCell className="text-xs">{new Date(t.created_at).toLocaleDateString("ko-KR")}</TableCell>
                    <TableCell className="text-xs">
                      {t.type === "approval_use"
                        ? (t.note?.replace(UUID_RE, "").replace(/[:：]\s*$/, "").trim() || "신청 승인")
                        : (t.note ?? TYPE_LABEL[t.type] ?? t.type)}
                    </TableCell>
                    <TableCell className={`text-xs text-right font-bold ${t.delta > 0 ? "text-green-600" : "text-red-600"}`}>
                      {t.delta > 0 ? "+" : ""}{t.delta}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!txDetail} onOpenChange={(o) => !o && (setTxDetail(null), setTxDetailExtra(null))}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>사용 내역 상세</DialogTitle></DialogHeader>
          {txDetail && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">일시</span><span>{new Date(txDetail.created_at).toLocaleString("ko-KR")}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">유형</span><span>{TYPE_LABEL[txDetail.type] ?? txDetail.type}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">증감</span><span className={`font-bold ${txDetail.delta > 0 ? "text-green-600" : "text-red-600"}`}>{txDetail.delta > 0 ? "+" : ""}{txDetail.delta} 크레딧</span></div>

              {txDetail.type === "approval_use" && (
                <>
                  <hr className="my-2" />
                  <p className="text-xs font-semibold text-foreground">승인한 신청 상세</p>
                  {txDetailLoading && <p className="text-xs text-muted-foreground text-center py-3">불러오는 중…</p>}
                  {txDetailExtra?.notFound && <p className="text-xs text-muted-foreground">연결된 신청을 찾을 수 없습니다 (삭제되었을 수 있음).</p>}
                  {txDetailExtra?.error && <p className="text-xs text-red-600">상세 정보를 불러오지 못했습니다.</p>}
                  {txDetailExtra?.app && (
                    <div className="space-y-1.5 bg-muted/40 p-3 rounded">
                      <DetailRow label="공고" value={txDetailExtra.job?.title ?? "-"} />
                      <DetailRow label="장소" value={txDetailExtra.job?.place_name ?? "-"} />
                      <DetailRow label="지역" value={txDetailExtra.job?.location ?? "-"} />
                      <DetailRow label="일당" value={txDetailExtra.job?.daily_wage ? `${Number(txDetailExtra.job.daily_wage).toLocaleString()}원` : "-"} />
                      <DetailRow label="근무일" value={(txDetailExtra.job?.work_dates ?? []).join(", ") || "-"} />
                      <hr className="my-1" />
                      <DetailRow label="구직자" value={txDetailExtra.profile?.full_name ?? "(이름미입력)"} />
                      <DetailRow label="연락처" value={txDetailExtra.profile?.phone ?? "-"} />
                      <DetailRow label="현재상태" value={STATUS_LABEL[txDetailExtra.app.status] ?? txDetailExtra.app.status} />
                      {txDetailExtra.app.message && (
                        <div>
                          <p className="text-[11px] text-muted-foreground">신청 메모</p>
                          <p className="text-xs italic">"{txDetailExtra.app.message}"</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {txDetail.type !== "approval_use" && txDetail.note && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">내용</p>
                  <p className="bg-muted p-3 rounded text-xs whitespace-pre-wrap break-words">{txDetail.note}</p>
                </div>
              )}
              {txDetail.job_id && (
                <div className="flex justify-between"><span className="text-muted-foreground">공고 ID</span><span className="font-mono text-[10px]">{txDetail.job_id}</span></div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-[11px] text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-medium text-right break-all">{value}</span>
    </div>
  );
}
