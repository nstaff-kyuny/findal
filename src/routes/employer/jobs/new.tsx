import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/MobileLayout";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth";
import { INDUSTRY_LABEL, ROLE_LABEL, ROLES_BY_INDUSTRY, REGIONS } from "@/lib/constants";
import { toast } from "sonner";
import { ImagePlus, CalendarDays, Sparkles } from "lucide-react";
import { generateJobDraft, generateJobImage, moderateText } from "@/lib/ai.functions";

const MAX_WORK_DATES = 5;

export const Route = createFileRoute("/employer/jobs/new")({ component: () => <RoleGate role="employer"><Page /></RoleGate> });




function Page() {
  const { user } = useAuth();
  const nav = useNavigate();
  const makeDraft = useServerFn(generateJobDraft);
  const makeImage = useServerFn(generateJobImage);
  const moderate = useServerFn(moderateText);
  const [emp, setEmp] = useState<any>(null);
  const [industry, setIndustry] = useState("hotel");
  const [jobRole, setJobRole] = useState("room_cleaning");
  const [title, setTitle] = useState("");
  const [placeName, setPlaceName] = useState("");
  const [location, setLocation] = useState("");
  const [region, setRegion] = useState("서울");
  const [district, setDistrict] = useState("");
  const [wage, setWage] = useState<string>("");
  const [payMonth, setPayMonth] = useState<"당월" | "익월">("당월");
  const [payDayNum, setPayDayNum] = useState<string>("10");
  const [prep, setPrep] = useState("");
  const [rooms, setRooms] = useState<string>("");
  const [headcount, setHeadcount] = useState<string>("");
  const [useDefaultContact, setUseDefaultContact] = useState(true);
  const [contact, setContact] = useState("");
  const [dates, setDates] = useState<string[]>([]);
  const [dateInput, setDateInput] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!user) return; (async () => {
    const { data } = await supabase.from("employer_profiles").select("*").eq("user_id", user.id).single();
    setEmp(data);
    setContact(data?.contact_phone ?? "");
  })(); }, [user]);

  useEffect(() => {
    const roles = ROLES_BY_INDUSTRY[industry];
    if (!roles.includes(jobRole)) setJobRole(roles[0]);
  }, [industry]);

  const uploadPhoto = async (file: File) => {
    if (!user) return;
    setPhotoUploading(true);
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("job-photos").upload(path, file);
    if (error) { setPhotoUploading(false); return toast.error(error.message); }
    const { data } = supabase.storage.from("job-photos").getPublicUrl(path);
    setPhotoUrl(data.publicUrl);
    setPhotoUploading(false);
  };

  const addDate = () => {
    if (!dateInput) return;
    if (dates.includes(dateInput)) { setDateInput(""); return; }
    if (dates.length >= MAX_WORK_DATES) return toast.error(`근무일은 최대 ${MAX_WORK_DATES}일까지 선택할 수 있습니다`);
    setDates([...dates, dateInput].sort());
    setDateInput("");
  };


  const isRoomCleaningHotel = ["hotel","motel","resort"].includes(industry) && jobRole === "room_cleaning";

  const runAiDraft = async (tone: "default" | "friendly" | "foreigner" = "default") => {
    setAiBusy(true);
    try {
      const draft = await makeDraft({ data: { industry: INDUSTRY_LABEL[industry], jobRole: ROLE_LABEL[jobRole], placeName, region: district ? `${region} ${district}` : region, wage, rooms, tone } });
      setTitle(draft.title || title);
      setPrep(draft.preparations || prep);
      toast.success("AI 공고 초안이 적용되었습니다");
    } catch (e: any) { toast.error(e?.message ?? "AI 생성 실패"); }
    finally { setAiBusy(false); }
  };

  const runAiImage = async () => {
    setPhotoUploading(true);
    try {
      const { imageUrl } = await makeImage({ data: { industry: INDUSTRY_LABEL[industry], jobRole: ROLE_LABEL[jobRole], placeName } });
      setPhotoUrl(imageUrl);
      toast.success("AI 대표 사진이 생성되었습니다");
    } catch (e: any) { toast.error(e?.message ?? "이미지 생성 실패"); }
    finally { setPhotoUploading(false); }
  };

  const save = async () => {
    if (!user) return;
    if (!title || !placeName || !location) return toast.error("필수 항목을 입력하세요");
    const wageNum = Number(wage);
    if (!wageNum || wageNum <= 0) return toast.error("일당을 입력하세요");
    const headcountNum = Number(headcount);
    if (!headcountNum || headcountNum < 1) return toast.error("필요 인원수를 입력하세요");
    if (isRoomCleaningHotel && !rooms) return toast.error("객실청소 공고는 일일 객실수가 필수입니다");
    setSaving(true);
    try {
      // 제목/장소명만 엄격 검수 (준비물은 욕설만 차단)
      const combined = `${title}\n${placeName}`.trim();
      const mod = await moderate({ data: { text: combined, context: "job" } });
      if (!mod.allow) {
        toast.error(`부적절한 표현이 감지되어 공고를 등록할 수 없습니다: ${mod.reason}`);
        return;
      }
      if (mod.risk === "보통") toast.warning(`주의 표현이 감지되었습니다: ${mod.reason}`);
      // 준비물: 욕설만 로컬에서 차단
      if (prep && /(시발|씨발|개새끼|좆|병신|fuck|shit|asshole|bitch)/i.test(prep)) {
        toast.error("준비물 내용에 욕설이 포함되어 있습니다");
        return;
      }
      const fullRegion = district ? `${region} ${district}` : region;
      const phoneToUse = useDefaultContact ? (emp?.contact_phone ?? "") : contact;
      const { data: inserted, error } = await supabase.from("jobs").insert({
        employer_id: user.id, industry, job_role: jobRole, title, place_name: placeName, location, region: fullRegion,
        photo_url: photoUrl, daily_wage: wageNum, pay_day: `${payMonth} ${payDayNum}일`, preparations: prep || null,
        work_dates: dates, rooms_per_day: rooms ? Number(rooms) : null, headcount: headcountNum, is_active: true,
      } as any).select("id").single();
      if (error) return toast.error(error.message);
      if (inserted?.id && phoneToUse) {
        await supabase.from("job_contacts").upsert({ job_id: inserted.id, employer_id: user.id, contact_phone: phoneToUse }, { onConflict: "job_id" });
      }
      toast.success("공고 등록 완료");
      nav({ to: "/employer/jobs" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <MobileLayout role="employer">
      <div className="p-3 space-y-3">
        <h2 className="font-bold">새 공고 등록</h2>
        <Card><CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div><Label>업종</Label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(INDUSTRY_LABEL).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>직무</Label>
              <Select value={jobRole} onValueChange={setJobRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES_BY_INDUSTRY[industry].map(r => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>공고 제목</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 주말 객실청소 모집" /></div>
          <div className="grid grid-cols-3 gap-1.5">
            <Button type="button" size="sm" variant="secondary" disabled={aiBusy} onClick={() => runAiDraft("default")}><Sparkles size={14} className="mr-1" />AI 초안</Button>
            <Button type="button" size="sm" variant="outline" disabled={aiBusy} onClick={() => runAiDraft("friendly")}>친근하게</Button>
            <Button type="button" size="sm" variant="outline" disabled={aiBusy} onClick={() => runAiDraft("foreigner")}>외국인 친화</Button>
          </div>
          <div><Label>일할 곳 이름</Label><Input value={placeName} onChange={e => setPlaceName(e.target.value)} /></div>
          <div><Label>상세주소</Label><Input value={location} onChange={e => setLocation(e.target.value)} placeholder="건물명/도로명 주소 등" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>지역 (시/도)</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>구 (선택)</Label>
              <Input value={district} onChange={e => setDistrict(e.target.value)} placeholder="예: 강남구" />
            </div>
          </div>
          <div>
            <Label>대표 사진</Label>
            <Button type="button" size="sm" variant="outline" className="ml-2 h-7 text-xs" disabled={photoUploading} onClick={runAiImage}>AI 사진 생성</Button>
            <div className="mt-1">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/30 rounded-lg cursor-pointer hover:bg-muted/30 transition">
                {photoUrl ? (
                  <img src={photoUrl} className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <>
                    <ImagePlus className="text-muted-foreground" size={32} />
                    <span className="text-xs text-muted-foreground mt-2">
                      {photoUploading ? "업로드 중…" : "공고에 나오는 대표사진 선택"}
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && uploadPhoto(e.target.files[0])}
                />
              </label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>일당 (원)</Label>
              <Input type="number" inputMode="numeric" value={wage} onChange={e => setWage(e.target.value)} placeholder="예: 120000" />
            </div>
            <div><Label>급여 지급일</Label>
              <div className="grid grid-cols-[1fr_1fr] gap-1">
                <Select value={payMonth} onValueChange={(v) => setPayMonth(v as "당월" | "익월")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="당월">당월</SelectItem>
                    <SelectItem value="익월">익월</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={payDayNum} onValueChange={setPayDayNum}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-64">
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(n => (
                      <SelectItem key={n} value={String(n)}>{n}일</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div><Label>필요 인원수 <span className="text-red-500">*</span></Label>
            <Input type="number" inputMode="numeric" min={1} value={headcount} onChange={e => setHeadcount(e.target.value)} placeholder="예: 2" />
          </div>
          {isRoomCleaningHotel && <div>
            <Label>일일 청소 객실수 <span className="text-red-500">*</span></Label>
            <Input type="number" inputMode="numeric" value={rooms} onChange={e => setRooms(e.target.value)} placeholder="예: 30" />
          </div>}
          <div><Label>준비물 / 출근시 필요사항</Label><Textarea rows={5} value={prep} onChange={e => setPrep(e.target.value)} /></div>
          <div>
            <Label>근무 일자 <span className="text-xs text-muted-foreground font-normal">(최대 {MAX_WORK_DATES}일)</span></Label>
            <div className="flex items-stretch gap-2 mt-1 w-full">
              <div className="relative flex-1 min-w-0">
                <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary pointer-events-none z-10" />
                <Input
                  type="date"
                  value={dateInput}
                  onChange={e => setDateInput(e.target.value)}
                  className="pl-9 pr-2 w-full min-w-0 block"
                  style={{ WebkitAppearance: "none", MozAppearance: "none", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" }}
                />
              </div>
              <Button type="button" onClick={addDate} disabled={dates.length >= MAX_WORK_DATES} className="shrink-0 px-4 relative z-10">추가</Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {dates.map(d => <span key={d} className="px-2 py-1 bg-muted rounded text-xs cursor-pointer" onClick={() => setDates(dates.filter(x => x !== d))}>{d} ✕</span>)}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label>가입 시 기본 연락처 사용 ({emp?.contact_phone})</Label>
            <Switch checked={useDefaultContact} onCheckedChange={setUseDefaultContact} />
          </div>
          {!useDefaultContact && <div><Label>담당자 연락처 (구직자에게 비공개)</Label><Input value={contact} onChange={e => setContact(e.target.value)} /></div>}
          <Button className="w-full" onClick={save} disabled={saving}>등록</Button>
        </CardContent></Card>
      </div>
    </MobileLayout>
  );
}
