FCM 서비스 계정 JSON 시크릿 등록 및 네이티브 푸시 발송 점검

## 목표
다운로드한 Firebase 서비스 계정 JSON을 프로젝트 시크릿으로 등록하고, iOS/Android 네이티브 푸시가 정상 발송되는지 확인한다.

## 진행 단계

1. 시크릿 등록
   - 이름: `FCM_SERVICE_ACCOUNT_JSON`
   - 값: 다운로드한 `.json` 파일의 전체 내용을 그대로 붙여넣기
   - 사용 위치: `src/lib/fcm.server.ts`, `src/routes/api/public/send-push.ts`

2. 등록 후 발송 로직 점검
   - `/api/public/send-push` 엔드포인트가 네이티브 토큰(`native_push_tokens`)을 조회하는지 확인
   - `sendFcmToTokens`에서 OAuth 액세스 토큰 발급 및 FCM v1 메시지 발송이 실패하지 않는지 확인
   - 웹푸시와 네이티브 푸시가 동시에 발송되도록 유지

3. 네이티브 푸시 온보딩 흐름 확인
   - 설정 화면에서 알림 ON 시 `enableNativePush`가 권한 요청 + 토큰 저장까지 진행되는지 확인
   - iOS/Android 각각의 토큰이 `native_push_tokens`에 저장되는지 확인

## 완료 기준
- `FCM_SERVICE_ACCOUNT_JSON` 시크릿 등록 완료
- `send-push` 엔드포인트가 네이티브 토큰을 읽어 FCM v1 발송을 시도하며, 시크릿 누락으로 인한 500/설정 불가 오류가 사라짐
