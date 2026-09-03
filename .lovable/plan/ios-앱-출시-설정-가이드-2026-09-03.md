# iOS 앱 출시 설정 가이드

## 목표
MacInCloud의 Xcode에서 `kr.co.nstaff.findar` 프로젝트의 서명, 팀, 푸시 알림 설정을 완료하고 App Store Connect에 업로드한다.

## 단계

### 1. Team 및 자동 서명 설정
- Xcode 왼쪽 네비게이터에서 최상위 `App` 프로젝트 선택
- `Signing & Capabilities` 탭 선택
- `Team` 드롭다운에서 자신의 Apple Developer Team 선택
- `Bundle Identifier`가 `kr.co.nstaff.findar`인지 확인
- `Automatically manage signing`이 체크되어 있는지 확인
- `Provisioning Profile`이 자동 생성되도록 둔다

### 2. Push Notifications 및 Background Modes 추가
- 같은 `Signing & Capabilities` 탭에서 `+ Capability` 클릭
- `Push Notifications` 추가
- `Background Modes` 추가 후 `Remote notifications` 체크

### 3. 빌드 및 Archive
- 상단 타겟/시뮬레이터 선택창에서 `Any iOS Device (arm64)` 선택
- 메뉴 `Product → Archive` 클릭
- 빌드가 완료되면 Organizer 창이 열림

### 4. App Store Connect 업로드
- Organizer에서 방금 만든 Archive 선택
- `Distribute App` 클릭
- `App Store Connect` → `Upload` 선택
- 기본 옵션 그대로 진행하여 업로드 완료

## 다음 메시지에서 할 일
- 현재 Xcode 화면에서 `Signing & Capabilities` 탭의 스크린샷을 공유하면 구체적인 항목을 짚어드림
- 에러가 발생하면 메시지를 그대로 알려주면 해결 방법을 안내
