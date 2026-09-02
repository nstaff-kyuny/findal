# MacInCloud에서 iOS 빌드 올리기 (현재 상태 기준)

스크린샷 확인 결과: 홈 폴더에 `findal` 폴더가 없습니다(`ls ~`에 Desktop/Downloads/Documents 등만 있음). 마지막 줄의 `git clone ...` 명령은 아직 **엔터를 누르지 않은 상태**로 보입니다. 즉, 코드를 아직 Mac에 내려받지 못했습니다.

이름 정리: 공식 앱 이름은 **findar**, 앱 번들 ID는 `kr.co.nstaff.findar`. 다만 GitHub 저장소 이름이 `findal`이므로 **Mac에 만들어지는 폴더 이름은 `findal`**입니다(폴더명은 앱 이름과 무관하니 그대로 두면 됩니다).

## 진행 순서

### 1단계 — 코드 내려받기
터미널에 그대로 입력하고 엔터:
```
cd ~ && git clone https://github.com/nstaff-kyuny/findal.git
```
- 사용자명/비밀번호를 다시 물어보면 저장소가 아직 private입니다. GitHub 저장소 Settings > Danger Zone에서 public으로 변경 후 재시도.
- 성공하면 `ls ~`에 `findal`이 보입니다.

### 2단계 — 의존성 설치 및 웹 빌드
```
cd ~/findal
npm install
npm run build
```

### 3단계 — iOS 프로젝트 생성/동기화
```
npx cap add ios
npx cap sync ios
```
`already exists` 메시지는 정상이니 넘어갑니다. 그다음 파일 확인:
```
ls ~/findal/ios/App
```
`App.xcodeproj`가 보여야 다음 단계로 넘어갑니다.

### 4단계 — Xcode 열기
```
open -a Xcode ~/findal/ios/App/App.xcodeproj
```
창이 안 뜨면:
```
killall Xcode; sleep 3; open -n -a Xcode ~/findal/ios/App/App.xcodeproj
```

### 5단계 — Xcode 설정
- 왼쪽 맨 위 파란 아이콘 **App** 클릭 → **TARGETS > App** 선택
- **General**: Display Name = `Findar`, Bundle Identifier = `kr.co.nstaff.findar`
- **Signing & Capabilities**: "Automatically manage signing" 체크 → Team에 구매한 애플 개발자 팀 선택
- **+ Capability** → `Push Notifications` 추가
- **+ Capability** → `Background Modes` 추가 후 **Remote notifications** 체크

### 6단계 — 업로드
- 상단 기기 선택을 **Any iOS Device (arm64)** 로 변경
- 메뉴 **Product > Archive** 실행 (5~15분)
- 완료 창에서 **Distribute App > App Store Connect > Upload**

## 참고
- 이 작업은 원격 Mac 환경 작업이라 코드 변경은 필요하지 않습니다. 앱 코드에는 이미 번들 ID `kr.co.nstaff.findar`, 푸시 설정, Capacitor 구성이 반영되어 있습니다.
- 단계별로 막히면 그 시점의 터미널 화면을 보여주시면 바로 그 지점부터 잡아드립니다.
