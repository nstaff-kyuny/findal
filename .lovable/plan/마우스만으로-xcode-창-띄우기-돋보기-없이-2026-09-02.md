# 마우스만으로 Xcode 창 띄우기 (돋보기 없이)

화면 캡처를 보면 지금은 Mac 바탕화면이 정상적으로 보이고, 맨 위에 `Finder  File  Edit  View  Go  Window  Help` 메뉴가 있습니다. 오른쪽 돋보기(검색)는 이 서버에서 숨겨져 있는 상태이므로 사용하지 않습니다. 대신 **맨 위 `Go` 메뉴**만 마우스로 눌러 진행합니다. 키보드도, 비밀번호도 필요하지 않습니다.

## 1단계: 응용 프로그램 폴더 열기
1. 화면 맨 위의 `Go` 를 마우스로 클릭
2. 목록에서 `Applications` 클릭
3. 프로그램 목록 창이 열립니다

## 2단계: Xcode 실행
1. 목록을 아래로 스크롤해 `Xcode` 를 찾습니다 (회색 망치 모양 아이콘)
2. `Xcode` 를 **더블 클릭**
3. 1~5분 기다립니다 (첫 실행은 매우 느립니다)

## 3단계: 첫 실행 안내창 처리 (창이 뜬 경우)
- 사용 약관 창 → `Agree` 클릭
- 추가 구성요소 설치 창 → `Install` 클릭
- 관리자 이름/비밀번호를 요구하면 **취소를 누르고 4단계로** 갑니다 (이 계정은 관리자 권한이 없음)

## 4단계: 창이 안 뜨거나 권한을 요구할 때
MacInCloud 지원(도와주세요 → 지원 요청)에 아래 문장을 그대로 붙여 넣습니다.

```text
Xcode does not open any window for my account (user294508), and its first launch
requires admin privileges, but my account is not in the sudoers file.
Please accept the Xcode license and run "sudo xcodebuild -runFirstLaunch" on the
server, or grant my account admin rights.
```

이 처리는 보통 몇 시간 내에 완료되며, 이후에는 Xcode 창이 정상적으로 열립니다.

## 5단계: Xcode 창이 열린 뒤 (앱 업로드)
1. `File > Open` → `findal` → `ios` → `App` → `App.xcodeproj` 열기
2. 왼쪽 파란 `App` 아이콘 클릭 → `TARGETS > App`
3. `General`: Display Name = `Findar`
4. `Signing & Capabilities`: `Automatically manage signing` 체크, `Team` 에 애플 개발자 팀 선택, Bundle Identifier 가 `kr.co.nstaff.findar` 인지 확인
5. `+ Capability` → `Push Notifications` 추가
6. `+ Capability` → `Background Modes` 추가 후 `Remote notifications` 체크
7. 상단 기기 선택을 `Any iOS Device (arm64)` 로 변경
8. 메뉴 `Product > Archive` (10~20분)
9. 완료 창에서 `Distribute App > App Store Connect > Upload`

## 참고
- 이 단계는 전부 원격 Mac 환경 작업이며, 프로젝트 코드 변경은 필요하지 않습니다.
- 코드 측 준비(번들 ID, 푸시 설정, 암호화 면제 선언)는 이미 완료된 상태입니다.
