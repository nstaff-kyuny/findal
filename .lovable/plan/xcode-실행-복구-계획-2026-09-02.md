# Xcode 실행 복구 계획

## 확인된 문제
- 현재 터미널 계정은 `user294508`입니다.
- 프로세스 목록의 Xcode는 `user283212`, `user919210` 등 다른 사용자 소유이며, 현재 계정의 Xcode는 실행 중이 아닙니다.
- 따라서 다른 Xcode 프로세스를 종료하는 방식은 해결책이 아니며, 현재 원격 데스크톱 세션에서 앱 실행 서비스가 정상 연결됐는지 확인해야 합니다.

## 진행 순서
1. 현재 계정의 GUI 세션과 Xcode 설치 상태를 읽기 전용 명령으로 확인합니다.
2. GUI 세션이 정상이면 Finder의 응용 프로그램 폴더에서 Xcode를 직접 실행합니다.
3. GUI 세션이 없거나 응답하지 않으면 MacInCloud에서 로그아웃 후 재접속하여 새 데스크톱 세션을 만든 뒤 실행합니다.
4. Xcode가 열린 후 `findal/ios/App/App.xcodeproj`를 열고, 공식 앱 이름 `findar`와 번들 ID `kr.co.nstaff.findar`를 기준으로 서명 설정을 이어갑니다.

## 다음에 실행할 진단 명령
터미널에 아래 명령을 한 줄씩 입력하고 결과 화면을 확인합니다.

```bash
whoami
ls -ld /Applications/Xcode.app
launchctl print gui/$(id -u) | head -20
```

다른 사용자 프로세스에는 영향을 주지 않습니다.

<presentation-actions>
  <presentation-open-history>View History</presentation-open-history>
</presentation-actions>

<presentation-actions>
<presentation-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</presentation-link>
</presentation-actions>
