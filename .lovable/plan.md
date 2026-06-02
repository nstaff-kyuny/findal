## 작업 계획

### 1. 광고 배너 관리 (관리자 + AI 생성)
- `ad_banners` 테이블은 이미 존재 (image_url, link_url, title, active, starts_at, ends_at).
- 관리자(`admin.tsx`)에 **광고 배너 관리** 섹션 추가:
  - 배너 목록 / 등록 / 수정 / 삭제
  - **AI 배너 생성**: 텍스트 입력 → `imagegen` 또는 Lovable AI image API로 640x200 (16:5) PNG 생성 → `ad-banners` 버킷 업로드 → URL 자동 입력
  - 사이즈: **640×200 (16:5)**, 모바일에서 가로 꽉 차는 비율
- `seeker/featured.tsx` 광고 섹션을 16:5 고정 비율(`aspect-[16/5]`)로 표시
- `featured.tsx`에서 보던 기존 광고 표시 로직은 유지 (이미 ad_banners 사용 중)

### 2. AI 채팅으로 추천받기 (구직자 추천 페이지 상단)
- `seeker/featured.tsx` 상단에 접을 수 있는 `AiJobMatchChat` 컴포넌트 추가
- 새 server function `getSeekerJobChatReply` (in `src/lib/ai.functions.ts`):
  - 입력: 대화 히스토리, 현재 사용자 lang
  - LLM(`google/gemini-3-flash-preview`)이 직종/지역/희망급여 등 정보를 자연스럽게 수집
  - 충분한 정보 모이면 structured output으로 `{ industries, roles, regions, minWage }` 반환
- 추출된 조건으로 `supabase.from("jobs")` 필터 → 추천 카드(2~6개) 채팅 하단에 표시
- 다국어: 시스템 프롬프트에 사용자 `lang` 전달 → 해당 언어로 응답
- UI 라벨: `i18n-dict.ts`에 새 키 추가 (`ai_match_title`, `ai_match_placeholder`, `ai_match_recommend` 등 5개국어)

### 3. 러시아어 번역 개선
- `src/lib/i18n-dict.ts`의 `ru` 키를 전수 점검
- 너무 직역되어 딱딱한 표현 자연스럽게 다듬기 (구어/존중 톤)
- 주요 화면 라벨(공고, 신청, 승인, 알림, 결제, 프로필 등) 중심으로 자연스러운 러시아어로 교체

### 4. 신청/승인 내역 검색
- `employer/applications.tsx`에 검색 입력창 1개 추가
- 모든 상태 탭(pending/approved/rejected/confirmed/no_show 등)에서 동일 적용
- 검색 대상: 신청자 이름(profile.full_name), 업무장소(job.place_name), 날짜(work_dates), 업무(job.title / job_role 라벨)
- 클라이언트 사이드 필터링 (이미 join 데이터 있음)

### 5. 공고별 승인자 PDF
- `employer/applications.tsx` 승인 탭 상단에 "공고별 보기" 토글 추가
- 공고별로 그룹화 → 각 공고 카드에 "PDF 다운로드" 버튼
- 클라이언트에서 `jspdf` + `jspdf-autotable`로 생성 (한글 폰트 임베드)
- PDF 내용: 공고명/장소/일자/모집인원, 표 (이름·연락처·국적·비자·한국어가능·경력·승인일·확정일)
- 한글 폰트: Noto Sans KR Regular base64 임베드 또는 가벼운 한글 폰트

### 6. 필요인원 초과 승인 차단
- DB의 `approve_application` 함수를 수정:
  - 승인 직전, 같은 `job_id`의 `approved`+`confirmed` 카운트가 `jobs.headcount` 이상이면 `RAISE EXCEPTION 'HEADCOUNT_FULL'`
- 정원 도달 시 `jobs.is_active = false` 자동 설정 (선택: 해당 트리거 또는 함수 내부)
- 프론트(`employer/applications.tsx`)에서 에러 메시지 한글로 토스트 표시

### 기술 노트
- AI 이미지 생성: 백엔드 server function에서 Lovable AI Gateway `/v1/images/generations` 호출 → base64 PNG → Storage `ad-banners` 업로드 → URL 반환
- 모든 server function은 `requireSupabaseAuth` + admin 권한 체크
- PDF 한글 폰트는 한 번만 lazy load (CDN base64) 하여 번들 크기 영향 최소화

진행해도 될까요?