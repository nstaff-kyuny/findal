# Apple 2단계 인증 오류 해결 계획

## 현재 화면에서 진행
1. **Resend code는 누르지 않습니다.** 현재 번호는 Apple이 일시적으로 코드 발송을 제한한 상태입니다.
2. 화면 아래 **Can’t use this number?**를 선택합니다.
3. 표시되는 목록에서 사용할 수 있는 **다른 신뢰 전화번호**를 선택합니다.
4. 문자 메시지 또는 음성 통화로 받은 6자리 코드를 입력합니다.
5. Safari에서 Apple Developer 로그인이 완료되면 Xcode로 돌아가 **Settings → Accounts → Apple Account** 로그인을 한 번만 시도합니다.

## 다른 번호가 목록에 없을 때
- Windows나 이미 신뢰된 Apple 기기에서 Apple 계정 관리 페이지에 로그인합니다.
- **로그인 및 보안 → 계정 보안 → 신뢰하는 전화번호**에서 다른 번호를 먼저 등록·확인합니다.
- 등록 직후 반복 시도하지 않고 잠시 기다린 다음, Safari에서 다시 **Can’t use this number?**를 선택합니다.

## 계속 실패할 때
- 최소 몇 시간, 가능하면 24시간 동안 인증을 재시도하지 않습니다.
- 이후 일반 인터넷 환경에서 Apple 계정 로그인을 먼저 확인한 뒤 MacInCloud Safari에서 한 번만 재시도합니다.
- 동일한 문구가 계속되면 Apple 지원에 화면의 정확한 오류 문구와 원격 Mac 환경에서 발생했다는 점을 전달해 인증 제한 해제를 요청합니다.

## 인증 성공 후 다음 단계
Xcode에서 Team 선택 → Bundle Identifier `kr.co.nstaff.findar` 확인 → Push Notifications 및 Background Modes 활성화 → Archive 및 App Store Connect 업로드 순으로 진행합니다.
