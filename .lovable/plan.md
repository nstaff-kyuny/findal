# iOS 암호화 문서 면제 선언 추가

## 목표
App Store 심사 시 "앱 암호화 문서" 업로드를 요구받지 않도록, iOS 프로젝트에 `ITSAppUsesNonExemptEncryption` = false 선언을 추가한다.

## 작업 내용

1. Capacitor iOS 네이티브 프로젝트 생성
   - `npx cap add ios` 실행
   - iOS 빌드는 Mac + Xcode가 필요하지만, 프로젝트 파일 생성은 현재 환경에서 가능

2. Info.plist 암호화 선언 추가
   - 파일: `ios/App/App/Info.plist`
   - 추가 항목:
     ```xml
     <key>ITSAppUsesNonExemptEncryption</key>
     <false/>
     ```
   - 이 설정은 표준 HTTPS/TLS 등 표준 암호화만 사용하는 앱이 암호화 문서 제출 없이 App Store를 통과할 수 있도록 한다.

3. Capacitor 동기화
   - `npx cap sync ios` 실행
   - capacitor.config.ts 변경사항이 iOS 프로젝트에 반영되도록 함

4. 문서화
   - `docs/STORE_RELEASE.md`의 App Store 제출 순서에 Info.plist 설정 단계 추가
   - 향후 Mac/Xcode에서 빌드할 때 별도 설정 없이 적용되도록 안내

## 완료 기준
- `ios/App/App/Info.plist`에 `ITSAppUsesNonExemptEncryption` 키가 `<false/>`로 포함되어 있다.
- `docs/STORE_RELEASE.md`에 해당 설정 관련 안내가 추가되어 있다.
