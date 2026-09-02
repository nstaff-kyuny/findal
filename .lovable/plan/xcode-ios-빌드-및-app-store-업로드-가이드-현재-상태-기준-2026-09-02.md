# Xcode iOS 빌드 및 App Store 업로드 가이드 (현재 상태 기준)

## 현재 상태 확인
- 터미널 프롬프트가 `AS541-I:findal user294508$`로 표시됨 → 이미 `findal` 프로젝트 폴더 안에 있음
- `npx cap sync ios`는 성공적으로 완료됨
- `cd findal` 명령이 실패한 이유: 이미 findal 폴더 안이기 때문

## 목표
현재 상태에서 Xcode를 열고, 서명/푸시 설정을 마친 뒤 App Store Connect에 아카이브 업로드까지 완료한다.

## 단계

### 1. 현재 위치 확인
- 터미널에 `pwd` 입력
- 출력 경로 끝에 `/findal`이 포함되어 있으면 정상
- 만약 다른 폴더에 있다면 `cd ~` 후 `cd findal` 입력

### 2. Xcode 프로젝트 열기
- 터미널에서 `npx cap open ios` 실행
- Xcode가 실행되면 좌측 파일 트리에서 최상위 `App` 타겟 선택

### 3. Bundle ID 및 서명 설정
- `General` 탭에서 `Bundle Identifier`가 `kr.co.nstaff.findar`인지 확인
- `Signing & Capabilities` 탭에서:
  - `Team`: 유료 Apple Developer 팀 선택
  - `Automatically manage signing` 체크 확인
  - Bundle ID가 App Store Connect에 등록된 ID와 동일한지 재확인

### 4. 푸시 알림 기능 활성화
- `Signing & Capabilities` 탭에서 `+ Capability` 클릭
- `Push Notifications` 추가
- `Background Modes` 추가 후 `Remote notifications` 체크
- App Store Connect의 앱 ID 설정에서도 Push Notifications이 활성화되어 있는지 확인

### 5. Clean Build 및 Archive
- 상단 메뉴 `Product > Destination > Any iOS Device (arm64)` 선택
- `Product > Clean Build Folder` 실행
- `Product > Archive` 실행
- 빌드 완료 후 자동으로 `Organizer` 창 열림

### 6. App Store Connect 업로드
- Organizer에서 방금 생성한 아카이브 선택
- `Distribute App` 클릭
- `App Store Connect` > `Upload` 선택
- 서명 옵션 확인 후 `Upload` 진행
- 2FA 인증 창이 뜨면 Apple ID로 인증

### 7. App Store Connect에서 심사 제출
- `App Store Connect > 내 앱 > Findal` 이동
- `TestFlight` 탭에서 업로드된 빌드 확인
- `App Review` 탭에서 심사 정보 입력
- `Pricing and Availability`에서 가격 등급 `Free` 설정
- `Build` 섹션에서 업로드된 빌드 선택 후 `Submit for Review`

## 산출물
- App Store Connect에 업로드된 iOS 빌드
- 제출 준비 완료된 앱 심사 정보

## 참고
- 현재 터미널이 이미 `findal` 폴더 안이므로 `cd findal`은 다시 입력하지 않음
- 첫 업로드 시 Apple 2FA 인증이 필요할 수 있음
- 빌드 처리에 수 분~수 시간 소요될 수 있음
