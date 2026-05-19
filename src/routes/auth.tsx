import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({ component: AuthPage });

const ADMIN_ALIAS = "nstaff";
const ADMIN_EMAIL = "nstaff@findar.app";
const ADMIN_PW_ALIAS = "0407";
const ADMIN_PW_REAL = "040700";

function normalizeLogin(id: string, pw: string) {
  if (id.trim().toLowerCase() === ADMIN_ALIAS) {
    return { email: ADMIN_EMAIL, password: pw === ADMIN_PW_ALIAS ? ADMIN_PW_REAL : pw };
  }
  return { email: id.trim(), password: pw };
}

function AuthPage() {
  const nav = useNavigate();
  const [loginId, setLoginId] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"seeker" | "employer">("seeker");
  const [referrer, setReferrer] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSentDialog, setEmailSentDialog] = useState(false);
  const [sentToEmail, setSentToEmail] = useState("");

  const signIn = async () => {
    if (!loginId || !loginPw) return toast.error("이메일/비밀번호를 입력하세요");
    setLoading(true);
    const { email: e, password: p } = normalizeLogin(loginId, loginPw);
    const { error } = await supabase.auth.signInWithPassword({ email: e, password: p });
    setLoading(false);
    if (error) {
      const msg = error.message?.toLowerCase() ?? "";
      if (msg.includes("invalid") || msg.includes("credentials") || msg.includes("password")) {
        toast.error("비밀번호가 올바르지 않습니다. 비밀번호를 잊으셨다면 아래 '비밀번호 찾기'를 눌러주세요.");
      } else {
        toast.error(error.message);
      }
      return;
    }
    nav({ to: "/" });
  };

  const forgotPassword = async () => {
    const target = loginId.trim() || prompt("가입한 이메일을 입력하세요:")?.trim();
    if (!target) return;
    if (!/^\S+@\S+\.\S+$/.test(target)) return toast.error("이메일 형식이 아닙니다");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(target, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("비밀번호 재설정 링크를 이메일로 보냈습니다");
  };

  const signUp = async () => {
    if (password.length < 6) return toast.error("비밀번호는 6자 이상이어야 합니다");
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password))
      return toast.error("비밀번호는 영문, 숫자, 특수기호를 모두 포함해야 합니다");
    if (password !== passwordConfirm) return toast.error("비밀번호 확인이 일치하지 않습니다");
    if (!email || !name || !phone) return toast.error("모든 항목을 입력하세요");
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: name, phone, intended_role: role, referrer_code: referrer || null },
      },
    });
    if (error) { setLoading(false); return toast.error(error.message); }
    // 즉시 user_roles 등록 시도 (session이 바로 생기는 경우)
    if (data.session && data.user) {
      await supabase.from("user_roles").insert({ user_id: data.user.id, role } as any);
    }
    setLoading(false);
    setSentToEmail(email);
    setEmailSentDialog(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/10 to-background p-4">
      <div className="bg-background rounded-2xl shadow-xl p-6 w-full max-w-md border">
        <div className="text-center mb-6">
          <img
            src="https://adrnhxpzkqyqzfcihokt.supabase.co/storage/v1/object/public/app-icons/icon-192.png"
            alt="Find AR"
            className="inline-block w-14 h-14 rounded-2xl mb-3 object-contain bg-primary"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <h1 className="text-2xl font-bold text-primary">Find AR <span className="text-foreground">(파인달)</span></h1>
          <p className="text-sm text-muted-foreground mt-1">일용직 일자리 찾기</p>
          <p className="text-xs text-muted-foreground">호텔·식당·요양 일용직 매칭</p>
        </div>
        <Tabs defaultValue="login">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="login">로그인</TabsTrigger>
            <TabsTrigger value="signup">회원가입</TabsTrigger>
          </TabsList>
          <TabsContent value="login" className="space-y-3 mt-4">
            <div><Label>이메일 (E-mail)</Label><Input className="h-12" value={loginId} onChange={e => setLoginId(e.target.value)} placeholder="example@email.com" /></div>
            <div><Label>비밀번호 (Password)</Label><Input className="h-12" type="password" value={loginPw} onChange={e => setLoginPw(e.target.value)} /></div>
            <Button className="w-full h-12 text-base" onClick={signIn} disabled={loading}>로그인 (Sign in)</Button>
            <button type="button" onClick={forgotPassword} className="w-full text-xs text-primary hover:underline mt-1">
              비밀번호를 잊으셨나요? 비밀번호 재설정
            </button>
          </TabsContent>
          <TabsContent value="signup" className="space-y-3 mt-4">
            <div>
              <Label>가입 유형 (Account Type)</Label>
              <RadioGroup value={role} onValueChange={(v) => setRole(v as any)} className="grid grid-cols-2 gap-2 mt-1">
                <Label className={`border rounded-md p-3 text-center cursor-pointer ${role === "seeker" ? "border-primary bg-primary/5" : ""}`}>
                  <RadioGroupItem value="seeker" className="sr-only" />
                  <div className="text-xl">🧑‍🍳</div>
                  <span className="text-sm font-semibold">구직자 (Job Seeker)</span>
                </Label>
                <Label className={`border rounded-md p-3 text-center cursor-pointer ${role === "employer" ? "border-primary bg-primary/5" : ""}`}>
                  <RadioGroupItem value="employer" className="sr-only" />
                  <div className="text-xl">🏨</div>
                  <span className="text-sm font-semibold">구인자 (Employer)</span>
                </Label>
              </RadioGroup>
            </div>
            <div><Label>이름 (Full Name)</Label><Input className="h-12" value={name} onChange={e => setName(e.target.value)} /></div>
            <div><Label>연락처 (Mobile)</Label><Input className="h-12" value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-0000-0000" /></div>
            <div><Label>이메일 (E-mail)</Label><Input className="h-12" type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
            <div>
              <Label>비밀번호 (Password)</Label>
              <Input
                className="h-12"
                type="password"
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="영문+숫자+특수기호 6자 이상"
              />
            </div>
            <div>
              <Label>비밀번호 확인 (Confirm Password)</Label>
              <Input
                className="h-12"
                type="password"
                minLength={6}
                value={passwordConfirm}
                onChange={e => setPasswordConfirm(e.target.value)}
                placeholder="비밀번호를 한 번 더 입력하세요"
              />
              {passwordConfirm.length > 0 && password !== passwordConfirm && (
                <p className="text-xs text-destructive mt-1">비밀번호가 일치하지 않습니다</p>
              )}
            </div>
            <div>
              <Label>추천인 코드 (Referrer Code) - 선택</Label>
              <Input className="h-12" value={referrer} onChange={e => setReferrer(e.target.value)} placeholder="예: REF1234" />
            </div>
            <Button className="w-full h-12 text-base" onClick={signUp} disabled={loading}>회원가입 (Sign up)</Button>
          </TabsContent>
        </Tabs>
      </div>
      <AlertDialog open={emailSentDialog} onOpenChange={setEmailSentDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>가입 확인 메일을 발송했습니다 ✉️</AlertDialogTitle>
            <AlertDialogDescription>
              <b>{sentToEmail}</b> 주소로 가입 확인 메일을 보냈습니다.
              <br />받은 메일함에서 메일을 확인하시고, 메일 안의 링크를 클릭하면 가입이 완료됩니다.
              <br /><br />메일이 보이지 않는다면 스팸 메일함도 확인해 주세요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => { setEmailSentDialog(false); nav({ to: "/" }); }}>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
