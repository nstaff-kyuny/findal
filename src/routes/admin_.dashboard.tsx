import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Users, UserPlus, CreditCard, Undo2, Megaphone, Bell, Briefcase, RefreshCw, LogOut, LayoutDashboard,
  ClipboardCheck, Smartphone,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isNativeApp } from "@/lib/native";
import { getAdminDashboard } from "@/lib/admin-dashboard.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/admin_/dashboard")({
  head: () => ({
    meta: [
      { title: "관리자 대시보드 | Find AR 파인달" },
      { name: "description", content: "Find AR(파인달) 관리자 전용 운영 현황 대시보드입니다." },
      { property: "og:title", content: "관리자 대시보드 | Find AR 파인달" },
      { property: "og:description", content: "Find AR(파인달) 관리자 전용 운영 현황 대시보드입니다." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminDashboardPage,
});

type Dashboard = Awaited<ReturnType<typeof getAdminDashboard>>;

const won = (n: number) => `${Number(n || 0).toLocaleString("ko-KR")}원`;
const num = (n: number) => Number(n || 0).toLocaleString("ko-KR");
const md = (key: string) => { const [, m, d] = key.split("-"); return `${Number(m)}/${Number(d)}`; };
const ym = (key: string) => { const [y, m] = key.split("-"); return `${y.slice(2)}.${m}`; };
const dateTime = (iso: string) => new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
const dateOnly = (iso: string) => new Date(iso).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric" });

const DASHBOARD_URL = "https://findar.nstaff.co.kr/admin/dashboard";

function AdminDashboardPage() {
  const { user, roles, loading, signOut } = useAuth();
  const nav = useNavigate();
  const [native, setNative] = useState(false);
  useEffect(() => { setNative(isNativeApp()); }, []);
  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [loading, user]);

  if (loading || !user) {
    return <CenterMessage title="불러오는 중…" />;
  }
  if (native) {
    return (
      <CenterMessage
        icon={<Smartphone className="h-8 w-8 text-primary" />}
        title="대시보드는 인터넷 브라우저에서 확인해 주세요"
        body={<>설치한 앱에서는 열 수 없습니다. 휴대폰의 크롬·사파리 등 브라우저에서 아래 주소로 접속해 관리자 계정으로 로그인하세요.<br /><span className="font-mono text-foreground break-all">{DASHBOARD_URL}</span></>}
      >
        <Button onClick={async () => { try { await navigator.clipboard.writeText(DASHBOARD_URL); toast.success("주소를 복사했습니다"); } catch { toast.error("복사하지 못했습니다"); } }}>주소 복사</Button>
      </CenterMessage>
    );
  }
  if (!roles.includes("admin")) {
    return (
      <CenterMessage title="관리자만 볼 수 있는 페이지입니다" body="관리자 계정으로 다시 로그인해 주세요.">
        <Button onClick={async () => { await signOut(); nav({ to: "/auth" }); }}>로그아웃 후 관리자로 로그인</Button>
      </CenterMessage>
    );
  }
  return <DashboardView email={user.email ?? ""} onSignOut={async () => { await signOut(); nav({ to: "/auth", replace: true }); }} />;
}

function CenterMessage({ icon, title, body, children }: { icon?: React.ReactNode; title: string; body?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center bg-muted/30">
      <div className="max-w-sm w-full space-y-3">
        {icon && <div className="flex justify-center">{icon}</div>}
        <h1 className="font-bold text-lg">{title}</h1>
        {body && <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>}
        {children && <div className="flex flex-col gap-2 pt-2">{children}</div>}
      </div>
    </div>
  );
}

function DashboardView({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  const fetchDashboard = useServerFn(getAdminDashboard);
  const [data, setData] = useState<Dashboard | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setBusy(true);
    setError(null);
    try {
      setData(await fetchDashboard());
    } catch (e: any) {
      setError(e?.message ?? "불러오지 못했습니다");
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-3 flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5 text-primary shrink-0" />
          <div className="min-w-0 flex-1">
            <h1 className="font-bold text-base lg:text-xl text-primary truncate">Find AR · 관리자 대시보드</h1>
            <p className="text-[11px] text-muted-foreground truncate">
              {data ? `${dateTime(data.generatedAt)} 기준 · ` : ""}{email}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={load} disabled={busy} aria-label="새로고침">
            <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">새로고침</span>
          </Button>
          <Button size="sm" variant="outline" asChild className="hidden lg:inline-flex">
            <Link to="/admin">관리자 페이지</Link>
          </Button>
          <Button size="sm" variant="ghost" onClick={onSignOut} aria-label="로그아웃">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">로그아웃</span>
          </Button>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 lg:px-8 py-4 lg:py-6 space-y-4 lg:space-y-6">
        {error && (
          <Card className="border-destructive"><CardContent className="p-4 text-sm text-destructive flex items-center justify-between gap-2">
            <span>{error}</span><Button size="sm" variant="outline" onClick={load}>다시 시도</Button>
          </CardContent></Card>
        )}
        {!data && !error && <div className="py-24 text-center text-sm text-muted-foreground">대시보드를 불러오는 중…</div>}
        {data && <DashboardBody d={data} />}
      </main>
    </div>
  );
}

function Kpi({ icon, label, value, sub, tone = "default" }: { icon: React.ReactNode; label: string; value: string; sub?: React.ReactNode; tone?: "default" | "alert" }) {
  return (
    <Card className={tone === "alert" ? "border-destructive/50" : undefined}>
      <CardContent className="p-3 lg:p-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}<span className="truncate">{label}</span></div>
        <div className={`mt-1 text-xl lg:text-2xl font-bold tabular-nums ${tone === "alert" ? "text-destructive" : "text-foreground"}`}>{value}</div>
        {sub && <div className="mt-0.5 text-[11px] lg:text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function Section({ icon, title, right, children }: { icon: React.ReactNode; title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="p-4 pb-2 flex-row items-center justify-between space-y-0 gap-2">
        <CardTitle className="text-sm lg:text-base flex items-center gap-2">{icon}{title}</CardTitle>
        {right}
      </CardHeader>
      <CardContent className="p-4 pt-2">{children}</CardContent>
    </Card>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: "alert" | "muted" }) {
  return (
    <div className="rounded-md bg-muted/50 px-3 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`text-base font-semibold tabular-nums ${tone === "alert" ? "text-destructive" : tone === "muted" ? "text-muted-foreground" : "text-foreground"}`}>{value}</div>
    </div>
  );
}

const AUDIENCE_LABEL: Record<string, string> = { seeker: "구직자용", employer: "구인자용" };

function DashboardBody({ d }: { d: Dashboard }) {
  const signupChart = d.users.last14Days.map((r) => ({ name: md(r.key), 구직자: r.seeker, 구인자: r.employer, 기타: r.none }));
  const monthChart = d.credits.monthly.map((r) => ({ name: ym(r.key), 매출: r.amount, 누적매출: r.cumAmount, 건수: r.count, 크레딧: r.credits, 누적크레딧: r.cumCredits }));
  const weekChart = d.credits.weekly.map((r) => ({ name: `${md(r.key)}~`, 매출: r.amount, 누적매출: r.cumAmount, 건수: r.count, 크레딧: r.credits, 누적크레딧: r.cumCredits }));

  return (
    <>
      {/* 핵심 지표 */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi icon={<Users className="h-3.5 w-3.5" />} label="전체 사용자" value={`${num(d.users.total)}명`}
          sub={`구직자 ${num(d.users.seekers)} · 구인자 ${num(d.users.employers)} · 미선택 ${num(d.users.noRole)}`} />
        <Kpi icon={<UserPlus className="h-3.5 w-3.5" />} label={`어제 가입 (${md(d.yesterdayKey)})`} value={`${num(d.users.yesterday.total)}명`}
          sub={`구직자 ${num(d.users.yesterday.seeker)} · 구인자 ${num(d.users.yesterday.employer)}`} />
        <Kpi icon={<UserPlus className="h-3.5 w-3.5" />} label="오늘 가입" value={`${num(d.users.today.total)}명`}
          sub={`구직자 ${num(d.users.today.seeker)} · 구인자 ${num(d.users.today.employer)}`} />
        <Kpi icon={<CreditCard className="h-3.5 w-3.5" />} label="이번 달 크레딧 매출" value={won(d.credits.month.amount)}
          sub={`${num(d.credits.month.count)}건 · ${num(d.credits.month.credits)}크레딧`} />
        <Kpi icon={<Undo2 className="h-3.5 w-3.5" />} label="처리 대기 환불" value={`${num(d.refunds.pending)}건`}
          sub={d.refunds.pending ? won(d.refunds.pendingAmount) : "대기 없음"} tone={d.refunds.pending ? "alert" : "default"} />
        <Kpi icon={<Briefcase className="h-3.5 w-3.5" />} label="노출 중 공고" value={`${num(d.jobs.exposed)}건`}
          sub={`전체 게시 ${num(d.jobs.total)}건`} />
      </div>

      {/* 운영 지표 */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2">
        <MiniStat label="오늘 일하기 신청" value={`${num(d.applications.today)}건`} />
        <MiniStat label="승인 대기 신청" value={`${num(d.applications.pending)}건`} tone={d.applications.pending ? "alert" : undefined} />
        <MiniStat label="이번 달 출근 확정" value={`${num(d.applications.confirmedThisMonth)}건`} />
        <MiniStat label="이번 달 노쇼" value={`${num(d.applications.noShowThisMonth)}건`} />
        <MiniStat label="미답변 1:1 문의" value={`${num(d.inquiriesOpen)}건`} tone={d.inquiriesOpen ? "alert" : undefined} />
        <MiniStat label="이번 달 사용 크레딧" value={num(d.credits.creditsUsedMonth)} />
        <MiniStat label="구인자 보유 크레딧" value={num(d.credits.creditsHeld)} />
        <MiniStat label="최신 앱 버전" value={d.latestVersion ?? "-"} tone="muted" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 lg:gap-6">
        {/* 가입 추이 */}
        <Section icon={<UserPlus className="h-4 w-4 text-primary" />} title="최근 14일 가입 추이">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={signupChart} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="구직자" stackId="a" fill="var(--primary)" />
                <Bar dataKey="구인자" stackId="a" fill="var(--chart-2)" />
                <Bar dataKey="기타" stackId="a" fill="var(--muted-foreground)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">기타: 가입 후 아직 구직자/구인자를 선택하지 않은 회원 · 전체 사용자에는 관리자/보조관리자 {num(d.users.staff)}명 포함</p>
        </Section>

        {/* 크레딧 구매 */}
        <Section icon={<CreditCard className="h-4 w-4 text-primary" />} title="크레딧 구매 현황">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <MiniStat label="오늘" value={won(d.credits.today.amount)} />
            <MiniStat label="이번 주" value={won(d.credits.week.amount)} />
            <MiniStat label="이번 달" value={won(d.credits.month.amount)} />
            <MiniStat label={`누적 (${num(d.credits.allTime.count)}건)`} value={won(d.credits.allTime.amount)} />
          </div>
          <Tabs defaultValue="monthly">
            <TabsList className="h-8">
              <TabsTrigger value="monthly" className="text-xs">월별 (6개월)</TabsTrigger>
              <TabsTrigger value="weekly" className="text-xs">주별 (8주)</TabsTrigger>
            </TabsList>
            <TabsContent value="monthly"><PurchaseChart rows={monthChart} /></TabsContent>
            <TabsContent value="weekly"><PurchaseChart rows={weekChart} /></TabsContent>
          </Tabs>
          {d.credits.pendingCheckouts7d > 0 && (
            <p className="text-[11px] text-muted-foreground mt-2">최근 7일 결제창을 열고 완료하지 않은 주문 {num(d.credits.pendingCheckouts7d)}건 (매출에 포함되지 않음)</p>
          )}
        </Section>
      </div>

      {/* 공고 형태별 */}
      <Section icon={<Briefcase className="h-4 w-4 text-primary" />} title="공고 형태별 노출·게시 현황"
        right={<Badge variant="secondary" className="text-[11px]">상단 광고 중 {num(d.jobs.promotedLive)}건</Badge>}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <MiniStat label="노출 중" value={`${num(d.jobs.exposed)}건`} />
          <MiniStat label="마감·비활성" value={`${num(d.jobs.closed)}건`} tone="muted" />
          <MiniStat label="관리자 비노출" value={`${num(d.jobs.hidden)}건`} tone={d.jobs.hidden ? "alert" : undefined} />
          <MiniStat label="이번 달 새 공고" value={`${num(d.jobs.createdThisMonth)}건`} />
        </div>
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-sm min-w-[420px]">
            <thead>
              <tr className="text-xs text-muted-foreground border-b">
                <th className="text-left font-medium py-2">업종</th>
                <th className="text-left font-medium py-2">직무</th>
                <th className="text-right font-medium py-2">노출 중</th>
                <th className="text-right font-medium py-2">게시 수량</th>
                <th className="text-right font-medium py-2">비노출</th>
              </tr>
            </thead>
            <tbody>
              {d.jobs.byType.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-muted-foreground text-xs">등록된 공고가 없습니다</td></tr>
              )}
              {d.jobs.byType.map((t) => (
                <tr key={`${t.industry}-${t.role}`} className="border-b last:border-0">
                  <td className="py-2">{t.industry}</td>
                  <td className="py-2">{t.role}</td>
                  <td className="py-2 text-right tabular-nums font-semibold text-primary">{num(t.exposed)}</td>
                  <td className="py-2 text-right tabular-nums">{num(t.posted)}</td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">{num(t.hidden)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {d.jobs.byContract.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {d.jobs.byContract.map((c) => (
              <Badge key={c.label} variant="outline" className="text-xs font-normal">{c.label}: 노출 {num(c.exposed)} / 게시 {num(c.posted)}</Badge>
            ))}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground mt-2">노출 중 = 지금 구직자 앱에 보이는 공고 · 게시 수량 = 지금까지 등록된 전체 공고</p>
      </Section>

      <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
        {/* 환불 */}
        <Section icon={<Undo2 className="h-4 w-4 text-primary" />} title="환불 신청 현황">
          <div className="grid grid-cols-2 gap-2 mb-3">
            <MiniStat label="처리 대기" value={`${num(d.refunds.pending)}건`} tone={d.refunds.pending ? "alert" : undefined} />
            <MiniStat label="승인·완료" value={`${num(d.refunds.approved)}건`} />
            <MiniStat label="거절" value={`${num(d.refunds.rejected)}건`} tone="muted" />
            <MiniStat label="신청 취소" value={`${num(d.refunds.cancelled)}건`} tone="muted" />
          </div>
          {d.refunds.recentPending.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">처리할 환불 신청이 없습니다</p>
          ) : (
            <ul className="space-y-2">
              {d.refunds.recentPending.map((r) => (
                <li key={r.id} className="text-sm border rounded-md p-2">
                  <div className="flex justify-between gap-2"><span className="font-medium truncate">{r.company}</span><span className="tabular-nums shrink-0">{won(r.amount_krw)}</span></div>
                  <div className="text-[11px] text-muted-foreground truncate">{dateTime(r.created_at)} · {r.reason}</div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* 광고 배너 */}
        <Section icon={<Megaphone className="h-4 w-4 text-primary" />} title="광고 배너 게시 현황">
          <div className="space-y-2 mb-3">
            {(["seeker", "employer"] as const).map((aud) => (
              <div key={aud} className="flex items-center justify-between text-sm rounded-md bg-muted/50 px-3 py-2">
                <span className="font-medium">{AUDIENCE_LABEL[aud]}</span>
                <span className="text-xs tabular-nums">
                  <span className="text-primary font-semibold">게시 {d.banners[aud].live}</span>
                  <span className="text-muted-foreground"> · 예약 {d.banners[aud].scheduled} · 종료/꺼짐 {d.banners[aud].ended}</span>
                </span>
              </div>
            ))}
          </div>
          {d.banners.live.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">지금 게시 중인 배너가 없습니다</p>
          ) : (
            <ul className="space-y-2">
              {d.banners.live.map((b: any) => (
                <li key={b.id} className="flex items-center gap-2">
                  {b.image_url ? (
                    <img src={b.image_url} alt={b.title} className="h-10 w-24 object-cover rounded border shrink-0" loading="lazy" />
                  ) : <div className="h-10 w-24 rounded border bg-muted shrink-0" />}
                  <div className="min-w-0">
                    <div className="text-sm truncate">{b.title}</div>
                    <div className="text-[11px] text-muted-foreground">{AUDIENCE_LABEL[b.audience] ?? b.audience} · {dateOnly(b.ends_at)}까지</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* 공지사항 */}
        <Section icon={<Bell className="h-4 w-4 text-primary" />} title="공지사항"
          right={<span className="text-[11px] text-muted-foreground">게시 {num(d.notices.activeCount)} · 진행 이벤트 {num(d.notices.eventsLive)}</span>}>
          {d.notices.recent.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">등록된 공지가 없습니다</p>
          ) : (
            <ul className="divide-y">
              {d.notices.recent.map((n: any) => (
                <li key={n.id} className="py-2 flex items-center gap-2">
                  {n.pinned && <Badge className="text-[10px] px-1.5 py-0">고정</Badge>}
                  <span className={`text-sm truncate flex-1 ${n.active ? "" : "text-muted-foreground line-through"}`}>{n.title}</span>
                  <span className="text-[11px] text-muted-foreground shrink-0">{dateOnly(n.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <p className="text-center text-[11px] text-muted-foreground pb-6 flex items-center justify-center gap-1">
        <ClipboardCheck className="h-3 w-3" /> 모든 날짜는 한국시간 기준이며, 크레딧 매출은 지급 완료된 구매만 집계합니다.
      </p>
    </>
  );
}

function PurchaseChart({ rows }: { rows: any[] }) {
  return (
    <>
      <div className="h-56 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis yAxisId="l" tick={{ fontSize: 10 }} width={44} tickFormatter={(v) => (v >= 10000 ? `${Math.round(v / 10000)}만` : String(v))} />
            <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10 }} width={44} tickFormatter={(v) => (v >= 10000 ? `${Math.round(v / 10000)}만` : String(v))} />
            <Tooltip formatter={(v: any) => won(Number(v))} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="l" dataKey="매출" fill="var(--primary)" radius={[3, 3, 0, 0]} />
            <Line yAxisId="r" dataKey="누적매출" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 2 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="overflow-x-auto -mx-4 px-4 mt-2">
        <table className="w-full text-xs min-w-[380px]">
          <thead>
            <tr className="text-muted-foreground border-b">
              <th className="text-left font-medium py-1.5">기간</th>
              <th className="text-right font-medium py-1.5">건수</th>
              <th className="text-right font-medium py-1.5">매출</th>
              <th className="text-right font-medium py-1.5">크레딧</th>
              <th className="text-right font-medium py-1.5">누적 매출</th>
            </tr>
          </thead>
          <tbody>
            {[...rows].reverse().map((r) => (
              <tr key={r.name} className="border-b last:border-0 tabular-nums">
                <td className="py-1.5">{r.name}</td>
                <td className="py-1.5 text-right">{num(r.건수)}</td>
                <td className="py-1.5 text-right">{won(r.매출)}</td>
                <td className="py-1.5 text-right">{num(r.크레딧)}</td>
                <td className="py-1.5 text-right font-medium">{won(r.누적매출)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
