# 숨겨진 Xcode 창 찾기

## 확인된 상태
- Applications의 `Xcode`를 실행하면 이미 열려 있다는 메시지가 표시됨
- 화면에는 Xcode 창이 보이지 않음
- 따라서 Xcode 앱은 실행 중이지만 열린 창이 없거나 다른 화면 뒤에 숨은 상태로 진행

## 진행 순서
1. 화면 맨 아래 앱 아이콘 줄에서 **청사진 위 망치 모양의 Xcode 아이콘**을 한 번 클릭
2. 화면 맨 위 왼쪽 메뉴가 `Xcode  File  Edit ...`로 바뀌는지 확인
3. 메뉴가 Xcode로 바뀌면 맨 위 **Window**를 클릭하고 **Bring All to Front** 선택
4. 그래도 창이 없으면 맨 위 **File → Open...** 선택
5. 파일 선택 창에서 `사용자 홈 → findal → ios → App → App.xcodeproj` 선택 후 **Open** 클릭
6. Xcode 메뉴 자체가 나타나지 않으면 Dock의 Xcode 아이콘을 마우스 오른쪽 클릭하고 **Show All Windows** 또는 **New Window** 선택

## 그래도 창이 없을 때
터미널에서 관리자 권한 없이 현재 계정의 Xcode만 종료하고 프로젝트를 다시 엽니다.

```bash
pkill -x Xcode
open -n -a Xcode "$HOME/findal/ios/App/App.xcodeproj"
```

1~3분 기다린 뒤 Dock의 Xcode 아이콘을 한 번 클릭합니다. 계속 창이 없다면 원격 Mac의 GUI 세션 문제이므로 MacInCloud 지원팀에 현재 계정의 Xcode GUI 세션 초기화를 요청합니다.
