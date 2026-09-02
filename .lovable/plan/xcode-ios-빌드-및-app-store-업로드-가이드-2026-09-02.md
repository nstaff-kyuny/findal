# Xcode iOS 빌드 및 App Store 업로드 가이드

## 목표
MacInCloud 환경에서 클론한 프로젝트를 Xcode로 열고, 서명/푸시 설정을 마친 뒤 App Store Connect에 아카이브 업로드까지 완료한다.

## 단계

### 1. iOS 플랫폼 추가 및 Capacitor 동기화
- 터미널에서 프로젝트 루트로 이동
- `npx cap add ios` 실행 (이미 ios 폴더가 있으면 생략)
- `npx cap sync ios` 실행으로 웹 에셋과 플러그인 동기화

### 2. Xcode 프로젝트 열기
- 터미널에서 `npx cap open ios` 또는 `open ios/App/App.xcworkspace` 실행
- Xcode가 실행되면 좌측 파일 트리에서 `App` 타겟 선택

### 3. Bundle ID 및 서명 설정
- `General` 탭에서 Bundle Identifier가 `kr.co.nstaff.findar`와 일치하는지 확인
- `Signing & Capabilities` 탭에서:
  - Team: 유료 Apple Developer 계정의 팀 선택
  - Provisioning Profile: 자동 관리(Manage Automatically)로 설정
  - Bundle Identifier가 App Store Connect에 등록된 ID와 동일한지 재확인

### 4. 푸시 알림 기능 활성화
- `Signing & Capabilities` 탭에서 `+ Capability` 클릭
- `Push Notifications` 추가
- `Background Modes` 추가 후 `Remote notifications` 체크
- App Store Connect > 앱 ID 설정에서도 Push Notifications이 활성화되어 있는지 확인

### 5. 앱 아이콘 및 런치스크린 확인
- `App/Assets.xcassets/AppIcon.appiconset`에 필요한 모든 크기 아이콘이 포함되어 있는지 확인
- `LaunchScreen.storyboard`가 정상적으로 로드되는지 미리보기

### 6. Clean Build 및 아카이브
- 상단 메뉴 `Product > Destination > Any iOS Device` 선택
- `Product > Clean Build Folder` 실행
- `Product > Archive` 실행 (빌드 완료 후 Organizer 창이 자동으로 열림)

### 7. App Store Connect 업로드
- Organizer에서 방금 생성한 아카이브 선택
- `Distribute App` 클릭
- `App Store Connect` > `Upload` 선택
- 필요 시 서명 옵션 확인 후 `Upload` 진행
- 업로드 완료 후 Xcode와 App Store Connect에서 성공 메시지 확인

### 8. 업로드 후 App Store Connect 설정
- `App Store Connect > 내 앱 > 해당 앱 > TestFlight` 탭에서 업로드된 빌드 확인
- `App Review` 탭에서 심사 정보 입력
- `Pricing and Availability`에서 가격 등급 `Free` 설정
- `Build` 섹션에서 업로드된 빌드 선택 후 `Submit for Review`

## 산출물
- App Store Connect에 업로드된 iOS 빌드
- 제출 준비 완료된 앱 심사 정보

## 참고
- 첫 업로드 시 Apple의 2FA 인증이 필요할 수 있음
- 빌드 처리에 수 분~수 시간 소요될 수 있음
- 심사 거절 시 Apple이 메일로 사유를 전송함
