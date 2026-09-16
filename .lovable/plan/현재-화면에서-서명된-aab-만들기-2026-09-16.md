# 현재 화면에서 서명된 AAB 만들기

## 확인된 상태
- Android Studio에 `app`, `google-services.json`, Capacitor 모듈이 표시되어 있어 Android 프로젝트는 이미 열려 있습니다.
- PowerShell은 `C:\Windows\system32`에 있으며, `<내사용자이름>`과 `<저장소주소>`를 실제 값으로 바꾸지 않아 명령이 실패했습니다.
- `git`도 현재 PC에 설치되어 있지 않지만, 프로젝트가 이미 열려 있으므로 지금은 복제 명령이 필요하지 않습니다.

## 지금 할 일
1. PowerShell 창은 닫습니다. 마지막의 `cd findal`도 실행할 필요가 없습니다.
2. Android Studio 오른쪽 아래의 **Project update recommended** 알림은 지금 업데이트하지 말고 닫거나 무시합니다.
3. 화면 왼쪽 위 **☰ 메뉴**를 클릭합니다.
4. **Build → Generate Signed App Bundle or APK…**를 선택합니다.
5. **Android App Bundle**을 선택하고 **Next**를 누릅니다.
6. 키스토어 선택 화면에서:
   - 이전에 만든 `.jks` 또는 `.keystore` 파일이 있으면 **Choose existing**으로 기존 파일을 선택합니다.
   - 처음 만드는 경우에만 **Create new…**를 누릅니다.
7. 새 키스토어를 만들 때 입력합니다.
   - Key store path: 예시 `C:\FindAR-Key\findar-release.jks`
   - Password: 직접 정한 비밀번호
   - Alias: `findar`
   - Validity: 25년 이상
   - Certificate 이름/조직: 회사의 실제 정보
8. `.jks` 파일, 키스토어 비밀번호, alias, key 비밀번호를 별도로 안전하게 백업합니다. 분실하면 이후 앱 업데이트가 어렵습니다.
9. 키스토어 정보를 선택·입력하고 **Next**를 누릅니다.
10. **release**를 선택하고 **Create/Finish**를 누릅니다.
11. 완료 알림의 **Locate**를 눌러 `.aab` 파일 위치를 확인합니다. 일반적인 위치는 `android\app\release\app-release.aab` 또는 `android\app\build\outputs\bundle\release\app-release.aab`입니다.
12. 생성된 `.aab`를 Google Play Console의 **내부 테스트 → 새 버전 만들기 → 앱 번들 업로드**에 올립니다.

## 주의
- 이미 Play Console에 이전 버전을 올린 적이 있다면 반드시 당시 사용한 키스토어를 다시 사용해야 합니다.
- 지금 보이는 **No Devices**는 실제 휴대폰이 연결되지 않았다는 뜻이며 AAB 생성에는 문제가 없습니다.
- 빌드 메뉴에서 해당 항목이 없거나 오류가 나타나면 그 화면을 캡처해 다음 단계에서 확인합니다.
