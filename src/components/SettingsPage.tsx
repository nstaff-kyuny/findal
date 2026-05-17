import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Bell, Megaphone, Gift, HelpCircle, MessageSquare, FileText, ChevronRight } from "lucide-react";
import { COMPANY_INFO } from "@/lib/company";
import { toast } from "sonner";

export function SettingsPage({ role }: { role: "seeker" | "employer" }) {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [notifyPush, setNotifyPush] = useState(true);
  const [notifyMkt, setNotifyMkt] = useState(false);
  const [version, setVersion] = useState<{ version: string; is_latest: boolean } | null>(null);
  const table = role === "seeker" ? "seeker_profiles" : "employer_profiles";

  useEffect(() => { if (!user) return; (async () => {
    const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(p);
    const { data: r } = await supabase.from(table).select("notify_push, notify_marketing").eq("user_id", user.id).single();
    if (r) { setNotifyPush(r.notify_push); setNotifyMkt(r.notify_marketing); }
    const { data: v } = await supabase.from("app_version").select("version, is_latest").eq("is_latest", true).limit(1).maybeSingle();
    if (v) setVersion(v);
  })(); }, [user, table]);

  const updateNotify = async (push: boolean, mkt: boolean) => {
    if (!user) return;
    setNotifyPush(push); setNotifyMkt(mkt);
    await supabase.from(table).update({ notify_push: push, notify_marketing: mkt } as any).eq("user_id", user.id);
  };

  const checkUpdate = async () => {
    const { data } = await supabase.from("app_version").select("version").eq("is_latest", true).limit(1).maybeSingle();
    if (data?.version) {
      setVersion({ version: data.version, is_latest: true });
      toast.success(`최신 버전입니다 (v${data.version})`);
    } else toast.info("버전 정보를 확인할 수 없습니다");
  };

  return (
    <div className="p-3 space-y-3">
      <Card><CardContent className="p-4">
        <h2 className="font-bold">{profile?.full_name ?? user?.email}</h2>
        <p className="text-xs text-muted-foreground">{profile?.phone}</p>
        <p className="text-xs text-muted-foreground">{user?.email}</p>
        <p className="text-[10px] mt-1 text-primary">{role === "seeker" ? "구직자 계정" : "구인자 계정"}</p>
      </CardContent></Card>

      <Card><CardContent className="p-0 divide-y">
        <SectionHeader>알림 설정</SectionHeader>
        <Row>
          <div className="flex items-center gap-2"><Bell size={16} /> <span>푸시 알림</span></div>
          <Switch checked={notifyPush} onCheckedChange={(v) => updateNotify(v, notifyMkt)} />
        </Row>
        <Row>
          <div className="flex items-center gap-2"><Megaphone size={16} /> <span>마케팅/이벤트 알림</span></div>
          <Switch checked={notifyMkt} onCheckedChange={(v) => updateNotify(notifyPush, v)} />
        </Row>
      </CardContent></Card>

      <Card><CardContent className="p-0 divide-y">
        <SectionHeader>고객센터</SectionHeader>
        <LinkRow to="/notices" icon={<Megaphone size={16} />} label="공지사항" />
        <LinkRow to="/events" icon={<Gift size={16} />} label="이벤트" />
        <LinkRow to="/faq" icon={<HelpCircle size={16} />} label="자주 묻는 질문" />
        <LinkRow to="/inquiry" icon={<MessageSquare size={16} />} label="1:1 문의하기" />
      </CardContent></Card>

      <Card><CardContent className="p-0 divide-y">
        <SectionHeader>서비스</SectionHeader>
        <LinkRow to="/terms" icon={<FileText size={16} />} label="약관 및 정책" />
        <Row>
          <span>앱 버전</span>
          <div className="flex items-center gap-2">
            <span className="text-primary text-sm">{version?.version ?? "1.0.0"}</span>
            <Button size="sm" variant="outline" onClick={checkUpdate}>업데이트 확인</Button>
          </div>
        </Row>
      </CardContent></Card>

      <Button variant="outline" className="w-full" onClick={signOut}>로그아웃</Button>

      <Card className="bg-muted/40"><CardContent className="p-4 text-[11px] text-muted-foreground space-y-0.5">
        <p className="font-semibold text-foreground mb-1">사업자 정보</p>
        <p>회사명: {COMPANY_INFO.name}</p>
        <p>대표자: {COMPANY_INFO.ceo}</p>
        <p>사업자등록번호: {COMPANY_INFO.bizNo}</p>
        <p>통신판매업등록번호: {COMPANY_INFO.mailOrderNo}</p>
      </CardContent></Card>
    </div>
  );
}

function SectionHeader({ children }: { children: any }) {
  return <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/30">{children}</div>;
}
function Row({ children }: { children: any }) {
  return <div className="flex justify-between items-center px-4 py-3 text-sm">{children}</div>;
}
function LinkRow({ to, icon, label }: { to: string; icon: any; label: string }) {
  return (
    <Link to={to} className="flex justify-between items-center px-4 py-3 text-sm hover:bg-muted/30">
      <div className="flex items-center gap-2">{icon} <span>{label}</span></div>
      <ChevronRight size={16} className="text-muted-foreground" />
    </Link>
  );
}
