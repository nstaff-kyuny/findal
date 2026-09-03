# Apple ID 로그인 차단(-24056) 해결 계획

## 현재 상태
- Xcode 프로젝트 열기, Signing & Capabilities 진입까지 완료
- Xcode Apple Accounts에서 Apple ID 로그인 시 `Cannot Verify Identity (-24056) This phone number cannot be used at this time` 발생
- 입력한 전화번호가 틀린 것이 아니라, Apple 서버가 MacInCloud 원격 서버(데이터센터 IP)에서의 로그인을 의심해 전화번호 인증을 거부한 상태

## 왜 안 되는가
- Apple은 로그인 시 접속 IP·기기·지역을 종합해 위험도를 판정함
- MacInCloud 서버는 공용 데이터센터 IP라 수많은 로그인 시도가 몰려 Apple이 해당 IP 대역을 위험으로 분류하는 경우가 많음
- 이때는 전화번호가 맞아도 `-24056`으로 인증이 거부됨. 반복 시도하면 차단 시간이 길어짐

## 대응 순서

### 1. 로그인 반복 시도 중단
- 지금 상태에서 계속 재시도하면 차단이 연장됨. 최소 몇 시간~24시간 간격 필요

### 2. 원격 Mac의 Safari에서 먼저 로그인 (권장)
- 원격 Mac에서 Safari를 열고 아래 순서로 로그인:
  1. `appleid.apple.com` 접속 → Apple ID 로그인 → 전화번호 인증 완료
  2. `developer.apple.com` 접속 → 같은 계정으로 로그인
- 브라우저에서 로그인 세션이 만들어지면 Xcode의 Apple Accounts 추가가 통과되는 사례가 많음
- Safari에서도 -24056이 나오면 3번으로

### 3. 집/사무실 PC(일반 가정용 IP)에서 Apple 계정 상태 확인
- 본인 Windows PC의 브라우저에서 `appleid.apple.com` 로그인
- `로그인 및 보안` 메뉴에서:
  - 신뢰할 수 있는 전화번호가 정상 등록되어 있는지 확인
  - 계정 잠금/보안 경고가 있는지 확인
- 가정용 IP에서 정상 로그인되면 계정 자체는 건강한 것이고, MacInCloud IP 차단이 원인으로 확정

### 4. Xcode 로그인 우회: App Store 경유
- 원격 Mac에서 App Store 앱을 열고 Apple ID로 먼저 로그인
- 이후 Xcode → Settings → Apple Accounts에서 다시 추가 시도

### 5. 그래도 안 되면
- 24시간 기다린 뒤 2번 순서로 재시도
- 계속 차단되면 Apple 지원(`support.apple.com/ko-kr`)에 "Apple ID 로그인 시 -24056 오류"로 문의하거나, 계정 복구(`iforgot.apple.com`) 진행
- MacInCloud 지원팀에는 동시에 "Apple ID 로그인이 서버 IP에서 차단된다"고 알려 다른 조치가 있는지 확인

## 차단 해소 후 이어서 할 일 (기존 계획)
1. Signing & Capabilities에서 Team 선택 (Bundle ID `kr.co.nstaff.findar` 확인)
2. `+ Capability` → Push Notifications 추가
3. `+ Capability` → Background Modes 추가 후 Remote notifications 체크
4. 타겟을 `Any iOS Device (arm64)`로 변경
5. `Product → Archive` → Organizer에서 `Distribute App` → App Store Connect → Upload
