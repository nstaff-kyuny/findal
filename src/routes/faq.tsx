import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/faq")({ component: Page });

function Page() {
  const [list, setList] = useState<any[]>([]);
  useEffect(() => { (async () => {
    const { data } = await supabase.from("faqs").select("*").eq("active", true).order("sort_order").order("created_at");
    setList(data ?? []);
  })(); }, []);
  return (
    <div className="min-h-screen bg-muted/30 max-w-md mx-auto">
      <header className="sticky top-0 bg-background border-b px-4 py-3 flex items-center gap-2">
        <Link to="/seeker/me"><ChevronLeft size={20} /></Link>
        <h1 className="font-bold">자주 묻는 질문</h1>
      </header>
      <div className="p-3">
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
