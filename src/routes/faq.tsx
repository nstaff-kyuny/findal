import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import { BackToSettings } from "@/components/BackToSettings";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/faq")({
  component: Page,
  head: () => ({
    meta: [
      { title: "자주 묻는 질문(FAQ) | Find AR" },
      { name: "description", content: "Find AR 자주 묻는 질문 모음. 신청·승인·확정·노쇼 처리 등 일용직 매칭 이용 방법을 안내합니다." },
      { property: "og:title", content: "자주 묻는 질문(FAQ) | Find AR" },
      { property: "og:description", content: "신청·승인·확정·노쇼 처리 등 Find AR 이용 방법 안내." },
      { property: "og:url", content: "https://findar.nstaff.co.kr/faq" },
    ],
    links: [{ rel: "canonical", href: "https://findar.nstaff.co.kr/faq" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          name: "Find AR 자주 묻는 질문",
          url: "https://findar.nstaff.co.kr/faq",
          mainEntity: [
            {
              "@type": "Question",
              name: "Find AR은 어떤 서비스인가요?",
              acceptedAnswer: { "@type": "Answer", text: "Find AR(파인달)은 외식·호텔·요양 등 단기 근무 일자리와 구직자를 연결하는 일용직 매칭 플랫폼입니다." },
            },
            {
              "@type": "Question",
              name: "구직자는 이용료가 있나요?",
              acceptedAnswer: { "@type": "Answer", text: "구직자는 공고 열람과 신청을 무료로 이용할 수 있습니다." },
            },
            {
              "@type": "Question",
              name: "구인자는 어떻게 결제하나요?",
              acceptedAnswer: { "@type": "Answer", text: "구인자는 크레딧을 충전해 매칭 승인 등 유료 기능에 사용합니다." },
            },
          ],
        }),
      },
    ],
  }),
});

function Page() {
  const [list, setList] = useState<any[]>([]);
  const { roles } = useAuth();
  const role = roles.includes("employer") ? "employer" : "seeker";
  useEffect(() => { (async () => {
    const { data } = await supabase.from("faqs").select("*").eq("active", true).order("sort_order").order("created_at");
    setList(data ?? []);
  })(); }, []);
  return (
    <div className="min-h-screen bg-muted/30 max-w-md mx-auto">
      <header className="sticky top-0 bg-background border-b px-4 py-3 flex items-center gap-2">
        <BackToSettings />
        <h1 className="font-bold">자주 묻는 질문</h1>
      </header>
      <div className="p-3 space-y-3">
        <Link to="/guide/$role" params={{ role }} aria-label="앱 사용법 가이드 보기 — 신청·승인·확정·노쇼 처리 흐름 안내">
          <Card className="p-4 bg-primary text-primary-foreground flex items-center gap-3 hover:opacity-95 transition">
            <BookOpen size={22} />
            <div className="flex-1">
              <p className="font-bold text-base">앱 사용법 확인</p>
              <p className="text-xs opacity-90 mt-0.5">신청·승인·확정·노쇼 처리 흐름 안내</p>
            </div>
            <span className="text-xl">→</span>
          </Card>
        </Link>
        {list.length === 0 && <p className="text-center text-sm text-muted-foreground py-12">등록된 질문이 없습니다</p>}
        <Accordion type="single" collapsible className="bg-background rounded-lg">
          {list.map(f => (
            <AccordionItem key={f.id} value={f.id} className="px-4">
              <AccordionTrigger className="text-sm text-left">{f.question}</AccordionTrigger>
              <AccordionContent className="text-sm whitespace-pre-wrap text-muted-foreground">{f.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}

