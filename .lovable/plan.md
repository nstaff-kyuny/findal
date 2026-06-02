## 작업 계획 (6가지 요청)

### 1. 업종/직무 관리 (관리자)
- **DB**: `custom_industries`, `custom_job_roles` 테이블 신설 (관리자만 CRUD, 모두 읽기 가능)
- 기존 `INDUSTRY_LABEL`/`ROLES_BY_INDUSTRY` (constants.ts)는 기본값(seed)으로 유지하되, 런타임에 DB의 custom 항목과 머지
- `src/lib/constants.ts`를 hook 기반(`useIndustries`, `useJobRoles`)으로 확장하거나, 앱 부팅 시 DB에서 불러와 메모리 머지
- 관리자 페이지(`src/routes/admin.tsx`)에 "업종/직무 관리" 탭 추가 — 추가/수정/삭제 UI
- 공고 등록/수정 페이지에서 이 머지된 목록 사용

### 2. 단기계약(월급) 공고 타입
- **DB jobs 컬럼 추가**: `contract_type` ('daily' | 'monthly'), `monthly_wage` int, `contract_months` int nullable (null=1개월이상)
- `src/routes/employer/jobs/new.tsx` 및 `edit.$id.tsx`:
  - "일당 / 단기계약" 토글
  - 단기계약 선택 시: 일당 → 월급여 입력, 근무일자 선택 UI → "계약 기간(개월)" 입력 + "1개월 이상" 체크박스
- 구직자 공고 카드/상세(`featured.tsx`, `home.tsx`, `seeker/jobs.$id.tsx`)에서 단기계약이면 "월 ₩X,XXX,XXX" 형식으로 표기
- 언어팩(`i18n-dict.ts`) 키 추가: `contract_daily`, `contract_monthly`, `monthly_wage`, `contract_months`, `one_month_plus`, `per_month` (ko/en/mn/ru/zh)

### 3. 지난 공고 [완료] 흑백 표시
- 구직자 홈(`seeker/home.tsx`)과 추천(`seeker/featured.tsx`) 카드:
  - `work_dates`의 최대일이 오늘 이전이거나, `contract_type=monthly`이면서 시작 후 `contract_months` 경과한 경우 → 카드에 `grayscale` 클래스 + 우상단 "완료" 배지
- 언어팩 키: `completed_badge` 추가

### 4. "상세주소" → "상세위치"
- `employer/jobs/new.tsx`, `employer/jobs/edit.$id.tsx`, `seeker/jobs.$id.tsx` 라벨 변경
- 언어팩 키 `detail_location` 갱신 (이미 있으면 텍스트 수정)

### 5. 준비물 textarea 2줄 추가
- `rows={5}` → `rows={7}`

### 6. 근무일자 카드 영역 간격 조정
- 첨부 스크린샷 영역: `근무일자` 입력 / `기본 연락처 사용` 스위치 / `등록` 버튼이 너무 붙어있음
- 카드 `space-y-3` → `space-y-4`, 또는 해당 블록에 `pt-2` 마진 추가

### 기술 메모
- 마이그레이션 1회: `custom_industries`, `custom_job_roles` 테이블 + `jobs.contract_type`/`monthly_wage`/`contract_months` 컬럼 추가
- 마이그레이션 승인 후 코드 변경 진행
- 모든 신규 UI 텍스트는 `useI18n().t(...)` 사용해 언어팩 즉시 반영

---

이 계획대로 진행할까요? 승인해주시면 1) 마이그레이션 먼저 올리고 2) 코드 변경을 일괄로 진행하겠습니다.
