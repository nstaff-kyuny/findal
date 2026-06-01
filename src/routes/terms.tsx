import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BackToSettings } from "@/components/BackToSettings";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { COMPANY_INFO } from "@/lib/company";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/terms")({
  component: Page,
  head: () => ({
    meta: [
      { title: "이용약관 및 개인정보처리방침 | Find AR" },
      { name: "description", content: "Find AR(파인달) 통합 회원 이용약관, 개인정보처리방침, 마케팅 수신 동의 안내." },
      { property: "og:title", content: "이용약관 및 개인정보처리방침 | Find AR" },
      { property: "og:description", content: "Find AR(파인달) 통합 회원 약관 및 개인정보처리방침." },
      { property: "og:url", content: "https://findar.nstaff.co.kr/terms" },
    ],
    links: [{ rel: "canonical", href: "https://findar.nstaff.co.kr/terms" }],
  }),
});

export const DEFAULT_TERMS = `
제1조 (목적)
이 약관은 ${COMPANY_INFO.name}(이하 "회사")가 제공하는 ${COMPANY_INFO.appName} 서비스(이하 "서비스")의 이용과 관련하여 회사와 회원의 권리, 의무 및 책임사항 등을 규정함을 목적으로 합니다.

제2조 (정의)
1. "서비스"란 회사가 제공하는 일용직 매칭 플랫폼을 의미합니다.
2. "회원"이란 본 약관에 동의하고 회원가입을 한 자를 말합니다.
3. "구인자"는 인력을 채용하려는 회원, "구직자"는 일자리를 찾는 회원을 말합니다.

제3조 (약관의 효력 및 변경)
회사는 관련 법령을 위반하지 않는 범위 내에서 본 약관을 변경할 수 있으며, 변경 시 공지사항을 통해 사전 고지합니다.

제4조 (회원가입)
회원가입은 이용자가 약관에 동의하고 회사가 정한 양식에 따라 회원정보를 기입한 후 회사가 승낙함으로써 체결됩니다.

제5조 (서비스 이용)
구직자는 회원가입 후 무료로 서비스를 이용할 수 있으며, 구인자는 크레딧을 통해 매칭 승인 등의 유료 서비스를 이용할 수 있습니다.

제6조 (회원의 의무)
회원은 허위 정보 등록, 타인의 정보 도용, 서비스의 부정한 이용 등을 하여서는 안 됩니다.

제7조 (책임의 제한)
회사는 회원 간의 매칭, 근로계약, 임금 지급 등 거래 당사자 간의 분쟁에 대하여 책임을 지지 않습니다.

부칙
본 약관은 2026년 5월 17일부터 시행됩니다.
`.trim();

export const DEFAULT_PRIVACY = `
${COMPANY_INFO.name}(이하 "회사")는 회원의 개인정보를 중요시하며, 「개인정보 보호법」 등 관련 법령을 준수합니다.

1. 수집하는 개인정보 항목
- 필수: 이름, 이메일, 휴대전화번호, 비밀번호
- 구직자 추가: 국적, 비자상태, 경력, 한국어 가능 여부, 선호지역
- 구인자 추가: 회사명, 위치, 담당자명, 담당자 연락처

2. 개인정보의 수집 및 이용 목적
- 회원 식별 및 본인 확인
- 일자리 매칭 서비스 제공
- 결제 및 크레딧 관리
- 고객 문의 응대

3. 개인정보의 보유 및 이용기간
회원 탈퇴 시까지 보관하며, 관련 법령에 따라 일정 기간 보관이 필요한 경우 해당 기간 동안 보관합니다.

4. 개인정보의 제3자 제공
매칭 승인이 완료된 경우, 매칭 상대방에게 연락처가 공개됩니다. 그 외의 경우 동의 없이 제3자에게 제공하지 않습니다.

5. 개인정보의 안전성 확보 조치
회사는 개인정보의 안전한 처리를 위해 기술적, 관리적 보호조치를 시행하고 있습니다.

6. 이용자의 권리
회원은 언제든지 개인정보 열람, 수정, 삭제, 처리정지 등을 요청할 수 있습니다.
`.trim();

export const DEFAULT_REFUND = `
${COMPANY_INFO.name}(이하 "회사")는 ${COMPANY_INFO.appName} 서비스 이용 시 발생하는 결제에 대해 다음과 같이 환불정책을 운영합니다.

1. 환불 대상
- 본 환불정책은 구인자가 결제한 "크레딧" 상품에 적용됩니다.
- 구직자의 서비스 이용은 무료이므로 환불 대상에 해당하지 않습니다.

2. 환불 가능 기준
가. 전액 환불
- 결제 후 7일 이내이며, 구매한 크레딧을 1회도 사용하지 않은 경우 전액 환불이 가능합니다.
- 회사의 귀책사유(서비스 장애, 결제 오류 등)로 정상적인 서비스 이용이 불가능한 경우 전액 환불됩니다.

나. 부분 환불
- 결제 후 7일이 지났거나, 구매한 크레딧 중 일부를 사용한 경우 잔여 크레딧에 한하여 환불이 가능합니다.
- 환불 금액 = (잔여 크레딧 / 구매 크레딧) × 결제 금액 - 결제대행 수수료(결제 금액의 약 3.3%)

다. 환불 불가
- 구매한 크레딧을 전부 사용한 경우
- 부정한 방법으로 크레딧을 사용하거나 적립한 경우
- 이벤트 또는 프로모션으로 무상 지급된 크레딧
- 회원 자격이 정지·말소된 경우

3. 환불 신청 방법
- 앱 내 "MY → 1:1 문의" 또는 고객센터(${COMPANY_INFO.email || "findar@nstaff.co.kr"})로 신청해 주시기 바랍니다.
- 신청 시 가입 이메일, 결제일시, 주문번호, 환불 사유를 함께 보내주시기 바랍니다.

4. 환불 처리 기간
- 환불 신청 접수일로부터 영업일 기준 3~7일 이내에 처리됩니다.
- 결제수단(카드, 계좌이체 등)에 따라 실제 환급까지 추가 영업일이 소요될 수 있습니다.

5. 기타
- 본 환불정책에 명시되지 않은 사항은 「전자상거래 등에서의 소비자보호에 관한 법률」 및 관련 법령에 따릅니다.
`.trim();

function Page() {
  const [docs, setDocs] = useState<{ terms: string; privacy: string; refund: string }>({
    terms: DEFAULT_TERMS,
    privacy: DEFAULT_PRIVACY,
    refund: DEFAULT_REFUND,
  });

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from("legal_documents").select("kind, content");
      if (!data) return;
      const map: any = {};
      for (const r of data) map[r.kind] = (r.content || "").trim();
      setDocs({
        terms: map.terms || DEFAULT_TERMS,
        privacy: map.privacy || DEFAULT_PRIVACY,
        refund: map.refund || DEFAULT_REFUND,
      });
    })();
  }, []);

  return (
    <div className="min-h-screen bg-muted/30 max-w-md mx-auto">
      <header className="sticky top-0 bg-background border-b px-4 py-3 flex items-center gap-2">
        <BackToSettings />
        <h1 className="font-bold">약관 및 정책</h1>
      </header>
      <div className="p-3">
        <Tabs defaultValue="terms">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="terms">이용약관</TabsTrigger>
            <TabsTrigger value="privacy">개인정보</TabsTrigger>
            <TabsTrigger value="refund">환불정책</TabsTrigger>
          </TabsList>
          <TabsContent value="terms">
            <pre className="text-xs whitespace-pre-wrap font-sans leading-6 p-3 bg-background rounded">{docs.terms}</pre>
          </TabsContent>
          <TabsContent value="privacy">
            <pre className="text-xs whitespace-pre-wrap font-sans leading-6 p-3 bg-background rounded">{docs.privacy}</pre>
          </TabsContent>
          <TabsContent value="refund">
            <pre className="text-xs whitespace-pre-wrap font-sans leading-6 p-3 bg-background rounded">{docs.refund}</pre>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
