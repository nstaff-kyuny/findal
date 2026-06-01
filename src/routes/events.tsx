import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { BackToSettings } from "@/components/BackToSettings";

export const Route = createFileRoute("/events")({
  component: Page,
  head: () => ({
    meta: [
      { title: "이벤트 | Find AR" },
      { name: "description", content: "Find AR(파인달) 진행 중인 이벤트와 프로모션을 확인하세요." },
      { property: "og:title", content: "이벤트 | Find AR" },
      { property: "og:description", content: "Find AR(파인달) 진행 중인 이벤트와 프로모션." },
      { property: "og:url", content: "https://findar.nstaff.co.kr/events" },
    ],
    links: [{ rel: "canonical", href: "https://findar.nstaff.co.kr/events" }],
  }),
});

function Page() {
  const [list, setList] = useState<any[]>([]);
  useEffect(() => { (async () => {
    const now = new Date().toISOString();
    const { data } = await supabase.from("events").select("*").eq("active", true).lte("starts_at", now).gte("ends_at", now).order("created_at", { ascending: false });
    setList(data ?? []);
  })(); }, []);
  return (
    <div className="min-h-screen bg-muted/30 max-w-md mx-auto">
      <header className="sticky top-0 bg-background border-b px-4 py-3 flex items-center gap-2">
        <BackToSettings />
        <h1 className="font-bold">이벤트</h1>
      </header>
      <div className="p-3 space-y-2">
        {list.length === 0 && <p className="text-center text-sm text-muted-foreground py-12">진행 중인 이벤트가 없습니다</p>}
        {list.map(e => (
          <Card key={e.id}><CardContent className="p-4 space-y-2">
            {e.image_url && <img src={e.image_url} alt={e.title} className="w-full rounded" />}
            <h2 className="font-semibold">{e.title}</h2>
            <p className="text-xs text-muted-foreground">~ {new Date(e.ends_at).toLocaleDateString("ko-KR")}</p>
            {e.body && <p className="text-sm whitespace-pre-wrap">{e.body}</p>}
            {e.link_url && <a href={e.link_url} target="_blank" rel="noreferrer" className="text-primary text-sm underline">자세히 보기 →</a>}
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}
