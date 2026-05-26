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

export async function ensurePushSubscription(userId: string): Promise<boolean> {
  try {
    if (typeof window === "undefined") return false;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      return false;
    }

    // Register SW
    const reg =
      (await navigator.serviceWorker.getRegistration("/sw.js")) ||
      (await navigator.serviceWorker.register("/sw.js"));
    await navigator.serviceWorker.ready;

    // Ask permission if not yet decided
    if (Notification.permission === "default") {
      const p = await Notification.requestPermission();
      if (p !== "granted") return false;
    }
    if (Notification.permission !== "granted") return false;

    // Existing subscription?
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

    await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent,
      },
      { onConflict: "endpoint" }
    );
    return true;
  } catch (e) {
    console.warn("[push] subscribe failed", e);
    return false;
  }
}
