# MacInCloud 원격 입력 복구 후 Xcode 진행

## 현재 판단
- 터미널의 열쇠 표시는 버튼이 아니므로 클릭할 수 없는 것이 정상입니다.
- Windows 키보드도 비밀번호 입력에 사용할 수 있습니다. `Password:` 상태에서는 입력 문자가 화면에 전혀 표시되지 않습니다.
- 다만 터미널을 클릭해도 어떤 키도 전달되지 않는다면 비밀번호 입력 방식의 문제가 아니라 원격 Mac 제어 세션이 멈췄거나 보기 전용인 상태입니다.

## 지금 진행할 순서

### 1. 비밀번호 입력 시도 중단
현재 원격 화면에서는 더 이상 비밀번호를 입력하지 않습니다. `sudo` 명령이나 Xcode 설정도 아직 진행하지 않습니다.

### 2. 원격 Mac 화면에서 빠져나오기
Windows 키보드에서 `Esc`를 한 번 누릅니다. 반응이 없으면 브라우저의 전체 화면 종료 키인 `F11`을 누릅니다. 노트북 키보드라면 `Fn + F11`일 수 있습니다.

브라우저 상단의 탭과 주소창이 보이면, 원격 Mac 화면이 열린 탭의 `X`를 눌러 닫습니다. Mac 서버를 종료하는 것이 아니라 화면 연결만 닫는 안전한 작업입니다.

### 3. MacInCloud 대시보드에서 새로 연결
MacInCloud 대시보드 탭으로 이동해 사용 중인 서버 줄 오른쪽의 **모니터 모양 연결 아이콘**을 누릅니다.

새 원격 화면이 열리면:
1. 화면에 `Request Control`, `Take Control`, `Control` 중 하나가 보이면 누릅니다.
2. 브라우저가 키보드 또는 클립보드 권한을 물으면 `허용`을 선택합니다.
3. 터미널이 아니라 바탕화면의 빈 곳을 먼저 클릭합니다.
4. 화면 위쪽 메뉴가 반응하는지 확인합니다.

### 4. 입력 복구 확인
터미널을 열고 일반 프롬프트에서 영문 `a` 한 글자를 입력해 봅니다.
- `a`가 보이면 입력이 복구된 것입니다. `Backspace`로 지웁니다.
- 아무것도 보이지 않으면 다시 비밀번호를 시도하지 않습니다.

### 5. 여전히 입력되지 않을 때
MacInCloud 고객지원에 다음 문장을 그대로 전달해 현재 계정의 GUI 세션 초기화를 요청합니다.

```text
My remote desktop session is frozen or view-only. Mouse clicks and keyboard input are not being transmitted. Please reset the GUI session for user294508 without reinstalling the server.
```

서버 재설치·초기화는 선택하지 않습니다.

### 6. 입력이 복구된 뒤
그때만 Xcode 라이선스 명령을 다시 실행합니다. `Password:`가 나오면 MacInCloud 접속 비밀번호를 Windows 키보드로 입력하고 Enter를 누릅니다. 입력 중 글자·점·별표가 전혀 보이지 않는 것이 정상입니다.

```bash
sudo xcodebuild -license accept
sudo xcodebuild -runFirstLaunch
```

완료 후 Findar 프로젝트를 Xcode로 열어 서명 및 App Store 업로드를 진행합니다.
