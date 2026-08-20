import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, Fragment } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { adminCreateUser, adminDeleteUser, adminResetPassword, adminListUserEmails, adminListAllUsers, adminSetUserBan, adminUpdateUserProfile, adminUpdateReferrer } from "@/lib/admin-users.functions";
import { normalizeReferrerCode } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { createBackup, listBackups, getBackupDownloadUrl, deleteBackup } from "@/lib/backups.functions";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import { Download, Trash2, UserPlus, KeyRound, Pencil, Briefcase } from "lucide-react";
import { VISA_LABEL, NATIONALITY_LABEL } from "@/lib/constants";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RegionPicker, parseRegions, serializeRegions } from "@/components/RegionPicker";
import { analyzeInquiryText, generateAdminAiInsights, generateAdBannerImage } from "@/lib/ai.functions";
import { getPaymentSettings, savePaymentSettings, diagnoseTossKeys, expireStaleCreditOrders } from "@/lib/toss.functions";
import { adminListRefundRequests, adminApproveRefund, adminRejectRefund } from "@/lib/refunds.functions";


export const Route = createFileRoute("/admin")({ component: Admin });

async function downloadXlsx(rows: any[], sheetName: string, filename: string) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  if (headers.length) {
    ws.columns = headers.map((h) => ({ header: h, key: h }));
    rows.forEach((r) => ws.addRow(r));
  }
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function Admin() {
  const { user, roles, loading, signOut } = useAuth();
  const nav = useNavigate();
  const [isDesktop, setIsDesktop] = useState(typeof window !== "undefined" ? window.innerWidth >= 1024 : true);
  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [loading, user]);
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  if (!user) return null;
  if (!isDesktop) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="max-w-sm w-full">
          <h1 className="font-bold text-lg mb-2">관리자 페이지는 PC에서만 이용 가능합니다</h1>
          <p className="text-sm text-muted-foreground mb-6">데스크탑(1024px 이상) 환경에서 접속해 주세요.</p>
          <div className="flex flex-col gap-2">
            <Button onClick={signOut}>로그아웃</Button>
            <Button variant="outline" onClick={() => nav({ to: "/auth" })}>로그인 화면으로</Button>
          </div>
        </div>
      </div>
    );
  }
  const isAdmin = roles.includes("admin");
  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <header className="bg-background border-b px-8 py-3 flex justify-between items-center sticky top-0 z-30">
        <h1 className="font-bold text-xl text-primary">Find AR (파인달) · 관리자</h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">{user.email}</span>
          <Button size="sm" variant="outline" onClick={signOut}>로그아웃</Button>
        </div>
      </header>
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-8 py-6">
        {!isAdmin ? <AdminClaim onClaimed={() => location.reload()} userId={user.id} /> : <AdminPanel />}
      </main>
    </div>
  );
}

function AdminClaim({ userId, onClaimed }: { userId: string; onClaimed: () => void }) {
  const { signOut } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  useEffect(() => {
    (async () => {
      const { count } = await supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "admin");
      setAdminExists((count ?? 0) > 0);
    })();
  }, []);
  const claim = async () => {
    setBusy(true);
    const { count } = await supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) > 0) { setBusy(false); setAdminExists(true); return toast.error("이미 관리자가 등록되어 있습니다."); }
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" } as any);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("관리자 권한 부여됨"); onClaimed();
  };
  if (adminExists === null) {
    return <div className="text-center py-12 text-sm text-muted-foreground">확인 중...</div>;
  }
  if (adminExists) {
    return (
      <Card className="max-w-md mx-auto mt-12"><CardContent className="p-6 text-center space-y-3">
        <h2 className="font-bold text-lg">관리자 권한이 없는 계정입니다</h2>
        <p className="text-sm text-muted-foreground">현재 로그인한 계정으로는 관리자 페이지에 접근할 수 없습니다.<br/>관리자 계정으로 다시 로그인해 주세요.</p>
        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={async () => { await signOut(); nav({ to: "/auth" }); }}>로그아웃 후 관리자로 로그인</Button>
          <Button variant="outline" onClick={() => nav({ to: "/" })}>홈으로 이동</Button>
        </div>
      </CardContent></Card>
    );
  }
  return (
    <Card className="max-w-md mx-auto mt-12"><CardContent className="p-6 text-center space-y-3">
      <h2 className="font-bold text-lg">관리자 권한이 없습니다</h2>
      <p className="text-sm text-muted-foreground">아직 등록된 관리자가 없습니다. 최초 관리자로 등록할 수 있습니다.</p>
      <Button onClick={claim} disabled={busy}>최초 관리자로 등록</Button>
    </CardContent></Card>
  );
}

const MENU_GROUPS: { id: string; label: string; items: { value: string; label: string }[] }[] = [
  {
    id: "users",
    label: "사용자/권한",
    items: [
      { value: "all-users", label: "전체 사용자" },
      { value: "users", label: "사용자 추가" },
      { value: "referrers", label: "추천인" },
      { value: "partners", label: "협력업체" },
    ],
  },
  {
    id: "content",
    label: "콘텐츠/소식",
    items: [
      { value: "notices", label: "공지사항" },
      { value: "events", label: "이벤트" },
      { value: "faqs", label: "FAQ" },
      { value: "banners", label: "광고 배너" },
    ],
  },
  {
    id: "billing",
    label: "결제/크레딧",
    items: [
      { value: "credits", label: "크레딧" },
      { value: "purchases", label: "크레딧 구매현황" },
      { value: "payment", label: "결제 연동" },
      { value: "refunds", label: "환불 신청 관리" },
    ],
  },
  {
    id: "settings",
    label: "앱 설정",
    items: [
      { value: "company", label: "사업자정보" },
      { value: "legal", label: "약관/정책" },
      { value: "version", label: "앱 버전" },
      { value: "icons", label: "앱 아이콘" },
      { value: "taxonomy", label: "업종/직무" },
    ],
  },
  {
    id: "ops",
    label: "분석/백업",
    items: [
      { value: "ai-insights", label: "AI 인사이트" },
      { value: "backups", label: "데이터 백업" },
    ],
  },
];

function AdminPanel() {
  const [tab, setTab] = useState("all-users");
  const groupOf = (val: string) => MENU_GROUPS.find(g => g.items.some(i => i.value === val))?.id ?? MENU_GROUPS[0].id;
  const [openGroup, setOpenGroup] = useState<string>(groupOf("all-users"));
  useEffect(() => { setOpenGroup(groupOf(tab)); }, [tab]);
  return (
    <Tabs value={tab} onValueChange={setTab} orientation="vertical" className="flex flex-row gap-8 items-start">
      <aside className="w-56 shrink-0 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-auto">
        <div className="bg-background border rounded-lg p-2">
          <TabsList className="contents">
            <Accordion type="single" collapsible value={openGroup} onValueChange={(v) => setOpenGroup(v)} className="w-full">
              {MENU_GROUPS.map((g) => (
                <AccordionItem key={g.id} value={g.id} className="border-b last:border-b-0">
                  <AccordionTrigger className="py-2 px-2 text-sm font-semibold">{g.label}</AccordionTrigger>
                  <AccordionContent className="pb-1 pt-0">
                    <div className="flex flex-col gap-0.5 pl-2">
                      {g.items.map((it) => (
                        <TabsTrigger key={it.value} value={it.value} className="justify-start w-full">
                          {it.label}
                        </TabsTrigger>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </TabsList>
        </div>
      </aside>
      <div className="flex-1 min-w-0">
        <TabsContent value="all-users"><AllUsersTab /></TabsContent>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="credits"><CreditsTab /></TabsContent>
        <TabsContent value="referrers"><ReferrersTab /></TabsContent>
        <TabsContent value="banners"><BannersTab /></TabsContent>
        <TabsContent value="purchases"><PurchasesTab /></TabsContent>
        <TabsContent value="payment"><PaymentTab /></TabsContent>
        <TabsContent value="refunds"><RefundRequestsCard /></TabsContent>
        <TabsContent value="notices"><NoticesTab /></TabsContent>
        <TabsContent value="events"><EventsTab /></TabsContent>
        <TabsContent value="faqs"><FaqsTab /></TabsContent>
        <TabsContent value="partners"><PartnersTab /></TabsContent>
        <TabsContent value="ai-insights"><AiInsightsTab /></TabsContent>
        <TabsContent value="company"><CompanyInfoTab /></TabsContent>
        <TabsContent value="legal"><LegalDocsTab /></TabsContent>
        <TabsContent value="version"><VersionTab /></TabsContent>
        <TabsContent value="icons"><IconsTab /></TabsContent>
        <TabsContent value="taxonomy"><TaxonomyTab /></TabsContent>
        <TabsContent value="backups"><BackupsTab /></TabsContent>
      </div>
    </Tabs>
  );
}

function BackupsTab() {
  const [items, setItems] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const list = useServerFn(listBackups);
  const create = useServerFn(createBackup);
  const getUrl = useServerFn(getBackupDownloadUrl);
  const del = useServerFn(deleteBackup);

  const refresh = async () => {
    setLoading(true);
    try {
      const r: any = await list();
      setItems(r.backups ?? []);
    } catch (e: any) {
      toast.error(e?.message ?? "불러오기 실패");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { refresh(); }, []);

  const run = async () => {
    setBusy(true);
    try {
      await create();
      toast.success("백업 생성 완료");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "백업 실패");
    } finally { setBusy(false); }
  };

  const download = async (path: string) => {
    try {
      const r: any = await getUrl({ data: { path } });
      const a = document.createElement("a");
      a.href = r.url;
      a.download = path;
      a.target = "_blank";
      a.click();
    } catch (e: any) { toast.error(e?.message ?? "다운로드 실패"); }
  };

  const remove = async (id: string, path: string | null) => {
    if (!confirm("이 백업을 삭제할까요?")) return;
    try {
      await del({ data: { id, path } });
      toast.success("삭제됨");
      await refresh();
    } catch (e: any) { toast.error(e?.message ?? "삭제 실패"); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-bold">데이터 백업</h3>
              <p className="text-xs text-muted-foreground">전체 데이터(근로자/구인자/공고 등)와 앱 구조 정보를 JSON으로 저장합니다. 매일 새벽 3시에 자동으로 백업됩니다.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={refresh} disabled={loading}>새로고침</Button>
              <Button onClick={run} disabled={busy}>{busy ? "백업 중..." : "지금 백업하기"}</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-2">
          <h4 className="font-semibold text-sm">백업 목록</h4>
          {loading ? (
            <div className="text-sm text-muted-foreground py-6 text-center">불러오는 중...</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">아직 백업이 없습니다.</div>
          ) : (
            <div className="space-y-1">
              {items.map((b) => (
                <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 border rounded-md px-3 py-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <Badge variant={b.status === "completed" ? "default" : b.status === "failed" ? "destructive" : "secondary"}>
                      {b.status === "completed" ? "완료" : b.status === "failed" ? "실패" : b.status === "running" ? "진행 중" : b.status}
                    </Badge>
                    <Badge variant="outline">{b.kind === "scheduled" ? "자동" : "수동"}</Badge>
                    <span className="text-muted-foreground">{new Date(b.created_at).toLocaleString("ko-KR")}</span>
                    {b.size_bytes ? <span className="text-muted-foreground">{(b.size_bytes / 1024).toFixed(1)} KB</span> : null}
                    {b.file_path ? <span className="truncate font-mono text-[11px] text-muted-foreground">{b.file_path}</span> : null}
                    {b.error ? <span className="text-destructive truncate">{b.error}</span> : null}
                  </div>
                  <div className="flex gap-1">
                    {b.file_path && b.status === "completed" ? (
                      <Button size="sm" variant="outline" className="h-7" onClick={() => download(b.file_path)}>
                        <Download className="h-3 w-3 mr-1" />다운로드
                      </Button>
                    ) : null}
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => remove(b.id, b.file_path)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LegalDocsTab() {
  const KINDS = [
    { key: "terms", label: "이용약관" },
    { key: "privacy", label: "개인정보처리방침" },
    { key: "refund", label: "환불정책" },
  ] as const;
  const [active, setActive] = useState<"terms" | "privacy" | "refund">("terms");
  const [contents, setContents] = useState<Record<string, string>>({ terms: "", privacy: "", refund: "" });
  const [defaults, setDefaults] = useState<Record<string, string>>({ terms: "", privacy: "", refund: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data }, mod] = await Promise.all([
        (supabase as any).from("legal_documents").select("kind, content"),
        import("@/routes/terms"),
      ]);
      const def = { terms: mod.DEFAULT_TERMS, privacy: mod.DEFAULT_PRIVACY, refund: mod.DEFAULT_REFUND };
      setDefaults(def);
      const next: any = { ...def };
      for (const r of (data || [])) {
        if (r.content && r.content.trim()) next[r.kind] = r.content;
      }
      setContents(next);
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await (supabase as any)
      .from("legal_documents")
      .upsert({ kind: active, content: contents[active] }, { onConflict: "kind" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("저장되었습니다");
  };

  const resetToDefault = () => {
    setContents((p) => ({ ...p, [active]: defaults[active] }));
  };

  if (loading) return <div className="text-sm text-muted-foreground py-8 text-center">불러오는 중...</div>;

  return (
    <Card className="mt-4 max-w-3xl"><CardContent className="p-4 space-y-3">
      <div>
        <h3 className="font-bold">약관 및 정책 관리</h3>
        <p className="text-xs text-muted-foreground mt-1">설정 → 약관 및 정책 페이지에 표시되는 내용입니다. 저장 후 즉시 반영됩니다.</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        {KINDS.map((k) => (
          <Button key={k.key} size="sm" variant={active === k.key ? "default" : "outline"} onClick={() => setActive(k.key)}>
            {k.label}
          </Button>
        ))}
      </div>
      <Textarea
        value={contents[active]}
        onChange={(e) => setContents((p) => ({ ...p, [active]: e.target.value }))}
        rows={24}
        className="font-mono text-xs"
      />
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={resetToDefault} disabled={saving}>기본값으로 되돌리기</Button>
        <Button onClick={save} disabled={saving}>{saving ? "저장 중..." : "저장"}</Button>
      </div>
    </CardContent></Card>
  );
}

function CompanyInfoTab() {
  const [data, setData] = useState<any>({
    name: "", ceo: "", biz_no: "", mail_order_no: "", app_name: "", address: "", phone: "", email: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    (async () => {
      const { data: row } = await (supabase as any).from("company_info").select("*").eq("id", true).maybeSingle();
      if (row) setData({
        name: row.name ?? "", ceo: row.ceo ?? "", biz_no: row.biz_no ?? "",
        mail_order_no: row.mail_order_no ?? "", app_name: row.app_name ?? "",
        address: row.address ?? "", phone: row.phone ?? "", email: row.email ?? "",
      });
      setLoading(false);
    })();
  }, []);
  const save = async () => {
    setSaving(true);
    const { error } = await (supabase as any).from("company_info").upsert({ id: true, ...data }, { onConflict: "id" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("사업자 정보가 저장되었습니다");
  };
  if (loading) return <div className="text-sm text-muted-foreground py-8 text-center">불러오는 중...</div>;
  return (
    <Card className="mt-4 max-w-2xl"><CardContent className="p-4 space-y-3">
      <div>
        <h3 className="font-bold">사업자 정보 관리</h3>
        <p className="text-xs text-muted-foreground mt-1">아래 정보는 설정 페이지 하단에 표시됩니다.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>회사명</Label><Input value={data.name} onChange={e => setData({ ...data, name: e.target.value })} /></div>
        <div><Label>대표자</Label><Input value={data.ceo} onChange={e => setData({ ...data, ceo: e.target.value })} /></div>
        <div><Label>사업자등록번호</Label><Input value={data.biz_no} onChange={e => setData({ ...data, biz_no: e.target.value })} /></div>
        <div><Label>통신판매업등록번호</Label><Input value={data.mail_order_no} onChange={e => setData({ ...data, mail_order_no: e.target.value })} /></div>
        <div><Label>앱 이름</Label><Input value={data.app_name} onChange={e => setData({ ...data, app_name: e.target.value })} /></div>
        <div><Label>대표 연락처</Label><Input value={data.phone} onChange={e => setData({ ...data, phone: e.target.value })} /></div>
        <div className="col-span-2"><Label>주소</Label><Input value={data.address} onChange={e => setData({ ...data, address: e.target.value })} /></div>
        <div className="col-span-2"><Label>이메일</Label><Input type="email" value={data.email} onChange={e => setData({ ...data, email: e.target.value })} /></div>
      </div>
      <Button onClick={save} disabled={saving}>{saving ? "저장 중..." : "저장"}</Button>
    </CardContent></Card>
  );
}

function AllUsersTab() {
  const listAll = useServerFn(adminListAllUsers);
  const setBan = useServerFn(adminSetUserBan);
  const hardDelete = useServerFn(adminDeleteUser);
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "seeker" | "employer" | "admin">("all");
  const [sortBy, setSortBy] = useState<"created_desc" | "created_asc" | "role">("created_desc");
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);


  const load = async () => {
    setLoading(true);
    try {
      const { users } = await listAll({});
      // join with profiles, roles, seeker referrer
      const ids = users.map((u: any) => u.id);
      const [{ data: profs }, { data: roles }, { data: seekers }, { data: emps }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, phone").in("id", ids),
        supabase.from("user_roles").select("user_id, role").in("user_id", ids),
        supabase.from("seeker_profiles").select("user_id, referrer_code, nationality, visa, korean_ok, experience, preferred_region, notify_push, notify_marketing, created_at").in("user_id", ids),
        supabase.from("employer_profiles").select("user_id, company_name, referrer_code, location, manager_name, contact_phone, credits, notify_push, notify_marketing, created_at").in("user_id", ids),
      ]);
      const pmap: Record<string, any> = {}; (profs ?? []).forEach((p: any) => pmap[p.id] = p);
      const rmap: Record<string, string[]> = {}; (roles ?? []).forEach((r: any) => { (rmap[r.user_id] ??= []).push(r.role); });
      const smap: Record<string, any> = {}; (seekers ?? []).forEach((s: any) => smap[s.user_id] = s);
      const emap: Record<string, any> = {}; (emps ?? []).forEach((e: any) => emap[e.user_id] = e);
      setRows(users.map((u: any) => ({
        ...u,
        full_name: pmap[u.id]?.full_name ?? "",
        phone: pmap[u.id]?.phone ?? "",
        roles: (rmap[u.id] ?? []).join(", "),
        referrer_code: smap[u.id]?.referrer_code ?? emap[u.id]?.referrer_code ?? "",
        company_name: emap[u.id]?.company_name ?? "",
        seeker: smap[u.id] ?? null,
        employer: emap[u.id] ?? null,
      })));
    } catch (e: any) {
      toast.error(e?.message ?? "로드 실패");
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleBan = async (uid: string, ban: boolean, label: string) => {
    const msg = ban ? `'${label}' 사용자를 삭제(비활성화)할까요? 복구 가능합니다.` : `'${label}' 사용자를 복구할까요?`;
    if (!confirm(msg)) return;
    try {
      await setBan({ data: { userId: uid, ban } });
      toast.success(ban ? "삭제되었습니다" : "복구되었습니다");
      load();
    } catch (e: any) { toast.error(e?.message ?? "실패"); }
  };

  const handleHardDelete = async (uid: string, label: string) => {
    if (!confirm(`'${label}' 사용자를 완전 삭제합니다.\n이 작업은 되돌릴 수 없습니다. 계속할까요?`)) return;
    if (!confirm("정말로 완전 삭제하시겠습니까? 모든 관련 데이터가 영구 삭제됩니다.")) return;
    try {
      await hardDelete({ data: { userId: uid } });
      toast.success("완전 삭제되었습니다");
      load();
    } catch (e: any) { toast.error(e?.message ?? "실패"); }
  };

  const filtered = (() => {
    let arr = rows.filter(r => {
      if (roleFilter !== "all") {
        const rolesArr = (r.roles ?? "").split(",").map((x: string) => x.trim()).filter(Boolean);
        if (!rolesArr.includes(roleFilter)) return false;
      }
      if (!q) return true;
      const s = q.toLowerCase();
      return (r.email ?? "").toLowerCase().includes(s) ||
        (r.full_name ?? "").toLowerCase().includes(s) ||
        (r.company_name ?? "").toLowerCase().includes(s) ||
        (r.phone ?? "").includes(s) ||
        (r.referrer_code ?? "").toLowerCase().includes(s);
    });
    if (sortBy === "created_asc") arr = [...arr].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    else if (sortBy === "created_desc") arr = [...arr].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    else if (sortBy === "role") arr = [...arr].sort((a, b) => (a.roles ?? "").localeCompare(b.roles ?? ""));
    return arr;
  })();


  const exportAll = () => {
    const data = filtered.map(r => {
      const s = r.seeker;
      const e = r.employer;
      return {
        이메일: r.email,
        이름: r.full_name,
        전화: r.phone,
        권한: r.roles,
        회사명: e?.company_name ?? "",
        담당자명: e?.manager_name ?? "",
        회사연락처: e?.contact_phone ?? "",
        회사주소: e?.location ?? "",
        보유크레딧: e?.credits ?? "",
        국적: s ? (NATIONALITY_LABEL[s.nationality] ?? s.nationality ?? "") : "",
        비자: s ? (s.nationality === "korean" ? "해당없음" : (VISA_LABEL[s.visa] ?? s.visa ?? "")) : "",
        한국어가능: s ? (s.korean_ok ? "가능" : "불가") : "",
        경력: s ? (s.experience === "lt5" ? "5회 미만" : s.experience === "gte5" ? "5회 이상" : (s.experience ?? "")) : "",
        선호지역: s?.preferred_region ?? "",
        추천인코드: r.referrer_code,
        푸시알림: (s?.notify_push ?? e?.notify_push) === undefined ? "" : ((s?.notify_push ?? e?.notify_push) ? "ON" : "OFF"),
        마케팅알림: (s?.notify_marketing ?? e?.notify_marketing) === undefined ? "" : ((s?.notify_marketing ?? e?.notify_marketing) ? "ON" : "OFF"),
        가입일: new Date(r.created_at).toLocaleString("ko-KR"),
        최근로그인: r.last_sign_in_at ? new Date(r.last_sign_in_at).toLocaleString("ko-KR") : "-",
        상태: r.banned_until && new Date(r.banned_until) > new Date() ? "삭제됨" : "활성",
        사용자ID: r.id,
      };
    });
    downloadXlsx(data, "전체사용자", `전체사용자_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div className="space-y-4 mt-4">
      <Card><CardContent className="p-4">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <h3 className="font-bold">전체 사용자 ({filtered.length}/{rows.length})</h3>
            <Input placeholder="이메일/이름/회사/전화/추천인 검색" value={q} onChange={e => setQ(e.target.value)} className="max-w-xs" />
            <Select value={roleFilter} onValueChange={(v: any) => setRoleFilter(v)}>
              <SelectTrigger className="w-32"><SelectValue placeholder="권한" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 권한</SelectItem>
                <SelectItem value="seeker">구직자만</SelectItem>
                <SelectItem value="employer">구인자만</SelectItem>
                <SelectItem value="admin">관리자만</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-40"><SelectValue placeholder="정렬" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="created_desc">가입일 최신순</SelectItem>
                <SelectItem value="created_asc">가입일 오래된순</SelectItem>
                <SelectItem value="role">권한순</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>{loading ? "로딩..." : "새로고침"}</Button>
            <Button size="sm" variant="outline" onClick={exportAll}><Download size={14} className="mr-1" />엑셀 다운로드</Button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto border rounded">
          <table className="w-full text-xs">
            <thead className="bg-muted sticky top-0">
              <tr>
                <th className="p-2 text-left">이메일</th>
                <th className="p-2 text-left">이름/회사</th>
                <th className="p-2 text-left">전화</th>
                <th className="p-2 text-left">권한</th>
                <th className="p-2 text-left">추천인</th>
                <th className="p-2 text-left">가입일</th>
                <th className="p-2 text-left">최근 로그인</th>
                <th className="p-2 text-left">상태</th>
                <th className="p-2 text-left">작업</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const banned = r.banned_until && new Date(r.banned_until) > new Date();
                return (
                  <tr key={r.id} className="border-t hover:bg-muted/30">
                    <td className="p-2">{r.email}</td>
                    <td className="p-2">{r.full_name || r.company_name || "-"}</td>
                    <td className="p-2">{r.phone || "-"}</td>
                    <td className="p-2">
                      {r.roles
                        ? r.roles.split(",").map((raw: string, idx: number) => {
                            const role = raw.trim();
                            const label = role === "seeker" ? "구직자" : role === "employer" ? "구인자" : role === "admin" ? "관리자" : role === "manager" ? "매니저" : role;
                            if (role === "employer") {
                              return (
                                <span key={idx} className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-xs font-medium border border-blue-100">
                                  <Briefcase size={12} />
                                  {label}
                                </span>
                              );
                            }
                            return (
                              <span key={idx}>
                                {idx > 0 ? ", " : ""}{label}
                              </span>
                            );
                          })
                        : "-"}
                    </td>
                    <td className="p-2">{r.referrer_code || "-"}</td>
                    <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString("ko-KR")}</td>
                    <td className="p-2 whitespace-nowrap">{r.last_sign_in_at ? new Date(r.last_sign_in_at).toLocaleString("ko-KR") : "-"}</td>
                    <td className="p-2">{banned ? <Badge variant="destructive">삭제됨</Badge> : <Badge variant="outline">활성</Badge>}</td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" title="정보 수정" onClick={() => setEditUserId(r.id)}>
                          <Pencil size={14} />
                        </Button>
                        {banned ? (
                          <Button size="sm" variant="outline" onClick={() => handleBan(r.id, false, r.email)}>복구</Button>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => handleBan(r.id, true, r.email)} title="삭제(복구가능)">
                            <Trash2 size={14} className="text-destructive" />
                          </Button>
                        )}
                        <Button size="sm" variant="destructive" onClick={() => handleHardDelete(r.id, r.email)} title="완전 삭제">완전삭제</Button>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent></Card>
      <EditUserDialog userId={editUserId} open={!!editUserId} onOpenChange={(v) => { if (!v) setEditUserId(null); }} onSaved={load} />
    </div>

  );
}

function IconsTab() {
  const [version, setVersion] = useState(Date.now());
  const [busy, setBusy] = useState<string | null>(null);
  const base = "https://adrnhxpzkqyqzfcihokt.supabase.co/storage/v1/object/public/app-icons";

  const upload = async (file: File, name: "icon-192.png" | "icon-512.png", expectedSize: number) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;
    await new Promise((r) => (img.onload = r));
    URL.revokeObjectURL(url);
    if (img.width !== expectedSize || img.height !== expectedSize) {
      toast.error(`이미지 크기는 정확히 ${expectedSize}x${expectedSize} 이어야 합니다. (현재 ${img.width}x${img.height})`);
      return;
    }
    setBusy(name);
    const { error } = await supabase.storage.from("app-icons").upload(name, file, {
      upsert: true,
      contentType: "image/png",
      cacheControl: "60",
    });
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${name} 업로드 완료`);
    setVersion(Date.now());
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <div>
          <h2 className="font-semibold text-lg mb-1">홈화면 추가 아이콘 관리</h2>
          <p className="text-sm text-muted-foreground">
            업로드한 아이콘은 즉시 PWA 매니페스트에 반영됩니다. 새로 홈화면에 추가하는 사용자부터 적용됩니다.
            (이미 설치된 아이콘은 재설치 시 갱신됩니다.)
          </p>
        </div>

        {[
          { name: "icon-192.png" as const, size: 192 },
          { name: "icon-512.png" as const, size: 512 },
        ].map((it) => (
          <div key={it.name} className="flex items-center gap-4 border rounded-lg p-4">
            <img
              src={`${base}/${it.name}?v=${version}`}
              alt={it.name}
              className="w-20 h-20 rounded-lg border bg-muted object-contain"
            />
            <div className="flex-1">
              <div className="font-medium">{it.name}</div>
              <div className="text-xs text-muted-foreground mb-2">
                필수 크기: {it.size}×{it.size} PNG
              </div>
              <Input
                type="file"
                accept="image/png"
                disabled={busy === it.name}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload(f, it.name, it.size);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function EditUserDialog({ userId, open, onOpenChange, onSaved }: { userId: string | null; open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const updateUser = useServerFn(adminUpdateUserProfile);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<"seeker" | "employer" | "unknown">("unknown");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  // seeker
  const [nationality, setNationality] = useState("korean");
  const [visa, setVisa] = useState("");
  const [koreanOk, setKoreanOk] = useState(true);
  const [experience, setExperience] = useState("lt5");
  const [regions, setRegions] = useState<string[]>([]);
  const [seekerReferrer, setSeekerReferrer] = useState("");
  // employer
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [manager, setManager] = useState("");
  const [empReferrer, setEmpReferrer] = useState("");

  useEffect(() => {
    if (!userId || !open) return;
    setLoading(true);
    (async () => {
      const [{ data: prof }, { data: rr }, { data: sp }, { data: ep }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("seeker_profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("employer_profiles").select("*").eq("user_id", userId).maybeSingle(),
      ]);
      setFullName(prof?.full_name ?? "");
      setPhone(prof?.phone ?? "");
      const roles = (rr ?? []).map((r: any) => r.role);
      if (roles.includes("employer") && ep) {
        setRole("employer");
        setCompany(ep.company_name ?? "");
        setLocation(ep.location ?? "");
        setManager(ep.manager_name ?? "");
        setEmpReferrer(ep.referrer_code ?? "");
        setPhone(ep.contact_phone ?? prof?.phone ?? "");
      } else if (roles.includes("seeker") && sp) {
        setRole("seeker");
        setNationality(sp.nationality ?? "korean");
        setVisa(sp.visa ?? "");
        setKoreanOk(!!sp.korean_ok);
        setExperience(sp.experience ?? "lt5");
        setRegions(parseRegions(sp.preferred_region));
        setSeekerReferrer(sp.referrer_code ?? "");
      } else {
        setRole("unknown");
      }
      setLoading(false);
    })();
  }, [userId, open]);

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await updateUser({ data: {
        userId, role, fullName, phone,
        seeker: role === "seeker" ? {
          nationality: nationality as "korean" | "foreigner",
          visa: nationality === "korean" ? null : ((visa || null) as any),
          koreanOk, experience: experience as "lt5" | "gte5",
          preferredRegions: regions.length ? serializeRegions(regions) : null,
          referrerCode: seekerReferrer || null,
        } : undefined,
        employer: role === "employer" ? {
          companyName: company, location, managerName: manager, referrerCode: empReferrer || null,
        } : undefined,
      } });
      toast.success("저장되었습니다");
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "저장 실패");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>사용자 정보 수정</DialogTitle></DialogHeader>
        {loading ? <p className="text-sm text-muted-foreground py-6 text-center">불러오는 중...</p> : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>이름</Label><Input value={fullName} onChange={e => setFullName(e.target.value)} /></div>
              <div><Label>연락처</Label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
            </div>
            {role === "seeker" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>신분</Label>
                    <Select value={nationality} onValueChange={(v) => { setNationality(v); if (v === "korean") setVisa(""); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(NATIONALITY_LABEL).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>경력</Label>
                    <Select value={experience} onValueChange={setExperience}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lt5">5회 미만</SelectItem>
                        <SelectItem value="gte5">5회 이상</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {nationality === "foreigner" && (
                  <div><Label>비자</Label>
                    <Select value={visa} onValueChange={setVisa}>
                      <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                      <SelectContent>{Object.entries(VISA_LABEL).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex items-center justify-between border rounded p-2"><Label>한국어 가능</Label><Switch checked={koreanOk} onCheckedChange={setKoreanOk} /></div>
                <div><Label>선호 지역 (최대 3개)</Label><div className="mt-1"><RegionPicker value={regions} onChange={setRegions} /></div></div>
                <div><Label>추천인 코드</Label><Input value={seekerReferrer} onChange={e => setSeekerReferrer(normalizeReferrerCode(e.target.value))} placeholder="영문 대문자/숫자만" /></div>
              </>
            )}
            {role === "employer" && (
              <>
                <div><Label>회사명</Label><Input value={company} onChange={e => setCompany(e.target.value)} /></div>
                <div><Label>위치</Label><Input value={location} onChange={e => setLocation(e.target.value)} /></div>
                <div><Label>담당자</Label><Input value={manager} onChange={e => setManager(e.target.value)} /></div>
                <div><Label>추천인 코드</Label><Input value={empReferrer} onChange={e => setEmpReferrer(normalizeReferrerCode(e.target.value))} placeholder="영문 대문자/숫자만" /></div>
              </>
            )}
            {role === "unknown" && <p className="text-sm text-muted-foreground">이 사용자의 프로필 정보가 없습니다. 기본 정보만 수정할 수 있습니다.</p>}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={save} disabled={saving || loading}>{saving ? "저장 중..." : "저장"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UsersTab() {

  const [employers, setEmployers] = useState<any[]>([]);
  const [seekers, setSeekers] = useState<any[]>([]);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const createUser = useServerFn(adminCreateUser);
  const deleteUser = useServerFn(adminDeleteUser);
  const resetPwd = useServerFn(adminResetPassword);
  const listEmails = useServerFn(adminListUserEmails);
  const [newEmail, setNewEmail] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole] = useState<"seeker" | "employer">("seeker");
  const [newReferrer, setNewReferrer] = useState("");
  const [newRegions, setNewRegions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);


  const load = async () => {
    const { data: e } = await supabase.from("employer_profiles").select("*").order("created_at", { ascending: false });
    const { data: s } = await supabase.from("seeker_profiles").select("*").order("created_at", { ascending: false });
    const ids = Array.from(new Set([...(e ?? []), ...(s ?? [])].map((r: any) => r.user_id)));
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("id, full_name, phone").in("id", ids)
      : { data: [] as any[] };
    const pmap: Record<string, any> = {};
    (profs ?? []).forEach((p: any) => { pmap[p.id] = p; });
    setEmployers((e ?? []).map((r: any) => ({ ...r, profiles: pmap[r.user_id] })));
    setSeekers((s ?? []).map((r: any) => ({ ...r, profiles: pmap[r.user_id] })));
    if (ids.length) {
      try {
        const { emails: map } = await listEmails({ data: { userIds: ids } });
        setEmails(map);
      } catch (err: any) {
        console.error("email load failed", err);
      }
    }
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newEmail || !newPwd || !newName) return toast.error("이메일, 비밀번호, 이름 필수");
    setBusy(true);
    try {
      await createUser({ data: { email: newEmail, password: newPwd, fullName: newName, phone: newPhone, role: newRole, referrerCode: newReferrer, preferredRegions: newRole === "seeker" ? serializeRegions(newRegions) : "" } });
      toast.success("사용자가 추가되었습니다");
      setNewEmail(""); setNewPwd(""); setNewName(""); setNewPhone(""); setNewReferrer(""); setNewRegions([]);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "추가 실패");
    } finally { setBusy(false); }
  };


  const handleDelete = async (uid: string, label: string) => {
    if (!confirm(`'${label}' 사용자를 삭제할까요? 복구할 수 없습니다.`)) return;
    try {
      await deleteUser({ data: { userId: uid } });
      toast.success("삭제되었습니다");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "삭제 실패");
    }
  };

  const handleReset = async (uid: string, label: string) => {
    const pw = prompt(`'${label}'의 새 비밀번호를 입력하세요 (최소 6자리):`);
    if (!pw) return;
    if (pw.length < 6) return toast.error("최소 6자리 이상이어야 합니다");
    try {
      await resetPwd({ data: { userId: uid, newPassword: pw } });
      toast.success("비밀번호가 변경되었습니다");
    } catch (e: any) {
      toast.error(e?.message ?? "변경 실패");
    }
  };

  const exportEmployers = () => {
    const rows = employers.map(e => ({
      가입일: new Date(e.created_at).toLocaleString("ko-KR"),
      이메일ID: emails[e.user_id] ?? "",
      회사명: e.company_name, 위치: e.location, 담당자: e.profiles?.full_name ?? e.manager_name,
      담당자전화: e.contact_phone, 회원전화: e.profiles?.phone, 크레딧: e.credits,
      푸시알림: e.notify_push ? "Y" : "N", 마케팅알림: e.notify_marketing ? "Y" : "N",
      사용자ID: e.user_id,
    }));
    downloadXlsx(rows, "구인자", `구인자_리스트_${new Date().toISOString().slice(0,10)}.xlsx`);
  };
  const exportSeekers = () => {
    const rows = seekers.map(s => ({
      가입일: new Date(s.created_at).toLocaleString("ko-KR"),
      이메일ID: emails[s.user_id] ?? "",
      이름: s.profiles?.full_name, 전화: s.profiles?.phone,
      국적: s.nationality === "foreigner" ? "외국인" : "내국인",
      경력: s.experience === "lt5" ? "5회 미만" : "5회 이상",
      한국어: s.korean_ok ? "가능" : "불가", 비자: s.nationality === "korean" ? "해당없음" : (VISA_LABEL[s.visa] ?? s.visa ?? ""),
      선호지역: s.preferred_region, 추천인코드: s.referrer_code,
      푸시알림: s.notify_push ? "Y" : "N", 마케팅알림: s.notify_marketing ? "Y" : "N",
      사용자ID: s.user_id,
    }));
    downloadXlsx(rows, "구직자", `구직자_리스트_${new Date().toISOString().slice(0,10)}.xlsx`);
  };
  return (
    <div className="space-y-4 mt-4">
      <Card><CardContent className="p-4 space-y-3">
        <h3 className="font-bold flex items-center gap-2"><UserPlus size={16} />사용자 추가</h3>
        <p className="text-xs text-muted-foreground">⚠️ 보안상 기존 비밀번호는 볼 수 없습니다(암호화 저장). 변경이 필요하면 각 사용자의 🔑 버튼으로 새 비밀번호를 설정하세요.</p>
        <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
          <Input placeholder="이메일" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
          <Input placeholder="비밀번호 (6자리)" value={newPwd} onChange={e => setNewPwd(e.target.value)} />
          <Input placeholder="이름" value={newName} onChange={e => setNewName(e.target.value)} />
          <Input placeholder="연락처" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
          <Input placeholder="추천인코드 (영문 대문자/숫자, 선택)" value={newReferrer} onChange={e => setNewReferrer(normalizeReferrerCode(e.target.value))} />
          <Select value={newRole} onValueChange={(v: any) => setNewRole(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="seeker">구직자</SelectItem>
              <SelectItem value="employer">구인자</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleCreate} disabled={busy}>추가</Button>
        </div>
        {newRole === "seeker" && (
          <div>
            <Label className="text-xs">선호 지역 (구직자, 최대 3개 · 선택)</Label>
            <div className="mt-1"><RegionPicker value={newRegions} onChange={setNewRegions} compact /></div>
          </div>
        )}
      </CardContent></Card>
      <div className="grid md:grid-cols-2 gap-4">
        <Card><CardContent className="p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold">구인자 ({employers.length})</h3>
            <Button size="sm" variant="outline" onClick={exportEmployers}><Download size={14} className="mr-1" />엑셀 다운로드</Button>
          </div>
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {employers.map(e => (
              <div key={e.user_id} className="py-1 px-2 border rounded flex items-center gap-2 text-xs">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 items-center">
                    <span className="font-semibold text-sm">{e.company_name}</span>
                    <span className="text-primary">{emails[e.user_id] ?? "..."}</span>
                    <span className="text-muted-foreground">{e.profiles?.full_name} · {e.contact_phone}</span>
                    <span>📍 {e.location} · 💰 {e.credits} 크레딧</span>
                  </div>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="정보 수정" onClick={() => setEditUserId(e.user_id)}><Pencil size={14} /></Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="비밀번호 재설정" onClick={() => handleReset(e.user_id, e.company_name)}><KeyRound size={14} /></Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleDelete(e.user_id, e.company_name)}><Trash2 size={14} className="text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold">구직자 ({seekers.length})</h3>
            <Button size="sm" variant="outline" onClick={exportSeekers}><Download size={14} className="mr-1" />엑셀 다운로드</Button>
          </div>
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {seekers.map(s => (
              <div key={s.user_id} className="py-1 px-2 border rounded flex items-center gap-2 text-xs">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 items-center">
                    <span className="font-semibold text-sm">{s.profiles?.full_name}</span>
                    <Badge variant="outline" className="text-[10px] h-auto px-1 py-0">{s.nationality === "foreigner" ? "외국인" : "내국인"}</Badge>
                    <span className="text-primary">{emails[s.user_id] ?? "..."}</span>
                    <span className="text-muted-foreground">{s.profiles?.phone} · 추천인: {s.referrer_code ?? "-"}</span>
                    <span>경력: {s.experience === "lt5" ? "5회 미만" : s.experience === "gte5" ? "5회 이상" : s.experience} · 한국어: {s.korean_ok ? "가능" : "불가"} · 비자: {s.nationality === "korean" ? "해당없음" : (VISA_LABEL[s.visa] ?? s.visa ?? "-")}</span>
                    <span>📍 {s.preferred_region ? s.preferred_region : "-"}</span>
                  </div>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="정보 수정" onClick={() => setEditUserId(s.user_id)}><Pencil size={14} /></Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="비밀번호 재설정" onClick={() => handleReset(s.user_id, s.profiles?.full_name ?? "사용자")}><KeyRound size={14} /></Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleDelete(s.user_id, s.profiles?.full_name ?? "사용자")}><Trash2 size={14} className="text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent></Card>
      </div>
      <EditUserDialog userId={editUserId} open={!!editUserId} onOpenChange={(v) => { if (!v) setEditUserId(null); }} onSaved={load} />
    </div>
  );
}

function CreditsTab() {
  const [employers, setEmployers] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const load = async () => {
    const { data } = await supabase.from("employer_profiles").select("*").order("credits");
    const ids = (data ?? []).map((r: any) => r.user_id);
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("id, full_name").in("id", ids)
      : { data: [] as any[] };
    const pmap: Record<string, any> = {};
    (profs ?? []).forEach((p: any) => { pmap[p.id] = p; });
    setEmployers((data ?? []).map((r: any) => ({ ...r, profiles: pmap[r.user_id] })));
  };
  useEffect(() => { load(); }, []);
  const grant = async (uid: string) => {
    const amt = prompt("지급할 크레딧 수량 (음수 가능):");
    if (!amt) return;
    const { error } = await supabase.rpc("admin_grant_credits", { _employer: uid, _amount: Number(amt), _note: "관리자 무상지급" } as any);
    if (error) return toast.error(error.message);
    toast.success("처리 완료"); load();
  };
  const filtered = employers.filter(e => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (e.company_name ?? "").toLowerCase().includes(s)
        || (e.profiles?.full_name ?? "").toLowerCase().includes(s);
  });
  return (
    <Card className="mt-4"><CardContent className="p-4">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <h3 className="font-bold">크레딧 관리 ({filtered.length}/{employers.length})</h3>
        <Input placeholder="업체명/담당자 검색" value={q} onChange={e => setQ(e.target.value)} className="max-w-xs" />
      </div>
      <table className="w-full text-sm">
        <thead><tr className="text-left border-b"><th className="py-2">회사</th><th>담당자</th><th>크레딧</th><th></th></tr></thead>
        <tbody>
          {filtered.map(e => (
            <tr key={e.user_id} className="border-b">
              <td className="py-2">{e.company_name}</td>
              <td>{e.profiles?.full_name}</td>
              <td className="font-bold">{e.credits}</td>
              <td><Button size="sm" variant="outline" onClick={() => grant(e.user_id)}>크레딧 지급/차감</Button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </CardContent></Card>
  );
}


function ReferrersTab() {
  const updateReferrer = useServerFn(adminUpdateReferrer);
  const [list, setList] = useState<any[]>([]);
  const [signups, setSignups] = useState<Record<string, any[]>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ code: string; name: string; phone: string }>({ code: "", name: "", phone: "" });
  const [code, setCode] = useState(""); const [name, setName] = useState(""); const [phone, setPhone] = useState("");
  const load = async () => {
    const { data } = await supabase.from("referrers").select("*").order("created_at", { ascending: false });
    setList(data ?? []);
    const { data: seekers } = await supabase.from("seeker_profiles").select("user_id, referrer_code, created_at");
    const userIds = (seekers ?? []).filter((s: any) => s.referrer_code).map((s: any) => s.user_id);
    let profilesMap: Record<string, any> = {};
    if (userIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, phone").in("id", userIds);
      (profs ?? []).forEach((p: any) => { profilesMap[p.id] = p; });
    }
    const map: Record<string, any[]> = {};
    (seekers ?? []).forEach((s: any) => {
      if (!s.referrer_code) return;
      const p = profilesMap[s.user_id] ?? {};
      (map[s.referrer_code] ||= []).push({
        user_id: s.user_id,
        full_name: p.full_name ?? "-",
        phone: p.phone ?? "-",
        signed_up_at: s.created_at,
      });
    });
    setSignups(map);
  };
  useEffect(() => { load(); }, []);
  const add = async () => {
    if (!code || !name) return toast.error("코드와 이름 필수");
    const { error } = await supabase.from("referrers").insert({ code, name, phone } as any);
    if (error) return toast.error(error.message);
    setCode(""); setName(""); setPhone(""); load();
  };
  const del = async (id: string, label: string) => {
    if (!confirm(`'${label}' 추천인을 삭제할까요?`)) return;
    const { error } = await supabase.from("referrers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("삭제되었습니다"); load();
  };
  const startEdit = (r: any) => {
    setEditingId(r.id);
    setEditForm({ code: r.code ?? "", name: r.name ?? "", phone: r.phone ?? "" });
  };
  const cancelEdit = () => { setEditingId(null); };
  const saveEdit = async (id: string) => {
    if (!editForm.code || !editForm.name) return toast.error("코드와 이름은 필수입니다");
    if (!/^[A-Z0-9]+$/.test(editForm.code)) return toast.error("코드는 영문 대문자와 숫자만 사용 가능합니다");
    try {
      await updateReferrer({ data: { id, code: editForm.code, name: editForm.name, phone: editForm.phone } });
      toast.success("수정되었습니다"); setEditingId(null); load();
    } catch (e: any) {
      toast.error(e?.message ?? "수정 실패");
    }
  };
  const exportXlsx = async () => {
    const allUids = Array.from(new Set(Object.values(signups).flat().map((u: any) => u.user_id)));
    let emails: Record<string, string> = {};
    if (allUids.length) {
      try {
        const { staffListUserEmails } = await import("@/lib/admin-users.functions");
        const res = await staffListUserEmails({ data: { userIds: allUids } });
        emails = (res as any).emails ?? {};
      } catch {}
    }
    const wb = new ExcelJS.Workbook();
    const ws1 = wb.addWorksheet("추천인");
    ws1.columns = [
      { header: "코드", key: "code" }, { header: "이름", key: "name" },
      { header: "연락처", key: "phone" }, { header: "가입자수", key: "count" },
      { header: "활성", key: "active" }, { header: "비고", key: "note" },
      { header: "등록일", key: "created" },
    ];
    list.forEach(r => ws1.addRow({
      code: r.code, name: r.name, phone: r.phone,
      count: (signups[r.code] ?? []).length,
      active: r.active ? "Y" : "N", note: r.note,
      created: new Date(r.created_at).toLocaleString("ko-KR"),
    }));
    const ws2 = wb.addWorksheet("가입자");
    ws2.columns = [
      { header: "추천인코드", key: "code" }, { header: "추천인이름", key: "refName" },
      { header: "가입자이름", key: "userName" }, { header: "가입자아이디(이메일)", key: "userEmail" },
      { header: "가입자연락처", key: "userPhone" }, { header: "가입일", key: "signedUp" },
    ];
    list.forEach(r => {
      (signups[r.code] ?? []).forEach((u: any) => ws2.addRow({
        code: r.code, refName: r.name,
        userName: u.full_name, userEmail: emails[u.user_id] ?? "",
        userPhone: u.phone,
        signedUp: new Date(u.signed_up_at).toLocaleString("ko-KR"),
      }));
    });
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `추천인_리스트_${new Date().toISOString().slice(0,10)}.xlsx`;
    a.click(); URL.revokeObjectURL(url);
  };
  const [q, setQ] = useState("");
  const filteredList = list.filter(r => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (r.code ?? "").toLowerCase().includes(s)
        || (r.name ?? "").toLowerCase().includes(s)
        || (r.phone ?? "").toLowerCase().includes(s);
  });
  return (
    <Card className="mt-4"><CardContent className="p-4 space-y-4">
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <h3 className="font-bold">추천인 관리 ({filteredList.length}/{list.length})</h3>
        <div className="flex gap-2">
          <Input placeholder="코드/이름/연락처 검색" value={q} onChange={e => setQ(e.target.value)} className="max-w-xs" />
          <Button size="sm" variant="outline" onClick={exportXlsx}><Download size={14} className="mr-1" />엑셀 다운로드</Button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <Input placeholder="코드 (영문 대문자/숫자, 예: REF1234)" value={code} onChange={e => setCode(normalizeReferrerCode(e.target.value))} />
        <Input placeholder="이름" value={name} onChange={e => setName(e.target.value)} />
        <Input placeholder="연락처" value={phone} onChange={e => setPhone(e.target.value)} />
        <Button onClick={add}>추가</Button>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="text-left border-b"><th className="py-2">코드</th><th>이름</th><th>연락처</th><th>가입자</th><th></th></tr></thead>
        <tbody>
          {filteredList.map(r => {
            const users = signups[r.code] ?? [];
            const isOpen = expanded[r.id];
            const toggle = () => setExpanded(s => ({ ...s, [r.id]: !s[r.id] }));
            return (
              <Fragment key={r.id}>
                <tr className="border-b">
                  {editingId === r.id ? (
                    <>
                      <td className="py-2"><Input className="h-8 font-mono text-xs" value={editForm.code} onChange={e => setEditForm({ ...editForm, code: normalizeReferrerCode(e.target.value) })} /></td>
                      <td><Input className="h-8 text-xs" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></td>
                      <td><Input className="h-8 text-xs" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} /></td>
                      <td>
                        <Button size="sm" variant="ghost" className="font-bold h-auto p-1" onClick={toggle}>
                          {users.length}명 {users.length > 0 ? (isOpen ? " ▲" : " ▼") : ""}
                        </Button>
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <Button size="sm" onClick={() => saveEdit(r.id)}>저장</Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}>취소</Button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-2 font-mono">{r.code}</td>
                      <td>{r.name}</td>
                      <td>{r.phone}</td>
                      <td>
                        <Button size="sm" variant="ghost" className="font-bold h-auto p-1" onClick={toggle}>
                          {users.length}명 {users.length > 0 ? (isOpen ? " ▲" : " ▼") : ""}
                        </Button>
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => startEdit(r)}>수정</Button>
                          <Button size="sm" variant="ghost" onClick={() => del(r.id, r.name)}>
                            <Trash2 size={14} className="text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
                {isOpen && users.length > 0 && (
                  <tr key={r.id + "-detail"} className="border-b bg-muted/30">
                    <td colSpan={5} className="p-2">
                      <table className="w-full text-xs">
                        <thead><tr className="text-left text-muted-foreground"><th className="py-1">가입자 이름</th><th>연락처</th><th>가입일</th></tr></thead>
                        <tbody>
                          {users.map((u: any) => (
                            <tr key={u.user_id}>
                              <td className="py-1">{u.full_name}</td>
                              <td>{u.phone}</td>
                              <td>{new Date(u.signed_up_at).toLocaleString("ko-KR")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </CardContent></Card>
  );
}

function BannersTab() {
  const [list, setList] = useState<any[]>([]);
  const [title, setTitle] = useState(""); const [img, setImg] = useState(""); const [url, setUrl] = useState("");
  const [start, setStart] = useState(""); const [end, setEnd] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const genBanner = useServerFn(generateAdBannerImage);
  const load = async () => {
    const { data } = await supabase.from("ad_banners").select("*").order("created_at", { ascending: false });
    setList(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const uploadFile = async (file: File, setter: (v: string) => void) => {
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("ad-banners").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("ad-banners").getPublicUrl(path);
      setter(data.publicUrl);
      toast.success("이미지 업로드 완료");
    } catch (e: any) {
      toast.error(e.message || "업로드 실패");
    } finally {
      setUploading(false);
    }
  };

  const generateWithAi = async (setter: (v: string) => void) => {
    if (!aiPrompt.trim()) return toast.error("광고 내용을 입력해 주세요");
    setAiBusy(true);
    try {
      const r = await genBanner({ data: { description: aiPrompt.trim(), title } });
      setter(r.imageUrl);
      toast.success("AI 배너 이미지가 생성되었습니다 (16:5 비율로 표시됨)");
    } catch (e: any) {
      toast.error(e?.message ?? "AI 생성 실패");
    } finally { setAiBusy(false); }
  };

  const add = async () => {
    if (!title || !end) return toast.error("제목과 종료일 필수");
    const { error } = await supabase.from("ad_banners").insert({
      title, image_url: img || null, link_url: url || null,
      starts_at: start || new Date().toISOString(), ends_at: end,
    } as any);
    if (error) return toast.error(error.message);
    setTitle(""); setImg(""); setUrl(""); setStart(""); setEnd(""); setAiPrompt(""); load();
    toast.success("배너가 등록되었습니다");
  };
  const toggle = async (b: any) => { await supabase.from("ad_banners").update({ active: !b.active }).eq("id", b.id); load(); };
  const del = async (id: string) => { if (confirm("삭제할까요?")) { await supabase.from("ad_banners").delete().eq("id", id); load(); } };

  const saveEdit = async () => {
    if (!editing) return;
    if (!editing.title || !editing.ends_at) return toast.error("제목과 종료일 필수");
    const { error } = await supabase.from("ad_banners").update({
      title: editing.title,
      image_url: editing.image_url || null,
      link_url: editing.link_url || null,
      starts_at: editing.starts_at,
      ends_at: editing.ends_at,
      active: editing.active,
    }).eq("id", editing.id);
    if (error) return toast.error(error.message);
    setEditing(null); load();
    toast.success("수정되었습니다");
  };

  const toLocalInput = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return (
    <Card className="mt-4"><CardContent className="p-4 space-y-4">
      <div>
        <h3 className="font-bold">광고 배너 관리</h3>
        <p className="text-xs text-muted-foreground mt-1">권장 배너 사이즈: <b>640 × 200px (16:5 가로형)</b> · 모바일에서 가로 꽉 차게 표시됩니다. 다른 비율 이미지는 자동으로 16:5로 잘려서 표시됩니다.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>제목 *</Label>
          <Input placeholder="제목" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>링크 URL</Label>
          <Input placeholder="https://..." value={url} onChange={e => setUrl(e.target.value)} />
        </div>
        <div className="space-y-1 md:col-span-2 p-3 rounded-md bg-primary/5 border border-primary/30">
          <Label className="text-primary font-semibold">🤖 AI 배너 자동 생성 (16:5)</Label>
          <p className="text-[11px] text-muted-foreground">광고 내용 / 컨셉을 입력하면 AI가 모바일 최적 가로형 이미지를 만들어 자동으로 등록합니다.</p>
          <div className="flex gap-2">
            <Textarea placeholder="예) 외국인 노동자 비자 상담 무료 이벤트. 환영 분위기, 따뜻한 색감." value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} rows={2} />
            <Button onClick={() => generateWithAi(setImg)} disabled={aiBusy || !aiPrompt.trim()}>{aiBusy ? "생성 중…" : "AI 생성"}</Button>
          </div>
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label>이미지 (URL 입력 또는 파일 업로드 · 권장 640×200)</Label>
          <div className="flex gap-2">
            <Input placeholder="이미지 URL" value={img} onChange={e => setImg(e.target.value)} />
            <Input type="file" accept="image/*" disabled={uploading} className="max-w-[220px]"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f, setImg); e.currentTarget.value = ""; }} />
          </div>
          {img && (
            <div className="mt-1">
              <p className="text-[10px] text-muted-foreground mb-1">미리보기 (실제 표시 비율 16:5)</p>
              <div className="w-full max-w-md aspect-[16/5] rounded border overflow-hidden bg-muted">
                <img src={img} alt="미리보기" className="w-full h-full object-cover" />
              </div>
            </div>
          )}
        </div>
        <div className="space-y-1">
          <Label>시작일시</Label>
          <Input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>종료일시 *</Label>
          <Input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} />
        </div>
      </div>
      <Button onClick={add} disabled={uploading || aiBusy}>등록</Button>
      <table className="w-full text-sm">
        <thead><tr className="text-left border-b"><th className="py-2">제목</th><th>기간</th><th>활성</th><th></th></tr></thead>
        <tbody>
          {list.map(b => (
            <tr key={b.id} className="border-b">
              <td className="py-2">{b.title}</td>
              <td className="text-xs">{new Date(b.starts_at).toLocaleDateString()} ~ {new Date(b.ends_at).toLocaleDateString()}</td>
              <td><Badge variant={b.active ? "default" : "secondary"}>{b.active ? "활성" : "비활성"}</Badge></td>
              <td className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => setEditing({ ...b })}><Pencil className="h-3 w-3" /></Button>
                <Button size="sm" variant="outline" onClick={() => toggle(b)}>{b.active ? "비활성" : "활성"}</Button>
                <Button size="sm" variant="destructive" onClick={() => del(b.id)}>삭제</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>배너 수정</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>제목 *</Label>
                <Input value={editing.title || ""} onChange={e => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>링크 URL</Label>
                <Input value={editing.link_url || ""} onChange={e => setEditing({ ...editing, link_url: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>이미지 (URL 입력 또는 파일 업로드)</Label>
                <div className="flex gap-2">
                  <Input value={editing.image_url || ""} onChange={e => setEditing({ ...editing, image_url: e.target.value })} placeholder="이미지 URL" />
                  <Input type="file" accept="image/*" disabled={uploading} className="max-w-[180px]"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f, (v) => setEditing((cur: any) => ({ ...cur, image_url: v }))); e.currentTarget.value = ""; }} />
                </div>
                {editing.image_url && <img src={editing.image_url} alt="미리보기" className="h-20 mt-1 rounded border object-cover" />}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>시작일시</Label>
                  <Input type="datetime-local" value={toLocalInput(editing.starts_at)}
                    onChange={e => setEditing({ ...editing, starts_at: e.target.value ? new Date(e.target.value).toISOString() : editing.starts_at })} />
                </div>
                <div className="space-y-1">
                  <Label>종료일시 *</Label>
                  <Input type="datetime-local" value={toLocalInput(editing.ends_at)}
                    onChange={e => setEditing({ ...editing, ends_at: e.target.value ? new Date(e.target.value).toISOString() : editing.ends_at })} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={!!editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
                <span className="text-sm">활성</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>취소</Button>
            <Button onClick={saveEdit} disabled={uploading}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CardContent></Card>
  );
}

const SUPER_ADMIN_EMAIL = "nstaff@findar.app";
type PeriodKey = "day" | "week" | "month" | "quarter" | "half" | "year" | "all";
const PERIOD_OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: "day", label: "일" },
  { value: "week", label: "주" },
  { value: "month", label: "월" },
  { value: "quarter", label: "분기" },
  { value: "half", label: "반기" },
  { value: "year", label: "연" },
  { value: "all", label: "전체" },
];

function getPeriodStart(p: PeriodKey): Date | null {
  if (p === "all") return null;
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (p === "day") return d;
  if (p === "week") {
    const day = d.getDay();
    const diff = day === 0 ? 6 : day - 1; // 월요일 시작
    d.setDate(d.getDate() - diff);
    return d;
  }
  if (p === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (p === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    return new Date(now.getFullYear(), q * 3, 1);
  }
  if (p === "half") {
    const h = now.getMonth() < 6 ? 0 : 6;
    return new Date(now.getFullYear(), h, 1);
  }
  if (p === "year") return new Date(now.getFullYear(), 0, 1);
  return null;
}

function PurchasesTab() {
  const { user } = useAuth();
  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;
  const [list, setList] = useState<any[]>([]);
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const load = async () => {
    const { data } = await supabase.from("credit_purchase_requests")
      .select("*")
      .order("created_at", { ascending: false });
    const ids = Array.from(new Set((data ?? []).map((r: any) => r.employer_id)));
    const { data: emps } = ids.length
      ? await supabase.from("employer_profiles").select("user_id, company_name").in("user_id", ids)
      : { data: [] as any[] };
    const emap: Record<string, any> = {};
    (emps ?? []).forEach((e: any) => { emap[e.user_id] = e; });
    setList((data ?? []).map((r: any) => ({ ...r, employer_profiles: emap[r.employer_id] })));
  };
  useEffect(() => { load(); }, []);

  const useCustom = !!(customFrom || customTo);
  const fromDate = customFrom ? new Date(customFrom + "T00:00:00") : null;
  const toDate = customTo ? new Date(customTo + "T23:59:59") : null;
  const periodStart = useCustom ? null : getPeriodStart(period);
  const filtered = list.filter(r => {
    const d = new Date(r.created_at);
    if (useCustom) {
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    }
    return !periodStart || d >= periodStart;
  });
  const totalSales = filtered.filter(r => r.status === "fulfilled").reduce((s, r) => s + Number(r.amount_krw), 0);
  const totalCredits = filtered.filter(r => r.status === "fulfilled").reduce((s, r) => s + Number(r.pack), 0);
  const fulfilledCount = filtered.filter(r => r.status === "fulfilled").length;

  const remove = async (id: string) => {
    if (!isSuperAdmin) return toast.error("최상위 관리자만 삭제할 수 있습니다");
    if (!confirm("이 구매 기록을 삭제할까요? 되돌릴 수 없습니다.")) return;
    const { error } = await supabase.from("credit_purchase_requests").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("삭제됨");
    setList(prev => prev.filter(r => r.id !== id));
  };

  const rangeLabel = useCustom
    ? `${customFrom || "처음"} ~ ${customTo || "현재"}`
    : (periodStart ? `${periodStart.toLocaleDateString("ko-KR")} ~ 현재` : "전체 기간");

  return (
    <div className="mt-4 space-y-4">
      <Card><CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">기간</span>
            <div className="flex flex-wrap gap-1">
              {PERIOD_OPTIONS.map(o => (
                <Button key={o.value} size="sm" variant={!useCustom && period === o.value ? "default" : "outline"} className="h-7 px-2" onClick={() => { setPeriod(o.value); setCustomFrom(""); setCustomTo(""); }}>
                  {o.label}
                </Button>
              ))}
            </div>
          </div>
          <span className="text-xs text-muted-foreground">{rangeLabel}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold">직접 선택</span>
          <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="h-7 w-auto text-xs" />
          <span className="text-xs text-muted-foreground">~</span>
          <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="h-7 w-auto text-xs" />
          {useCustom && (
            <Button size="sm" variant="ghost" className="h-7" onClick={() => { setCustomFrom(""); setCustomTo(""); }}>
              초기화
            </Button>
          )}
        </div>
      </CardContent></Card>


      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">총 결제건수</p>
          <p className="text-2xl font-bold">{fulfilledCount}건</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">총 매출액</p>
          <p className="text-2xl font-bold">{totalSales.toLocaleString()}원</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">총 판매 크레딧</p>
          <p className="text-2xl font-bold">{totalCredits.toLocaleString()}</p>
        </CardContent></Card>
      </div>
      <Card><CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">크레딧 구매 현황</h3>
          {!isSuperAdmin && (
            <span className="text-[11px] text-muted-foreground">삭제는 최상위 관리자({SUPER_ADMIN_EMAIL})만 가능</span>
          )}
        </div>
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b">
            <th className="py-2">결제일시</th><th>회사</th><th>수량</th><th>금액</th>
            <th>결제수단</th><th>결제번호</th><th>상태</th>
            {isSuperAdmin && <th className="text-right">관리</th>}
          </tr></thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-b">
                <td className="py-2 text-xs">{new Date(r.created_at).toLocaleString("ko-KR")}</td>
                <td>{r.employer_profiles?.company_name}</td>
                <td>{r.pack}</td>
                <td>{Number(r.amount_krw).toLocaleString()}원</td>
                <td className="text-xs">{r.payment_method ?? "-"}</td>
                <td className="text-xs font-mono">{r.payment_ref ?? "-"}</td>
                <td><Badge variant={r.status === "fulfilled" ? "default" : "secondary"}>{r.status === "fulfilled" ? "결제완료" : r.status}</Badge></td>
                {isSuperAdmin && (
                  <td className="text-right">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => remove(r.id)} title="삭제">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={isSuperAdmin ? 8 : 7} className="py-6 text-center text-xs text-muted-foreground">선택한 기간에 기록이 없습니다</td></tr>
            )}
          </tbody>
        </table>
      </CardContent></Card>
    </div>
  );
}

function PaymentTab() {
  const [mode, setMode] = useState<"test" | "live">("test");
  const [enabled, setEnabled] = useState(false);
  const [merchantId, setMerchantId] = useState("");
  const [clientKey, setClientKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [securityKey, setSecurityKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
  const [diag, setDiag] = useState<any>(null);
  const load = useServerFn(getPaymentSettings);
  const save = useServerFn(savePaymentSettings);
  const diagnose = useServerFn(diagnoseTossKeys);
  const expire = useServerFn(expireStaleCreditOrders);

  const doDiagnose = async () => {
    setDiagnosing(true);
    try {
      setDiag(await diagnose({}));
    } catch (e: any) {
      toast.error(e?.message || "진단 실패");
    } finally {
      setDiagnosing(false);
    }
  };

  const doExpire = async () => {
    try {
      const r = await expire({});
      toast.success(`미완료 주문 ${r.expired}건을 만료 처리했습니다`);
    } catch (e: any) {
      toast.error(e?.message || "정리 실패");
    }
  };


  useEffect(() => {
    (async () => {
      try {
        const cfg = await load({});
        setMode(cfg.mode);
        setEnabled(cfg.enabled);
        setMerchantId(cfg.merchantId ?? "");
        setClientKey(cfg.clientKey ?? "");
        setSecretKey(cfg.secretKey ?? "");
        setSecurityKey(cfg.securityKey ?? "");
      } catch (e: any) {
        toast.error(e?.message || "설정을 불러오지 못했습니다");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const doSave = async () => {
    setSaving(true);
    try {
      await save({ data: { mode, enabled, merchantId, clientKey, secretKey, securityKey } });
      toast.success("결제 설정이 저장되었습니다. 즉시 반영됩니다.");
    } catch (e: any) {
      toast.error(e?.message || "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const detectedMode: "test" | "live" | "unknown" = clientKey.startsWith("live_")
    ? "live"
    : clientKey.startsWith("test_")
    ? "test"
    : "unknown";

  return (
    <div className="mt-4 grid md:grid-cols-2 gap-4">
      <Card><CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">토스페이먼츠 연동</h3>
          <Badge variant={enabled ? "default" : "secondary"}>{enabled ? "활성" : "비활성"}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          <b>API 개별 연동 키</b>(test_ck_/test_sk_ · live_ck_/live_sk_)와 <b>결제위젯 연동 키</b>(test_gck_/test_gsk_ · live_gck_/live_gsk_) 모두 지원합니다. 키 종류에 따라 결제창 방식이 자동 선택됩니다. 심사 완료 후 live_ 키로 교체하고 모드를 '실 운영'으로 전환하세요.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>운영 모드</Label>
            <select
              className="w-full border rounded h-9 px-2 mt-1 bg-background"
              value={mode}
              onChange={(e) => setMode(e.target.value as any)}
              disabled={loading}
            >
              <option value="test">테스트</option>
              <option value="live">실 운영</option>
            </select>
          </div>
          <div>
            <Label>가맹점 ID (MID)</Label>
            <Input value={merchantId} onChange={(e) => setMerchantId(e.target.value)} placeholder="예: nstaff" disabled={loading} />
          </div>
        </div>

        <div>
          <Label>클라이언트 키</Label>
          <Input value={clientKey} onChange={(e) => setClientKey(e.target.value)} placeholder="live_ck_… / live_gck_…" disabled={loading} />
          {clientKey && (
            <p className="text-[11px] mt-1 text-muted-foreground">
              감지된 형식: <b>{detectedMode === "unknown" ? "알 수 없음" : detectedMode === "live" ? "실 운영(live)" : "테스트(test)"}</b>
              {detectedMode !== "unknown" && detectedMode !== mode && (
                <span className="text-amber-600"> · 선택한 모드({mode})와 일치하지 않습니다</span>
              )}
              <span className="block mt-0.5">연동 방식: <b>{clientKey.includes("_gck_") ? "결제위젯" : "결제창(API 개별 연동)"}</b></span>
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label>시크릿 키</Label>
            <button type="button" className="text-xs text-primary" onClick={() => setShowSecret(v => !v)}>
              {showSecret ? "숨기기" : "표시"}
            </button>
          </div>
          <Input
            type={showSecret ? "text" : "password"}
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            placeholder="live_sk_… / live_gsk_…"
            disabled={loading}
            autoComplete="off"
          />
          <p className="text-[11px] mt-1 text-amber-600">보안상 저장된 키는 일부만 표시됩니다. 변경하지 않으면 기존 키가 그대로 유지됩니다.</p>
        </div>

        <div>
          <Label>보안 키 (Webhook Security Key)</Label>
          <Input
            type="password"
            value={securityKey}
            onChange={(e) => setSecurityKey(e.target.value)}
            placeholder="웹훅 서명 검증용 (선택)"
            disabled={loading}
            autoComplete="off"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <Label>결제 활성화</Label>
          <Switch checked={enabled} onCheckedChange={setEnabled} disabled={loading} />
        </div>

        <Button onClick={doSave} className="w-full" disabled={loading || saving}>
          {saving ? "저장 중…" : "설정 저장"}
        </Button>

        <div className="border-t pt-3 space-y-2">
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={doDiagnose} disabled={loading || diagnosing}>
              {diagnosing ? "진단 중…" : "키 진단 (상점 확인)"}
            </Button>
            <Button variant="outline" className="flex-1" onClick={doExpire} disabled={loading}>
              미완료 주문 정리
            </Button>
          </div>
          {diag && (
            <div className="rounded-md border p-2 text-[11px] space-y-1 bg-muted/40">
              <p>키 유효성: <b className={diag.keyValid ? "text-emerald-600" : "text-destructive"}>{diag.keyValid ? "정상" : "실패"}</b></p>
              <p>키가 속한 실제 상점(MID): <b>{diag.mId ?? "확인 불가"}</b></p>
              <p>입력한 가맹점 ID: <b>{diag.enteredMerchantId ?? "미입력"}</b></p>
              {diag.merchantMismatch && (
                <p className="text-destructive font-semibold">
                  ⚠ 입력한 가맹점 ID와 키가 속한 상점이 다릅니다. 심사 완료된 상점의 키인지 개발자센터에서 다시 확인하세요.
                </p>
              )}
              {diag.note && <p className="text-muted-foreground">{diag.note}</p>}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">
            결제창에서 “업체 사정으로 인해 결제를 일시 중지하였습니다” 메시지가 나오면 앱 오류가 아니라 결제사 상점 상태 문제입니다.
            해당 상점의 심사·계약 완료 여부와 사용할 결제수단(카드/계좌이체) 활성화 여부를 확인하세요.
          </p>
        </div>
      </CardContent></Card>


      <Card><CardContent className="p-4 space-y-3 text-sm">
        <h3 className="font-bold">연동 가이드 · 토스페이먼츠</h3>
        <ol className="text-xs space-y-1 list-decimal list-inside text-muted-foreground">
          <li>토스페이먼츠 개발자센터 → <b>내 개발정보</b>에서 키를 복사합니다. <b>API 개별 연동 키</b>(ck_/sk_) 또는 <b>결제위젯 연동 키</b>(gck_/gsk_) 모두 사용할 수 있습니다.</li>
          <li>API 개별 연동 키를 넣으면 <b>토스 결제창(카드)</b> 방식으로, 결제위젯 키를 넣으면 <b>결제위젯</b> 방식으로 자동 동작합니다.</li>
          <li>심사 완료 후 <b>실 운영 키(live_ck_/live_sk_ 또는 live_gck_/live_gsk_)</b>를 위 폼에 붙여넣고 모드를 <b>실 운영</b>으로 변경 → 저장.</li>
          <li>저장 즉시 크레딧 구매 결제창은 새 키로 동작합니다. 서버 재배포 불필요.</li>
        </ol>
        <ul className="text-xs space-y-1 list-disc list-inside text-muted-foreground pt-1">
          <li>개발자센터: <a className="text-primary underline" href="https://developers.tosspayments.com" target="_blank" rel="noreferrer">developers.tosspayments.com</a></li>
          <li>연동 문서: <a className="text-primary underline" href="https://docs.tosspayments.com" target="_blank" rel="noreferrer">docs.tosspayments.com</a></li>
        </ul>
        <div className="rounded-md border p-2 text-[11px] bg-muted/40">
          <p className="font-semibold mb-1">현재 사용 흐름</p>
          <p className="text-muted-foreground">
            구인자 → 크레딧 구매 → 결제창(Toss v2 위젯, 클라이언트 키 사용) → 결제 승인 서버 함수(시크릿 키로 <code>/v1/payments/confirm</code> 호출) → 크레딧 적립.
          </p>
        </div>
        <p className="text-xs text-amber-600">⚠ 시크릿 키는 데이터베이스에 저장되며 서버에서만 사용됩니다. 절대 프론트엔드 코드에 붙여넣지 마세요.</p>
      </CardContent></Card>

      <div className="md:col-span-2"><RefundRequestsCard /></div>
    </div>
  );
}

function RefundRequestsCard() {
  const listFn = useServerFn(adminListRefundRequests);
  const approveFn = useServerFn(adminApproveRefund);
  const rejectFn = useServerFn(adminRejectRefund);
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const load = async () => {
    try { setRows(await listFn({})); } catch (e: any) { toast.error(e?.message || "환불 신청을 불러오지 못했습니다"); }
  };
  useEffect(() => { load(); }, []);

  const approve = async (id: string) => {
    if (!confirm("토스 결제취소를 실행하고 크레딧을 회수합니다. 계속할까요?")) return;
    setBusy(id);
    try { await approveFn({ data: { id, note: null } }); toast.success("환불이 완료되었습니다"); await load(); }
    catch (e: any) { toast.error(e?.message || "환불 처리 실패"); }
    finally { setBusy(null); }
  };
  const reject = async (id: string) => {
    const note = prompt("거절 사유를 입력하세요");
    if (note === null) return;
    setBusy(id);
    try { await rejectFn({ data: { id, note } }); toast.success("환불 신청을 거절했습니다"); await load(); }
    catch (e: any) { toast.error(e?.message || "처리 실패"); }
    finally { setBusy(null); }
  };

  const STATUS: Record<string, string> = { pending: "심사중", completed: "환불완료", rejected: "거절", cancelled: "신청취소", approved: "승인" };

  return (
    <Card><CardContent className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">크레딧 환불 신청 관리</h3>
        <Button size="sm" variant="outline" onClick={load}>새로고침</Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        승인 시 토스 결제취소 API가 호출되고, 같은 수량의 크레딧이 자동 차감됩니다. 미사용 크레딧이 부족하면 승인이 차단됩니다.
      </p>
      <table className="w-full text-sm">
        <thead><tr className="text-left border-b align-middle">
          <th className="py-2 align-middle">신청일</th><th className="align-middle">업체</th><th className="align-middle">금액/크레딧</th><th className="align-middle">사유</th><th className="align-middle">보유</th><th className="align-middle">상태</th><th className="align-middle"></th>
        </tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className="border-b align-middle">
              <td className="py-2 text-xs align-middle">{new Date(r.created_at).toLocaleString("ko-KR")}</td>
              <td className="text-xs align-middle">{r.company_name ?? "-"}</td>
              <td className="text-xs align-middle">{Number(r.amount_krw).toLocaleString()}원 / {r.credits}</td>
              <td className="text-xs max-w-[220px] align-middle">{r.reason}{r.admin_note && <span className="block text-muted-foreground">메모: {r.admin_note}</span>}</td>
              <td className="text-xs align-middle">{r.employer_credits ?? "-"}</td>
              <td className="align-middle"><Badge variant={r.status === "completed" ? "default" : "secondary"}>{STATUS[r.status] ?? r.status}</Badge></td>
              <td className="text-right whitespace-nowrap align-middle">
                {r.status === "pending" && (
                  <span className="flex gap-1 justify-end">
                    <Button size="sm" onClick={() => approve(r.id)} disabled={busy === r.id}>승인·환불</Button>
                    <Button size="sm" variant="outline" onClick={() => reject(r.id)} disabled={busy === r.id}>거절</Button>
                  </span>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-xs text-muted-foreground">환불 신청이 없습니다</td></tr>}
        </tbody>
      </table>
    </CardContent></Card>
  );
}

function NoticesTab() {
  const [list, setList] = useState<any[]>([]);
  const [title, setTitle] = useState(""); const [body, setBody] = useState(""); const [pinned, setPinned] = useState(false);
  const load = async () => {
    const { data } = await supabase.from("notices").select("*").order("created_at", { ascending: false });
    setList(data ?? []);
  };
  useEffect(() => { load(); }, []);
  const add = async () => {
    if (!title || !body) return toast.error("제목과 내용 필수");
    const { error } = await supabase.from("notices").insert({ title, body, pinned } as any);
    if (error) return toast.error(error.message);
    setTitle(""); setBody(""); setPinned(false); load();
  };
  const toggle = async (n: any) => { await supabase.from("notices").update({ active: !n.active }).eq("id", n.id); load(); };
  const del = async (id: string) => { if (confirm("삭제할까요?")) { await supabase.from("notices").delete().eq("id", id); load(); } };
  return (
    <Card className="mt-4"><CardContent className="p-4 space-y-4">
      <h3 className="font-bold">공지사항 관리</h3>
      <div className="space-y-2">
        <Input placeholder="제목" value={title} onChange={e => setTitle(e.target.value)} />
        <Textarea placeholder="내용" rows={4} value={body} onChange={e => setBody(e.target.value)} />
        <div className="flex items-center gap-2"><Switch checked={pinned} onCheckedChange={setPinned} /><Label>상단 고정</Label></div>
        <Button onClick={add}>등록</Button>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="text-left border-b"><th className="py-2">제목</th><th>등록일</th><th>활성</th><th></th></tr></thead>
        <tbody>
          {list.map(n => (
            <tr key={n.id} className="border-b">
              <td className="py-2">{n.pinned && "📌 "}{n.title}</td>
              <td className="text-xs">{new Date(n.created_at).toLocaleDateString()}</td>
              <td><Badge variant={n.active ? "default" : "secondary"}>{n.active ? "활성" : "비활성"}</Badge></td>
              <td className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => toggle(n)}>{n.active ? "비활성" : "활성"}</Button>
                <Button size="sm" variant="destructive" onClick={() => del(n.id)}>삭제</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </CardContent></Card>
  );
}

function EventsTab() {
  const [list, setList] = useState<any[]>([]);
  const [title, setTitle] = useState(""); const [body, setBody] = useState("");
  const [img, setImg] = useState(""); const [url, setUrl] = useState("");
  const [start, setStart] = useState(""); const [end, setEnd] = useState("");
  const load = async () => {
    const { data } = await supabase.from("events").select("*").order("created_at", { ascending: false });
    setList(data ?? []);
  };
  useEffect(() => { load(); }, []);
  const add = async () => {
    if (!title || !end) return toast.error("제목과 종료일 필수");
    const { error } = await supabase.from("events").insert({
      title, body: body || null, image_url: img || null, link_url: url || null,
      starts_at: start || new Date().toISOString(), ends_at: end,
    } as any);
    if (error) return toast.error(error.message);
    setTitle(""); setBody(""); setImg(""); setUrl(""); setStart(""); setEnd(""); load();
  };
  const toggle = async (e: any) => { await supabase.from("events").update({ active: !e.active }).eq("id", e.id); load(); };
  const del = async (id: string) => { if (confirm("삭제할까요?")) { await supabase.from("events").delete().eq("id", id); load(); } };
  return (
    <Card className="mt-4"><CardContent className="p-4 space-y-4">
      <h3 className="font-bold">이벤트 관리 (로그인 시 팝업으로 표시)</h3>
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="제목" value={title} onChange={e => setTitle(e.target.value)} />
        <Input placeholder="이미지 URL" value={img} onChange={e => setImg(e.target.value)} />
        <Input placeholder="링크 URL (선택)" value={url} onChange={e => setUrl(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <Input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} />
          <Input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} />
        </div>
      </div>
      <Textarea placeholder="내용 (선택)" rows={3} value={body} onChange={e => setBody(e.target.value)} />
      <Button onClick={add}>등록</Button>
      <table className="w-full text-sm">
        <thead><tr className="text-left border-b"><th className="py-2">제목</th><th>기간</th><th>활성</th><th></th></tr></thead>
        <tbody>
          {list.map(e => (
            <tr key={e.id} className="border-b">
              <td className="py-2">{e.title}</td>
              <td className="text-xs">{new Date(e.starts_at).toLocaleDateString()} ~ {new Date(e.ends_at).toLocaleDateString()}</td>
              <td><Badge variant={e.active ? "default" : "secondary"}>{e.active ? "활성" : "비활성"}</Badge></td>
              <td className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => toggle(e)}>{e.active ? "비활성" : "활성"}</Button>
                <Button size="sm" variant="destructive" onClick={() => del(e.id)}>삭제</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </CardContent></Card>
  );
}

function FaqsTab() {
  const [list, setList] = useState<any[]>([]);
  const [q, setQ] = useState(""); const [a, setA] = useState(""); const [cat, setCat] = useState("");
  const load = async () => {
    const { data } = await supabase.from("faqs").select("*").order("sort_order").order("created_at");
    setList(data ?? []);
  };
  useEffect(() => { load(); }, []);
  const add = async () => {
    if (!q || !a) return toast.error("질문과 답변 필수");
    const { error } = await supabase.from("faqs").insert({ question: q, answer: a, category: cat || null } as any);
    if (error) return toast.error(error.message);
    setQ(""); setA(""); setCat(""); load();
  };
  const toggle = async (f: any) => { await supabase.from("faqs").update({ active: !f.active }).eq("id", f.id); load(); };
  const del = async (id: string) => { if (confirm("삭제할까요?")) { await supabase.from("faqs").delete().eq("id", id); load(); } };
  return (
    <Card className="mt-4"><CardContent className="p-4 space-y-4">
      <h3 className="font-bold">자주 묻는 질문 관리</h3>
      <div className="space-y-2">
        <Input placeholder="질문" value={q} onChange={e => setQ(e.target.value)} />
        <Textarea placeholder="답변" rows={3} value={a} onChange={e => setA(e.target.value)} />
        <Input placeholder="카테고리 (선택)" value={cat} onChange={e => setCat(e.target.value)} />
        <Button onClick={add}>등록</Button>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="text-left border-b"><th className="py-2">질문</th><th>카테고리</th><th>활성</th><th></th></tr></thead>
        <tbody>
          {list.map(f => (
            <tr key={f.id} className="border-b">
              <td className="py-2">{f.question}</td>
              <td className="text-xs">{f.category ?? "-"}</td>
              <td><Badge variant={f.active ? "default" : "secondary"}>{f.active ? "활성" : "비활성"}</Badge></td>
              <td className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => toggle(f)}>{f.active ? "비활성" : "활성"}</Button>
                <Button size="sm" variant="destructive" onClick={() => del(f.id)}>삭제</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </CardContent></Card>
  );
}

function InquiriesTab() {
  const analyzeText = useServerFn(analyzeInquiryText);
  const [list, setList] = useState<any[]>([]);
  const [answering, setAnswering] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [analysis, setAnalysis] = useState<Record<string, any>>({});
  const [aiBusyId, setAiBusyId] = useState<string | null>(null);
  const load = async () => {
    const { data } = await supabase.from("inquiries").select("*, profiles:user_id(full_name, phone)").order("created_at", { ascending: false });
    setList(data ?? []);
  };
  useEffect(() => { load(); }, []);
  const reply = async (id: string) => {
    if (!answerText) return toast.error("답변을 입력하세요");
    const { error } = await supabase.from("inquiries").update({
      answer: answerText, answered_at: new Date().toISOString(), status: "answered",
    } as any).eq("id", id);
    if (error) return toast.error(error.message);
    setAnswering(null); setAnswerText(""); toast.success("답변 등록됨"); load();
  };
  const runAi = async (q: any) => {
    setAiBusyId(q.id);
    try {
      const res = await analyzeText({ data: { subject: q.subject, body: q.body } });
      setAnalysis(prev => ({ ...prev, [q.id]: res }));
      setAnswering(q.id);
      setAnswerText(res.suggestedAnswer ?? "");
    } catch (e: any) { toast.error(e?.message ?? "AI 분석 실패"); }
    finally { setAiBusyId(null); }
  };
  return (
    <Card className="mt-4"><CardContent className="p-4 space-y-3">
      <h3 className="font-bold">1:1 문의 관리</h3>
      {list.length === 0 && <p className="text-sm text-muted-foreground">문의가 없습니다</p>}
      {list.map(q => (
        <Card key={q.id}><CardContent className="p-3 space-y-2">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold text-sm">{q.subject}</p>
              <p className="text-xs text-muted-foreground">{q.profiles?.full_name} · {q.profiles?.phone} · {new Date(q.created_at).toLocaleString("ko-KR")}</p>
            </div>
            <Badge variant={q.status === "answered" ? "default" : "secondary"}>{q.status === "answered" ? "답변완료" : "대기"}</Badge>
          </div>
          <p className="text-sm whitespace-pre-wrap p-2 bg-muted/40 rounded">{q.body}</p>
          {analysis[q.id] && (
            <div className="p-2 bg-muted/40 border rounded text-xs space-y-1">
              <p className="font-semibold">AI 분류: {analysis[q.id].category} · 스팸/욕설 위험 {analysis[q.id].spamRisk} · {analysis[q.id].needsHuman ? "관리자 확인 권장" : "AI 답변 가능"}</p>
            </div>
          )}
          {q.answer ? (
            <div className="p-2 bg-primary/5 border-l-2 border-primary rounded">
              <p className="text-[10px] text-primary font-semibold">답변</p>
              <p className="text-sm whitespace-pre-wrap mt-1">{q.answer}</p>
            </div>
          ) : answering === q.id ? (
            <div className="space-y-2">
              <Textarea rows={3} value={answerText} onChange={e => setAnswerText(e.target.value)} placeholder="답변을 입력하세요" />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => reply(q.id)}>답변 등록</Button>
                <Button size="sm" variant="outline" onClick={() => { setAnswering(null); setAnswerText(""); }}>취소</Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => runAi(q)} disabled={aiBusyId === q.id}>{aiBusyId === q.id ? "분석 중..." : "AI 답변 초안"}</Button>
              <Button size="sm" variant="outline" onClick={() => setAnswering(q.id)}>답변하기</Button>
            </div>
          )}
        </CardContent></Card>
      ))}
    </CardContent></Card>
  );
}

function AiInsightsTab() {
  const getInsights = useServerFn(generateAdminAiInsights);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const run = async () => {
    setLoading(true);
    try {
      setData(await getInsights({}));
      toast.success("AI 인사이트가 생성되었습니다");
    } catch (e: any) {
      toast.error(e?.message ?? "AI 인사이트 생성 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 space-y-4">
      <Card><CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold">AI 운영 인사이트</h3>
            <p className="text-xs text-muted-foreground mt-1">사용자, 공고, 신청, 문의, 추천인 데이터를 기반으로 운영 포인트를 요약합니다.</p>
          </div>
          <Button onClick={run} disabled={loading}>{loading ? "분석 중..." : "AI 분석 실행"}</Button>
        </div>
      </CardContent></Card>
      {data && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="md:col-span-2"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">요약</p>
            <p className="text-sm whitespace-pre-wrap">{data.summary}</p>
          </CardContent></Card>
          <InsightList title="추천 액션" items={data.actions} />
          <InsightList title="위험 신호" items={data.riskSignals} />
          <InsightList title="추천인 점검" items={data.referralChecks} />
        </div>
      )}
    </div>
  );
}

function InsightList({ title, items }: { title: string; items?: string[] }) {
  return (
    <Card><CardContent className="p-4">
      <h4 className="font-semibold text-sm mb-2">{title}</h4>
      {!items?.length ? <p className="text-xs text-muted-foreground">표시할 항목이 없습니다</p> : (
        <ul className="list-disc list-inside text-sm space-y-1">
          {items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      )}
    </CardContent></Card>
  );
}

function VersionTab() {
  const [list, setList] = useState<any[]>([]);
  const [version, setVersion] = useState(""); const [notes, setNotes] = useState("");
  const load = async () => {
    const { data } = await supabase.from("app_version").select("*").order("created_at", { ascending: false });
    setList(data ?? []);
  };
  useEffect(() => { load(); }, []);
  const release = async () => {
    if (!version) return toast.error("버전 번호 필수");
    await supabase.from("app_version").update({ is_latest: false } as any).eq("is_latest", true);
    const { error } = await supabase.from("app_version").insert({ version, notes, is_latest: true } as any);
    if (error) return toast.error(error.message);
    setVersion(""); setNotes(""); toast.success("새 버전 등록됨"); load();
  };
  return (
    <Card className="mt-4"><CardContent className="p-4 space-y-4">
      <h3 className="font-bold">앱 버전 관리</h3>
      <div className="grid grid-cols-3 gap-2">
        <Input placeholder="새 버전 (예: 1.0.1)" value={version} onChange={e => setVersion(e.target.value)} />
        <Input placeholder="릴리즈 노트" value={notes} onChange={e => setNotes(e.target.value)} className="col-span-2" />
      </div>
      <Button onClick={release}>새 버전 릴리즈</Button>
      <table className="w-full text-sm">
        <thead><tr className="text-left border-b"><th className="py-2">버전</th><th>릴리즈노트</th><th>최신</th><th>등록일</th></tr></thead>
        <tbody>
          {list.map(v => (
            <tr key={v.id} className="border-b">
              <td className="py-2 font-mono">{v.version}</td>
              <td className="text-xs">{v.notes}</td>
              <td>{v.is_latest && <Badge>최신</Badge>}</td>
              <td className="text-xs">{new Date(v.created_at).toLocaleString("ko-KR")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </CardContent></Card>
  );
}

function PartnersTab() {
  const [employers, setEmployers] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [monthly, setMonthly] = useState<number>(100);
  const [threshold, setThreshold] = useState<number>(10);
  const [recharge, setRecharge] = useState<number>(50);
  const [note, setNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ monthly_credits: number; auto_recharge_threshold: number; auto_recharge_amount: number; note: string; active: boolean }>({ monthly_credits: 0, auto_recharge_threshold: 0, auto_recharge_amount: 0, note: "", active: true });

  // 보조관리자(manager) 관리
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [mgrQ, setMgrQ] = useState("");
  const [mgrSelectedId, setMgrSelectedId] = useState<string>("");

  const load = async () => {
    const { data: emps } = await supabase.from("employer_profiles").select("user_id, company_name, manager_name, credits").order("company_name");
    const ids = (emps ?? []).map((e: any) => e.user_id);
    const { data: profs } = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids) : { data: [] as any[] };
    const pmap: Record<string, any> = {};
    (profs ?? []).forEach((p: any) => { pmap[p.id] = p; });
    setEmployers((emps ?? []).map((e: any) => ({ ...e, full_name: pmap[e.user_id]?.full_name })));
    const { data: progs } = await supabase.from("partner_programs").select("*").order("created_at", { ascending: false });
    setPrograms(progs ?? []);

    // 전체 프로필 + 현재 manager 역할 보유자
    const { data: allP } = await supabase.from("profiles").select("id, full_name, phone").order("full_name");
    setAllProfiles(allP ?? []);
    const { data: mgrRoles } = await supabase.from("user_roles").select("id, user_id, created_at").eq("role", "manager");
    const pMap2: Record<string, any> = {};
    (allP ?? []).forEach((p: any) => { pMap2[p.id] = p; });
    setManagers((mgrRoles ?? []).map((r: any) => ({ ...r, profile: pMap2[r.user_id] })));
  };
  useEffect(() => { load(); }, []);

  const managerIdSet = new Set(managers.map(m => m.user_id));
  const mgrCandidates = allProfiles.filter(p => !managerIdSet.has(p.id)).filter(p => {
    if (!mgrQ) return true;
    const s = mgrQ.toLowerCase();
    return (p.full_name ?? "").toLowerCase().includes(s) || (p.phone ?? "").toLowerCase().includes(s);
  });

  const addManager = async () => {
    if (!mgrSelectedId) return toast.error("사용자를 선택하세요");
    const { error } = await supabase.from("user_roles").insert({ user_id: mgrSelectedId, role: "manager" as any });
    if (error) return toast.error(error.message);
    toast.success("보조관리자로 지정되었습니다"); setMgrSelectedId(""); load();
  };
  const removeManager = async (id: string, name: string) => {
    if (!confirm(`'${name}' 보조관리자 권한을 해제할까요?`)) return;
    const { error } = await supabase.from("user_roles").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("해제되었습니다"); load();
  };


  const partnerIds = new Set(programs.map(p => p.employer_id));
  const empMap: Record<string, any> = {};
  employers.forEach(e => { empMap[e.user_id] = e; });
  const candidates = employers.filter(e => !partnerIds.has(e.user_id));
  const filteredCandidates = candidates.filter(e => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (e.company_name ?? "").toLowerCase().includes(s) || (e.full_name ?? "").toLowerCase().includes(s) || (e.manager_name ?? "").toLowerCase().includes(s);
  });

  const register = async () => {
    if (!selectedId) return toast.error("구인자를 선택하세요");
    const { error } = await supabase.from("partner_programs").insert({
      employer_id: selectedId,
      monthly_credits: monthly,
      auto_recharge_threshold: threshold,
      auto_recharge_amount: recharge,
      note,
      active: true,
    } as any);
    if (error) return toast.error(error.message);
    toast.success("협력업체로 등록되었습니다"); setSelectedId(""); setNote(""); load();
  };
  const remove = async (id: string, label: string) => {
    if (!confirm(`'${label}' 협력업체 등록을 해제할까요?`)) return;
    const { error } = await supabase.from("partner_programs").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("해제되었습니다"); load();
  };
  const toggleActive = async (p: any) => {
    const { error } = await supabase.from("partner_programs").update({ active: !p.active }).eq("id", p.id);
    if (error) return toast.error(error.message);
    load();
  };
  const startEdit = (p: any) => {
    setEditingId(p.id);
    setEditForm({ monthly_credits: p.monthly_credits, auto_recharge_threshold: p.auto_recharge_threshold, auto_recharge_amount: p.auto_recharge_amount, note: p.note ?? "", active: p.active });
  };
  const saveEdit = async (id: string) => {
    const { error } = await supabase.from("partner_programs").update(editForm as any).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("수정되었습니다"); setEditingId(null); load();
  };
  const runMonthly = async () => {
    if (!confirm("월정액 크레딧 지급을 지금 즉시 실행할까요?\n(이번 달 미지급 협력업체에만 지급됩니다)")) return;
    const { data, error } = await supabase.rpc("run_partner_monthly_grants" as any);
    if (error) return toast.error(error.message);
    toast.success(`지급 완료: ${(data as any)?.granted ?? 0}건`); load();
  };

  return (
    <Card className="mt-4"><CardContent className="p-4 space-y-6">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <h3 className="font-bold">협력업체 등록</h3>
          <Input placeholder="구인자 검색 (업체명/담당자)" value={q} onChange={e => setQ(e.target.value)} className="max-w-xs" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <Label className="text-xs">구인자 선택</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger><SelectValue placeholder="협력업체로 등록할 구인자 선택" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {filteredCandidates.map(e => (
                  <SelectItem key={e.user_id} value={e.user_id}>{e.company_name} · {e.full_name ?? e.manager_name ?? "-"} (보유 {e.credits})</SelectItem>
                ))}
                {filteredCandidates.length === 0 && <div className="p-2 text-xs text-muted-foreground">등록 가능한 구인자가 없습니다</div>}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">비고</Label>
            <Input placeholder="비고 (선택)" value={note} onChange={e => setNote(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">월정액 크레딧 (매월 1일 자동지급)</Label>
            <Input type="number" value={monthly} onChange={e => setMonthly(Number(e.target.value))} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">자동충전 기준 크레딧 이하</Label>
              <Input type="number" value={threshold} onChange={e => setThreshold(Number(e.target.value))} />
            </div>
            <div>
              <Label className="text-xs">자동충전 수량</Label>
              <Input type="number" value={recharge} onChange={e => setRecharge(Number(e.target.value))} />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={register}>협력업체로 등록</Button>
          <Button variant="outline" onClick={runMonthly}>월정액 즉시 지급 실행</Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">월정액은 매월 1일 자동 지급되며, 보유 크레딧이 기준 이하로 떨어지면 자동충전됩니다. 0으로 두면 해당 기능은 비활성화됩니다.</p>
      </div>

      <div>
        <h3 className="font-bold mb-2">등록된 협력업체 ({programs.length})</h3>
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b">
            <th className="py-2">업체</th><th>담당자</th><th>보유</th><th>월정액</th><th>자동충전</th><th>활성</th><th>비고</th><th>최근지급</th><th></th>
          </tr></thead>
          <tbody>
            {programs.map(p => {
              const e = empMap[p.employer_id];
              const editing = editingId === p.id;
              return (
                <tr key={p.id} className="border-b align-top">
                  <td className="py-2">{e?.company_name ?? "(삭제됨)"}</td>
                  <td>{e?.full_name ?? e?.manager_name ?? "-"}</td>
                  <td className="font-bold">{e?.credits ?? "-"}</td>
                  <td>{editing ? <Input className="w-20" type="number" value={editForm.monthly_credits} onChange={ev => setEditForm({ ...editForm, monthly_credits: Number(ev.target.value) })} /> : p.monthly_credits}</td>
                  <td>
                    {editing ? (
                      <div className="flex gap-1">
                        <Input className="w-16" type="number" value={editForm.auto_recharge_threshold} onChange={ev => setEditForm({ ...editForm, auto_recharge_threshold: Number(ev.target.value) })} />
                        <span className="text-xs self-center">↓</span>
                        <Input className="w-16" type="number" value={editForm.auto_recharge_amount} onChange={ev => setEditForm({ ...editForm, auto_recharge_amount: Number(ev.target.value) })} />
                      </div>
                    ) : (p.auto_recharge_amount > 0 ? `${p.auto_recharge_threshold} 이하 → +${p.auto_recharge_amount}` : "-")}
                  </td>
                  <td><Switch checked={p.active} onCheckedChange={() => toggleActive(p)} /></td>
                  <td className="max-w-[160px]">{editing ? <Input value={editForm.note} onChange={ev => setEditForm({ ...editForm, note: ev.target.value })} /> : (p.note ?? "")}</td>
                  <td className="text-xs">{p.last_monthly_grant_at ? new Date(p.last_monthly_grant_at).toLocaleDateString("ko-KR") : "-"}</td>
                  <td>
                    <div className="flex gap-1">
                      {editing ? (
                        <>
                          <Button size="sm" onClick={() => saveEdit(p.id)}>저장</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>취소</Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="outline" onClick={() => startEdit(p)}><Pencil size={12} /></Button>
                          <Button size="sm" variant="destructive" onClick={() => remove(p.id, e?.company_name ?? "")}><Trash2 size={12} /></Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {programs.length === 0 && (
              <tr><td colSpan={9} className="py-6 text-center text-sm text-muted-foreground">등록된 협력업체가 없습니다</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pt-6 border-t">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <h3 className="font-bold">보조관리자(manager) 지정</h3>
          <Input placeholder="사용자 검색 (이름/연락처)" value={mgrQ} onChange={e => setMgrQ(e.target.value)} className="max-w-xs" />
        </div>
        <div className="flex gap-2 mb-3 flex-wrap">
          <Select value={mgrSelectedId} onValueChange={setMgrSelectedId}>
            <SelectTrigger className="max-w-md"><SelectValue placeholder="보조관리자로 지정할 사용자 선택" /></SelectTrigger>
            <SelectContent className="max-h-72">
              {mgrCandidates.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.full_name ?? "(이름없음)"} · {p.phone ?? "-"}</SelectItem>
              ))}
              {mgrCandidates.length === 0 && <div className="p-2 text-xs text-muted-foreground">지정 가능한 사용자가 없습니다</div>}
            </SelectContent>
          </Select>
          <Button onClick={addManager}>보조관리자 지정</Button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">보조관리자는 /admin2 페이지에 접근하여 전체 사용자, 크레딧, 추천인, 크레딧 구매현황, FAQ를 조회(엑셀 다운로드 포함)할 수 있습니다. 수정/삭제 권한은 없습니다.</p>
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b">
            <th className="py-2">이름</th><th>연락처</th><th>지정일</th><th></th>
          </tr></thead>
          <tbody>
            {managers.map(m => (
              <tr key={m.id} className="border-b">
                <td className="py-2">{m.profile?.full_name ?? "(이름없음)"}</td>
                <td>{m.profile?.phone ?? "-"}</td>
                <td className="text-xs">{new Date(m.created_at).toLocaleDateString("ko-KR")}</td>
                <td><Button size="sm" variant="destructive" onClick={() => removeManager(m.id, m.profile?.full_name ?? "")}><Trash2 size={12} /></Button></td>
              </tr>
            ))}
            {managers.length === 0 && (
              <tr><td colSpan={4} className="py-6 text-center text-sm text-muted-foreground">지정된 보조관리자가 없습니다</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </CardContent></Card>
  );
}


function TaxonomyTab() {
  const [industries, setIndustries] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [iKey, setIKey] = useState(""); const [iLabel, setILabel] = useState("");
  const [rIndustry, setRIndustry] = useState(""); const [rKey, setRKey] = useState(""); const [rLabel, setRLabel] = useState("");

  const load = async () => {
    const { data: i } = await supabase.from("custom_industries").select("*").order("sort_order").order("created_at");
    const { data: r } = await supabase.from("custom_job_roles").select("*").order("industry_key").order("sort_order").order("created_at");
    setIndustries(i ?? []); setRoles(r ?? []);
  };
  useEffect(() => { load(); }, []);

  const addIndustry = async () => {
    const key = iKey.trim().toLowerCase().replace(/\s+/g, "_");
    if (!key || !iLabel.trim()) { toast.error("키와 라벨을 입력하세요"); return; }
    const { error } = await supabase.from("custom_industries").insert({ key, label: iLabel.trim() });
    if (error) { toast.error(error.message); return; }
    setIKey(""); setILabel(""); toast.success("추가됨"); load();
  };
  const updateIndustry = async (key: string, label: string) => {
    const { error } = await supabase.from("custom_industries").update({ label }).eq("key", key);
    if (error) toast.error(error.message); else { toast.success("수정됨"); load(); }
  };
  const delIndustry = async (key: string) => {
    if (!confirm(`'${key}' 업종을 삭제할까요? (관련 직무도 함께 삭제)`)) return;
    await supabase.from("custom_job_roles").delete().eq("industry_key", key);
    const { error } = await supabase.from("custom_industries").delete().eq("key", key);
    if (error) toast.error(error.message); else { toast.success("삭제됨"); load(); }
  };

  const addRole = async () => {
    const key = rKey.trim().toLowerCase().replace(/\s+/g, "_");
    if (!rIndustry || !key || !rLabel.trim()) { toast.error("업종/키/라벨을 입력하세요"); return; }
    const { error } = await supabase.from("custom_job_roles").insert({ industry_key: rIndustry, key, label: rLabel.trim() });
    if (error) { toast.error(error.message); return; }
    setRKey(""); setRLabel(""); toast.success("추가됨"); load();
  };
  const updateRole = async (industry_key: string, key: string, label: string) => {
    const { error } = await supabase.from("custom_job_roles").update({ label }).eq("industry_key", industry_key).eq("key", key);
    if (error) toast.error(error.message); else { toast.success("수정됨"); load(); }
  };
  const delRole = async (industry_key: string, key: string) => {
    if (!confirm(`'${key}' 직무를 삭제할까요?`)) return;
    const { error } = await supabase.from("custom_job_roles").delete().eq("industry_key", industry_key).eq("key", key);
    if (error) toast.error(error.message); else { toast.success("삭제됨"); load(); }
  };

  const allIndustryKeys = industries.map((x: any) => x.key);

  return (
    <div className="space-y-6">
      <Card><CardContent className="pt-4 space-y-3">
        <h3 className="font-bold">업종 (커스텀)</h3>
        <p className="text-xs text-muted-foreground">기본 업종(호텔/모텔/리조트/식당/병원/요양원) 외에 추가할 수 있습니다.</p>
        <div className="flex gap-2 flex-wrap items-end">
          <div><Label className="text-xs">키(영문)</Label><Input value={iKey} onChange={e => setIKey(e.target.value)} placeholder="cafe" className="h-9 w-32" /></div>
          <div><Label className="text-xs">라벨</Label><Input value={iLabel} onChange={e => setILabel(e.target.value)} placeholder="카페" className="h-9 w-40" /></div>
          <Button size="sm" onClick={addIndustry}>추가</Button>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">키</th><th>라벨</th><th></th></tr></thead>
          <tbody>
            {industries.map((i: any) => (
              <tr key={i.key} className="border-b">
                <td className="py-2 font-mono text-xs">{i.key}</td>
                <td><Input defaultValue={i.label} className="h-8 w-44" onBlur={e => e.target.value !== i.label && updateIndustry(i.key, e.target.value)} /></td>
                <td className="text-right"><Button size="sm" variant="destructive" onClick={() => delIndustry(i.key)}><Trash2 size={12} /></Button></td>
              </tr>
            ))}
            {industries.length === 0 && <tr><td colSpan={3} className="py-4 text-center text-xs text-muted-foreground">커스텀 업종 없음</td></tr>}
          </tbody>
        </table>
      </CardContent></Card>

      <Card><CardContent className="pt-4 space-y-3">
        <h3 className="font-bold">직무 (커스텀)</h3>
        <p className="text-xs text-muted-foreground">업종별 직무를 추가합니다. 업종 키는 기본 키(hotel 등)도 입력 가능합니다.</p>
        <div className="flex gap-2 flex-wrap items-end">
          <div>
            <Label className="text-xs">업종 키</Label>
            <Input value={rIndustry} onChange={e => setRIndustry(e.target.value)} placeholder="hotel 또는 cafe" className="h-9 w-36" list="industry-keys" />
            <datalist id="industry-keys">
              {["hotel","motel","resort","restaurant","hospital","nursing", ...allIndustryKeys].map(k => <option key={k} value={k} />)}
            </datalist>
          </div>
          <div><Label className="text-xs">직무 키</Label><Input value={rKey} onChange={e => setRKey(e.target.value)} placeholder="barista" className="h-9 w-32" /></div>
          <div><Label className="text-xs">라벨</Label><Input value={rLabel} onChange={e => setRLabel(e.target.value)} placeholder="바리스타" className="h-9 w-40" /></div>
          <Button size="sm" onClick={addRole}>추가</Button>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">업종</th><th>직무 키</th><th>라벨</th><th></th></tr></thead>
          <tbody>
            {roles.map((r: any) => (
              <tr key={`${r.industry_key}-${r.key}`} className="border-b">
                <td className="py-2 font-mono text-xs">{r.industry_key}</td>
                <td className="font-mono text-xs">{r.key}</td>
                <td><Input defaultValue={r.label} className="h-8 w-44" onBlur={e => e.target.value !== r.label && updateRole(r.industry_key, r.key, e.target.value)} /></td>
                <td className="text-right"><Button size="sm" variant="destructive" onClick={() => delRole(r.industry_key, r.key)}><Trash2 size={12} /></Button></td>
              </tr>
            ))}
            {roles.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-xs text-muted-foreground">커스텀 직무 없음</td></tr>}
          </tbody>
        </table>
      </CardContent></Card>
    </div>
  );
}
