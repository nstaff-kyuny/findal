import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/MobileLayout";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { NATIONALITY_LABEL, VISA_LABEL } from "@/lib/constants";

export const Route = createFileRoute("/seeker/me")({ component: () => <RoleGate role="seeker"><Page /></RoleGate> });

function Page() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [seeker, setSeeker] = useState<any>(null);
  useEffect(() => { if (!user) return; (async () => {
    const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    const { data: s } = await supabase.from("seeker_profiles").select("*").eq("user_id", user.id).single();
    setProfile(p); setSeeker(s);
  })(); }, [user]);
  return (
    <MobileLayout role="seeker">
      <div className="p-4 space-y-3">
        <Card><CardContent className="p-4 space-y-1">
          <h2 className="font-bold">{profile?.full_name ?? user?.email}</h2>
          <p className="text-xs text-muted-foreground">{profile?.phone}</p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </CardContent></Card>
        {seeker && <Card><CardContent className="p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">신분</span><span>{NATIONALITY_LABEL[seeker.nationality]}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">경력</span><span>{seeker.experience === "lt5" ? "5회 미만" : "5회 이상"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">한국어</span><span>{seeker.korean_ok ? "가능" : "불가"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">비자</span><span>{VISA_LABEL[seeker.visa]}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">선호지역</span><span>{seeker.preferred_region ?? "-"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">추천인</span><span>{seeker.referrer_code ?? "-"}</span></div>
        </CardContent></Card>}
        <Button variant="outline" className="w-full" onClick={signOut}>로그아웃</Button>
      </div>
    </MobileLayout>
  );
}
