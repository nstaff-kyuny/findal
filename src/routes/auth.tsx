import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    nav({ to: "/" });
  };
  const signUp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: name, phone },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("가입 완료! 이메일을 확인해 주세요.");
    nav({ to: "/" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="bg-background rounded-2xl shadow-xl p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-2">JobMatch</h1>
        <p className="text-center text-sm text-muted-foreground mb-6">호텔·식당·요양 일용직 매칭</p>
        <Tabs defaultValue="login">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="login">로그인</TabsTrigger>
            <TabsTrigger value="signup">회원가입</TabsTrigger>
          </TabsList>
          <TabsContent value="login" className="space-y-3 mt-4">
            <div><Label>이메일</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
            <div><Label>비밀번호</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} /></div>
            <Button className="w-full" onClick={signIn} disabled={loading}>로그인</Button>
          </TabsContent>
          <TabsContent value="signup" className="space-y-3 mt-4">
            <div><Label>이름</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
            <div><Label>연락처</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-0000-0000" /></div>
            <div><Label>이메일</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
            <div><Label>비밀번호</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} /></div>
            <Button className="w-full" onClick={signUp} disabled={loading}>회원가입</Button>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
