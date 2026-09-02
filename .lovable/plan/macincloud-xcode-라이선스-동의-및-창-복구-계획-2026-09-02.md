# MacInCloud Xcode 라이선스 동의 및 창 복구 계획

## 현재 상태
- 터미널 프롬프트가 `AS541-I:findal user294508$`로 정상 복귀
- `pgrep -u $(id -u) -x Xcode` 결과 `14636` → 현재 계정의 Xcode 프로세스는 실행 중
- `sudo xcodebuild -license accept` 실행 시 비밀번호 불일치로 "Sorry, try again." 발생
- Xcode 창은 화면에 표시되지 않는 상태

## 다음 진행 단계

### 1단계: 정확한 비밀번호 확인
MacInCloud 대시보드 또는 접속 정보 메일에서 **현재 서버의 정확한 비밀번호**를 다시 확인합니다.

### 2단계: Xcode 라이선스 동의
터미널에 아래 명령을 한 줄씩 입력합니다. 비밀번호 입력 시 화면에 아무것도 표시되지 않는 것이 정상입니다.

```bash
sudo xcodebuild -license accept
```

- 비밀번호를 물으면 MacInCloud 서버 비밀번호 입력 후 Enter
- "Sorry, try again."이 반복되면 1단계로 돌아가 비밀번호 재확인

성공하면 다음 명령 실행:

```bash
sudo xcodebuild -runFirstLaunch
```

### 3단계: Xcode 창 앞으로 가져오기
라이선스 및 초기 실행이 완료되면 아래 명령으로 Xcode 창을 강제로 활성화합니다.

```bash
osascript -e 'tell application "Xcode" to activate'
```

여전히 창이 보이지 않으면:

```bash
pkill -9 -x Xcode
sleep 5
open -n -a Xcode ~/findal/ios/App/App.xcodeproj
```

### 4단계: Xcode에서 프로젝트 설정
Xcode 창이 열리면 다음 순서로 진행:

1. 왼쪽 상단의 파란색 `App` 아이콘 클릭 → `TARGETS > App` 선택
2. `General` 탭에서:
   - Display Name: `Find AR`
   - Bundle Identifier: `kr.co.nstaff.findar` 확인
3. `Signing & Capabilities` 탭에서:
   - `Automatically manage signing` 체크
   - Team에 유료 Apple Developer 팀 선택
4. `+ Capability` 클릭 → `Push Notifications` 추가
5. `+ Capability` 클릭 → `Background Modes` 추가 후 `Remote notifications` 체크
6. 상단 기기 선택 목록에서 `Any iOS Device (arm64)` 선택

### 5단계: Archive 생성 및 App Store Connect 업로드
1. 메뉴 `Product > Clean Build Folder` 실행
2. 메뉴 `Product > Archive` 실행 (5~15분 소요)
3. Archive 완료 후 자동으로 뜨는 Organizer 창에서 해당 Archive 선택
4. `Distribute App` 클릭 → `App Store Connect` → `Upload` 선택
5. 서명 옵션 확인 후 업로드 진행

## 참고
- 폴더/저장소 이름은 `findal`이지만, 앱 표시명은 `Find AR`, Bundle ID는 `kr.co.nstaff.findar`입니다.
- 키보드 입력이 전혀 안 되는 상태라면 MacInCloud 원격 세션 자체가 보기 전용 또는 멈춘 상태이므로, 대시보드에서 Disconnect/Connect Now 또는 세션 재시작 후 다시 시도해야 합니다.
