# 멈춘 Xcode 실행 복구 및 프로젝트 열기

## 확인된 상태
- `npx cap sync ios`는 정상 완료되었고 프로젝트 파일 경로는 `~/findal/ios/App/App.xcodeproj`입니다.
- 화면의 마지막 명령은 끝나지 않아 터미널 입력 표시가 돌아오지 않은 상태입니다.
- 이전에 `Xcode got an error: AppleEvent timed out. (-1712)`가 표시됐고 여러 Xcode 프로세스가 잡혔으므로, 현재 문제는 Findar 코드나 프로젝트 경로가 아니라 **Xcode 프로그램이 원격 Mac 화면에서 정상적으로 시작되지 않는 것**입니다.

## 진행 순서

### 1. 현재 멈춘 명령 종료
터미널 창 안을 한 번 클릭한 다음 키보드에서 `Ctrl` 키를 누른 상태로 `C`를 한 번 누릅니다.

정상이라면 맨 아래에 아래와 비슷한 입력 표시가 다시 나타납니다.

```text
AS541-I:findal user294508$
```

### 2. Xcode 실행 기록 확인
입력 표시가 나타나면 아래 명령을 한 줄씩 입력합니다.

```bash
cat /tmp/xcode-start.log
```

```bash
ps aux | grep '[X]code.app/Contents/MacOS/Xcode'
```

- 첫 번째 명령은 Xcode가 실행되지 않은 이유를 보여줍니다.
- 두 번째 명령은 Xcode가 화면 없이 백그라운드에서 멈춰 있는지 확인합니다.
- 출력 화면을 캡처하면 다음 조치를 정확히 결정할 수 있습니다.

### 3. 화면 클릭으로 Xcode 직접 열기
실행 기록에 명확한 오류가 없다면 명령어 대신 화면에서 엽니다.

1. 화면 맨 아래에 여러 앱 그림이 줄지어 있는 막대가 **Dock(독)**입니다.
2. Dock이 안 보이면 마우스 화살표를 화면 맨 아래 끝까지 내리고 2초 정도 기다립니다.
3. 파란색 바탕에 망치 모양이 있는 그림이 **Xcode**입니다. 그 그림을 빠르게 두 번 클릭합니다.
4. 그래도 안 열리면 화면 맨 위 메뉴에서 `이동(Go)` → `응용 프로그램(Applications)`을 클릭합니다.
5. 열린 창에서 `Xcode`를 찾아 빠르게 두 번 클릭합니다.
6. 처음 나타나는 약관·구성요소 창에서는 `Agree`, `Install`, `Continue`를 선택합니다.

### 4. Xcode만 먼저 연 뒤 프로젝트 선택
Xcode 시작 화면이 열리면 `Open Existing Project...`를 누르고 다음 순서로 폴더를 선택합니다.

```text
사용자 폴더 → findal → ios → App → App.xcodeproj
```

`App.xcodeproj`는 일반 폴더처럼 들어가지 말고 한 번 선택한 뒤 오른쪽 아래 `Open`을 누릅니다.

### 5. Xcode 자체가 계속 열리지 않는 경우
Xcode 아이콘을 직접 두 번 눌러도 아무 창이 뜨지 않으면 MacInCloud 화면 연결 또는 설치된 Xcode 자체의 문제입니다.

1. 작업 중인 터미널은 그대로 둡니다.
2. MacInCloud 브라우저 창을 닫고 대시보드에서 서버에 다시 `Connect`합니다.
3. 재접속 후 `응용 프로그램(Applications)`에서 Xcode를 다시 두 번 클릭합니다.
4. 여전히 반응이 없으면 2단계의 두 명령 출력과 함께 MacInCloud 지원팀에 “Xcode 26.6 does not launch in the GUI and AppleEvent times out with -1712”라고 전달합니다.

## Xcode가 열린 다음 단계
Xcode가 실제로 열린 것이 확인된 뒤에만 다음 순서로 진행합니다.

1. 왼쪽의 파란 `App` 선택
2. 가운데 `TARGETS` 아래 `App` 선택
3. `Signing & Capabilities`에서 개발자 Team 선택
4. Bundle Identifier가 `kr.co.nstaff.findar`인지 확인
5. Push Notifications 및 Background Modes 권한 추가
6. `Product` → `Archive`로 App Store 업로드 파일 생성
