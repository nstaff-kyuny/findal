import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, Fragment } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { adminCreateUser, adminDeleteUser, adminResetPassword, adminListUserEmails } from "@/lib/admin-users.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import { Download, Trash2, UserPlus, KeyRound } from "lucide-react";

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
        <div>
          <h1 className="font-bold text-lg mb-2">관리자 페이지는 PC에서만 이용 가능합니다</h1>
          <p className="text-sm text-muted-foreground">데스크탑(1024px 이상) 환경에서 접속해 주세요.</p>
        </div>
      </div>
    );
  }
  const isAdmin = roles.includes("admin");
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b px-6 py-3 flex justify-between items-center">
        <h1 className="font-bold text-xl text-primary">Find AR (파인달) · 관리자</h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">{user.email}</span>
          <Button size="sm" variant="outline" onClick={signOut}>로그아웃</Button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-6">
        {!isAdmin ? <AdminClaim onClaimed={() => location.reload()} userId={user.id} /> : <AdminPanel />}
      </main>
    </div>
  );
}

function AdminClaim({ userId, onClaimed }: { userId: string; onClaimed: () => void }) {
  const [busy, setBusy] = useState(false);
  const claim = async () => {
    setBusy(true);
    const { count } = await supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) > 0) { setBusy(false); return toast.error("이미 관리자가 등록되어 있습니다."); }
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" } as any);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("관리자 권한 부여됨"); onClaimed();
  };
  return (
    <Card className="max-w-md mx-auto mt-12"><CardContent className="p-6 text-center space-y-3">
      <h2 className="font-bold text-lg">관리자 권한이 없습니다</h2>
      <Button onClick={claim} disabled={busy}>최초 관리자로 등록</Button>
    </CardContent></Card>
  );
}

function AdminPanel() {
  return (
    <Tabs defaultValue="users">
      <TabsList className="flex-wrap h-auto">
        <TabsTrigger value="users">사용자</TabsTrigger>
        <TabsTrigger value="credits">크레딧</TabsTrigger>
        <TabsTrigger value="referrers">추천인</TabsTrigger>
        <TabsTrigger value="banners">광고 배너</TabsTrigger>
        <TabsTrigger value="purchases">크레딧 구매현황</TabsTrigger>
        <TabsTrigger value="payment">결제 연동</TabsTrigger>
        <TabsTrigger value="notices">공지사항</TabsTrigger>
        <TabsTrigger value="events">이벤트</TabsTrigger>
        <TabsTrigger value="faqs">FAQ</TabsTrigger>
        <TabsTrigger value="inquiries">1:1 문의</TabsTrigger>
        <TabsTrigger value="version">앱 버전</TabsTrigger>
        <TabsTrigger value="icons">앱 아이콘</TabsTrigger>
      </TabsList>
      <TabsContent value="users"><UsersTab /></TabsContent>
      <TabsContent value="credits"><CreditsTab /></TabsContent>
      <TabsContent value="referrers"><ReferrersTab /></TabsContent>
      <TabsContent value="banners"><BannersTab /></TabsContent>
      <TabsContent value="purchases"><PurchasesTab /></TabsContent>
      <TabsContent value="payment"><PaymentTab /></TabsContent>
      <TabsContent value="notices"><NoticesTab /></TabsContent>
      <TabsContent value="events"><EventsTab /></TabsContent>
      <TabsContent value="faqs"><FaqsTab /></TabsContent>
      <TabsContent value="inquiries"><InquiriesTab /></TabsContent>
      <TabsContent value="version"><VersionTab /></TabsContent>
      <TabsContent value="icons"><IconsTab /></TabsContent>
    </Tabs>
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
  const [busy, setBusy] = useState(false);

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
      await createUser({ data: { email: newEmail, password: newPwd, fullName: newName, phone: newPhone, role: newRole } });
      toast.success("사용자가 추가되었습니다");
      setNewEmail(""); setNewPwd(""); setNewName(""); setNewPhone("");
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
      한국어: s.korean_ok ? "가능" : "불가", 비자: s.visa,
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
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <Input placeholder="이메일" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
          <Input placeholder="비밀번호 (6자리)" value={newPwd} onChange={e => setNewPwd(e.target.value)} />
          <Input placeholder="이름" value={newName} onChange={e => setNewName(e.target.value)} />
          <Input placeholder="연락처" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
          <Select value={newRole} onValueChange={(v: any) => setNewRole(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="seeker">구직자</SelectItem>
              <SelectItem value="employer">구인자</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleCreate} disabled={busy}>추가</Button>
        </div>
      </CardContent></Card>
      <div className="grid md:grid-cols-2 gap-4">
        <Card><CardContent className="p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold">구인자 ({employers.length})</h3>
            <Button size="sm" variant="outline" onClick={exportEmployers}><Download size={14} className="mr-1" />엑셀 다운로드</Button>
          </div>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {employers.map(e => (
              <div key={e.user_id} className="p-2 border rounded text-sm flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{e.company_name}</p>
                  <p className="text-xs text-primary truncate">📧 {emails[e.user_id] ?? "..."}</p>
                  <p className="text-xs text-muted-foreground truncate">{e.profiles?.full_name} · {e.contact_phone}</p>
                  <p className="text-xs">📍 {e.location} · 💰 {e.credits} 크레딧</p>
                </div>
                <div className="flex flex-col gap-1">
                  <Button size="sm" variant="ghost" title="비밀번호 재설정" onClick={() => handleReset(e.user_id, e.company_name)}>
                    <KeyRound size={14} />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(e.user_id, e.company_name)}>
                    <Trash2 size={14} className="text-destructive" />
                  </Button>
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
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {seekers.map(s => (
              <div key={s.user_id} className="p-2 border rounded text-sm flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{s.profiles?.full_name} <Badge variant="outline" className="ml-1 text-[10px]">{s.nationality === "foreigner" ? "외국인" : "내국인"}</Badge></p>
                  <p className="text-xs text-primary truncate">📧 {emails[s.user_id] ?? "..."}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.profiles?.phone} · 추천인: {s.referrer_code ?? "-"}</p>
                  <p className="text-xs">경력: {s.experience} · 한국어: {s.korean_ok ? "O" : "X"} · 비자: {s.visa}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <Button size="sm" variant="ghost" title="비밀번호 재설정" onClick={() => handleReset(s.user_id, s.profiles?.full_name ?? "사용자")}>
                    <KeyRound size={14} />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(s.user_id, s.profiles?.full_name ?? "사용자")}>
                    <Trash2 size={14} className="text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent></Card>
      </div>
    </div>
  );
}
function CreditsTab() {
  const [employers, setEmployers] = useState<any[]>([]);
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
  return (
    <Card className="mt-4"><CardContent className="p-4">
      <h3 className="font-bold mb-3">크레딧 관리</h3>
      <table className="w-full text-sm">
        <thead><tr className="text-left border-b"><th className="py-2">회사</th><th>담당자</th><th>크레딧</th><th></th></tr></thead>
        <tbody>
          {employers.map(e => (
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
  const [list, setList] = useState<any[]>([]);
  const [signups, setSignups] = useState<Record<string, any[]>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
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
  const exportXlsx = async () => {
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
      { header: "가입자이름", key: "userName" }, { header: "가입자연락처", key: "userPhone" },
      { header: "가입일", key: "signedUp" },
    ];
    list.forEach(r => {
      (signups[r.code] ?? []).forEach((u: any) => ws2.addRow({
        code: r.code, refName: r.name,
        userName: u.full_name, userPhone: u.phone,
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
  return (
    <Card className="mt-4"><CardContent className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold">추천인 관리</h3>
        <Button size="sm" variant="outline" onClick={exportXlsx}><Download size={14} className="mr-1" />엑셀 다운로드</Button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <Input placeholder="코드 (예: REF1234)" value={code} onChange={e => setCode(e.target.value)} />
        <Input placeholder="이름" value={name} onChange={e => setName(e.target.value)} />
        <Input placeholder="연락처" value={phone} onChange={e => setPhone(e.target.value)} />
        <Button onClick={add}>추가</Button>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="text-left border-b"><th className="py-2">코드</th><th>이름</th><th>연락처</th><th>가입자</th><th></th></tr></thead>
        <tbody>
          {list.map(r => {
            const users = signups[r.code] ?? [];
            const isOpen = expanded[r.id];
            const toggle = () => setExpanded(s => ({ ...s, [r.id]: !s[r.id] }));
            return (
              <Fragment key={r.id}>
                <tr className="border-b">
                  <td className="py-2 font-mono">{r.code}</td>
                  <td>{r.name}</td>
                  <td>{r.phone}</td>
                  <td>
                    <Button size="sm" variant="ghost" className="font-bold h-auto p-1" onClick={toggle}>
                      {users.length}명 {users.length > 0 ? (isOpen ? " ▲" : " ▼") : ""}
                    </Button>
                  </td>
                  <td>
                    <Button size="sm" variant="ghost" onClick={() => del(r.id, r.name)}>
                      <Trash2 size={14} className="text-destructive" />
                    </Button>
                  </td>
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
  const load = async () => {
    const { data } = await supabase.from("ad_banners").select("*").order("created_at", { ascending: false });
    setList(data ?? []);
  };
  useEffect(() => { load(); }, []);
  const add = async () => {
    if (!title || !end) return toast.error("제목과 종료일 필수");
    const { error } = await supabase.from("ad_banners").insert({
      title, image_url: img || null, link_url: url || null,
      starts_at: start || new Date().toISOString(), ends_at: end,
    } as any);
    if (error) return toast.error(error.message);
    setTitle(""); setImg(""); setUrl(""); setStart(""); setEnd(""); load();
  };
  const toggle = async (b: any) => { await supabase.from("ad_banners").update({ active: !b.active }).eq("id", b.id); load(); };
  const del = async (id: string) => { if (confirm("삭제할까요?")) { await supabase.from("ad_banners").delete().eq("id", id); load(); } };
  return (
    <Card className="mt-4"><CardContent className="p-4 space-y-4">
      <h3 className="font-bold">광고 배너 관리</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <Input placeholder="제목" value={title} onChange={e => setTitle(e.target.value)} />
        <Input placeholder="이미지 URL" value={img} onChange={e => setImg(e.target.value)} />
        <Input placeholder="링크 URL" value={url} onChange={e => setUrl(e.target.value)} />
        <Input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} />
        <Input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} />
      </div>
      <Button onClick={add}>등록</Button>
      <table className="w-full text-sm">
        <thead><tr className="text-left border-b"><th className="py-2">제목</th><th>기간</th><th>활성</th><th></th></tr></thead>
        <tbody>
          {list.map(b => (
            <tr key={b.id} className="border-b">
              <td className="py-2">{b.title}</td>
              <td className="text-xs">{new Date(b.starts_at).toLocaleDateString()} ~ {new Date(b.ends_at).toLocaleDateString()}</td>
              <td><Badge variant={b.active ? "default" : "secondary"}>{b.active ? "활성" : "비활성"}</Badge></td>
              <td className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => toggle(b)}>{b.active ? "비활성" : "활성"}</Button>
                <Button size="sm" variant="destructive" onClick={() => del(b.id)}>삭제</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </CardContent></Card>
  );
}

function PurchasesTab() {
  const [list, setList] = useState<any[]>([]);
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
  const totalSales = list.filter(r => r.status === "fulfilled").reduce((s, r) => s + Number(r.amount_krw), 0);
  const totalCredits = list.filter(r => r.status === "fulfilled").reduce((s, r) => s + Number(r.pack), 0);
  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">총 결제건수</p>
          <p className="text-2xl font-bold">{list.filter(r => r.status === "fulfilled").length}건</p>
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
        <h3 className="font-bold mb-3">크레딧 구매 현황</h3>
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b">
            <th className="py-2">결제일시</th><th>회사</th><th>수량</th><th>금액</th>
            <th>결제수단</th><th>결제번호</th><th>상태</th>
          </tr></thead>
          <tbody>
            {list.map(r => (
              <tr key={r.id} className="border-b">
                <td className="py-2 text-xs">{new Date(r.created_at).toLocaleString("ko-KR")}</td>
                <td>{r.employer_profiles?.company_name}</td>
                <td>{r.pack}</td>
                <td>{Number(r.amount_krw).toLocaleString()}원</td>
                <td className="text-xs">{r.payment_method ?? "-"}</td>
                <td className="text-xs font-mono">{r.payment_ref ?? "-"}</td>
                <td><Badge variant={r.status === "fulfilled" ? "default" : "secondary"}>{r.status === "fulfilled" ? "결제완료" : r.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent></Card>
    </div>
  );
}

const PAYMENT_KEY = "findar.payment_config";

function PaymentTab() {
  const [provider, setProvider] = useState("none");
  const [merchantId, setMerchantId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PAYMENT_KEY);
      if (raw) {
        const cfg = JSON.parse(raw);
        setProvider(cfg.provider ?? "none"); setMerchantId(cfg.merchantId ?? "");
        setApiKey(cfg.apiKey ?? ""); setEnabled(cfg.enabled ?? false);
      }
    } catch {}
  }, []);

  const save = () => {
    localStorage.setItem(PAYMENT_KEY, JSON.stringify({ provider, merchantId, apiKey, enabled }));
    toast.success("결제 설정이 저장되었습니다");
  };

  return (
    <div className="mt-4 grid md:grid-cols-2 gap-4">
      <Card><CardContent className="p-4 space-y-3">
        <h3 className="font-bold">온라인 결제 플랫폼 연동</h3>
        <p className="text-xs text-muted-foreground">구인자의 크레딧 온라인 구매를 처리할 결제 PG 사를 연결합니다.</p>

        <div>
          <Label>결제 제공사</Label>
          <select className="w-full border rounded h-9 px-2 mt-1 bg-background"
            value={provider} onChange={e => setProvider(e.target.value)}>
            <option value="none">선택 안함</option>
            <option value="toss">토스페이먼츠 (Toss Payments)</option>
            <option value="iamport">아임포트 (PortOne)</option>
            <option value="nicepay">나이스페이</option>
            <option value="kg_inicis">KG이니시스</option>
            <option value="stripe">Stripe (해외)</option>
          </select>
        </div>
        <div><Label>가맹점 ID / Merchant ID</Label><Input value={merchantId} onChange={e => setMerchantId(e.target.value)} /></div>
        <div><Label>API 키 / Secret Key</Label><Input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} /></div>
        <div className="flex items-center justify-between">
          <Label>결제 활성화</Label>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
        <Button onClick={save} className="w-full">설정 저장</Button>
      </CardContent></Card>

      <Card><CardContent className="p-4 space-y-3 text-sm">
        <h3 className="font-bold">연동 가이드</h3>
        <p className="text-muted-foreground">
          현재는 결제 설정만 저장됩니다. 실 결제 처리를 위해서는 선택한 PG사의 SDK 연동과 서버 측 결제 검증 로직 구현이 추가로 필요합니다.
        </p>
        <ul className="text-xs space-y-1 list-disc list-inside text-muted-foreground">
          <li>토스페이먼츠: <a className="text-primary underline" href="https://docs.tosspayments.com" target="_blank" rel="noreferrer">docs.tosspayments.com</a></li>
          <li>PortOne(아임포트): <a className="text-primary underline" href="https://portone.io/korea/ko" target="_blank" rel="noreferrer">portone.io</a></li>
          <li>Stripe: <a className="text-primary underline" href="https://stripe.com/docs" target="_blank" rel="noreferrer">stripe.com/docs</a></li>
        </ul>
        <p className="text-xs text-amber-600 mt-2">⚠ 보안: 실제 API 시크릿 키는 클라이언트가 아닌 서버 환경 변수로 관리하는 것을 권장합니다.</p>
      </CardContent></Card>
    </div>
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
  const [list, setList] = useState<any[]>([]);
  const [answering, setAnswering] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
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
            <Button size="sm" variant="outline" onClick={() => setAnswering(q.id)}>답변하기</Button>
          )}
        </CardContent></Card>
      ))}
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
