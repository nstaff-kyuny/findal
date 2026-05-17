import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin")({ component: Admin });

function Admin() {
  const { user, roles, loading, signOut } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (loading) return;
    if (!user) nav({ to: "/auth" });
  }, [loading, user]);

  if (!user) return null;
  const isAdmin = roles.includes("admin");

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b px-6 py-3 flex justify-between items-center">
        <h1 className="font-bold text-xl">JobMatch · 관리자</h1>
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
    // first admin only — works if no admin exists yet
    const { count } = await supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) > 0) { setBusy(false); return toast.error("이미 관리자가 등록되어 있습니다. 기존 관리자에게 권한 부여를 요청하세요."); }
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" } as any);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("관리자 권한 부여됨");
    onClaimed();
  };
  return (
    <Card className="max-w-md mx-auto mt-12"><CardContent className="p-6 text-center space-y-3">
      <h2 className="font-bold text-lg">관리자 권한이 없습니다</h2>
      <p className="text-sm text-muted-foreground">최초 관리자가 아직 없으면 아래 버튼으로 직접 등록할 수 있습니다.</p>
      <Button onClick={claim} disabled={busy}>최초 관리자로 등록</Button>
    </CardContent></Card>
  );
}

function AdminPanel() {
  return (
    <Tabs defaultValue="users">
      <TabsList>
        <TabsTrigger value="users">사용자</TabsTrigger>
        <TabsTrigger value="credits">크레딧</TabsTrigger>
        <TabsTrigger value="referrers">추천인</TabsTrigger>
        <TabsTrigger value="banners">광고 배너</TabsTrigger>
        <TabsTrigger value="purchases">크레딧 구매요청</TabsTrigger>
      </TabsList>
      <TabsContent value="users"><UsersTab /></TabsContent>
      <TabsContent value="credits"><CreditsTab /></TabsContent>
      <TabsContent value="referrers"><ReferrersTab /></TabsContent>
      <TabsContent value="banners"><BannersTab /></TabsContent>
      <TabsContent value="purchases"><PurchasesTab /></TabsContent>
    </Tabs>
  );
}

function UsersTab() {
  const [employers, setEmployers] = useState<any[]>([]);
  const [seekers, setSeekers] = useState<any[]>([]);
  useEffect(() => { (async () => {
    const { data: e } = await supabase.from("employer_profiles").select("*, profiles:user_id(full_name, phone)").order("created_at", { ascending: false });
    const { data: s } = await supabase.from("seeker_profiles").select("*, profiles:user_id(full_name, phone)").order("created_at", { ascending: false });
    setEmployers(e ?? []); setSeekers(s ?? []);
  })(); }, []);
  return (
    <div className="grid md:grid-cols-2 gap-4 mt-4">
      <Card><CardContent className="p-4">
        <h3 className="font-bold mb-3">구인자 ({employers.length})</h3>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {employers.map(e => (
            <div key={e.user_id} className="p-2 border rounded text-sm">
              <p className="font-semibold">{e.company_name}</p>
              <p className="text-xs text-muted-foreground">{e.profiles?.full_name} · {e.contact_phone}</p>
              <p className="text-xs">📍 {e.location} · 💰 {e.credits} 크레딧</p>
            </div>
          ))}
        </div>
      </CardContent></Card>
      <Card><CardContent className="p-4">
        <h3 className="font-bold mb-3">구직자 ({seekers.length})</h3>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {seekers.map(s => (
            <div key={s.user_id} className="p-2 border rounded text-sm">
              <p className="font-semibold">{s.profiles?.full_name} <Badge variant="outline" className="ml-1 text-[10px]">{s.nationality === "foreigner" ? "외국인" : "내국인"}</Badge></p>
              <p className="text-xs text-muted-foreground">{s.profiles?.phone} · 추천인: {s.referrer_code ?? "-"}</p>
              <p className="text-xs">경력: {s.experience} · 한국어: {s.korean_ok ? "O" : "X"} · 비자: {s.visa}</p>
            </div>
          ))}
        </div>
      </CardContent></Card>
    </div>
  );
}

function CreditsTab() {
  const [employers, setEmployers] = useState<any[]>([]);
  const load = async () => {
    const { data } = await supabase.from("employer_profiles").select("*, profiles:user_id(full_name)").order("credits");
    setEmployers(data ?? []);
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
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [code, setCode] = useState(""); const [name, setName] = useState(""); const [phone, setPhone] = useState("");
  const load = async () => {
    const { data } = await supabase.from("referrers").select("*").order("created_at", { ascending: false });
    setList(data ?? []);
    const { data: seekers } = await supabase.from("seeker_profiles").select("referrer_code");
    const map: Record<string, number> = {};
    (seekers ?? []).forEach((s: any) => { if (s.referrer_code) map[s.referrer_code] = (map[s.referrer_code] ?? 0) + 1; });
    setCounts(map);
  };
  useEffect(() => { load(); }, []);
  const add = async () => {
    if (!code || !name) return toast.error("코드와 이름 필수");
    const { error } = await supabase.from("referrers").insert({ code, name, phone } as any);
    if (error) return toast.error(error.message);
    setCode(""); setName(""); setPhone(""); load();
  };
  return (
    <Card className="mt-4"><CardContent className="p-4 space-y-4">
      <h3 className="font-bold">추천인 관리</h3>
      <div className="grid grid-cols-4 gap-2">
        <Input placeholder="코드 (예: REF1234)" value={code} onChange={e => setCode(e.target.value)} />
        <Input placeholder="이름" value={name} onChange={e => setName(e.target.value)} />
        <Input placeholder="연락처" value={phone} onChange={e => setPhone(e.target.value)} />
        <Button onClick={add}>추가</Button>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="text-left border-b"><th className="py-2">코드</th><th>이름</th><th>연락처</th><th>가입자</th></tr></thead>
        <tbody>
          {list.map(r => (
            <tr key={r.id} className="border-b">
              <td className="py-2 font-mono">{r.code}</td>
              <td>{r.name}</td>
              <td>{r.phone}</td>
              <td className="font-bold">{counts[r.code] ?? 0}명</td>
            </tr>
          ))}
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
    const { data } = await supabase.from("credit_purchase_requests").select("*, employer_profiles!inner(company_name, user_id)").order("created_at", { ascending: false });
    setList(data ?? []);
  };
  useEffect(() => { load(); }, []);
  const fulfill = async (r: any) => {
    const { error: e1 } = await supabase.rpc("admin_grant_credits", { _employer: r.employer_id, _amount: r.pack, _note: `구매(${r.pack})` } as any);
    if (e1) return toast.error(e1.message);
    await supabase.from("credit_purchase_requests").update({ status: "fulfilled" }).eq("id", r.id);
    toast.success("크레딧 적립됨"); load();
  };
  return (
    <Card className="mt-4"><CardContent className="p-4">
      <h3 className="font-bold mb-3">크레딧 구매 요청</h3>
      <table className="w-full text-sm">
        <thead><tr className="text-left border-b"><th className="py-2">회사</th><th>수량</th><th>금액</th><th>상태</th><th>요청일</th><th></th></tr></thead>
        <tbody>
          {list.map(r => (
            <tr key={r.id} className="border-b">
              <td className="py-2">{r.employer_profiles?.company_name}</td>
              <td>{r.pack}</td>
              <td>{Number(r.amount_krw).toLocaleString()}원</td>
              <td><Badge variant={r.status === "fulfilled" ? "default" : "secondary"}>{r.status}</Badge></td>
              <td className="text-xs">{new Date(r.created_at).toLocaleString("ko-KR")}</td>
              <td>{r.status === "pending" && <Button size="sm" onClick={() => fulfill(r)}>적립</Button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </CardContent></Card>
  );
}
