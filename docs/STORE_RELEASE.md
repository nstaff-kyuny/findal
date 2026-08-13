# Find AR — 앱스토어 / 플레이스토어 등록 가이드

## 0. 현재 구현 상태 (코드 기준)

- Capacitor 설정: `capacitor.config.ts` (App ID `kr.co.nstaff.findar`, 서버 URL `https://findar.nstaff.co.kr`)
- 네이티브 감지: `src/lib/native.ts`
- 네이티브 푸시(FCM/APNs): `src/lib/native-push.ts` + 토큰 저장 표 `native_push_tokens`
- 알림 발송 서버: `src/routes/api/public/send-push.ts` — 네이티브(FCM v1) + 웹푸시 동시 발송
- 앱 초기화(상태바/뒤로가기/알림 탭 이동/스플래시): `src/components/NativeAppBoot.tsx`
- iOS 인앱결제 정책 회피: iOS 네이티브 앱에서는 크레딧 구매 버튼 숨김 + PC 페이지 안내
- 알림 on/off 는 설정 화면에서만 관리 (`src/components/SettingsPage.tsx`)
- 회원탈퇴(계정 삭제)는 설정 화면에 이미 존재 (두 스토어 필수 요건 충족)

## 1. 필요한 계정·비용

| 항목 | 내용 |
| --- | --- |
| Apple Developer Program | 연 $99 (법인은 D-U-N-S 번호 필요) |
| Google Play Console | 1회 $25 (법인 계정 권장) |
| Firebase 프로젝트 | 무료 — 푸시(FCM/APNs) 용 |
| Apple Push 인증키 | Apple 개발자센터에서 APNs Key(.p8) 발급 → Firebase 에 업로드 |

## 2. 서버 설정(필수 시크릿)

- `FCM_SERVICE_ACCOUNT_JSON` : Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성(JSON 전체 문자열)
  - 이 값이 없으면 네이티브 앱 알림만 발송되지 않고, 웹푸시는 그대로 동작합니다.

## 3. 빌드 절차 (로컬 PC 필요)

```bash
git clone <repo> && cd <repo> && npm i
npx cap add ios        # macOS + Xcode 필요
npx cap add android    # Android Studio 필요
npx cap sync
npx cap open ios       # Xcode
npx cap open android   # Android Studio
```

Firebase 설정 파일 배치:
- Android: `android/app/google-services.json`
- iOS: `ios/App/App/GoogleService-Info.plist` + Xcode 에서 Push Notifications / Background Modes 활성화

## 4. 스토어 제출 순서

### Google Play
1. Play Console → 앱 만들기 (앱 이름, 언어, 무료)
2. 개인정보처리방침 URL: `https://findar.nstaff.co.kr/terms`
3. 데이터 보안 설문(수집 항목: 이메일, 이름, 전화번호), 광고 없음
4. 앱 서명 키는 Play 관리 사용, `.aab` 업로드
5. 내부 테스트 → 비공개 테스트 → 프로덕션 심사(보통 1~7일)

### App Store
1. App Store Connect → 신규 앱(Bundle ID `kr.co.nstaff.findar`)
2. 스크린샷(6.7", 6.5", iPad 필요 시), 설명, 키워드, 지원 URL
3. 개인정보 처리방침 URL, App Privacy 설문
4. 로그인 필요 앱이므로 **심사용 테스트 계정** 제공 필수
5. Xcode Archive → Distribute → 심사 제출(보통 1~3일)

## 5. 남은 준비물(운영 측)

- 앱 아이콘 1024×1024, 스플래시 이미지
- 스토어 스크린샷(구직자/구인자 화면 각 3~5장)
- 심사용 테스트 계정(구직자 1, 구인자 1)
- 지원 이메일 / 문의 URL
