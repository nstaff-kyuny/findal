# Android 빌드 진행 (로컬 PC 작업)

코드 변경은 필요하지 않습니다. 로컬 PC에서 아래 순서로만 진행하면 됩니다.

## 1. cmd 열기
1. `Win + R` → `cmd` 입력 → Enter
2. 프로젝트 최상위 폴더로 이동
```
cd /d "C:\Users\kyuny\OneDrive\Find AR\Find AR"
```

## 2. 패키지 설치 및 Android 동기화
```
npm install
npx cap sync android
```
- `npm install`: 3~10분 소요
- `npx cap sync android`: `android\capacitor-cordova-android-plugins` 폴더를 생성해 이전 "Could not read script" 오류를 해소

## 3. Android Studio에서 다시 열기
1. Android Studio 실행 → **Open**
2. `...\Find AR\android` 폴더 선택
3. **File → Sync Project with Gradle Files**
4. Sync 성공 시 좌측 트리에 `app` 폴더와 `app/google-services.json` 확인

## 4. AAB 빌드
1. **Build → Generate Signed App Bundle / APK**
2. **Android App Bundle** 선택
3. 키스토어 **Create new...** (파일 경로/비밀번호/별칭 기록 후 안전 보관 — 분실 시 앱 업데이트 불가)
4. Build Variant: **release**
5. 생성 위치: `android\app\release\app-release.aab`

## 5. Play Console 업로드
1. Play Console → 앱 선택 → **Production**(또는 Internal testing) → **Create new release**
2. `.aab` 업로드 → 릴리스 노트 작성 → 검토 후 제출

## 참고 (권장 사항)
- 프로젝트가 OneDrive 경로에 있으면 파일 동기화 때문에 Gradle 빌드가 간헐적으로 실패합니다. `C:\Projects\FindAR` 처럼 OneDrive 밖, 한글/공백 없는 경로로 옮기면 안정적입니다.
- PowerShell을 쓰고 싶을 때는 해당 창에서 `Set-ExecutionPolicy -Scope Process -Bypass` 를 먼저 실행하면 npm 스크립트가 허용됩니다.
