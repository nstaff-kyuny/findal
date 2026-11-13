import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  bannerState,
  bucketPurchases,
  countSignups,
  kstDayKey,
  kstDayStart,
  kstMonthKey,
  kstWeekKey,
  kstYesterdayRange,
  lastNDayKeys,
  lastNMonthKeys,
  lastNWeekKeys,
  signupRoleOf,
} from "./admin-dashboard";
import { INDUSTRY_LABEL, ROLE_LABEL } from "./constants";

const CONTRACT_LABEL: Record<string, string> = { daily: "일당", monthly: "단기계약(월급)" };

/** 관리자 대시보드 데이터. 관리자 계정만 호출할 수 있습니다. */
export const getAdminDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: me, error: roleErr } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleErr) throw new Error(roleErr.message);
    if (!me) throw new Error("관리자 권한이 필요합니다");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    // 1000행 제한을 넘어도 모두 읽도록 나눠서 가져옵니다.
    async function fetchAll<T>(build: (from: number, to: number) => any): Promise<T[]> {
      const out: T[] = [];
      const size = 1000;
      for (let page = 0; page < 50; page++) {
        const { data, error } = await build(page * size, page * size + size - 1);
        if (error) throw new Error(error.message);
        out.push(...(data ?? []));
        if (!data || data.length < size) break;
      }
      return out;
    }

    const now = new Date();
    const todayKey = kstDayKey(now);
    const todayStart = kstDayStart(todayKey);
    const yesterday = kstYesterdayRange(now);
    const monthStart = kstDayStart(`${kstMonthKey(now)}-01`);
    const weekStart = kstDayStart(kstWeekKey(now));
    const nowIso = now.toISOString();

    const [
      profiles,
      roleRows,
      purchases,
      refunds,
      banners,
      notices,
      events,
      jobs,
      apps,
      txMonth,
      employerCredits,
      inquiriesOpen,
      promotedLive,
      pendingOrders,
      industries,
      jobRoles,
      latestVersion,
    ] = await Promise.all([
      fetchAll<{ id: string; created_at: string }>((a, b) =>
        db.from("profiles").select("id, created_at").order("created_at").range(a, b)),
      fetchAll<{ user_id: string; role: string }>((a, b) =>
        db.from("user_roles").select("user_id, role").range(a, b)),
      fetchAll<{ created_at: string; amount_krw: number; pack: number; payment_method: string | null }>((a, b) =>
        db.from("credit_purchase_requests").select("created_at, amount_krw, pack, payment_method")
          .eq("status", "fulfilled").order("created_at").range(a, b)),
      fetchAll<any>((a, b) =>
        db.from("refund_requests").select("id, employer_id, amount_krw, credits, reason, status, created_at")
          .order("created_at", { ascending: false }).range(a, b)),
      db.from("ad_banners").select("id, title, image_url, audience, active, starts_at, ends_at").order("starts_at", { ascending: false }),
      db.from("notices").select("id, title, pinned, active, created_at").order("created_at", { ascending: false }).limit(200),
      db.from("events").select("id, title, active, starts_at, ends_at"),
      fetchAll<any>((a, b) =>
        db.from("jobs").select("id, industry, job_role, contract_type, is_active, admin_hidden, headcount, created_at").range(a, b)),
      fetchAll<{ status: string; created_at: string; confirmed_at: string | null; no_show_at: string | null }>((a, b) =>
        db.from("job_applications").select("status, created_at, confirmed_at, no_show_at").range(a, b)),
      fetchAll<{ delta: number; type: string }>((a, b) =>
        db.from("credit_transactions").select("delta, type").gte("created_at", monthStart.toISOString()).range(a, b)),
      fetchAll<{ credits: number }>((a, b) => db.from("employer_profiles").select("credits").range(a, b)),
      db.from("inquiries").select("id", { count: "exact", head: true }).eq("status", "open"),
      db.from("promoted_jobs").select("id", { count: "exact", head: true }).gt("ends_at", nowIso),
      db.from("credit_orders").select("id", { count: "exact", head: true })
        .eq("status", "pending").gte("created_at", new Date(now.getTime() - 7 * 864e5).toISOString()),
      db.from("custom_industries").select("key, label"),
      db.from("custom_job_roles").select("key, label"),
      db.from("app_version").select("version, created_at").eq("is_latest", true).order("created_at", { ascending: false }).limit(1),
    ]);

    // ---------- 사용자 ----------
    const rolesByUser = new Map<string, string[]>();
    for (const r of roleRows) {
      const list = rolesByUser.get(r.user_id) ?? [];
      list.push(r.role);
      rolesByUser.set(r.user_id, list);
    }
    const roleTotals = { seeker: 0, employer: 0, none: 0 };
    let staff = 0;
    for (const p of profiles) {
      const rs = rolesByUser.get(p.id) ?? [];
      if (rs.includes("admin") || rs.includes("manager")) { staff += 1; continue; }
      roleTotals[signupRoleOf(rs)] += 1;
    }
    const tomorrowStart = new Date(todayStart.getTime() + 864e5);
    const signupDays = lastNDayKeys(now, 14).map((key) => {
      const start = kstDayStart(key);
      const c = countSignups(profiles, rolesByUser, start, new Date(start.getTime() + 864e5));
      return { key, ...c };
    });

    // ---------- 크레딧 구매 ----------
    const monthKeys = lastNMonthKeys(now, 6);
    const weekKeys = lastNWeekKeys(now, 8);
    const sumBefore = (iso: Date) => purchases.reduce(
      (acc, p) => (Date.parse(p.created_at) < iso.getTime()
        ? { amount: acc.amount + Number(p.amount_krw), credits: acc.credits + Number(p.pack) } : acc),
      { amount: 0, credits: 0 });
    const beforeMonths = sumBefore(kstDayStart(`${monthKeys[0]}-01`));
    const beforeWeeks = sumBefore(kstDayStart(weekKeys[0]));
    const sumSince = (from: Date) => purchases
      .filter((p) => Date.parse(p.created_at) >= from.getTime())
      .reduce((acc, p) => ({ count: acc.count + 1, amount: acc.amount + Number(p.amount_krw), credits: acc.credits + Number(p.pack) }),
        { count: 0, amount: 0, credits: 0 });
    const allTime = sumSince(new Date(0));

    const creditsUsedMonth = txMonth
      .filter((t) => t.type === "approval_use" || t.type === "promotion_use")
      .reduce((s, t) => s + Math.abs(Number(t.delta)), 0);

    // ---------- 환불 ----------
    const refundCounts: Record<string, number> = {};
    for (const r of refunds) refundCounts[r.status] = (refundCounts[r.status] ?? 0) + 1;
    const pendingRefunds = refunds.filter((r) => r.status === "pending");
    const refundEmpIds = Array.from(new Set(pendingRefunds.slice(0, 5).map((r) => r.employer_id)));
    const { data: refundEmps } = refundEmpIds.length
      ? await db.from("employer_profiles").select("user_id, company_name").in("user_id", refundEmpIds)
      : { data: [] };
    const companyOf = new Map<string, string>((refundEmps ?? []).map((e: any) => [e.user_id, e.company_name]));

    // ---------- 배너 ----------
    const bannerList = (banners.data ?? []).map((b: any) => ({ ...b, state: bannerState(b, now) }));
    const bannerSummary = (aud: string) => {
      const l = bannerList.filter((b: any) => b.audience === aud);
      return {
        live: l.filter((b: any) => b.state === "live").length,
        scheduled: l.filter((b: any) => b.state === "scheduled").length,
        ended: l.filter((b: any) => b.state === "ended" || b.state === "off").length,
      };
    };

    // ---------- 공지/이벤트 ----------
    const noticeRows = notices.data ?? [];
    const eventsLive = (events.data ?? []).filter((e: any) => bannerState(e, now) === "live").length;

    // ---------- 공고 ----------
    const industryLabel = new Map<string, string>(Object.entries(INDUSTRY_LABEL));
    (industries.data ?? []).forEach((r: any) => industryLabel.set(r.key, r.label));
    const roleLabel = new Map<string, string>(Object.entries(ROLE_LABEL));
    (jobRoles.data ?? []).forEach((r: any) => roleLabel.set(r.key, r.label));

    const exposedOf = (j: any) => j.is_active && !j.admin_hidden;
    const typeMap = new Map<string, { industry: string; role: string; exposed: number; posted: number; hidden: number }>();
    const contractMap = new Map<string, { label: string; exposed: number; posted: number }>();
    for (const j of jobs) {
      const k = `${j.industry}|${j.job_role}`;
      const t = typeMap.get(k) ?? {
        industry: industryLabel.get(j.industry) ?? j.industry,
        role: roleLabel.get(j.job_role) ?? j.job_role,
        exposed: 0, posted: 0, hidden: 0,
      };
      t.posted += 1;
      if (exposedOf(j)) t.exposed += 1;
      if (j.admin_hidden) t.hidden += 1;
      typeMap.set(k, t);
      const c = contractMap.get(j.contract_type) ?? { label: CONTRACT_LABEL[j.contract_type] ?? j.contract_type, exposed: 0, posted: 0 };
      c.posted += 1;
      if (exposedOf(j)) c.exposed += 1;
      contractMap.set(j.contract_type, c);
    }
    const jobsCreatedMonth = jobs.filter((j) => Date.parse(j.created_at) >= monthStart.getTime()).length;

    // ---------- 신청 ----------
    const appToday = apps.filter((a) => Date.parse(a.created_at) >= todayStart.getTime()).length;
    const appPending = apps.filter((a) => a.status === "pending").length;
    const appConfirmedMonth = apps.filter((a) => a.confirmed_at && Date.parse(a.confirmed_at) >= monthStart.getTime()).length;
    const noShowMonth = apps.filter((a) => a.no_show_at && Date.parse(a.no_show_at) >= monthStart.getTime()).length;

    return {
      generatedAt: nowIso,
      todayKey,
      yesterdayKey: yesterday.key,
      users: {
        total: profiles.length,
        seekers: roleTotals.seeker,
        employers: roleTotals.employer,
        noRole: roleTotals.none,
        staff,
        yesterday: countSignups(profiles, rolesByUser, yesterday.start, yesterday.end),
        today: countSignups(profiles, rolesByUser, todayStart, tomorrowStart),
        last14Days: signupDays,
      },
      credits: {
        today: sumSince(todayStart),
        week: sumSince(weekStart),
        month: sumSince(monthStart),
        allTime,
        monthly: bucketPurchases(purchases, monthKeys, kstMonthKey, beforeMonths.amount, beforeMonths.credits),
        weekly: bucketPurchases(purchases, weekKeys, kstWeekKey, beforeWeeks.amount, beforeWeeks.credits),
        creditsUsedMonth,
        creditsHeld: employerCredits.reduce((s, e) => s + Number(e.credits || 0), 0),
        pendingCheckouts7d: pendingOrders.count ?? 0,
      },
      refunds: {
        pending: refundCounts["pending"] ?? 0,
        approved: (refundCounts["approved"] ?? 0) + (refundCounts["completed"] ?? 0),
        rejected: refundCounts["rejected"] ?? 0,
        cancelled: refundCounts["cancelled"] ?? 0,
        pendingAmount: pendingRefunds.reduce((s, r) => s + Number(r.amount_krw || 0), 0),
        recentPending: pendingRefunds.slice(0, 5).map((r) => ({
          id: r.id,
          company: companyOf.get(r.employer_id) ?? "-",
          amount_krw: r.amount_krw,
          credits: r.credits,
          reason: r.reason,
          created_at: r.created_at,
        })),
      },
      banners: {
        seeker: bannerSummary("seeker"),
        employer: bannerSummary("employer"),
        live: bannerList.filter((b: any) => b.state === "live").slice(0, 8).map((b: any) => ({
          id: b.id, title: b.title, image_url: b.image_url, audience: b.audience, ends_at: b.ends_at,
        })),
      },
      notices: {
        activeCount: noticeRows.filter((n: any) => n.active).length,
        recent: noticeRows.slice(0, 5),
        eventsLive,
      },
      jobs: {
        total: jobs.length,
        exposed: jobs.filter(exposedOf).length,
        hidden: jobs.filter((j) => j.admin_hidden).length,
        closed: jobs.filter((j) => !j.is_active && !j.admin_hidden).length,
        createdThisMonth: jobsCreatedMonth,
        promotedLive: promotedLive.count ?? 0,
        byType: Array.from(typeMap.values()).sort((a, b) => b.posted - a.posted),
        byContract: Array.from(contractMap.values()),
      },
      applications: {
        today: appToday,
        pending: appPending,
        confirmedThisMonth: appConfirmedMonth,
        noShowThisMonth: noShowMonth,
      },
      inquiriesOpen: inquiriesOpen.count ?? 0,
      latestVersion: latestVersion.data?.[0]?.version ?? null,
    };
  });
