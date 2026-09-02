# Xcode에서 프로젝트 열기 (Finder Open 비활성 문제)

지금 Finder의 `File → Open`이 회색인 이유는 **파일이 하나도 선택되지 않은 상태**이기 때문입니다. Finder 메뉴는 무시하고, Xcode 자체 메뉴로 프로젝트를 열면 됩니다.

## 진행 순서

1. 열려 있는 Finder 메뉴를 `Esc` 키로 닫습니다.
2. 화면 아래 아이콘 줄에서 **파란 망치 아이콘(Xcode)**을 한 번 클릭합니다.
3. 화면 맨 위 메뉴 이름이 `Finder` → `Xcode`로 바뀌는지 확인합니다.
4. `Xcode` 메뉴에서 **File → Open…** 을 클릭합니다. (Finder의 Open이 아니라 Xcode의 Open)
5. 열린 창에서 경로를 따라 이동합니다: `findal` → `ios` → `App` → `App.xcodeproj` 를 선택하고 **Open** 클릭.
   - 창에서 폴더 찾기가 어려우면 `Command(⌘) + Shift + G`(Windows 키보드는 Windows 키 + Shift + G)를 누르고 아래 경로를 붙여넣습니다.
     ```text
     ~/findal/ios/App/App.xcodeproj
     ```
6. 약관 창이 뜨면 **Agree**, 구성요소 설치 창이 뜨면 **Install** 을 누릅니다. 관리자 비밀번호를 요구하면 취소하고 알려주세요 (이 계정은 관리자 권한이 없어 MacInCloud 지원 요청이 필요합니다).

## 프로젝트가 열린 뒤 할 일

1. 왼쪽 목록 맨 위 **App** 클릭 → 가운데 **TARGETS → App** 선택.
2. **Signing & Capabilities** 탭:
   - `Automatically manage signing` 체크
   - `Team`: 본인 Apple Developer 팀 선택
   - `Bundle Identifier`: `kr.co.nstaff.findar` 확인
3. `+ Capability` 버튼으로 **Push Notifications** 추가.
4. 상단 기기 선택에서 **Any iOS Device (arm64)** 선택 → 메뉴 `Product → Archive`.
5. 완료되면 **Distribute App → App Store Connect → Upload** 로 업로드.

## 참고

이 단계는 원격 Mac에서의 조작만 필요하고, 앱 코드 변경은 없습니다.
