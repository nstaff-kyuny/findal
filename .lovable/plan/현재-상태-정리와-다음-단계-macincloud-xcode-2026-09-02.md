# 현재 상태 정리와 다음 단계 (MacInCloud / Xcode)

## 지금 확인된 것
- 키보드 입력은 정상 복구됨 (명령이 잘 입력되고 있음)
- 현재 계정으로 Xcode 프로세스는 실행 중 (PID 14636)
- `sudo xcodebuild -license accept` 는 **사용할 수 없음**  
  → 터미널 메시지: `user294508 is not in the sudoers file` (관리자 권한 없는 계정)
- `open -a Xcode "$HOME/findal/ios/App/App.xcodeproj"` 는 오류 없이 실행되지만 창이 화면에 보이지 않음

즉, 남은 문제는 두 가지입니다: (1) 관리자 권한이 없어 터미널로 라이선스 동의 불가, (2) Xcode 창이 화면에 올라오지 않음.

## 해결 방향
터미널을 더 쓰지 않고 **화면(GUI)에서 Xcode를 직접 실행**합니다. 라이선스 동의도 Xcode 창에서 버튼 클릭으로 처리할 수 있어 관리자 권한이 필요 없습니다.

### 1단계: 화면에서 Xcode 직접 실행
1. 화면 맨 아래 앱 아이콘 줄(Dock)에서 회색 망치 아이콘(Xcode)을 클릭
2. 없으면 화면 맨 위 왼쪽 돋보기 아이콘 클릭 → `Xcode` 입력 → Enter
3. 1~5분 기다림 (첫 실행은 느림)

### 2단계: 첫 실행 화면 처리
- 사용 약관 창 → **Agree**
- 추가 구성요소 설치 창 → **Install**
- 비밀번호를 물으면 MacInCloud 접속 비밀번호 입력 (여기서는 관리자 권한 없이도 통과되는 경우가 있음)
- 비밀번호 단계에서 막히면 3단계로 진행

### 3단계: 관리자 권한이 필요하다고 나올 경우
MacInCloud 지원(도와주세요 → 지원 요청)에 아래 문장을 그대로 전달:

```text
Xcode first launch requires admin privileges, but my account (user294508)
is not in the sudoers file. Please accept the Xcode license and run
"xcodebuild -runFirstLaunch" on the server, or grant my account admin rights.
```

### 4단계: Xcode 창이 열린 뒤 (앱 업로드 단계)
1. **File → Open** → `findal` → `ios` → `App` → `App.xcodeproj` 열기
2. 왼쪽 목록에서 **App** 클릭 → **Signing & Capabilities** 탭
3. **Automatically manage signing** 체크, **Team** 에 애플 개발자 계정 선택
4. Bundle Identifier 가 `kr.co.nstaff.findar` 인지 확인
5. **+ Capability** → **Push Notifications** 추가
6. 상단 기기 선택에서 **Any iOS Device (arm64)** 선택
7. **Product → Archive** (10~20분 소요)
8. 완료 창에서 **Distribute App → App Store Connect → Upload**

## 참고
- 이 단계는 모두 MacInCloud 원격 Mac에서 직접 수행하는 작업이며, 프로젝트 코드 변경은 필요하지 않습니다.
- 코드 쪽 준비(번들 ID, 푸시 설정, 암호화 신고 항목)는 이미 완료된 상태입니다.
