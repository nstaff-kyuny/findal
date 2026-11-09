import { supabase } from "@/integrations/supabase/client";
import { getNativePlatform, isNativeApp } from "@/lib/native";

/**
 * 네이티브 앱(iOS/Android)의 푸시 알림.
 * - Android: FCM 토큰
 * - iOS: APNs 토큰 (Firebase 를 통해 FCM 토큰으로 발급)
 * 토큰은 `native_push_tokens` 테이블에 저장되고, 서버(/api/public/send-push)가
 * 웹푸시와 함께 함께 발송합니다.
 */

/** 네이티브 호출이 응답하지 않아도 화면이 '등록 중'에 멈추지 않도록 시간 제한 */
function withTimeout<T>(p: Promise<T>, ms: number, msg: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(msg)), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

/**
 * 주의: Capacitor 플러그인 객체는 Proxy 라서 async 함수에서 그대로 return 하면
 * Promise 가 이를 thenable 로 오인해 영원히 대기합니다. 반드시 객체로 감싸서 반환합니다.
 */
async function plugin() {
  const mod = await import("@capacitor/push-notifications");
  return { P: mod.PushNotifications };
}

async function saveToken(userId: string, token: string) {
  const platform = getNativePlatform();
  const { error } = await supabase.from("native_push_tokens" as any).upsert(
    {
      user_id: userId,
      token,
      platform,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    },
    { onConflict: "token" },
  );
  if (error) throw error;
}

/** 현재 네이티브 푸시 권한 상태 */
export async function getNativePushPermission(): Promise<"granted" | "denied" | "prompt"> {
  if (!isNativeApp()) return "denied";
  try {
    const { P: PushNotifications } = await plugin();
    const res = await withTimeout(PushNotifications.checkPermissions(), 5000, "timeout");
    if (res.receive === "granted") return "granted";
    if (res.receive === "denied") return "denied";
    return "prompt";
  } catch {
    return "denied";
  }
}

/** 권한 요청 + 토큰 등록 (설정 화면의 알림 스위치에서만 호출) */
export async function enableNativePush(userId: string): Promise<{ ok: boolean; reason?: string }> {
  if (!isNativeApp()) return { ok: false, reason: "네이티브 앱에서만 사용할 수 있습니다" };
  if (!userId) return { ok: false, reason: "로그인이 필요합니다" };
  const cap = (window as any).Capacitor;
  if (cap?.isPluginAvailable && !cap.isPluginAvailable("PushNotifications")) {
    return {
      ok: false,
      reason: "[코드 P1] 설치된 앱에 알림 기능이 포함되어 있지 않습니다. 앱을 새 버전으로 다시 빌드해야 합니다.",
    };
  }
  try {
    const { P: PushNotifications } = await withTimeout(plugin(), 8000, "[코드 P2] 알림 모듈을 불러오지 못했습니다");
    let perm = await withTimeout(PushNotifications.checkPermissions(), 8000, "[코드 P3] 알림 권한 확인이 응답하지 않습니다");
    if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
      // 사용자가 팝업에 응답할 시간을 충분히 줌
      perm = await withTimeout(PushNotifications.requestPermissions(), 60000, "알림 권한 요청 시간이 초과되었습니다. 다시 시도해 주세요.");
    }
    if (perm.receive !== "granted") {
      return { ok: false, reason: "휴대폰 설정 > 앱 > Find AR > 알림에서 알림을 허용해 주세요" };
    }

    let regErr = "";
    const handles: Array<{ remove: () => Promise<void> }> = [];
    let done: (v: string | null) => void = () => {};
    const tokenPromise = new Promise<string | null>((resolve) => { done = resolve; });
    const timer = setTimeout(() => done(null), 20000);
    try {
      handles.push(await withTimeout(PushNotifications.addListener("registration", (t) => {
        clearTimeout(timer);
        done(t.value);
      }), 5000, "listener timeout"));
      handles.push(await withTimeout(PushNotifications.addListener("registrationError", (err: any) => {
        regErr = err?.error ?? "";
        clearTimeout(timer);
        done(null);
      }), 5000, "listener timeout"));
      await withTimeout(PushNotifications.register(), 10000, "푸시 등록 요청이 응답하지 않습니다");
    } catch (e: any) {
      regErr = e?.message ?? String(e);
      clearTimeout(timer);
      done(null);
    }
    const token = await tokenPromise;
    handles.forEach((h) => h.remove().catch(() => {}));

    if (!token) {
      return {
        ok: false,
        reason: regErr
          ? `푸시 등록 실패: ${regErr}`
          : "푸시 토큰 발급에 실패했습니다. 앱을 최신 버전으로 업데이트한 뒤 다시 시도해 주세요.",
      };
    }
    await withTimeout(saveToken(userId, token), 10000, "알림 등록 정보를 저장하지 못했습니다. 네트워크를 확인해 주세요.");
    return { ok: true };
  } catch (e: any) {
    return { ok: false, reason: e?.message ?? "알 수 없는 오류" };
  }
}
/** 알림 끄기: 저장된 토큰 삭제 (기기 권한 자체는 OS 설정에서 관리) */
export async function disableNativePush(userId: string): Promise<void> {
  if (!isNativeApp() || !userId) return;
  try {
    await supabase.from("native_push_tokens" as any).delete().eq("user_id", userId).eq("platform", getNativePlatform());
  } catch (e) {
    console.warn("[native-push] disable failed", e);
  }
}

/**
 * 로그인/앱 실행 시 자동 등록: 처음이면 OS 권한 팝업을 띄우고,
 * 허용되어 있으면 조용히 토큰을 갱신합니다. 거부된 경우에는 다시 묻지 않습니다.
 */
export async function ensureNativePush(userId: string): Promise<boolean> {
  if (!isNativeApp() || !userId) return false;
  try {
    const perm = await getNativePushPermission();
    if (perm === "denied") return false;
    const res = await withTimeout(enableNativePush(userId), 90000, "timeout");
    return res.ok;
  } catch {
    return false;
  }
}

/** 알림 탭 시 앱 내 라우팅 */
export async function attachNativePushHandlers(navigate: (path: string) => void) {
  if (!isNativeApp()) return;
  try {
    const { P: PushNotifications } = await plugin();
    await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const link = (action.notification?.data as any)?.link_url || "/notifications";
      navigate(String(link));
    });
  } catch (e) {
    console.warn("[native-push] handler attach failed", e);
  }
}
