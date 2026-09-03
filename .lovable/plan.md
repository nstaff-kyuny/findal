# iOS 출시 설정 완료 계획

## 현재 상태
- Xcode 프로젝트(`App.xcodeproj`)는 정상 열림
- Bundle Identifier는 `kr.co.nstaff.findar`로 확인됨
- Team은 아직 None 상태
- Apple ID 추가 중 비밀번호 입력이 원격 세션에서 원활하지 않음

## 남은 단계

### 1. Apple 계정 로그인 문제 해결
- 비밀번호 입력창은 글자를 표시하지 않으므로 정상적으로 보이지 않는 것임
- 키 입력이 전혀 안 들어간다면 메모장에 입력 후 복사/붙여넣기 시도
- 화상 키보드(Keyboard Viewer)로 입력 시도
- 여전히 안 되면 MacInCloud 지원팀에 GUI 세션/입력 문제 해결 요청

### 2. Team 선택
- Apple 계정 추가 후 `Signing & Capabilities` 탭의 Team 드롭다운에서 NSTAFF 팀 선택
- `Automatically manage signing`이 체크되어 있는지 확인
- `Bundle Identifier`가 `kr.co.nstaff.findar`인지 재확인

### 3. Push Notifications 및 Background Modes 추가
- `Signing & Capabilities` 탭에서 `+ Capability` 클릭
- `Push Notifications` 추가
- `Background Modes` 추가 후 `Remote notifications` 체크

### 4. Archive 빌드
- 상단 시뮬레이터/타겟 선택창에서 `Any iOS Device (arm64)` 선택
- 메뉴 `Product → Archive` 실행
- 빌드 완료 시 Organizer 창 자동 열림

### 5. App Store Connect 업로드
- Organizer에서 생성된 Archive 선택
- `Distribute App` 클릭
- `App Store Connect → Upload` 선택
- 기본 옵션 그대로 진행하여 업로드 완료

## 차단 상태일 때 할 일
- 각 단계에서 에러 메시지가 발생하면 메시지를 그대로 공유
- 성공적으로 Team 선택이 완료되면 스크린샷 공유
