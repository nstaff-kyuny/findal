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
  const { user, loading, roles, refreshRoles } = useAuth();
  const nav = useNavigate();
  const [resolvedRole, setResolvedRole] = useState<"seeker" | "employer" | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { nav({ to: "/auth" }); return; }
    const intended = (user.user_metadata as any)?.intended_role as "seeker" | "employer" | undefined;
    void (async () => {
      // 이미 프로필이 있으면 온보딩 건너뛰기
      if (roles.includes("employer")) {
        const { data: ep } = await supabase.from("employer_profiles").select("user_id").eq("user_id", user.id).maybeSingle();
        if (ep) { nav({ to: "/employer/home" }); return; }
      }
      if (roles.includes("seeker")) {
        const { data: sp } = await supabase.from("seeker_profiles").select("user_id").eq("user_id", user.id).maybeSingle();
        if (sp) { nav({ to: "/seeker/home" }); return; }
      }
      if (intended) {
        if (!roles.includes(intended)) {
          await supabase.from("user_roles").insert({ user_id: user.id, role: intended } as any);
          await refreshRoles();
        }
        setResolvedRole(intended);
        return;
      }
      if (roles.includes("seeker")) setResolvedRole("seeker");
      else if (roles.includes("employer")) setResolvedRole("employer");
    })();
  }, [loading, user, roles]);

  if (!user) return null;

  return (
    <div className="min-h-screen p-4 bg-muted/30">
      <div className="max-w-md mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-center mt-6">프로필 설정</h1>
        {!resolvedRole && (
          <div className="grid grid-cols-1 gap-3 mt-8">
            <Card className="cursor-pointer hover:border-primary" onClick={() => setResolvedRole("seeker")}>
              <CardContent className="p-6 text-center">
                <div className="text-3xl mb-2">🧑‍🍳</div>
                <h2 className="font-bold">구직자로 시작하기</h2>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-primary" onClick={() => setResolvedRole("employer")}>
              <CardContent className="p-6 text-center">
                <div className="text-3xl mb-2">🏨</div>
                <h2 className="font-bold">구인자로 시작하기</h2>
              </CardContent>
            </Card>
          </div>
        )}
        {resolvedRole === "seeker" && <SeekerForm onDone={async () => { await refreshRoles(); nav({ to: "/seeker/home" }); }} userId={user.id} />}
        {resolvedRole === "employer" && <EmployerForm onDone={async () => { await refreshRoles(); nav({ to: "/employer/home" }); }} userId={user.id} />}
      </div>
    </div>
  );
}

function SeekerForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [nationality, setNationality] = useState<string>("foreigner");
  const [experience, setExperience] = useState<string>("lt5");
  const [koreanOk, setKoreanOk] = useState(true);
  const [visa, setVisa] = useState<string>("");
  const [referrer, setReferrer] = useState("");
  const [region, setRegion] = useState("서울");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const code = (data.user?.user_metadata as any)?.referrer_code;
      if (code) setReferrer(String(code));
    })();
  }, []);
  const requireVisa = nationality === "foreigner";
  const canSave = !!nationality && !!experience && !!region && (!requireVisa || !!visa);
  const save = async () => {
    if (!canSave) return toast.error("추천인 코드를 제외한 모든 항목을 선택/입력해 주세요");
    setSaving(true);
    await supabase.from("user_roles").insert({ user_id: userId, role: "seeker" } as any);
    const { error: e2 } = await supabase.from("seeker_profiles").upsert({
      user_id: userId, nationality, experience, korean_ok: koreanOk,
      visa: nationality === "korean" ? null : visa,
      referrer_code: referrer || null, preferred_region: region,
    } as any, { onConflict: "user_id" });
    setSaving(false);
    if (e2) return toast.error(e2.message);
    toast.success("저장 완료");
    onDone();
  };
  return (
    <Card><CardContent className="p-4 space-y-4">
      <h2 className="font-bold text-lg">구직자 정보</h2>
      <p className="text-xs text-muted-foreground bg-muted/40 p-2 rounded">추천인 코드를 제외한 모든 항목은 필수입니다. 모두 입력해야 "저장하고 시작하기"가 활성화됩니다.</p>
      <div><Label className="text-base">신분</Label>
        <Select value={nationality} onValueChange={(v) => { setNationality(v); if (v === "korean") setVisa(""); }}>
          <SelectTrigger className="h-12 text-base mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(NATIONALITY_LABEL).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {nationality === "foreigner" && (
        <div>
          <Label className="text-base">비자 상태</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {Object.entries(VISA_LABEL).map(([k, v]) => (
              <Button
                key={k}
                type="button"
                variant={visa === k ? "default" : "outline"}
                className="h-12 text-sm justify-center"
                onClick={() => setVisa(k)}
              >
                {v}
              </Button>
            ))}
          </div>
        </div>
      )}
      <div><Label className="text-base">경력</Label>
        <Select value={experience} onValueChange={setExperience}>
          <SelectTrigger className="h-12 text-base mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="lt5">5회 미만</SelectItem>
            <SelectItem value="gte5">5회 이상</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between"><Label className="text-base">한국어 가능</Label><Switch checked={koreanOk} onCheckedChange={setKoreanOk} /></div>
      <div><Label className="text-base">선호 지역</Label>
        <Select value={region} onValueChange={setRegion}>
          <SelectTrigger className="h-12 text-base mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>{REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label className="text-base">추천인 코드 (선택)</Label><Input className="h-12 text-base mt-1" value={referrer} onChange={e => setReferrer(e.target.value)} placeholder="예: REF1234" /></div>
      <Button className="w-full h-12 text-base" onClick={save} disabled={saving || !canSave}>저장하고 시작하기</Button>
    </CardContent></Card>
  );
}

function EmployerForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [company, setCompany] = useState("");
  const [region, setRegion] = useState("서울");
  const [district, setDistrict] = useState("");
  const [manager, setManager] = useState("");
  const [phone, setPhone] = useState("");
  const [referrer, setReferrer] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const code = (data.user?.user_metadata as any)?.referrer_code;
      if (code) setReferrer(String(code));
    })();
  }, []);
  const save = async () => {
    if (!company || !region || !district || !manager || !phone) return toast.error("모든 항목을 입력하세요");
    setSaving(true);
    await supabase.from("user_roles").insert({ user_id: userId, role: "employer" } as any);
    const { error: e2 } = await supabase.from("employer_profiles").upsert({
      user_id: userId, company_name: company, location: `${region} ${district}`.trim(),
      manager_name: manager, contact_phone: phone, referrer_code: referrer || null,
    } as any, { onConflict: "user_id" });
    setSaving(false);
    if (e2) return toast.error(e2.message);
    toast.success("저장 완료. 가입 보너스 2 크레딧 제공!");
    onDone();
  };
  return (
    <Card><CardContent className="p-4 space-y-4">
      <h2 className="font-bold">구인자(회사) 정보</h2>
      <div><Label>회사명</Label><Input value={company} onChange={e => setCompany(e.target.value)} /></div>
      <div><Label>지역 (시/도)</Label>
        <Select value={region} onValueChange={setRegion}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label>상세 위치 (구/동)</Label><Input value={district} onChange={e => setDistrict(e.target.value)} placeholder="예: 강남구 역삼동" /></div>
      <div><Label>담당자 이름</Label><Input value={manager} onChange={e => setManager(e.target.value)} /></div>
      <div><Label>담당자 연락처</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-0000-0000" /></div>
      <div><Label>추천인 코드 (선택)</Label><Input value={referrer} onChange={e => setReferrer(e.target.value)} placeholder="예: REF1234" /></div>
      <Button className="w-full" onClick={save} disabled={saving}>저장하고 시작하기</Button>
    </CardContent></Card>
  );
}
