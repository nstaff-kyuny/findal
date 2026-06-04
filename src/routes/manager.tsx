import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  LogOut, Monitor, Megaphone, Plus,
} from "lucide-react";
import {
  INDUSTRY_LABEL, ROLE_LABEL, PROMOTION_OPTIONS, CREDIT_PACKS,
} from "@/lib/constants";
import { NewJobPanel, HistoryPanel, ProfilePanel } from "@/components/manager/DesktopPanels";

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

  useEffect(() => { setPhoneKey((k) => k + 1); }, [tab]);

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

  

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <header className="bg-background border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Monitor size={20} />
          <h1 className="font-bold text-lg">구인자 PC 관리자</h1>
          <span className="text-xs text-muted-foreground ml-3">{user.email}</span>
        </div>
        <Button size="sm" variant="outline" onClick={signOut}>
          <LogOut size={14} className="mr-1" />로그아웃
        </Button>
      </header>

      <div className="flex-1 flex justify-center min-h-0">
        <div className="w-full max-w-5xl bg-background border-x flex flex-col min-h-0">
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)} className="flex-1 flex flex-col min-h-0">
            <div className="px-4 pt-3 border-b">
              <TabsList className="flex-wrap h-auto">
                {(Object.keys(TAB_META) as TabValue[]).map((v) => (
                  <TabsTrigger key={v} value={v}>{TAB_META[v].label}</TabsTrigger>
                ))}
              </TabsList>
            </div>
            <div className="flex-1 overflow-auto">
              <TabsContent value="new" className="m-0">
                <NewJobPanel userId={user.id} onCreated={() => setPhoneKey((k) => k + 1)} />
              </TabsContent>
              <TabsContent value="jobs" className="m-0">
                <JobsPanel userId={user.id} onChanged={() => setPhoneKey((k) => k + 1)} />
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
    </div>
  );
}


/* ----------------- 공고 관리 ----------------- */
function JobsPanel({ userId, onChanged }: { userId: string; onChanged: () => void }) {
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
                    {j.is_active ? <Badge>활성</Badge> : <Badge variant="destructive">비활성</Badge>}
                  </TableCell>
                  <TableCell className="text-center text-xs">{editCount}/2</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <a href={`/employer/jobs/edit/${j.id}`} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="secondary" disabled={!canEdit}>수정</Button>
                      </a>
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

  const purchase = async (pack: number, amount: number) => {
    const paymentRef = `MOCK-${Date.now()}`;
    const { error: e1 } = await supabase.from("credit_purchase_requests").insert({
      employer_id: userId, pack, amount_krw: amount,
      status: "fulfilled", payment_ref: paymentRef, payment_method: "online",
    } as any);
    if (e1) return toast.error(e1.message);
    const { error: e2 } = await supabase.from("employer_profiles")
      .update({ credits: (emp?.credits ?? 0) + pack } as any).eq("user_id", userId);
    if (e2) return toast.error(e2.message);
    await supabase.from("credit_transactions").insert({
      employer_id: userId, delta: pack, type: "admin_grant", note: `온라인 구매(${pack} 크레딧)`,
    } as any);
    toast.success(`${pack} 크레딧이 적립되었습니다`);
    load(); onChanged();
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
            <div className="grid grid-cols-3 gap-2">
              {CREDIT_PACKS.map((p) => (
                <Button key={p.qty} variant="outline" className="h-auto py-3 flex flex-col" onClick={() => purchase(p.qty, p.price)}>
                  <span className="font-bold text-base">{p.qty} 크레딧</span>
                  <span className="text-xs text-muted-foreground">{p.price.toLocaleString()}원</span>
                </Button>
              ))}
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
                  <TableRow key={t.id}>
                    <TableCell className="text-xs">{new Date(t.created_at).toLocaleDateString("ko-KR")}</TableCell>
                    <TableCell className="text-xs">{t.note ?? t.type}</TableCell>
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
    </div>
  );
}
