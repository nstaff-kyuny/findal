import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { NATIONALITY_LABEL, VISA_LABEL, REGIONS } from "@/lib/constants";

export const Route = createFileRoute("/onboarding")({ component: Onboarding });

function Onboarding() {
  const { user, loading, refreshRoles } = useAuth();
  const nav = useNavigate();
  const [role, setRole] = useState<"seeker" | "employer" | null>(null);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user]);

  if (!user) return null;

  return (
    <div className="min-h-screen p-4 bg-muted/30">
      <div className="max-w-md mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-center mt-6">시작하기</h1>
        {!role && (
          <div className="grid grid-cols-1 gap-3 mt-8">
            <Card className="cursor-pointer hover:border-primary" onClick={() => setRole("seeker")}>
              <CardContent className="p-6 text-center">
                <div className="text-3xl mb-2">🧑‍🍳</div>
                <h2 className="font-bold">구직자로 시작하기</h2>
                <p className="text-xs text-muted-foreground mt-1">일자리를 찾고 싶어요 (무료)</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-primary" onClick={() => setRole("employer")}>
              <CardContent className="p-6 text-center">
                <div className="text-3xl mb-2">🏨</div>
                <h2 className="font-bold">구인자로 시작하기</h2>
                <p className="text-xs text-muted-foreground mt-1">직원을 채용하고 싶어요</p>
              </CardContent>
            </Card>
          </div>
        )}
        {role === "seeker" && <SeekerForm onDone={async () => { await refreshRoles(); nav({ to: "/seeker/home" }); }} userId={user.id} />}
        {role === "employer" && <EmployerForm onDone={async () => { await refreshRoles(); nav({ to: "/employer/home" }); }} userId={user.id} />}
      </div>
    </div>
  );
}

function SeekerForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [nationality, setNationality] = useState<string>("korean");
  const [experience, setExperience] = useState<string>("lt5");
  const [koreanOk, setKoreanOk] = useState(true);
  const [visa, setVisa] = useState<string>("other");
  const [referrer, setReferrer] = useState("");
  const [region, setRegion] = useState("서울");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const { error: e1 } = await supabase.from("user_roles").insert({ user_id: userId, role: "seeker" });
    if (e1 && !String(e1.message).includes("duplicate")) { setSaving(false); return toast.error(e1.message); }
    const { error: e2 } = await supabase.from("seeker_profiles").upsert({
      user_id: userId, nationality, experience, korean_ok: koreanOk, visa,
      referrer_code: referrer || null, preferred_region: region,
    } as any);
    setSaving(false);
    if (e2) return toast.error(e2.message);
    toast.success("구직자 프로필 저장 완료");
    onDone();
  };
  return (
    <Card><CardContent className="p-4 space-y-4">
      <h2 className="font-bold">구직자 정보</h2>
      <div><Label>신분</Label>
        <Select value={nationality} onValueChange={setNationality}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(NATIONALITY_LABEL).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label>경력</Label>
        <Select value={experience} onValueChange={setExperience}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="lt5">5회 미만</SelectItem>
            <SelectItem value="gte5">5회 이상</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between"><Label>한국어 가능</Label><Switch checked={koreanOk} onCheckedChange={setKoreanOk} /></div>
      <div><Label>비자 상태</Label>
        <Select value={visa} onValueChange={setVisa}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(VISA_LABEL).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label>선호 지역</Label>
        <Select value={region} onValueChange={setRegion}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label>추천인 코드 (선택)</Label><Input value={referrer} onChange={e => setReferrer(e.target.value)} placeholder="예: REF1234" /></div>
      <Button className="w-full" onClick={save} disabled={saving}>저장하고 시작하기</Button>
    </CardContent></Card>
  );
}

function EmployerForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [manager, setManager] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!company || !location || !manager || !phone) return toast.error("모든 항목을 입력하세요");
    setSaving(true);
    const { error: e1 } = await supabase.from("user_roles").insert({ user_id: userId, role: "employer" });
    if (e1 && !String(e1.message).includes("duplicate")) { setSaving(false); return toast.error(e1.message); }
    const { error: e2 } = await supabase.from("employer_profiles").upsert({
      user_id: userId, company_name: company, location, manager_name: manager, contact_phone: phone,
    } as any);
    setSaving(false);
    if (e2) return toast.error(e2.message);
    toast.success("구인자 프로필 저장. 가입 보너스 2 크레딧 제공!");
    onDone();
  };
  return (
    <Card><CardContent className="p-4 space-y-4">
      <h2 className="font-bold">구인자(회사) 정보</h2>
      <div><Label>회사명</Label><Input value={company} onChange={e => setCompany(e.target.value)} /></div>
      <div><Label>위치</Label><Input value={location} onChange={e => setLocation(e.target.value)} placeholder="서울시 강남구..." /></div>
      <div><Label>담당자 이름</Label><Input value={manager} onChange={e => setManager(e.target.value)} /></div>
      <div><Label>담당자 연락처</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-0000-0000" /></div>
      <Button className="w-full" onClick={save} disabled={saving}>저장하고 시작하기</Button>
    </CardContent></Card>
  );
}
