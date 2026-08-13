import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { isNativeApp, isNativeAndroid } from "@/lib/native";
import { attachNativePushHandlers } from "@/lib/native-push";

/**
 * 네이티브 앱(iOS/Android) 전용 초기화.
 * 웹 브라우저에서는 아무 동작도 하지 않습니다.
 * - 상태바 스타일
 * - Android 하드웨어 뒤로가기 처리
 * - 푸시 알림 탭 → 해당 화면 이동
 * - 스플래시 숨김
 */
export function NativeAppBoot() {
  const router = useRouter();

  useEffect(() => {
    if (!isNativeApp()) return;
    let cleanup: Array<() => void> = [];

    (async () => {
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        await StatusBar.setStyle({ style: Style.Light });
        if (isNativeAndroid()) await StatusBar.setBackgroundColor({ color: "#ffffff" });
      } catch {}

      try {
        const { SplashScreen } = await import("@capacitor/splash-screen");
        await SplashScreen.hide();
      } catch {}

      try {
        const { App } = await import("@capacitor/app");
        const sub = await App.addListener("backButton", ({ canGoBack }) => {
          if (canGoBack || window.history.length > 1) router.history.back();
          else App.exitApp();
        });
        cleanup.push(() => sub.remove());
      } catch {}

      await attachNativePushHandlers((path) => router.navigate({ to: path as any }).catch(() => {}));
    })();

    return () => {
      cleanup.forEach((fn) => {
        try {
          fn();
        } catch {}
      });
    };
  }, [router]);

  return null;
}
