/**
 * 네이티브(Capacitor) 런타임 감지 유틸.
 * 웹 브라우저에서는 모두 false 를 반환하며, SSR 에서도 안전합니다.
 * Capacitor 모듈은 항상 동적 import 로만 불러옵니다(웹/SSR 번들 안전).
 */

export type NativePlatform = "ios" | "android" | "web";

export function getNativePlatform(): NativePlatform {
  if (typeof window === "undefined") return "web";
  const cap = (window as any).Capacitor;
  if (!cap?.isNativePlatform?.()) return "web";
  const p = cap.getPlatform?.();
  return p === "ios" || p === "android" ? p : "web";
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
