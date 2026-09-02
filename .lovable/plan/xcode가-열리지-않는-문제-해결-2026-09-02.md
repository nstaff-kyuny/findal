# Xcode가 열리지 않는 문제 해결

## 확인된 원인
- 현재 터미널은 이미 `findal` 프로젝트 폴더 안이다.
- 입력한 `~/findal/ios/App/App.xcworkspace` 파일은 프로젝트에 존재하지 않는다.
- 이 iOS 프로젝트는 CocoaPods workspace가 아니라 Swift Package 기반이므로 `ios/App/App.xcodeproj`를 열어야 한다.
- `npx cap open ios`는 실행 요청까지는 성공했지만, 원격 Mac에서 Xcode 창이 앞으로 표시되지 않은 상태로 보인다.

## 진행 순서
1. 현재 터미널 위치에서 아래 명령으로 실제 프로젝트 파일 존재 여부를 확인한다.
   ```bash
   pwd
   ls ios/App/App.xcodeproj
   ```
2. 다음 명령으로 정확한 프로젝트를 직접 연다.
   ```bash
   open -a Xcode ./ios/App/App.xcodeproj
   ```
3. 1분 이내 창이 나타나지 않으면 Dock의 Xcode 아이콘을 한 번 클릭한다.
4. 그래도 창이 없으면 `Option + Tab` 또는 화면 상단 `Window` 메뉴로 Xcode 창을 앞으로 가져온다.
5. Xcode 최초 실행 안내가 나타나면 라이선스 동의와 추가 구성요소 설치를 완료한다.
6. 프로젝트가 열린 뒤 패키지 로딩이 끝날 때까지 기다리고, 왼쪽의 파란색 `App` 프로젝트를 선택한다.
7. `Signing & Capabilities`에서 개발자 Team, 자동 서명, Bundle ID `kr.co.nstaff.findar`를 확인한다.
8. 빌드 대상을 `Any iOS Device (arm64)`로 선택하고 `Product > Archive`를 실행한다.

## 실패 시 진단
- `ls ios/App/App.xcodeproj`에서 파일 없음이 나오면 `pwd`와 `ls` 결과로 실제 프로젝트 위치를 다시 찾는다.
- Xcode가 계속 실행 중 표시만 보이면 강제 종료 후 `App.xcodeproj`를 다시 연다.
- 추가 구성요소 설치가 관리자 권한 때문에 차단되면 MacInCloud 지원팀에 Xcode 26.6 초기 구성 완료를 요청한다.
