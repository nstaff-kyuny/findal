import { supabase } from "@/integrations/supabase/client";
import { getNativePlatform, isNativeApp } from "@/lib/native";
import {
  enableNativePush,
  disableNativePush,
  ensureNativePush,
  getNativePushPermission,
} from "@/lib/native-push";

// Public VAPID key — safe to expose
export const VAPID_PUBLIC_KEY =
  "BM55aBJjAuCnvi5fneXL_JdG10_G_QjVDFMtaIneZluKJzh1QxrWRcJdcF8jWjApPav8V4FqkCPcattZAny0Zsg";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function arrayBufferToBase64(buf: ArrayBuffer | null) {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export type PushPlatform = {
  supported: boolean;
  isIOS: boolean;
  isStandalone: boolean;
  needsInstall: boolean; // iOS Safari requires PWA install before push works
  isNative?: boolean; // 앱스토어/플레이스토어에서 설치한 네이티브 앱
  reason?: string;
};

export function detectPushPlatform(): PushPlatform {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { supported: false, isIOS: false, isStandalone: false, needsInstall: false, reason: "환경 미지원" };
  }
  // 네이티브 앱: OS 푸시(APNs/FCM)를 사용하므로 항상 지원
  if (isNativeApp()) {
    return {
      supported: true,
      isIOS: getNativePlatform() === "ios",
      isStandalone: true,
      needsInstall: false,
      isNative: true,
    };
  }
  const ua = navigator.userAgent || "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;
  const hasSW = "serviceWorker" in navigator;
  const hasPush = "PushManager" in window;
  const hasNotif = "Notification" in window;

  if (!hasSW || !hasPush || !hasNotif) {
    if (isIOS && !isStandalone) {
      return { supported: false, isIOS, isStandalone, needsInstall: true, reason: "iOS는 홈 화면에 추가 후 사용 가능" };
    }
    return { supported: false, isIOS, isStandalone, needsInstall: false, reason: "브라우저가 푸시 알림을 지원하지 않습니다" };
  }
  if (isIOS && !isStandalone) {
    return { supported: false, isIOS, isStandalone, needsInstall: true, reason: "iOS는 홈 화면에 추가 후 사용 가능" };
  }
  return { supported: true, isIOS, isStandalone, needsInstall: false };
}

async function getServiceWorkerRegistration() {
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing?.active?.scriptURL.endsWith("/sw.js")) return existing;

  if (existing && !existing.active?.scriptURL.endsWith("/sw.js")) {
    await existing.unregister().catch(() => false);
  }

  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  return reg;
}

export async function registerPushSubscription(userId: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const plat = detectPushPlatform();
  if (!plat.supported) return false;
  if (!userId) return false;
  if (Notification.permission !== "granted") return false;

  const reg = await getServiceWorkerRegistration();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const json = sub.toJSON();
  const endpoint = sub.endpoint;
  const p256dh = json.keys?.p256dh ?? arrayBufferToBase64(sub.getKey("p256dh"));
  const auth = json.keys?.auth ?? arrayBufferToBase64(sub.getKey("auth"));

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint,
      p256dh,
      auth,
      user_agent: navigator.userAgent,
    },
    { onConflict: "endpoint" }
  );
  if (error) throw error;
  return true;
}

export async function requestPushPermissionAndSubscribe(userId: string): Promise<{ ok: boolean; reason?: string }> {
  // 네이티브 앱은 OS 푸시(APNs/FCM) 사용
  if (isNativeApp()) return enableNativePush(userId);

  const plat = detectPushPlatform();
  if (!plat.supported) return { ok: false, reason: plat.reason };
  try {
    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return { ok: false, reason: "알림 권한이 거부되었습니다" };
    }
    if (Notification.permission !== "granted") {
      return { ok: false, reason: "브라우저에서 알림이 차단되었습니다. 사이트 설정을 확인하세요." };
    }
    const ok = await registerPushSubscription(userId);
    return ok ? { ok: true } : { ok: false, reason: "푸시 등록에 실패했습니다" };
  } catch (e: any) {
    return { ok: false, reason: e?.message ?? "알 수 없는 오류" };
  }
}

export async function unsubscribePush(userId: string): Promise<void> {
  try {
    if (isNativeApp()) {
      await disableNativePush(userId);
      return;
    }
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe().catch(() => false);
      await supabase.from("push_subscriptions").delete().eq("user_id", userId).eq("endpoint", endpoint);
    }
  } catch (e) {
    console.warn("[push] unsubscribe failed", e);
  }
}

export async function ensurePushSubscription(userId: string): Promise<boolean> {
  try {
    if (isNativeApp()) return await ensureNativePush(userId);
    // Silent refresh ONLY when permission is already granted — never prompts.
    if (typeof window === "undefined" || !("Notification" in window)) return false;
    if (Notification.permission !== "granted") return false;
    return await registerPushSubscription(userId);
  } catch (e) {
    console.warn("[push] subscribe failed", e);
    return false;
  }
}

/** 설정 화면에서 표시할 현재 알림 권한 상태 (웹/네이티브 통합) */
export async function getPushPermissionState(): Promise<NotificationPermission | "unsupported"> {
  if (isNativeApp()) {
    const p = await getNativePushPermission();
    return p === "granted" ? "granted" : p === "denied" ? "denied" : "default";
  }
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

