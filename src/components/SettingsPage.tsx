import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { deleteOwnAccount } from "@/lib/account.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Bell, Megaphone, Gift, HelpCircle, MessageSquare, FileText, ChevronRight, UserCog, UserX, Wallet, Receipt } from "lucide-react";
import { COMPANY_INFO, fetchCompanyInfo, type CompanyInfo } from "@/lib/company";
import { RegionPicker, parseRegions, serializeRegions } from "@/components/RegionPicker";
import { toast } from "sonner";
import { useI18n, LANG_LABEL, LANG_FLAG, type Lang } from "@/lib/i18n";
import { requestPushPermissionAndSubscribe, unsubscribePush, detectPushPlatform } from "@/lib/push-client";
import { Languages } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { NATIONALITY_LABEL, VISA_LABEL } from "@/lib/constants";

const EXPERIENCE_LABEL: Record<string, string> = { lt5: "경력 5회 미만", gte5: "경력 5회 이상" };

export function SettingsPage({ role }: { role: "seeker" | "employer" }) {
  const { user, signOut } = useAuth();
  const { lang, setLang } = useI18n();
  const deleteAccount = useServerFn(deleteOwnAccount);
  const [deleting, setDeleting] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [roleData, setRoleData] = useState<any>(null);
  const [notifyPush, setNotifyPush] = useState(true);
  const [notifyMkt, setNotifyMkt] = useState(false);
  const [version, setVersion] = useState<{ version: string; is_latest: boolean } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">("default");
  const [pushPlatform, setPushPlatform] = useState<ReturnType<typeof detectPushPlatform> | null>(null);
  const [form, setForm] = useState<any>({});
  const [company, setCompany] = useState<CompanyInfo>(COMPANY_INFO);
  const table = role === "seeker" ? "seeker_profiles" : "employer_profiles";
  useEffect(() => { fetchCompanyInfo().then(setCompany); }, []);
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) setPushPermission("unsupported");
    else setPushPermission(Notification.permission);
    setPushPlatform(detectPushPlatform());
  }, []);

  const load = async () => {
    if (!user) return;
    const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(p);
    const { data: r } = await supabase.from(table).select("*").eq("user_id", user.id).single();
    setRoleData(r);
    if (r) { setNotifyPush(r.notify_push); setNotifyMkt(r.notify_marketing); }
    const { data: v } = await supabase.from("app_version").select("version, is_latest").eq("is_latest", true).limit(1).maybeSingle();
    if (v) setVersion(v);
  };
  useEffect(() => { load(); }, [user, table]);

  const updateNotify = async (push: boolean, mkt: boolean) => {
    if (!user) return;
    setNotifyPush(push); setNotifyMkt(mkt);
    await supabase.from(table).update({ notify_push: push, notify_marketing: mkt } as any).eq("user_id", user.id);
    if (push) {
      await activatePush();
    } else {
      await unsubscribePush(user.id);
    }
  };

  const activatePush = async () => {
    if (!user) return;
    const plat = detectPushPlatform();
    if (!plat.supported) {
      if (plat.needsInstall) {
        toast.info("아이폰은 홈 화면에 추가한 후 푸시 알림을 받을 수 있습니다");
      } else {
        toast.info(plat.reason ?? "이 기기에서는 푸시를 사용할 수 없습니다");
      }
      return;
    }
    setPushBusy(true);
    try {
      const res = await requestPushPermissionAndSubscribe(user.id);
      if (typeof window !== "undefined" && "Notification" in window) setPushPermission(Notification.permission);
      if (res.ok) toast.success("푸시 알림이 등록되었습니다");
      else toast.info(res.reason ?? "휴대폰 설정에서 알림 권한을 허용해 주세요");
    } catch (e: any) {
      toast.error(e?.message ?? "푸시 알림 등록에 실패했습니다");
    } finally {
      setPushBusy(false);
    }
  };

  const checkUpdate = async () => {
    const { data } = await supabase.from("app_version").select("version").eq("is_latest", true).limit(1).maybeSingle();
    if (data?.version) {
      setVersion({ version: data.version, is_latest: true });
      toast.success(`최신 버전입니다 (v${data.version})`);
    } else toast.info("버전 정보를 확인할 수 없습니다");
  };

  const openEdit = () => {
    setForm({
      full_name: profile?.full_name ?? "",
      phone: profile?.phone ?? "",
      ...(role === "employer" ? {
        company_name: roleData?.company_name ?? "",
        manager_name: roleData?.manager_name ?? "",
        location: roleData?.location ?? "",
        contact_phone: roleData?.contact_phone ?? "",
      } : {
        preferred_regions: parseRegions(roleData?.preferred_region),
        nationality: roleData?.nationality ?? "foreigner",
        experience: roleData?.experience ?? "lt5",
        korean_ok: !!roleData?.korean_ok,
        visa: roleData?.visa ?? "",
      }),
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!user) return;
    const { error: e1 } = await supabase.from("profiles")
      .update({ full_name: form.full_name, phone: form.phone } as any)
      .eq("id", user.id);
    if (e1) return toast.error(e1.message);

    const updates: any = role === "employer"
      ? { company_name: form.company_name, manager_name: form.manager_name, location: form.location, contact_phone: form.contact_phone }
      : {
          preferred_region: serializeRegions(form.preferred_regions ?? []),
          nationality: form.nationality,
          experience: form.experience,
          korean_ok: !!form.korean_ok,
          visa: form.visa || null,
        };
    const { error: e2 } = await supabase.from(table).update(updates).eq("user_id", user.id);
    if (e2) return toast.error(e2.message);
    toast.success("저장되었습니다");
    setEditOpen(false);
    load();
  };

  return (
    <div className="p-3 space-y-3">
      <Card><CardContent className="p-4 space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-bold text-lg">{profile?.full_name ?? user?.email}</h2>
            <p className="text-sm text-muted-foreground">{profile?.phone}</p>
            <p className="text-sm text-muted-foreground"><span style={{ pointerEvents: "none" }}>{user?.email}</span></p>
            <p className="text-xs mt-1 text-primary font-semibold">{role === "seeker" ? "구직자 계정" : "구인자 계정"}</p>
          </div>
          <Button size="sm" variant="outline" onClick={openEdit}><UserCog size={14} className="mr-1" />수정</Button>
        </div>
        {role === "employer" && roleData && (
          <div className="text-sm text-muted-foreground border-t pt-2 space-y-0.5">
            <p>업체명: {roleData.company_name}</p>
            <p>담당자: {roleData.manager_name}</p>
            <p>위치: {roleData.location}</p>
            <p>대표 연락처: {roleData.contact_phone}</p>
          </div>
        )}
        {role === "seeker" && roleData && (
          <div className="text-sm text-muted-foreground border-t pt-2 space-y-0.5">
            <p>국적: {NATIONALITY_LABEL[roleData.nationality] ?? roleData.nationality ?? "-"}</p>
            <p>경력: {EXPERIENCE_LABEL[roleData.experience] ?? roleData.experience ?? "-"}</p>
            <p>한국어 가능: {roleData.korean_ok ? "예" : "아니오"}</p>
            {roleData.visa && <p>비자: {VISA_LABEL[roleData.visa] ?? roleData.visa}</p>}
            <p>선호 지역: {parseRegions(roleData.preferred_region).join(", ") || "-"}</p>
          </div>
        )}
      </CardContent></Card>

      {role === "seeker" && (
        <Card><CardContent className="p-0 divide-y">
          <SectionHeader>{LANG_FLAG[lang]} 언어 / Language</SectionHeader>
          <div className="px-4 py-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold"><Languages size={16} /> <span>{(["ko","en","mn","ru","zh"] as Lang[]).map(() => null) && "사용 언어 선택"}</span></div>
            <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(6.5rem,1fr))]">
              {(["ko","en","mn","ru","zh"] as Lang[]).map((l) => (
                <Button
                  key={l}
                  size="sm"
                  variant={lang === l ? "default" : "outline"}
                  className="min-w-0 h-auto min-h-11 px-2 py-2 text-[13px] leading-tight"
                  onClick={() => setLang(l).then(() => toast.success(`${LANG_FLAG[l]} ${LANG_LABEL[l]}`))}
                >
                  <span className="mr-1 shrink-0">{LANG_FLAG[l]}</span>
                  <span className="min-w-0 truncate">{LANG_LABEL[l]}</span>
                </Button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">메뉴와 공고가 선택한 언어로 표시됩니다.</p>
          </div>
        </CardContent></Card>
      )}

      <Card><CardContent className="p-0 divide-y">
        <SectionHeader>알림 설정</SectionHeader>
        <Row>
          <div className="flex items-center gap-2"><Bell size={16} /> <span>푸시 알림</span></div>
          <Switch checked={notifyPush} disabled={pushBusy} onCheckedChange={(v) => updateNotify(v, notifyMkt)} />
        </Row>
        {notifyPush && (
          <div className="px-4 py-3 flex items-center justify-between gap-3 text-sm flex-wrap">
            <span className="text-muted-foreground">앱 알림 권한: {pushPermission === "granted" ? "허용됨" : pushPermission === "denied" ? "차단됨" : pushPermission === "unsupported" ? "미지원" : "대기"}</span>
            <Button size="sm" variant="outline" disabled={pushBusy || pushPermission === "unsupported"} onClick={activatePush}>
              {pushBusy ? "등록 중..." : "권한 등록"}
            </Button>
          </div>
        )}
        {notifyPush && pushPlatform?.needsInstall && (
          <div className="px-4 pb-3 text-[11px] text-amber-600 leading-relaxed">
            아이폰에서 푸시 알림을 받으려면 Safari 하단의 <b>공유 → 홈 화면에 추가</b>로 앱을 설치한 뒤, 홈 화면 아이콘으로 실행해 권한을 등록해주세요.
          </div>
        )}
        {notifyPush && pushPermission === "denied" && (
          <div className="px-4 pb-3 text-[11px] text-red-600 leading-relaxed">
            브라우저(또는 시스템 설정)에서 알림이 차단되어 있습니다. 사이트 설정에서 알림을 허용으로 변경해주세요.
          </div>
        )}
        <Row>
          <div className="flex items-center gap-2"><Megaphone size={16} /> <span>마케팅/이벤트 알림</span></div>
          <Switch checked={notifyMkt} onCheckedChange={(v) => updateNotify(notifyPush, v)} />
        </Row>
      </CardContent></Card>

      <Card><CardContent className="p-0 divide-y">
        <SectionHeader>고객센터</SectionHeader>
        <LinkRow to="/notices" icon={<Megaphone size={16} />} label="공지사항" />
        <LinkRow to="/events" icon={<Gift size={16} />} label="이벤트" />
        <LinkRow to="/faq" icon={<HelpCircle size={16} />} label="자주 묻는 질문" />
        <LinkRow to="/inquiry" icon={<MessageSquare size={16} />} label="1:1 문의하기" />
      </CardContent></Card>

      <Card><CardContent className="p-0 divide-y">
        <SectionHeader>서비스</SectionHeader>
        <LinkRow to="/terms" icon={<FileText size={16} />} label="약관 및 정책" />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="w-full flex justify-between items-center px-4 py-3 text-sm hover:bg-muted/30 text-left">
              <div className="flex items-center gap-2 text-destructive"><UserX size={16} /> <span>회원 탈퇴</span></div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>정말 회원 탈퇴하시겠어요?</AlertDialogTitle>
              <AlertDialogDescription>
                회원 탈퇴 시 계정 정보, 프로필, 신청 내역, 알림 등 <b>모든 정보가 영구적으로 삭제</b>되며 복구할 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={async (e) => {
                  e.preventDefault();
                  if (deleting) return;
                  setDeleting(true);
                  try {
                    await deleteAccount();
                    await supabase.auth.signOut();
                    toast.success("회원 탈퇴가 완료되었습니다");
                    window.location.href = "/auth";
                  } catch (err: any) {
                    toast.error(err?.message ?? "탈퇴 처리 실패");
                    setDeleting(false);
                  }
                }}
              >
                {deleting ? "탈퇴 처리 중..." : "회원 탈퇴"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Row>
          <span>앱 버전</span>
          <div className="flex items-center gap-2">
            <span className="text-primary text-sm">{version?.version ?? "1.0.0"}</span>
            <Button size="sm" variant="outline" onClick={checkUpdate}>업데이트 확인</Button>
          </div>
        </Row>
      </CardContent></Card>

      <Button variant="outline" className="w-full" onClick={signOut}>로그아웃</Button>

      <Card className="bg-muted/40"><CardContent className="p-4 text-[11px] text-muted-foreground space-y-0.5">
        <p className="font-semibold text-foreground mb-1">사업자 정보</p>
        <p>회사명: {company.name}</p>
        <p>대표자: {company.ceo}</p>
        <p>사업자등록번호: {company.bizNo}</p>
        <p>통신판매업등록번호: {company.mailOrderNo}</p>
        {company.address && <p>주소: {company.address}</p>}
        {company.phone && <p>연락처: {company.phone}</p>}
        {company.email && <p>이메일: {company.email}</p>}
      </CardContent></Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>기본정보 수정</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>이름</Label><Input value={form.full_name ?? ""} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
            <div><Label>연락처</Label><Input value={form.phone ?? ""} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            {role === "employer" ? (
              <>
                <div><Label>업체명</Label><Input value={form.company_name ?? ""} onChange={e => setForm({ ...form, company_name: e.target.value })} /></div>
                <div><Label>담당자명</Label><Input value={form.manager_name ?? ""} onChange={e => setForm({ ...form, manager_name: e.target.value })} /></div>
                <div><Label>위치</Label><Input value={form.location ?? ""} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
                <div><Label>대표 연락처</Label><Input value={form.contact_phone ?? ""} onChange={e => setForm({ ...form, contact_phone: e.target.value })} /></div>
              </>
            ) : (
              <>
                <div><Label>국적</Label>
                  <Select value={form.nationality ?? "foreigner"} onValueChange={(v) => setForm({ ...form, nationality: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="foreigner">외국인</SelectItem>
                      <SelectItem value="korean">내국인</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>경력</Label>
                  <Select value={form.experience ?? "lt5"} onValueChange={(v) => setForm({ ...form, experience: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lt5">경력 5회 미만</SelectItem>
                      <SelectItem value="gte5">경력 5회 이상</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={!!form.korean_ok} onChange={(e) => setForm({ ...form, korean_ok: e.target.checked })} />
                  한국어 가능
                </label>
                {form.nationality === "foreigner" && (
                  <div><Label>비자 상태</Label>
                    <Select value={form.visa ?? ""} onValueChange={(v) => setForm({ ...form, visa: v })}>
                      <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">학생(D-2/D-4)</SelectItem>
                        <SelectItem value="jobseeker">구직(D-10)</SelectItem>
                        <SelectItem value="resident">거주(F-2/F-5/F-6)</SelectItem>
                        <SelectItem value="other">기타</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div><Label>선호 지역 (최대 3개)</Label>
                  <div className="mt-2"><RegionPicker value={form.preferred_regions ?? []} onChange={(v) => setForm({ ...form, preferred_regions: v })} /></div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>취소</Button>
            <Button onClick={saveEdit}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SectionHeader({ children }: { children: any }) {
  return <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/30">{children}</div>;
}
function Row({ children }: { children: any }) {
  return <div className="flex justify-between items-center px-4 py-3 text-sm">{children}</div>;
}
function LinkRow({ to, icon, label }: { to: string; icon: any; label: string }) {
  return (
    <Link to={to} className="flex justify-between items-center px-4 py-3 text-sm hover:bg-muted/30">
      <div className="flex items-center gap-2">{icon} <span>{label}</span></div>
      <ChevronRight size={16} className="text-muted-foreground" />
    </Link>
  );
}
