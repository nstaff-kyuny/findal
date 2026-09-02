# MacInCloud를 통한 iOS 빌드 및 App Store 업로드

## 현재 상태
- MacInCloud 서버(ASS-41 / user294508) 로그인 완료
- 개발 환경 확인 완료: Node.js v25.9.0, npm 11.12.1, git 2.50.1, Xcode 26.6
- Lovable 프로젝트의 GitHub 연결 완료: `nstaff-kyuny/findal`
- 저장소가 private이라 `git clone` 시 GitHub 인증(사용자명/비밀번호) 요청 발생
- GitHub은 비밀번호 인증을 폐지했으므로, 저장소를 public으로 전환하여 인증 없이 clone 진행
- Bundle ID: `kr.co.nstaff.findar`, 앱 표시명: Find AR
- iOS 프로젝트 파일(`ios/App/App.xcodeproj`) 및 `ITSAppUsesNonExemptEncryption=false` 설정 존재

## 단계별 진행 계획

### 1단계. GitHub 저장소를 public으로 변경
1. 브라우저에서 `https://github.com/nstaff-kyuny/findal` 접속
2. 상단 **Settings** 탭 클릭
3. 하단 **Danger Zone** 섹션에서 **Change visibility** 클릭
4. **Change to public** 선택 후 확인 문구 입력 → **I understand, make this repository public.** 클릭
5. 저장소가 public으로 전환되면 주소 끝에 🔓 잠금 해제 아이콘이 표시됨

### 2단계. MacInCloud 서버에 프로젝트 가져오기
1. MacInCloud 터미널에서 아래 명령 실행
   ```bash
   cd ~/Documents
   rm -rf findar
   git clone https://github.com/nstaff-kyuny/findal.git findar
   cd findar
   npm install
   npm run build
   npx cap sync ios
   ```
2. `npx cap sync ios`가 성공하면 iOS 네이티브 프로젝트 준비 완료

### 3단계. Xcode에서 서명 및 빌드 설정
1. 터미널에서 `npx cap open ios` 실행
2. Xcode 왼쪽 트리 최상단 `App` 선택 → **Signing & Capabilities**
3. **Automatically manage signing** 체크
4. **Team**: 본인 Apple Developer 팀 선택
5. **Bundle Identifier**가 `kr.co.nstaff.findar`인지 확인
6. **Push Notifications** capability 추가 여부 확인
7. 상단 기기 선택 목록에서 **Any iOS Device (arm64)** 선택

### 4단계. Archive 및 App Store Connect 업로드
1. Xcode 메뉴 **Product → Archive** 실행 (5~15분 소요)
2. Archive 완료 후 Organizer 창에서 **Distribute App** 클릭
3. **App Store Connect** → **Upload** 선택
4. 자동 서명 진행 → 업로드 완료 후 App Store Connect에서 처리 대기 (10~30분)

### 5단계. App Store Connect에서 심사 제출
1. **Pricing and Availability** → Price Schedule에서 **Free** 저장
2. **Prepare for Submission** → Build 섹션에서 업로드된 빌드 선택
3. 스크린샷(6.7"), 1024x1024 아이콘, 설명, 키워드, 심사용 테스트 계정 입력
4. **Add for Review** → 제출

## 확인 필요 사항
- GitHub 저장소 public 전환 완료 여부
- Apple Developer 팀이 개인 계정인지 법인/조직 계정인지
- App Store Connect에서 앱 정보(이름, 부제목, 개인정보 처리방침 URL 등) 준비 여부
