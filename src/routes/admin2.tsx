import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

import ExcelJS from "exceljs";
import { Download, Briefcase } from "lucide-react";

const ROLE_LABEL: Record<string, string> = {
  employer: "구인자",
  seeker: "구직자",
  manager: "보조관리자",
  admin: "관리자",
};
const roleLabel = (r: string) => ROLE_LABEL[r] ?? r;

const PURCHASE_STATUS_LABEL: Record<string, string> = {
  pending: "대기중",
  paid: "결제완료",
  fulfilled: "지급완료",
  cancelled: "취소",
  canceled: "취소",
  failed: "실패",
  refunded: "환불",
  rejected: "거절",
  approved: "승인",
};
const purchaseStatusLabel = (s: string) => PURCHASE_STATUS_LABEL[s] ?? s;

export const Route = createFileRoute("/admin2")({ component: Admin2 });

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
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function Admin2() {
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
          <h1 className="font-bold text-lg mb-2">보조관리자 페이지는 PC에서만 이용 가능합니다</h1>
          <p className="text-sm text-muted-foreground mb-6">데스크탑(1024px 이상) 환경에서 접속해 주세요.</p>
          <Button onClick={signOut}>로그아웃</Button>
        </div>
      </div>
    );
  }
  const isManager = roles.includes("manager") || roles.includes("admin");
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b px-6 py-3 flex justify-between items-center">
        <h1 className="font-bold text-xl text-primary">Find AR (파인달) · 보조관리자</h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">{user.email}</span>
          <Button size="sm" variant="outline" onClick={signOut}>로그아웃</Button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-6">
        {!isManager ? (
          <Card className="max-w-md mx-auto mt-12"><CardContent className="p-6 text-center space-y-3">
            <h2 className="font-bold text-lg">보조관리자 권한이 없습니다</h2>
            <p className="text-sm text-muted-foreground">현재 계정은 보조관리자 권한이 없습니다.</p>
            <Button onClick={() => nav({ to: "/" })}>홈으로</Button>
          </CardContent></Card>
        ) : (
          <Tabs defaultValue="all-users">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="all-users">전체 사용자</TabsTrigger>
              <TabsTrigger value="credits">크레딧</TabsTrigger>
              <TabsTrigger value="referrers">추천인</TabsTrigger>
              <TabsTrigger value="purchases">크레딧 구매현황</TabsTrigger>
              <TabsTrigger value="faqs">FAQ</TabsTrigger>
            </TabsList>
            <TabsContent value="all-users"><AllUsersView /></TabsContent>
            <TabsContent value="credits"><CreditsView /></TabsContent>
            <TabsContent value="referrers"><ReferrersView /></TabsContent>
            <TabsContent value="purchases"><PurchasesView /></TabsContent>
            <TabsContent value="faqs"><FaqsView /></TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}

function AllUsersView() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => {
    (async () => {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, phone, created_at");
      const { data: ur } = await supabase.from("user_roles").select("user_id, role");
      const { data: emps } = await supabase.from("employer_profiles").select("user_id, company_name, manager_name, credits, referrer_code");
      const { data: seekers } = await supabase.from("seeker_profiles").select("user_id, referrer_code");
      const rmap: Record<string, string[]> = {};
      (ur ?? []).forEach((r: any) => { (rmap[r.user_id] ||= []).push(r.role); });
      const emap: Record<string, any> = {};
      (emps ?? []).forEach((e: any) => { emap[e.user_id] = e; });
      const smap: Record<string, any> = {};
      (seekers ?? []).forEach((s: any) => { smap[s.user_id] = s; });
      setRows((profs ?? []).map((p: any) => ({
        id: p.id, full_name: p.full_name, phone: p.phone,
        roles: (rmap[p.id] ?? []).join(","),
        company_name: emap[p.id]?.company_name ?? "",
        credits: emap[p.id]?.credits ?? "",
        referrer_code: smap[p.id]?.referrer_code ?? emap[p.id]?.referrer_code ?? "",
        created_at: p.created_at,
      })));
    })();
  }, []);
  const filtered = rows.filter(r => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (r.full_name ?? "").toLowerCase().includes(s)
        || (r.phone ?? "").toLowerCase().includes(s)
        || (r.company_name ?? "").toLowerCase().includes(s)
        || (r.referrer_code ?? "").toLowerCase().includes(s);
  });
  return (
    <Card className="mt-4"><CardContent className="p-4">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <h3 className="font-bold">전체 사용자 ({filtered.length}/{rows.length})</h3>
        <div className="flex gap-2">
          <Input placeholder="이름/연락처/업체명/추천인코드 검색" value={q} onChange={e => setQ(e.target.value)} className="max-w-xs" />
          <Button size="sm" variant="outline" onClick={() => downloadXlsx(filtered, "전체사용자", `전체사용자_${new Date().toISOString().slice(0,10)}.xlsx`)}><Download size={14} className="mr-1" />엑셀</Button>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="text-left border-b"><th className="py-2">이름</th><th>연락처</th><th>역할</th><th>업체명</th><th>크레딧</th><th>추천인</th><th>가입일</th></tr></thead>
        <tbody>
          {filtered.map(r => (
            <tr key={r.id} className="border-b">
              <td className="py-2">{r.full_name ?? "-"}</td>
              <td>{r.phone ?? "-"}</td>
              <td><div className="flex gap-1 flex-wrap">{(r.roles ?? "").split(",").filter(Boolean).map((x: string) => {
                const label = roleLabel(x);
                if (x.trim() === "employer") {
                  return (
                    <span key={x} className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-xs font-medium border border-blue-100">
                      <Briefcase size={12} />
                      {label}
                    </span>
                  );
                }
                return <Badge key={x} variant="outline">{label}</Badge>;
              })}</div></td>
              <td>{r.company_name}</td>
              <td>{r.credits}</td>
              <td className="font-mono text-xs">{r.referrer_code || "-"}</td>
              <td className="text-xs">{r.created_at ? new Date(r.created_at).toLocaleDateString("ko-KR") : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </CardContent></Card>
  );
}

function CreditsView() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("employer_profiles").select("*").order("credits");
      const ids = (data ?? []).map((r: any) => r.user_id);
      const { data: profs } = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids) : { data: [] as any[] };
      const pmap: Record<string, any> = {};
      (profs ?? []).forEach((p: any) => { pmap[p.id] = p; });
      setRows((data ?? []).map((r: any) => ({
        company_name: r.company_name,
        full_name: pmap[r.user_id]?.full_name ?? r.manager_name ?? "",
        credits: r.credits,
        contact_phone: r.contact_phone,
        location: r.location,
      })));
    })();
  }, []);
  const filtered = rows.filter(r => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (r.company_name ?? "").toLowerCase().includes(s) || (r.full_name ?? "").toLowerCase().includes(s);
  });
  return (
    <Card className="mt-4"><CardContent className="p-4">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <h3 className="font-bold">크레딧 ({filtered.length}/{rows.length})</h3>
        <div className="flex gap-2">
          <Input placeholder="업체명/담당자 검색" value={q} onChange={e => setQ(e.target.value)} className="max-w-xs" />
          <Button size="sm" variant="outline" onClick={() => downloadXlsx(filtered, "크레딧", `크레딧_${new Date().toISOString().slice(0,10)}.xlsx`)}><Download size={14} className="mr-1" />엑셀</Button>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="text-left border-b"><th className="py-2">회사</th><th>담당자</th><th>크레딧</th><th>연락처</th><th>지역</th></tr></thead>
        <tbody>
          {filtered.map((r, i) => (
            <tr key={i} className="border-b">
              <td className="py-2">{r.company_name}</td>
              <td>{r.full_name}</td>
              <td className="font-bold">{r.credits}</td>
              <td>{r.contact_phone}</td>
              <td>{r.location}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </CardContent></Card>
  );
}

function ReferrersView() {
  const [rows, setRows] = useState<any[]>([]);
  const [signups, setSignups] = useState<Record<string, any[]>>({});
  const [q, setQ] = useState("");
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("referrers").select("*").order("created_at", { ascending: false });
      setRows(data ?? []);
      const { data: seekers } = await supabase.from("seeker_profiles").select("user_id, referrer_code, created_at");
      const uids = (seekers ?? []).filter((s: any) => s.referrer_code).map((s: any) => s.user_id);
      const pmap: Record<string, any> = {};
      if (uids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name, phone").in("id", uids);
        (profs ?? []).forEach((p: any) => { pmap[p.id] = p; });
      }
      const map: Record<string, any[]> = {};
      (seekers ?? []).forEach((s: any) => {
        if (!s.referrer_code) return;
        const p = pmap[s.user_id] ?? {};
        (map[s.referrer_code] ||= []).push({ user_id: s.user_id, full_name: p.full_name ?? "-", phone: p.phone ?? "-", signed_up_at: s.created_at });
      });
      setSignups(map);
    })();
  }, []);
  const counts: Record<string, number> = {};
  Object.entries(signups).forEach(([k, v]) => { counts[k] = v.length; });
  const filtered = rows.filter(r => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (r.code ?? "").toLowerCase().includes(s) || (r.name ?? "").toLowerCase().includes(s) || (r.phone ?? "").toLowerCase().includes(s);
  });
  const exportXlsx = async () => {
    const { staffListUserEmails } = await import("@/lib/admin-users.functions");
    const allUids = Array.from(new Set(Object.values(signups).flat().map((u: any) => u.user_id)));
    let emails: Record<string, string> = {};
    if (allUids.length) {
      try { const res = await staffListUserEmails({ data: { userIds: allUids } }); emails = (res as any).emails ?? {}; } catch {}
    }
    const wb = new ExcelJS.Workbook();
    const ws1 = wb.addWorksheet("추천인");
    ws1.columns = [
      { header: "코드", key: "code" }, { header: "이름", key: "name" },
      { header: "연락처", key: "phone" }, { header: "가입자수", key: "count" },
      { header: "활성", key: "active" }, { header: "비고", key: "note" },
    ];
    filtered.forEach(r => ws1.addRow({ code: r.code, name: r.name, phone: r.phone, count: counts[r.code] ?? 0, active: r.active ? "Y" : "N", note: r.note }));
    const ws2 = wb.addWorksheet("가입자");
    ws2.columns = [
      { header: "추천인코드", key: "code" }, { header: "추천인이름", key: "refName" },
      { header: "가입자이름", key: "userName" }, { header: "가입자아이디(이메일)", key: "userEmail" },
      { header: "가입자연락처", key: "userPhone" }, { header: "가입일", key: "signedUp" },
    ];
    filtered.forEach(r => {
      (signups[r.code] ?? []).forEach((u: any) => ws2.addRow({
        code: r.code, refName: r.name, userName: u.full_name, userEmail: emails[u.user_id] ?? "",
        userPhone: u.phone, signedUp: new Date(u.signed_up_at).toLocaleString("ko-KR"),
      }));
    });
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `추천인_${new Date().toISOString().slice(0,10)}.xlsx`; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Card className="mt-4"><CardContent className="p-4">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <h3 className="font-bold">추천인 ({filtered.length}/{rows.length})</h3>
        <div className="flex gap-2">
          <Input placeholder="코드/이름/연락처 검색" value={q} onChange={e => setQ(e.target.value)} className="max-w-xs" />
          <Button size="sm" variant="outline" onClick={exportXlsx}><Download size={14} className="mr-1" />엑셀</Button>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="text-left border-b"><th className="py-2">코드</th><th>이름</th><th>연락처</th><th>가입자수</th><th>활성</th></tr></thead>
        <tbody>
          {filtered.map(r => (
            <tr key={r.id} className="border-b">
              <td className="py-2 font-mono">{r.code}</td>
              <td>{r.name}</td>
              <td>{r.phone}</td>
              <td className="font-bold">{counts[r.code] ?? 0}</td>
              <td>{r.active ? "Y" : "N"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </CardContent></Card>
  );
}

function PurchasesView() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("credit_purchase_requests").select("*").order("created_at", { ascending: false });
      const ids = Array.from(new Set((data ?? []).map((r: any) => r.employer_id)));
      const { data: emps } = ids.length ? await supabase.from("employer_profiles").select("user_id, company_name, manager_name").in("user_id", ids) : { data: [] as any[] };
      const emap: Record<string, any> = {};
      (emps ?? []).forEach((e: any) => { emap[e.user_id] = e; });
      setRows((data ?? []).map((r: any) => ({
        created_at: r.created_at, company_name: emap[r.employer_id]?.company_name ?? "",
        manager_name: emap[r.employer_id]?.manager_name ?? "",
        pack: r.pack, amount_krw: r.amount_krw, status: r.status, payment_method: r.payment_method, payment_ref: r.payment_ref,
      })));
    })();
  }, []);
  const filtered = rows.filter(r => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (r.company_name ?? "").toLowerCase().includes(s) || (r.manager_name ?? "").toLowerCase().includes(s) || (r.status ?? "").toLowerCase().includes(s);
  });
  return (
    <Card className="mt-4"><CardContent className="p-4">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <h3 className="font-bold">크레딧 구매현황 ({filtered.length}/{rows.length})</h3>
        <div className="flex gap-2">
          <Input placeholder="업체명/담당자/상태 검색" value={q} onChange={e => setQ(e.target.value)} className="max-w-xs" />
          <Button size="sm" variant="outline" onClick={() => downloadXlsx(filtered, "구매현황", `크레딧구매_${new Date().toISOString().slice(0,10)}.xlsx`)}><Download size={14} className="mr-1" />엑셀</Button>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="text-left border-b"><th className="py-2">일시</th><th>업체</th><th>담당자</th><th>패키지</th><th>금액</th><th>결제수단</th><th>상태</th></tr></thead>
        <tbody>
          {filtered.map((r, i) => (
            <tr key={i} className="border-b">
              <td className="py-2 text-xs">{new Date(r.created_at).toLocaleString("ko-KR")}</td>
              <td>{r.company_name}</td>
              <td>{r.manager_name}</td>
              <td>{r.pack}</td>
              <td>{r.amount_krw?.toLocaleString()}</td>
              <td>{r.payment_method ?? "-"}</td>
              <td><Badge variant="outline">{purchaseStatusLabel(r.status)}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </CardContent></Card>
  );
}

function FaqsView() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [nq, setNq] = useState(""); const [na, setNa] = useState(""); const [ncat, setNcat] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [eq, setEq] = useState(""); const [ea, setEa] = useState(""); const [ecat, setEcat] = useState("");
  const load = async () => {
    const { data } = await supabase.from("faqs").select("*").order("sort_order").order("created_at");
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);
  const add = async () => {
    if (!nq || !na) return toast.error("질문과 답변은 필수입니다");
    const { error } = await supabase.from("faqs").insert({ question: nq, answer: na, category: ncat || null } as any);
    if (error) return toast.error(error.message);
    setNq(""); setNa(""); setNcat(""); toast.success("등록되었습니다"); load();
  };
  const startEdit = (f: any) => { setEditId(f.id); setEq(f.question ?? ""); setEa(f.answer ?? ""); setEcat(f.category ?? ""); };
  const saveEdit = async () => {
    if (!editId) return;
    if (!eq || !ea) return toast.error("질문과 답변은 필수입니다");
    const { error } = await supabase.from("faqs").update({ question: eq, answer: ea, category: ecat || null }).eq("id", editId);
    if (error) return toast.error(error.message);
    setEditId(null); toast.success("수정되었습니다"); load();
  };
  const toggle = async (f: any) => { const { error } = await supabase.from("faqs").update({ active: !f.active }).eq("id", f.id); if (error) return toast.error(error.message); load(); };
  const del = async (id: string) => {
    if (!confirm("삭제하시겠습니까?")) return;
    const { error } = await supabase.from("faqs").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };
  const filtered = rows.filter(r => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (r.question ?? "").toLowerCase().includes(s) || (r.answer ?? "").toLowerCase().includes(s) || (r.category ?? "").toLowerCase().includes(s);
  });
  return (
    <Card className="mt-4"><CardContent className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-bold">FAQ ({filtered.length}/{rows.length})</h3>
        <div className="flex gap-2">
          <Input placeholder="질문/답변/분류 검색" value={q} onChange={e => setQ(e.target.value)} className="max-w-xs" />
          <Button size="sm" variant="outline" onClick={() => downloadXlsx(filtered.map(r => ({ category: r.category, question: r.question, answer: r.answer, active: r.active ? "Y":"N", sort_order: r.sort_order })), "FAQ", `FAQ_${new Date().toISOString().slice(0,10)}.xlsx`)}><Download size={14} className="mr-1" />엑셀</Button>
        </div>
      </div>
      <div className="border rounded p-3 space-y-2 bg-muted/30">
        <div className="font-semibold text-sm">신규 FAQ 등록</div>
        <Input placeholder="질문" value={nq} onChange={e => setNq(e.target.value)} />
        <Textarea placeholder="답변" rows={3} value={na} onChange={e => setNa(e.target.value)} />
        <Input placeholder="카테고리 (선택)" value={ncat} onChange={e => setNcat(e.target.value)} />
        <Button size="sm" onClick={add}>등록</Button>
      </div>
      <div className="space-y-2">
        {filtered.map(r => (
          <div key={r.id} className="border rounded p-3">
            {editId === r.id ? (
              <div className="space-y-2">
                <Input placeholder="질문" value={eq} onChange={e => setEq(e.target.value)} />
                <Textarea placeholder="답변" rows={3} value={ea} onChange={e => setEa(e.target.value)} />
                <Input placeholder="카테고리 (선택)" value={ecat} onChange={e => setEcat(e.target.value)} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveEdit}>저장</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditId(null)}>취소</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {r.category && <Badge variant="outline">{r.category}</Badge>}
                  {!r.active && <Badge variant="secondary">비활성</Badge>}
                  <div className="ml-auto flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => startEdit(r)}>수정</Button>
                    <Button size="sm" variant="outline" onClick={() => toggle(r)}>{r.active ? "비활성" : "활성"}</Button>
                    <Button size="sm" variant="destructive" onClick={() => del(r.id)}>삭제</Button>
                  </div>
                </div>
                <div className="font-semibold text-sm">Q. {r.question}</div>
                <div className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">A. {r.answer}</div>
              </>
            )}
          </div>
        ))}
      </div>
    </CardContent></Card>
  );
}
