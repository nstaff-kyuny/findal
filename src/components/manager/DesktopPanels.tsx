import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ImagePlus, Sparkles, CalendarDays, Download, Copy, ArrowLeft } from "lucide-react";
import {
  INDUSTRY_LABEL, ROLE_LABEL, ROLES_BY_INDUSTRY, REGIONS,
} from "@/lib/constants";
import { useI18n } from "@/lib/i18n";
import { generateJobDraft, generateJobImage, moderateText } from "@/lib/ai.functions";
import { useFormDraft, clearFormDraft } from "@/lib/form-draft";

const MAX_WORK_DATES = 5;
const MAX_EDITS = 2;

/* =============================================================
   공고 등록 (desktop)
   ============================================================= */
export function NewJobPanel({ userId, onCreated, editJobId, onBack }: { userId: string; onCreated: () => void; editJobId?: string; onBack?: () => void }) {
  const { t, customIndustries, customRoles } = useI18n();
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

  // contract type
  const [contractType, setContractType] = useState<"daily" | "monthly">("daily");
  const [wage, setWage] = useState("");
  const [monthlyWage, setMonthlyWage] = useState("");
  const [contractMonths, setContractMonths] = useState("");
  const [oneMonthPlus, setOneMonthPlus] = useState(false);

  const [payMonth, setPayMonth] = useState<"당월" | "익월">("당월");
  const [payDayNum, setPayDayNum] = useState("10");
  const [prep, setPrep] = useState("");
  const [rooms, setRooms] = useState("");
  const [headcount, setHeadcount] = useState("");
  const [useDefaultContact, setUseDefaultContact] = useState(true);
  const [contact, setContact] = useState("");
  const [dates, setDates] = useState<string[]>([]);
  const [dateInput, setDateInput] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editCount, setEditCount] = useState(0);
  const [loadingJob, setLoadingJob] = useState(!!editJobId);
  const [pastJobs, setPastJobs] = useState<any[]>([]);
  const [copyOpen, setCopyOpen] = useState(false);
  const [roomsUnit, setRoomsUnit] = useState<"unit" | "실">("unit");
  const isEdit = !!editJobId;
  const reachedEditLimit = isEdit && editCount >= MAX_EDITS;

  // merged industries/roles (built-in + admin custom)
  const allIndustries = useMemo(() => {
    const built = Object.entries(INDUSTRY_LABEL).map(([k, label]) => ({ key: k, label }));
    const custom = customIndustries.map((c) => ({ key: c.key, label: c.label }));
    const seen = new Set<string>();
    return [...built, ...custom].filter((x) => (seen.has(x.key) ? false : (seen.add(x.key), true)));
  }, [customIndustries]);
  const rolesFor = (indKey: string) => {
    const built = (ROLES_BY_INDUSTRY[indKey] ?? []).map((rk) => ({ key: rk, label: ROLE_LABEL[rk] ?? rk }));
    const custom = customRoles.filter((r) => r.industry_key === indKey).map((r) => ({ key: r.key, label: r.label }));
    const seen = new Set<string>();
    return [...built, ...custom].filter((x) => (seen.has(x.key) ? false : (seen.add(x.key), true)));
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("employer_profiles").select("*").eq("user_id", userId).single();
      setEmp(data);
      if (!editJobId) setContact((prev) => prev || (data?.contact_phone ?? ""));
    })();
  }, [userId, editJobId]);

  // 지난 공고 리스트 로드 (복사용)
  useEffect(() => {
    if (isEdit) return;
    (async () => {
      const { data } = await supabase
        .from("jobs").select("id, title, place_name, created_at")
        .eq("employer_id", userId).order("created_at", { ascending: false }).limit(50);
      setPastJobs(data ?? []);
    })();
  }, [userId, isEdit]);

  const applyJobToForm = (job: any, contactPhone?: string | null) => {
    setIndustry(job.industry);
    setJobRole(job.job_role);
    setTitle(job.title ?? "");
    setPlaceName(job.place_name ?? "");
    setLocation(job.location ?? "");
    const rg = (job.region ?? "서울").trim();
    const sp = rg.indexOf(" ");
    if (sp > 0) { setRegion(rg.slice(0, sp)); setDistrict(rg.slice(sp + 1)); }
    else { setRegion(rg); setDistrict(""); }
    setContractType((job.contract_type as any) ?? "daily");
    setWage(job.daily_wage ? String(job.daily_wage) : "");
    setMonthlyWage(job.monthly_wage ? String(job.monthly_wage) : "");
    if (job.contract_months) { setContractMonths(String(job.contract_months)); setOneMonthPlus(false); }
    else if ((job.contract_type as any) === "monthly") { setOneMonthPlus(true); }
    const pd = (job.pay_day ?? "").trim();
    const m = pd.match(/^(당월|익월)\s*(\d+)/);
    if (m) { setPayMonth(m[1] as any); setPayDayNum(m[2]); }
    setPrep(job.preparations ?? "");
    setRooms(job.rooms_per_day ? String(job.rooms_per_day) : "");
    setRoomsUnit(((job as any).rooms_unit === "실" ? "실" : "unit"));
    setHeadcount(String(job.headcount ?? 1));
    setDates(isEdit ? (job.work_dates ?? []) : []);
    setPhotoUrl(job.photo_url ?? null);
    if (contactPhone !== undefined) {
      const phone = contactPhone ?? "";
      if (phone && emp?.contact_phone && phone === emp.contact_phone) {
        setUseDefaultContact(true); setContact(phone);
      } else { setUseDefaultContact(false); setContact(phone); }
    }
  };

  // 수정 모드일 때 기존 공고 로드
  useEffect(() => {
    if (!editJobId) return;
    (async () => {
      setLoadingJob(true);
      const { data: job } = await supabase.from("jobs").select("*").eq("id", editJobId).single();
      if (!job) { setLoadingJob(false); return; }
      const { data: jc } = await supabase.from("job_contacts").select("contact_phone").eq("job_id", editJobId).maybeSingle();
      applyJobToForm(job, jc?.contact_phone ?? "");
      setEditCount(job.edit_count ?? 0);
      setLoadingJob(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editJobId]);

  const copyPastJob = async (jobId: string) => {
    const { data: job } = await supabase.from("jobs").select("*").eq("id", jobId).single();
    if (!job) return toast.error("공고를 찾을 수 없습니다");
    applyJobToForm(job);
    setDates([]); // 새 공고 등록이므로 날짜는 비움
    setCopyOpen(false);
    toast.success("공고 내용을 복사했습니다. 근무일자와 필요한 부분만 수정 후 등록하세요.");
  };

  // ---- 작성 중 임시저장 (패널 이동 후 복원) ----
  const draftKey = `job_draft_pc_${userId}`;
  const draftValues = {
    industry, jobRole, title, placeName, location, region, district,
    contractType, wage, monthlyWage, contractMonths, oneMonthPlus,
    payMonth, payDayNum, prep, rooms, roomsUnit, headcount,
    useDefaultContact, contact, dates, photoUrl,
  };
  useFormDraft(draftKey, draftValues, (d) => {
    if (d.industry) setIndustry(d.industry);
    if (d.jobRole) setJobRole(d.jobRole);
    if (d.title != null) setTitle(d.title);
    if (d.placeName != null) setPlaceName(d.placeName);
    if (d.location != null) setLocation(d.location);
    if (d.region) setRegion(d.region);
    if (d.district != null) setDistrict(d.district);
    if (d.contractType) setContractType(d.contractType);
    if (d.wage != null) setWage(d.wage);
    if (d.monthlyWage != null) setMonthlyWage(d.monthlyWage);
    if (d.contractMonths != null) setContractMonths(d.contractMonths);
    if (d.oneMonthPlus != null) setOneMonthPlus(d.oneMonthPlus);
    if (d.payMonth) setPayMonth(d.payMonth);
    if (d.payDayNum != null) setPayDayNum(d.payDayNum);
    if (d.prep != null) setPrep(d.prep);
    if (d.rooms != null) setRooms(d.rooms);
    if (d.roomsUnit) setRoomsUnit(d.roomsUnit);
    if (d.headcount != null) setHeadcount(d.headcount);
    if (d.useDefaultContact != null) setUseDefaultContact(d.useDefaultContact);
    if (d.contact != null) setContact(d.contact);
    if (Array.isArray(d.dates)) setDates(d.dates);
    if (d.photoUrl !== undefined) setPhotoUrl(d.photoUrl);
  }, {
    enabled: !isEdit,
    onRestored: () => toast.info("작성 중이던 공고 내용을 불러왔습니다"),
  });

  const resetForm = () => {
    setTitle(""); setPlaceName(""); setLocation(""); setDistrict("");
    setWage(""); setMonthlyWage(""); setContractMonths(""); setOneMonthPlus(false);
    setPrep(""); setRooms(""); setHeadcount(""); setDates([]); setPhotoUrl(null);
    clearFormDraft(draftKey);
    toast.success("작성 내용을 초기화했습니다");
  };

  useEffect(() => {
    const list = rolesFor(industry);
    if (list.length && !list.find((r) => r.key === jobRole)) setJobRole(list[0].key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [industry, customRoles]);

  const isRoomCleaningHotel = ["hotel", "motel", "resort"].includes(industry) && jobRole === "room_cleaning";

  const uploadPhoto = async (file: File) => {
    setPhotoBusy(true);
    const path = `${userId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("job-photos").upload(path, file);
    if (error) { setPhotoBusy(false); return toast.error(error.message); }
    const { data } = supabase.storage.from("job-photos").getPublicUrl(path);
    setPhotoUrl(data.publicUrl);
    setPhotoBusy(false);
  };

  const addDate = () => {
    if (!dateInput) return;
    if (dates.includes(dateInput)) { setDateInput(""); return; }
    if (dates.length >= MAX_WORK_DATES) return toast.error(`근무일은 최대 ${MAX_WORK_DATES}일까지 선택할 수 있습니다`);
    setDates([...dates, dateInput].sort());
    setDateInput("");
  };

  const runAiDraft = async (tone: "default" | "friendly" | "foreigner" = "default") => {
    setAiBusy(true);
    try {
      const indLabel = allIndustries.find((x) => x.key === industry)?.label ?? industry;
      const roleLabel = rolesFor(industry).find((x) => x.key === jobRole)?.label ?? jobRole;
      const draft = await makeDraft({ data: { industry: indLabel, jobRole: roleLabel, placeName, region: district ? `${region} ${district}` : region, wage: contractType === "monthly" ? monthlyWage : wage, rooms, tone } });
      setTitle(draft.title || title);
      setPrep(draft.preparations || prep);
      toast.success("AI 공고 초안이 적용되었습니다");
    } catch (e: any) { toast.error(e?.message ?? "AI 생성 실패"); }
    finally { setAiBusy(false); }
  };

  const runAiImage = async () => {
    setPhotoBusy(true);
    try {
      const indLabel = allIndustries.find((x) => x.key === industry)?.label ?? industry;
      const roleLabel = rolesFor(industry).find((x) => x.key === jobRole)?.label ?? jobRole;
      const { imageUrl } = await makeImage({ data: { industry: indLabel, jobRole: roleLabel, placeName } });
      setPhotoUrl(imageUrl);
      toast.success("AI 대표 사진이 생성되었습니다");
    } catch (e: any) { toast.error(e?.message ?? "이미지 생성 실패"); }
    finally { setPhotoBusy(false); }
  };

  const save = async () => {
    if (!title || !placeName || !location) return toast.error("필수 항목을 입력하세요");
    const headcountNum = Number(headcount);
    if (!headcountNum || headcountNum < 1) return toast.error("필요 인원수를 입력하세요");
    if (isRoomCleaningHotel && !rooms) return toast.error("객실청소 공고는 일일 객실수가 필수입니다");

    let wageNum: number | null = null;
    let monthlyWageNum: number | null = null;
    let contractMonthsNum: number | null = null;
    if (contractType === "monthly") {
      monthlyWageNum = Number(monthlyWage);
      if (!monthlyWageNum || monthlyWageNum <= 0) return toast.error(t("monthly_wage") + "을(를) 입력하세요");
      if (!oneMonthPlus) {
        contractMonthsNum = Number(contractMonths);
        if (!contractMonthsNum || contractMonthsNum < 1) return toast.error(t("contract_months") + "을(를) 입력하세요");
      }
    } else {
      wageNum = Number(wage);
      if (!wageNum || wageNum <= 0) return toast.error("일당을 입력하세요");
    }

    if (isEdit && reachedEditLimit) return toast.error(`수정은 최대 ${MAX_EDITS}회까지만 가능합니다`);
    setSaving(true);
    try {
      const combined = `${title}\n${prep ?? ""}\n${placeName}`.trim();
      const mod = await moderate({ data: { text: combined, context: "job" } });
      if (!mod.allow) return toast.error(`부적절한 표현: ${mod.reason}`);
      if (mod.risk === "보통") toast.warning(`주의 표현: ${mod.reason}`);
      const fullRegion = district ? `${region} ${district}` : region;
      const phoneToUse = useDefaultContact ? (emp?.contact_phone ?? "") : contact;
      const jobPayload: any = {
        industry, job_role: jobRole, title, place_name: placeName, location, region: fullRegion,
        photo_url: photoUrl,
        contract_type: contractType,
        daily_wage: wageNum,
        monthly_wage: monthlyWageNum,
        contract_months: contractMonthsNum,
        pay_day: `${payMonth} ${payDayNum}일`, preparations: prep || null,
        work_dates: contractType === "monthly" ? [] : dates,
        rooms_per_day: rooms ? Number(rooms) : null,
        rooms_unit: roomsUnit,
        headcount: headcountNum,
      };
      let savedId: string | null = null;
      if (isEdit && editJobId) {
        jobPayload.edit_count = editCount + 1;
        const { error } = await supabase.from("jobs").update(jobPayload).eq("id", editJobId);
        if (error) return toast.error(error.message);
        savedId = editJobId;
      } else {
        jobPayload.employer_id = userId;
        jobPayload.is_active = true;
        const { data: inserted, error } = await supabase.from("jobs").insert(jobPayload).select("id").single();
        if (error) return toast.error(error.message);
        savedId = inserted?.id ?? null;
      }
      if (savedId && phoneToUse) {
        await supabase.from("job_contacts").upsert({ job_id: savedId, employer_id: userId, contact_phone: phoneToUse }, { onConflict: "job_id" });
      }
      toast.success(isEdit ? `수정 완료 (${editCount + 1}/${MAX_EDITS})` : "공고 등록 완료");
      if (!isEdit) {
        // reset
        setTitle(""); setPlaceName(""); setLocation(""); setWage(""); setMonthlyWage("");
        setContractMonths(""); setOneMonthPlus(false); setPrep("");
        setRooms(""); setHeadcount(""); setPhotoUrl(null); setDates([]);
      }
      onCreated();
      if (isEdit && onBack) onBack();
    } finally { setSaving(false); }
  };

  if (loadingJob) {
    return <div className="p-6 text-sm text-muted-foreground">불러오는 중…</div>;
  }

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{isEdit ? "공고 수정" : "새 공고 등록"}</h2>
          <p className="text-xs text-muted-foreground">
            {isEdit ? `수정 ${editCount}/${MAX_EDITS}회` : "데스크톱 화면에 맞춰 한번에 입력하실 수 있습니다."}
          </p>
        </div>
        <div className="flex gap-2">
          {isEdit && onBack && (
            <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft size={14} className="mr-1" />목록으로</Button>
          )}
          {!isEdit && pastJobs.length > 0 && (
            <Dialog open={copyOpen} onOpenChange={setCopyOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm"><Copy size={14} className="mr-1" />지난 공고 복사</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>지난 공고 복사</DialogTitle></DialogHeader>
                <p className="text-xs text-muted-foreground">복사할 공고를 선택하면 입력 폼에 내용이 채워집니다. 대표 사진도 함께 복사되며, 근무일자는 새로 입력하세요.</p>
                <div className="max-h-80 overflow-auto border rounded-md divide-y">
                  {pastJobs.map((j) => (
                    <button
                      key={j.id}
                      type="button"
                      onClick={() => copyPastJob(j.id)}
                      className="w-full text-left p-3 hover:bg-muted/50 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{j.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{j.place_name} · {new Date(j.created_at).toLocaleDateString("ko-KR")}</p>
                      </div>
                      <Copy size={14} className="text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
      {isEdit && (
        <Card className="bg-amber-50 border-amber-200"><CardContent className="p-3 text-xs">
          공고 수정은 <b>최대 {MAX_EDITS}회</b>까지만 가능합니다. 현재 <b>{editCount}/{MAX_EDITS}</b>회 수정됨.
          {reachedEditLimit && <p className="text-red-600 mt-1">⚠ 수정 횟수를 초과하여 더 이상 수정할 수 없습니다.</p>}
        </CardContent></Card>
      )}


      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2">
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>업종</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{allIndustries.map((it) => <SelectItem key={it.key} value={it.key}>{it.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>직무</Label>
                <Select value={jobRole} onValueChange={setJobRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{rolesFor(industry).map((r) => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Contract type toggle */}
            <div>
              <Label>{t("contract_type")}</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <Button type="button" variant={contractType === "daily" ? "default" : "outline"} onClick={() => setContractType("daily")}>{t("contract_daily")}</Button>
                <Button type="button" variant={contractType === "monthly" ? "default" : "outline"} onClick={() => setContractType("monthly")}>{t("contract_monthly")}</Button>
              </div>
            </div>

            <div>
              <Label>공고 제목</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 주말 객실청소 모집" />
              <div className="flex gap-2 mt-2">
                <Button type="button" size="sm" variant="secondary" disabled={aiBusy} onClick={() => runAiDraft("default")}><Sparkles size={14} className="mr-1" />AI 초안</Button>
                <Button type="button" size="sm" variant="outline" disabled={aiBusy} onClick={() => runAiDraft("friendly")}>친근하게</Button>
                <Button type="button" size="sm" variant="outline" disabled={aiBusy} onClick={() => runAiDraft("foreigner")}>외국인 친화</Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>일할 곳 이름</Label><Input value={placeName} onChange={(e) => setPlaceName(e.target.value)} /></div>
              <div><Label>{t("detail_location")}</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="건물명/도로명 주소 등" /></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>지역 (시/도)</Label>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>구 (선택)</Label><Input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="예: 강남구" /></div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {contractType === "daily" ? (
                <div>
                  <Label>일당 (원)</Label>
                  <Input type="number" inputMode="numeric" value={wage} onChange={(e) => setWage(e.target.value)} placeholder="예: 120000" />
                </div>
              ) : (
                <div>
                  <Label>{t("monthly_wage")} (원)</Label>
                  <Input type="number" inputMode="numeric" value={monthlyWage} onChange={(e) => setMonthlyWage(e.target.value)} placeholder="예: 2500000" />
                </div>
              )}
              <div>
                <Label>급여 지급일</Label>
                <div className="grid grid-cols-2 gap-1">
                  <Select value={payMonth} onValueChange={(v) => setPayMonth(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="당월">당월</SelectItem>
                      <SelectItem value="익월">익월</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={payDayNum} onValueChange={setPayDayNum}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-64">
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((n) => <SelectItem key={n} value={String(n)}>{n}일</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>필요 인원수 <span className="text-red-500">*</span></Label>
                <Input type="number" inputMode="numeric" min={1} value={headcount} onChange={(e) => setHeadcount(e.target.value)} placeholder="예: 2" />
              </div>
            </div>

            {isRoomCleaningHotel && (
              <div>
                <Label>일일 청소 객실수 <span className="text-red-500">*</span></Label>
                <Input type="number" inputMode="numeric" value={rooms} onChange={(e) => setRooms(e.target.value)} placeholder="예: 30" />
              </div>
            )}

            <div>
              <Label>준비물 / 출근시 필요사항</Label>
              <Textarea rows={7} value={prep} onChange={(e) => setPrep(e.target.value)} />
            </div>

            {/* Date picker OR contract length */}
            {contractType === "daily" ? (
              <div>
                <Label>근무 일자 <span className="text-xs text-muted-foreground font-normal">(최대 {MAX_WORK_DATES}일)</span></Label>
                <div className="flex gap-2 mt-1">
                  <div className="relative flex-1">
                    <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary pointer-events-none" />
                    <Input type="date" value={dateInput} onChange={(e) => setDateInput(e.target.value)} className="pl-9" />
                  </div>
                  <Button type="button" onClick={addDate} disabled={dates.length >= MAX_WORK_DATES}>추가</Button>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {dates.map((d) => (
                    <span key={d} className="px-2 py-1 bg-muted rounded text-xs cursor-pointer" onClick={() => setDates(dates.filter((x) => x !== d))}>{d} ✕</span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>{t("contract_months")}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={contractMonths}
                    onChange={(e) => setContractMonths(e.target.value)}
                    placeholder="예: 3"
                    disabled={oneMonthPlus}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground">{t("months_unit")}</span>
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={oneMonthPlus} onCheckedChange={(v) => setOneMonthPlus(!!v)} />
                  {t("one_month_plus")}
                </label>
              </div>
            )}

            <div className="flex items-center justify-between border-t pt-3">
              <Label>가입 시 기본 연락처 사용 ({emp?.contact_phone ?? "-"})</Label>
              <Switch checked={useDefaultContact} onCheckedChange={setUseDefaultContact} />
            </div>
            {!useDefaultContact && (
              <div>
                <Label>담당자 연락처 (구직자에게 비공개)</Label>
                <Input value={contact} onChange={(e) => setContact(e.target.value)} />
              </div>
            )}

            <Button className="w-full" size="lg" onClick={save} disabled={saving || reachedEditLimit}>
              {saving ? (isEdit ? "저장 중…" : "등록 중…") : (isEdit ? "수정 저장" : "공고 등록")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-3">
            <Label>대표 사진</Label>
            <Button type="button" size="sm" variant="outline" className="w-full" disabled={photoBusy} onClick={runAiImage}>
              <Sparkles size={14} className="mr-1" />AI 사진 생성
            </Button>
            <label className="flex flex-col items-center justify-center w-full h-56 border-2 border-dashed border-muted-foreground/30 rounded-lg cursor-pointer hover:bg-muted/30 transition">
              {photoUrl ? (
                <img src={photoUrl} className="w-full h-full object-cover rounded-lg" alt="공고 대표" />
              ) : (
                <>
                  <ImagePlus className="text-muted-foreground" size={32} />
                  <span className="text-xs text-muted-foreground mt-2">
                    {photoBusy ? "처리 중…" : "공고 대표사진 업로드"}
                  </span>
                </>
              )}
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
            </label>
            <p className="text-[11px] text-muted-foreground">
              구직자가 공고를 가장 먼저 보는 이미지입니다. 밝고 깔끔한 현장 사진을 권장합니다.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* =============================================================
   히스토리 (desktop)
   ============================================================= */
const HIST_STATUS_LABEL: Record<string, string> = { approved: "승인", confirmed: "확정", no_show: "노쇼" };
const HIST_STATUS_VARIANT = (s: string): "default" | "secondary" | "destructive" =>
  s === "no_show" ? "destructive" : s === "confirmed" ? "default" : "secondary";

export function HistoryPanel({ userId }: { userId: string }) {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"day" | "week" | "month" | "all" | "custom">("month");
  const [status, setStatus] = useState<"all" | "approved" | "confirmed" | "no_show">("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [exporting, setExporting] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: list, error } = await supabase
      .from("job_applications")
      .select("*")
      .eq("employer_id", userId)
      .in("status", ["approved", "confirmed", "no_show"])
      .order("approved_at", { ascending: false });
    if (error) { toast.error(error.message); setLoading(false); return; }
    const arr = list ?? [];
    const seekerIds = Array.from(new Set(arr.map((a: any) => a.seeker_id)));
    const jobIds = Array.from(new Set(arr.map((a: any) => a.job_id)));
    const [jobsRes, profilesRes] = await Promise.all([
      jobIds.length ? supabase.from("jobs").select("id, title, place_name, daily_wage, monthly_wage, contract_type").in("id", jobIds) : Promise.resolve({ data: [] as any[] }),
      seekerIds.length ? supabase.from("profiles").select("id, full_name, phone").in("id", seekerIds) : Promise.resolve({ data: [] as any[] }),
    ]);
    const jm = new Map((jobsRes.data ?? []).map((j: any) => [j.id, j]));
    const pm = new Map((profilesRes.data ?? []).map((p: any) => [p.id, p]));
    setApps(arr.map((a: any) => ({ ...a, jobs: jm.get(a.job_id), profiles: pm.get(a.seeker_id) })));
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let cutoff: Date | null = null;
    if (filter === "day" || filter === "week" || filter === "month") {
      cutoff = new Date();
      if (filter === "day") cutoff.setDate(cutoff.getDate() - 1);
      else if (filter === "week") cutoff.setDate(cutoff.getDate() - 7);
      else cutoff.setMonth(cutoff.getMonth() - 1);
    }
    const from = filter === "custom" && dateFrom ? new Date(dateFrom).getTime() : null;
    const to = filter === "custom" && dateTo ? new Date(dateTo + "T23:59:59").getTime() : null;
    return apps.filter((a) => {
      if (status !== "all" && a.status !== status) return false;
      const ts = a.approved_at ?? a.created_at;
      const tsNum = ts ? new Date(ts).getTime() : 0;
      if (cutoff && tsNum < cutoff.getTime()) return false;
      if (from && tsNum < from) return false;
      if (to && tsNum > to) return false;
      if (q) {
        const hay = `${a.profiles?.full_name ?? ""} ${a.profiles?.phone ?? ""} ${a.jobs?.title ?? ""} ${a.jobs?.place_name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [apps, filter, status, search, dateFrom, dateTo]);

  const wageOf = (a: any) =>
    a.jobs?.contract_type === "monthly"
      ? Number(a.jobs?.monthly_wage ?? 0)
      : Number(a.jobs?.daily_wage ?? 0);
  const totalAmount = filtered.reduce((s, a) => s + wageOf(a), 0);

  const downloadPdf = async () => {
    if (!tableRef.current) return;
    if (filtered.length === 0) { toast.error("내보낼 기록이 없습니다"); return; }
    setExporting(true);
    try {
      const [h2cMod, jspdfMod] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
      ]);
      const html2canvas = (h2cMod as any).default ?? h2cMod;
      const jsPDF = (jspdfMod as any).jsPDF ?? (jspdfMod as any).default;
      const canvas = await html2canvas(tableRef.current, { scale: 2, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 24;
      const imgW = pageW - margin * 2;
      const imgH = (canvas.height * imgW) / canvas.width;
      let y = margin;
      if (imgH <= pageH - margin * 2) {
        pdf.addImage(imgData, "PNG", margin, y, imgW, imgH);
      } else {
        // multi-page slice
        const pageSliceH = ((pageH - margin * 2) * canvas.width) / imgW;
        let sY = 0;
        while (sY < canvas.height) {
          const sH = Math.min(pageSliceH, canvas.height - sY);
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = sH;
          const ctx = sliceCanvas.getContext("2d");
          ctx?.drawImage(canvas, 0, sY, canvas.width, sH, 0, 0, canvas.width, sH);
          const sliceData = sliceCanvas.toDataURL("image/png");
          pdf.addImage(sliceData, "PNG", margin, margin, imgW, (sH * imgW) / canvas.width);
          sY += sH;
          if (sY < canvas.height) pdf.addPage();
        }
      }
      pdf.save(`승인기록_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e: any) {
      toast.error(e?.message ?? "PDF 생성 실패");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold">승인 기록</h2>
          <p className="text-xs text-muted-foreground">총 {filtered.length}건 · 합계 {totalAmount.toLocaleString()}원</p>
        </div>
        <div className="flex gap-2">
          <Input className="w-64" placeholder="구직자/공고/장소/연락처 검색" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Button variant="outline" disabled={exporting} onClick={downloadPdf}>
            <Download size={14} className="mr-1" />{exporting ? "생성 중…" : "PDF 다운로드"}
          </Button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap items-end">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="day">최근 1일</TabsTrigger>
            <TabsTrigger value="week">최근 1주</TabsTrigger>
            <TabsTrigger value="month">최근 1개월</TabsTrigger>
            <TabsTrigger value="all">전체</TabsTrigger>
            <TabsTrigger value="custom">기간 지정</TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs value={status} onValueChange={(v) => setStatus(v as any)}>
          <TabsList>
            <TabsTrigger value="all">상태 전체</TabsTrigger>
            <TabsTrigger value="approved">승인</TabsTrigger>
            <TabsTrigger value="confirmed">확정</TabsTrigger>
            <TabsTrigger value="no_show">노쇼</TabsTrigger>
          </TabsList>
        </Tabs>
        {filter === "custom" && (
          <div className="flex gap-2 items-end">
            <div><Label className="text-xs">시작일</Label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9" /></div>
            <div><Label className="text-xs">종료일</Label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9" /></div>
          </div>
        )}
      </div>

      <Card ref={tableRef as any}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>일시</TableHead>
              <TableHead>구직자</TableHead>
              <TableHead>연락처</TableHead>
              <TableHead>공고</TableHead>
              <TableHead>장소</TableHead>
              <TableHead className="text-right">급여</TableHead>
              <TableHead className="text-center">상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">불러오는 중…</TableCell></TableRow>}
            {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">기록이 없습니다</TableCell></TableRow>}
            {filtered.map((a) => {
              const isMonthly = a.jobs?.contract_type === "monthly";
              const amt = wageOf(a);
              return (
                <TableRow key={a.id}>
                  <TableCell className="text-xs whitespace-nowrap">{new Date(a.approved_at ?? a.created_at).toLocaleString("ko-KR")}</TableCell>
                  <TableCell className="font-medium">{a.profiles?.full_name ?? "(이름미입력)"}</TableCell>
                  <TableCell className="text-xs">{a.profiles?.phone ? <a href={`tel:${a.profiles.phone}`} className="text-primary underline">{a.profiles.phone}</a> : "-"}</TableCell>
                  <TableCell className="text-xs max-w-[220px] truncate">{a.jobs?.title ?? "-"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">{a.jobs?.place_name ?? "-"}</TableCell>
                  <TableCell className="text-right tabular-nums text-xs">{isMonthly ? `월 ${amt.toLocaleString()}원` : `${amt.toLocaleString()}원`}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={HIST_STATUS_VARIANT(a.status)} className={a.status === "confirmed" ? "bg-green-600 text-white border-transparent" : ""}>
                      {HIST_STATUS_LABEL[a.status] ?? a.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

/* =============================================================
   프로필 / 설정 (desktop)
   ============================================================= */
export function ProfilePanel({ userId, userEmail, onSignOut }: { userId: string; userEmail: string; onSignOut: () => void }) {
  const [profile, setProfile] = useState<any>(null);
  const [emp, setEmp] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [notifyPush, setNotifyPush] = useState(true);
  const [notifyMkt, setNotifyMkt] = useState(false);

  const load = useCallback(async () => {
    const [{ data: p }, { data: e }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("employer_profiles").select("*").eq("user_id", userId).single(),
    ]);
    setProfile(p);
    setEmp(e);
    setForm({
      full_name: p?.full_name ?? "",
      phone: p?.phone ?? "",
      company_name: e?.company_name ?? "",
      manager_name: e?.manager_name ?? "",
      location: e?.location ?? "",
      contact_phone: e?.contact_phone ?? "",
    });
    if (e) { setNotifyPush(e.notify_push); setNotifyMkt(e.notify_marketing); }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const { error: e1 } = await supabase.from("profiles")
        .update({ full_name: form.full_name, phone: form.phone } as any)
        .eq("id", userId);
      if (e1) return toast.error(e1.message);
      const { error: e2 } = await supabase.from("employer_profiles")
        .update({
          company_name: form.company_name, manager_name: form.manager_name,
          location: form.location, contact_phone: form.contact_phone,
        } as any)
        .eq("user_id", userId);
      if (e2) return toast.error(e2.message);
      toast.success("저장되었습니다");
      load();
    } finally { setSaving(false); }
  };

  const updateNotify = async (push: boolean, mkt: boolean) => {
    setNotifyPush(push); setNotifyMkt(mkt);
    await supabase.from("employer_profiles").update({ notify_push: push, notify_marketing: mkt } as any).eq("user_id", userId);
  };

  return (
    <div className="p-5 space-y-4">
      <div>
        <h2 className="text-lg font-bold">프로필 / 설정</h2>
        <p className="text-xs text-muted-foreground">{profile?.full_name ?? userEmail} · 구인자 계정</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2">
          <CardContent className="p-5 space-y-4">
            <h3 className="font-bold text-sm">기본 정보</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>이름</Label><Input value={form.full_name ?? ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div><Label>이메일</Label><Input value={userEmail} disabled /></div>
              <div><Label>연락처</Label><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>업체명</Label><Input value={form.company_name ?? ""} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
              <div><Label>담당자명</Label><Input value={form.manager_name ?? ""} onChange={(e) => setForm({ ...form, manager_name: e.target.value })} /></div>
              <div><Label>대표 연락처</Label><Input value={form.contact_phone ?? ""} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} /></div>
              <div className="col-span-2"><Label>위치</Label><Input value={form.location ?? ""} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            </div>
            <Button onClick={save} disabled={saving}>{saving ? "저장 중…" : "저장"}</Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-5 space-y-3">
              <h3 className="font-bold text-sm">알림 설정</h3>
              <div className="flex items-center justify-between"><span className="text-sm">푸시 알림</span>
                <Switch checked={notifyPush} onCheckedChange={(v) => updateNotify(v, notifyMkt)} /></div>
              <div className="flex items-center justify-between"><span className="text-sm">마케팅/이벤트 알림</span>
                <Switch checked={notifyMkt} onCheckedChange={(v) => updateNotify(notifyPush, v)} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-2">
              <h3 className="font-bold text-sm mb-2">크레딧</h3>
              <p className="text-3xl font-bold text-primary">{emp?.credits ?? 0}</p>
              <p className="text-xs text-muted-foreground">크레딧 탭에서 충전 및 사용 내역을 확인할 수 있습니다.</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-2">
              <h3 className="font-bold text-sm">계정</h3>
              <Button variant="outline" className="w-full" onClick={onSignOut}>로그아웃</Button>
              <p className="text-[11px] text-muted-foreground">
                회원 탈퇴는 모바일 앱의 [내 설정]에서 진행해 주세요.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
