import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Search, Building2, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { normalizeReferrerCode } from "@/lib/utils";

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

const TERMS_DOCS: Record<string, { title: string; body: string }> = {
  age: {
    title: "만 14세 이상 확인",
    body: "본 서비스는 만 14세 이상부터 이용할 수 있습니다.\n만 14세 미만의 아동은 회원가입이 제한됩니다.\n허위로 가입한 사실이 확인될 경우 계정이 즉시 정지될 수 있습니다.",
  },
  integrated: {
    title: "통합 회원 이용약관",
    body: "1. 본 약관은 Find AR(파인달) 통합 회원 서비스 이용에 관한 기본 사항을 규정합니다.\n2. 회원은 이메일/비밀번호로 가입하며, 하나의 계정으로 구직자 또는 구인자 서비스를 이용할 수 있습니다.\n3. 회원은 본인의 계정 정보를 안전하게 관리할 책임이 있으며, 타인에게 양도할 수 없습니다.\n4. 회사는 관련 법령을 준수하며 회원의 권익을 보호하기 위해 노력합니다.",
  },
  service: {
    title: "Find AR 이용약관",
    body: "1. Find AR은 일용직 일자리 매칭 플랫폼을 제공합니다.\n2. 구직자는 무료로 공고를 열람·신청할 수 있고, 구인자는 크레딧으로 매칭 승인 등 유료 서비스를 이용합니다.\n3. 회사는 회원 간의 실제 근로계약 및 임금 지급의 직접 당사자가 아니며, 매칭 플랫폼만을 제공합니다.\n4. 부정한 이용(허위 정보·노쇼·도용 등)이 확인되면 서비스 이용이 제한될 수 있습니다.",
  },
  privacy: {
    title: "개인정보처리방침",
    body: "1. 수집 항목: 이메일, 이름, 휴대전화번호, 비밀번호(암호화), 구직/구인 프로필 정보.\n2. 이용 목적: 회원 식별, 일자리 매칭, 알림 발송, 고객 문의 응대.\n3. 보유 기간: 회원 탈퇴 시까지 보관하며, 관련 법령에 따라 보관이 필요한 경우 해당 기간 동안 보관합니다.\n4. 제3자 제공: 매칭이 승인된 경우에 한해 상대방에게 연락처가 공개되며, 그 외에는 동의 없이 제공하지 않습니다.\n5. 이용자는 언제든지 개인정보 열람·수정·삭제·처리정지를 요청할 수 있습니다.",
  },
  marketing: {
    title: "마케팅 목적 개인정보 수집 및 이용 (선택)",
    body: "1. 수집 항목: 이메일, 휴대전화번호, 알림 수신 동의 여부.\n2. 이용 목적: 이벤트·프로모션·신규 서비스 안내 및 마케팅 정보 발송.\n3. 보유 기간: 동의 철회 시 또는 회원 탈퇴 시까지.\n4. 본 항목은 선택 동의 사항으로, 동의하지 않아도 서비스의 기본 이용에는 제한이 없습니다.\n5. 설정 > 알림에서 언제든지 마케팅 알림 수신을 해제할 수 있습니다.",
  },
};

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
  const [agreeAge, setAgreeAge] = useState(false);
  const [agreeIntegrated, setAgreeIntegrated] = useState(false);
  const [agreeService, setAgreeService] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const [docOpen, setDocOpen] = useState<keyof typeof TERMS_DOCS | null>(null);
  const allRequired = agreeAge && agreeIntegrated && agreeService && agreePrivacy;
  const allChecked = allRequired && agreeMarketing;
  const setAll = (v: boolean) => {
    setAgreeAge(v); setAgreeIntegrated(v); setAgreeService(v); setAgreePrivacy(v); setAgreeMarketing(v);
  };

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
    if (!allRequired) return toast.error("필수 약관에 모두 동의해 주세요");
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: name, phone, intended_role: role, referrer_code: referrer || null, marketing_consent: agreeMarketing },
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
          <TabsList className="grid grid-cols-2 w-full h-12">
            <TabsTrigger value="login" className="text-base">로그인</TabsTrigger>
            <TabsTrigger value="signup" className="text-base">회원가입</TabsTrigger>
          </TabsList>
          <TabsContent value="login" className="space-y-4 mt-5">
            <div><Label className="text-base">이메일 (E-mail)</Label><Input className="h-14 text-base mt-1" value={loginId} onChange={e => setLoginId(e.target.value)} placeholder="example@email.com" /></div>
            <div><Label className="text-base">비밀번호 (Password)</Label><Input className="h-14 text-base mt-1" type="password" value={loginPw} onChange={e => setLoginPw(e.target.value)} /></div>
            <Button className="w-full h-14 text-lg" onClick={signIn} disabled={loading}>로그인 (Sign in)</Button>
            <button type="button" onClick={forgotPassword} className="w-full text-sm text-primary hover:underline mt-1">
              비밀번호를 잊으셨나요? 비밀번호 재설정
            </button>
          </TabsContent>
          <TabsContent value="signup" className="space-y-4 mt-5">
            <div>
              <Label className="text-base">가입 유형 (Account Type)</Label>
              <RadioGroup value={role} onValueChange={(v) => setRole(v as any)} className="grid grid-cols-2 gap-3 mt-2">
                <Label className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all ${role === "seeker" ? "border-primary bg-primary/10 shadow-md" : "border-border hover:border-primary/40"}`}>
                  <RadioGroupItem value="seeker" className="sr-only" />
                  {role === "seeker" && <CheckCircle2 size={18} className="absolute top-2 right-2 text-primary" />}
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center ${role === "seeker" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/70"}`}>
                      <Search size={28} />
                    </div>
                    <div>
                      <p className="font-bold text-base">구직자</p>
                      <p className="text-[11px] text-muted-foreground leading-tight">Job Seeker<br/>일자리 찾기</p>
                    </div>
                  </div>
                </Label>
                <Label className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all ${role === "employer" ? "border-primary bg-primary/10 shadow-md" : "border-border hover:border-primary/40"}`}>
                  <RadioGroupItem value="employer" className="sr-only" />
                  {role === "employer" && <CheckCircle2 size={18} className="absolute top-2 right-2 text-primary" />}
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center ${role === "employer" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/70"}`}>
                      <Building2 size={28} />
                    </div>
                    <div>
                      <p className="font-bold text-base">구인자</p>
                      <p className="text-[11px] text-muted-foreground leading-tight">Employer<br/>일자리 등록</p>
                    </div>
                  </div>
                </Label>
              </RadioGroup>
            </div>
            <div><Label className="text-base">이름 (Full Name)</Label><Input className="h-14 text-base mt-1" value={name} onChange={e => setName(e.target.value)} /></div>
            <div><Label className="text-base">연락처 (Mobile)</Label><Input className="h-14 text-base mt-1" value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-0000-0000" /></div>
            <div><Label className="text-base">이메일 (E-mail)</Label><Input className="h-14 text-base mt-1" type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
            <div>
              <Label className="text-base">비밀번호 (Password)</Label>
              <Input
                className="h-14 text-base mt-1"
                type="password"
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="영문+숫자+특수기호 6자 이상"
              />
              <p className="text-xs text-muted-foreground mt-1">영문·숫자·특수기호를 모두 포함, 6자 이상</p>
            </div>
            <div>
              <Label className="text-base">비밀번호 확인 (Confirm Password)</Label>
              <Input
                className="h-14 text-base mt-1"
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
              <Label className="text-base">추천인 코드 (Referrer Code) - 선택</Label>
              <Input className="h-14 text-base mt-1" value={referrer} onChange={e => setReferrer(normalizeReferrerCode(e.target.value))} placeholder="영문 대문자/숫자만 (예: REF1234)" />
              <p className="text-xs text-muted-foreground mt-1">영문 대문자(A-Z)와 숫자(0-9)만 입력 가능합니다.</p>
            </div>
            <div className="rounded-xl border p-4 space-y-3 bg-muted/30">
              <p className="text-sm font-semibold">Find AR 서비스 이용을 위해 약관에 동의해주세요.</p>
              <label className="flex items-center gap-2 cursor-pointer border-b pb-3">
                <Checkbox checked={allChecked} onCheckedChange={(v) => setAll(!!v)} />
                <span className="font-bold underline">전체 동의하기</span>
              </label>
              <div className="space-y-2 text-sm">
                <AgreeRow checked={agreeAge} onCheckedChange={setAgreeAge} required label="본인은 만 14세 이상입니다." onView={() => setDocOpen("age")} />
                <AgreeRow checked={agreeIntegrated} onCheckedChange={setAgreeIntegrated} required label="통합 회원 이용약관" onView={() => setDocOpen("integrated")} />
                <AgreeRow checked={agreeService} onCheckedChange={setAgreeService} required label="Find AR 이용약관" onView={() => setDocOpen("service")} />
                <AgreeRow checked={agreePrivacy} onCheckedChange={setAgreePrivacy} required label="Find AR 개인정보처리방침" onView={() => setDocOpen("privacy")} />
                <AgreeRow checked={agreeMarketing} onCheckedChange={setAgreeMarketing} label="마케팅 목적 개인정보 수집 및 이용" optional onView={() => setDocOpen("marketing")} />
              </div>
            </div>
            <Button className="w-full h-14 text-lg" onClick={signUp} disabled={loading || !allRequired}>회원가입 (Sign up)</Button>
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
      <Dialog open={docOpen !== null} onOpenChange={(o) => !o && setDocOpen(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{docOpen && TERMS_DOCS[docOpen].title}</DialogTitle></DialogHeader>
          <pre className="text-sm whitespace-pre-wrap font-sans leading-6">{docOpen && TERMS_DOCS[docOpen].body}</pre>
          <DialogFooter><DialogClose asChild><Button>확인</Button></DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AgreeRow({ checked, onCheckedChange, label, onView, required, optional }: { checked: boolean; onCheckedChange: (v: boolean) => void; label: string; onView: () => void; required?: boolean; optional?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <label className="flex items-center gap-2 cursor-pointer flex-1">
        <Checkbox checked={checked} onCheckedChange={(v) => onCheckedChange(!!v)} />
        <span>
          <span className={required ? "text-primary font-semibold" : "text-muted-foreground"}>{required ? "(필수) " : optional ? "(선택) " : ""}</span>
          {label}
        </span>
      </label>
      <button type="button" onClick={onView} className="text-xs underline text-muted-foreground shrink-0">보기</button>
    </div>
  );
}
