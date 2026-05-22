import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import { BackToSettings } from "@/components/BackToSettings";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/faq")({ component: Page });

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
        <Link to="/guide/$role" params={{ role }}>
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

