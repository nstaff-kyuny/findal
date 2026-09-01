# MacInCloud 개발 환경 설치 오류 해결

## 확인된 원인
화면의 `user294508 may not run sudo` 메시지는 현재 MacInCloud 계정에 관리자 권한이 없다는 뜻입니다. 따라서 관리자 권한이 필요한 Homebrew 설치는 이 서버에서 진행할 수 없습니다.

## 해결 방법

1. Homebrew 설치를 중단하고 현재 설치 상태부터 확인합니다.
   ```bash
   node -v
   npm -v
   git --version
   xcodebuild -version
   ```

2. Node.js가 없다면 `sudo`가 필요 없는 NVM 방식으로 사용자 폴더에 설치합니다.
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
   source ~/.zshrc
   nvm install --lts
   node -v
   npm -v
   ```
   `source ~/.zshrc`에서 파일이 없다는 메시지가 나오면 새 터미널을 열거나 `source ~/.bash_profile`을 실행합니다.

3. Git과 Xcode를 확인합니다.
   - `git --version`과 `xcodebuild -version`이 출력되면 그대로 진행합니다.
   - 설치가 안 되어 있다면 MacInCloud 대시보드의 애플리케이션 설치 요청을 통해 Xcode와 Command Line Tools 설치를 요청합니다. 이 부분은 일반 사용자 계정에서 직접 설치할 수 없습니다.

4. 환경 확인 후 프로젝트를 내려받아 iOS 빌드를 준비합니다.
   ```bash
   cd ~/Documents
   git clone <GitHub 저장소 주소> findar
   cd findar
   npm install
   npm run build
   npx cap sync ios
   npx cap open ios
   ```

5. Xcode에서 Team과 Bundle ID `kr.co.nstaff.findar`를 확인하고 Archive 후 App Store Connect로 업로드합니다.

## 주의사항
- 터미널의 `$` 또는 `AS541-I:~ user294508$` 같은 프롬프트 문자는 입력하지 않습니다.
- 명령어 코드 안의 내용만 한 줄씩 복사해 실행합니다.
- 서버 로그인 비밀번호는 터미널 명령어나 채팅에 입력하지 않습니다.
