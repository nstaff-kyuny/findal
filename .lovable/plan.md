# Mac 로그인 완료 후 iOS 빌드 · App Store 업로드

## 현재 상태
- MacInCloud 서버(ASS-41 / user294508) 로그인 완료, macOS 데스크톱 사용 가능
- 프로젝트에 `ios/App/App.xcodeproj` 및 `ITSAppUsesNonExemptEncryption=false` 설정 이미 존재
- Bundle ID: `kr.co.nstaff.findar`, 앱 표시명: Find AR

## 1단계. 터미널에서 개발 환경 준비
Launchpad 또는 Spotlight(⌘+Space) → `Terminal` 실행 후 순서대로 실행합니다.

```bash
# Homebrew 확인(없으면 설치)
which brew || /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node.js, Git 설치 및 확인
brew install node git
node -v && git --version
```

## 2단계. 프로젝트 가져오기
```bash
cd ~/Documents
git clone <GIT_REPO_URL> findar
cd findar
npm install
npm run build
npx cap sync ios
```
- Git 저장소가 비공개면 클론 시 GitHub 사용자명과 Personal Access Token 입력
- `npx cap sync ios`가 성공하면 iOS 프로젝트 준비 완료

## 3단계. Xcode에서 서명 설정
```bash
npx cap open ios
```
- 왼쪽 트리 최상단 `App` 선택 → `Signing & Capabilities`
- `Automatically manage signing` 체크
- `Team`: Apple Developer 계정 팀 선택(처음이면 Xcode → Settings → Accounts에서 Apple ID 추가)
- `Bundle Identifier`가 `kr.co.nstaff.findar`인지 확인
- `+ Capability` → `Push Notifications` 추가 여부 확인
- 상단 기기 선택 목록에서 `Any iOS Device (arm64)` 선택

## 4단계. Archive 및 업로드
- `Product` → `Archive` (5~15분 소요)
- Organizer 창에서 `Distribute App` → `App Store Connect` → `Upload`
- 자동 서명 진행 → 업로드 완료 후 App Store Connect에서 처리 대기(10~30분)

## 5단계. App Store Connect 마무리
- `Pricing and Availability` → Price Schedule에서 `Free` 저장
- `Prepare for Submission` → Build 섹션에서 업로드된 빌드 선택
- 스크린샷(6.7"), 1024x1024 아이콘, 설명, 키워드, 심사용 테스트 계정 입력
- `Add for Review` → 제출

## 확인 필요
- Git 저장소 URL(비공개인 경우 토큰 준비 여부)
- Xcode에 로그인할 Apple Developer 계정 Apple ID
