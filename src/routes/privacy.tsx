import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BackToSettings } from "@/components/BackToSettings";
import { COMPANY_INFO } from "@/lib/company";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/privacy")({
  component: Page,
  head: () => ({
    meta: [
      { title: "개인정보처리방침 | Find AR" },
      { name: "description", content: "Find AR(파인달) 개인정보처리방침. 수집 항목, 이용 목적, 보유 기간, 제3자 제공, 이용자 권리 등을 안내합니다." },
      { property: "og:title", content: "개인정보처리방침 | Find AR" },
      { property: "og:description", content: "Find AR(파인달) 개인정보처리방침." },
      { property: "og:url", content: "https://findar.nstaff.co.kr/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://findar.nstaff.co.kr/privacy" }],
  }),
});

export const DEFAULT_PRIVACY = `
${COMPANY_INFO.name}(이하 "회사")는 회원의 개인정보를 중요시하며, 「개인정보 보호법」 등 관련 법령을 준수합니다.

1. 수집하는 개인정보 항목
- 필수: 이름, 이메일, 휴대전화번호, 비밀번호
- 구직자 추가: 국적, 비자상태, 경력, 한국어 가능 여부, 선호지역
- 구인자 추가: 회사명, 위치, 담당자명, 담당자 연락처
- 서비스 이용 기록: 접속 IP, 기기정보, 위치정보(선택), 결제기록

2. 개인정보의 수집 및 이용 목적
- 회원 식별 및 본인 확인
- 일자리 매칭 서비스 제공
- 결제 및 크레딧 관리
- 고객 문의 응대
- 서비스 개선 및 부정 이용 방지

3. 개인정보의 보유 및 이용기간
회원 탈퇴 시까지 보관하며, 관련 법령에 따라 일정 기간 보관이 필요한 경우 해당 기간 동안 보관합니다.

4. 개인정보의 제3자 제공
매칭 승인이 완료된 경우, 매칭 상대방에게 연락처가 공개됩니다. 그 외의 경우 동의 없이 제3자에게 제공하지 않습니다.

5. 개인정보의 안전성 확보 조치
회사는 개인정보의 안전한 처리를 위해 기술적, 관리적 보호조치를 시행하고 있습니다.

6. 이용자의 권리
회원은 언제든지 개인정보 열람, 수정, 삭제, 처리정지 등을 요청할 수 있습니다.

7. 개인정보 보호책임자
- 상호: ${COMPANY_INFO.name}
- 대표: ${COMPANY_INFO.ceo}
- 이메일: ${COMPANY_INFO.email || "findar@nstaff.co.kr"}

부칙
본 개인정보처리방침은 2026년 5월 17일부터 시행됩니다.
`.trim();

function Page() {
  const [content, setContent] = useState(DEFAULT_PRIVACY);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from("legal_documents").select("content").eq("kind", "privacy").single();
      if (data?.content) setContent(data.content.trim());
    })();
  }, []);

  return (
    <div className="min-h-screen bg-muted/30 max-w-md mx-auto">
      <header className="sticky top-0 bg-background border-b px-4 py-3 flex items-center gap-2">
        <BackToSettings />
        <h1 className="font-bold">개인정보처리방침</h1>
      </header>
      <div className="p-4">
        <pre className="text-sm whitespace-pre-wrap font-sans leading-7 p-4 bg-background rounded-lg border">
          {content}
        </pre>
      </div>
    </div>
  );
}
