# MacInCloud에서 Xcode 창 띄우기 — 진단 및 진행 계획

터미널 명령은 성공하지만 Xcode 창이 화면에 나타나지 않는 상태입니다. 이 서버는 여러 사용자가 함께 쓰는 Mac이라, 현재 계정의 Xcode가 화면 세션에 붙지 못하는 경우가 흔합니다. 아래 순서로 원인을 좁힌 뒤 빌드 단계로 넘어갑니다.

## 1단계: 실제 실행 여부와 오류 확인

터미널에 한 줄씩 실행하고 결과 화면을 캡처해 보내주세요.

```bash
pgrep -u $(id -u) -x Xcode
open -na /Applications/Xcode.app --args -v 2>&1 | head -20
ls -ld ~/Library/Developer
```

- 첫 줄에 숫자가 나오면 내 계정으로 실행은 되고 창만 안 보이는 상태입니다.
- 숫자가 없으면 실행 자체가 막힌 상태(권한 또는 라이선스 미동의)입니다.

## 2단계: 라이선스·초기 설치 처리

Xcode가 첫 실행 대기 상태면 창 없이 멈춥니다. 다음을 실행합니다.

```bash
sudo xcodebuild -license accept
sudo xcodebuild -runFirstLaunch
```

비밀번호를 물으면 원격 접속에 쓰는 계정 비밀번호를 입력합니다(화면에 표시되지 않는 것이 정상).

## 3단계: 화면 세션 재접속

브라우저 기반 화면 창을 완전히 닫고 다시 접속한 뒤, 화면 아래쪽 앱 막대에서 Xcode 아이콘을 직접 클릭합니다. 아이콘이 없으면 `Command + Space` → `Xcode` 입력 → Enter.

여기까지 해도 창이 안 뜨면 MacInCloud 지원팀에 "Xcode GUI가 내 세션에서 열리지 않는다"고 요청하는 것이 가장 빠릅니다(서버 재할당으로 해결되는 사례가 많습니다).

## 4단계: 창이 열린 뒤 할 일

1. Open Existing Project → `findal → ios → App → App.xcodeproj`
2. 왼쪽 App 선택 → Signing & Capabilities → Team에 애플 개발자 계정 지정
3. Bundle Identifier가 `kr.co.nstaff.findar`인지 확인
4. `+ Capability` → Push Notifications 추가
5. 상단 기기 선택을 `Any iOS Device (arm64)`로 변경 → Product → Archive
6. Archive 완료 후 Distribute App → App Store Connect → Upload

## 참고

- 앱 공식 이름과 번들 ID는 `findar`, Mac 안의 폴더/저장소 이름만 `findal`입니다. 폴더 경로에는 `findal`을 그대로 사용합니다.
- 이 단계는 Mac 환경 작업이므로 프로젝트 코드 변경은 필요하지 않습니다. 코드 수정이 필요한 항목이 나오면 별도로 처리합니다.
