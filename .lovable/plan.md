# 현재 위치에서 Xcode 프로젝트 열기

## 확인된 상태
- `xcodebuild -checkFirstLaunchStatus`가 오류 없이 끝났으므로 Xcode 초기 구성은 완료된 상태입니다.
- 현재 프롬프트가 `AS541-I:~`이므로 터미널은 프로젝트 폴더가 아니라 홈 폴더에 있습니다.
- 따라서 `$(pwd)/ios/App/App.xcodeproj`는 `/Users/user294508/ios/App/App.xcodeproj`가 되어 파일 없음 오류가 발생했습니다.

## 진행 순서

### 1. 프로젝트 폴더 찾기
터미널에 아래 명령을 그대로 입력합니다.

```bash
find ~ -name App.xcodeproj -type d 2>/dev/null
```

검색 결과가 나올 때까지 잠시 기다립니다. 정상이라면 아래와 비슷한 경로가 표시됩니다.

```text
/Users/user294508/Documents/findar/ios/App/App.xcodeproj
```

### 2. 검색된 프로젝트를 Xcode로 열기
검색 결과가 위 예시와 같다면 다음 명령을 입력합니다.

```bash
open -n -a Xcode "/Users/user294508/Documents/findar/ios/App/App.xcodeproj"
```

실제 출력 경로가 다르면 따옴표 안에 검색된 전체 경로를 그대로 넣습니다.

### 3. Xcode 창 확인
- 1~2분 기다린 뒤 Dock의 Xcode 아이콘을 한 번 클릭합니다.
- 창이 뒤에 숨어 있으면 상단 메뉴에서 `Window > Bring All to Front`를 선택합니다.
- 처음 뜨는 라이선스나 구성요소 설치 창은 `Agree` 또는 `Install`을 선택합니다.

### 4. 검색 결과가 전혀 없을 때
프로젝트가 다른 위치에 있거나 내려받기가 완료되지 않은 상태입니다. 아래 명령으로 홈 폴더를 확인합니다.

```bash
ls ~
ls ~/Documents
```

`findar` 또는 `findal` 폴더가 보이면 해당 폴더로 이동한 뒤 확인합니다.

```bash
cd ~/Documents/findar
ls ios/App/App.xcodeproj
open -n -a Xcode ./ios/App/App.xcodeproj
```

폴더명이 `findal`이면 위 명령의 `findar`만 `findal`로 바꿉니다.

## 다음 확인 지점
우선 `find ~ -name App.xcodeproj -type d 2>/dev/null` 명령 결과로 정확한 프로젝트 경로를 확인합니다. 그 결과가 나오면 해당 전체 경로로 Xcode를 엽니다.
