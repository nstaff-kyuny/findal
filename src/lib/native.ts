/**
 * 네이티브(Capacitor) 런타임 감지 유틸.
 * 웹 브라우저/SSR 에서는 "web" 을 반환합니다.
 * Capacitor 브리지가 늦게 주입되는 경우에도 androidBridge / webkit bridge 를 직접 확인합니다.
 */

export type NativePlatform = "ios" | "android" | "web";

export function getNativePlatform(): NativePlatform {
  if (typeof window === "undefined") return "web";
  const w = window as any;
  const cap = w.Capacitor;
  try {
    if (cap?.isNativePlatform?.()) {
      const p = cap.getPlatform?.();
      if (p === "ios" || p === "android") return p;
    }
  } catch {}
  if (w.androidBridge) return "android";
  if (w.webkit?.messageHandlers?.bridge) return "ios";
  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  if (/FindAR|Capacitor/i.test(ua)) return /Android/i.test(ua) ? "android" : "ios";
  return "web";
}

export function isNativeApp(): boolean {
  return getNativePlatform() !== "web";
}

export function isNativeIOS(): boolean {
  return getNativePlatform() === "ios";
}

export function isNativeAndroid(): boolean {
  return getNativePlatform() === "android";
}
