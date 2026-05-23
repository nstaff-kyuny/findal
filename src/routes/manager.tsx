import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { LogOut, Smartphone, Monitor, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/manager")({
  component: ManagerPage,
});

const TABS: { value: string; label: string; src: string }[] = [
  { value: "new", label: "공고 등록", src: "/employer/jobs/new" },
  { value: "jobs", label: "공고 관리", src: "/employer/jobs" },
  { value: "apps", label: "신청/승인", src: "/employer/applications" },
  { value: "credits", label: "크레딧", src: "/employer/credits" },
  { value: "history", label: "히스토리", src: "/employer/history" },
  { value: "profile", label: "프로필/설정", src: "/employer/me" },
];

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
  const [tab, setTab] = useState("new");
  const [phoneKey, setPhoneKey] = useState(0);
  const [paneKey, setPaneKey] = useState(0);

  // Reload phone preview when tab changes so the preview reflects fresh data
  useEffect(() => {
    setPhoneKey((k) => k + 1);
  }, [tab]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">불러오는 중…</div>;
  }

  if (!user || !roles.includes("employer")) {
    if (user && !roles.includes("employer")) {
      // signed in but wrong role
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
          <p className="text-sm text-muted-foreground">구인자 계정만 접속할 수 있습니다.</p>
          <Button variant="outline" onClick={signOut}><LogOut size={14} className="mr-1" />로그아웃</Button>
        </div>
      );
    }
    return <LoginForm />;
  }

  const current = TABS.find((t) => t.value === tab) ?? TABS[0];

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

      <div className="flex-1 flex min-h-0">
        {/* Left 2/3 - Management */}
        <div className="flex-[2] min-w-0 border-r bg-background flex flex-col">
          <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
            <div className="px-4 pt-3 border-b flex items-center justify-between gap-2">
              <TabsList className="flex-wrap h-auto">
                {TABS.map((t) => (
                  <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
                ))}
              </TabsList>
              <Button size="sm" variant="ghost" onClick={() => setPaneKey((k) => k + 1)} title="새로고침">
                <RefreshCw size={14} />
              </Button>
            </div>
            {TABS.map((t) => (
              <TabsContent key={t.value} value={t.value} className="flex-1 m-0 min-h-0">
                {tab === t.value && (
                  <iframe
                    key={`${t.value}-${paneKey}`}
                    src={t.src}
                    title={t.label}
                    className="w-full h-full border-0 bg-muted/20"
                  />
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* Right 1/3 - Mobile app preview */}
        <div className="flex-[1] min-w-[360px] bg-muted/30 flex flex-col">
          <div className="px-4 py-2 border-b bg-background flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Smartphone size={16} />앱 미리보기
            </div>
            <Button size="sm" variant="ghost" onClick={() => setPhoneKey((k) => k + 1)} title="새로고침">
              <RefreshCw size={14} />
            </Button>
          </div>
          <div className="flex-1 overflow-auto flex items-start justify-center p-4">
            <div className="w-full max-w-[420px] h-[800px] bg-background rounded-2xl shadow-xl border overflow-hidden">
              <iframe
                key={phoneKey}
                src={current.src}
                title="앱 미리보기"
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
