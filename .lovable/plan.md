## 목표
구직자(seeker) 화면 전체를 5개 언어(한국어/영어/몽골어/러시아어/중국어)로 표시. 관리자·구인자 화면은 한국어 유지.

## 1. 언어 저장 구조
- `seeker_profiles`에 `preferred_language text default 'ko'` 컬럼 추가 (ko/en/mn/ru/zh).
- 로그인 직후 / 온보딩 단계에서 언어 선택 화면 노출 → DB에 저장.
- 동시에 `localStorage["seeker_lang"]`에도 미러링(앱 부팅 시 깜빡임 방지).
- 구직자 설정 페이지(`/seeker/me`)에 "언어 변경" 항목 추가.

## 2. i18n 코어 (`src/lib/i18n.tsx`)
- `LanguageProvider` Context: `{ lang, setLang, t(key), tDynamic(text[]) }`.
- `t(key)`: 정적 UI 문자열 사전 조회 (5개 언어 사전 하드코딩).
- `tDynamic(texts)`: DB에서 온 한국어 텍스트(공고 제목, 업체명, 메모 등) → 기존 `translateTexts` 서버펑션으로 일괄 번역. 결과를 `localStorage`에 `hash(text)+lang` 키로 캐싱하여 재호출 최소화.
- `MobileLayout` 등 구직자 컴포넌트만 Provider로 감싸고, 관리자/구인자/`manager.tsx`/`admin.tsx`/`admin2.tsx`는 영향 없음.

## 3. 정적 문자열 사전 (`src/lib/i18n-dict.ts`)
다음 카테고리만 5개 언어로 번역:
- 메뉴/탭 라벨 ("홈", "추천", "신청내역", "즐겨찾기", "내 정보")
- 공통 버튼/상태 ("신청하기", "승인", "대기", "확정", "노쇼")
- 산업/직무 라벨 (`INDUSTRY_LABEL`, `ROLE_LABEL` → 언어별 매핑)
- 지역명(`REGIONS`) → 언어별 매핑
- 페이지 헤더/안내 문구
- "일당", "원", "근무일", "협의" 등 단위/포맷

## 4. 동적 콘텐츠 번역 처리
대상: `jobs.title`, `jobs.place_name`, `jobs.preparations`, `employer_profiles.company_name` 등.
- 카드/배너 리스트 렌더 직전에 표시 대상 텍스트 모아 `tDynamic(texts)` 호출.
- 비동기 결과로 다시 setState → 한국어 ko 모드에서는 호출 자체를 스킵.
- 캐시 키: `lang::sha1(text)` 형태로 localStorage(최대 ~200KB 윈도우 LRU).
- 비용 보호: 한 화면당 최대 50개 항목, 같은 텍스트 중복 제거.

## 5. 적용 대상 화면
- `MobileLayout` 하단 탭 라벨, 상단 헤더
- `routes/seeker/home.tsx` (검색 UI + 공고 카드)
- `routes/seeker/featured.tsx` (추천 배너)
- `routes/seeker/favorites.tsx` (즐겨찾기 카드)
- `routes/seeker/applications.tsx` (상태 라벨)
- `routes/seeker/jobs.$id.tsx` (공고 상세)
- `routes/seeker/me.tsx` (설정 화면 + 언어 변경)
- `routes/onboarding.tsx` (seeker 분기에서 언어 선택 1단계 추가)
- `routes/auth.tsx` (구직자 로그인 직후 첫 진입 시 언어 미선택이면 선택 모달)

영향 없음(한국어 유지): `routes/admin.tsx`, `routes/admin2.tsx`, `routes/manager.tsx`, 모든 `routes/employer/*`, `routes/guide.$role.tsx`(이미 자체 번역 기능 있음).

## 6. DB 마이그레이션
```sql
ALTER TABLE public.seeker_profiles
  ADD COLUMN preferred_language text NOT NULL DEFAULT 'ko'
  CHECK (preferred_language IN ('ko','en','mn','ru','zh'));
```

## 7. 작업 순서
1. 마이그레이션 추가 (preferred_language).
2. `src/lib/i18n.tsx` + `src/lib/i18n-dict.ts` 생성 (사전 + Provider + 캐시).
3. `MobileLayout`을 LanguageProvider로 감싸고 탭 라벨 t() 적용.
4. seeker 화면별로 t() / tDynamic() 적용 (home → featured → favorites → applications → jobs.$id → me).
5. `onboarding.tsx`에 언어 선택 단계 추가, `auth.tsx`에서 seeker 첫 로그인 시 보장.
6. `seeker/me.tsx`에 언어 변경 셀렉트 추가.

## 비용·성능 메모
- 동적 번역은 Lovable AI Gateway(`google/gemini-2.5-flash-lite`) 사용 → 카드 50개 일괄 1회 호출, 캐싱으로 재방문은 0회 호출.
- ko 선택 시 번역 경로 완전 우회.
