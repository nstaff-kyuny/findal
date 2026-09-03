# Xcode에서 Find AR 프로젝트 열기 및 App Store 업로드

## 현재 상태
- 첨부 화면에서 Xcode 26.6이 정상 실행되었고 시작 화면이 표시됩니다.
- 프로젝트에는 앱 이름 `Find AR`, Bundle ID `kr.co.nstaff.findar`, 버전 `1.0`, 빌드 `1`, 암호화 면제 설정이 이미 들어 있습니다.
- 자동 서명 방식은 설정돼 있지만 Apple Developer Team과 Push Notifications 권한은 아직 Xcode에서 지정해야 합니다.

## 지금 바로 할 일: 프로젝트 열기

1. Xcode 창 왼쪽 아래의 **Open Existing Project…**를 한 번 클릭합니다.
2. 파일 선택 창이 열리면 키보드에서 **Windows 키 + Shift + G**를 누릅니다. Windows 키는 Mac의 Command 키 역할입니다.
3. 아래 경로를 붙여넣고 Enter를 누릅니다.

```text
~/findal/ios/App/App.xcodeproj
```

4. `App.xcodeproj`가 선택되면 오른쪽 아래 **Open**을 누릅니다.
5. 프로젝트 화면이 나타난 뒤 패키지를 불러오는 동안 2~5분 기다립니다. 상단 진행 표시가 끝날 때까지 다른 버튼을 누르지 않습니다.

> 경로가 없다고 나오면 취소하고 터미널에서 `pwd`를 실행해 실제 `findal` 위치를 확인한 뒤, 그 전체 경로의 `ios/App/App.xcodeproj`를 엽니다.

## Apple 계정과 서명 설정

1. 왼쪽 파일 목록 맨 위의 파란색 **App** 아이콘을 클릭합니다.
2. 가운데 `TARGETS` 아래의 **App**을 선택합니다.
3. 위쪽 **Signing & Capabilities** 탭을 클릭합니다.
4. **Automatically manage signing**을 체크합니다.
5. **Team**에서 유료 Apple Developer 멤버십이 있는 팀을 선택합니다.
   - 팀이 보이지 않으면 상단 메뉴 **Xcode → Settings… → Accounts → + → Apple Account**에서 Apple Developer 계정으로 로그인한 뒤 돌아옵니다.
6. **Bundle Identifier**가 아래 값인지 확인합니다.

```text
kr.co.nstaff.findar
```

7. 빨간 서명 오류가 사라지고 인증서/프로비저닝 정보가 표시되는지 확인합니다.

## 푸시 알림 권한 추가

1. 같은 **Signing & Capabilities** 화면에서 **+ Capability**를 누릅니다.
2. `Push Notifications`를 검색해 더블 클릭합니다.
3. 다시 **+ Capability**를 눌러 `Background Modes`를 추가합니다.
4. 표시된 항목 중 **Remote notifications**만 체크합니다.

## Archive 만들기

1. Xcode 창 상단의 실행 대상 목록을 클릭합니다.
2. 시뮬레이터가 아닌 **Any iOS Device (arm64)** 또는 **Generic iOS Device**를 선택합니다.
3. 상단 메뉴 **Product → Clean Build Folder**를 실행합니다.
4. 상단 메뉴 **Product → Archive**를 클릭합니다.
5. 빌드가 끝날 때까지 기다립니다. 최초 빌드는 약 10~20분 걸릴 수 있습니다.

## App Store Connect 업로드

1. Archive가 완료되면 자동으로 열리는 Organizer에서 방금 만든 `App` Archive를 선택합니다.
2. **Distribute App**을 클릭합니다.
3. **App Store Connect → Upload** 순서로 선택합니다.
4. 기본 권장 옵션을 유지하고 **Next**를 누릅니다.
5. 자동 서명 검사가 끝나면 **Upload**를 누릅니다.
6. 업로드 성공 메시지가 나오면 App Store Connect에서 빌드 처리 완료까지 보통 10~30분 기다립니다.
7. 앱의 제출 준비 화면에서 업로드한 빌드를 선택하고 심사 제출을 계속합니다.

## 중단해야 하는 경우
- Apple 계정 로그인 또는 Team 선택에서 권한 오류가 발생하는 경우
- Bundle Identifier가 이미 사용 중이라는 오류가 나는 경우
- Archive가 회색으로 비활성화된 경우
- 빌드 실패 또는 업로드 검증 오류가 표시되는 경우

이 경우 오류 문구가 보이도록 전체 화면을 캡처한 뒤 다음 조치를 결정합니다.
