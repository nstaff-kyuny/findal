/**
 * 관리자 대시보드 집계 헬퍼 (모든 날짜는 한국시간 KST = UTC+9 기준).
 * 서버 함수와 테스트에서 함께 사용하는 순수 함수만 둡니다.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, "0");

/** 날짜를 KST 기준 "YYYY-MM-DD" 로 */
export function kstDayKey(d: Date | string): string {
  const t = new Date(typeof d === "string" ? d : d.getTime()).getTime() + KST_OFFSET_MS;
  const k = new Date(t);
  return `${k.getUTCFullYear()}-${pad(k.getUTCMonth() + 1)}-${pad(k.getUTCDate())}`;
}

/** 날짜를 KST 기준 "YYYY-MM" 으로 */
export function kstMonthKey(d: Date | string): string {
  return kstDayKey(d).slice(0, 7);
}

/** KST 기준 해당 주의 월요일 "YYYY-MM-DD" */
export function kstWeekKey(d: Date | string): string {
  const t = new Date(typeof d === "string" ? d : d.getTime()).getTime() + KST_OFFSET_MS;
  const k = new Date(t);
  const dow = (k.getUTCDay() + 6) % 7; // 월=0 … 일=6
  return kstDayKey(new Date(t - KST_OFFSET_MS - dow * DAY_MS));
}

/** KST "YYYY-MM-DD" 하루의 시작 시각(UTC Date) */
export function kstDayStart(dayKey: string): Date {
  return new Date(Date.parse(`${dayKey}T00:00:00Z`) - KST_OFFSET_MS);
}

/** 어제(KST)의 [시작, 끝) 범위 */
export function kstYesterdayRange(now: Date): { start: Date; end: Date; key: string } {
  const todayStart = kstDayStart(kstDayKey(now));
  const start = new Date(todayStart.getTime() - DAY_MS);
  return { start, end: todayStart, key: kstDayKey(start) };
}

/** 최근 n일 KST 날짜 키 (오래된 순) */
export function lastNDayKeys(now: Date, n: number): string[] {
  const today = kstDayStart(kstDayKey(now)).getTime();
  return Array.from({ length: n }, (_, i) => kstDayKey(new Date(today - (n - 1 - i) * DAY_MS)));
}

/** 최근 n주 월요일 키 (오래된 순) */
export function lastNWeekKeys(now: Date, n: number): string[] {
  const thisWeek = kstDayStart(kstWeekKey(now)).getTime();
  return Array.from({ length: n }, (_, i) => kstDayKey(new Date(thisWeek - (n - 1 - i) * 7 * DAY_MS)));
}

/** 최근 n개월 키 (오래된 순) */
export function lastNMonthKeys(now: Date, n: number): string[] {
  const [y, m] = kstMonthKey(now).split("-").map(Number);
  return Array.from({ length: n }, (_, i) => {
    const total = y * 12 + (m - 1) - (n - 1 - i);
    return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`;
  });
}

export type Purchase = { created_at: string; amount_krw: number; pack: number };
export type PurchaseBucket = {
  key: string;
  count: number;
  amount: number;
  credits: number;
  cumAmount: number;
  cumCredits: number;
};

/**
 * 구매 내역을 기간 키별로 묶고 누적 합계를 계산합니다.
 * baseAmount/baseCredits 는 첫 구간 이전까지의 누적값(전체 기간 누적을 표시하기 위함).
 */
export function bucketPurchases(
  rows: Purchase[],
  keys: string[],
  keyOf: (iso: string) => string,
  baseAmount = 0,
  baseCredits = 0,
): PurchaseBucket[] {
  const map = new Map<string, { count: number; amount: number; credits: number }>();
  keys.forEach((k) => map.set(k, { count: 0, amount: 0, credits: 0 }));
  for (const r of rows) {
    const b = map.get(keyOf(r.created_at));
    if (!b) continue;
    b.count += 1;
    b.amount += Number(r.amount_krw) || 0;
    b.credits += Number(r.pack) || 0;
  }
  let cumAmount = baseAmount;
  let cumCredits = baseCredits;
  return keys.map((key) => {
    const b = map.get(key)!;
    cumAmount += b.amount;
    cumCredits += b.credits;
    return { key, ...b, cumAmount, cumCredits };
  });
}

export type SignupRole = "seeker" | "employer" | "none";

/** 사용자 역할 판별: 구인자 우선, 그다음 구직자, 나머지(관리자만/미선택)는 none */
export function signupRoleOf(roles: string[]): SignupRole {
  if (roles.includes("employer")) return "employer";
  if (roles.includes("seeker")) return "seeker";
  return "none";
}

/** 지정 범위 안에 가입한 사용자를 역할별로 셉니다. */
export function countSignups(
  profiles: { id: string; created_at: string }[],
  rolesByUser: Map<string, string[]>,
  start: Date,
  end: Date,
): { seeker: number; employer: number; none: number; total: number } {
  const out = { seeker: 0, employer: 0, none: 0, total: 0 };
  for (const p of profiles) {
    const t = Date.parse(p.created_at);
    if (t < start.getTime() || t >= end.getTime()) continue;
    out[signupRoleOf(rolesByUser.get(p.id) ?? [])] += 1;
    out.total += 1;
  }
  return out;
}

/** 배너 상태: 게시중 / 예약 / 종료 / 꺼짐 */
export function bannerState(
  b: { active: boolean; starts_at: string; ends_at: string },
  now: Date,
): "live" | "scheduled" | "ended" | "off" {
  if (!b.active) return "off";
  const t = now.getTime();
  if (Date.parse(b.ends_at) < t) return "ended";
  if (Date.parse(b.starts_at) > t) return "scheduled";
  return "live";
}
