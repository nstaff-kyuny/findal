import { supabase } from "@/integrations/supabase/client";

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
  if (!userId || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return false;
  }
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

export async function requestPushPermissionAndSubscribe(userId: string): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "default") {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;
  }
  return registerPushSubscription(userId);
}

export async function ensurePushSubscription(userId: string): Promise<boolean> {
  try {
    return await registerPushSubscription(userId);
  } catch (e) {
    console.warn("[push] subscribe failed", e);
    return false;
  }
}
