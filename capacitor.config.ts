import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Find AR (파인달) — 네이티브 앱(iOS/Android) 설정
 *
 * 기본 구성: 배포된 웹(https://findar.nstaff.co.kr)을 앱 안에서 로드하는 하이브리드 방식.
 *  - 장점: 웹을 배포하면 앱도 즉시 최신 상태(스토어 재심사 불필요)
 *  - 스토어 심사 대응: 단순 웹 래핑으로 보이지 않도록 네이티브 푸시 알림을 필수로 포함
 *
 * 완전 번들(오프라인 포함) 방식으로 전환하려면:
 *  1) 아래 `server` 블록을 제거
 *  2) 정적 빌드 결과 폴더를 webDir로 지정 (예: "dist/client")
 *  3) `bunx cap sync` 재실행
 * 단, 이 프로젝트는 SSR(서버 함수)에 의존하므로 완전 번들 전환 시
 * 서버 함수 호출 대상 도메인을 절대 URL로 바꿔야 합니다.
 */
const config: CapacitorConfig = {
  appId: "kr.co.nstaff.findar",
  appName: "Find AR",
  webDir: "dist/client",
  server: {
    url: "https://findar.nstaff.co.kr",
    cleartext: false,
    androidScheme: "https",
    // 앱 내부에서 열리도록 허용할 도메인 (그 외 링크는 외부 브라우저로 열림)
    allowNavigation: ["findar.nstaff.co.kr", "*.supabase.co", "*.tosspayments.com"],
  },
  ios: {
    contentInset: "always",
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#ffffff",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
    },
  },
};

export default config;
