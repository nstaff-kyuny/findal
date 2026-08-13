import { supabase } from "@/integrations/supabase/client";
import { getNativePlatform, isNativeApp } from "@/lib/native";

/**
 * 네이티브 앱(iOS/Android)의 푸시 알림.
 * - Android: FCM 토큰
 * - iOS: APNs 토큰 (Firebase 를 통해 FCM 토큰으로 발급)
 * 토큰은 `native_push_tokens` 테이블에 저장되고, 서버(/api/public/send-push)가
 * 웹푸시와 함께 함께 발송합니다.
 */

async function plugin() {
  const mod = await import("@capacitor/push-notifications");
  return mod.PushNotifications;
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
    const PushNotifications = await plugin();
    const res = await PushNotifications.checkPermissions();
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
  try {
    const PushNotifications = await plugin();
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== "granted") {
      return { ok: false, reason: "기기 설정에서 알림 권한을 허용해 주세요" };
    }

    const token = await new Promise<string | null>((resolve) => {
      const timer = setTimeout(() => resolve(null), 12000);
      PushNotifications.addListener("registration", (t) => {
        clearTimeout(timer);
        resolve(t.value);
      });
      PushNotifications.addListener("registrationError", () => {
        clearTimeout(timer);
        resolve(null);
      });
      PushNotifications.register();
    });

    if (!token) return { ok: false, reason: "푸시 토큰 발급에 실패했습니다. 잠시 후 다시 시도해 주세요." };
    await saveToken(userId, token);
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
    const PushNotifications = await plugin();
    await PushNotifications.removeAllListeners();
  } catch (e) {
    console.warn("[native-push] disable failed", e);
  }
}

/** 이미 권한이 허용된 경우에만 조용히 토큰을 갱신 (프롬프트 없음) */
export async function ensureNativePush(userId: string): Promise<boolean> {
  if (!isNativeApp() || !userId) return false;
  try {
    const perm = await getNativePushPermission();
    if (perm !== "granted") return false;
    const res = await enableNativePush(userId);
    return res.ok;
  } catch {
    return false;
  }
}

/** 알림 탭 시 앱 내 라우팅 */
export async function attachNativePushHandlers(navigate: (path: string) => void) {
  if (!isNativeApp()) return;
  try {
    const PushNotifications = await plugin();
    await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const link = (action.notification?.data as any)?.link_url || "/notifications";
      navigate(String(link));
    });
  } catch (e) {
    console.warn("[native-push] handler attach failed", e);
  }
}
