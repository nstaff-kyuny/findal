# MacInCloud를 통한 iOS 빌드 및 App Store 제출 완료

## 현재 상태
- MacInCloud Managed Server Monthly(아시아) 결제 및 서버 활성화 완료
- 서버: ASS-41 - user294508
- MacInCloud 브라우저 원격 화면 연결 완료(`Connected to: AS541.macincloud.com` 확인)

## 남은 단계

### 1. MacInCloud 서버 접속
- 현재 표시된 창은 로그인창이 아니라 원격 세션 정보창이므로 사용자명·비밀번호 입력 불필요
- 서버를 조작할 수 없으면 `Request Control` 클릭
- 팝업 오른쪽 위 `X`를 눌러 닫고, 뒤에 보이는 macOS 화면에서 작업 진행
- 별도의 원격 데스크톱 앱으로 접속할 때만 대시보드의 `download connection files`에서 받은 연결 파일과 안내 이메일의 계정 정보 사용

### 2. 개발 환경 설정 (Mac 서버 내 터미널)
```bash
# Homebrew 확인/설치
which brew || /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node.js, Git 설치
brew install node git
node -v && git --version

# 프로젝트 클론
git clone <GIT_REPO_URL>
cd <PROJECT_FOLDER>

# 의존성 설치 및 Capacitor iOS 동기화
npm install
npx cap sync ios
```

### 3. Xcode에서 서명 설정 및 빌드
- Xcode 실행 → File → Open → `ios/App/App.xcodeproj` 열기
- 왼쪽 App 선택 → Signing & Capabilities 탭
- Team: 본인 Apple Developer 팀 선택
- Bundle Identifier: `kr.co.nstaff.findar` 확인
- Push Notifications capability 활성화 확인
- 상단 빌드 대상: Any iOS Device (arm64) 선택
- Product → Archive 실행

### 4. App Store Connect 업로드
- Archive 완료 후 Distribute App → App Store Connect → Upload
- 업로드 완료 후 App Store Connect의 "Prepare for Submission"에서 빌드 선택
- Pricing and Availability에서 Free 설정 확인
- 심사 제출

## 결정 필요 사항
- Git 저장소 URL이 준비되어 있는지 확인 필요
- Apple Developer 팀이 개인 계정인지 법인/조직 계정인지 확인 필요
