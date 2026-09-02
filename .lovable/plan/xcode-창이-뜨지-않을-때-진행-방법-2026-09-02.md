# Xcode 창이 뜨지 않을 때 진행 방법

## 화면에서 확인된 사실
- `npx cap sync ios` 정상 완료 (플러그인 4개 포함, Package.swift 생성)
- `[error] ios platform already exists`는 정상 메시지 (이미 있으니 넘어감)
- `open -a Xcode ~/findal/ios/App/App.xcodeproj` 명령은 오류 없이 실행됨 → 경로는 정확함
- `xcodebuild -checkFirstLaunchStatus`도 오류 없이 종료 → Xcode 초기 구성 완료 상태
- 즉, 명령은 다 성공했고 남은 문제는 **원격 화면에 Xcode 창이 앞으로 나오지 않는 것**뿐입니다.

## 진행 순서

### 1. Xcode가 실제로 실행 중인지 확인
```bash
pgrep -x Xcode
```
- 숫자가 나오면 실행 중 → 2단계로
- 아무것도 안 나오면 실행 안 됨 → 3단계로

### 2. 실행 중인데 창이 안 보이는 경우
```bash
osascript -e 'tell application "Xcode" to activate'
```
그리고 화면에서:
- Dock의 Xcode(망치) 아이콘을 **한 번 클릭**
- 상단 메뉴 `Window > Bring All to Front` 선택
- 화면 우측 상단 시계 옆에 진행 표시가 있으면 그대로 기다립니다(패키지 다운로드 중일 수 있음)

### 3. 실행이 안 됐거나 멈춘 경우 — 강제 재시작
```bash
killall Xcode
```
```bash
sleep 5; open -n -a Xcode ~/findal/ios/App/App.xcodeproj
```
1~3분 기다린 후 Dock 아이콘을 클릭합니다.

### 4. 그래도 창이 없을 때 — 원격 세션 문제
MacInCloud 브라우저 접속(화면 공유) 상태에서는 GUI 앱 창이 갱신되지 않는 경우가 있습니다.
- 접속 창의 **Request Control / 제어 요청**을 다시 누릅니다
- 또는 브라우저 창을 닫고 MacInCloud 대시보드에서 다시 **Connect**
- 재접속 후 Dock에 Xcode 창이 이미 열려 있는지 확인합니다

### 5. Xcode 창이 열린 뒤 (여기가 본 작업)
1. 왼쪽 맨 위 파란 아이콘 **App** 클릭 → **TARGETS > App**
2. **General**: Display Name = `Find AR`, Bundle Identifier = `kr.co.nstaff.findar`
3. **Signing & Capabilities**: `Automatically manage signing` 체크 → **Team**에 구매한 애플 개발자 팀 선택
4. **+ Capability** → `Push Notifications` 추가
5. **+ Capability** → `Background Modes` 추가 → **Remote notifications** 체크
6. 상단 기기 선택을 **Any iOS Device (arm64)** 로 변경
7. **Product > Archive** 실행 (5~15분)
8. Organizer 창에서 **Distribute App > App Store Connect > Upload**

## 참고
- 이 작업은 원격 Mac 환경 작업이라 앱 코드 변경은 필요하지 않습니다. 번들 ID, 푸시 설정, Capacitor 구성은 이미 프로젝트에 반영되어 있습니다.
- 먼저 `pgrep -x Xcode` 결과를 알려주시면 2단계·3단계 중 어디로 갈지 바로 정해 드립니다.
