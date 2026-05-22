import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({ component: ResetPasswordPage });

function ResetPasswordPage() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase places the recovery session in the URL hash on arrival.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async () => {
    if (pw.length < 6) return toast.error("비밀번호는 최소 6자리여야 합니다");
    if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw) || !/[^A-Za-z0-9]/.test(pw))
      return toast.error("비밀번호는 영문, 숫자, 특수기호를 모두 포함해야 합니다");
    if (pw !== pw2) return toast.error("두 비밀번호가 일치하지 않습니다");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("비밀번호가 변경되었습니다. 다시 로그인해 주세요.");
    await supabase.auth.signOut();
    nav({ to: "/auth" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/10 to-background p-4">
      <div className="bg-background rounded-2xl shadow-xl p-6 w-full max-w-md border space-y-4">
        <h1 className="text-xl font-bold text-center">비밀번호 재설정</h1>
        {!ready ? (
          <p className="text-sm text-muted-foreground text-center">
            이메일로 받은 링크를 통해 이 페이지에 접속해 주세요. 링크가 만료되었다면 로그인 화면에서 "비밀번호 찾기"를 다시 눌러주세요.
          </p>
        ) : (
          <>
            <div className="p-3 rounded-md bg-primary/5 border border-primary/20 text-xs text-foreground">
              <p className="font-semibold mb-1">비밀번호 설정 규칙</p>
              <p className="text-muted-foreground">영문 + 숫자 + 특수기호를 모두 포함하여 <b>6자 이상</b>으로 입력해 주세요.</p>
            </div>
            <div><Label>새 비밀번호</Label><Input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="영문+숫자+특수기호 6자 이상" /></div>
            <div><Label>비밀번호 확인</Label><Input type="password" value={pw2} onChange={e => setPw2(e.target.value)} /></div>
            <Button className="w-full" onClick={submit} disabled={loading}>변경하기</Button>
          </>
        )}
        <button type="button" onClick={() => nav({ to: "/auth" })} className="w-full text-xs text-muted-foreground hover:underline">
          로그인 화면으로
        </button>
      </div>
    </div>
  );
}
