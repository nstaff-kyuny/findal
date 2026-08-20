# Android AAB 빌드 및 Play Console 업로드

## 현재 상태
- Android Studio에서 Gradle Sync / Build 성공 (`Build android: finished` 확인)
- `app/google-services.json` 및 Capacitor 플러그인 정상 인식
- 다음 단계: 서명된 AAB 생성 → Play Console 업로드

## 1. 서명된 AAB 생성 (Android Studio)
1. 메뉴 **Build → Generate Signed App Bundle / APK...** 선택
2. **Android App Bundle** 선택 후 **Next**
3. 키스토어:
   - 기존 키스토어가 있으면 선택
   - 없으면 **Create new...** 로 신규 생성
     - Key store path, password, Key alias, password 기록 후 안전 보관
     - **분실 시 앱 업데이트 불가능하므로 반드시 백업**
4. Build variant: **release** 선택
5. **Finish** 클릭
6. 생성된 파일 확인: `android/app/release/app-release.aab`

## 2. Play Console 업로드
1. [Google Play Console](https://play.google.com/console) 접속 → 앱 선택
2. **Production** (또는 Internal testing) → **Create new release**
3. `app-release.aab` 파일 업로드
4. 릴리스 노트 작성 (한국어 필수, 변경 사항 요약)
5. 검토 후 제출

## 3. 사전 체크리스트 (업로드 전)
- [ ] 개인정보처리방침 URL: `https://findar.nstaff.co.kr/terms`
- [ ] 데이터 보안 설문 완료 (수집 항목: 이메일, 이름, 전화번호 등)
- [ ] 앱 아이콘 512×512, 스크린샷 2~8장 준비
- [ ] 지원 이메일 / 문의 URL 등록
- [ ] 광고 없음 설정

## 4. 권장 사항
- OneDrive 경로(`C:\Users\kyuny\OneDrive\Find AR`)에서 빌드 시 파일 동기화로 간헐 오류 가능
- 안정적인 빌드를 위해 `C:\Projects\FindAR` 등 한글/공백 없는 로컬 경로로 프로젝트 통째로 복사 후 빌드 권장

## 의사결정 필요
- 키스토어를 신규 생성할지, 기존 키스토어가 있는지 확인 필요
- 첫 릴리스를 **Production**으로 할지, **Internal testing**으로 먼저 테스트할지 결정 필요
